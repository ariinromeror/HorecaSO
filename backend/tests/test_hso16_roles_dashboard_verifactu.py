"""
HSO-16 — Dashboard de dirección y Verifactu accesibles a cualquier rol autenticado.
"""

import pytest

from tests.auth_helpers import auth_headers
from tests.factories import create_user

VERIFACTU_GETS = [
    "/api/verifactu/registros",
    "/api/verifactu/verificar-cadena",
    "/api/verifactu/exportar",
]


@pytest.mark.parametrize("url", ["/api/dashboard/director", "/api/dashboard/cierre-dia"])
@pytest.mark.parametrize("rol", ["camarero", "cocina"])
async def test_dashboard_denegado_a_roles_operativos(client, seed, url, rol):
    r = await client.get(url, headers=auth_headers(seed.a.usuarios[rol]))
    assert r.status_code == 403, r.text


@pytest.mark.parametrize("url", ["/api/dashboard/director", "/api/dashboard/cierre-dia"])
async def test_dashboard_admin_ok(client, seed, url):
    r = await client.get(url, headers=auth_headers(seed.a.usuarios["admin"]))
    assert r.status_code == 200, r.text


async def test_dashboard_director_jefe_sala_ok_para_venta_live(client, seed, db, test_password_hash):
    a = seed.a
    jefe = await create_user(
        db, email="jefe_sala@tenanta.horecaso-test.com", rol="jefe_sala",
        password_hash=test_password_hash, tenant_id=a.id, outlet_id=a.outlet_id,
    )
    r = await client.get("/api/dashboard/director", headers=auth_headers(jefe))
    assert r.status_code == 200, r.text


@pytest.mark.parametrize("url", VERIFACTU_GETS)
@pytest.mark.parametrize("rol", ["camarero", "cocina"])
async def test_verifactu_denegado_a_roles_operativos(client, seed, url, rol):
    r = await client.get(url, headers=auth_headers(seed.a.usuarios[rol]))
    assert r.status_code == 403, r.text


async def test_verifactu_registro_detalle_denegado_a_cocina(client, seed, db):
    a = seed.a
    cobro = await client.post(
        f"/api/tpv/tickets/{a.ticket_abierto_id}/cobrar",
        json={"metodo_pago": "efectivo"},
        headers=auth_headers(a.usuarios["camarero"]),
    )
    assert cobro.status_code == 200, cobro.text
    reg_id = await db.fetchval(
        "SELECT id FROM verifactu_registros WHERE ticket_id = $1", a.ticket_abierto_id
    )

    r = await client.get(
        f"/api/verifactu/registros/{reg_id}", headers=auth_headers(a.usuarios["cocina"])
    )
    assert r.status_code == 403, r.text

    r = await client.get(
        f"/api/verifactu/registros/{reg_id}", headers=auth_headers(a.usuarios["admin"])
    )
    assert r.status_code == 200, r.text


@pytest.mark.parametrize("url", VERIFACTU_GETS)
async def test_verifactu_admin_ok(client, seed, url):
    r = await client.get(url, headers=auth_headers(seed.a.usuarios["admin"]))
    assert r.status_code == 200, r.text
