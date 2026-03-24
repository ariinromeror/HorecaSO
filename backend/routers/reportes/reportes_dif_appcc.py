"""Reporte PDF APPCC."""
from __future__ import annotations

import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import require_roles
from database import get_db
from .reportes_dif_shared import (
    _outlet_id,
    _pdf_resp,
    _tenant_id,
    _uid,
)
from services.pdf_diferenciales_2 import pdf_appcc

logger = logging.getLogger(__name__)


def register_reportes_dif_appcc(router: APIRouter) -> None:
    @router.get("/appcc")
    async def reporte_appcc(
        desde: str = Query(...),
        hasta: str = Query(...),
        current_user: dict = Depends(
            require_roles(["admin", "director", "almacen"])
        ),
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
                    SELECT ra.*, u.nombre AS responsable
                    FROM registros_appcc ra
                    JOIN usuarios u ON ra.usuario_id = u.id
                    WHERE ra.outlet_id = $1
                      AND ra.created_at::date BETWEEN $2 AND $3
                    ORDER BY ra.created_at
                    """,
                    oid,
                    d0,
                    d1,
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
            pdf_bytes = pdf_appcc(filas, tenant, desde, hasta)
            return _pdf_resp(pdf_bytes, "appcc")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_appcc: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")
