"""
HSO-11 — Reconciliación de articulos.stock_actual contra la suma de sus lotes.

Desde HSO-11 los lotes son la fuente de verdad y stock_actual es una caché que
mantiene services/stock.py. Este script lista los artículos donde no coinciden.

Por defecto SOLO REPORTA. Con --apply iguala stock_actual a la suma de lotes
(en una transacción, bloqueando cada artículo). No toca lotes ni movimientos.

Uso (desde backend/):
    python scripts/reconciliar_stock.py                    # informe
    python scripts/reconciliar_stock.py --tenant <uuid>    # informe de un tenant
    python scripts/reconciliar_stock.py --apply            # corrige

Conexión: variable de entorno DATABASE_URL o, si no existe, backend/.env.
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path
from uuid import UUID

import asyncpg
from dotenv import dotenv_values

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from services.stock import diferencias_stock, reconciliar_stock_actual  # noqa: E402


async def run(dsn: str, apply: bool = False, tenant_id=None) -> list[dict]:
    tid = UUID(str(tenant_id)) if tenant_id else None
    conn = await asyncpg.connect(dsn, statement_cache_size=0)
    try:
        if not apply:
            return await diferencias_stock(conn, tid)
        async with conn.transaction():
            return await reconciliar_stock_actual(conn, tid)
    finally:
        await conn.close()


def _imprimir(filas: list[dict], apply: bool) -> None:
    if not filas:
        print("OK: stock_actual coincide con la suma de lotes en todos los artículos.")
        return
    print(f"{'Tenant':<28} {'Artículo':<32} {'stock_actual':>14} {'suma_lotes':>14} {'diferencia':>14}")
    for f in filas:
        print(
            f"{f['tenant'][:28]:<28} {f['articulo'][:32]:<32} "
            f"{f['stock_actual']:>14} {f['suma_lotes']:>14} {f['diferencia']:>14}"
        )
    if apply:
        print(f"\nCorregidos {len(filas)} artículos: stock_actual = suma de lotes.")
    else:
        print(f"\n{len(filas)} artículos descuadrados. Nada modificado (usa --apply para corregir).")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="corrige stock_actual (por defecto solo informa)")
    parser.add_argument("--tenant", help="limitar a un tenant (uuid)")
    args = parser.parse_args()

    dsn = os.environ.get("DATABASE_URL") or dotenv_values(BACKEND_DIR / ".env").get("DATABASE_URL")
    if not dsn:
        print("Falta DATABASE_URL (entorno o backend/.env).", file=sys.stderr)
        return 2

    filas = asyncio.run(run(dsn, apply=args.apply, tenant_id=args.tenant))
    _imprimir(filas, args.apply)
    return 1 if filas and not args.apply else 0


if __name__ == "__main__":
    sys.exit(main())
