"""
HSO-09 — Fechas en UTC en dashboard, informes, analytics, APPCC y FIFO.

La BD de tests (como Supabase) trabaja en UTC: `DATE(cobrado_at)` agrupa por
día UTC. Una venta a las 00:01 de Madrid (23:01 UTC del día anterior) caía en
el día anterior.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest

from tests.auth_helpers import auth_headers
from tests.factories import PRECIO_MENU

UTC = timezone.utc

# 15-ene-2026 (invierno, UTC+1): 23:59 Madrid = 22:59 UTC; 00:01 del 16 = 23:01 UTC del 15.
VENTA_2359_MADRID = datetime(2026, 1, 15, 22, 59, tzinfo=UTC)
VENTA_0001_MADRID = datetime(2026, 1, 15, 23, 1, tzinfo=UTC)


async def _ticket_cobrado(db, tenant, cobrado_at, *, total=PRECIO_MENU, metodo="efectivo"):
    """Ticket cobrado con una línea de Menú y su pago en ticket_pagos."""
    tid = await db.fetchval(
        """
        INSERT INTO tickets (outlet_id, mesa_id, camarero_id, estado, total,
                             metodo_pago, created_at, cobrado_at)
        VALUES ($1, $2, $3, 'cobrado', $4, $5, $6, $6)
        RETURNING id
        """,
        tenant.outlet_id, tenant.mesa_libre_id, tenant.usuarios["camarero"].id,
        total, metodo, cobrado_at,
    )
    await db.execute(
        """
        INSERT INTO ticket_lineas (ticket_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES ($1, $2, 1, $3, $3)
        """,
        tid, tenant.productos["menu"], total,
    )
    await db.execute(
        "INSERT INTO ticket_pagos (ticket_id, importe, metodo_pago, created_at) VALUES ($1, $2, $3, $4)",
        tid, total, metodo, cobrado_at,
    )
    return tid


def _filas_por_fecha(body):
    return {f["fecha"]: f["tickets"] for f in body["filas"]}


# --- helper Python ------------------------------------------------------------

@pytest.mark.parametrize(
    "instante_utc, esperado",
    [
        (VENTA_2359_MADRID, date(2026, 1, 15)),
        (VENTA_0001_MADRID, date(2026, 1, 16)),
        # Cambio a horario de verano: 29-mar-2026 02:00 CET -> 03:00 CEST.
        (datetime(2026, 3, 28, 23, 30, tzinfo=UTC), date(2026, 3, 29)),  # 00:30 CET
        (datetime(2026, 3, 29, 21, 59, tzinfo=UTC), date(2026, 3, 29)),  # 23:59 CEST
        (datetime(2026, 3, 29, 22, 1, tzinfo=UTC), date(2026, 3, 30)),   # 00:01 CEST
        # Cambio a horario de invierno: 25-oct-2026 03:00 CEST -> 02:00 CET.
        (datetime(2026, 10, 24, 22, 1, tzinfo=UTC), date(2026, 10, 25)),  # 00:01 CEST
        (datetime(2026, 10, 25, 22, 59, tzinfo=UTC), date(2026, 10, 25)),  # 23:59 CET
        (datetime(2026, 10, 25, 23, 1, tzinfo=UTC), date(2026, 10, 26)),   # 00:01 CET
    ],
)
def test_fecha_madrid(instante_utc, esperado):
    from services.fechas import fecha_madrid

    assert fecha_madrid(instante_utc) == esperado


# --- informe de ventas --------------------------------------------------------

async def test_reporte_ventas_2359_y_0001_en_dias_distintos(client, seed, db):
    t = seed.a
    await _ticket_cobrado(db, t, VENTA_2359_MADRID)
    await _ticket_cobrado(db, t, VENTA_0001_MADRID)

    r = await client.get(
        "/api/reportes/ventas/datos",
        params={"desde": "2026-01-15", "hasta": "2026-01-16"},
        headers=auth_headers(t.usuarios["admin"]),
    )

    assert r.status_code == 200, r.text
    assert _filas_por_fecha(r.json()) == {"2026-01-15": 1, "2026-01-16": 1}


@pytest.mark.parametrize(
    "instante_utc, dia_madrid",
    [
        (datetime(2026, 3, 28, 23, 30, tzinfo=UTC), "2026-03-29"),
        (datetime(2026, 3, 29, 22, 1, tzinfo=UTC), "2026-03-30"),
        (datetime(2026, 10, 24, 22, 1, tzinfo=UTC), "2026-10-25"),
        (datetime(2026, 10, 25, 23, 1, tzinfo=UTC), "2026-10-26"),
    ],
    ids=["verano-0030CET", "verano-0001CEST", "invierno-0001CEST", "invierno-0001CET"],
)
async def test_reporte_ventas_cambio_de_hora(client, seed, db, instante_utc, dia_madrid):
    t = seed.a
    await _ticket_cobrado(db, t, instante_utc)
    d = date.fromisoformat(dia_madrid)

    r = await client.get(
        "/api/reportes/ventas/datos",
        params={"desde": (d - timedelta(days=1)).isoformat(), "hasta": d.isoformat()},
        headers=auth_headers(t.usuarios["admin"]),
    )

    assert r.status_code == 200, r.text
    assert _filas_por_fecha(r.json()) == {dia_madrid: 1}


# --- dashboard ----------------------------------------------------------------

async def test_dashboard_cierre_dia_usa_dia_madrid(client, seed, db):
    t = seed.a
    await _ticket_cobrado(db, t, VENTA_2359_MADRID, total=Decimal("10.00"))
    await _ticket_cobrado(db, t, VENTA_0001_MADRID, total=Decimal("25.00"))

    r = await client.get(
        "/api/dashboard/cierre-dia",
        params={"fecha": "2026-01-16"},
        headers=auth_headers(t.usuarios["admin"]),
    )

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["num_tickets"] == 1
    assert Decimal(str(body["total_ventas"])) == Decimal("25.00")
    assert Decimal(str(body["total_efectivo"])) == Decimal("25.00")


async def test_dashboard_director_ventas_hoy_madrid(client, seed, db, monkeypatch):
    import routers.dashboard as dashboard

    t = seed.a
    await _ticket_cobrado(db, t, VENTA_2359_MADRID, total=Decimal("10.00"))
    await _ticket_cobrado(db, t, VENTA_0001_MADRID, total=Decimal("25.00"))
    monkeypatch.setattr(dashboard, "hoy_madrid", lambda: date(2026, 1, 16))

    r = await client.get("/api/dashboard/director", headers=auth_headers(t.usuarios["admin"]))

    assert r.status_code == 200, r.text
    assert r.json()["num_tickets_hoy"] == 1
    assert Decimal(str(r.json()["ventas_hoy"])) == Decimal("25.00")
    assert r.json()["top_5_productos_hoy"] == [{"nombre": "Menú del día", "cantidad": 1}]


# --- analytics ----------------------------------------------------------------

async def test_ingenieria_menu_usa_dia_madrid(client, seed, db):
    t = seed.a
    await _ticket_cobrado(db, t, VENTA_2359_MADRID)
    await _ticket_cobrado(db, t, VENTA_0001_MADRID)

    r = await client.get(
        "/api/dashboard/ingenieria-menu",
        params={"desde": "2026-01-16", "hasta": "2026-01-16"},
        headers=auth_headers(t.usuarios["admin"]),
    )

    assert r.status_code == 200, r.text
    unidades = {p["nombre"]: p["unidades_vendidas"] for p in r.json()["productos"]}
    assert unidades == {"Menú del día": 1.0}


async def test_coste_personal_mes_madrid(client, seed, db):
    t = seed.a
    # 31-ene 23:30 UTC = 1-feb 00:30 Madrid: es ingreso de febrero.
    await _ticket_cobrado(db, t, datetime(2026, 1, 31, 23, 30, tzinfo=UTC), total=Decimal("40.00"))

    r = await client.get(
        "/api/dashboard/coste-personal",
        params={"mes": 2, "anio": 2026},
        headers=auth_headers(t.usuarios["admin"]),
    )

    assert r.status_code == 200, r.text
    assert Decimal(str(r.json()["ingresos_periodo"])) == Decimal("40.00")


def test_rango_analytics_por_defecto_termina_hoy_madrid(monkeypatch):
    import routers.analytics.analytics_shared as shared

    monkeypatch.setattr(shared, "hoy_madrid", lambda: date(2026, 1, 16))

    assert shared._resolve_rango_fechas(None, None) == (date(2025, 12, 18), date(2026, 1, 16))


# --- APPCC --------------------------------------------------------------------

async def _registro_appcc(db, tenant, created_at, conforme=False):
    await db.execute(
        """
        INSERT INTO registros_appcc (outlet_id, usuario_id, tipo_control, conforme,
                                     accion_correctora, created_at)
        VALUES ($1, $2, 'temperatura', $3, 'Revisado', $4)
        """,
        tenant.outlet_id, tenant.usuarios["admin"].id, conforme, created_at,
    )


@pytest.mark.parametrize(
    "url",
    ["/api/appcc/registros/no-conformes", "/api/appcc/registros", "/api/reportes/appcc/datos"],
)
async def test_appcc_rango_usa_dia_madrid(client, seed, db, url):
    t = seed.a
    await _registro_appcc(db, t, VENTA_2359_MADRID)
    await _registro_appcc(db, t, VENTA_0001_MADRID)

    r = await client.get(
        url,
        params={"desde": "2026-01-16", "hasta": "2026-01-16"},
        headers=auth_headers(t.usuarios["admin"]),
    )

    assert r.status_code == 200, r.text
    body = r.json()
    filas = body["filas"] if isinstance(body, dict) else body
    assert len(filas) == 1


async def test_appcc_resumen_y_listado_de_hoy_madrid(client, seed, db, monkeypatch):
    import routers.appcc as appcc

    t = seed.a
    await _registro_appcc(db, t, VENTA_2359_MADRID, conforme=True)
    await _registro_appcc(db, t, VENTA_0001_MADRID, conforme=False)
    monkeypatch.setattr(appcc, "hoy_madrid", lambda: date(2026, 1, 16))
    h = auth_headers(t.usuarios["admin"])

    resumen = await client.get("/api/appcc/resumen-dia", headers=h)
    listado = await client.get("/api/appcc/registros", headers=h)

    assert resumen.status_code == 200, resumen.text
    assert resumen.json()["fecha"] == "2026-01-16"
    assert resumen.json()["total_registros"] == 1
    assert resumen.json()["no_conformes"] == 1
    assert listado.status_code == 200, listado.text
    assert len(listado.json()) == 1


# --- FIFO ---------------------------------------------------------------------

async def test_alertas_caducidad_cuentan_desde_hoy_madrid(client, seed, db, monkeypatch):
    import routers.fifo.fifo_consumo as fifo_consumo

    t = seed.a
    hoy = date(2026, 1, 16)
    monkeypatch.setattr(fifo_consumo, "hoy_madrid", lambda: hoy)
    art = await db.fetchval(
        "INSERT INTO articulos (tenant_id, nombre, unidad_medida) VALUES ($1, 'Leche', 'l') RETURNING id",
        t.id,
    )
    for lote, cad in (("CADUCADO", hoy - timedelta(days=1)), ("EN2DIAS", hoy + timedelta(days=2)),
                      ("EN30DIAS", hoy + timedelta(days=30))):
        await db.execute(
            """
            INSERT INTO lotes_inventario (articulo_id, outlet_id, cantidad, coste_unitario,
                                          fecha_caducidad, numero_lote)
            VALUES ($1, $2, 5, 1, $3, $4)
            """,
            art, t.outlet_id, cad, lote,
        )

    r = await client.get(
        "/api/fifo/alertas-caducidad",
        params={"dias": 7},
        headers=auth_headers(t.usuarios["admin"]),
    )

    assert r.status_code == 200, r.text
    assert [(x["numero_lote"], x["dias_restantes"]) for x in r.json()] == [("EN2DIAS", 2)]
