"""Acceso demo sin contraseña: POST /api/auth/demo/{rol}."""

import pytest

from config import settings
from tests.factories import create_outlet, create_tenant, create_user

URL = "/api/auth/demo/{}"


@pytest.fixture
async def demo_users(db, test_password_hash):
    tenant = await create_tenant(db, "prueba-demo", "Restaurante Prueba", "B00000999")
    outlet = await create_outlet(db, tenant)
    for rol in ("admin", "camarero", "cocina"):
        await create_user(
            db, email=f"{rol}@prueba.com", rol=rol, password_hash=test_password_hash,
            tenant_id=tenant, outlet_id=outlet,
        )
    return tenant


async def test_demo_apagado_devuelve_404(client, demo_users, monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    r = await client.post(URL.format("admin"))
    assert r.status_code == 404


async def test_demo_encendido_emite_token_de_cada_rol(client, demo_users, monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    for i, rol in enumerate(("admin", "camarero", "cocina")):
        r = await client.post(URL.format(rol), headers={"X-Forwarded-For": f"198.51.100.{i + 1}"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["role"] == rol
        assert body["negocio_id"] == demo_users
        assert body["access_token"]


async def test_demo_no_permite_superadmin_ni_roles_desconocidos(client, demo_users, monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    for rol in ("superadmin", "director", "x"):
        assert (await client.post(URL.format(rol))).status_code == 404


async def test_demo_cuenta_inactiva_404(client, db, demo_users, monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    await db.execute("UPDATE usuarios SET activo = false WHERE email = 'admin@prueba.com'")
    assert (await client.post(URL.format("admin"))).status_code == 404
