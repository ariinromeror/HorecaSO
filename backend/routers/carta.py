"""
Router de carta para HorecaSO.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import get_current_user
from database import get_db

logger = logging.getLogger(__name__)

router_tpv = APIRouter(
    prefix="/api/tpv",
    tags=["Carta"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

router_publica = APIRouter(
    prefix="/api/carta",
    tags=["Carta"],
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


def _producto_to_dict(row) -> dict:
    """Convierte fila producto a dict."""
    return {
        "id": str(row["id"]),
        "categoria_id": str(row["categoria_id"]) if row["categoria_id"] else None,
        "nombre": row["nombre"],
        "descripcion": row["descripcion"],
        "precio": float(row["precio"]) if row["precio"] is not None else 0,
        "iva_porcentaje": float(row["iva_porcentaje"]) if row["iva_porcentaje"] is not None else 10,
        "tiene_receta": row["tiene_receta"] or False,
        "activo": row["activo"] if row.get("activo") is not None else True,
        "imagen_url": row["imagen_url"],
        "es_bebida": row["es_bebida"] or False,
        "es_menu": row["es_menu"] or False,
        "disponible_delivery": row["disponible_delivery"] if row.get("disponible_delivery") is not None else True,
        "tiempo_preparacion": row["tiempo_preparacion"] or 0,
    }


def _categoria_to_dict(row) -> dict:
    """Convierte fila categoría a dict."""
    return {
        "id": str(row["id"]),
        "nombre": row["nombre"],
        "icono": row["icono"],
        "color": row["color"],
        "orden": row["orden"] or 0,
        "activo": row["activo"] if row.get("activo") is not None else True,
    }


@router_tpv.get("/carta")
async def get_carta_agrupada(current_user: dict = Depends(get_current_user)):
    """Productos agrupados por categoría (solo activos)."""
    async with get_db() as conn:
        tenant_id = await _get_user_tenant(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant asignado",
            )

        categorias = await conn.fetch(
            """
            SELECT * FROM categorias_menu
            WHERE tenant_id = $1 AND activo = true
            ORDER BY orden, nombre
            """,
            UUID(tenant_id),
        )

        result = []
        for cat in categorias:
            productos = await conn.fetch(
                """
                SELECT p.* FROM productos p
                WHERE p.tenant_id = $1 AND p.categoria_id = $2 AND p.activo = true
                ORDER BY p.nombre
                """,
                UUID(tenant_id),
                cat["id"],
            )
            result.append({
                "categoria": _categoria_to_dict(cat),
                "productos": [_producto_to_dict(p) for p in productos],
            })

    return result


@router_tpv.get("/carta/productos")
async def get_carta_productos_plana(current_user: dict = Depends(get_current_user)):
    """Lista plana de productos con nombre de categoría."""
    async with get_db() as conn:
        tenant_id = await _get_user_tenant(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant asignado",
            )

        rows = await conn.fetch(
            """
            SELECT p.*, c.nombre as categoria_nombre
            FROM productos p
            LEFT JOIN categorias_menu c ON p.categoria_id = c.id
            WHERE p.tenant_id = $1 AND p.activo = true
            ORDER BY c.orden, c.nombre, p.nombre
            """,
            UUID(tenant_id),
        )

    return [
        {**_producto_to_dict(r), "categoria_nombre": r["categoria_nombre"]}
        for r in rows
    ]


@router_publica.get("/publica/{outlet_slug}")
async def get_carta_publica(outlet_slug: str):
    """Carta pública sin auth para QR."""
    async with get_db() as conn:
        carta_row = await conn.fetchrow(
            """
            SELECT o.tenant_id FROM carta_digital cd
            JOIN outlets o ON cd.outlet_id = o.id
            WHERE cd.url_slug = $1 AND cd.activa = true
            """,
            outlet_slug,
        )
        if not carta_row:
            outlet_row = await conn.fetchrow(
                "SELECT tenant_id FROM outlets WHERE slug = $1 OR url_slug = $1",
                outlet_slug,
            )
            if not outlet_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Carta no encontrada",
                )
            tenant_id = str(outlet_row["tenant_id"])
        else:
            tenant_id = str(carta_row["tenant_id"])

        categorias = await conn.fetch(
            """
            SELECT * FROM categorias_menu
            WHERE tenant_id = $1 AND activo = true
            ORDER BY orden, nombre
            """,
            UUID(tenant_id),
        )

        result = []
        for cat in categorias:
            productos = await conn.fetch(
                """
                SELECT p.* FROM productos p
                WHERE p.tenant_id = $1 AND p.categoria_id = $2 AND p.activo = true
                ORDER BY p.nombre
                """,
                UUID(tenant_id),
                cat["id"],
            )
            result.append({
                "categoria": _categoria_to_dict(cat),
                "productos": [_producto_to_dict(p) for p in productos],
            })

    return result
