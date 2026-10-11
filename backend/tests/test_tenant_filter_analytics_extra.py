"""Analytics coste-personal e ingeniería-menú: outlet debe pertenecer al tenant."""

from datetime import date

from tests.auth_helpers import auth_headers


async def _remap_outlet(db, user_id: str, outlet_id: str):
    await db.execute(
        "UPDATE usuarios SET outlet_id = $1 WHERE id = $2",
        outlet_id,
        user_id,
    )


async def test_coste_personal_outlet_otro_tenant_bloqueado(client, seed, db):
    """Usuario A con outlet de B: 404 o sin ingresos de tickets de B."""
    a_admin = seed.a.usuarios["admin"]
    # Cobrar ticket de B para que haya ingresos en ese outlet
    await db.execute(
        """
        UPDATE tickets
        SET estado = 'cobrado', cobrado_at = NOW(), total = 99.00
        WHERE id = $1
        """,
        seed.b.ticket_abierto_id,
    )
    await _remap_outlet(db, a_admin.id, seed.b.outlet_id)

    hoy = date.today()
    r = await client.get(
        f"/api/dashboard/coste-personal?mes={hoy.month}&anio={hoy.year}",
        headers=auth_headers(a_admin),
    )
    assert r.status_code in (200, 404), r.text
    if r.status_code == 200:
        body = r.json()
        ingresos = float(body.get("ingresos_periodo") or body.get("ingresos") or 0)
        assert ingresos == 0.0, (
            "no debe devolver ingresos del outlet de otro tenant"
        )


async def test_coste_personal_outlet_propio_ok(client, seed):
    hoy = date.today()
    r = await client.get(
        f"/api/dashboard/coste-personal?mes={hoy.month}&anio={hoy.year}",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text


async def test_ingenieria_menu_outlet_otro_tenant_bloqueado(client, seed, db):
    """Con outlet remapeado a B: 404 o filas vacías (no ventas de B)."""
    a_admin = seed.a.usuarios["admin"]
    await db.execute(
        """
        UPDATE tickets
        SET estado = 'cobrado', cobrado_at = NOW()
        WHERE id = $1
        """,
        seed.b.ticket_abierto_id,
    )
    await _remap_outlet(db, a_admin.id, seed.b.outlet_id)

    r = await client.get(
        "/api/dashboard/ingenieria-menu",
        headers=auth_headers(a_admin),
    )
    assert r.status_code in (200, 404), r.text
    if r.status_code == 200:
        body = r.json()
        filas = body if isinstance(body, list) else body.get("filas", body.get("productos", []))
        # Productos de B no deberían listarse (tenant A en JOIN); filas deben
        # estar vacías o sin unidades de tickets de B.
        for f in filas:
            assert f.get("nombre") != "Menú del día" or float(
                f.get("unidades_vendidas") or 0
            ) == 0


async def test_ingenieria_menu_outlet_propio_ok(client, seed):
    r = await client.get(
        "/api/dashboard/ingenieria-menu",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
