"""Analytics rentabilidad-mesas: outlet debe pertenecer al tenant JWT."""

from datetime import date
from decimal import Decimal

from tests.auth_helpers import auth_headers


async def test_rentabilidad_mesas_outlet_otro_tenant_bloqueado(client, seed, db):
    a_admin = seed.a.usuarios["admin"]
    await db.execute(
        """
        INSERT INTO rentabilidad_mesas
            (mesa_id, outlet_id, ticket_id, fecha, num_comensales,
             tiempo_ocupacion_minutos, ingreso_total, ingreso_por_hora, ingreso_por_comensal)
        VALUES ($1, $2, $3, $4, 2, 60, 30.00, 30.00, 15.00)
        """,
        seed.b.mesa_ocupada_id,
        seed.b.outlet_id,
        seed.b.ticket_abierto_id,
        date.today(),
    )
    await db.execute(
        "UPDATE usuarios SET outlet_id = $1 WHERE id = $2",
        seed.b.outlet_id,
        a_admin.id,
    )

    r = await client.get(
        "/api/dashboard/rentabilidad-mesas",
        headers=auth_headers(a_admin),
    )
    assert r.status_code == 404, r.text


async def test_rentabilidad_mesas_outlet_propio_ok(client, seed, db):
    a = seed.a
    await db.execute(
        """
        INSERT INTO rentabilidad_mesas
            (mesa_id, outlet_id, ticket_id, fecha, num_comensales,
             tiempo_ocupacion_minutos, ingreso_total, ingreso_por_hora, ingreso_por_comensal)
        VALUES ($1, $2, $3, $4, 2, 60, 30.00, 30.00, 15.00)
        """,
        a.mesa_ocupada_id,
        a.outlet_id,
        a.ticket_abierto_id,
        date.today(),
    )
    r = await client.get(
        "/api/dashboard/rentabilidad-mesas",
        headers=auth_headers(a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    assert "mesas" in r.json()
