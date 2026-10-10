"""
HSO-08 — Sobrepago aceptado en pagos parciales (descuadra el cierre de caja).
"""

from decimal import Decimal

import asyncpg
import pytest

from tests.auth_helpers import auth_headers


def _url(ticket_id):
    return f"/api/tpv/tickets/{ticket_id}/pagos"


async def _suma_pagos(db, ticket_id):
    return await db.fetchval(
        "SELECT COALESCE(SUM(importe), 0) FROM ticket_pagos WHERE ticket_id = $1", ticket_id
    )


async def test_sobrepago_tarjeta_rechazado(client, seed, db):
    t = seed.a  # total 30.00

    r = await client.post(
        _url(t.ticket_abierto_id),
        json={"importe": "50.00", "metodo_pago": "tarjeta_credito"},
        headers=auth_headers(t.usuarios["camarero"]),
    )

    assert r.status_code == 400, r.text
    assert await _suma_pagos(db, t.ticket_abierto_id) == Decimal("0")
    assert await db.fetchval(
        "SELECT estado FROM tickets WHERE id = $1", t.ticket_abierto_id
    ) == "abierto"


async def test_sobrepago_efectivo_registra_pendiente_y_devuelve_cambio(client, seed, db):
    t = seed.a
    cam = t.usuarios["camarero"]
    r = await client.post(
        _url(t.ticket_abierto_id),
        json={"importe": "10.00", "metodo_pago": "tarjeta_credito"},
        headers=auth_headers(cam),
    )
    assert r.status_code == 200, r.text

    r = await client.post(
        _url(t.ticket_abierto_id),
        json={"importe": "50.00", "metodo_pago": "efectivo"},
        headers=auth_headers(cam),
    )

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["completado"] is True
    assert Decimal(str(body["cambio"])) == Decimal("30.00")
    assert await _suma_pagos(db, t.ticket_abierto_id) == Decimal("30.00")
    assert await db.fetchval(
        "SELECT importe FROM ticket_pagos WHERE ticket_id = $1 AND metodo_pago = 'efectivo'",
        t.ticket_abierto_id,
    ) == Decimal("20.00")


async def test_pago_exacto_sin_cambio(client, seed, db):
    t = seed.a

    r = await client.post(
        _url(t.ticket_abierto_id),
        json={"importe": "30.00", "metodo_pago": "efectivo"},
        headers=auth_headers(t.usuarios["camarero"]),
    )

    assert r.status_code == 200, r.text
    assert r.json()["completado"] is True
    assert Decimal(str(r.json()["cambio"])) == Decimal("0.00")


async def test_pagos_parciales_que_suman_exacto(client, seed, db):
    t = seed.a
    cam = t.usuarios["camarero"]
    url = _url(t.ticket_abierto_id)

    r1 = await client.post(url, json={"importe": "12.35", "metodo_pago": "tarjeta_credito"},
                           headers=auth_headers(cam))
    r2 = await client.post(url, json={"importe": "17.65", "metodo_pago": "bizum"},
                           headers=auth_headers(cam))

    assert r1.status_code == 200 and r1.json()["completado"] is False, r1.text
    assert r2.status_code == 200, r2.text
    assert r2.json()["completado"] is True
    assert Decimal(str(r2.json()["cambio"])) == Decimal("0.00")
    assert await _suma_pagos(db, t.ticket_abierto_id) == Decimal("30.00")
    assert await db.fetchval(
        "SELECT count(*) FROM verifactu_registros WHERE ticket_id = $1", t.ticket_abierto_id
    ) == 1


async def test_bd_rechaza_pago_no_positivo(seed, db):
    with pytest.raises(asyncpg.CheckViolationError):
        await db.execute(
            "INSERT INTO ticket_pagos (ticket_id, importe, metodo_pago) VALUES ($1, 0, 'efectivo')",
            seed.a.ticket_abierto_id,
        )
