"""HSO-19 — Login emite un JWT que PyJWT verifica."""

import jwt

from config import settings
from tests.auth_helpers import auth_headers


async def test_login_emite_jwt_verificable_con_pyjwt(client, seed):
    admin = seed.a.usuarios["admin"]
    r = await client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": seed.password},
    )
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    payload = jwt.decode(token, settings.SECRET_KEY_AUTH, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == admin.id
    assert payload["role"] == "admin"

    perfil = await client.get("/api/auth/perfil", headers=auth_headers(token))
    assert perfil.status_code == 200, perfil.text
