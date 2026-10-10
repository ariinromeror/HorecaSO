"""APPCC: outlet del JWT debe pertenecer al tenant del JWT."""

from tests.auth_helpers import auth_headers


async def test_appcc_registros_outlet_otro_tenant_bloqueado(client, seed, db):
    a_admin = seed.a.usuarios["admin"]
    # Registro en outlet B
    await db.execute(
        """
        INSERT INTO registros_appcc
            (outlet_id, usuario_id, tipo_control, nombre_equipo, temperatura, conforme)
        VALUES ($1, $2, 'temperatura', 'Nevera B', 4.0, true)
        """,
        seed.b.outlet_id,
        seed.b.usuarios["admin"].id,
    )
    await db.execute(
        "UPDATE usuarios SET outlet_id = $1 WHERE id = $2",
        seed.b.outlet_id,
        a_admin.id,
    )

    r = await client.get(
        "/api/appcc/registros",
        headers=auth_headers(a_admin),
    )

    assert r.status_code == 404, r.text


async def test_appcc_registros_outlet_propio_ok(client, seed, db):
    a = seed.a
    await db.execute(
        """
        INSERT INTO registros_appcc
            (outlet_id, usuario_id, tipo_control, nombre_equipo, temperatura, conforme)
        VALUES ($1, $2, 'temperatura', 'Nevera A', 3.5, true)
        """,
        a.outlet_id,
        a.usuarios["admin"].id,
    )
    r = await client.get(
        "/api/appcc/registros",
        headers=auth_headers(a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    assert len(r.json()) >= 1
