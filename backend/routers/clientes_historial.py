"""
Historial de tickets y puntos de fidelidad de clientes.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth.dependencies import require_roles
from database import get_db

from routers.clientes_shared import (
    ROLES_GESTION,
    _money_str,
    _outlet_id_usuario,
    _serialize_cliente,
    _tenant_id_usuario,
    _uid,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


@router.get("/{cliente_id}/historial")
async def get_cliente_historial(
    cliente_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            cliente_row = await conn.fetchrow(
                "SELECT * FROM clientes WHERE id = $1 AND tenant_id = $2",
                cliente_id,
                tenant_id,
            )
            if not cliente_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            ticket_rows = await conn.fetch(
                """
                SELECT
                    t.id,
                    t.total,
                    t.created_at,
                    t.cobrado_at,
                    t.metodo_pago,
                    t.num_comensales,
                    t.estado
                FROM tickets t
                LEFT JOIN mesas m ON t.mesa_id = m.id
                WHERE t.outlet_id = $1
                  AND t.estado = 'cobrado'
                ORDER BY t.cobrado_at DESC NULLS LAST
                LIMIT 20
                """,
                outlet_id,
            )
            tickets_out = []
            for t in ticket_rows:
                tickets_out.append(
                    {
                        "id": str(t["id"]),
                        "total": _money_str(t.get("total")),
                        "created_at": t["created_at"].isoformat()
                        if t.get("created_at")
                        else None,
                        "cobrado_at": t["cobrado_at"].isoformat()
                        if t.get("cobrado_at")
                        else None,
                        "metodo_pago": t.get("metodo_pago"),
                        "num_comensales": t.get("num_comensales"),
                        "estado": t["estado"],
                    }
                )
            return {
                "cliente": _serialize_cliente(cliente_row),
                "tickets": tickets_out,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_cliente_historial: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class AjustePuntosBody(BaseModel):
    puntos: int
    motivo: str = Field(..., min_length=1)


@router.post("/{cliente_id}/puntos")
async def ajustar_puntos_cliente(
    cliente_id: UUID,
    body: AjustePuntosBody,
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            exists = await conn.fetchval(
                "SELECT 1 FROM clientes WHERE id = $1 AND tenant_id = $2",
                cliente_id,
                tenant_id,
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            row = await conn.fetchrow(
                """
                UPDATE clientes
                SET puntos_fidelidad = puntos_fidelidad + $1
                WHERE id = $2 AND tenant_id = $3
                  AND puntos_fidelidad + $1 >= 0
                RETURNING
                    id, tenant_id, nombre, email, telefono, fecha_nacimiento,
                    alergenos, preferencias, total_visitas, gasto_total, gasto_medio,
                    ultima_visita, puntos_fidelidad, notas, created_at
                """,
                body.puntos,
                cliente_id,
                tenant_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Puntos insuficientes",
                )
            logger.info(
                "Puntos cliente %s ajuste %+d motivo=%s",
                cliente_id,
                body.puntos,
                body.motivo[:200],
            )
            return _serialize_cliente(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("ajustar_puntos_cliente: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
