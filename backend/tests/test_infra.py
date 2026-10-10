"""
Verifica la propia infraestructura de tests: guarda de BD, fixtures,
helper de tokens y limpieza entre tests.
"""

import pytest
import jwt

from config import settings
from tests.auth_helpers import auth_headers, expired_token_for, token_for
from tests.db_guard import UnsafeTestDatabase, assert_safe_test_database_url


# --- Guarda de BD -----------------------------------------------------------

@pytest.mark.parametrize(
    "url",
    [
        "",
        "postgresql://postgres.abcdefgh:pw@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
        "postgresql://postgres:pw@db.abcdefgh.supabase.co:5432/postgres_test",
        "postgresql://postgres@10.0.0.5:5432/horecaso_test",
        "postgresql://postgres@localhost:5432/horecaso",
        "mysql://root@localhost/horecaso_test",
    ],
)
def test_guard_rechaza_bd_no_segura(url):
    with pytest.raises(UnsafeTestDatabase):
        assert_safe_test_database_url(url)


def test_guard_rechaza_misma_bd_que_env():
    url = "postgresql://postgres@localhost:5432/horecaso_test"
    with pytest.raises(UnsafeTestDatabase):
        assert_safe_test_database_url(url, env_database_url=url)


def test_guard_acepta_bd_local_de_test():
    assert_safe_test_database_url("postgresql://postgres@127.0.0.1:54329/horecaso_test")


# --- Fixtures ---------------------------------------------------------------

async def test_seed_crea_dos_tenants_completos(seed, db):
    assert await db.fetchval("SELECT count(*) FROM tenants") == 2
    for tenant in (seed.a, seed.b):
        assert set(tenant.usuarios) == {"admin", "camarero", "cocina", "camarero_inactivo"}
        assert tenant.usuarios["camarero_inactivo"].activo is False
        ticket = await db.fetchrow(
            "SELECT estado, total FROM tickets WHERE id = $1", tenant.ticket_abierto_id
        )
        assert ticket["estado"] == "abierto"
        assert ticket["total"] == tenant.ticket_abierto_total
        assert await db.fetchval(
            "SELECT estado FROM mesas WHERE id = $1", tenant.mesa_ocupada_id
        ) == "ocupada"
    assert seed.superadmin.tenant_id is None


async def test_login_usuario_desactivado_401(client, seed):
    inactivo = seed.a.usuarios["camarero_inactivo"]
    r = await client.post(
        "/api/auth/login", json={"email": inactivo.email, "password": seed.password}
    )
    assert r.status_code == 401


# --- Helper de tokens -------------------------------------------------------

@pytest.mark.parametrize("rol", ["admin", "camarero", "cocina"])
async def test_token_helper_igual_que_login(client, seed, rol):
    user = seed.a.usuarios[rol]
    r = await client.post("/api/auth/login", json={"email": user.email, "password": seed.password})
    assert r.status_code == 200, r.text

    def decode(t):
        claims = jwt.decode(t, settings.SECRET_KEY_AUTH, algorithms=[settings.ALGORITHM])
        claims.pop("exp")
        return claims

    assert decode(token_for(user)) == decode(r.json()["access_token"])


async def test_token_helper_superadmin(client, seed):
    r = await client.get("/api/auth/perfil", headers=auth_headers(seed.superadmin))
    assert r.status_code == 200, r.text
    assert r.json()["rol"] == "superadmin"


async def test_token_expirado_401(client, seed):
    r = await client.get(
        "/api/auth/perfil", headers=auth_headers(expired_token_for(seed.a.usuarios["admin"]))
    )
    assert r.status_code == 401


# --- Limpieza (va al final: los tests anteriores de este archivo usan seed) ---

async def test_bd_vacia_tras_tests_con_seed(db):
    assert await db.fetchval("SELECT count(*) FROM tenants") == 0
    assert await db.fetchval("SELECT count(*) FROM usuarios") == 0
    assert await db.fetchval("SELECT count(*) FROM tickets") == 0
