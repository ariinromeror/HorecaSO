"""Reporte PDF/JSON APPCC."""
from __future__ import annotations

import logging
from datetime import date, datetime

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


def _ser_val(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, date):
        return v.isoformat()
    if hasattr(v, "hex"):
        return str(v)
    try:
        from decimal import Decimal

        if isinstance(v, Decimal):
            return float(v)
    except Exception:
        pass
    return v


def register_reportes_dif_appcc(router: APIRouter) -> None:
    @router.get("/appcc/datos")
    async def reporte_appcc_datos(
        desde: str = Query(...),
        hasta: str = Query(...),
        current_user: dict = Depends(
            require_roles(["admin", "director", "almacen"])
        ),
    ):
        uid = _uid(current_user)
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
                tenant_id = _tenant_id(current_user)
                oid = await _outlet_id(conn, uid, tenant_id)
                rows = await conn.fetch(
                    """
                    SELECT ra.*, u.nombre AS responsable
                    FROM registros_appcc ra
                    JOIN outlets o ON o.id = ra.outlet_id AND o.tenant_id = $4
                    JOIN usuarios u ON ra.usuario_id = u.id
                    WHERE ra.outlet_id = $1
                      AND (ra.created_at AT TIME ZONE 'Europe/Madrid')::date BETWEEN $2 AND $3
                    ORDER BY ra.created_at
                    """,
                    oid,
                    d0,
                    d1,
                    tenant_id,
                )
            filas = []
            for r in rows:
                d = {k: _ser_val(v) for k, v in dict(r).items()}
                filas.append(d)
            return {
                "desde": d0.isoformat(),
                "hasta": d1.isoformat(),
                "filas": filas,
                "total": len(filas),
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_appcc_datos: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")

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
                oid = await _outlet_id(conn, uid, tenant_id)
                rows = await conn.fetch(
                    """
                    SELECT ra.*, u.nombre AS responsable
                    FROM registros_appcc ra
                    JOIN outlets o ON o.id = ra.outlet_id AND o.tenant_id = $4
                    JOIN usuarios u ON ra.usuario_id = u.id
                    WHERE ra.outlet_id = $1
                      AND (ra.created_at AT TIME ZONE 'Europe/Madrid')::date BETWEEN $2 AND $3
                    ORDER BY ra.created_at
                    """,
                    oid,
                    d0,
                    d1,
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
            pdf_bytes = pdf_appcc(
                filas, tenant, d0.isoformat(), d1.isoformat()
            )
            return _pdf_resp(pdf_bytes, "appcc")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_appcc: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")
