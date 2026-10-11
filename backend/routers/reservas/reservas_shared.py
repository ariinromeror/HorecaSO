"""
Helpers compartidos reservas y lista de espera.
"""

from __future__ import annotations

import logging
import re
from datetime import date, datetime, time
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

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

ESTADOS_RESERVA_ACTIVOS = frozenset({"pendiente", "confirmada"})
TZ_MADRID = ZoneInfo("Europe/Madrid")


def _hoy_madrid() -> date:
    return datetime.now(TZ_MADRID).date()


def _uid(current_user: dict) -> UUID:
    s = current_user.get("user_id") or current_user.get("sub")
    if not s:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    return UUID(str(s))


async def _outlet_id_usuario(conn, user_id: UUID) -> UUID:
    """Outlet del usuario; debe pertenecer a su tenant (404 si no)."""
    row = await conn.fetchrow(
        "SELECT outlet_id, tenant_id FROM usuarios WHERE id = $1",
        user_id,
    )
    if not row or not row["outlet_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario sin outlet asignado",
        )
    if not row["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario sin tenant asignado",
        )
    ok = await conn.fetchval(
        "SELECT 1 FROM outlets WHERE id = $1 AND tenant_id = $2",
        row["outlet_id"],
        row["tenant_id"],
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outlet no encontrado",
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


async def _sync_estado_mesa_reserva(
    conn,
    mesa_id: UUID | None,
    fecha: date | None = None,
) -> None:
    """
    El estado de sala solo refleja reservas activas de HOY (Europe/Madrid).
    Si hay pendiente/confirmada hoy y no hay ticket abierto → reservada.
    Si no quedan → libre (solo si estaba reservada).
    """
    if not mesa_id:
        return
    # fecha se acepta por compatibilidad; el bloqueo operativo es siempre "hoy"
    _ = fecha
    fecha_ref = _hoy_madrid()

    abierto = await conn.fetchval(
        """
        SELECT 1 FROM tickets
        WHERE mesa_id = $1 AND estado = 'abierto'
        LIMIT 1
        """,
        mesa_id,
    )
    if abierto:
        return

    activa = await conn.fetchval(
        """
        SELECT 1 FROM reservas
        WHERE mesa_id = $1
          AND fecha = $2
          AND estado = ANY($3::text[])
        LIMIT 1
        """,
        mesa_id,
        fecha_ref,
        list(ESTADOS_RESERVA_ACTIVOS),
    )
    if activa:
        await conn.execute(
            "UPDATE mesas SET estado = 'reservada' WHERE id = $1",
            mesa_id,
        )
    else:
        await conn.execute(
            """
            UPDATE mesas
            SET estado = 'libre'
            WHERE id = $1 AND estado = 'reservada'
            """,
            mesa_id,
        )


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
