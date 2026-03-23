"""
Helpers compartidos clientes e historial.
"""

from __future__ import annotations

import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

ROLES_GESTION = ["admin", "director", "jefe_sala"]


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


def _money_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    d = value if isinstance(value, Decimal) else Decimal(str(value))
    return str(d.quantize(Decimal("0.01"), ROUND_HALF_UP))


def _serialize_cliente(r: Any) -> dict:
    fn = r.get("fecha_nacimiento")
    uv = r.get("ultima_visita")
    ca = r.get("created_at")
    al = r.get("alergenos")
    if al is None:
        al_list: list[str] = []
    else:
        al_list = list(al)
    return {
        "id": str(r["id"]),
        "tenant_id": str(r["tenant_id"]),
        "nombre": r["nombre"],
        "email": r.get("email"),
        "telefono": r.get("telefono"),
        "fecha_nacimiento": fn.isoformat()
        if fn is not None and hasattr(fn, "isoformat")
        else None,
        "alergenos": al_list,
        "preferencias": r.get("preferencias"),
        "total_visitas": r.get("total_visitas", 0),
        "gasto_total": _money_str(r.get("gasto_total")),
        "gasto_medio": _money_str(r.get("gasto_medio")),
        "ultima_visita": uv.isoformat()
        if uv is not None and hasattr(uv, "isoformat")
        else None,
        "puntos_fidelidad": r.get("puntos_fidelidad", 0),
        "notas": r.get("notas"),
        "created_at": ca.isoformat() if ca is not None and hasattr(ca, "isoformat") else None,
    }
