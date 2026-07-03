"""
Fixtures compartidos para la suite de tests de HorecaSO.

Requiere un PostgreSQL real accesible (no se usa SQLite ni mocks de DB):
el proyecto usa asyncpg + SQL crudo con features específicas de Postgres
(gen_random_uuid, numeric, ON CONFLICT, etc.), así que los tests corren
contra una base de datos Postgres de test real, con un esquema mínimo
(`schema_test.sql`) que se crea una vez por sesión y se limpia entre tests.

Variables de entorno (con defaults pensados para el Postgres local de
desarrollo/CI, ver sección "Running Tests" en README.md):
    TEST_DATABASE_URL — por defecto postgresql://postgres:test@localhost:5432/horecaso_test
"""

import os
import sys
from pathlib import Path
from uuid import uuid4

# Garantiza que `backend/` está en sys.path para poder hacer `import database`,
# `from main import create_app`, etc., sin importar cómo se invoque pytest.
# `python -m pytest` añade el cwd automáticamente, pero el script `pytest` a
# secas no siempre lo hace (p. ej. en CI), lo que rompía este conftest con
# `ModuleNotFoundError: No module named 'database'`.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql://postgres:test@localhost:5432/horecaso_test",
    ),
)
os.environ.setdefault("SECRET_KEY_AUTH", "test_secret_key_for_pytest_only")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173")
os.environ.setdefault("ENVIRONMENT", "development")

import asyncpg
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt
from passlib.context import CryptContext

import database as database_module
from main import create_app
from rate_limit import limiter

pwd_context = CryptContext(schemes=["bcrypt"])

SCHEMA_SQL = Path(__file__).parent.joinpath("schema_test.sql").read_text()

TABLES_TO_TRUNCATE = (
    "billing_events",
    "nominas",
    "turnos",
    "empleados",
    "articulos",
    "verifactu_registros",
    "ticket_pagos",
    "ticket_lineas",
    "tickets",
    "productos",
    "categorias_menu",
    "mesas",
    "usuarios",
    "outlets",
    "tenants",
)


@pytest_asyncio.fixture
async def _pool():
    """
    Pool asyncpg por test (no de sesión): pytest-asyncio en modo `auto` crea
    un event loop nuevo por cada test async, y asyncpg ata sus objetos
    internos (locks, futures) al loop en el que se crearon — un pool
    compartido entre tests con loops distintos revienta con
    "attached to a different loop". Crear el pool por test es la forma
    robusta de evitarlo; el coste (crear pool + `CREATE TABLE IF NOT EXISTS`
    + `TRUNCATE`) es de unos pocos milisegundos, asumible para esta suite.
    """
    pool = await asyncpg.create_pool(
        os.environ["DATABASE_URL"],
        min_size=1,
        max_size=5,
        statement_cache_size=0,
    )
    async with pool.acquire() as conn:
        await conn.execute(SCHEMA_SQL)
        await conn.execute(
            "TRUNCATE TABLE " + ", ".join(TABLES_TO_TRUNCATE) + " RESTART IDENTITY CASCADE"
        )
    database_module._pool = pool
    yield pool
    database_module._pool = None
    await pool.close()


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """SlowAPI guarda el estado de rate limit en memoria del proceso (módulo
    `rate_limit.py` compartido); sin este reset, un test de login agotaría el
    cupo de 5/min para el resto de tests que también llaman a /api/auth/login."""
    limiter.reset()
    yield


@pytest.fixture
def app(_pool):
    """Instancia de FastAPI. No dispara el lifespan (ASGITransport no lo invoca)."""
    return create_app()


@pytest_asyncio.fixture
async def client(app):
    """Cliente HTTP async contra la app, sin servidor real (ASGITransport)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def db(_pool):
    """Conexión asyncpg directa para preparar datos / hacer asserts en DB."""
    async with _pool.acquire() as conn:
        yield conn


def make_token(user_id: str, role: str, tenant_id: str | None) -> str:
    """Genera un JWT válido con la misma forma que emite /api/auth/login."""
    payload = {
        "sub": user_id,
        "user_id": user_id,
        "role": role,
        "negocio_id": tenant_id,
    }
    if role == "superadmin":
        payload["tenant_id"] = None
    return jwt.encode(payload, os.environ["SECRET_KEY_AUTH"], algorithm="HS256")


async def crear_tenant(conn, nombre="Tenant Test", nif="B00000000") -> str:
    row = await conn.fetchrow(
        "INSERT INTO tenants (nombre, nif) VALUES ($1, $2) RETURNING id",
        nombre,
        nif,
    )
    return str(row["id"])


async def crear_outlet(conn, tenant_id: str, nombre="Outlet Test") -> str:
    row = await conn.fetchrow(
        "INSERT INTO outlets (tenant_id, nombre) VALUES ($1, $2) RETURNING id",
        tenant_id,
        nombre,
    )
    return str(row["id"])


async def crear_usuario(
    conn,
    tenant_id: str | None,
    outlet_id: str | None,
    rol: str,
    email: str | None = None,
    password: str = "Password1234!",
) -> tuple[str, str]:
    """Crea un usuario y devuelve (user_id, password_en_claro)."""
    email = email or f"{rol}-{uuid4().hex[:8]}@test.com"
    password_hash = pwd_context.hash(password)
    row = await conn.fetchrow(
        """
        INSERT INTO usuarios (tenant_id, outlet_id, nombre, email, password_hash, rol)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        """,
        tenant_id,
        outlet_id,
        rol.capitalize(),
        email,
        password_hash,
        rol,
    )
    return str(row["id"]), password


async def crear_mesa(conn, outlet_id: str, numero: int = 1) -> str:
    row = await conn.fetchrow(
        "INSERT INTO mesas (outlet_id, numero, estado) VALUES ($1, $2, 'libre') RETURNING id",
        outlet_id,
        numero,
    )
    return str(row["id"])


async def crear_producto(
    conn, tenant_id: str, nombre="Cerveza", precio="3.50"
) -> str:
    row = await conn.fetchrow(
        "INSERT INTO productos (tenant_id, nombre, precio) VALUES ($1, $2, $3) RETURNING id",
        tenant_id,
        nombre,
        precio,
    )
    return str(row["id"])


async def crear_empleado(
    conn,
    tenant_id: str,
    salario_bruto_mensual: str,
    jornada_horas: str = "40",
    irpf_porcentaje: str = "15",
    usuario_id: str | None = None,
) -> str:
    row = await conn.fetchrow(
        """
        INSERT INTO empleados (
            tenant_id, usuario_id, salario_bruto_mensual, jornada_horas, irpf_porcentaje
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        """,
        tenant_id,
        usuario_id,
        salario_bruto_mensual,
        jornada_horas,
        irpf_porcentaje,
    )
    return str(row["id"])


async def crear_ticket(
    conn, outlet_id: str, mesa_id: str, camarero_id: str, estado="abierto"
) -> str:
    row = await conn.fetchrow(
        """
        INSERT INTO tickets (outlet_id, mesa_id, camarero_id, estado)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        """,
        outlet_id,
        mesa_id,
        camarero_id,
        estado,
    )
    return str(row["id"])
