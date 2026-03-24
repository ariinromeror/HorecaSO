"""
Mesas: listado y detalle.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import get_current_user, require_roles
from database import get_db

from .mesas_shared import _get_user_tenant_outlet, _mesa_to_dict

logger = logging.getLogger(__name__)

router = APIRouter()

ROLES_LISTADO_OPERATIVO = [
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "barra",
    "almacen",
]


async def list_mesas_handler(current_user: dict):
    """
    Lista mesas. Si usuario tiene outlet_id → solo ese outlet.
    Si no (admin/director) → todas las mesas del tenant.
    """
    async with get_db() as conn:
        tenant_id, outlet_id = await _get_user_tenant_outlet(conn, current_user["sub"])

        if outlet_id:
            rows = await conn.fetch(
                "SELECT * FROM mesas WHERE outlet_id = $1 ORDER BY numero",
                UUID(outlet_id),
            )
        elif tenant_id:
            rows = await conn.fetch(
                """
                SELECT m.* FROM mesas m
                JOIN outlets o ON m.outlet_id = o.id
                WHERE o.tenant_id = $1
                ORDER BY m.numero
                """,
                UUID(tenant_id),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant asignado",
            )

    return [_mesa_to_dict(r) for r in rows]


@router.get("/")
async def list_mesas(
    current_user: dict = Depends(require_roles(ROLES_LISTADO_OPERATIVO)),
):
    return await list_mesas_handler(current_user)


@router.get("/{mesa_id}")
async def get_mesa(
    mesa_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Devuelve detalle de una mesa. HTTP 404 si no existe."""
    async with get_db() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM mesas WHERE id = $1",
            mesa_id,
        )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesa no encontrada",
        )

    return _mesa_to_dict(row)
