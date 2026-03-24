"""
Helpers compartidos FIFO (lotes y consumo).
"""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status

ROLES_ALMACEN = ["admin", "director", "almacen"]


def _uid(current_user: dict) -> UUID:
    s = current_user.get("user_id") or current_user.get("sub")
    if not s:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    return UUID(str(s))


async def _tenant_id_usuario(conn, user_id: UUID) -> UUID:
    row = await conn.fetchrow(
        "SELECT tenant_id FROM usuarios WHERE id = $1",
        user_id,
    )
    if not row or not row["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario sin tenant asignado",
        )
    return row["tenant_id"]


async def _outlet_id_usuario(conn, user_id: UUID) -> UUID:
    row = await conn.fetchrow(
        "SELECT outlet_id FROM usuarios WHERE id = $1",
        user_id,
    )
    if not row or not row["outlet_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario sin outlet asignado",
        )
    return row["outlet_id"]


def _q2(d: Decimal) -> Decimal:
    return d.quantize(Decimal("0.01"), ROUND_HALF_UP)


def _q4(d: Decimal) -> Decimal:
    return d.quantize(Decimal("0.0001"), ROUND_HALF_UP)


def _str_qty(d: Decimal) -> str:
    return str(_q4(d))


def _str_money(d: Decimal) -> str:
    return str(_q2(d))


def _serialize_lote_row(r: Any) -> dict:
    ca = r.get("created_at")
    fc = r.get("fecha_caducidad")
    return {
        "id": str(r["id"]),
        "articulo_id": str(r["articulo_id"]),
        "outlet_id": str(r["outlet_id"]),
        "cantidad": _str_qty(Decimal(str(r["cantidad"] or 0))),
        "coste_unitario": _str_money(Decimal(str(r["coste_unitario"] or 0))),
        "fecha_caducidad": fc.isoformat()
        if fc is not None and hasattr(fc, "isoformat")
        else None,
        "numero_lote": r.get("numero_lote"),
        "created_at": ca.isoformat() if ca is not None and hasattr(ca, "isoformat") else None,
        "nombre_articulo": r.get("nombre_articulo"),
        "unidad_medida": r.get("unidad_medida"),
        "sku": r.get("sku"),
    }
