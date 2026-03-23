"""
Helpers compartidos admin carta (categorías, productos, alérgenos).
"""

import logging
import re
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal
from uuid import UUID

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

ROLES_ADMIN_CARTA = ["admin", "director"]

# Quitar emojis en nombre/icono de categorías (regla de producto).
_EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001F9FF"
    "\U0001FA00-\U0001FAFF"
    "\u2600-\u26FF"
    "\u2700-\u27BF"
    "\U0001F1E6-\U0001F1FF"
    "\uFE0F"
    "\u200D"
    "]+",
    flags=re.UNICODE,
)


def _strip_emojis(s: str) -> str:
    if not s:
        return ""
    return _EMOJI_RE.sub("", s).strip()


def _sanitize_categoria_nombre(nombre: str) -> str:
    n = _strip_emojis(nombre).strip()
    if not n:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre no puede estar vacío ni ser solo emojis",
        )
    return n


def _sanitize_categoria_icono(icono: str | None) -> str | None:
    if icono is None:
        return None
    stripped = _strip_emojis(icono).strip()
    return stripped if stripped else None


async def _get_user_tenant(conn, user_id: str) -> str | None:
    """Obtiene tenant_id del usuario (validación de tenant tras require_roles)."""
    row = await conn.fetchrow(
        "SELECT tenant_id FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["tenant_id"]:
        return None
    return str(row["tenant_id"])


async def _require_tenant_id(conn, user_id: str) -> str:
    """Exige usuario con tenant asignado."""
    tid = await _get_user_tenant(conn, user_id)
    if not tid:
        raise HTTPException(status_code=403, detail="Usuario sin tenant")
    return tid


def _decimal_respuesta_dinero(value) -> float | None:
    """float solo en dict de respuesta; cálculo con Decimal y redondeo HALF_UP."""
    if value is None:
        return None
    d = Decimal(str(value))
    return float(d.quantize(Decimal("0.01"), ROUND_HALF_UP))


def _normalize_destino_kds(
    destino_kds: Literal["cocina", "barra", "ninguno"] | None,
    tiene_receta: bool,
    es_bebida: bool,
) -> str:
    if destino_kds is not None:
        return destino_kds
    if tiene_receta:
        return "cocina"
    if es_bebida:
        return "barra"
    return "ninguno"
