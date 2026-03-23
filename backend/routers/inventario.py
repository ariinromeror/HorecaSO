"""
Router inventario: artículos CRUD y stock (listado).
"""

import logging
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from auth.dependencies import require_roles
from database import get_db

from routers.inventario_shared import (
    ROLES_ESCRITURA_ART,
    ROLES_LECTURA,
    _articulo_to_dict,
    _fetch_usuario,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/inventario",
    tags=["Inventario"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


class CreateArticuloRequest(BaseModel):
    nombre: str
    sku: Optional[str] = None
    unidad_medida: str
    stock_minimo: Optional[Decimal] = None
    stock_maximo: Optional[Decimal] = None
    coste_unitario: Optional[Decimal] = None
    categoria_almacen: Optional[str] = None


class UpdateArticuloRequest(BaseModel):
    nombre: Optional[str] = None
    sku: Optional[str] = None
    unidad_medida: Optional[str] = None
    stock_minimo: Optional[Decimal] = None
    stock_maximo: Optional[Decimal] = None
    coste_unitario: Optional[Decimal] = None
    categoria_almacen: Optional[str] = None


@router.get("/articulos")
async def list_articulos(
    categoria: Optional[str] = Query(None, description="Filtrar por categoria_almacen"),
    buscar: Optional[str] = Query(None, description="Buscar en nombre"),
    alerta: Optional[bool] = Query(None, description="Solo stock bajo mínimo"),
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    """Lista artículos del tenant con filtros opcionales."""
    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))
            where_clauses = ["tenant_id = $1"]
            args: list[Any] = [tenant_id]

            if categoria is not None and categoria.strip():
                args.append(categoria.strip())
                where_clauses.append(
                    "categoria_almacen ILIKE $" + str(len(args))
                )

            if buscar is not None and buscar.strip():
                args.append("%" + buscar.strip() + "%")
                where_clauses.append("nombre ILIKE $" + str(len(args)))

            if alerta is True:
                where_clauses.append("stock_actual <= stock_minimo")

            sql = (
                "SELECT id, nombre, sku, unidad_medida, stock_actual, stock_minimo, "
                "stock_maximo, coste_unitario, categoria_almacen, created_at "
                "FROM articulos WHERE "
                + " AND ".join(where_clauses)
                + " ORDER BY nombre"
            )
            rows = await conn.fetch(sql, *args)

        return [_articulo_to_dict(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_articulos: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/articulos", status_code=status.HTTP_201_CREATED)
async def create_articulo(
    body: CreateArticuloRequest,
    current_user: dict = Depends(require_roles(ROLES_ESCRITURA_ART)),
):
    """Crea artículo; stock_actual inicia en 0."""
    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))

            smin = body.stock_minimo if body.stock_minimo is not None else Decimal("0")
            smax = body.stock_maximo
            coste = body.coste_unitario

            row = await conn.fetchrow(
                """
                INSERT INTO articulos (
                    tenant_id, nombre, sku, unidad_medida, stock_actual,
                    stock_minimo, stock_maximo, coste_unitario,
                    categoria_almacen
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, nombre, sku, unidad_medida, stock_actual, stock_minimo,
                          stock_maximo, coste_unitario, categoria_almacen, created_at
                """,
                tenant_id,
                body.nombre.strip(),
                body.sku.strip() if body.sku else None,
                body.unidad_medida.strip(),
                Decimal("0"),
                smin,
                smax,
                coste,
                body.categoria_almacen.strip() if body.categoria_almacen else None,
            )

        logger.info("Artículo creado: %s tenant=%s", row["id"], tenant_id)
        return _articulo_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en create_articulo: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.put("/articulos/{articulo_id}")
async def update_articulo(
    articulo_id: UUID,
    body: UpdateArticuloRequest,
    current_user: dict = Depends(require_roles(ROLES_ESCRITURA_ART)),
):
    """Actualiza artículo (no modifica stock_actual)."""
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Nada que actualizar")

    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))
            exists = await conn.fetchrow(
                "SELECT id FROM articulos WHERE id = $1 AND tenant_id = $2",
                articulo_id,
                tenant_id,
            )
            if not exists:
                raise HTTPException(status_code=404, detail="Artículo no encontrado")

            updates: list[str] = []
            vals: list[Any] = []
            i = 1
            if "nombre" in data:
                updates.append("nombre = $" + str(i))
                vals.append(data["nombre"].strip())
                i += 1
            if "sku" in data:
                updates.append("sku = $" + str(i))
                vals.append(data["sku"].strip() if data["sku"] else None)
                i += 1
            if "unidad_medida" in data:
                updates.append("unidad_medida = $" + str(i))
                vals.append(data["unidad_medida"].strip())
                i += 1
            if "stock_minimo" in data:
                updates.append("stock_minimo = $" + str(i))
                vals.append(data["stock_minimo"])
                i += 1
            if "stock_maximo" in data:
                updates.append("stock_maximo = $" + str(i))
                vals.append(data["stock_maximo"])
                i += 1
            if "coste_unitario" in data:
                updates.append("coste_unitario = $" + str(i))
                vals.append(data["coste_unitario"])
                i += 1
            if "categoria_almacen" in data:
                updates.append("categoria_almacen = $" + str(i))
                vals.append(
                    data["categoria_almacen"].strip()
                    if data["categoria_almacen"]
                    else None
                )
                i += 1

            vals.extend([articulo_id, tenant_id])
            sql = (
                "UPDATE articulos SET "
                + ", ".join(updates)
                + " WHERE id = $"
                + str(i)
                + " AND tenant_id = $"
                + str(i + 1)
                + " RETURNING id, nombre, sku, unidad_medida, stock_actual, stock_minimo, "
                "stock_maximo, coste_unitario, categoria_almacen, created_at"
            )
            row = await conn.fetchrow(sql, *vals)

        if not row:
            raise HTTPException(status_code=404, detail="Artículo no encontrado")
        return _articulo_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en update_articulo: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
