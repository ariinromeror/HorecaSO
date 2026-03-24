"""
Proveedores: listado y detalle.
"""

from __future__ import annotations

import logging
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db

from .proveedores_shared import (
    ROLES_LECTURA,
    _factura_row_to_dict,
    _proveedor_row_to_dict,
    _tenant_id_usuario,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/proveedores")
async def list_proveedores(
    buscar: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            conds: list[str] = ["p.tenant_id = $1"]
            args: list[Any] = [tenant_id]
            n = 2
            if buscar and buscar.strip():
                conds.append(f"p.nombre ILIKE ${n}")
                args.append(f"%{buscar.strip()}%")
                n += 1
            if activo is not None:
                conds.append(f"p.activo = ${n}")
                args.append(activo)
                n += 1
            where_sql = " AND ".join(conds)
            sql = f"""
                SELECT
                    p.id, p.nombre, p.nif, p.email, p.telefono, p.direccion,
                    p.condiciones_pago, p.dias_entrega, p.activo
                FROM proveedores p
                WHERE {where_sql}
                ORDER BY p.nombre ASC
            """
            rows = await conn.fetch(sql, *args)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_proveedores: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return [_proveedor_row_to_dict(r) for r in rows]


@router.get("/proveedores/{proveedor_id}")
async def get_proveedor(
    proveedor_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            row = await conn.fetchrow(
                """
                SELECT
                    id, nombre, nif, email, telefono, direccion,
                    condiciones_pago, dias_entrega, activo
                FROM proveedores
                WHERE id = $1 AND tenant_id = $2
                """,
                proveedor_id,
                tenant_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proveedor no encontrado",
                )
            facturas = await conn.fetch(
                """
                SELECT
                    id, proveedor_id, numero_factura, fecha, fecha_vencimiento,
                    total, pagada, pagada_at, procesada_ia, created_at
                FROM facturas_proveedor
                WHERE proveedor_id = $1 AND tenant_id = $2
                ORDER BY fecha DESC, created_at DESC
                LIMIT 5
                """,
                proveedor_id,
                tenant_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    base = _proveedor_row_to_dict(row)
    base["facturas_recientes"] = [
        _factura_row_to_dict(f, proveedor_nombre=row["nombre"]) for f in facturas
    ]
    return base
