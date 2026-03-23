"""Reporte PDF ventas periodo."""
from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import require_roles
from database import get_db
from routers.reportes_dif_shared import (
    logger,
    _outlet_id,
    _pdf_resp,
    _tenant_id,
    _uid,
)
from services.pdf_reportes import pdf_ventas_periodo


def register_reportes_dif_ventas(router: APIRouter) -> None:
    @router.get("/ventas")
    async def reporte_ventas(
        desde: str = Query(...),
        hasta: str = Query(...),
        current_user: dict = Depends(require_roles(["admin", "director"])),
    ):
        uid = _uid(current_user)
        tenant_id = _tenant_id(current_user)
        try:
            d0 = date.fromisoformat(desde)
            d1 = date.fromisoformat(hasta)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Fechas inválidas (YYYY-MM-DD)"
            )
        if d0 > d1:
            d0, d1 = d1, d0
        try:
            async with get_db() as conn:
                oid = await _outlet_id(conn, uid)
                rows = await conn.fetch(
                    """
                    SELECT (cobrado_at::date) AS fecha,
                        COUNT(*)::bigint AS tickets,
                        SUM(total) AS ventas,
                        SUM(COALESCE(total_iva, 0)) AS iva
                    FROM tickets
                    WHERE outlet_id = $1
                      AND cobrado_at IS NOT NULL
                      AND cobrado_at::date BETWEEN $2 AND $3
                      AND estado = 'cobrado'
                    GROUP BY (cobrado_at::date)
                    ORDER BY fecha
                    """,
                    oid,
                    d0,
                    d1,
                )
                trow = await conn.fetchrow(
                    "SELECT nombre, nif FROM tenants WHERE id = $1",
                    tenant_id,
                )
            total_v = Decimal("0")
            total_tickets = 0
            mejor_dia = None
            mejor_val = Decimal("-1")
            filas = []
            for r in rows:
                v = Decimal(str(r["ventas"] or 0))
                nt = int(r["tickets"] or 0)
                total_v += v
                total_tickets += nt
                fd = r["fecha"]
                if v > mejor_val:
                    mejor_val = v
                    mejor_dia = (
                        fd.isoformat()
                        if hasattr(fd, "isoformat")
                        else str(fd)
                    )
                fs = fd.isoformat() if hasattr(fd, "isoformat") else str(fd)
                filas.append(
                    {
                        "fecha": fs,
                        "tickets": nt,
                        "ventas": r["ventas"],
                        "iva": r["iva"],
                    }
                )
            ticket_medio = (
                (total_v / Decimal(total_tickets)).quantize(
                    Decimal("0.01"), ROUND_HALF_UP
                )
                if total_tickets
                else Decimal("0")
            )
            resumen = {
                "total": total_v,
                "ticket_medio": ticket_medio,
                "mejor_dia": mejor_dia,
            }
            tenant = {
                "nombre": (trow["nombre"] if trow else "") or "—",
                "nif": (trow["nif"] if trow else "") or "",
            }
            pdf_bytes = pdf_ventas_periodo(
                filas, resumen, tenant, desde, hasta
            )
            return _pdf_resp(pdf_bytes, "ventas_periodo")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_ventas: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")
