"""
Helpers compartidos admin recetas e ingredientes.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import HTTPException

logger = logging.getLogger(__name__)

ROLES_RECETAS_ADMIN = ["admin", "director"]
ROLES_RECETAS_COCINA = ["admin", "director", "cocina"]


async def _get_user_tenant(conn, user_id: str) -> str | None:
    """Obtiene tenant_id del usuario."""
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
    """float solo en dict de respuesta; dinero / márgenes a 2 decimales."""
    if value is None:
        return None
    return float(
        Decimal(str(value)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    )


def _decimal_respuesta_qty(value) -> float | None:
    """Cantidades de receta / ingredientes (4 decimales)."""
    if value is None:
        return None
    return float(
        Decimal(str(value)).quantize(Decimal("0.0001"), ROUND_HALF_UP)
    )


def _calcular_semaforo(margen: Decimal) -> str:
    """Verde >65%, amarillo 40-65%, rojo <40%."""
    if margen > Decimal("65"):
        return "verde"
    if margen >= Decimal("40"):
        return "amarillo"
    return "rojo"


def _sanitize_receta_row(r) -> dict:
    """Serializa fila receta tras INSERT/UPDATE (sin float en cálculos)."""
    d = dict(r)
    out: dict = {}
    for k, v in d.items():
        if v is None:
            out[k] = None
        elif isinstance(v, UUID):
            out[k] = str(v)
        elif isinstance(v, Decimal):
            out[k] = (
                _decimal_respuesta_qty(v)
                if k == "rendimiento"
                else _decimal_respuesta_dinero(v)
            )
        elif hasattr(v, "isoformat") and callable(getattr(v, "isoformat")):
            try:
                out[k] = v.isoformat()
            except (TypeError, ValueError):
                out[k] = v
        else:
            out[k] = v
    return out


def _sanitize_ingrediente_row(r) -> dict:
    """Serializa fila receta_ingredientes tras INSERT."""
    d = dict(r)
    out: dict = {}
    for k, v in d.items():
        if v is None:
            out[k] = None
        elif isinstance(v, UUID):
            out[k] = str(v)
        elif isinstance(v, Decimal):
            out[k] = _decimal_respuesta_qty(v)
        else:
            out[k] = v
    return out
