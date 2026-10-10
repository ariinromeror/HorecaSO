"""
HSO-06 — Un token sigue valiendo aunque el usuario se desactive, el tenant se
suspenda o el rol cambie; TTL del token de 24 h.
"""

from datetime import datetime, timezone

import jwt

import auth.dependencies as auth_deps
from config import settings
from tests.auth_helpers import auth_headers, token_for

PERFIL = "/api/auth/perfil"


def _mesas(client, token):
    return client.get("/api/mesas/", headers=auth_headers(token))


async def test_token_de_usuario_desactivado_rechazado(client, seed):
    token = token_for(seed.a.usuarios["camarero_inactivo"])

    r = await client.get(PERFIL, headers=auth_headers(token))

    assert r.status_code == 401, r.text


async def test_desactivar_usuario_invalida_su_token(client, seed):
    a = seed.a
    cam = a.usuarios["camarero"]
    token = token_for(cam)
    assert (await _mesas(client, token)).status_code == 200

    r = await client.patch(
        f"/api/admin/usuarios/{cam.id}", json={"activo": False},
        headers=auth_headers(a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text

    assert (await _mesas(client, token)).status_code == 401


async def test_suspender_tenant_invalida_tokens(client, seed):
    a = seed.a
    token = token_for(a.usuarios["camarero"])
    assert (await _mesas(client, token)).status_code == 200

    r = await client.patch(
        f"/api/superadmin/tenants/{a.id}/activo", json={"activo": False},
        headers=auth_headers(seed.superadmin),
    )
    assert r.status_code == 200, r.text

    r = await _mesas(client, token)
    assert r.status_code == 401, r.text
    assert "suspendida" in r.json()["detail"]
    assert (await _mesas(client, token_for(seed.b.usuarios["camarero"]))).status_code == 200


async def test_cambio_de_rol_invalida_token_anterior(client, seed):
    a = seed.a
    cam = a.usuarios["camarero"]
    token = token_for(cam)

    r = await client.patch(
        f"/api/admin/usuarios/{cam.id}", json={"rol": "cocina"},
        headers=auth_headers(a.usuarios["admin"]),
    )
    assert r.status_code == 200, r.text

    r = await client.post(
        f"/api/tpv/tickets/{a.ticket_abierto_id}/cobrar",
        json={"metodo_pago": "efectivo"}, headers=auth_headers(token),
    )
    assert r.status_code == 401, r.text

    login = await client.post(
        "/api/auth/login", json={"email": cam.email, "password": seed.password}
    )
    assert login.status_code == 200 and login.json()["role"] == "cocina"


async def test_cambio_directo_en_bd_se_aplica_al_caducar_cache(client, seed, db, monkeypatch):
    monkeypatch.setattr(auth_deps, "SESSION_CACHE_TTL_SECONDS", 0)
    cam = seed.a.usuarios["camarero"]
    token = token_for(cam)
    assert (await _mesas(client, token)).status_code == 200

    await db.execute("UPDATE usuarios SET activo = false WHERE id = $1", cam.id)

    assert (await _mesas(client, token)).status_code == 401


async def test_superadmin_sigue_funcionando(client, seed):
    r = await client.get(PERFIL, headers=auth_headers(seed.superadmin))
    assert r.status_code == 200, r.text


async def test_ttl_token_entre_8_y_12_horas(client, seed):
    cam = seed.a.usuarios["camarero"]
    r = await client.post("/api/auth/login", json={"email": cam.email, "password": seed.password})
    assert r.status_code == 200, r.text

    claims = jwt.decode(
        r.json()["access_token"], settings.SECRET_KEY_AUTH, algorithms=[settings.ALGORITHM]
    )
    horas = (claims["exp"] - datetime.now(timezone.utc).timestamp()) / 3600
    assert 8 - 0.1 <= horas <= 12 + 0.1, horas
