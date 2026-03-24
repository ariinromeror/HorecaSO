"""
Helpers compartidos KDS (comandas y estados).
"""

import logging
from typing import Literal
from uuid import UUID

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

ROLES_KDS_LECTURA = [
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "barra",
]
ROLES_KDS_ESCRITURA = [
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "barra",
]


async def _get_user_outlet(conn, user_id: str) -> str | None:
    row = await conn.fetchrow(
        "SELECT outlet_id FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["outlet_id"]:
        return None
    return str(row["outlet_id"])


def _kds_vista_for_role(role: str | None) -> Literal["cocina", "barra", "completa"]:
    r = role or ""
    if r == "cocina":
        return "cocina"
    if r == "barra":
        return "barra"
    if r in ("camarero", "jefe_sala", "admin", "director"):
        return "completa"
    return "cocina"


def _resolve_vista(current_user: dict, vista_query: str | None) -> str:
    role = current_user.get("role")
    if vista_query and role in ("admin", "director"):
        if vista_query not in ("cocina", "barra", "completa"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="vista debe ser cocina, barra o completa",
            )
        return vista_query
    return _kds_vista_for_role(role)


def _assert_patch_role_destino(role: str | None, destino_kds: str) -> None:
    r = role or ""
    dk = destino_kds or "cocina"
    if r == "cocina" and dk != "cocina":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para líneas de barra",
        )
    if r == "barra" and dk != "barra":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para líneas de cocina",
        )


def _minutos_espera(val) -> float:
    if val is None:
        return 0.0
    return max(0.0, round(float(val), 1))


def _alerta_linea(minutos: float) -> Literal["ok", "warning", "critico"]:
    if minutos < 5:
        return "ok"
    if minutos < 10:
        return "warning"
    return "critico"


def _alerta_comanda(lineas_alertas: list[str]) -> Literal["ok", "warning", "critico"]:
    if "critico" in lineas_alertas:
        return "critico"
    if "warning" in lineas_alertas:
        return "warning"
    return "ok"
