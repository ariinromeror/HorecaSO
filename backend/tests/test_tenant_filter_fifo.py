"""FIFO lotes y alertas: outlet del JWT debe pertenecer al tenant."""

from datetime import date, timedelta

from tests.auth_helpers import auth_headers


async def _remap_outlet(db, user_id: str, outlet_id: str):
    await db.execute(
        "UPDATE usuarios SET outlet_id = $1 WHERE id = $2",
        outlet_id,
        user_id,
    )


async def _lote_b(db, seed) -> str:
    art_b = await db.fetchval(
        """
        INSERT INTO articulos (tenant_id, nombre, unidad_medida, coste_unitario)
        VALUES ($1, 'Lote B secreto', 'kg', 1.50) RETURNING id
        """,
        seed.b.id,
    )
    return str(
        await db.fetchval(
            """
            INSERT INTO lotes_inventario
                (articulo_id, outlet_id, cantidad, coste_unitario, fecha_caducidad,
                 numero_lote)
            VALUES ($1, $2, 10, 1.50, $3, 'LOTE-B')
            RETURNING id
            """,
            art_b,
            seed.b.outlet_id,
            date.today() + timedelta(days=3),
        )
    )


async def test_fifo_lotes_outlet_otro_tenant_bloqueado(client, seed, db):
    lid_b = await _lote_b(db, seed)
    a_admin = seed.a.usuarios["admin"]
    await _remap_outlet(db, a_admin.id, seed.b.outlet_id)

    r = await client.get("/api/fifo/lotes", headers=auth_headers(a_admin))
    assert r.status_code in (200, 404), r.text
    if r.status_code == 200:
        ids = {item["id"] for item in r.json()}
        assert lid_b not in ids, "no debe listar lotes de otro tenant"


async def test_fifo_lotes_outlet_propio_ok(client, seed, db):
    art_a = await db.fetchval(
        """
        INSERT INTO articulos (tenant_id, nombre, unidad_medida, coste_unitario)
        VALUES ($1, 'Lote A', 'kg', 2.00) RETURNING id
        """,
        seed.a.id,
    )
    lid_a = str(
        await db.fetchval(
            """
            INSERT INTO lotes_inventario
                (articulo_id, outlet_id, cantidad, coste_unitario, numero_lote)
            VALUES ($1, $2, 5, 2.00, 'LOTE-A') RETURNING id
            """,
            art_a,
            seed.a.outlet_id,
        )
    )
    r = await client.get(
        "/api/fifo/lotes",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    ids = {item["id"] for item in r.json()}
    assert lid_a in ids


async def test_fifo_alertas_outlet_otro_tenant_bloqueado(client, seed, db):
    lid_b = await _lote_b(db, seed)
    a_admin = seed.a.usuarios["admin"]
    await _remap_outlet(db, a_admin.id, seed.b.outlet_id)

    r = await client.get(
        "/api/fifo/alertas-caducidad?dias=7",
        headers=auth_headers(a_admin),
    )
    assert r.status_code in (200, 404), r.text
    if r.status_code == 200:
        ids = {item["id"] for item in r.json()}
        assert lid_b not in ids


async def test_fifo_alertas_outlet_propio_ok(client, seed, db):
    art_a = await db.fetchval(
        """
        INSERT INTO articulos (tenant_id, nombre, unidad_medida, coste_unitario)
        VALUES ($1, 'Alerta A', 'kg', 1.00) RETURNING id
        """,
        seed.a.id,
    )
    lid_a = str(
        await db.fetchval(
            """
            INSERT INTO lotes_inventario
                (articulo_id, outlet_id, cantidad, coste_unitario, fecha_caducidad,
                 numero_lote)
            VALUES ($1, $2, 3, 1.00, $3, 'ALERT-A') RETURNING id
            """,
            art_a,
            seed.a.outlet_id,
            date.today() + timedelta(days=2),
        )
    )
    r = await client.get(
        "/api/fifo/alertas-caducidad?dias=7",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    ids = {item["id"] for item in r.json()}
    assert lid_a in ids
