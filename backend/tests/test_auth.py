"""
Tests de /api/auth: login, JWT emitido, /perfil, /verify y rate limiting.
"""

import pytest
from jose import jwt

from tests.conftest import crear_outlet, crear_tenant, crear_usuario


@pytest.mark.asyncio
async def test_login_correcto_devuelve_token_valido(client, db):
    tenant_id = await crear_tenant(db)
    outlet_id = await crear_outlet(db, tenant_id)
    user_id, password = await crear_usuario(
        db, tenant_id, outlet_id, rol="admin", email="admin@test.com"
    )

    resp = await client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": password},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "admin"
    assert body["negocio_id"] == tenant_id
    assert body["user_id"] == user_id

    payload = jwt.decode(
        body["access_token"], "test_secret_key_for_pytest_only", algorithms=["HS256"]
    )
    assert payload["role"] == "admin"
    assert payload["negocio_id"] == tenant_id


@pytest.mark.asyncio
async def test_login_password_incorrecta_devuelve_401(client, db):
    tenant_id = await crear_tenant(db)
    await crear_usuario(db, tenant_id, None, rol="admin", email="admin2@test.com")

    resp = await client.post(
        "/api/auth/login",
        json={"email": "admin2@test.com", "password": "esto-no-es-correcto"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_usuario_inexistente_devuelve_401(client):
    resp = await client.post(
        "/api/auth/login",
        json={"email": "no-existe@test.com", "password": "cualquiera"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_usuario_inactivo_devuelve_401(client, db):
    tenant_id = await crear_tenant(db)
    _, password = await crear_usuario(
        db, tenant_id, None, rol="admin", email="inactivo@test.com"
    )
    await db.execute("UPDATE usuarios SET activo = false WHERE email = $1", "inactivo@test.com")

    resp = await client.post(
        "/api/auth/login",
        json={"email": "inactivo@test.com", "password": password},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_superadmin_no_lleva_tenant_id(client, db):
    _, password = await crear_usuario(
        db, None, None, rol="superadmin", email="root@test.com"
    )

    resp = await client.post(
        "/api/auth/login",
        json={"email": "root@test.com", "password": password},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "superadmin"
    assert body["negocio_id"] is None


@pytest.mark.asyncio
async def test_login_rate_limit_5_por_minuto(client, db):
    tenant_id = await crear_tenant(db)
    await crear_usuario(db, tenant_id, None, rol="admin", email="ratelimit@test.com")

    # 5 intentos con password incorrecta: todos deben llegar a evaluarse (401)
    for _ in range(5):
        resp = await client.post(
            "/api/auth/login",
            json={"email": "ratelimit@test.com", "password": "mala"},
        )
        assert resp.status_code == 401

    # El 6º intento en la misma ventana debe ser bloqueado por SlowAPI, no
    # llegar a evaluar la contraseña.
    resp = await client.post(
        "/api/auth/login",
        json={"email": "ratelimit@test.com", "password": "mala"},
    )
    assert resp.status_code == 429


@pytest.mark.asyncio
async def test_login_sin_datos_devuelve_422(client):
    resp = await client.post("/api/auth/login", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_perfil_requiere_token(client):
    resp = await client.get("/api/auth/perfil")
    assert resp.status_code == 403  # HTTPBearer sin credenciales


@pytest.mark.asyncio
async def test_perfil_con_token_valido(client, db):
    tenant_id = await crear_tenant(db)
    user_id, password = await crear_usuario(
        db, tenant_id, None, rol="director", email="director@test.com"
    )
    login_resp = await client.post(
        "/api/auth/login",
        json={"email": "director@test.com", "password": password},
    )
    token = login_resp.json()["access_token"]

    resp = await client.get(
        "/api/auth/perfil", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == user_id
    assert body["rol"] == "director"
    assert "password_hash" not in body
