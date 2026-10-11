"""Reservas: outlet del JWT debe pertenecer al tenant (no filtrar solo por outlet)."""

from datetime import date, time

from tests.auth_helpers import auth_headers


async def _remap_outlet(db, user_id: str, outlet_id: str):
    await db.execute(
        "UPDATE usuarios SET outlet_id = $1 WHERE id = $2",
        outlet_id,
        user_id,
    )


async def _reserva(db, outlet_id: str, mesa_id: str, nombre: str) -> str:
    return str(
        await db.fetchval(
            """
            INSERT INTO reservas
                (outlet_id, mesa_id, nombre_cliente, telefono, fecha, hora,
                 num_personas, estado)
            VALUES ($1, $2, $3, '600000000', $4, $5, 2, 'confirmada')
            RETURNING id
            """,
            outlet_id,
            mesa_id,
            nombre,
            date.today(),
            time(20, 0),
        )
    )


async def test_reservas_lista_outlet_otro_tenant_bloqueado(client, seed, db):
    """Usuario A con outlet_id de B no debe ver reservas de B."""
    rid_b = await _reserva(
        db, seed.b.outlet_id, seed.b.mesa_libre_id, "Cliente B"
    )
    a_admin = seed.a.usuarios["admin"]
    await _remap_outlet(db, a_admin.id, seed.b.outlet_id)

    r = await client.get("/api/reservas/", headers=auth_headers(a_admin))
    assert r.status_code in (200, 404), r.text
    if r.status_code == 200:
        ids = {item["id"] for item in r.json()}
        assert rid_b not in ids, "lista no debe incluir reserva de otro tenant"


async def test_reservas_lista_outlet_propio_ok(client, seed, db):
    rid_a = await _reserva(
        db, seed.a.outlet_id, seed.a.mesa_libre_id, "Cliente A"
    )
    r = await client.get(
        "/api/reservas/",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    ids = {item["id"] for item in r.json()}
    assert rid_a in ids


async def test_reservas_detalle_outlet_otro_tenant_bloqueado(client, seed, db):
    rid_b = await _reserva(
        db, seed.b.outlet_id, seed.b.mesa_libre_id, "Cliente B detalle"
    )
    a_admin = seed.a.usuarios["admin"]
    # Sin remap: A pide detalle de reserva de B → 404
    r = await client.get(
        f"/api/reservas/{rid_b}",
        headers=auth_headers(a_admin),
    )
    assert r.status_code == 404, r.text


async def test_reservas_detalle_outlet_propio_ok(client, seed, db):
    rid_a = await _reserva(
        db, seed.a.outlet_id, seed.a.mesa_libre_id, "Cliente A detalle"
    )
    r = await client.get(
        f"/api/reservas/{rid_a}",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    assert r.json()["id"] == rid_a
