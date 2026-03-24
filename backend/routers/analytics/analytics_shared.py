"""
Helpers compartidos analytics (dashboard).
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

ROLES_ANALYTICS = ["admin", "director"]


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


def _d(v: Any) -> Decimal:
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


def _median_decimal(values: list[Decimal]) -> Decimal:
    if not values:
        return Decimal("0")
    s = sorted(values)
    n = len(s)
    mid = n // 2
    if n % 2 == 1:
        return s[mid]
    return (s[mid - 1] + s[mid]) / Decimal("2")


def _resolve_rango_fechas(
    desde: Optional[date],
    hasta: Optional[date],
) -> tuple[date, date]:
    h = hasta or date.today()
    d = desde or (h - timedelta(days=29))
    if d > h:
        d, h = h, d
    return d, h
