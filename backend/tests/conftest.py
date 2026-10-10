"""
Infraestructura de tests HorecaSO.

- Solo BD de PRUEBA local (tests/db_guard.py). Si TEST_DATABASE_URL falta o
  apunta a Supabase/producción, la sesión aborta ANTES de importar la app.
- Al inicio de la sesión se recrea el esquema public desde tests/schema.sql.
- Aislamiento: tras cada test se hace TRUNCATE de todas las tablas. Se limpia
  en lugar de envolver en transacción porque la app abre sus propias
  conexiones (pool) y los tests de concurrencia necesitan commits reales.
"""

import asyncio
import os
import secrets
from pathlib import Path

import pytest
from dotenv import dotenv_values

from tests.db_guard import UnsafeTestDatabase, assert_safe_test_database_url

BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "").strip()

try:
    assert_safe_test_database_url(
        TEST_DATABASE_URL,
        dotenv_values(BACKEND_DIR / ".env").get("DATABASE_URL"),
    )
except UnsafeTestDatabase as exc:
    pytest.exit(f"ABORTADO (BD de tests no segura): {exc}", returncode=2)

# Las variables de entorno tienen prioridad sobre backend/.env en pydantic-settings.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["SECRET_KEY_AUTH"] = "tests-" + secrets.token_hex(16)
os.environ["ENVIRONMENT"] = "test"
os.environ["ALLOWED_ORIGINS"] = "http://test"
os.environ["GROQ_API_KEY"] = ""

import asyncpg  # noqa: E402
import httpx  # noqa: E402

import database  # noqa: E402
from auth.dependencies import clear_session_cache  # noqa: E402
from config import settings  # noqa: E402
from main import app  # noqa: E402
from rate_limit import reset_rate_limits  # noqa: E402
from routers.auth import pwd_context  # noqa: E402
from tests.factories import SeedWorld, seed_world  # noqa: E402

if settings.DATABASE_URL != TEST_DATABASE_URL:
    pytest.exit("ABORTADO: settings.DATABASE_URL no es TEST_DATABASE_URL.", returncode=2)

SCHEMA_SQL = (Path(__file__).resolve().parent / "schema.sql").read_text(encoding="utf-8")

# Migraciones de backend/sql/ que se aplican sobre schema.sql (orden de ejecución en prod).
# migration_hso01_rls_revoke_anon.sql no se incluye: necesita los roles de Supabase.
MIGRATIONS = [
    "migration_hso_fase1_integridad.sql",
    "migration_hso13_importes_no_negativos.sql",
    "migration_hso11_stock_schema.sql",
    "migration_hso11_datos_lotes.sql",
    "migration_hso14_indices.sql",
]


def _sql_para_tests(text: str) -> str:
    """CONCURRENTLY no puede ejecutarse dentro de la transacción de asyncpg."""
    return (
        text.replace("CREATE INDEX CONCURRENTLY", "CREATE INDEX")
        .replace("DROP INDEX CONCURRENTLY", "DROP INDEX")
    )

TRUNCATE_ALL_SQL = """
DO $$
DECLARE stmt text;
BEGIN
  SELECT 'TRUNCATE ' || string_agg(format('public.%I', tablename), ', ')
         || ' RESTART IDENTITY CASCADE'
    INTO stmt
    FROM pg_tables WHERE schemaname = 'public';
  IF stmt IS NOT NULL THEN EXECUTE stmt; END IF;
END $$;
"""


async def _reset_schema() -> None:
    conn = await asyncpg.connect(TEST_DATABASE_URL)
    try:
        try:
            await conn.fetchval("SELECT now() AT TIME ZONE 'Europe/Madrid'")
        except asyncpg.PostgresError as exc:
            pytest.exit(
                "ABORTADO: el Postgres de tests no conoce la zona Europe/Madrid "
                f"({exc}). Reinicia con `python tests/local_pg.py stop` + `start`.",
                returncode=2,
            )
        # Supabase trabaja en UTC: los tests deben ver las mismas fechas.
        await conn.execute(
            "DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET timezone TO %L', "
            "current_database(), 'UTC'); END $$;"
        )
        await conn.execute("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;")
        await conn.execute(SCHEMA_SQL)
        for name in MIGRATIONS:
            path = BACKEND_DIR / "sql" / name
            if path.exists():
                await conn.execute(_sql_para_tests(path.read_text(encoding="utf-8")))
    finally:
        await conn.close()


async def _truncate_all() -> None:
    conn = await asyncpg.connect(TEST_DATABASE_URL)
    try:
        await conn.execute(TRUNCATE_ALL_SQL)
    finally:
        await conn.close()


@pytest.fixture(scope="session", autouse=True)
def _schema():
    asyncio.run(_reset_schema())


@pytest.fixture(autouse=True)
async def _app_db():
    """Pool de la app (el lifespan no corre con ASGITransport) + limpieza tras el test."""
    clear_session_cache()
    reset_rate_limits()
    await database.init_connection_pool()
    try:
        yield
    finally:
        await database.close_connection_pool()
        await _truncate_all()


@pytest.fixture
async def db():
    """Conexión directa (autocommit) para preparar datos y verificar la BD."""
    conn = await asyncpg.connect(TEST_DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()


@pytest.fixture(scope="session")
def test_password() -> str:
    return "pw-" + secrets.token_urlsafe(12)


@pytest.fixture(scope="session")
def test_password_hash(test_password) -> str:
    return pwd_context.hash(test_password)


@pytest.fixture
async def seed(db, test_password, test_password_hash) -> SeedWorld:
    """Dos tenants (A y B) con usuarios por rol, mesas, productos y ticket abierto."""
    return await seed_world(db, test_password, test_password_hash)


@pytest.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
