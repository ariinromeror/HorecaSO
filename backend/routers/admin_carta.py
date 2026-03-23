"""
Router admin de carta: categorías y catálogo de alérgenos.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.dependencies import require_roles
from database import get_db

from routers.admin_carta_shared import (
    ROLES_ADMIN_CARTA,
    _require_tenant_id,
    _sanitize_categoria_icono,
    _sanitize_categoria_nombre,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Carta"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


class CreateCategoriaRequest(BaseModel):
    nombre: str
    icono: str | None = None
    color: str | None = None
    orden: int = 0


class UpdateCategoriaRequest(BaseModel):
    nombre: str | None = None
    icono: str | None = None
    color: str | None = None
    orden: int | None = None
    activo: bool | None = None


@router.get("/categorias")
async def list_categorias(
    current_user: dict = Depends(require_roles(ROLES_ADMIN_CARTA)),
):
    """Lista categorías del tenant."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            rows = await conn.fetch(
                "SELECT * FROM categorias_menu WHERE tenant_id = $1 ORDER BY orden, nombre",
                UUID(tenant_id),
            )

        return [
            {
                "id": str(r["id"]),
                "tenant_id": str(r["tenant_id"]),
                "nombre": r["nombre"],
                "icono": r["icono"],
                "color": r["color"],
                "orden": r["orden"] or 0,
                "activo": r["activo"] if r.get("activo") is not None else True,
            }
            for r in rows
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_categorias: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/categorias")
async def create_categoria(
    body: CreateCategoriaRequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_CARTA)),
):
    """Crear categoría."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            nombre_ok = _sanitize_categoria_nombre(body.nombre)
            icono_ok = _sanitize_categoria_icono(body.icono)

            row = await conn.fetchrow(
                """
                INSERT INTO categorias_menu (tenant_id, nombre, icono, color, orden)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
                """,
                UUID(tenant_id),
                nombre_ok,
                icono_ok,
                body.color,
                body.orden,
            )

        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en create_categoria: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.put("/categorias/{id}")
async def update_categoria(
    id: UUID,
    body: UpdateCategoriaRequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_CARTA)),
):
    """Editar categoría."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            args: list = []
            updates: list[str] = []
            if body.nombre is not None:
                args.append(_sanitize_categoria_nombre(body.nombre))
                updates.append("nombre = $" + str(len(args)))
            if body.icono is not None:
                args.append(_sanitize_categoria_icono(body.icono))
                updates.append("icono = $" + str(len(args)))
            if body.color is not None:
                args.append(body.color)
                updates.append("color = $" + str(len(args)))
            if body.orden is not None:
                args.append(body.orden)
                updates.append("orden = $" + str(len(args)))
            if body.activo is not None:
                args.append(body.activo)
                updates.append("activo = $" + str(len(args)))

            if not updates:
                raise HTTPException(status_code=400, detail="Nada que actualizar")

            args.append(id)
            args.append(UUID(tenant_id))
            ph_id = len(args) - 1
            ph_tenant = len(args)
            sql = (
                "UPDATE categorias_menu SET "
                + ", ".join(updates)
                + " WHERE id = $"
                + str(ph_id)
                + " AND tenant_id = $"
                + str(ph_tenant)
                + " RETURNING *"
            )
            row = await conn.fetchrow(sql, *args)

        if not row:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en update_categoria: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.delete("/categorias/{id}")
async def delete_categoria(
    id: UUID,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_CARTA)),
):
    """Desactivar categoría."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            row = await conn.fetchrow(
                """
                UPDATE categorias_menu SET activo = false
                WHERE id = $1 AND tenant_id = $2
                RETURNING *
                """,
                id,
                UUID(tenant_id),
            )

        if not row:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        return {"deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en delete_categoria: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


router_alergenos = APIRouter(prefix="/api", tags=["Alérgenos"])


@router_alergenos.get("/alergenos")
async def list_alergenos(
    current_user: dict = Depends(require_roles(ROLES_ADMIN_CARTA)),
):
    """Lista todos los alérgenos disponibles."""
    try:
        async with get_db() as conn:
            rows = await conn.fetch("SELECT * FROM alergenos ORDER BY nombre")

        return [
            {"id": r["id"], "nombre": r["nombre"], "icono": r["icono"]} for r in rows
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_alergenos: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
