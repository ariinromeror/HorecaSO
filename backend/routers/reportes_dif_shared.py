"""Helpers compartidos reportes diferenciales (PDF)."""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException, Response, status

logger = logging.getLogger(__name__)

_DIAS_KEYS = [
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
]


def _uid(cu: dict) -> UUID:
    s = cu.get("user_id") or cu.get("sub")
    if not s:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    return UUID(str(s))


def _tenant_id(cu: dict) -> UUID:
    tid = cu.get("negocio_id")
    if not tid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario sin tenant asignado",
        )
    return UUID(str(tid))


async def _outlet_id(conn, user_id: UUID) -> UUID:
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


def _pdf_resp(pdf_bytes: bytes, nombre: str) -> Response:
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={nombre}.pdf"},
    )


def _fmt_hora(t) -> str:
    if t is None:
        return ""
    if hasattr(t, "strftime"):
        return t.strftime("%H:%M")
    s = str(t)
    return s[:5] if len(s) >= 5 else s
