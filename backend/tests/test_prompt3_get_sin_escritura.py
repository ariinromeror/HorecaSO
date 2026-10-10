"""
GET de ticket y coste de receta no deben escribir; cross-tenant → 404.
"""

from decimal import Decimal

from tests.auth_helpers import auth_headers


async def test_get_ticket_mesa_libre_no_cambia_estado(client, seed, db):
    a = seed.a
    await db.execute(
        "UPDATE mesas SET estado = 'libre' WHERE id = $1", a.mesa_ocupada_id
    )
    assert (
        await db.fetchval("SELECT estado FROM mesas WHERE id = $1", a.mesa_ocupada_id)
        == "libre"
    )

    r = await client.get(
        f"/api/tpv/tickets/{a.ticket_abierto_id}",
        headers=auth_headers(a.usuarios["camarero"]),
    )

    assert r.status_code == 200, r.text
    assert (
        await db.fetchval("SELECT estado FROM mesas WHERE id = $1", a.mesa_ocupada_id)
        == "libre"
    )


async def test_get_ticket_otro_tenant_404(client, seed, db):
    b = seed.b
    await db.execute(
        "UPDATE mesas SET estado = 'libre' WHERE id = $1", b.mesa_ocupada_id
    )

    r = await client.get(
        f"/api/tpv/tickets/{b.ticket_abierto_id}",
        headers=auth_headers(seed.a.usuarios["camarero"]),
    )

    assert r.status_code == 404, r.text
    assert (
        await db.fetchval("SELECT estado FROM mesas WHERE id = $1", b.mesa_ocupada_id)
        == "libre"
    )


async def test_get_coste_no_persiste_coste_ni_articulo(client, seed, db):
    t = seed.a
    h = auth_headers(t.usuarios["admin"])
    r = await client.post(
        "/api/admin/elaboraciones",
        json={"nombre": "Fondo GET", "unidad_medida": "l"},
        headers=h,
    )
    assert r.status_code == 201, r.text
    rid = r.json()["id"]
    articulo_salida_id = await db.fetchval(
        "SELECT articulo_salida_id FROM recetas WHERE id = $1", rid
    )
    hueso = await db.fetchval(
        """
        INSERT INTO articulos (tenant_id, nombre, unidad_medida, coste_unitario)
        VALUES ($1, 'Hueso GET', 'kg', 4.00)
        RETURNING id
        """,
        t.id,
    )
    add = await client.post(
        f"/api/admin/recetas/{rid}/ingredientes",
        json={"articulo_id": str(hueso), "cantidad_neta": "1", "unidad": "kg"},
        headers=h,
    )
    assert add.status_code == 200, add.text

    await db.execute(
        "UPDATE recetas SET coste_calculado = 99.99, margen_porcentaje = NULL, "
        "semaforo = 'sin_venta' WHERE id = $1",
        rid,
    )
    await db.execute(
        "UPDATE articulos SET coste_unitario = 88.88 WHERE id = $1",
        articulo_salida_id,
    )

    r = await client.get(f"/api/admin/recetas/{rid}/coste", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["coste_total"] == 4.0

    fila = await db.fetchrow(
        "SELECT coste_calculado, margen_porcentaje, semaforo FROM recetas WHERE id = $1",
        rid,
    )
    assert fila["coste_calculado"] == Decimal("99.99")
    assert (
        await db.fetchval(
            "SELECT coste_unitario FROM articulos WHERE id = $1", articulo_salida_id
        )
        == Decimal("88.88")
    )


async def test_get_coste_otro_tenant_404(client, seed, db):
    t = seed.b
    h = auth_headers(t.usuarios["admin"])
    r = await client.post(
        "/api/admin/recetas",
        json={"producto_id": t.productos["menu"]},
        headers=h,
    )
    assert r.status_code in (200, 201), r.text
    rid = r.json()["id"]

    r = await client.get(
        f"/api/admin/recetas/{rid}/coste",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 404, r.text
