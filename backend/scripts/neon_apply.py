"""
Carga el esquema y los datos ficticios de la demo en una base PostgreSQL (Neon).

Uso (desde la carpeta backend, con las dependencias instaladas):
    export DATABASE_URL='...'   # la cadena de Neon; NO se imprime nunca
    python scripts/neon_apply.py          # aplica todo
    python scripts/neon_apply.py --check  # solo cuenta tablas y filas

Seguridad:
- Todas las cuentas de usuario reciben una contraseña ALEATORIA que se descarta
  (hash bcrypt de 32 bytes aleatorios). Nadie puede entrar con contraseña; el
  acceso de la demo se hace con el endpoint /api/auth/demo/{rol}.
- Se niega a ejecutarse si la base ya tiene la tabla `tenants` (evita duplicar
  restricciones). Usa --force solo si sabes lo que haces.
"""

import asyncio
import os
import secrets
import sys
from pathlib import Path

import asyncpg
from passlib.context import CryptContext

SQL = Path(__file__).resolve().parent.parent / "sql"
PLACEHOLDERS = ("PLACEHOLDER_HASH", "REEMPLAZAR_CON_HASH_DE_generate_test_hashes.py")


def _hash_aleatorio() -> str:
    # bcrypt corta en 72 bytes; 32 bytes aleatorios en hex = 64 caracteres.
    return CryptContext(schemes=["bcrypt"]).hash(secrets.token_hex(32))


def _leer(nombre: str) -> str:
    return (SQL / nombre).read_text(encoding="utf-8")


async def _ejecutar(conn: asyncpg.Connection, nombre: str, texto: str) -> None:
    try:
        await conn.execute(texto)
    except Exception as e:  # noqa: BLE001
        print(f"  FALLO en {nombre}: {type(e).__name__}: {e}")
        raise
    print(f"  ok  {nombre}")


async def _check(conn: asyncpg.Connection) -> None:
    n = await conn.fetchval(
        "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
    )
    print(f"Tablas en public: {n}")
    for t in ("tenants", "usuarios", "productos", "mesas", "articulos"):
        try:
            c = await conn.fetchval(f"SELECT count(*) FROM public.{t}")
            print(f"  {t}: {c}")
        except asyncpg.UndefinedTableError:
            print(f"  {t}: (no existe)")


async def main() -> int:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        # Alternativa: backend/.env (ignorado por Git). Nunca se imprime.
        from dotenv import dotenv_values

        url = (dotenv_values(SQL.parent / ".env").get("DATABASE_URL") or "").strip()
    if not url:
        print("Falta la variable DATABASE_URL.")
        return 1
    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        if "--check" in sys.argv:
            await _check(conn)
            return 0
        existe = await conn.fetchval("SELECT to_regclass('public.tenants') IS NOT NULL")
        if existe and "--force" not in sys.argv:
            print("La base ya tiene tablas. Nada que hacer (usa --check para ver).")
            return 1

        print("Aplicando...")
        await _ejecutar(conn, "neon_schema.sql", _leer("neon_schema.sql"))

        fase_b = _leer("migration_fase_b.sql")
        for ph in PLACEHOLDERS:
            while ph in fase_b:
                fase_b = fase_b.replace(ph, _hash_aleatorio(), 1)
        await _ejecutar(conn, "migration_fase_b.sql", fase_b)

        for nombre in (
            "migration_tenants_email_slug.sql",
            "migration_kds_barra_destino.sql",
            "migration_piloto_tenants_modulos.sql",
            "seed_demo_tenant_prueba_abcd.sql",
            "seed_despensa_articulos_prueba.sql",
            "seed_predicciones_mermas_demo.sql",
        ):
            await _ejecutar(conn, nombre, _leer(nombre))

        print()
        await _check(conn)
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
