"""
Facturas proveedor: alta y marcar pagada.
"""

from __future__ import annotations

import logging
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import require_roles
from database import get_db

from .proveedores_shared import (
    ROLES_ADMIN_ALMACEN,
    CreateFacturaProveedorRequest,
    _factura_linea_to_dict,
    _factura_row_to_dict,
    _tenant_id_usuario,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/facturas-proveedor")
async def create_factura_proveedor(
    body: CreateFacturaProveedorRequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            prov = await conn.fetchrow(
                "SELECT id FROM proveedores WHERE id = $1 AND tenant_id = $2",
                UUID(body.proveedor_id),
                tenant_id,
            )
            if not prov:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Proveedor no válido para este tenant",
                )

            lineas_calc: list[tuple[UUID, Decimal, Decimal, Decimal]] = []
            for ln in body.lineas:
                aid = UUID(ln.articulo_id)
                ok = await conn.fetchval(
                    "SELECT 1 FROM articulos WHERE id = $1 AND tenant_id = $2",
                    aid,
                    tenant_id,
                )
                if not ok:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Artículo no válido: {ln.articulo_id}",
                    )
                cu = Decimal(str(ln.coste_unitario)).quantize(
                    Decimal("0.0001"), ROUND_HALF_UP
                )
                cant = Decimal(str(ln.cantidad)).quantize(
                    Decimal("0.0001"), ROUND_HALF_UP
                )
                sub = (cant * cu).quantize(Decimal("0.01"), ROUND_HALF_UP)
                lineas_calc.append((aid, cant, cu, sub))

            total_factura: Decimal
            if body.total is not None:
                total_factura = Decimal(str(body.total)).quantize(
                    Decimal("0.01"), ROUND_HALF_UP
                )
            else:
                total_factura = sum(
                    (x[3] for x in lineas_calc), start=Decimal("0")
                ).quantize(Decimal("0.01"), ROUND_HALF_UP)

            factura = await conn.fetchrow(
                """
                INSERT INTO facturas_proveedor (
                    tenant_id, proveedor_id, numero_factura, fecha,
                    fecha_vencimiento, total, pagada, procesada_ia
                )
                VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE)
                RETURNING
                    id, proveedor_id, numero_factura, fecha, fecha_vencimiento,
                    total, pagada, pagada_at, procesada_ia, created_at
                """,
                tenant_id,
                UUID(body.proveedor_id),
                body.numero_factura,
                body.fecha,
                body.fecha_vencimiento,
                total_factura,
            )
            fid = factura["id"]
            for aid, cant, cu, sub in lineas_calc:
                await conn.execute(
                    """
                    INSERT INTO facturas_proveedor_lineas (
                        factura_id, articulo_id, cantidad, coste_unitario, subtotal
                    )
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    fid,
                    aid,
                    cant,
                    cu,
                    sub,
                )
            lineas_rows = await conn.fetch(
                """
                SELECT id, articulo_id, cantidad, coste_unitario, subtotal
                FROM facturas_proveedor_lineas
                WHERE factura_id = $1
                ORDER BY id
                """,
                fid,
            )
            pn = await conn.fetchval(
                "SELECT nombre FROM proveedores WHERE id = $1",
                UUID(body.proveedor_id),
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en create_factura_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    result = _factura_row_to_dict(factura, proveedor_nombre=pn)
    result["lineas"] = [_factura_linea_to_dict(lr) for lr in lineas_rows]
    return result


@router.patch("/facturas-proveedor/{factura_id}/pagar")
async def marcar_factura_pagada(
    factura_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            row = await conn.fetchrow(
                """
                SELECT
                    f.id, f.proveedor_id, f.numero_factura, f.fecha, f.fecha_vencimiento,
                    f.total, f.pagada, f.pagada_at, f.procesada_ia, f.created_at
                FROM facturas_proveedor f
                WHERE f.id = $1 AND f.tenant_id = $2
                """,
                factura_id,
                tenant_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Factura no encontrada",
                )
            if row["pagada"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La factura ya está pagada",
                )
            await conn.execute(
                """
                UPDATE facturas_proveedor
                SET pagada = TRUE, pagada_at = NOW()
                WHERE id = $1 AND tenant_id = $2
                """,
                factura_id,
                tenant_id,
            )
            updated = await conn.fetchrow(
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en marcar_factura_pagada: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return _factura_row_to_dict(updated)
