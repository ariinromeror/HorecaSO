"""
Runner de migraciones versionadas para HorecaSO.

Aplica, en orden alfabético/numérico, los ficheros `.sql` de
`backend/sql/migrations/` que todavía no estén registrados en la tabla
de control `schema_migrations`. Cada migración se aplica dentro de su
propia transacción y se registra en la misma transacción, así que un
fallo a mitad de fichero no deja la migración marcada como aplicada.

Uso:
    python backend/scripts/migrate.py              # aplica las pendientes
    python backend/scripts/migrate.py --dry-run     # solo lista qué aplicaría
    python backend/scripts/migrate.py --status      # lista aplicadas/pendientes, no aplica nada

Variables de entorno:
    DATABASE_URL — obligatoria (misma variable que usa el backend).

Fuera de alcance (documentado como limitación conocida — ver Fase 5 del PRD):
    - No hay rollback automático (`down` migrations). Si una migración necesita
      revertirse, se escribe una migración nueva que deshaga el cambio.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

import asyncpg

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "sql" / "migrations"

CREATE_SCHEMA_MIGRATIONS_TABLE = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: la variable de entorno DATABASE_URL no está definida.", file=sys.stderr)
        sys.exit(1)
    return url


def _migration_files() -> list[Path]:
    if not MIGRATIONS_DIR.is_dir():
        return []
    return sorted(p for p in MIGRATIONS_DIR.glob("*.sql") if p.is_file())


async def _applied_versions(conn: asyncpg.Connection) -> set[str]:
    await conn.execute(CREATE_SCHEMA_MIGRATIONS_TABLE)
    rows = await conn.fetch("SELECT version FROM schema_migrations")
    return {row["version"] for row in rows}


async def _apply_migration(conn: asyncpg.Connection, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    async with conn.transaction():
        await conn.execute(sql)
        await conn.execute(
            "INSERT INTO schema_migrations (version) VALUES ($1)",
            path.name,
        )


async def run(dry_run: bool, status_only: bool) -> int:
    files = _migration_files()
    if not files:
        print(f"No se encontraron migraciones en {MIGRATIONS_DIR}")
        return 0

    conn = await asyncpg.connect(_database_url(), statement_cache_size=0)
    try:
        applied = await _applied_versions(conn)
        pending = [f for f in files if f.name not in applied]

        if status_only:
            print(f"Migraciones encontradas: {len(files)}")
            for f in files:
                marca = "✔ aplicada" if f.name in applied else "… pendiente"
                print(f"  [{marca}] {f.name}")
            return 0

        if not pending:
            print("Nada que aplicar: todas las migraciones ya están registradas.")
            return 0

        print(f"Migraciones pendientes ({len(pending)} de {len(files)}):")
        for f in pending:
            print(f"  - {f.name}")

        if dry_run:
            print("\n--dry-run: no se ha aplicado ninguna migración.")
            return 0

        print()
        for f in pending:
            print(f"Aplicando {f.name} ...", end=" ", flush=True)
            try:
                await _apply_migration(conn, f)
            except Exception as exc:
                print("FALLÓ")
                print(f"ERROR aplicando {f.name}: {exc}", file=sys.stderr)
                return 1
            print("OK")

        print(f"\n{len(pending)} migración(es) aplicada(s) correctamente.")
        return 0
    finally:
        await conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Lista las migraciones pendientes sin aplicarlas.",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Lista todas las migraciones con su estado (aplicada/pendiente) y termina.",
    )
    args = parser.parse_args()
    exit_code = asyncio.run(run(dry_run=args.dry_run, status_only=args.status))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
