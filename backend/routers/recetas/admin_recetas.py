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

from .admin_recetas_ingredientes import _sync_articulo_elaborado_coste
from .admin_recetas_shared import (
    ROLES_RECETAS_ADMIN,
    ROLES_RECETAS_COCINA,
    _decimal_respuesta_dinero,
    _decimal_respuesta_qty,
    _require_tenant_id,
    _sanitize_receta_row,
    fetch_receta_tenant,
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


class CreateElaboracionRequest(BaseModel):
    nombre: str
    unidad_medida: str = "kg"
    rendimiento: Decimal = Decimal("1")
    tiempo_preparacion: int | None = None
    instrucciones: str | None = None


class CreateRecetaPlatoNuevaRequest(BaseModel):
    """Plato nuevo en carta: crea producto (precio 0) + receta."""

    nombre: str
    rendimiento: Decimal = Decimal("1")
    tiempo_preparacion: int | None = None
    instrucciones: str | None = None
    categoria_id: str | None = None


def _receta_row_to_list_item(r) -> dict:
    """Fila de listado: plato (producto) o elaboración (articulo_salida)."""
    es_elab = r["producto_id"] is None
    nombre = (r.get("producto_nombre") or r.get("articulo_salida_nombre") or "").strip()
    return {
        "id": str(r["id"]),
        "producto_id": str(r["producto_id"]) if r.get("producto_id") else None,
        "articulo_salida_id": str(r["articulo_salida_id"])
        if r.get("articulo_salida_id")
        else None,
        "producto_nombre": nombre,
        "es_elaboracion": es_elab,
        "precio_venta": _decimal_respuesta_dinero(r.get("precio_venta"))
        if not es_elab
        else None,
        "rendimiento": _decimal_respuesta_qty(r.get("rendimiento"))
        if r.get("rendimiento") is not None
        else _decimal_respuesta_qty(Decimal("1")),
        "tiempo_preparacion": r["tiempo_preparacion"],
        "instrucciones": r["instrucciones"],
        "coste_calculado": _decimal_respuesta_dinero(r.get("coste_calculado")),
        "margen_porcentaje": _decimal_respuesta_dinero(r.get("margen_porcentaje")),
        "semaforo": r["semaforo"],
        "updated_at": r["updated_at"].isoformat()
        if r.get("updated_at")
        else None,
    }


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
                SELECT r.*, p.nombre AS producto_nombre, p.precio AS precio_venta,
                       a.nombre AS articulo_salida_nombre
                FROM recetas r
                LEFT JOIN productos p ON r.producto_id = p.id
                LEFT JOIN articulos a ON r.articulo_salida_id = a.id
                WHERE (p.tenant_id = $1)
                   OR (r.producto_id IS NULL AND a.tenant_id = $1)
                ORDER BY COALESCE(p.nombre, a.nombre)
                """,
                UUID(tenant_id),
            )

        return [_receta_row_to_list_item(r) for r in rows]
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


@router.post("/elaboraciones", status_code=201)
async def create_elaboracion(
    body: CreateElaboracionRequest,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_ADMIN)),
):
    """Modelo A: artículo elaborado + receta con articulo_salida_id (producto_id NULL)."""
    nombre = (body.nombre or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre obligatorio")
    umed = (body.unidad_medida or "kg").strip() or "kg"
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])
            tid = UUID(tenant_id)

            art = await conn.fetchrow(
                """
                INSERT INTO articulos (
                    tenant_id, nombre, unidad_medida, stock_actual,
                    stock_minimo, coste_unitario, es_elaborado
                )
                VALUES ($1, $2, $3, 0, 0, 0, TRUE)
                RETURNING id
                """,
                tid,
                nombre,
                umed,
            )
            if not art:
                raise HTTPException(status_code=500, detail="No se pudo crear el artículo")

            rec = await conn.fetchrow(
                """
                INSERT INTO recetas (
                    producto_id, articulo_salida_id, rendimiento,
                    tiempo_preparacion, instrucciones
                )
                VALUES (NULL, $1, $2, $3, $4)
                RETURNING id
                """,
                art["id"],
                body.rendimiento,
                body.tiempo_preparacion,
                body.instrucciones,
            )
            if not rec:
                raise HTTPException(status_code=500, detail="No se pudo crear la receta")

            await _sync_articulo_elaborado_coste(conn, rec["id"])
            full = await fetch_receta_tenant(conn, rec["id"], tid)
            if not full:
                raise HTTPException(status_code=500, detail="Receta no recuperada")

        return _receta_row_to_list_item(full)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en create_elaboracion: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/recetas/plato-nuevo", status_code=201)
async def create_receta_plato_nuevo(
    body: CreateRecetaPlatoNuevaRequest,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_ADMIN)),
):
    """Crea producto en carta (precio 0, tiene_receta) y su receta; el PVP se edita después en carta."""
    nombre = (body.nombre or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre obligatorio")
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])
            tid = UUID(tenant_id)

            if body.categoria_id:
                cat = await conn.fetchrow(
                    """
                    SELECT id FROM categorias_menu
                    WHERE id = $1 AND tenant_id = $2
                    """,
                    UUID(body.categoria_id),
                    tid,
                )
                if not cat:
                    raise HTTPException(status_code=404, detail="Categoría no encontrada")
                categoria_uuid = cat["id"]
            else:
                cat_row = await conn.fetchrow(
                    """
                    SELECT id FROM categorias_menu
                    WHERE tenant_id = $1
                    ORDER BY orden NULLS LAST, nombre
                    LIMIT 1
                    """,
                    tid,
                )
                if not cat_row:
                    raise HTTPException(
                        status_code=400,
                        detail="No hay categorías en la carta. Crea una categoría primero.",
                    )
                categoria_uuid = cat_row["id"]

            prod = await conn.fetchrow(
                """
                INSERT INTO productos (
                    tenant_id, categoria_id, nombre, descripcion, precio,
                    iva_porcentaje, es_bebida, tiene_receta, disponible_delivery,
                    tiempo_preparacion, destino_kds
                )
                VALUES ($1, $2, $3, NULL, 0, 10, false, true, true, 0, 'cocina')
                RETURNING id
                """,
                tid,
                categoria_uuid,
                nombre,
            )
            if not prod:
                raise HTTPException(status_code=500, detail="No se pudo crear el producto")

            rec = await conn.fetchrow(
                """
                INSERT INTO recetas (
                    producto_id, rendimiento, tiempo_preparacion, instrucciones
                )
                VALUES ($1, $2, $3, $4)
                RETURNING id
                """,
                prod["id"],
                body.rendimiento,
                body.tiempo_preparacion,
                body.instrucciones,
            )
            if not rec:
                raise HTTPException(status_code=500, detail="No se pudo crear la receta")

            full = await fetch_receta_tenant(conn, rec["id"], tid)
            if not full:
                raise HTTPException(status_code=500, detail="Receta no recuperada")

        return _receta_row_to_list_item(full)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en create_receta_plato_nuevo: %s", e)
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

            receta = await fetch_receta_tenant(conn, id, UUID(tenant_id))
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
            await _sync_articulo_elaborado_coste(conn, id)

        return _sanitize_receta_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en update_receta: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.delete("/recetas/{id}")
async def delete_receta(
    id: UUID,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_ADMIN)),
):
    """
    Elimina la receta y sus líneas de ingredientes.
    Si estaba ligada a un producto de carta, deja tiene_receta en false.
    """
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])
            tid = UUID(tenant_id)

            receta = await fetch_receta_tenant(conn, id, tid)
            if not receta:
                raise HTTPException(status_code=404, detail="Receta no encontrada")

            producto_id = receta.get("producto_id")

            async with conn.transaction():
                await conn.execute(
                    "DELETE FROM receta_ingredientes WHERE receta_id = $1",
                    id,
                )
                gone = await conn.fetchrow(
                    "DELETE FROM recetas WHERE id = $1 RETURNING id", id
                )
                if not gone:
                    raise HTTPException(status_code=404, detail="Receta no encontrada")

                if producto_id:
                    await conn.execute(
                        """
                        UPDATE productos
                        SET tiene_receta = false
                        WHERE id = $1 AND tenant_id = $2
                        """,
                        producto_id,
                        tid,
                    )

        return {"deleted": True, "receta_id": str(id)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en delete_receta: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
