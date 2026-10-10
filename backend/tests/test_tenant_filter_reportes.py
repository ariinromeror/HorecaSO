"""Reportes ventas/cierre/appcc: outlet debe pertenecer al tenant JWT."""

from datetime import date

from tests.auth_helpers import auth_headers


async def test_reportes_ventas_outlet_otro_tenant_bloqueado(client, seed, db):
    a_admin = seed.a.usuarios["admin"]
    await db.execute(
        "UPDATE usuarios SET outlet_id = $1 WHERE id = $2",
        seed.b.outlet_id,
        a_admin.id,
    )
    hoy = date.today().isoformat()
    r = await client.get(
        f"/api/reportes/ventas/datos?desde={hoy}&hasta={hoy}",
        headers=auth_headers(a_admin),
    )
    assert r.status_code == 404, r.text


async def test_reportes_ventas_outlet_propio_ok(client, seed):
    hoy = date.today().isoformat()
    r = await client.get(
        f"/api/reportes/ventas/datos?desde={hoy}&hasta={hoy}",
        headers=auth_headers(seed.a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "filas" in body
    assert "resumen" in body
