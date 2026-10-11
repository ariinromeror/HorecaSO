"""FIFO y clientes: outlet del JWT debe pertenecer al tenant (404 si no)."""

from tests.auth_helpers import auth_headers


async def _remap_outlet(db, user_id: str, outlet_id: str):
    await db.execute(
        "UPDATE usuarios SET outlet_id = $1 WHERE id = $2",
        outlet_id,
        user_id,
    )


async def _cliente_a(db, seed) -> str:
    return str(
        await db.fetchval(
            """
            INSERT INTO clientes (tenant_id, nombre, telefono)
            VALUES ($1, 'Cliente A historial', '600111222')
            RETURNING id
            """,
            seed.a.id,
        )
    )


async def test_fifo_lotes_outlet_otro_tenant_404(client, seed, db):
    """Usuario A con outlet_id de B → 404 (outlet no del tenant)."""
    a_admin = seed.a.usuarios["admin"]
    await _remap_outlet(db, a_admin.id, seed.b.outlet_id)

    r = await client.get("/api/fifo/lotes", headers=auth_headers(a_admin))
    assert r.status_code == 404, r.text


async def test_fifo_lotes_outlet_propio_200(client, seed, db):
    r = await client.get(
        "/api/fifo/lotes",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text


async def test_clientes_historial_outlet_otro_tenant_404(client, seed, db):
    """Usuario A con outlet_id de B → 404 al pedir historial (outlet ajeno)."""
    cid = await _cliente_a(db, seed)
    a_admin = seed.a.usuarios["admin"]
    await _remap_outlet(db, a_admin.id, seed.b.outlet_id)

    r = await client.get(
        f"/api/clientes/{cid}/historial",
        headers=auth_headers(a_admin),
    )
    assert r.status_code == 404, r.text


async def test_clientes_historial_outlet_propio_200(client, seed, db):
    cid = await _cliente_a(db, seed)
    r = await client.get(
        f"/api/clientes/{cid}/historial",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
