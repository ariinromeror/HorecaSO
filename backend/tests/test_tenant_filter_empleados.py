"""Empleados y fichajes: aislamiento por tenant (detalle 404; listados sin datos de B)."""

from datetime import date

from tests.auth_helpers import auth_headers


async def _empleado(db, tenant_id: str, usuario_id: str | None, nombre: str) -> str:
    return str(
        await db.fetchval(
            """
            INSERT INTO empleados
                (tenant_id, usuario_id, nombre_completo, dni, cargo, activo)
            VALUES ($1, $2, $3, '12345678A', 'camarero', true)
            RETURNING id
            """,
            tenant_id,
            usuario_id,
            nombre,
        )
    )


async def test_empleados_lista_no_incluye_otro_tenant(client, seed, db):
    eid_b = await _empleado(
        db, seed.b.id, seed.b.usuarios["camarero"].id, "Empleado B"
    )
    r = await client.get(
        "/api/empleados/",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    ids = {item["id"] for item in r.json()}
    assert eid_b not in ids


async def test_empleados_lista_propio_ok(client, seed, db):
    eid_a = await _empleado(
        db, seed.a.id, seed.a.usuarios["camarero"].id, "Empleado A"
    )
    r = await client.get(
        "/api/empleados/",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    ids = {item["id"] for item in r.json()}
    assert eid_a in ids


async def test_empleados_detalle_otro_tenant_404(client, seed, db):
    eid_b = await _empleado(
        db, seed.b.id, seed.b.usuarios["admin"].id, "Empleado B detalle"
    )
    r = await client.get(
        f"/api/empleados/{eid_b}",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 404, r.text


async def test_empleados_detalle_propio_ok(client, seed, db):
    eid_a = await _empleado(
        db, seed.a.id, seed.a.usuarios["admin"].id, "Empleado A detalle"
    )
    r = await client.get(
        f"/api/empleados/{eid_a}",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    assert r.json()["id"] == eid_a


async def test_fichajes_lista_no_incluye_otro_tenant(client, seed, db):
    eid_b = await _empleado(
        db, seed.b.id, seed.b.usuarios["camarero"].id, "Empleado B fichaje"
    )
    await db.execute(
        """
        INSERT INTO turnos (empleado_id, outlet_id, fecha, hora_entrada, tipo)
        VALUES ($1, $2, $3, '10:00', 'ordinario')
        """,
        eid_b,
        seed.b.outlet_id,
        date.today(),
    )
    r = await client.get(
        "/api/turnos/",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    # Lista de turnos: no debe mezclar empleados de B
    for item in body if isinstance(body, list) else body.get("turnos", body.get("items", [])):
        if isinstance(item, dict) and "empleado_id" in item:
            assert item["empleado_id"] != str(eid_b)


async def test_fichajes_horas_extra_otro_tenant_404(client, seed, db):
    eid_b = await _empleado(
        db, seed.b.id, seed.b.usuarios["admin"].id, "Empleado B HE"
    )
    r = await client.get(
        f"/api/turnos/horas-extra/{eid_b}?mes={date.today().month}&anio={date.today().year}",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 404, r.text


async def test_fichajes_horas_extra_propio_ok(client, seed, db):
    eid_a = await _empleado(
        db, seed.a.id, seed.a.usuarios["admin"].id, "Empleado A HE"
    )
    r = await client.get(
        f"/api/turnos/horas-extra/{eid_a}?mes={date.today().month}&anio={date.today().year}",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
