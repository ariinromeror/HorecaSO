"""Reporte PDF/JSON rentabilidad platos / BCG."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import require_roles
from database import get_db
from .reportes_dif_shared import (
    _pdf_resp,
    _tenant_id,
)
from services.pdf_diferenciales_bcg import pdf_rentabilidad_platos

logger = logging.getLogger(__name__)


def _serialize_platos(filas: list) -> list:
    out = []
    for x in filas:
        out.append(
            {
                "nombre": x.get("nombre"),
                "categoria": x.get("categoria"),
                "precio": float(x["precio"] or 0),
                "coste_calculado": float(x["coste_calculado"] or 0)
                if x.get("coste_calculado") is not None
                else None,
                "margen_porcentaje": float(x["margen_porcentaje"] or 0)
                if x.get("margen_porcentaje") is not None
                else None,
                "ventas_mes": int(x.get("ventas_mes") or 0),
            }
        )
    return out


def register_reportes_dif_carta(router: APIRouter) -> None:
    @router.get("/rentabilidad-platos/datos")
    async def reporte_rentabilidad_platos_datos(
        current_user: dict = Depends(require_roles(["admin", "director"])),
    ):
        tenant_id = _tenant_id(current_user)
        try:
            async with get_db() as conn:
                rows = await conn.fetch(
                    """
                    SELECT p.nombre, c.nombre AS categoria, p.precio,
                        r.coste_calculado, r.margen_porcentaje,
                        COALESCE(SUM(tl.cantidad), 0)::bigint AS ventas_mes
                    FROM productos p
                    JOIN recetas r ON p.id = r.producto_id
                    JOIN categorias_menu c ON p.categoria_id = c.id
                    LEFT JOIN ticket_lineas tl ON p.id = tl.producto_id
                    LEFT JOIN tickets t ON tl.ticket_id = t.id
                        AND t.cobrado_at >= NOW() - INTERVAL '30 days'
                        AND t.estado = 'cobrado'
                    WHERE p.tenant_id = $1
                    GROUP BY p.id, c.nombre, p.nombre, p.precio,
                        r.coste_calculado, r.margen_porcentaje
                    ORDER BY p.nombre
                    """,
                    tenant_id,
                )
            filas = _serialize_platos([dict(x) for x in rows])
            return {"filas": filas, "periodo": "últimos 30 días"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_rentabilidad_platos_datos: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")

    @router.get("/rentabilidad-platos")
    async def reporte_rentabilidad_platos(
        current_user: dict = Depends(require_roles(["admin", "director"])),
    ):
        tenant_id = _tenant_id(current_user)
        try:
            async with get_db() as conn:
                rows = await conn.fetch(
                    """
                    SELECT p.nombre, c.nombre AS categoria, p.precio,
                        r.coste_calculado, r.margen_porcentaje,
                        COALESCE(SUM(tl.cantidad), 0)::bigint AS ventas_mes
                    FROM productos p
                    JOIN recetas r ON p.id = r.producto_id
                    JOIN categorias_menu c ON p.categoria_id = c.id
                    LEFT JOIN ticket_lineas tl ON p.id = tl.producto_id
                    LEFT JOIN tickets t ON tl.ticket_id = t.id
                        AND t.cobrado_at >= NOW() - INTERVAL '30 days'
                        AND t.estado = 'cobrado'
                    WHERE p.tenant_id = $1
                    GROUP BY p.id, c.nombre, p.nombre, p.precio,
                        r.coste_calculado, r.margen_porcentaje
                    ORDER BY p.nombre
                    """,
                    tenant_id,
                )
                trow = await conn.fetchrow(
                    "SELECT nombre, nif FROM tenants WHERE id = $1",
                    tenant_id,
                )
            filas = [dict(x) for x in rows]
            tenant = {
                "nombre": (trow["nombre"] if trow else "") or "—",
                "nif": (trow["nif"] if trow else "") or "",
            }
            pdf_bytes = pdf_rentabilidad_platos(filas, tenant)
            return _pdf_resp(pdf_bytes, "rentabilidad_platos")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_rentabilidad_platos: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")
