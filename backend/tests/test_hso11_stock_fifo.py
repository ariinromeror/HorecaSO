"""
HSO-11 — Una sola fuente de stock: lotes FIFO, con articulos.stock_actual como caché.

Invariante que se comprueba tras cada operación:
    articulos.stock_actual == SUM(lotes_inventario.cantidad) del artículo
"""

import asyncio
import json
from datetime import date
from decimal import Decimal

import asyncpg
import pytest

from tests.auth_helpers import auth_headers

MOV = "/api/inventario/movimientos"
FISICO = "/api/inventario/inventario-fisico"
LOTES = "/api/fifo/lotes"
CONSUMIR = "/api/fifo/consumir"


async def _articulo(db, tenant, nombre="Harina", coste="2.0000"):
    return str(await db.fetchval(
        "INSERT INTO articulos (tenant_id, nombre, unidad_medida, coste_unitario) "
        "VALUES ($1, $2, 'kg', $3) RETURNING id",
        tenant.id, nombre, Decimal(coste),
    ))


async def _stock(db, articulo_id) -> Decimal:
    return await db.fetchval("SELECT stock_actual FROM articulos WHERE id = $1", articulo_id)


async def _suma_lotes(db, articulo_id) -> Decimal:
    return await db.fetchval(
        "SELECT COALESCE(SUM(cantidad), 0) FROM lotes_inventario WHERE articulo_id = $1",
        articulo_id,
    )


async def _assert_coherente(db, articulo_id, esperado):
    esperado = Decimal(str(esperado))
    assert await _stock(db, articulo_id) == esperado
    assert await _suma_lotes(db, articulo_id) == esperado


async def _mov(client, user, articulo_id, tipo, cantidad, **extra):
    body = {"articulo_id": articulo_id, "tipo": tipo, "cantidad": cantidad, **extra}
    return await client.post(MOV, json=body, headers=auth_headers(user))


async def _lote(client, user, articulo_id, cantidad, coste, caducidad=None, numero=None):
    body = {"articulo_id": articulo_id, "cantidad": cantidad, "coste_unitario": coste}
    if caducidad:
        body["fecha_caducidad"] = caducidad.isoformat()
    if numero:
        body["numero_lote"] = numero
    return await client.post(LOTES, json=body, headers=auth_headers(user))


async def _ultimo_mov(db, articulo_id):
    return await db.fetchrow(
        "SELECT tipo, cantidad, delta, coste_unitario, motivo FROM movimientos_stock "
        "WHERE articulo_id = $1 ORDER BY created_at DESC LIMIT 1",
        articulo_id,
    )


# --- Entrada -----------------------------------------------------------------

async def test_entrada_manual_crea_lote_y_fifo_puede_consumirla(client, seed, db):
    t = seed.a
    admin = t.usuarios["admin"]
    art = await _articulo(db, t)

    r = await _mov(client, admin, art, "entrada", 10, coste_unitario=1.5,
                   fecha_caducidad="2026-12-31", numero_lote="ALB-1")

    assert r.status_code == 200, r.text
    await _assert_coherente(db, art, 10)
    lote = await db.fetchrow(
        "SELECT cantidad, coste_unitario, origen, fecha_caducidad, numero_lote, outlet_id "
        "FROM lotes_inventario WHERE articulo_id = $1", art,
    )
    assert lote["coste_unitario"] == Decimal("1.5000")
    assert lote["origen"] == "compra"
    assert lote["fecha_caducidad"] == date(2026, 12, 31)
    assert lote["numero_lote"] == "ALB-1"
    assert str(lote["outlet_id"]) == t.outlet_id

    r2 = await client.post(CONSUMIR, json={"articulo_id": art, "cantidad": 1, "motivo": "uso"},
                           headers=auth_headers(admin))
    assert r2.status_code == 200, r2.text
    await _assert_coherente(db, art, 9)


async def test_entrada_sin_coste_usa_coste_del_articulo(client, seed, db):
    t = seed.a
    art = await _articulo(db, t, coste="3.2500")

    r = await _mov(client, t.usuarios["admin"], art, "entrada", 4)

    assert r.status_code == 200, r.text
    assert await db.fetchval(
        "SELECT coste_unitario FROM lotes_inventario WHERE articulo_id = $1", art
    ) == Decimal("3.2500")
    mov = await _ultimo_mov(db, art)
    assert (mov["tipo"], mov["cantidad"], mov["delta"]) == ("entrada", Decimal("4.0000"), Decimal("4.0000"))


async def test_alta_de_lote_fifo_mantiene_coherencia(client, seed, db):
    t = seed.a
    art = await _articulo(db, t)

    r = await _lote(client, t.usuarios["admin"], art, 5, 2.4, date(2026, 11, 1), "L1")

    assert r.status_code == 201, r.text
    await _assert_coherente(db, art, 5)
    assert await db.fetchval("SELECT coste_unitario FROM articulos WHERE id = $1", art) == Decimal("2.4000")


# --- Salidas ------------------------------------------------------------------

async def test_salida_parcial_descuenta_el_lote(client, seed, db):
    t = seed.a
    admin = t.usuarios["admin"]
    art = await _articulo(db, t)
    assert (await _lote(client, admin, art, 10, 2)).status_code == 201

    r = await _mov(client, admin, art, "salida", 4, motivo="producción")

    assert r.status_code == 200, r.text
    assert r.json()["stock_nuevo"] == 6
    await _assert_coherente(db, art, 6)
    mov = await _ultimo_mov(db, art)
    assert (mov["tipo"], mov["cantidad"], mov["delta"]) == ("salida", Decimal("4.0000"), Decimal("-4.0000"))
    assert mov["coste_unitario"] == Decimal("2.0000")


async def test_salida_que_cruza_varios_lotes_respeta_caducidad_y_coste(client, seed, db):
    t = seed.a
    admin = t.usuarios["admin"]
    art = await _articulo(db, t)
    # Se dan de alta en orden inverso: manda la caducidad, no el orden de alta.
    assert (await _lote(client, admin, art, 5, 2, date(2026, 12, 1), "TARDE")).status_code == 201
    assert (await _lote(client, admin, art, 3, 1, date(2026, 11, 1), "PRONTO")).status_code == 201

    r = await client.post(CONSUMIR, json={"articulo_id": art, "cantidad": 5, "motivo": "uso"},
                          headers=auth_headers(admin))

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["coste_medio_ponderado"] == "1.40"  # (3 x 1 + 2 x 2) / 5
    assert len(body["lotes_afectados"]) == 2
    restos = dict(await db.fetch(
        "SELECT numero_lote, cantidad FROM lotes_inventario WHERE articulo_id = $1", art,
    ))
    assert restos == {"PRONTO": Decimal("0.0000"), "TARDE": Decimal("3.0000")}
    await _assert_coherente(db, art, 3)


async def test_merma_consume_fifo_con_coste_real(client, seed, db):
    t = seed.a
    admin = t.usuarios["admin"]
    art = await _articulo(db, t, coste="9.0000")
    assert (await _lote(client, admin, art, 4, 2.5, date(2026, 11, 1))).status_code == 201

    # El coste que manda el frontend se ignora: la merma se valora al coste FIFO.
    r = await _mov(client, admin, art, "merma", 1.5, motivo="caducado", coste_unitario=9)

    assert r.status_code == 200, r.text
    await _assert_coherente(db, art, "2.5")
    mov = await _ultimo_mov(db, art)
    assert (mov["tipo"], mov["delta"], mov["coste_unitario"]) == (
        "merma", Decimal("-1.5000"), Decimal("2.5000"),
    )


async def test_salida_mayor_que_el_stock_se_bloquea_sin_tocar_nada(client, seed, db):
    t = seed.a
    admin = t.usuarios["admin"]
    art = await _articulo(db, t)
    assert (await _lote(client, admin, art, 3, 2)).status_code == 201

    r_mov = await _mov(client, admin, art, "salida", 5)
    r_fifo = await client.post(CONSUMIR, json={"articulo_id": art, "cantidad": 5, "motivo": "x"},
                               headers=auth_headers(admin))

    assert r_mov.status_code == 400, r_mov.text
    assert r_fifo.status_code == 400, r_fifo.text
    assert "Stock insuficiente" in r_mov.json()["detail"]
    assert "recuento" in r_mov.json()["detail"].lower()
    assert "Stock insuficiente" in r_fifo.json()["detail"]
    await _assert_coherente(db, art, 3)


async def test_consumo_fifo_no_deja_stock_actual_negativo(client, seed, db):
    """Datos heredados descuadrados: lotes = 5 pero stock_actual = 2."""
    t = seed.a
    art = await _articulo(db, t)
    await db.execute(
        "INSERT INTO lotes_inventario (articulo_id, outlet_id, cantidad, coste_unitario) "
        "VALUES ($1, $2, 5, 1)", art, t.outlet_id,
    )
    await db.execute("UPDATE articulos SET stock_actual = 2 WHERE id = $1", art)

    r = await client.post(CONSUMIR, json={"articulo_id": art, "cantidad": 4, "motivo": "x"},
                          headers=auth_headers(t.usuarios["admin"]))

    assert r.status_code == 409, r.text
    assert await _stock(db, art) == Decimal("2.0000")
    assert await _suma_lotes(db, art) == Decimal("5.0000")


# --- Ajustes ------------------------------------------------------------------

async def test_ajuste_a_la_baja_consume_la_diferencia(client, seed, db):
    t = seed.a
    admin = t.usuarios["admin"]
    art = await _articulo(db, t)
    assert (await _lote(client, admin, art, 10, 2)).status_code == 201

    r = await _mov(client, admin, art, "ajuste", 7, motivo="recuento")

    assert r.status_code == 200, r.text
    assert (r.json()["stock_anterior"], r.json()["stock_nuevo"]) == (10, 7)
    await _assert_coherente(db, art, 7)
    mov = await _ultimo_mov(db, art)
    assert (mov["tipo"], mov["cantidad"], mov["delta"]) == ("ajuste", Decimal("3.0000"), Decimal("-3.0000"))


async def test_ajuste_al_alza_crea_lote_de_ajuste(client, seed, db):
    t = seed.a
    admin = t.usuarios["admin"]
    art = await _articulo(db, t, coste="1.7500")
    assert (await _lote(client, admin, art, 10, 2)).status_code == 201

    r = await _mov(client, admin, art, "ajuste", 12)

    assert r.status_code == 200, r.text
    await _assert_coherente(db, art, 12)
    nuevo = await db.fetchrow(
        "SELECT cantidad, coste_unitario FROM lotes_inventario "
        "WHERE articulo_id = $1 AND origen = 'ajuste'", art,
    )
    # El alta de lote fijó el coste del artículo a 2.
    assert (nuevo["cantidad"], nuevo["coste_unitario"]) == (Decimal("2.0000"), Decimal("2.0000"))
    mov = await _ultimo_mov(db, art)
    assert (mov["cantidad"], mov["delta"]) == (Decimal("2.0000"), Decimal("2.0000"))


async def test_inventario_fisico_registra_diferencias(client, seed, db):
    t = seed.a
    admin = t.usuarios["admin"]
    harina = await _articulo(db, t, "Harina")
    aceite = await _articulo(db, t, "Aceite")
    assert (await _lote(client, admin, harina, 10, 2)).status_code == 201
    assert (await _lote(client, admin, aceite, 4, 5)).status_code == 201

    r = await client.post(FISICO, json={"articulos": [
        {"articulo_id": harina, "cantidad_real": 8},
        {"articulo_id": aceite, "cantidad_real": 4},
    ]}, headers=auth_headers(admin))

    assert r.status_code == 200, r.text
    await _assert_coherente(db, harina, 8)
    await _assert_coherente(db, aceite, 4)
    mov = await _ultimo_mov(db, harina)
    assert (mov["tipo"], mov["delta"], mov["motivo"]) == ("ajuste", Decimal("-2.0000"), "inventario_fisico")
    assert await db.fetchval(
        "SELECT count(*) FROM movimientos_stock WHERE articulo_id = $1 AND tipo = 'ajuste'", aceite,
    ) == 0


# --- Concurrencia ---------------------------------------------------------------

async def test_salidas_concurrentes_no_sobreconsumen(client, seed, db):
    t = seed.a
    admin = t.usuarios["admin"]
    art = await _articulo(db, t)
    assert (await _lote(client, admin, art, 5, 2)).status_code == 201

    r1, r2 = await asyncio.gather(
        _mov(client, admin, art, "salida", 3),
        client.post(CONSUMIR, json={"articulo_id": art, "cantidad": 3, "motivo": "x"},
                    headers=auth_headers(admin)),
    )

    assert sorted([r1.status_code, r2.status_code]) == [200, 400], (r1.text, r2.text)
    await _assert_coherente(db, art, 2)


async def test_entradas_y_salidas_concurrentes_quedan_coherentes(client, seed, db):
    t = seed.a
    admin = t.usuarios["admin"]
    art = await _articulo(db, t)
    assert (await _lote(client, admin, art, 20, 2)).status_code == 201

    ops = [_mov(client, admin, art, "entrada", 1) for _ in range(5)]
    ops += [_mov(client, admin, art, "salida", 2) for _ in range(5)]
    ops += [_mov(client, admin, art, "merma", 1) for _ in range(3)]
    res = await asyncio.gather(*ops)

    assert all(r.status_code == 200 for r in res), [r.text for r in res if r.status_code != 200]
    await _assert_coherente(db, art, 20 + 5 - 10 - 3)


# --- Guardas ----------------------------------------------------------------------

async def test_endpoints_fifo_respetan_el_modulo(client, seed, db):
    t = seed.a
    admin = t.usuarios["admin"]
    art = await _articulo(db, t)
    await db.execute("UPDATE tenants SET modulos = $1::jsonb WHERE id = $2",
                     json.dumps({"fifo": False, "inventario": True}), t.id)
    h = auth_headers(admin)

    respuestas = [
        await client.post(CONSUMIR, json={"articulo_id": art, "cantidad": 1, "motivo": "x"}, headers=h),
        await client.get("/api/fifo/alertas-caducidad", headers=h),
        await client.get("/api/fifo/valoracion-stock", headers=h),
        await client.get(LOTES, headers=h),
    ]

    assert [r.status_code for r in respuestas] == [403, 403, 403, 403]


async def test_bd_rechaza_lotes_y_stock_negativos(seed, db):
    t = seed.a
    art = await _articulo(db, t)
    with pytest.raises(asyncpg.CheckViolationError):
        await db.execute(
            "INSERT INTO lotes_inventario (articulo_id, outlet_id, cantidad, coste_unitario) "
            "VALUES ($1, $2, -1, 1)", art, t.outlet_id,
        )
    with pytest.raises(asyncpg.CheckViolationError):
        await db.execute("UPDATE articulos SET stock_actual = -1 WHERE id = $1", art)


async def test_movimiento_de_otro_tenant_da_404(client, seed, db):
    art_b = await _articulo(db, seed.b)

    r = await _mov(client, seed.a.usuarios["admin"], art_b, "entrada", 1)

    assert r.status_code == 404, r.text
    assert await db.fetchval("SELECT count(*) FROM lotes_inventario") == 0
