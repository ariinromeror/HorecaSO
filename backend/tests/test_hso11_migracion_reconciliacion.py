"""
HSO-11 — Migración de datos (alinear lotes con stock_actual) y script de reconciliación.
"""

import importlib.util
import re
from datetime import date
from decimal import Decimal
from pathlib import Path

from tests.conftest import TEST_DATABASE_URL

BACKEND_DIR = Path(__file__).resolve().parent.parent
MIGRACION_DATOS = BACKEND_DIR / "sql" / "migration_hso11_datos_lotes.sql"
SCRIPT_RECONCILIAR = BACKEND_DIR / "scripts" / "reconciliar_stock.py"


def _bloque_rollback(sql: str) -> str:
    bloque = sql.split("-- ROLLBACK")[1]
    bloque = "-- BEGIN;" + bloque.split("-- BEGIN;", 1)[1].split("-- COMMIT;", 1)[0] + "-- COMMIT;"
    return "\n".join(re.sub(r"^-- ?", "", ln) for ln in bloque.splitlines())


def _cargar_script():
    spec = importlib.util.spec_from_file_location("reconciliar_stock", SCRIPT_RECONCILIAR)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


async def _articulo(db, tenant_id, nombre, stock, coste="2.0000"):
    return await db.fetchval(
        "INSERT INTO articulos (tenant_id, nombre, unidad_medida, stock_actual, coste_unitario) "
        "VALUES ($1, $2, 'kg', $3, $4) RETURNING id",
        tenant_id, nombre, Decimal(str(stock)), Decimal(coste),
    )


async def _lote(db, articulo_id, outlet_id, cantidad, coste="1", caducidad=None, numero=None):
    return await db.fetchval(
        "INSERT INTO lotes_inventario (articulo_id, outlet_id, cantidad, coste_unitario, "
        "fecha_caducidad, numero_lote) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        articulo_id, outlet_id, Decimal(str(cantidad)), Decimal(coste), caducidad, numero,
    )


async def _lotes(db, articulo_id):
    rows = await db.fetch(
        "SELECT numero_lote, cantidad, origen FROM lotes_inventario WHERE articulo_id = $1 "
        "ORDER BY numero_lote NULLS LAST", articulo_id,
    )
    return [(r["numero_lote"], r["cantidad"], r["origen"]) for r in rows]


async def _quitar_checks(db):
    await db.execute("ALTER TABLE lotes_inventario DROP CONSTRAINT IF EXISTS lotes_inventario_cantidad_no_negativa")
    await db.execute("ALTER TABLE articulos DROP CONSTRAINT IF EXISTS articulos_stock_actual_no_negativo")


async def test_migracion_datos_alinea_lotes_con_stock_actual_y_es_reversible(seed, db):
    t = seed.a
    sql = MIGRACION_DATOS.read_text(encoding="utf-8")
    await _quitar_checks(db)

    sin_lotes = await _articulo(db, t.id, "Sin lotes", 10, coste="3.5000")
    sobran = await _articulo(db, t.id, "Sobran lotes", 3)
    await _lote(db, sobran, t.outlet_id, 2, caducidad=date(2026, 1, 1), numero="A")
    await _lote(db, sobran, t.outlet_id, 4, caducidad=date(2026, 2, 1), numero="B")
    negativo = await _articulo(db, t.id, "Stock negativo", -2)
    lote_neg = await _articulo(db, t.id, "Lote negativo", 5)
    await _lote(db, lote_neg, t.outlet_id, -1, numero="N")
    await _lote(db, lote_neg, t.outlet_id, 5, numero="P")
    cuadra = await _articulo(db, t.id, "Cuadra", 4)
    await _lote(db, cuadra, t.outlet_id, 4, numero="C")

    await db.execute(sql)
    await db.execute(sql)  # idempotente

    assert await _lotes(db, sin_lotes) == [("MIG-HSO11", Decimal("10.0000"), "migracion")]
    assert await db.fetchval(
        "SELECT coste_unitario FROM lotes_inventario WHERE articulo_id = $1", sin_lotes
    ) == Decimal("3.5000")
    # Sobran 3: se consumen en orden FIFO (A caduca antes que B).
    assert await _lotes(db, sobran) == [("A", Decimal("0.0000"), "compra"), ("B", Decimal("3.0000"), "compra")]
    assert await db.fetchval("SELECT stock_actual FROM articulos WHERE id = $1", negativo) == Decimal("0.0000")
    assert await _lotes(db, lote_neg) == [("N", Decimal("0.0000"), "compra"), ("P", Decimal("5.0000"), "compra")]
    assert await _lotes(db, cuadra) == [("C", Decimal("4.0000"), "compra")]
    descuadres = await db.fetchval(
        """
        SELECT count(*) FROM articulos a
        WHERE COALESCE(a.stock_actual, 0) <> (
          SELECT COALESCE(SUM(l.cantidad), 0) FROM lotes_inventario l WHERE l.articulo_id = a.id)
        """
    )
    assert descuadres == 0
    movs = await db.fetch(
        "SELECT articulo_id, tipo, cantidad, delta FROM movimientos_stock "
        "WHERE motivo = 'migracion_hso11' ORDER BY delta"
    )
    assert [(m["articulo_id"], m["tipo"], m["delta"]) for m in movs] == [
        (sobran, "ajuste", Decimal("-3.0000")),
        (sin_lotes, "ajuste", Decimal("10.0000")),
    ]

    await db.execute(_bloque_rollback(sql))

    assert await _lotes(db, sin_lotes) == []
    assert await _lotes(db, sobran) == [("A", Decimal("2.0000"), "compra"), ("B", Decimal("4.0000"), "compra")]
    assert await db.fetchval("SELECT stock_actual FROM articulos WHERE id = $1", negativo) == Decimal("-2.0000")
    assert await _lotes(db, lote_neg) == [("N", Decimal("-1.0000"), "compra"), ("P", Decimal("5.0000"), "compra")]
    assert await db.fetchval("SELECT count(*) FROM movimientos_stock WHERE motivo = 'migracion_hso11'") == 0

    # Deja la BD de tests con las restricciones puestas, como el resto de la sesión.
    await db.execute(sql)


async def test_reconciliacion_por_defecto_solo_reporta(seed, db):
    t = seed.a
    script = _cargar_script()
    descuadrado = await _articulo(db, t.id, "Descuadrado", 7)
    await _lote(db, descuadrado, t.outlet_id, 5)
    cuadra = await _articulo(db, t.id, "Cuadra", 2)
    await _lote(db, cuadra, t.outlet_id, 2)

    filas = await script.run(TEST_DATABASE_URL, apply=False)

    assert [(f["articulo"], f["stock_actual"], f["suma_lotes"]) for f in filas] == [
        ("Descuadrado", Decimal("7.0000"), Decimal("5.0000")),
    ]
    assert await db.fetchval("SELECT stock_actual FROM articulos WHERE id = $1", descuadrado) == Decimal("7.0000")


async def test_reconciliacion_apply_iguala_stock_actual_a_los_lotes(seed, db):
    t = seed.a
    script = _cargar_script()
    a1 = await _articulo(db, t.id, "Descuadrado A", 7)
    await _lote(db, a1, t.outlet_id, 5)
    b1 = await _articulo(db, seed.b.id, "Descuadrado B", 1)

    solo_a = await script.run(TEST_DATABASE_URL, apply=True, tenant_id=t.id)

    assert [f["articulo"] for f in solo_a] == ["Descuadrado A"]
    assert await db.fetchval("SELECT stock_actual FROM articulos WHERE id = $1", a1) == Decimal("5.0000")
    assert await db.fetchval("SELECT stock_actual FROM articulos WHERE id = $1", b1) == Decimal("1.0000")
    assert await script.run(TEST_DATABASE_URL, apply=False, tenant_id=t.id) == []
