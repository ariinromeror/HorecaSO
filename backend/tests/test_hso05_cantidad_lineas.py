"""
HSO-05 — Cantidades negativas o cero en líneas de ticket.
"""

from decimal import Decimal

import asyncpg
import pytest

from tests.auth_helpers import auth_headers


@pytest.mark.parametrize("cantidad", [-3, 0, 1000])
async def test_add_linea_cantidad_fuera_de_rango_rechazada(client, seed, db, cantidad):
    t = seed.a

    r = await client.post(
        f"/api/tpv/tickets/{t.ticket_abierto_id}/lineas",
        json={"producto_id": t.productos["menu"], "cantidad": cantidad},
        headers=auth_headers(t.usuarios["camarero"]),
    )

    assert r.status_code == 422, r.text
    assert await db.fetchval(
        "SELECT total FROM tickets WHERE id = $1", t.ticket_abierto_id
    ) == Decimal(t.ticket_abierto_total)


async def test_bd_rechaza_cantidad_no_positiva(seed, db):
    t = seed.a
    with pytest.raises(asyncpg.CheckViolationError):
        await db.execute(
            "INSERT INTO ticket_lineas (ticket_id, producto_id, cantidad, precio_unitario, subtotal) "
            "VALUES ($1, $2, -1, 12.50, -12.50)",
            t.ticket_abierto_id, t.productos["menu"],
        )
