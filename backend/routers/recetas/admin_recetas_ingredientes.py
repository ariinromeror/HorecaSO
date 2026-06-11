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
    fetch_receta_tenant,
)
from .recetas_unidades import (
    cantidad_en_unidad_articulo,
    coste_unitario_efectivo_calibracion,
    unidades_permitidas_para_articulo,
)


def _effective_coste_articulo_row(ing: dict) -> Decimal:
    base = Decimal(str(ing.get("coste_unitario") or 0))
    return coste_unitario_efectivo_calibracion(
        base,
        ing.get("calibracion_comprado"),
        ing.get("calibracion_util"),
    )


def _coste_linea_ingrediente(
    cantidad_neta: Decimal,
    porcentaje_merma: Decimal,
    unidad_linea: str,
    coste_unitario: Decimal,
    unidad_medida_articulo: str,
) -> Decimal:
    """cantidad_neta en unidad_linea → coste usando coste_unitario en unidad_medida_articulo."""
    pct = porcentaje_merma or Decimal("0")
    denom = Decimal("1") - pct / Decimal("100")
    if denom <= 0:
        cantidad_bruta = cantidad_neta
    else:
        cantidad_bruta = cantidad_neta / denom
    qty_art = cantidad_en_unidad_articulo(
        cantidad_bruta, unidad_linea, unidad_medida_articulo
    )
    return (qty_art * coste_unitario).quantize(Decimal("0.0001"), ROUND_HALF_UP)


SQL_INGREDIENTES_RECETA = """
SELECT ri.id, ri.receta_id, ri.articulo_id, ri.cantidad_neta,
       ri.porcentaje_merma, ri.unidad, ri.orden,
       a.coste_unitario, a.unidad_medida AS articulo_unidad_medida,
       a.nombre AS articulo_nombre,
       a.calibracion_comprado, a.calibracion_util,
       COALESCE(a.es_elaborado, FALSE) AS articulo_es_elaborado
FROM receta_ingredientes ri
JOIN articulos a ON ri.articulo_id = a.id
WHERE ri.receta_id = $1
ORDER BY ri.orden
"""


async def _calcular_coste_total_receta(conn, receta_id: UUID) -> Decimal:
    ingredientes = await conn.fetch(SQL_INGREDIENTES_RECETA, receta_id)
    coste_total = Decimal("0")
    for ing in ingredientes:
        u_linea = str(ing["unidad"] or "").strip()
        u_art = str(ing["articulo_unidad_medida"] or "").strip()
        try:
            coste_eff = _effective_coste_articulo_row(ing)
            coste_total += _coste_linea_ingrediente(
                Decimal(str(ing["cantidad_neta"])),
                Decimal(str(ing["porcentaje_merma"] or 0)),
                u_linea,
                coste_eff,
                u_art,
            )
        except (ValueError, ArithmeticError):
            pass
    return coste_total


async def _sync_articulo_elaborado_coste(conn, receta_id: UUID) -> None:
    """Modelo A: actualiza coste_unitario del artículo elaborado = coste_total / rendimiento."""
    meta = await conn.fetchrow(
        "SELECT articulo_salida_id, rendimiento FROM recetas WHERE id = $1",
        receta_id,
    )
    if not meta or not meta.get("articulo_salida_id"):
        return
    total = await _calcular_coste_total_receta(conn, receta_id)
    rend = Decimal(str(meta["rendimiento"] or 1))
    if rend <= 0:
        rend = Decimal("1")
    cpu = (total / rend).quantize(Decimal("0.0001"), ROUND_HALF_UP)
    await conn.execute(
        "UPDATE articulos SET coste_unitario = $1 WHERE id = $2",
        cpu,
        meta["articulo_salida_id"],
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
        elabor_costes: list = []
        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])

            rows = await conn.fetch(
                """
                SELECT p.id, p.nombre, p.precio, r.id as receta_id
                FROM productos p
                LEFT JOIN recetas r ON p.id = r.producto_id
                WHERE p.tenant_id = $1 AND p.activo = true
                  AND p.tiene_receta = true
                ORDER BY p.nombre
                """,
                UUID(tenant_id),
            )

            ingredientes_por_receta: dict[str, list] = {}
            receta_ids = [r["receta_id"] for r in rows if r["receta_id"]]
            if receta_ids:
                ingredientes = await conn.fetch(
                    """
                    SELECT ri.receta_id, ri.cantidad_neta, ri.porcentaje_merma, ri.unidad,
                           a.coste_unitario, a.unidad_medida,
                           a.calibracion_comprado, a.calibracion_util
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

            elabor_rows = await conn.fetch(
                """
                SELECT r.id AS receta_id, a.id AS articulo_salida_id, a.nombre
                FROM recetas r
                JOIN articulos a ON r.articulo_salida_id = a.id
                WHERE a.tenant_id = $1 AND r.producto_id IS NULL
                ORDER BY a.nombre
                """,
                UUID(tenant_id),
            )
            for er in elabor_rows:
                ct = await _calcular_coste_total_receta(conn, er["receta_id"])
                elabor_costes.append((er, ct))

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
                try:
                    u_linea = str(ing["unidad"] or "").strip()
                    u_art = str(ing["unidad_medida"] or "").strip()
                    coste_eff = _effective_coste_articulo_row(ing)
                    coste_total += _coste_linea_ingrediente(
                        Decimal(str(ing["cantidad_neta"])),
                        Decimal(str(ing["porcentaje_merma"] or 0)),
                        u_linea,
                        coste_eff,
                        u_art,
                    )
                except (ValueError, ArithmeticError):
                    logger.warning(
                        "Línea receta incompatible receta_id=%s: unidad=%s art=%s",
                        ing.get("receta_id"),
                        ing.get("unidad"),
                        ing.get("unidad_medida"),
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

        for er, coste_total in elabor_costes:
            result.append(
                {
                    "producto_id": None,
                    "articulo_salida_id": str(er["articulo_salida_id"]),
                    "receta_id": str(er["receta_id"]),
                    "producto_nombre": er["nombre"],
                    "es_elaboracion": True,
                    "precio": None,
                    "precio_venta": None,
                    "coste": _decimal_respuesta_dinero(coste_total),
                    "coste_calculado": _decimal_respuesta_dinero(coste_total),
                    "margen_porcentaje": None,
                    "semaforo": "sin_venta",
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

            receta = await fetch_receta_tenant(conn, id, UUID(tenant_id))
            if not receta:
                raise HTTPException(status_code=404, detail="Receta no encontrada")

            salida = receta.get("articulo_salida_id")
            if salida and str(salida) == str(body.articulo_id):
                raise HTTPException(
                    status_code=400,
                    detail="No puedes añadir el propio elaborado como ingrediente",
                )

            art = await conn.fetchrow(
                "SELECT id, unidad_medida FROM articulos WHERE id = $1 AND tenant_id = $2",
                UUID(body.articulo_id),
                UUID(tenant_id),
            )
            if not art:
                raise HTTPException(status_code=404, detail="Artículo no encontrado")

            u_req = (body.unidad or "").strip().lower()
            u_art = str(art["unidad_medida"] or "").strip()
            permitidas = [
                x.lower() for x in unidades_permitidas_para_articulo(u_art)
            ]
            if u_req not in permitidas:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Unidad no válida para este artículo. "
                        f"El inventario usa «{u_art}»: solo "
                        f"{', '.join(unidades_permitidas_para_articulo(u_art))} "
                        "(líquidos: l/ml; sólidos: kg/g; unidades: ud)."
                    ),
                )

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

            await _sync_articulo_elaborado_coste(conn, id)

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

            receta = await fetch_receta_tenant(conn, id, UUID(tenant_id))
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

            await _sync_articulo_elaborado_coste(conn, id)

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

            receta = await fetch_receta_tenant(conn, id, UUID(tenant_id))
            if not receta:
                raise HTTPException(status_code=404, detail="Receta no encontrada")

            ingredientes = await conn.fetch(SQL_INGREDIENTES_RECETA, id)

            coste_total = Decimal("0")
            for ing in ingredientes:
                u_linea = str(ing["unidad"] or "").strip()
                u_art = str(ing["articulo_unidad_medida"] or "").strip()
                try:
                    coste_eff = _effective_coste_articulo_row(ing)
                    coste_total += _coste_linea_ingrediente(
                        Decimal(str(ing["cantidad_neta"])),
                        Decimal(str(ing["porcentaje_merma"] or 0)),
                        u_linea,
                        coste_eff,
                        u_art,
                    )
                except (ValueError, ArithmeticError) as ex:
                    logger.warning("Coste línea receta %s: %s", ing.get("id"), ex)

            es_elaboracion = receta.get("producto_id") is None
            precio_venta = Decimal(str(receta["precio_venta"] or 0))
            if es_elaboracion:
                margen = None
                semaforo = "sin_venta"
            elif precio_venta > 0:
                margen = (
                    (precio_venta - coste_total) / precio_venta * 100
                ).quantize(Decimal("0.01"), ROUND_HALF_UP)
                semaforo = _calcular_semaforo(margen)
            else:
                margen = Decimal("0")
                semaforo = _calcular_semaforo(margen)

            await _sync_articulo_elaborado_coste(conn, id)

            nombre_display = receta.get("producto_nombre") or receta.get(
                "articulo_salida_nombre"
            )

            ing_out = []
            for ing in ingredientes:
                cn = Decimal(str(ing["cantidad_neta"]))
                pm = Decimal(str(ing["porcentaje_merma"] or 0))
                denom = Decimal("1") - pm / Decimal("100")
                cantidad_bruta_val = cn / denom if denom != 0 else Decimal("0")
                u_linea = str(ing["unidad"] or "").strip()
                u_art = str(ing["articulo_unidad_medida"] or "").strip()
                coste_eff = _effective_coste_articulo_row(ing)
                try:
                    coste_lin = _coste_linea_ingrediente(
                        cn,
                        pm,
                        u_linea,
                        coste_eff,
                        u_art,
                    )
                except (ValueError, ArithmeticError):
                    coste_lin = Decimal("0")

                calib_ok = (
                    ing.get("calibracion_comprado") is not None
                    and ing.get("calibracion_util") is not None
                    and Decimal(str(ing["calibracion_comprado"])) > 0
                    and Decimal(str(ing["calibracion_util"])) > 0
                )

                ing_out.append(
                    {
                        "id": str(ing["id"]),
                        "articulo_id": str(ing["articulo_id"]),
                        "articulo_nombre": ing["articulo_nombre"],
                        "es_subreceta": bool(ing.get("articulo_es_elaborado")),
                        "cantidad_neta": _decimal_respuesta_qty(
                            ing.get("cantidad_neta")
                        ),
                        "porcentaje_merma": _decimal_respuesta_qty(
                            ing.get("porcentaje_merma")
                        ),
                        "unidad": ing["unidad"],
                        "cantidad_bruta": _decimal_respuesta_qty(cantidad_bruta_val),
                        "coste_unitario": _decimal_respuesta_qty(
                            ing.get("coste_unitario")
                        ),
                        "coste_unitario_efectivo": _decimal_respuesta_qty(coste_eff),
                        "calibracion_activa": calib_ok,
                        "coste_linea": _decimal_respuesta_dinero(coste_lin),
                    }
                )

            return {
                "receta_id": str(id),
                "articulo_salida_id": str(receta["articulo_salida_id"])
                if receta.get("articulo_salida_id")
                else None,
                "producto_nombre": nombre_display,
                "es_elaboracion": es_elaboracion,
                "instrucciones": receta.get("instrucciones"),
                "rendimiento": _decimal_respuesta_qty(receta.get("rendimiento"))
                if receta.get("rendimiento") is not None
                else None,
                "coste": _decimal_respuesta_dinero(coste_total),
                "coste_total": _decimal_respuesta_dinero(coste_total),
                "precio_venta": _decimal_respuesta_dinero(precio_venta)
                if not es_elaboracion
                else None,
                "margen_porcentaje": _decimal_respuesta_dinero(margen)
                if margen is not None
                else None,
                "semaforo": semaforo,
                "ingredientes": ing_out,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_receta_coste: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
