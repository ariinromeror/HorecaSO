"""KDS: outlet del JWT debe pertenecer al tenant del JWT."""

from tests.auth_helpers import auth_headers


async def _remap_outlet(db, user_id: str, outlet_id: str):
    await db.execute(
        "UPDATE usuarios SET outlet_id = $1 WHERE id = $2",
        outlet_id,
        user_id,
    )


async def test_kds_comandas_outlet_otro_tenant_bloqueado(client, seed, db):
    """Usuario tenant A con outlet_id de B no debe ver comandas de B."""
    a_cocina = seed.a.usuarios["cocina"]
    await _remap_outlet(db, a_cocina.id, seed.b.outlet_id)

    r = await client.get(
        "/api/kds/comandas",
        headers=auth_headers(a_cocina),
    )

    assert r.status_code == 404, r.text


async def test_kds_comandas_outlet_propio_ok(client, seed):
    r = await client.get(
        "/api/kds/comandas",
        headers=auth_headers(seed.a.usuarios["cocina"]),
    )
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)
