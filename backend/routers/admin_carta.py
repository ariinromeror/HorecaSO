"""
Router admin de carta (categorías y productos) para HorecaSO.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.dependencies import get_current_user
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Carta"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


async def _get_user_tenant(conn, user_id: str) -> str | None:
    """Obtiene tenant_id del usuario."""
    row = await conn.fetchrow(
        "SELECT tenant_id FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["tenant_id"]:
        return None
    return str(row["tenant_id"])


async def _require_admin_tenant(conn, user_id: str) -> str:
    """Obtiene tenant_id y verifica que el usuario sea admin/director."""
    row = await conn.fetchrow(
        "SELECT tenant_id, rol FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["tenant_id"]:
        raise HTTPException(status_code=403, detail="Usuario sin tenant")
    if row["rol"] not in ("admin", "director"):
        raise HTTPException(status_code=403, detail="Se requiere rol admin o director")
    return str(row["tenant_id"])


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
    precio: float
    iva_porcentaje: float = 10.0
    categoria_id: str
    es_bebida: bool = False
    tiene_receta: bool = False
    disponible_delivery: bool = True
    tiempo_preparacion: int = 0


class UpdateProductoRequest(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    precio: float | None = None
    iva_porcentaje: float | None = None
    categoria_id: str | None = None
    es_bebida: bool | None = None
    tiene_receta: bool | None = None
    disponible_delivery: bool | None = None
    tiempo_preparacion: int | None = None
    activo: bool | None = None


class AlergenosRequest(BaseModel):
    alergeno_ids: list[int]


# --- Categorías ---

@router.get("/categorias")
async def list_categorias(current_user: dict = Depends(get_current_user)):
    """Lista categorías del tenant."""
    async with get_db() as conn:
        tenant_id = await _get_user_tenant(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(status_code=403, detail="Usuario sin tenant")

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


@router.post("/categorias")
async def create_categoria(
    body: CreateCategoriaRequest,
    current_user: dict = Depends(get_current_user),
):
    """Crear categoría."""
    async with get_db() as conn:
        tenant_id = await _require_admin_tenant(conn, current_user["sub"])

        row = await conn.fetchrow(
            """
            INSERT INTO categorias_menu (tenant_id, nombre, icono, color, orden)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            UUID(tenant_id),
            body.nombre,
            body.icono,
            body.color,
            body.orden,
        )

    return dict(row)


@router.put("/categorias/{id}")
async def update_categoria(
    id: UUID,
    body: UpdateCategoriaRequest,
    current_user: dict = Depends(get_current_user),
):
    """Editar categoría."""
    async with get_db() as conn:
        tenant_id = await _require_admin_tenant(conn, current_user["sub"])

        updates = []
        vals = []
        i = 1
        if body.nombre is not None:
            updates.append(f"nombre = ${i}")
            vals.append(body.nombre)
            i += 1
        if body.icono is not None:
            updates.append(f"icono = ${i}")
            vals.append(body.icono)
            i += 1
        if body.color is not None:
            updates.append(f"color = ${i}")
            vals.append(body.color)
            i += 1
        if body.orden is not None:
            updates.append(f"orden = ${i}")
            vals.append(body.orden)
            i += 1
        if body.activo is not None:
            updates.append(f"activo = ${i}")
            vals.append(body.activo)
            i += 1

        if not updates:
            raise HTTPException(status_code=400, detail="Nada que actualizar")

        vals.extend([id, UUID(tenant_id)])
        row = await conn.fetchrow(
            f"""
            UPDATE categorias_menu SET {", ".join(updates)}
            WHERE id = ${i} AND tenant_id = ${i + 1}
            RETURNING *
            """,
            *vals,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return dict(row)


@router.delete("/categorias/{id}")
async def delete_categoria(
    id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Desactivar categoría."""
    async with get_db() as conn:
        tenant_id = await _require_admin_tenant(conn, current_user["sub"])

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


# --- Productos ---

@router.get("/productos")
async def list_productos(current_user: dict = Depends(get_current_user)):
    """Lista productos del tenant."""
    async with get_db() as conn:
        tenant_id = await _get_user_tenant(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(status_code=403, detail="Usuario sin tenant")

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
            "precio": float(r["precio"]) if r.get("precio") is not None else 0,
            "iva_porcentaje": float(r["iva_porcentaje"]) if r.get("iva_porcentaje") is not None else 10,
            "tiene_receta": r.get("tiene_receta") or False,
            "activo": r.get("activo") if r.get("activo") is not None else True,
            "imagen_url": r.get("imagen_url"),
            "es_bebida": r.get("es_bebida") or False,
            "es_menu": r.get("es_menu") or False,
            "disponible_delivery": r.get("disponible_delivery") if r.get("disponible_delivery") is not None else True,
            "tiempo_preparacion": r.get("tiempo_preparacion") or 0,
            "categoria_nombre": r.get("categoria_nombre"),
        }
        for r in rows
    ]


def _producto_row_to_dict(r) -> dict:
    d = dict(r)
    return {
        "id": str(d["id"]),
        "tenant_id": str(d["tenant_id"]),
        "categoria_id": str(d["categoria_id"]) if d.get("categoria_id") else None,
        "nombre": d["nombre"],
        "descripcion": d["descripcion"],
        "precio": float(d["precio"]) if d.get("precio") is not None else 0,
        "iva_porcentaje": float(d["iva_porcentaje"]) if d.get("iva_porcentaje") is not None else 10,
        "tiene_receta": d.get("tiene_receta") or False,
        "activo": d.get("activo") if d.get("activo") is not None else True,
        "imagen_url": d.get("imagen_url"),
        "es_bebida": d.get("es_bebida") or False,
        "es_menu": d.get("es_menu") or False,
        "disponible_delivery": d.get("disponible_delivery") if d.get("disponible_delivery") is not None else True,
        "tiempo_preparacion": d.get("tiempo_preparacion") or 0,
    }


@router.post("/productos")
async def create_producto(
    body: CreateProductoRequest,
    current_user: dict = Depends(get_current_user),
):
    """Crear producto."""
    async with get_db() as conn:
        tenant_id = await _require_admin_tenant(conn, current_user["sub"])

        row = await conn.fetchrow(
            """
            INSERT INTO productos (
                tenant_id, categoria_id, nombre, descripcion, precio,
                iva_porcentaje, es_bebida, tiene_receta, disponible_delivery, tiempo_preparacion
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        )

    return _producto_row_to_dict(row)


@router.put("/productos/{id}")
async def update_producto(
    id: UUID,
    body: UpdateProductoRequest,
    current_user: dict = Depends(get_current_user),
):
    """Editar producto."""
    async with get_db() as conn:
        tenant_id = await _require_admin_tenant(conn, current_user["sub"])

        updates = []
        vals = []
        i = 1
        for field, val in body.model_dump(exclude_none=True).items():
            if field == "categoria_id":
                updates.append(f"categoria_id = ${i}")
                vals.append(UUID(val))
            else:
                updates.append(f"{field} = ${i}")
                vals.append(val)
            i += 1

        if not updates:
            raise HTTPException(status_code=400, detail="Nada que actualizar")

        vals.extend([id, UUID(tenant_id)])
        row = await conn.fetchrow(
            f"""
            UPDATE productos SET {", ".join(updates)}
            WHERE id = ${i} AND tenant_id = ${i + 1}
            RETURNING *
            """,
            *vals,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return _producto_row_to_dict(row)


@router.delete("/productos/{id}")
async def delete_producto(
    id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Desactivar producto."""
    async with get_db() as conn:
        tenant_id = await _require_admin_tenant(conn, current_user["sub"])

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


@router.post("/productos/{id}/alergenos")
async def asignar_alergenos(
    id: UUID,
    body: AlergenosRequest,
    current_user: dict = Depends(get_current_user),
):
    """Asignar alérgenos a producto."""
    async with get_db() as conn:
        tenant_id = await _require_admin_tenant(conn, current_user["sub"])

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


# --- Alérgenos ---

router_alergenos = APIRouter(prefix="/api", tags=["Alérgenos"])


@router_alergenos.get("/alergenos")
async def list_alergenos(current_user: dict = Depends(get_current_user)):
    """Lista todos los alérgenos disponibles."""
    async with get_db() as conn:
        rows = await conn.fetch("SELECT * FROM alergenos ORDER BY nombre")

    return [{"id": r["id"], "nombre": r["nombre"], "icono": r["icono"]} for r in rows]
