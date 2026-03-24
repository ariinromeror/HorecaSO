"""
Inventario: listado de artículos.
"""

import logging
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db

from .inventario_shared import (
    ROLES_LECTURA,
    _articulo_to_dict,
    _fetch_usuario,
)

logger = logging.getLogger(__name__)

router = APIRouter()


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
