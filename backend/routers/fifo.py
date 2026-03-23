"""
FIFO — lotes de inventario, entradas, consumos y valoración.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

ROLES_ALMACEN = ["admin", "director", "almacen"]

router = APIRouter(
    prefix="/fifo",
    tags=["FIFO"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


def _uid(current_user: dict) -> UUID:
    s = current_user.get("user_id") or current_user.get("sub")
    if not s:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    return UUID(str(s))


async def _tenant_id_usuario(conn, user_id: UUID) -> UUID:
    row = await conn.fetchrow(
        "SELECT tenant_id FROM usuarios WHERE id = $1",
        user_id,
    )
    if not row or not row["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario sin tenant asignado",
        )
    return row["tenant_id"]


async def _outlet_id_usuario(conn, user_id: UUID) -> UUID:
    row = await conn.fetchrow(
        "SELECT outlet_id FROM usuarios WHERE id = $1",
        user_id,
    )
    if not row or not row["outlet_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario sin outlet asignado",
        )
    return row["outlet_id"]


def _q2(d: Decimal) -> Decimal:
    return d.quantize(Decimal("0.01"), ROUND_HALF_UP)


def _q4(d: Decimal) -> Decimal:
    return d.quantize(Decimal("0.0001"), ROUND_HALF_UP)


def _str_qty(d: Decimal) -> str:
    return str(_q4(d))


def _str_money(d: Decimal) -> str:
    return str(_q2(d))


def _serialize_lote_row(r: Any) -> dict:
    ca = r.get("created_at")
    fc = r.get("fecha_caducidad")
    return {
        "id": str(r["id"]),
        "articulo_id": str(r["articulo_id"]),
        "outlet_id": str(r["outlet_id"]),
        "cantidad": _str_qty(Decimal(str(r["cantidad"] or 0))),
        "coste_unitario": _str_money(Decimal(str(r["coste_unitario"] or 0))),
        "fecha_caducidad": fc.isoformat()
        if fc is not None and hasattr(fc, "isoformat")
        else None,
        "numero_lote": r.get("numero_lote"),
        "created_at": ca.isoformat() if ca is not None and hasattr(ca, "isoformat") else None,
        "nombre_articulo": r.get("nombre_articulo"),
        "unidad_medida": r.get("unidad_medida"),
        "sku": r.get("sku"),
    }


@router.get("/lotes")
async def list_lotes_fifo(
    articulo_id: Optional[UUID] = Query(None),
    solo_activos: Optional[bool] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_ALMACEN)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            conds = [
                "l.outlet_id = $1",
                "a.tenant_id = $2",
            ]
            params: list[Any] = [outlet_id, tenant_id]
            n = 3
            if articulo_id is not None:
                conds.append("l.articulo_id = $" + str(n))
                params.append(articulo_id)
                n += 1
            if solo_activos is True:
                conds.append("l.cantidad > 0")
            where_sql = " AND ".join(conds)
            rows = await conn.fetch(
                """
                SELECT
                    l.id,
                    l.articulo_id,
                    l.outlet_id,
                    l.cantidad,
                    l.coste_unitario,
                    l.fecha_caducidad,
                    l.numero_lote,
                    l.created_at,
                    a.nombre AS nombre_articulo,
                    a.unidad_medida,
                    a.sku
                FROM lotes_inventario l
                JOIN articulos a ON l.articulo_id = a.id
                WHERE """
                + where_sql
                + """
                ORDER BY l.fecha_caducidad ASC NULLS LAST, l.created_at ASC
                """,
                *params,
            )
            return [_serialize_lote_row(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_lotes_fifo: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class CreateLoteFifoBody(BaseModel):
    articulo_id: UUID
    cantidad: Decimal = Field(..., gt=0)
    coste_unitario: Decimal = Field(..., ge=0)
    fecha_caducidad: Optional[date] = None
    numero_lote: Optional[str] = None


@router.post("/lotes", status_code=status.HTTP_201_CREATED)
async def create_lote_fifo(
    body: CreateLoteFifoBody,
    current_user: dict = Depends(require_roles(ROLES_ALMACEN)),
):
    user_uuid = _uid(current_user)
    cant = _q4(body.cantidad)
    coste_u = _q2(body.coste_unitario)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)

            art = await conn.fetchrow(
                """
                SELECT id FROM articulos
                WHERE id = $1 AND tenant_id = $2
                FOR UPDATE
                """,
                body.articulo_id,
                tenant_id,
            )
            if not art:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Artículo no encontrado",
                )

            row = await conn.fetchrow(
                """
                INSERT INTO lotes_inventario (
                    articulo_id, outlet_id, cantidad, coste_unitario,
                    fecha_caducidad, numero_lote
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                body.articulo_id,
                outlet_id,
                cant,
                coste_u,
                body.fecha_caducidad,
                body.numero_lote.strip() if body.numero_lote else None,
            )
            lid = row["id"]

            await conn.execute(
                """
                UPDATE articulos
                SET stock_actual = stock_actual + $1,
                    coste_unitario = $2
                WHERE id = $3 AND tenant_id = $4
                """,
                cant,
                coste_u,
                body.articulo_id,
                tenant_id,
            )

            await conn.execute(
                """
                INSERT INTO movimientos_stock (
                    articulo_id, outlet_id, tipo, cantidad, coste_unitario,
                    motivo, usuario_id, ticket_id
                )
                VALUES ($1, $2, 'entrada', $3, $4, 'lote_fifo', $5, NULL)
                """,
                body.articulo_id,
                outlet_id,
                cant,
                coste_u,
                user_uuid,
            )

            r2 = await conn.fetchrow(
                """
                SELECT
                    l.id,
                    l.articulo_id,
                    l.outlet_id,
                    l.cantidad,
                    l.coste_unitario,
                    l.fecha_caducidad,
                    l.numero_lote,
                    l.created_at,
                    a.nombre AS nombre_articulo,
                    a.unidad_medida,
                    a.sku
                FROM lotes_inventario l
                JOIN articulos a ON l.articulo_id = a.id
                WHERE l.id = $1
                """,
                lid,
            )
            return _serialize_lote_row(r2)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_lote_fifo: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class ConsumirFifoBody(BaseModel):
    articulo_id: UUID
    cantidad: Decimal = Field(..., gt=0)
    motivo: str = Field(..., min_length=1)


@router.post("/consumir")
async def consumir_fifo(
    body: ConsumirFifoBody,
    current_user: dict = Depends(require_roles(ROLES_ALMACEN)),
):
    user_uuid = _uid(current_user)
    need = _q4(body.cantidad)
    motivo = body.motivo.strip()
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)

            art = await conn.fetchrow(
                """
                SELECT id FROM articulos
                WHERE id = $1 AND tenant_id = $2
                FOR UPDATE
                """,
                body.articulo_id,
                tenant_id,
            )
            if not art:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Artículo no encontrado",
                )

            sum_row = await conn.fetchrow(
                """
                SELECT COALESCE(SUM(cantidad), 0) AS total
                FROM lotes_inventario
                WHERE articulo_id = $1 AND outlet_id = $2 AND cantidad > 0
                """,
                body.articulo_id,
                outlet_id,
            )
            disponible = _q4(Decimal(str(sum_row["total"] or 0)))
            if disponible < need:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente. Disponible: {_str_qty(disponible)} unidades",
                )

            lotes = await conn.fetch(
                """
                SELECT id, cantidad, coste_unitario
                FROM lotes_inventario
                WHERE articulo_id = $1 AND outlet_id = $2 AND cantidad > 0
                ORDER BY fecha_caducidad ASC NULLS LAST, created_at ASC
                FOR UPDATE
                """,
                body.articulo_id,
                outlet_id,
            )

            remaining = need
            lotes_afectados: list[dict[str, Any]] = []
            coste_total = Decimal("0")

            for l in lotes:
                if remaining <= 0:
                    break
                l_cant = _q4(Decimal(str(l["cantidad"] or 0)))
                l_coste = _q2(Decimal(str(l["coste_unitario"] or 0)))
                take = min(remaining, l_cant)
                take = _q4(take)
                if take <= 0:
                    continue
                new_cant = _q4(l_cant - take)
                await conn.execute(
                    """
                    UPDATE lotes_inventario
                    SET cantidad = $1
                    WHERE id = $2
                    """,
                    new_cant,
                    l["id"],
                )
                lotes_afectados.append(
                    {
                        "lote_id": str(l["id"]),
                        "cantidad_consumida": _str_qty(take),
                    }
                )
                coste_total = _q2(coste_total + take * l_coste)
                remaining = _q4(remaining - take)

            if remaining > Decimal("0.0001"):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al aplicar consumo FIFO",
                )

            coste_medio = _q2(coste_total / need) if need > 0 else Decimal("0")

            await conn.execute(
                """
                UPDATE articulos
                SET stock_actual = stock_actual - $1
                WHERE id = $2 AND tenant_id = $3
                """,
                need,
                body.articulo_id,
                tenant_id,
            )

            await conn.execute(
                """
                INSERT INTO movimientos_stock (
                    articulo_id, outlet_id, tipo, cantidad, coste_unitario,
                    motivo, usuario_id, ticket_id
                )
                VALUES ($1, $2, 'salida', $3, $4, $5, $6, NULL)
                """,
                body.articulo_id,
                outlet_id,
                need,
                coste_medio,
                motivo,
                user_uuid,
            )

            return {
                "articulo_id": str(body.articulo_id),
                "cantidad_consumida": _str_qty(need),
                "coste_medio_ponderado": _str_money(coste_medio),
                "lotes_afectados": lotes_afectados,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("consumir_fifo: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/alertas-caducidad")
async def list_alertas_caducidad(
    dias: int = Query(7, ge=1, le=365),
    current_user: dict = Depends(require_roles(ROLES_ALMACEN)),
):
    user_uuid = _uid(current_user)
    hoy = date.today()
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            rows = await conn.fetch(
                """
                SELECT
                    l.id,
                    l.articulo_id,
                    l.outlet_id,
                    l.cantidad,
                    l.coste_unitario,
                    l.fecha_caducidad,
                    l.numero_lote,
                    l.created_at,
                    a.nombre AS nombre_articulo,
                    a.unidad_medida,
                    a.sku
                FROM lotes_inventario l
                JOIN articulos a ON l.articulo_id = a.id
                WHERE l.outlet_id = $1
                  AND a.tenant_id = $2
                  AND l.cantidad > 0
                  AND l.fecha_caducidad IS NOT NULL
                  AND l.fecha_caducidad <= (CURRENT_DATE + $3::integer)
                  AND l.fecha_caducidad >= CURRENT_DATE
                ORDER BY l.fecha_caducidad ASC
                """,
                outlet_id,
                tenant_id,
                dias,
            )

        out = []
        for r in rows:
            fc = r["fecha_caducidad"]
            if fc is None:
                continue
            fd = fc.date() if isinstance(fc, datetime) else fc
            dias_rest = (fd - hoy).days
            base = _serialize_lote_row(r)
            base["dias_restantes"] = dias_rest
            out.append(base)
        return out
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_alertas_caducidad: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/valoracion-stock")
async def get_valoracion_stock(
    current_user: dict = Depends(require_roles(ROLES_ALMACEN)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            rows = await conn.fetch(
                """
                SELECT
                    a.id,
                    a.nombre,
                    a.sku,
                    a.unidad_medida,
                    COALESCE(SUM(l.cantidad), 0) AS stock_total,
                    COALESCE(SUM(l.cantidad * l.coste_unitario), 0) AS valor_total,
                    CASE
                        WHEN COALESCE(SUM(l.cantidad), 0) > 0 THEN
                            SUM(l.cantidad * l.coste_unitario) / SUM(l.cantidad)
                        ELSE 0
                    END AS coste_medio
                FROM lotes_inventario l
                JOIN articulos a ON l.articulo_id = a.id
                WHERE l.outlet_id = $1
                  AND l.cantidad > 0
                  AND a.tenant_id = $2
                GROUP BY a.id, a.nombre, a.sku, a.unidad_medida
                ORDER BY valor_total DESC
                """,
                outlet_id,
                tenant_id,
            )

        articulos_out = []
        valor_almacen = Decimal("0")
        for r in rows:
            st = Decimal(str(r["stock_total"] or 0))
            vt = Decimal(str(r["valor_total"] or 0))
            cm = Decimal(str(r["coste_medio"] or 0))
            valor_almacen = _q2(valor_almacen + vt)
            articulos_out.append(
                {
                    "articulo_id": str(r["id"]),
                    "nombre": r["nombre"],
                    "sku": r.get("sku"),
                    "unidad_medida": r.get("unidad_medida"),
                    "stock_total": _str_qty(st),
                    "valor_total": _str_money(vt),
                    "coste_medio": _str_money(_q2(cm)),
                }
            )

        return {
            "articulos": articulos_out,
            "valor_total_almacen": _str_money(valor_almacen),
            "num_articulos": len(articulos_out),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_valoracion_stock: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
