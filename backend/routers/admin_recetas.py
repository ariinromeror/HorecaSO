"""
Router admin de recetas para HorecaSO.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

ROLES_RECETAS_ADMIN = ["admin", "director"]
ROLES_RECETAS_COCINA = ["admin", "director", "cocina"]

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Recetas"],
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


async def _require_tenant_id(conn, user_id: str) -> str:
    """Exige usuario con tenant asignado."""
    tid = await _get_user_tenant(conn, user_id)
    if not tid:
        raise HTTPException(status_code=403, detail="Usuario sin tenant")
    return tid


def _decimal_respuesta_dinero(value) -> float | None:
    """float solo en dict de respuesta; dinero / márgenes a 2 decimales."""
    if value is None:
        return None
    return float(
        Decimal(str(value)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    )


def _decimal_respuesta_qty(value) -> float | None:
    """Cantidades de receta / ingredientes (4 decimales)."""
    if value is None:
        return None
    return float(
        Decimal(str(value)).quantize(Decimal("0.0001"), ROUND_HALF_UP)
    )


def _calcular_semaforo(margen: Decimal) -> str:
    """Verde >65%, amarillo 40-65%, rojo <40%."""
    if margen > Decimal("65"):
        return "verde"
    if margen >= Decimal("40"):
        return "amarillo"
    return "rojo"


def _sanitize_receta_row(r) -> dict:
    """Serializa fila receta tras INSERT/UPDATE (sin float en cálculos)."""
    d = dict(r)
    out: dict = {}
    for k, v in d.items():
        if v is None:
            out[k] = None
        elif isinstance(v, UUID):
            out[k] = str(v)
        elif isinstance(v, Decimal):
            out[k] = (
                _decimal_respuesta_qty(v)
                if k == "rendimiento"
                else _decimal_respuesta_dinero(v)
            )
        elif hasattr(v, "isoformat") and callable(getattr(v, "isoformat")):
            try:
                out[k] = v.isoformat()
            except (TypeError, ValueError):
                out[k] = v
        else:
            out[k] = v
    return out


def _sanitize_ingrediente_row(r) -> dict:
    """Serializa fila receta_ingredientes tras INSERT."""
    d = dict(r)
    out: dict = {}
    for k, v in d.items():
        if v is None:
            out[k] = None
        elif isinstance(v, UUID):
            out[k] = str(v)
        elif isinstance(v, Decimal):
            out[k] = _decimal_respuesta_qty(v)
        else:
            out[k] = v
    return out


# --- Schemas ---


class CreateRecetaRequest(BaseModel):
    producto_id: str
    rendimiento: Decimal = Decimal("1")
    tiempo_preparacion: int | None = None
    instrucciones: str | None = None


class UpdateRecetaRequest(BaseModel):
    rendimiento: Decimal | None = None
    tiempo_preparacion: int | None = None
    instrucciones: str | None = None


class AddIngredienteRequest(BaseModel):
    articulo_id: str
    cantidad_neta: Decimal
    porcentaje_merma: Decimal = Decimal("0")
    unidad: str


# --- Recetas ---


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
                SELECT r.*, p.nombre as producto_nombre, p.precio as precio_venta
                FROM recetas r
                JOIN productos p ON r.producto_id = p.id
                WHERE p.tenant_id = $1
                ORDER BY p.nombre
                """,
                UUID(tenant_id),
            )

        return [
            {
                "id": str(r["id"]),
                "producto_id": str(r["producto_id"]),
                "producto_nombre": r["producto_nombre"],
                "precio_venta": _decimal_respuesta_dinero(r.get("precio_venta")),
                "rendimiento": _decimal_respuesta_qty(r.get("rendimiento"))
                if r.get("rendimiento") is not None
                else _decimal_respuesta_qty(Decimal("1")),
                "tiempo_preparacion": r["tiempo_preparacion"],
                "instrucciones": r["instrucciones"],
                "coste_calculado": _decimal_respuesta_dinero(
                    r.get("coste_calculado")
                ),
                "margen_porcentaje": _decimal_respuesta_dinero(
                    r.get("margen_porcentaje")
                ),
                "semaforo": r["semaforo"],
                "updated_at": r["updated_at"].isoformat()
                if r.get("updated_at")
                else None,
            }
            for r in rows
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_recetas: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


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
        return _sanitize_receta_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en update_receta: %s", e)
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
