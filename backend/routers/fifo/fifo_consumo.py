"""
FIFO — consumo, alertas de caducidad y valoración.
"""

from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from auth.dependencies import require_modulo, require_roles
from database import get_db
from services import stock
from services.fechas import hoy_madrid

from .fifo_shared import (
    ROLES_ALMACEN,
    _outlet_id_usuario,
    _q2,
    _serialize_lote_row,
    _str_money,
    _str_qty,
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


class ConsumirFifoBody(BaseModel):
    articulo_id: UUID
    cantidad: Decimal = Field(..., gt=0)
    motivo: str = Field(..., min_length=1)


@router.post("/consumir")
async def consumir_fifo(
    body: ConsumirFifoBody,
    current_user: dict = Depends(require_roles(ROLES_ALMACEN)),
    _: dict = Depends(require_modulo("fifo")),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)

            res = await stock.registrar_salida(
                conn,
                tenant_id=tenant_id,
                outlet_id=outlet_id,
                usuario_id=user_uuid,
                articulo_id=body.articulo_id,
                cantidad=body.cantidad,
                tipo="salida",
                motivo=body.motivo.strip(),
            )

            return {
                "articulo_id": str(body.articulo_id),
                "cantidad_consumida": _str_qty(res.cantidad),
                "coste_medio_ponderado": _str_money(res.coste_unitario),
                "lotes_afectados": res.lotes_afectados,
            }
    except HTTPException:
        raise
    except stock.StockError as e:
        raise stock.a_http(e)
    except Exception as e:
        logger.error("consumir_fifo: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/alertas-caducidad")
async def list_alertas_caducidad(
    dias: int = Query(7, ge=1, le=365),
    current_user: dict = Depends(require_roles(ROLES_ALMACEN)),
    _: dict = Depends(require_modulo("fifo")),
):
    user_uuid = _uid(current_user)
    hoy = hoy_madrid()
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
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
                WHERE l.outlet_id = $1
                  AND a.tenant_id = $2
                  AND l.cantidad > 0
                  AND l.fecha_caducidad IS NOT NULL
                  AND l.fecha_caducidad <= ($4::date + $3::integer)
                  AND l.fecha_caducidad >= $4::date
                ORDER BY l.fecha_caducidad ASC
                """,
                outlet_id,
                tenant_id,
                dias,
                hoy,
            )

        out = []
        for r in rows:
            fc = r["fecha_caducidad"]
            if fc is None:
                continue
            fd = fc.date() if isinstance(fc, datetime) else fc
            dias_rest = (fd - hoy).days
            base = _serialize_lote_row(r)
            base["dias_restantes"] = dias_rest
            out.append(base)
        return out
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_alertas_caducidad: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/valoracion-stock")
async def get_valoracion_stock(
    current_user: dict = Depends(require_roles(ROLES_ALMACEN)),
    _: dict = Depends(require_modulo("fifo")),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            rows = await conn.fetch(
                """
                SELECT
                    a.id,
                    a.nombre,
                    a.sku,
                    a.unidad_medida,
                    COALESCE(SUM(l.cantidad), 0) AS stock_total,
                    COALESCE(SUM(l.cantidad * l.coste_unitario), 0) AS valor_total,
                    CASE
                        WHEN COALESCE(SUM(l.cantidad), 0) > 0 THEN
                            SUM(l.cantidad * l.coste_unitario) / SUM(l.cantidad)
                        ELSE 0
                    END AS coste_medio
                FROM lotes_inventario l
                JOIN articulos a ON l.articulo_id = a.id
                WHERE l.outlet_id = $1
                  AND l.cantidad > 0
                  AND a.tenant_id = $2
                GROUP BY a.id, a.nombre, a.sku, a.unidad_medida
                ORDER BY valor_total DESC
                """,
                outlet_id,
                tenant_id,
            )

        articulos_out = []
        valor_almacen = Decimal("0")
        for r in rows:
            st = Decimal(str(r["stock_total"] or 0))
            vt = Decimal(str(r["valor_total"] or 0))
            cm = Decimal(str(r["coste_medio"] or 0))
            valor_almacen = _q2(valor_almacen + vt)
            articulos_out.append(
                {
                    "articulo_id": str(r["id"]),
                    "nombre": r["nombre"],
                    "sku": r.get("sku"),
                    "unidad_medida": r.get("unidad_medida"),
                    "stock_total": _str_qty(st),
                    "valor_total": _str_money(vt),
                    "coste_medio": _str_money(_q2(cm)),
                }
            )

        return {
            "articulos": articulos_out,
            "valor_total_almacen": _str_money(valor_almacen),
            "num_articulos": len(articulos_out),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_valoracion_stock: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
