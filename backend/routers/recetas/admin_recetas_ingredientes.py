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


def _no_costeado(ing, motivo: str, detalle: str) -> dict:
    return {
        "ingrediente_id": str(ing["id"]),
        "articulo_id": str(ing["articulo_id"]),
        "articulo_nombre": ing["articulo_nombre"],
        "motivo": motivo,
        "detalle": detalle,
    }


def _costear_ingredientes(ingredientes) -> tuple[Decimal, list[dict]]:
    """
    Coste total de las líneas costeables y lista de las que no lo son
    (motivo: sin_coste | unidad_incompatible | error_calculo); estas suman 0 €.
    """
    coste_total = Decimal("0")
    no_costeados: list[dict] = []
    for ing in ingredientes:
        u_linea = str(ing["unidad"] or "").strip()
        u_art = str(ing["articulo_unidad_medida"] or "").strip()
        coste_eff = _effective_coste_articulo_row(ing)
        try:
            coste_linea = _coste_linea_ingrediente(
                Decimal(str(ing["cantidad_neta"])),
                Decimal(str(ing["porcentaje_merma"] or 0)),
                u_linea,
                coste_eff,
                u_art,
            )
        except ValueError as ex:
            no_costeados.append(_no_costeado(ing, "unidad_incompatible", str(ex)))
            continue
        except ArithmeticError as ex:
            no_costeados.append(_no_costeado(ing, "error_calculo", str(ex)))
            continue
        if coste_eff <= 0:
            no_costeados.append(
                _no_costeado(ing, "sin_coste", "El artículo no tiene coste unitario")
            )
            continue
        coste_total += coste_linea
    return coste_total, no_costeados


def _margen_y_semaforo(
    es_elaboracion: bool, precio_venta: Decimal, coste_total: Decimal
) -> tuple[Decimal | None, str]:
    if es_elaboracion:
        return None, "sin_venta"
    if precio_venta > 0:
        margen = (
            (precio_venta - coste_total) / precio_venta * 100
        ).quantize(Decimal("0.01"), ROUND_HALF_UP)
    else:
        margen = Decimal("0")
    return margen, _calcular_semaforo(margen)


# recetas.margen_porcentaje es NUMERIC(5,2).
MARGEN_MIN_GUARDADO = Decimal("-999.99")


async def _actualizar_coste_receta(conn, receta_id: UUID) -> tuple[Decimal, list[dict]]:
    """
    Recalcula y guarda coste_calculado, margen_porcentaje y semaforo de la receta.
    Modelo A: si es elaboración, coste_unitario del artículo = coste_total / rendimiento.
    """
    meta = await conn.fetchrow(
        """
        SELECT r.producto_id, r.articulo_salida_id, r.rendimiento,
               p.precio AS precio_venta,
               COALESCE(
                   p.tenant_id,
                   (SELECT a.tenant_id FROM receta_ingredientes ri
                    JOIN articulos a ON a.id = ri.articulo_id
                    WHERE ri.receta_id = r.id LIMIT 1)
               ) AS tenant_id
        FROM recetas r
        LEFT JOIN productos p ON p.id = r.producto_id
        WHERE r.id = $1
        """,
        receta_id,
    )
    if not meta:
        return Decimal("0"), []
    ingredientes = await conn.fetch(SQL_INGREDIENTES_RECETA, receta_id)
    total, no_costeados = _costear_ingredientes(ingredientes)
    margen, semaforo = _margen_y_semaforo(
        meta["producto_id"] is None,
        Decimal(str(meta["precio_venta"] or 0)),
        total,
    )
    await conn.execute(
        """
        UPDATE recetas
        SET coste_calculado = $1, margen_porcentaje = $2, semaforo = $3, updated_at = NOW()
        WHERE id = $4
        """,
        total.quantize(Decimal("0.0001"), ROUND_HALF_UP),
        max(margen, MARGEN_MIN_GUARDADO) if margen is not None else None,
        semaforo,
        receta_id,
    )
    if no_costeados:
        logger.warning(
            "Receta %s con %d ingrediente(s) sin costear: %s",
            receta_id,
            len(no_costeados),
            ", ".join(f"{x['articulo_nombre']} ({x['motivo']})" for x in no_costeados),
        )

    if meta["articulo_salida_id"]:
        rend = Decimal(str(meta["rendimiento"] or 1))
        if rend <= 0:
            rend = Decimal("1")
        cpu = (total / rend).quantize(Decimal("0.0001"), ROUND_HALF_UP)
        if meta["tenant_id"]:
            await conn.execute(
                "UPDATE articulos SET coste_unitario = $1 "
                "WHERE id = $2 AND tenant_id = $3",
                cpu,
                meta["articulo_salida_id"],
                meta["tenant_id"],
            )
    return total, no_costeados


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


class BulkIngredientesRequest(BaseModel):
    lineas: list[AddIngredienteRequest]


class UpdateIngredienteRequest(BaseModel):
    cantidad_neta: Decimal | None = None
    porcentaje_merma: Decimal | None = None
    unidad: str | None = None


def _validar_merma(pct: Decimal) -> None:
    if pct < 0 or pct >= 100:
        raise HTTPException(
            status_code=400,
            detail="porcentaje_merma debe estar entre 0 y 99.99",
        )


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
                    SELECT ri.id, ri.receta_id, ri.articulo_id, ri.cantidad_neta,
                           ri.porcentaje_merma, ri.unidad,
                           a.coste_unitario, a.unidad_medida AS articulo_unidad_medida,
                           a.nombre AS articulo_nombre,
                           a.calibracion_comprado, a.calibracion_util
                    FROM receta_ingredientes ri
                    JOIN articulos a ON ri.articulo_id = a.id
                    WHERE ri.receta_id = ANY($1::uuid[])
                    ORDER BY ri.orden
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
                ingredientes_elab = await conn.fetch(
                    SQL_INGREDIENTES_RECETA, er["receta_id"]
                )
                ct, nc = _costear_ingredientes(ingredientes_elab)
                elabor_costes.append((er, ct, nc))

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
            coste_total, no_costeados = _costear_ingredientes(ingredientes)

            precio_venta = Decimal(str(r["precio"] or 0))
            margen, semaforo = _margen_y_semaforo(False, precio_venta, coste_total)

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
                    "semaforo": semaforo,
                    "coste_completo": not no_costeados,
                    "ingredientes_no_costeados": no_costeados,
                }
            )

        for er, coste_total, no_costeados in elabor_costes:
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
                    "coste_completo": not no_costeados,
                    "ingredientes_no_costeados": no_costeados,
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

            _validar_merma(body.porcentaje_merma or Decimal("0"))

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

            _, no_costeados = await _actualizar_coste_receta(conn, id)

        return {
            **_sanitize_ingrediente_row(row),
            "ingredientes_no_costeados": no_costeados,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en add_ingrediente: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/recetas/{id}/ingredientes/bulk")
async def add_ingredientes_bulk(
    id: UUID,
    body: BulkIngredientesRequest,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_ADMIN)),
):
    """Añadir varias líneas de ingredientes en una sola transacción."""
    try:
        if not body.lineas:
            raise HTTPException(
                status_code=400, detail="Envía al menos una línea de ingredientes"
            )
        if len(body.lineas) > 200:
            raise HTTPException(
                status_code=400, detail="Máximo 200 líneas por importación"
            )

        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])
            tenant_uuid = UUID(tenant_id)

            receta = await fetch_receta_tenant(conn, id, tenant_uuid)
            if not receta:
                raise HTTPException(status_code=404, detail="Receta no encontrada")

            salida = receta.get("articulo_salida_id")
            max_orden = await conn.fetchval(
                "SELECT COALESCE(MAX(orden), 0) FROM receta_ingredientes WHERE receta_id = $1",
                id,
            )
            orden = int(max_orden or 0)
            inserted_rows = []

            for idx, linea in enumerate(body.lineas):
                if salida and str(salida) == str(linea.articulo_id):
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Fila {idx + 1}: no puedes añadir el propio elaborado "
                            "como ingrediente"
                        ),
                    )

                try:
                    art_uuid = UUID(str(linea.articulo_id))
                except (ValueError, TypeError):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Fila {idx + 1}: articulo_id no válido",
                    ) from None

                art = await conn.fetchrow(
                    "SELECT id, unidad_medida FROM articulos WHERE id = $1 AND tenant_id = $2",
                    art_uuid,
                    tenant_uuid,
                )
                if not art:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Fila {idx + 1}: artículo no encontrado",
                    )

                if linea.cantidad_neta is None or linea.cantidad_neta <= 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Fila {idx + 1}: cantidad_neta debe ser mayor que cero",
                    )

                u_req = (linea.unidad or "").strip().lower()
                u_art = str(art["unidad_medida"] or "").strip()
                permitidas = [
                    x.lower() for x in unidades_permitidas_para_articulo(u_art)
                ]
                if u_req not in permitidas:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Fila {idx + 1}: unidad no válida. El inventario usa "
                            f"«{u_art}»: solo "
                            f"{', '.join(unidades_permitidas_para_articulo(u_art))}."
                        ),
                    )

                try:
                    _validar_merma(linea.porcentaje_merma or Decimal("0"))
                except HTTPException as he:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Fila {idx + 1}: {he.detail}",
                    ) from he

                orden += 1
                row = await conn.fetchrow(
                    """
                    INSERT INTO receta_ingredientes (
                        receta_id, articulo_id, cantidad_neta, porcentaje_merma, unidad, orden
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                    """,
                    id,
                    art_uuid,
                    linea.cantidad_neta,
                    linea.porcentaje_merma or Decimal("0"),
                    linea.unidad,
                    orden,
                )
                inserted_rows.append(_sanitize_ingrediente_row(row))

            coste_total, no_costeados = await _actualizar_coste_receta(conn, id)

        return {
            "inserted": len(inserted_rows),
            "coste_total": _decimal_respuesta_dinero(coste_total),
            "coste_completo": not no_costeados,
            "ingredientes_no_costeados": no_costeados,
            "ingredientes": inserted_rows,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en add_ingredientes_bulk: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.put("/recetas/{id}/ingredientes/{ingrediente_id}")
async def update_ingrediente(
    id: UUID,
    ingrediente_id: UUID,
    body: UpdateIngredienteRequest,
    current_user: dict = Depends(require_roles(ROLES_RECETAS_ADMIN)),
):
    """Actualiza cantidad, merma y/o unidad de una línea de ingrediente."""
    try:
        if (
            body.cantidad_neta is None
            and body.porcentaje_merma is None
            and body.unidad is None
        ):
            raise HTTPException(
                status_code=400,
                detail="Al menos un campo es requerido",
            )
        if body.cantidad_neta is not None and body.cantidad_neta <= 0:
            raise HTTPException(
                status_code=400,
                detail="cantidad_neta debe ser mayor que 0",
            )
        if body.porcentaje_merma is not None:
            _validar_merma(body.porcentaje_merma)

        async with get_db() as conn:
            tenant_id = await _require_tenant_id(conn, current_user["sub"])
            receta = await fetch_receta_tenant(conn, id, UUID(tenant_id))
            if not receta:
                raise HTTPException(status_code=404, detail="Receta no encontrada")

            ing = await conn.fetchrow(
                """
                SELECT ri.*, a.unidad_medida, a.tenant_id
                FROM receta_ingredientes ri
                JOIN articulos a ON a.id = ri.articulo_id
                WHERE ri.id = $1 AND ri.receta_id = $2
                """,
                ingrediente_id,
                id,
            )
            if not ing or str(ing["tenant_id"]) != str(tenant_id):
                raise HTTPException(
                    status_code=404, detail="Ingrediente no encontrado"
                )

            args: list = []
            updates: list[str] = []
            if body.cantidad_neta is not None:
                args.append(body.cantidad_neta)
                updates.append("cantidad_neta = $" + str(len(args)))
            if body.porcentaje_merma is not None:
                args.append(body.porcentaje_merma)
                updates.append("porcentaje_merma = $" + str(len(args)))
            if body.unidad is not None:
                u_req = body.unidad.strip().lower()
                u_art = str(ing["unidad_medida"] or "").strip()
                permitidas = [
                    x.lower() for x in unidades_permitidas_para_articulo(u_art)
                ]
                if u_req not in permitidas:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Unidad no válida para este artículo. "
                            f"El inventario usa «{u_art}»: solo "
                            f"{', '.join(unidades_permitidas_para_articulo(u_art))}."
                        ),
                    )
                args.append(u_req)
                updates.append("unidad = $" + str(len(args)))

            args.extend([ingrediente_id, id])
            sql = (
                "UPDATE receta_ingredientes SET "
                + ", ".join(updates)
                + " WHERE id = $"
                + str(len(args) - 1)
                + " AND receta_id = $"
                + str(len(args))
                + " RETURNING *"
            )
            row = await conn.fetchrow(sql, *args)
            _, no_costeados = await _actualizar_coste_receta(conn, id)

        return {
            **_sanitize_ingrediente_row(row),
            "ingredientes_no_costeados": no_costeados,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en update_ingrediente: %s", e)
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

            await _actualizar_coste_receta(conn, id)

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

            es_elaboracion = receta.get("producto_id") is None
            precio_venta = Decimal(str(receta["precio_venta"] or 0))
            coste_total, no_costeados = await _actualizar_coste_receta(conn, id)
            margen, semaforo = _margen_y_semaforo(
                es_elaboracion, precio_venta, coste_total
            )
            ids_no_costeados = {x["ingrediente_id"] for x in no_costeados}

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
                costeado = str(ing["id"]) not in ids_no_costeados
                coste_lin = (
                    _coste_linea_ingrediente(cn, pm, u_linea, coste_eff, u_art)
                    if costeado
                    else Decimal("0")
                )

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
                        "costeado": costeado,
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
                "coste_completo": not no_costeados,
                "ingredientes_no_costeados": no_costeados,
                "ingredientes": ing_out,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_receta_coste: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
