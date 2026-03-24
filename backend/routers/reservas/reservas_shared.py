"""
Helpers compartidos reservas y lista de espera.
"""

from __future__ import annotations

import logging
import re
from datetime import time
from typing import Any

from uuid import UUID

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

ROLES_GESTION = ["admin", "director", "jefe_sala"]
ROLES_TODOS = [
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "almacen",
]


def _uid(current_user: dict) -> UUID:
    s = current_user.get("user_id") or current_user.get("sub")
    if not s:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    return UUID(str(s))


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


_HORA_RE = re.compile(r"^\d{1,2}:\d{2}$")


def _parse_hora_time(s: str) -> time:
    """Valida HH:MM y devuelve datetime.time para asyncpg (columna TIME)."""
    if not s or not _HORA_RE.match(s.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hora debe ser HH:MM",
        )
    partes = s.strip().split(":")
    h, m = int(partes[0]), int(partes[1])
    if h < 0 or h > 23 or m < 0 or m > 59:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hora inválida",
        )
    return time(h, m)


def _serialize_reserva(r: Any) -> dict:
    fe = r.get("fecha")
    ho = r.get("hora")
    ca = r.get("created_at")
    return {
        "id": str(r["id"]),
        "outlet_id": str(r["outlet_id"]),
        "mesa_id": str(r["mesa_id"]) if r.get("mesa_id") else None,
        "mesa_numero": r.get("mesa_numero"),
        "zona": r.get("zona"),
        "nombre_cliente": r["nombre_cliente"],
        "telefono": r["telefono"],
        "email": r.get("email"),
        "fecha": fe.isoformat() if fe is not None and hasattr(fe, "isoformat") else None,
        "hora": ho.isoformat()
        if ho is not None and hasattr(ho, "isoformat")
        else str(ho)
        if ho is not None
        else None,
        "num_personas": r["num_personas"],
        "estado": r["estado"],
        "notas": r.get("notas"),
        "origen": r.get("origen"),
        "recordatorio_enviado": r.get("recordatorio_enviado", False),
        "cliente_id": str(r["cliente_id"]) if r.get("cliente_id") else None,
        "created_at": ca.isoformat() if ca is not None and hasattr(ca, "isoformat") else None,
    }


def _serialize_lista_espera(r: Any) -> dict:
    hl = r.get("hora_llegada")
    return {
        "id": str(r["id"]),
        "outlet_id": str(r["outlet_id"]),
        "nombre_cliente": r["nombre_cliente"],
        "telefono": r["telefono"],
        "num_personas": r["num_personas"],
        "hora_llegada": hl.isoformat() if hl is not None and hasattr(hl, "isoformat") else None,
        "estado": r["estado"],
        "tiempo_estimado": r.get("tiempo_estimado"),
    }
