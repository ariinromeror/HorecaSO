"""Reporte PDF cuadrante semanal."""
from __future__ import annotations

import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import require_roles
from database import get_db
from .reportes_dif_shared import (
    _DIAS_KEYS,
    _fmt_hora,
    _outlet_id,
    _pdf_resp,
    _tenant_id,
    _uid,
)
from services.pdf_diferenciales import pdf_cuadrante

logger = logging.getLogger(__name__)


def register_reportes_dif_personal(router: APIRouter) -> None:
    @router.get("/cuadrante/{semana}")
    async def reporte_cuadrante(
        semana: str,
        current_user: dict = Depends(
            require_roles(["admin", "director", "jefe_sala"])
        ),
    ):
        uid = _uid(current_user)
        tenant_id = _tenant_id(current_user)
        try:
            d0 = date.fromisoformat(semana)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Fecha inválida (YYYY-MM-DD)"
            )
        lunes = d0 - timedelta(days=d0.weekday())
        domingo = lunes + timedelta(days=6)
        label = f"{lunes.isoformat()} — {domingo.isoformat()}"
        try:
            async with get_db() as conn:
                oid = await _outlet_id(conn, uid)
                rows = await conn.fetch(
                    """
                    SELECT t.fecha, t.hora_entrada, t.hora_salida,
                        COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                    FROM turnos t
                    JOIN empleados e ON t.empleado_id = e.id AND e.tenant_id = $2
                    LEFT JOIN usuarios u ON u.id = e.usuario_id
                    WHERE t.outlet_id = $1
                      AND t.fecha >= $3 AND t.fecha <= $4
                    ORDER BY nombre_empleado, t.fecha
                    """,
                    oid,
                    tenant_id,
                    lunes,
                    domingo,
                )
                trow = await conn.fetchrow(
                    "SELECT nombre, nif FROM tenants WHERE id = $1",
                    tenant_id,
                )
            cuad: dict[str, dict[str, str]] = {}
            for r in rows:
                name = r["nombre_empleado"] or "—"
                fd = r["fecha"]
                day_key = _DIAS_KEYS[fd.weekday()]
                he = _fmt_hora(r["hora_entrada"])
                hs = _fmt_hora(r["hora_salida"])
                slot = f"{he}-{hs}" if he and hs else (he or hs or "—")
                cuad.setdefault(name, {})
                prev = cuad[name].get(day_key)
                if prev and prev != "—":
                    cuad[name][day_key] = f"{prev} / {slot}"
                else:
                    cuad[name][day_key] = slot
            tenant = {
                "nombre": (trow["nombre"] if trow else "") or "—",
                "nif": (trow["nif"] if trow else "") or "",
            }
            pdf_bytes = pdf_cuadrante(cuad, tenant, label)
            return _pdf_resp(pdf_bytes, f"cuadrante_{lunes.isoformat()}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_cuadrante: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")
