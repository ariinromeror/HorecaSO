"""
Mesas: listado y detalle.
"""

import logging
from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import require_roles
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

_SQL_MESA_SELECT = """
SELECT
    m.id, m.outlet_id, m.numero, m.capacidad,
    m.posicion_x, m.posicion_y, m.zona,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.mesa_id = m.id AND t.estado = 'abierto'
        ) THEN 'ocupada'
        WHEN EXISTS (
            SELECT 1 FROM reservas r
            WHERE r.mesa_id = m.id
              AND r.fecha = $HOY
              AND r.estado IN ('pendiente', 'confirmada')
        ) THEN 'reservada'
        WHEN m.estado = 'ocupada' THEN 'libre'
        ELSE m.estado
    END AS estado,
    rv.hora AS reserva_hora,
    rv.nombre_cliente AS reserva_nombre,
    rv.num_personas AS reserva_personas
FROM mesas m
LEFT JOIN LATERAL (
    SELECT r.hora, r.nombre_cliente, r.num_personas
    FROM reservas r
    WHERE r.mesa_id = m.id
      AND r.fecha = $HOY
      AND r.estado IN ('pendiente', 'confirmada')
    ORDER BY r.hora
    LIMIT 1
) rv ON TRUE
"""


def _hoy_madrid_date():
    return datetime.now(ZoneInfo("Europe/Madrid")).date()


async def list_mesas_handler(current_user: dict):
    """
    Lista mesas. Si usuario tiene outlet_id → solo ese outlet.
    Si no (admin/director) → todas las mesas del tenant.
    Estado efectivo: ticket abierto → ocupada; reserva activa hoy → reservada;
    ocupada sin ticket → libre.
    """
    try:
        hoy = _hoy_madrid_date()
        async with get_db() as conn:
            tenant_id, outlet_id = await _get_user_tenant_outlet(
                conn, current_user["sub"]
            )

            if outlet_id:
                sql = (
                    _SQL_MESA_SELECT.replace("$HOY", "$2")
                    + " WHERE m.outlet_id = $1 ORDER BY m.numero"
                )
                rows = await conn.fetch(sql, UUID(outlet_id), hoy)
            elif tenant_id:
                sql = (
                    _SQL_MESA_SELECT.replace("$HOY", "$2")
                    + """
                JOIN outlets o ON m.outlet_id = o.id
                WHERE o.tenant_id = $1
                ORDER BY m.numero
                """
                )
                rows = await conn.fetch(sql, UUID(tenant_id), hoy)
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Usuario sin tenant asignado",
                )

        return [_mesa_to_dict(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_mesas: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/")
async def list_mesas(
    current_user: dict = Depends(require_roles(ROLES_LISTADO_OPERATIVO)),
):
    return await list_mesas_handler(current_user)


@router.get("/{mesa_id}")
async def get_mesa(
    mesa_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_LISTADO_OPERATIVO)),
):
    """Devuelve detalle de una mesa. HTTP 404 si no existe o es de otro tenant/outlet."""
    try:
        hoy = _hoy_madrid_date()
        async with get_db() as conn:
            tenant_id, outlet_id = await _get_user_tenant_outlet(
                conn, current_user["sub"]
            )
            if outlet_id:
                sql = (
                    _SQL_MESA_SELECT.replace("$HOY", "$2")
                    + " WHERE m.id = $1 AND m.outlet_id = $3"
                )
                row = await conn.fetchrow(sql, mesa_id, hoy, UUID(outlet_id))
            elif tenant_id:
                sql = (
                    _SQL_MESA_SELECT.replace("$HOY", "$2")
                    + """
                JOIN outlets o ON m.outlet_id = o.id
                WHERE m.id = $1 AND o.tenant_id = $3
                """
                )
                row = await conn.fetchrow(sql, mesa_id, hoy, UUID(tenant_id))
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Usuario sin tenant asignado",
                )

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mesa no encontrada",
            )

        return _mesa_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_mesa: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
