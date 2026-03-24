"""
Router admin: ingredientes de recetas y cálculo de coste.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.dependencies import require_roles
from database import get_db

from .admin_recetas_shared import (
    ROLES_RECETAS_ADMIN,
    ROLES_RECETAS_COCINA,
    _calcular_semaforo,
    _decimal_respuesta_dinero,
    _decimal_respuesta_qty,
    _require_tenant_id,
    _sanitize_ingrediente_row,
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


class AddIngredienteRequest(BaseModel):
    articulo_id: str
    cantidad_neta: Decimal
    porcentaje_merma: Decimal = Decimal("0")
    unidad: str


@router.get("/recetas/semaforo")
async def get_semaforo_platos(
    current_user: dict = Depends(require_roles(ROLES_RECETAS_COCINA)),
):
    """Todos los platos con su semáforo de rentabilidad."""
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            rows = await conn.fetch(
                """
                SELECT p.id, p.nombre, p.precio, r.id as receta_id
                FROM productos p
                LEFT JOIN recetas r ON p.id = r.producto_id
                WHERE p.tenant_id = $1 AND p.activo = true
                ORDER BY p.nombre
                """,
                UUID(tenant_id),
            )

            ingredientes_por_receta: dict[str, list] = {}
            receta_ids = [r["receta_id"] for r in rows if r["receta_id"]]
            if receta_ids:
                ingredientes = await conn.fetch(
                    """
                    SELECT ri.receta_id, ri.cantidad_neta, ri.porcentaje_merma, a.coste_unitario
                    FROM receta_ingredientes ri
                    JOIN articulos a ON ri.articulo_id = a.id
                    WHERE ri.receta_id = ANY($1::uuid[])
                    """,
                    receta_ids,
                )
                for ing in ingredientes:
                    rid = str(ing["receta_id"])
                    if rid not in ingredientes_por_receta:
                        ingredientes_por_receta[rid] = []
                    ingredientes_por_receta[rid].append(ing)

        result = []
        for r in rows:
            if not r["receta_id"]:
                result.append(
                    {
                        "producto_id": str(r["id"]),
                        "receta_id": None,
                        "producto_nombre": r["nombre"],
                        "precio": _decimal_respuesta_dinero(r.get("precio")),
                        "coste": None,
                        "coste_calculado": None,
                        "margen_porcentaje": None,
                        "semaforo": "sin_receta",
                    }
                )
                continue

            ingredientes = ingredientes_por_receta.get(str(r["receta_id"]), [])
            coste_total = Decimal("0")
            for ing in ingredientes:
                cantidad_neta = Decimal(str(ing["cantidad_neta"]))
                pct_merma = Decimal(str(ing["porcentaje_merma"] or 0))
                coste_unit = Decimal(str(ing["coste_unitario"] or 0))
                denom = Decimal("1") - pct_merma / Decimal("100")
                cantidad_bruta = (
                    cantidad_neta / denom if denom != 0 else Decimal("0")
                )
                coste_total += (cantidad_bruta * coste_unit).quantize(
                    Decimal("0.0001"), ROUND_HALF_UP
                )

            precio_venta = Decimal(str(r["precio"] or 0))
            if precio_venta > 0:
                margen = (
                    (precio_venta - coste_total) / precio_venta * 100
                ).quantize(Decimal("0.01"), ROUND_HALF_UP)
            else:
                margen = Decimal("0")

            result.append(
                {
                    "producto_id": str(r["id"]),
                    "receta_id": str(r["receta_id"]),
                    "producto_nombre": r["nombre"],
                    "precio": _decimal_respuesta_dinero(precio_venta),
                    "precio_venta": _decimal_respuesta_dinero(precio_venta),
                    "coste": _decimal_respuesta_dinero(coste_total),
                    "coste_calculado": _decimal_respuesta_dinero(coste_total),
                    "margen_porcentaje": _decimal_respuesta_dinero(margen),
                    "semaforo": _calcular_semaforo(margen),
                }
            )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_semaforo_platos: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/recetas/{id}/ingredientes")
async def add_ingrediente(
    id: UUID,
    body: AddIngredienteRequest,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_ADMIN)),
):
    """Añadir ingrediente a receta."""
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

            art = await conn.fetchrow(
                "SELECT id FROM articulos WHERE id = $1 AND tenant_id = $2",
                UUID(body.articulo_id),
                UUID(tenant_id),
            )
            if not art:
                raise HTTPException(status_code=404, detail="Artículo no encontrado")

            max_orden = await conn.fetchval(
                "SELECT COALESCE(MAX(orden), 0) FROM receta_ingredientes WHERE receta_id = $1",
                id,
            )

            row = await conn.fetchrow(
                """
                INSERT INTO receta_ingredientes (receta_id, articulo_id, cantidad_neta, porcentaje_merma, unidad, orden)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
                """,
                id,
                UUID(body.articulo_id),
                body.cantidad_neta,
                body.porcentaje_merma,
                body.unidad,
                (max_orden or 0) + 1,
            )

        return _sanitize_ingrediente_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en add_ingrediente: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.delete("/recetas/{id}/ingredientes/{ingrediente_id}")
async def delete_ingrediente(
    id: UUID,
    ingrediente_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_ADMIN)),
):
    """Eliminar ingrediente de receta."""
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

            result = await conn.execute(
                """
                DELETE FROM receta_ingredientes
                WHERE id = $1 AND receta_id = $2
                """,
                ingrediente_id,
                id,
            )

        if "DELETE 0" in result:
            raise HTTPException(status_code=404, detail="Ingrediente no encontrado")
        return {"deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en delete_ingrediente: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.get("/recetas/{id}/coste")
async def get_receta_coste(
    id: UUID,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_COCINA)),
):
    """
    Calcular coste en tiempo real.
    coste = suma(cantidad_bruta * coste_unitario)
    cantidad_bruta = cantidad_neta / (1 - porcentaje_merma/100)
    margen = (precio_venta - coste) / precio_venta * 100
    semáforo: verde >65%, amarillo 40-65%, rojo <40%
    """
    try:
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            receta = await conn.fetchrow(
                """
                SELECT r.*, p.precio as precio_venta, p.nombre as producto_nombre
                FROM recetas r
                JOIN productos p ON r.producto_id = p.id
                WHERE r.id = $1 AND p.tenant_id = $2
                """,
                id,
                UUID(tenant_id),
            )
            if not receta:
                raise HTTPException(status_code=404, detail="Receta no encontrada")

            ingredientes = await conn.fetch(
                """
                SELECT ri.id, ri.receta_id, ri.articulo_id, ri.cantidad_neta,
                       ri.porcentaje_merma, ri.unidad, ri.orden,
                       a.coste_unitario, a.nombre AS articulo_nombre
                FROM receta_ingredientes ri
                JOIN articulos a ON ri.articulo_id = a.id
                WHERE ri.receta_id = $1
                ORDER BY ri.orden
                """,
                id,
            )

        coste_total = Decimal("0")
        for ing in ingredientes:
            cantidad_neta = Decimal(str(ing["cantidad_neta"]))
            pct_merma = Decimal(str(ing["porcentaje_merma"] or 0))
            coste_unit = Decimal(str(ing["coste_unitario"] or 0))
            cantidad_bruta = cantidad_neta / (
                Decimal("1") - pct_merma / Decimal("100")
            )
            coste_total += (cantidad_bruta * coste_unit).quantize(
                Decimal("0.0001"), ROUND_HALF_UP
            )

        precio_venta = Decimal(str(receta["precio_venta"] or 0))
        if precio_venta > 0:
            margen = (
                (precio_venta - coste_total) / precio_venta * 100
            ).quantize(Decimal("0.01"), ROUND_HALF_UP)
        else:
            margen = Decimal("0")

        semaforo = _calcular_semaforo(margen)

        ing_out = []
        for ing in ingredientes:
            cn = Decimal(str(ing["cantidad_neta"]))
            pm = Decimal(str(ing["porcentaje_merma"] or 0))
            denom = Decimal("1") - pm / Decimal("100")
            cantidad_bruta_val = cn / denom if denom != 0 else Decimal("0")

            ing_out.append(
                {
                    "id": str(ing["id"]),
                    "articulo_id": str(ing["articulo_id"]),
                    "articulo_nombre": ing["articulo_nombre"],
                    "cantidad_neta": _decimal_respuesta_qty(ing.get("cantidad_neta")),
                    "porcentaje_merma": _decimal_respuesta_qty(
                        ing.get("porcentaje_merma")
                    ),
                    "unidad": ing["unidad"],
                    "cantidad_bruta": _decimal_respuesta_qty(cantidad_bruta_val),
                    "coste_unitario": _decimal_respuesta_qty(
                        ing.get("coste_unitario")
                    ),
                }
            )

        return {
            "receta_id": str(id),
            "producto_nombre": receta["producto_nombre"],
            "instrucciones": receta.get("instrucciones"),
            "coste": _decimal_respuesta_dinero(coste_total),
            "coste_total": _decimal_respuesta_dinero(coste_total),
            "precio_venta": _decimal_respuesta_dinero(precio_venta),
            "margen_porcentaje": _decimal_respuesta_dinero(margen),
            "semaforo": semaforo,
            "ingredientes": ing_out,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_receta_coste: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
