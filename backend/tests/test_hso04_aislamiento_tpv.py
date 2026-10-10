"""
HSO-04 — Endpoints TPV/mesas sin aislamiento de tenant ni control de rol.
"""

from tests.auth_helpers import auth_headers


async def test_get_ticket_otro_tenant_denegado_sin_escritura(client, seed, db):
    b = seed.b
    await db.execute("UPDATE mesas SET estado = 'libre' WHERE id = $1", b.mesa_ocupada_id)

    r = await client.get(
        f"/api/tpv/tickets/{b.ticket_abierto_id}",
        headers=auth_headers(seed.a.usuarios["camarero"]),
    )

    assert r.status_code == 403, r.text
    assert "B22222222" not in r.text
    assert await db.fetchval(
        "SELECT estado FROM mesas WHERE id = $1", b.mesa_ocupada_id
    ) == "libre"


async def test_get_ticket_propio_ok(client, seed):
    a = seed.a
    r = await client.get(
        f"/api/tpv/tickets/{a.ticket_abierto_id}",
        headers=auth_headers(a.usuarios["camarero"]),
    )
    assert r.status_code == 200, r.text
    assert len(r.json()["lineas"]) == 2


async def test_cocina_no_puede_anadir_lineas(client, seed, db):
    a = seed.a
    r = await client.post(
        f"/api/tpv/tickets/{a.ticket_abierto_id}/lineas",
        json={"producto_id": a.productos["menu"], "cantidad": 1},
        headers=auth_headers(a.usuarios["cocina"]),
    )
    assert r.status_code == 403, r.text
    assert await db.fetchval(
        "SELECT count(*) FROM ticket_lineas WHERE ticket_id = $1", a.ticket_abierto_id
    ) == 2


async def test_anadir_linea_ticket_otro_tenant_denegado(client, seed, db):
    b = seed.b
    r = await client.post(
        f"/api/tpv/tickets/{b.ticket_abierto_id}/lineas",
        json={"producto_id": b.productos["menu"], "cantidad": 1},
        headers=auth_headers(seed.a.usuarios["camarero"]),
    )
    assert r.status_code == 403, r.text
    assert await db.fetchval(
        "SELECT count(*) FROM ticket_lineas WHERE ticket_id = $1", b.ticket_abierto_id
    ) == 2


async def test_patch_nota_linea_otro_tenant_denegado(client, seed, db):
    b = seed.b
    linea_id = b.ticket_abierto_lineas[0]
    r = await client.patch(
        f"/api/tpv/tickets/{b.ticket_abierto_id}/lineas/{linea_id}",
        json={"nota": "hackeado"},
        headers=auth_headers(seed.a.usuarios["camarero"]),
    )
    assert r.status_code == 403, r.text
    assert await db.fetchval("SELECT nota FROM ticket_lineas WHERE id = $1", linea_id) is None


async def test_borrar_linea_otro_tenant_denegado(client, seed, db):
    b = seed.b
    linea_id = b.ticket_abierto_lineas[0]
    r = await client.delete(
        f"/api/tpv/tickets/{b.ticket_abierto_id}/lineas/{linea_id}",
        headers=auth_headers(seed.a.usuarios["camarero"]),
    )
    assert r.status_code == 403, r.text
    assert await db.fetchval(
        "SELECT count(*) FROM ticket_lineas WHERE id = $1", linea_id
    ) == 1


async def test_cocina_no_puede_cobrar(client, seed, db):
    a = seed.a
    r = await client.post(
        f"/api/tpv/tickets/{a.ticket_abierto_id}/cobrar",
        json={"metodo_pago": "efectivo"},
        headers=auth_headers(a.usuarios["cocina"]),
    )
    assert r.status_code == 403, r.text
    assert await db.fetchval(
        "SELECT estado FROM tickets WHERE id = $1", a.ticket_abierto_id
    ) == "abierto"


async def test_cobrar_ticket_otro_tenant_denegado(client, seed, db):
    b = seed.b
    r = await client.post(
        f"/api/tpv/tickets/{b.ticket_abierto_id}/cobrar",
        json={"metodo_pago": "efectivo"},
        headers=auth_headers(seed.a.usuarios["camarero"]),
    )
    assert r.status_code == 403, r.text
    assert await db.fetchval(
        "SELECT estado FROM tickets WHERE id = $1", b.ticket_abierto_id
    ) == "abierto"
    assert await db.fetchval(
        "SELECT estado FROM mesas WHERE id = $1", b.mesa_ocupada_id
    ) == "ocupada"


async def test_get_mesa_otro_tenant_no_encontrada(client, seed):
    r = await client.get(
        f"/api/mesas/{seed.b.mesa_libre_id}",
        headers=auth_headers(seed.a.usuarios["camarero"]),
    )
    assert r.status_code == 404, r.text


async def test_get_mesa_propia_ok(client, seed):
    a = seed.a
    r = await client.get(
        f"/api/mesas/{a.mesa_libre_id}",
        headers=auth_headers(a.usuarios["camarero"]),
    )
    assert r.status_code == 200, r.text
    assert r.json()["id"] == a.mesa_libre_id
