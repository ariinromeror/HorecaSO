"""
FIFO — lotes de inventario y altas.
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from auth.dependencies import require_roles
from database import get_db

from .fifo_shared import (
    ROLES_ALMACEN,
    _outlet_id_usuario,
    _q2,
    _q4,
    _serialize_lote_row,
    _tenant_id_usuario,
    _uid,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/fifo",
    tags=["FIFO"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


@router.get("/lotes")
async def list_lotes_fifo(
    articulo_id: Optional[UUID] = Query(None),
    solo_activos: Optional[bool] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_ALMACEN)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            conds = [
                "l.outlet_id = $1",
                "a.tenant_id = $2",
            ]
            params: list[Any] = [outlet_id, tenant_id]
            n = 3
            if articulo_id is not None:
                conds.append("l.articulo_id = $" + str(n))
                params.append(articulo_id)
                n += 1
            if solo_activos is True:
                conds.append("l.cantidad > 0")
            where_sql = " AND ".join(conds)
            rows = await conn.fetch(
                """
                SELECT
                    l.id,
                    l.articulo_id,
                    l.outlet_id,
                    l.cantidad,
                    l.coste_unitario,
                    l.fecha_caducidad,
                    l.numero_lote,
                    l.created_at,
                    a.nombre AS nombre_articulo,
                    a.unidad_medida,
                    a.sku
                FROM lotes_inventario l
                JOIN articulos a ON l.articulo_id = a.id
                WHERE """
                + where_sql
                + """
                ORDER BY l.fecha_caducidad ASC NULLS LAST, l.created_at ASC
                """,
                *params,
            )
            return [_serialize_lote_row(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_lotes_fifo: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class CreateLoteFifoBody(BaseModel):
    articulo_id: UUID
    cantidad: Decimal = Field(..., gt=0)
    coste_unitario: Decimal = Field(..., ge=0)
    fecha_caducidad: Optional[date] = None
    numero_lote: Optional[str] = None


@router.post("/lotes", status_code=status.HTTP_201_CREATED)
async def create_lote_fifo(
    body: CreateLoteFifoBody,
    current_user: dict = Depends(require_roles(ROLES_ALMACEN)),
):
    user_uuid = _uid(current_user)
    cant = _q4(body.cantidad)
    coste_u = _q2(body.coste_unitario)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)

            art = await conn.fetchrow(
                """
                SELECT id FROM articulos
                WHERE id = $1 AND tenant_id = $2
                FOR UPDATE
                """,
                body.articulo_id,
                tenant_id,
            )
            if not art:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Artículo no encontrado",
                )

            row = await conn.fetchrow(
                """
                INSERT INTO lotes_inventario (
                    articulo_id, outlet_id, cantidad, coste_unitario,
                    fecha_caducidad, numero_lote
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                body.articulo_id,
                outlet_id,
                cant,
                coste_u,
                body.fecha_caducidad,
                body.numero_lote.strip() if body.numero_lote else None,
            )
            lid = row["id"]

            await conn.execute(
                """
                UPDATE articulos
                SET stock_actual = stock_actual + $1,
                    coste_unitario = $2
                WHERE id = $3 AND tenant_id = $4
                """,
                cant,
                coste_u,
                body.articulo_id,
                tenant_id,
            )

            await conn.execute(
                """
                INSERT INTO movimientos_stock (
                    articulo_id, outlet_id, tipo, cantidad, coste_unitario,
                    motivo, usuario_id, ticket_id
                )
                VALUES ($1, $2, 'entrada', $3, $4, 'lote_fifo', $5, NULL)
                """,
                body.articulo_id,
                outlet_id,
                cant,
                coste_u,
                user_uuid,
            )

            r2 = await conn.fetchrow(
                """
                SELECT
                    l.id,
                    l.articulo_id,
                    l.outlet_id,
                    l.cantidad,
                    l.coste_unitario,
                    l.fecha_caducidad,
                    l.numero_lote,
                    l.created_at,
                    a.nombre AS nombre_articulo,
                    a.unidad_medida,
                    a.sku
                FROM lotes_inventario l
                JOIN articulos a ON l.articulo_id = a.id
                WHERE l.id = $1
                """,
                lid,
            )
            return _serialize_lote_row(r2)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_lote_fifo: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
