"""
Tests de integración para el runner de migraciones (Fase 5 del PRD).

Verifica, contra un Postgres real, que `scripts/migrate.py`:
  - aplica todas las migraciones de `backend/sql/migrations/` sin error
    partiendo de la base mínima de `schema_test.sql`.
  - es idempotente: una segunda ejecución no reaplica nada y no falla.

Se ejecuta en un esquema Postgres aislado (`CREATE SCHEMA ... `) en vez de
usar directamente `public` para no interferir con los datos/columnas que
el resto de la suite espera en el esquema mínimo de tests.
"""

from pathlib import Path
from uuid import uuid4

import pytest

from scripts.migrate import _applied_versions, _apply_migration, _migration_files

SCHEMA_TEST_SQL = Path(__file__).parent.joinpath("schema_test.sql").read_text()


@pytest.fixture
async def migrate_schema(_pool):
    """Esquema Postgres aislado con el baseline mínimo de tests ya cargado."""
    schema_name = f"migrate_test_{uuid4().hex[:8]}"
    async with _pool.acquire() as conn:
        await conn.execute(f'CREATE SCHEMA "{schema_name}"')
        await conn.execute(f'SET search_path TO "{schema_name}", public')
        try:
            await conn.execute(SCHEMA_TEST_SQL)
            yield conn
        finally:
            await conn.execute("SET search_path TO public")
            await conn.execute(f'DROP SCHEMA "{schema_name}" CASCADE')


async def test_migrate_aplica_todas_las_migraciones_sin_error(migrate_schema):
    conn = migrate_schema
    files = _migration_files()
    assert files, "Se esperaba al menos una migración en backend/sql/migrations/"

    applied_before = await _applied_versions(conn)
    assert applied_before == set()

    for f in files:
        await _apply_migration(conn, f)

    applied_after = await _applied_versions(conn)
    assert applied_after == {f.name for f in files}


async def test_migrate_es_idempotente_en_segunda_pasada(migrate_schema):
    conn = migrate_schema
    files = _migration_files()

    # Primera pasada: aplica todo lo pendiente (como haría `migrate.py` real).
    applied = await _applied_versions(conn)
    for f in files:
        if f.name not in applied:
            await _apply_migration(conn, f)

    # Segunda pasada: recalcular pendientes debe dar una lista vacía, y no
    # debe haber ningún intento de reaplicar (lo que fallaría por PK duplicada
    # en schema_migrations o por objetos ya existentes).
    applied_second_pass = await _applied_versions(conn)
    pending_second_pass = [f for f in files if f.name not in applied_second_pass]

    assert pending_second_pass == []

    row = await conn.fetchrow("SELECT count(*) AS n FROM schema_migrations")
    assert row["n"] == len(files)
