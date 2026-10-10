"""
HSO-02 — Doble cobro, numeración duplicada y cadena Verifactu rota por concurrencia.
"""

import asyncio
from datetime import datetime, timezone
from decimal import Decimal

import asyncpg
import pytest

import services.verifactu_engine as verifactu_engine
from tests.auth_helpers import auth_headers
from tests.factories import PRECIO_MENU, create_open_ticket


class _NocheviejaUTC(datetime):
    """31/12/2026 23:30 UTC = 01/01/2027 00:30 en Madrid."""

    @classmethod
    def now(cls, tz=None):
        base = datetime(2026, 12, 31, 23, 30, tzinfo=timezone.utc)
        return base.astimezone(tz) if tz else base.replace(tzinfo=None)


async def _cobrar(client, ticket_id, user, metodo="efectivo"):
    return await client.post(
        f"/api/tpv/tickets/{ticket_id}/cobrar",
        json={"metodo_pago": metodo},
        headers=auth_headers(user),
    )


async def _segundo_ticket(db, tenant):
    ticket_id, _, _ = await create_open_ticket(
        db,
        outlet_id=tenant.outlet_id,
        mesa_id=tenant.mesa_libre_id,
        camarero_id=tenant.usuarios["camarero"].id,
        lineas=[(tenant.productos["menu"], 1, PRECIO_MENU)],
    )
    return ticket_id


async def test_doble_cobro_concurrente_mismo_ticket_un_solo_registro(client, seed, db):
    t = seed.a
    cam = t.usuarios["camarero"]

    r1, r2 = await asyncio.gather(
        _cobrar(client, t.ticket_abierto_id, cam),
        _cobrar(client, t.ticket_abierto_id, cam),
    )

    assert sorted([r1.status_code, r2.status_code]) == [200, 400], (r1.text, r2.text)
    n = await db.fetchval(
        "SELECT count(*) FROM verifactu_registros WHERE ticket_id = $1", t.ticket_abierto_id
    )
    assert n == 1


async def test_cobro_secuencial_repetido_rechazado(client, seed, db):
    t = seed.a
    cam = t.usuarios["camarero"]
    assert (await _cobrar(client, t.ticket_abierto_id, cam)).status_code == 200

    r = await _cobrar(client, t.ticket_abierto_id, cam, metodo="tarjeta_credito")

    assert r.status_code == 400, r.text
    assert await db.fetchval(
        "SELECT metodo_pago FROM tickets WHERE id = $1", t.ticket_abierto_id
    ) == "efectivo"
    assert await db.fetchval(
        "SELECT count(*) FROM verifactu_registros WHERE ticket_id = $1", t.ticket_abierto_id
    ) == 1


async def test_cobros_concurrentes_tickets_distintos_serie_unica_y_cadena(client, seed, db):
    t = seed.a
    cam = t.usuarios["camarero"]
    otro = await _segundo_ticket(db, t)

    r1, r2 = await asyncio.gather(
        _cobrar(client, t.ticket_abierto_id, cam),
        _cobrar(client, otro, cam),
    )
    assert r1.status_code == 200 and r2.status_code == 200, (r1.text, r2.text)

    rows = await db.fetch(
        "SELECT numero_serie, huella_anterior, huella_actual FROM verifactu_registros "
        "WHERE tenant_id = $1 ORDER BY numero_serie",
        t.id,
    )
    assert len(rows) == 2
    assert rows[0]["numero_serie"] != rows[1]["numero_serie"]
    assert rows[0]["huella_anterior"] is None
    assert rows[1]["huella_anterior"] == rows[0]["huella_actual"]

    r = await client.get(
        "/api/verifactu/verificar-cadena", headers=auth_headers(t.usuarios["admin"])
    )
    assert r.status_code == 200, r.text
    assert r.json()["integra"] is True, r.json()


async def test_ultimo_pago_concurrente_un_solo_registro(client, seed, db):
    t = seed.a
    cam = t.usuarios["camarero"]
    body = {"importe": str(t.ticket_abierto_total), "metodo_pago": "tarjeta_credito"}
    url = f"/api/tpv/tickets/{t.ticket_abierto_id}/pagos"

    r1, r2 = await asyncio.gather(
        client.post(url, json=body, headers=auth_headers(cam)),
        client.post(url, json=body, headers=auth_headers(cam)),
    )

    assert sorted([r1.status_code, r2.status_code]) == [200, 400], (r1.text, r2.text)
    assert await db.fetchval(
        "SELECT count(*) FROM verifactu_registros WHERE ticket_id = $1", t.ticket_abierto_id
    ) == 1
    assert await db.fetchval(
        "SELECT COALESCE(SUM(importe), 0) FROM ticket_pagos WHERE ticket_id = $1",
        t.ticket_abierto_id,
    ) == Decimal(t.ticket_abierto_total)


async def test_serie_usa_anio_de_madrid(client, seed, monkeypatch):
    monkeypatch.setattr(verifactu_engine, "datetime", _NocheviejaUTC)
    t = seed.a

    r = await _cobrar(client, t.ticket_abierto_id, t.usuarios["camarero"])

    assert r.status_code == 200, r.text
    assert r.json()["verifactu_numero_serie"] == "SERIE-2027-000001"


async def test_verifactu_registros_inmutable(client, seed, db):
    t = seed.a
    assert (await _cobrar(client, t.ticket_abierto_id, t.usuarios["camarero"])).status_code == 200

    with pytest.raises(asyncpg.PostgresError):
        await db.execute("UPDATE verifactu_registros SET importe_total = 0")
    with pytest.raises(asyncpg.PostgresError):
        await db.execute("DELETE FROM verifactu_registros")
    assert await db.fetchval("SELECT count(*) FROM verifactu_registros") == 1


async def test_verifactu_un_registro_por_ticket_en_bd(client, seed, db):
    t = seed.a
    assert (await _cobrar(client, t.ticket_abierto_id, t.usuarios["camarero"])).status_code == 200

    with pytest.raises(asyncpg.UniqueViolationError):
        await db.execute(
            """
            INSERT INTO verifactu_registros (tenant_id, ticket_id, numero_serie,
                fecha_expedicion, tipo_factura, base_imponible, cuota_iva,
                importe_total, huella_actual)
            SELECT tenant_id, ticket_id, numero_serie || '-dup', fecha_expedicion,
                   tipo_factura, base_imponible, cuota_iva, importe_total, huella_actual
            FROM verifactu_registros
            """
        )
