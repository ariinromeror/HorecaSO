"""
Inventario: movimientos e inventario físico.
"""

import logging
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import require_roles
from database import get_db

from .inventario_movimientos_schemas import (
    InventarioFisicoRequest,
    MovimientoRequest,
)
from .inventario_shared import (
    ROLES_LECTURA,
    ROLES_MOVIMIENTOS,
    _fetch_usuario,
    _insert_movimiento,
    _serialize_coste_json,
    _serialize_stock_qty,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/movimientos")
async def crear_movimiento(
    body: MovimientoRequest,
    current_user: dict = Depends(require_roles(ROLES_MOVIMIENTOS)),
):
    """
    Registra movimiento y actualiza stock en la misma transacción.
    """
    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))
            usuario_id = UUID(current_user["sub"])
            outlet_id = UUID(str(urow["outlet_id"])) if urow["outlet_id"] else None

            art = await conn.fetchrow(
                """
                SELECT id, nombre, stock_actual, coste_unitario
                FROM articulos
                WHERE id = $1 AND tenant_id = $2
                FOR UPDATE
                """,
                UUID(body.articulo_id),
                tenant_id,
            )
            if not art:
                raise HTTPException(status_code=404, detail="Artículo no encontrado")

            stock_ant = Decimal(
                str(art["stock_actual"] if art["stock_actual"] is not None else 0)
            )
            tipo = body.tipo
            cant = body.cantidad
            stock_nuevo = stock_ant

            if tipo == "entrada":
                stock_nuevo = stock_ant + cant
                await conn.execute(
                    "UPDATE articulos SET stock_actual = $1 WHERE id = $2 AND tenant_id = $3",
                    stock_nuevo,
                    art["id"],
                    tenant_id,
                )
                if body.coste_unitario is not None:
                    await conn.execute(
                        """
                        UPDATE articulos SET coste_unitario = $1
                        WHERE id = $2 AND tenant_id = $3
                        """,
                        body.coste_unitario,
                        art["id"],
                        tenant_id,
                    )
                mov_coste = body.coste_unitario
            elif tipo in ("salida", "merma"):
                if stock_ant < cant:
                    raise HTTPException(status_code=400, detail="Stock insuficiente")
                stock_nuevo = stock_ant - cant
                await conn.execute(
                    "UPDATE articulos SET stock_actual = $1 WHERE id = $2 AND tenant_id = $3",
                    stock_nuevo,
                    art["id"],
                    tenant_id,
                )
                mov_coste = body.coste_unitario
            else:  # ajuste
                stock_nuevo = cant
                await conn.execute(
                    "UPDATE articulos SET stock_actual = $1 WHERE id = $2 AND tenant_id = $3",
                    stock_nuevo,
                    art["id"],
                    tenant_id,
                )
                mov_coste = body.coste_unitario

            mid = await _insert_movimiento(
                conn,
                art["id"],
                outlet_id,
                usuario_id,
                tipo,
                cant,
                mov_coste,
                body.motivo,
                None,
            )

        logger.info(
            "Movimiento stock %s artículo=%s tipo=%s cant=%s",
            mid,
            art["id"],
            tipo,
            cant,
        )

        return {
            "movimiento_id": str(mid),
            "articulo_id": str(art["id"]),
            "nombre_articulo": art["nombre"],
            "stock_anterior": _serialize_stock_qty(stock_ant),
            "stock_nuevo": _serialize_stock_qty(stock_nuevo),
            "tipo": tipo,
            "cantidad": _serialize_stock_qty(cant),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en crear_movimiento: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.get("/movimientos")
async def list_movimientos(
    articulo_id: Optional[UUID] = Query(None),
    tipo: Optional[str] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    """Historial de movimientos del tenant."""
    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))
            where_clauses = ["a.tenant_id = $1"]
            args: list[Any] = [tenant_id]

            if articulo_id is not None:
                args.append(articulo_id)
                where_clauses.append("m.articulo_id = $" + str(len(args)))

            if tipo is not None and tipo.strip():
                args.append(tipo.strip())
                where_clauses.append("m.tipo = $" + str(len(args)))

            if desde is not None:
                dt_desde = datetime.combine(desde, time.min, tzinfo=timezone.utc)
                args.append(dt_desde)
                where_clauses.append("m.created_at >= $" + str(len(args)))

            if hasta is not None:
                dt_hasta = datetime.combine(
                    hasta, time(23, 59, 59, 999999), tzinfo=timezone.utc
                )
                args.append(dt_hasta)
                where_clauses.append("m.created_at <= $" + str(len(args)))

            args.append(limit)
            limit_ph = len(args)

            sql = (
                "SELECT m.id, m.articulo_id, m.tipo, m.cantidad, m.coste_unitario, "
                "m.motivo, m.created_at, a.nombre AS articulo_nombre, "
                "u.nombre AS usuario_nombre "
                "FROM movimientos_stock m "
                "JOIN articulos a ON m.articulo_id = a.id "
                "LEFT JOIN usuarios u ON m.usuario_id = u.id "
                "WHERE "
                + " AND ".join(where_clauses)
                + " ORDER BY m.created_at DESC LIMIT $"
                + str(limit_ph)
            )
            rows = await conn.fetch(sql, *args)

        return [
            {
                "id": str(r["id"]),
                "articulo_id": str(r["articulo_id"]),
                "articulo_nombre": r["articulo_nombre"],
                "tipo": r["tipo"],
                "cantidad": _serialize_stock_qty(r["cantidad"])
                if r["cantidad"] is not None
                else 0.0,
                "coste_unitario": _serialize_coste_json(r.get("coste_unitario")),
                "motivo": r["motivo"],
                "usuario_nombre": r["usuario_nombre"],
                "created_at": r["created_at"].isoformat()
                if r["created_at"]
                else None,
            }
            for r in rows
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_movimientos: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.post("/inventario-fisico")
async def inventario_fisico(
    body: InventarioFisicoRequest,
    current_user: dict = Depends(require_roles(ROLES_MOVIMIENTOS)),
):
    """Ajustes de stock por conteo físico en una sola transacción."""
    if not body.articulos:
        raise HTTPException(status_code=400, detail="Lista vacía")

    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))
            usuario_id = UUID(current_user["sub"])
            outlet_id = UUID(str(urow["outlet_id"])) if urow["outlet_id"] else None

            actualizados: list[dict] = []

            for item in body.articulos:
                aid = UUID(item.articulo_id)
                art = await conn.fetchrow(
                    """
                    SELECT id, nombre, stock_actual
                    FROM articulos
                    WHERE id = $1 AND tenant_id = $2
                    FOR UPDATE
                    """,
                    aid,
                    tenant_id,
                )
                if not art:
                    raise HTTPException(
                        status_code=404,
                        detail="Artículo no encontrado: " + str(item.articulo_id),
                    )

                stock_ant = Decimal(
                    str(art["stock_actual"] if art["stock_actual"] is not None else 0)
                )
                cant_real = item.cantidad_real
                stock_nuevo = cant_real

                await conn.execute(
                    "UPDATE articulos SET stock_actual = $1 WHERE id = $2 AND tenant_id = $3",
                    stock_nuevo,
                    aid,
                    tenant_id,
                )

                await _insert_movimiento(
                    conn,
                    aid,
                    outlet_id,
                    usuario_id,
                    "ajuste",
                    cant_real,
                    None,
                    "inventario_fisico",
                    None,
                )

                actualizados.append(
                    {
                        "articulo_id": str(aid),
                        "nombre": art["nombre"],
                        "stock_anterior": _serialize_stock_qty(stock_ant),
                        "stock_nuevo": _serialize_stock_qty(stock_nuevo),
                    }
                )

        logger.info(
            "Inventario físico: %s artículos usuario=%s",
            len(actualizados),
            usuario_id,
        )

        return {
            "procesados": len(actualizados),
            "articulos_actualizados": actualizados,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en inventario_fisico: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
