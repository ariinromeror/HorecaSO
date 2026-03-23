"""
Analytics — coste de personal.
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db

from routers.analytics_shared import (
    ROLES_ANALYTICS,
    _d,
    _outlet_id_usuario,
    _tenant_id_usuario,
    _uid,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/dashboard",
    tags=["Analytics"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


@router.get("/coste-personal")
async def get_coste_personal(
    mes: int | None = Query(None, ge=1, le=12),
    anio: int | None = Query(None, ge=2000, le=2100),
    current_user: dict = Depends(require_roles(ROLES_ANALYTICS)),
):
    user_uuid = _uid(current_user)
    today = date.today()
    m = mes if mes is not None else today.month
    y = anio if anio is not None else today.year
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)

            nom = await conn.fetchrow(
                """
                SELECT
                    COALESCE(SUM(n.total_devengos), 0) AS total_salarios,
                    COALESCE(SUM(n.coste_total_empresa), 0) AS coste_total,
                    COUNT(*)::bigint AS num_empleados
                FROM nominas n
                JOIN empleados e ON n.empleado_id = e.id
                WHERE e.tenant_id = $1
                  AND n.mes = $2
                  AND n.anio = $3
                """,
                tenant_id,
                m,
                y,
            )

            ing = await conn.fetchrow(
                """
                SELECT COALESCE(SUM(t.total), 0) AS ingresos_periodo
                FROM tickets t
                WHERE t.outlet_id = $1
                  AND t.estado = 'cobrado'
                  AND EXTRACT(MONTH FROM t.cobrado_at)::int = $2
                  AND EXTRACT(YEAR FROM t.cobrado_at)::int = $3
                """,
                outlet_id,
                m,
                y,
            )

        total_salarios = _d(nom["total_salarios"]).quantize(Decimal("0.01"), ROUND_HALF_UP)
        coste_total_empresa = _d(nom["coste_total"]).quantize(Decimal("0.01"), ROUND_HALF_UP)
        num_empleados = int(nom["num_empleados"] or 0)
        ingresos_periodo = _d(ing["ingresos_periodo"]).quantize(Decimal("0.01"), ROUND_HALF_UP)

        if ingresos_periodo > 0:
            ratio = (coste_total_empresa / ingresos_periodo * Decimal("100")).quantize(
                Decimal("0.01"), ROUND_HALF_UP
            )
        else:
            ratio = Decimal("0")

        benchmark_ok = ratio < Decimal("35")

        return {
            "mes": m,
            "anio": y,
            "total_salarios": float(total_salarios),
            "coste_total_empresa": float(coste_total_empresa),
            "num_empleados": num_empleados,
            "ingresos_periodo": float(ingresos_periodo),
            "ratio_personal_porcentaje": float(ratio),
            "benchmark_ok": benchmark_ok,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_coste_personal: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
