"""
Inventario: movimientos e inventario físico.
"""

import logging
from datetime import date, datetime, time, timezone
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import require_roles
from database import get_db
from services import stock

from .inventario_movimientos_schemas import (
    InventarioFisicoRequest,
    MovimientoRequest,
)
from .inventario_shared import (
    ROLES_LECTURA,
    ROLES_MOVIMIENTOS,
    _fetch_usuario,
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
    Registra movimiento y actualiza stock en la misma transacción (services/stock.py).
    """
    try:
        async with get_db() as conn:
            urow = await _fetch_usuario(conn, current_user["sub"])
            if not urow or not urow["tenant_id"]:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            tenant_id = UUID(str(urow["tenant_id"]))
            comun = {
                "tenant_id": tenant_id,
                "outlet_id": await stock.outlet_operativo(conn, tenant_id, urow["outlet_id"]),
                "usuario_id": UUID(current_user["sub"]),
                "articulo_id": UUID(body.articulo_id),
                "motivo": body.motivo,
            }

            if body.tipo == "entrada":
                res = await stock.registrar_entrada(
                    conn,
                    **comun,
                    cantidad=body.cantidad,
                    coste_unitario=body.coste_unitario,
                    fecha_caducidad=body.fecha_caducidad,
                    numero_lote=body.numero_lote,
                )
            elif body.tipo in stock.TIPOS_SALIDA:
                res = await stock.registrar_salida(
                    conn, **comun, cantidad=body.cantidad, tipo=body.tipo
                )
            else:
                res = await stock.registrar_ajuste(
                    conn,
                    **comun,
                    cantidad_real=body.cantidad,
                    coste_unitario=body.coste_unitario,
                )

        logger.info(
            "Movimiento stock %s artículo=%s tipo=%s delta=%s",
            res.movimiento_id,
            res.articulo_id,
            res.tipo,
            res.delta,
        )

        return {
            "movimiento_id": str(res.movimiento_id) if res.movimiento_id else None,
            "articulo_id": str(res.articulo_id),
            "nombre_articulo": res.nombre,
            "stock_anterior": _serialize_stock_qty(res.stock_anterior),
            "stock_nuevo": _serialize_stock_qty(res.stock_nuevo),
            "tipo": res.tipo,
            "cantidad": _serialize_stock_qty(res.cantidad),
            "delta": _serialize_stock_qty(res.delta),
            "coste_unitario": _serialize_coste_json(res.coste_unitario),
            "lotes_afectados": res.lotes_afectados,
        }
    except HTTPException:
        raise
    except stock.StockError as e:
        raise stock.a_http(e)
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
                "SELECT m.id, m.articulo_id, m.tipo, m.cantidad, m.delta, m.coste_unitario, "
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
                "delta": _serialize_stock_qty(r["delta"]) if r["delta"] is not None else None,
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
            outlet_id = await stock.outlet_operativo(conn, tenant_id, urow["outlet_id"])

            actualizados: list[dict] = []

            for item in body.articulos:
                aid = UUID(item.articulo_id)
                try:
                    res = await stock.registrar_ajuste(
                        conn,
                        tenant_id=tenant_id,
                        outlet_id=outlet_id,
                        usuario_id=usuario_id,
                        articulo_id=aid,
                        cantidad_real=item.cantidad_real,
                        motivo="inventario_fisico",
                    )
                except stock.ArticuloNoEncontrado:
                    raise HTTPException(
                        status_code=404,
                        detail="Artículo no encontrado: " + str(item.articulo_id),
                    )

                actualizados.append(
                    {
                        "articulo_id": str(aid),
                        "nombre": res.nombre,
                        "stock_anterior": _serialize_stock_qty(res.stock_anterior),
                        "stock_nuevo": _serialize_stock_qty(res.stock_nuevo),
                        "diferencia": _serialize_stock_qty(res.delta),
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
    except stock.StockError as e:
        raise stock.a_http(e)
    except Exception as e:
        logger.error("Error en inventario_fisico: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
