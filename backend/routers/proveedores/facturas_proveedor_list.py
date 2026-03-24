"""
Facturas proveedor: listados y detalle.
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db

from .proveedores_shared import (
    ROLES_LECTURA,
    _factura_linea_to_dict,
    _factura_row_to_dict,
    _tenant_id_usuario,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/facturas-proveedor")
async def list_facturas_proveedor(
    proveedor_id: Optional[str] = Query(None),
    pagada: Optional[bool] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            conds: list[str] = ["f.tenant_id = $1"]
            args: list[Any] = [tenant_id]
            n = 2
            if proveedor_id:
                conds.append(f"f.proveedor_id = ${n}")
                args.append(UUID(proveedor_id))
                n += 1
            if pagada is not None:
                conds.append(f"f.pagada = ${n}")
                args.append(pagada)
                n += 1
            if desde is not None:
                conds.append(f"f.fecha >= ${n}")
                args.append(desde)
                n += 1
            if hasta is not None:
                conds.append(f"f.fecha <= ${n}")
                args.append(hasta)
                n += 1
            where_sql = " AND ".join(conds)
            sql = f"""
                SELECT
                    f.id, f.proveedor_id, p.nombre AS proveedor_nombre,
                    f.numero_factura, f.fecha, f.fecha_vencimiento,
                    f.total, f.pagada, f.pagada_at, f.procesada_ia, f.created_at
                FROM facturas_proveedor f
                JOIN proveedores p ON p.id = f.proveedor_id AND p.tenant_id = f.tenant_id
                WHERE {where_sql}
                ORDER BY f.fecha DESC, f.created_at DESC
            """
            rows = await conn.fetch(sql, *args)
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="proveedor_id inválido",
        )
    except Exception as e:
        logger.error("Error en list_facturas_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return [_factura_row_to_dict(r) for r in rows]


@router.get("/facturas-proveedor/pendientes-pago")
async def list_facturas_pendientes_pago(
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            rows = await conn.fetch(
                """
                SELECT
                    f.id, f.proveedor_id, p.nombre AS proveedor_nombre,
                    f.numero_factura, f.fecha, f.fecha_vencimiento,
                    f.total, f.pagada, f.pagada_at, f.procesada_ia, f.created_at,
                    (f.fecha_vencimiento - CURRENT_DATE) AS dias_vencimiento
                FROM facturas_proveedor f
                JOIN proveedores p ON p.id = f.proveedor_id AND p.tenant_id = f.tenant_id
                WHERE f.tenant_id = $1 AND f.pagada = FALSE
                ORDER BY f.fecha_vencimiento ASC NULLS LAST, f.fecha ASC
                """,
                tenant_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_facturas_pendientes_pago: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    out = []
    for r in rows:
        d = _factura_row_to_dict(r)
        dv = r.get("dias_vencimiento")
        d["dias_vencimiento"] = int(dv) if dv is not None else None
        out.append(d)
    return out


@router.get("/facturas-proveedor/{factura_id}")
async def get_factura_proveedor_detalle(
    factura_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    """Factura con líneas y nombre de artículo (lectura)."""
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            factura = await conn.fetchrow(
                """
                SELECT
                    f.id, f.proveedor_id, p.nombre AS proveedor_nombre,
                    f.numero_factura, f.fecha, f.fecha_vencimiento,
                    f.total, f.pagada, f.pagada_at, f.procesada_ia, f.created_at
                FROM facturas_proveedor f
                JOIN proveedores p ON p.id = f.proveedor_id AND p.tenant_id = f.tenant_id
                WHERE f.id = $1 AND f.tenant_id = $2
                """,
                factura_id,
                tenant_id,
            )
            if not factura:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Factura no encontrada",
                )
            lineas_rows = await conn.fetch(
                """
                SELECT
                    fl.id, fl.articulo_id, a.nombre AS articulo_nombre,
                    fl.cantidad, fl.coste_unitario, fl.subtotal
                FROM facturas_proveedor_lineas fl
                LEFT JOIN articulos a ON a.id = fl.articulo_id
                WHERE fl.factura_id = $1
                ORDER BY fl.id
                """,
                factura_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_factura_proveedor_detalle: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    result = _factura_row_to_dict(factura)
    lineas_out = []
    for lr in lineas_rows:
        d = _factura_linea_to_dict(lr)
        d["articulo_nombre"] = lr.get("articulo_nombre") or ""
        lineas_out.append(d)
    result["lineas"] = lineas_out
    return result
