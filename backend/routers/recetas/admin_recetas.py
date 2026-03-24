"""
Router admin de recetas para HorecaSO.
"""

import logging
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.dependencies import require_roles
from database import get_db

from .admin_recetas_shared import (
    ROLES_RECETAS_ADMIN,
    ROLES_RECETAS_COCINA,
    _decimal_respuesta_dinero,
    _decimal_respuesta_qty,
    _require_tenant_id,
    _sanitize_receta_row,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Recetas"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


class CreateRecetaRequest(BaseModel):
    producto_id: str
    rendimiento: Decimal = Decimal("1")
    tiempo_preparacion: int | None = None
    instrucciones: str | None = None


class UpdateRecetaRequest(BaseModel):
    rendimiento: Decimal | None = None
    tiempo_preparacion: int | None = None
    instrucciones: str | None = None


@router.get("/recetas")
async def list_recetas(
    current_user: dict = Depends(require_roles(ROLES_RECETAS_COCINA)),
):
    """Lista recetas con semáforo calculado."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            rows = await conn.fetch(
                """
                SELECT r.*, p.nombre as producto_nombre, p.precio as precio_venta
                FROM recetas r
                JOIN productos p ON r.producto_id = p.id
                WHERE p.tenant_id = $1
                ORDER BY p.nombre
                """,
                UUID(tenant_id),
            )

        return [
            {
                "id": str(r["id"]),
                "producto_id": str(r["producto_id"]),
                "producto_nombre": r["producto_nombre"],
                "precio_venta": _decimal_respuesta_dinero(r.get("precio_venta")),
                "rendimiento": _decimal_respuesta_qty(r.get("rendimiento"))
                if r.get("rendimiento") is not None
                else _decimal_respuesta_qty(Decimal("1")),
                "tiempo_preparacion": r["tiempo_preparacion"],
                "instrucciones": r["instrucciones"],
                "coste_calculado": _decimal_respuesta_dinero(
                    r.get("coste_calculado")
                ),
                "margen_porcentaje": _decimal_respuesta_dinero(
                    r.get("margen_porcentaje")
                ),
                "semaforo": r["semaforo"],
                "updated_at": r["updated_at"].isoformat()
                if r.get("updated_at")
                else None,
            }
            for r in rows
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_recetas: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/recetas")
async def create_receta(
    body: CreateRecetaRequest,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_ADMIN)),
):
    """Crear receta para un producto."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            prod = await conn.fetchrow(
                "SELECT id FROM productos WHERE id = $1 AND tenant_id = $2",
                UUID(body.producto_id),
                UUID(tenant_id),
            )
            if not prod:
                raise HTTPException(status_code=404, detail="Producto no encontrado")

            row = await conn.fetchrow(
                """
                INSERT INTO recetas (producto_id, rendimiento, tiempo_preparacion, instrucciones)
                VALUES ($1, $2, $3, $4)
                RETURNING *
                """,
                UUID(body.producto_id),
                body.rendimiento,
                body.tiempo_preparacion,
                body.instrucciones,
            )

        return _sanitize_receta_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en create_receta: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.put("/recetas/{id}")
async def update_receta(
    id: UUID,
    body: UpdateRecetaRequest,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_ADMIN)),
):
    """Editar receta."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            receta = await conn.fetchrow(
                """
                SELECT r.* FROM recetas r
                JOIN productos p ON r.producto_id = p.id
                WHERE r.id = $1 AND p.tenant_id = $2
                """,
                id,
                UUID(tenant_id),
            )
            if not receta:
                raise HTTPException(status_code=404, detail="Receta no encontrada")

            args: list = []
            updates: list[str] = []
            if body.rendimiento is not None:
                args.append(body.rendimiento)
                updates.append("rendimiento = $" + str(len(args)))
            if body.tiempo_preparacion is not None:
                args.append(body.tiempo_preparacion)
                updates.append("tiempo_preparacion = $" + str(len(args)))
            if body.instrucciones is not None:
                args.append(body.instrucciones)
                updates.append("instrucciones = $" + str(len(args)))

            if not updates:
                raise HTTPException(status_code=400, detail="Nada que actualizar")

            args.append(id)
            ph_id = len(args)
            sql = (
                "UPDATE recetas SET "
                + ", ".join(updates)
                + " WHERE id = $"
                + str(ph_id)
                + " RETURNING *"
            )
            row = await conn.fetchrow(sql, *args)

        if not row:
            raise HTTPException(status_code=404, detail="Receta no encontrada")
        return _sanitize_receta_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en update_receta: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
