"""
Proveedores: alta, edición y baja lógica.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import require_roles
from database import get_db

from .proveedores_schemas import CreateProveedorRequest, UpdateProveedorRequest
from .proveedores_shared import (
    ROLES_ADMIN_ALMACEN,
    _proveedor_row_to_dict,
    _tenant_id_usuario,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/proveedores")
async def create_proveedor(
    body: CreateProveedorRequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            row = await conn.fetchrow(
                """
                INSERT INTO proveedores (
                    tenant_id, nombre, nif, email, telefono, direccion,
                    condiciones_pago, dias_entrega, activo
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 1), TRUE)
                RETURNING
                    id, nombre, nif, email, telefono, direccion,
                    condiciones_pago, dias_entrega, activo
                """,
                tenant_id,
                body.nombre.strip(),
                body.nif,
                body.email,
                body.telefono,
                body.direccion,
                body.condiciones_pago,
                body.dias_entrega,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en create_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return _proveedor_row_to_dict(row)


@router.put("/proveedores/{proveedor_id}")
async def update_proveedor(
    proveedor_id: UUID,
    body: UpdateProveedorRequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            exists = await conn.fetchval(
                "SELECT 1 FROM proveedores WHERE id = $1 AND tenant_id = $2",
                proveedor_id,
                tenant_id,
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proveedor no encontrado",
                )

            sets: list[str] = []
            vals: list[Any] = []
            n = 1

            if body.nombre is not None:
                sets.append(f"nombre = ${n}")
                vals.append(body.nombre.strip())
                n += 1
            if body.nif is not None:
                sets.append(f"nif = ${n}")
                vals.append(body.nif)
                n += 1
            if body.email is not None:
                sets.append(f"email = ${n}")
                vals.append(body.email)
                n += 1
            if body.telefono is not None:
                sets.append(f"telefono = ${n}")
                vals.append(body.telefono)
                n += 1
            if body.direccion is not None:
                sets.append(f"direccion = ${n}")
                vals.append(body.direccion)
                n += 1
            if body.condiciones_pago is not None:
                sets.append(f"condiciones_pago = ${n}")
                vals.append(body.condiciones_pago)
                n += 1
            if body.dias_entrega is not None:
                sets.append(f"dias_entrega = ${n}")
                vals.append(body.dias_entrega)
                n += 1
            if body.activo is not None:
                sets.append(f"activo = ${n}")
                vals.append(body.activo)
                n += 1

            vals.extend([proveedor_id, tenant_id])
            sql = f"""
                UPDATE proveedores
                SET {", ".join(sets)}
                WHERE id = ${n} AND tenant_id = ${n + 1}
                RETURNING
                    id, nombre, nif, email, telefono, direccion,
                    condiciones_pago, dias_entrega, activo
            """
            row = await conn.fetchrow(sql, *vals)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en update_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return _proveedor_row_to_dict(row)


@router.delete("/proveedores/{proveedor_id}")
async def delete_proveedor(
    proveedor_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            exists = await conn.fetchval(
                "SELECT 1 FROM proveedores WHERE id = $1 AND tenant_id = $2",
                proveedor_id,
                tenant_id,
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proveedor no encontrado",
                )
            cnt = await conn.fetchval(
                """
                SELECT COUNT(*)::INTEGER FROM facturas_proveedor
                WHERE proveedor_id = $1 AND tenant_id = $2
                """,
                proveedor_id,
                tenant_id,
            )
            if cnt and int(cnt) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Proveedor con facturas no se puede eliminar",
                )
            await conn.execute(
                """
                UPDATE proveedores SET activo = FALSE
                WHERE id = $1 AND tenant_id = $2
                """,
                proveedor_id,
                tenant_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en delete_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return {"deleted": True, "id": str(proveedor_id)}
