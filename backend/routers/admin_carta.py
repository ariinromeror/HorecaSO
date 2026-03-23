"""
Router admin de carta (categorías y productos) para HorecaSO.
"""

import logging
import re
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

ROLES_ADMIN_CARTA = ["admin", "director"]

# Quitar emojis en nombre/icono de categorías (regla de producto).
_EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001F9FF"
    "\U0001FA00-\U0001FAFF"
    "\u2600-\u26FF"
    "\u2700-\u27BF"
    "\U0001F1E6-\U0001F1FF"
    "\uFE0F"
    "\u200D"
    "]+",
    flags=re.UNICODE,
)


def _strip_emojis(s: str) -> str:
    if not s:
        return ""
    return _EMOJI_RE.sub("", s).strip()


def _sanitize_categoria_nombre(nombre: str) -> str:
    n = _strip_emojis(nombre).strip()
    if not n:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre no puede estar vacío ni ser solo emojis",
        )
    return n


def _sanitize_categoria_icono(icono: str | None) -> str | None:
    if icono is None:
        return None
    stripped = _strip_emojis(icono).strip()
    return stripped if stripped else None

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Carta"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


async def _get_user_tenant(conn, user_id: str) -> str | None:
    """Obtiene tenant_id del usuario (validación de tenant tras require_roles)."""
    row = await conn.fetchrow(
        "SELECT tenant_id FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["tenant_id"]:
        return None
    return str(row["tenant_id"])


async def _require_tenant_id(conn, user_id: str) -> str:
    """Exige usuario con tenant asignado."""
    tid = await _get_user_tenant(conn, user_id)
    if not tid:
        raise HTTPException(status_code=403, detail="Usuario sin tenant")
    return tid


# --- Schemas ---


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


class CreateProductoRequest(BaseModel):
    nombre: str
    descripcion: str | None = None
    precio: Decimal
    iva_porcentaje: Decimal = Decimal("10")
    categoria_id: str
    es_bebida: bool = False
    tiene_receta: bool = False
    disponible_delivery: bool = True
    tiempo_preparacion: int = 0
    destino_kds: Literal["cocina", "barra", "ninguno"] | None = None


class UpdateProductoRequest(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    precio: Decimal | None = None
    iva_porcentaje: Decimal | None = None
    categoria_id: str | None = None
    es_bebida: bool | None = None
    tiene_receta: bool | None = None
    disponible_delivery: bool | None = None
    tiempo_preparacion: int | None = None
    activo: bool | None = None
    destino_kds: Literal["cocina", "barra", "ninguno"] | None = None


class AlergenosRequest(BaseModel):
    alergeno_ids: list[int]


def _decimal_respuesta_dinero(value) -> float | None:
    """float solo en dict de respuesta; cálculo con Decimal y redondeo HALF_UP."""
    if value is None:
        return None
    d = Decimal(str(value))
    return float(d.quantize(Decimal("0.01"), ROUND_HALF_UP))


# --- Categorías ---


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


# --- Productos ---


def _producto_row_to_dict(r) -> dict:
    return {
        "id": str(r["id"]),
        "tenant_id": str(r["tenant_id"]),
        "categoria_id": str(r["categoria_id"]) if r.get("categoria_id") else None,
        "nombre": r["nombre"],
        "descripcion": r["descripcion"],
        "precio": _decimal_respuesta_dinero(r.get("precio")),
        "iva_porcentaje": _decimal_respuesta_dinero(r.get("iva_porcentaje")),
        "tiene_receta": r.get("tiene_receta") or False,
        "activo": r.get("activo") if r.get("activo") is not None else True,
        "imagen_url": r.get("imagen_url"),
        "es_bebida": r.get("es_bebida") or False,
        "es_menu": r.get("es_menu") or False,
        "disponible_delivery": r.get("disponible_delivery")
        if r.get("disponible_delivery") is not None
        else True,
        "tiempo_preparacion": r.get("tiempo_preparacion") or 0,
        "destino_kds": r.get("destino_kds") or "cocina",
    }


@router.get("/productos")
async def list_productos(
    current_user: dict = Depends(require_roles(ROLES_ADMIN_CARTA)),
):
    """Lista productos del tenant."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            rows = await conn.fetch(
                """
                SELECT p.*, c.nombre as categoria_nombre
                FROM productos p
                LEFT JOIN categorias_menu c ON p.categoria_id = c.id
                WHERE p.tenant_id = $1
                ORDER BY c.orden, p.nombre
                """,
                UUID(tenant_id),
            )

        return [
            {
                "id": str(r["id"]),
                "tenant_id": str(r["tenant_id"]),
                "categoria_id": str(r["categoria_id"]) if r.get("categoria_id") else None,
                "nombre": r["nombre"],
                "descripcion": r["descripcion"],
                "precio": _decimal_respuesta_dinero(r.get("precio")),
                "iva_porcentaje": _decimal_respuesta_dinero(r.get("iva_porcentaje")),
                "tiene_receta": r.get("tiene_receta") or False,
                "activo": r.get("activo") if r.get("activo") is not None else True,
                "imagen_url": r.get("imagen_url"),
                "es_bebida": r.get("es_bebida") or False,
                "es_menu": r.get("es_menu") or False,
                "disponible_delivery": r.get("disponible_delivery")
                if r.get("disponible_delivery") is not None
                else True,
                "tiempo_preparacion": r.get("tiempo_preparacion") or 0,
                "categoria_nombre": r.get("categoria_nombre"),
                "destino_kds": r.get("destino_kds") or "cocina",
            }
            for r in rows
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_productos: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/productos")
async def create_producto(
    body: CreateProductoRequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_CARTA)),
):
    """Crear producto."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            destino = _normalize_destino_kds(
                body.destino_kds,
                body.tiene_receta,
                body.es_bebida,
            )

            row = await conn.fetchrow(
                """
                INSERT INTO productos (
                    tenant_id, categoria_id, nombre, descripcion, precio,
                    iva_porcentaje, es_bebida, tiene_receta, disponible_delivery,
                    tiempo_preparacion, destino_kds
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
                """,
                UUID(tenant_id),
                UUID(body.categoria_id),
                body.nombre,
                body.descripcion,
                body.precio,
                body.iva_porcentaje,
                body.es_bebida,
                body.tiene_receta,
                body.disponible_delivery,
                body.tiempo_preparacion,
                destino,
            )

        return _producto_row_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en create_producto: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.put("/productos/{id}")
async def update_producto(
    id: UUID,
    body: UpdateProductoRequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_CARTA)),
):
    """Editar producto."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            args: list = []
            updates: list[str] = []
            if body.nombre is not None:
                args.append(body.nombre)
                updates.append("nombre = $" + str(len(args)))
            if body.descripcion is not None:
                args.append(body.descripcion)
                updates.append("descripcion = $" + str(len(args)))
            if body.precio is not None:
                args.append(body.precio)
                updates.append("precio = $" + str(len(args)))
            if body.iva_porcentaje is not None:
                args.append(body.iva_porcentaje)
                updates.append("iva_porcentaje = $" + str(len(args)))
            if body.categoria_id is not None:
                args.append(UUID(body.categoria_id))
                updates.append("categoria_id = $" + str(len(args)))
            if body.es_bebida is not None:
                args.append(body.es_bebida)
                updates.append("es_bebida = $" + str(len(args)))
            if body.tiene_receta is not None:
                args.append(body.tiene_receta)
                updates.append("tiene_receta = $" + str(len(args)))
            if body.disponible_delivery is not None:
                args.append(body.disponible_delivery)
                updates.append("disponible_delivery = $" + str(len(args)))
            if body.tiempo_preparacion is not None:
                args.append(body.tiempo_preparacion)
                updates.append("tiempo_preparacion = $" + str(len(args)))
            if body.destino_kds is not None:
                args.append(body.destino_kds)
                updates.append("destino_kds = $" + str(len(args)))
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
                "UPDATE productos SET "
                + ", ".join(updates)
                + " WHERE id = $"
                + str(ph_id)
                + " AND tenant_id = $"
                + str(ph_tenant)
                + " RETURNING *"
            )
            row = await conn.fetchrow(sql, *args)

        if not row:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return _producto_row_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en update_producto: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.delete("/productos/{id}")
async def delete_producto(
    id: UUID,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_CARTA)),
):
    """Desactivar producto."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            row = await conn.fetchrow(
                """
                UPDATE productos SET activo = false
                WHERE id = $1 AND tenant_id = $2
                RETURNING *
                """,
                id,
                UUID(tenant_id),
            )

        if not row:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return {"deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en delete_producto: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/productos/{id}/alergenos")
async def asignar_alergenos(
    id: UUID,
    body: AlergenosRequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_CARTA)),
):
    """Asignar alérgenos a producto."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            prod = await conn.fetchrow(
                "SELECT id FROM productos WHERE id = $1 AND tenant_id = $2",
                id,
                UUID(tenant_id),
            )
            if not prod:
                raise HTTPException(status_code=404, detail="Producto no encontrado")

            await conn.execute(
                "DELETE FROM producto_alergenos WHERE producto_id = $1",
                id,
            )
            for aid in body.alergeno_ids:
                await conn.execute(
                    """
                    INSERT INTO producto_alergenos (producto_id, alergeno_id)
                    VALUES ($1, $2)
                    """,
                    id,
                    aid,
                )

        return {"alergenos_asignados": body.alergeno_ids}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en asignar_alergenos: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


# --- Alérgenos ---

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
