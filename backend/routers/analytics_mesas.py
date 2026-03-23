"""
Analytics — rentabilidad por mesa.
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db

from routers.analytics_shared import (
    ROLES_ANALYTICS,
    _d,
    _outlet_id_usuario,
    _resolve_rango_fechas,
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


@router.get("/rentabilidad-mesas")
async def get_rentabilidad_mesas(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    zona: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_ANALYTICS)),
):
    user_uuid = _uid(current_user)
    d0, d1 = _resolve_rango_fechas(desde, hasta)
    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            conds = [
                "rm.outlet_id = $1",
                "rm.fecha >= $2",
                "rm.fecha <= $3",
            ]
            params: list[Any] = [outlet_id, d0, d1]
            n = 4
            if zona is not None and str(zona).strip():
                conds.append("m.zona = $" + str(n))
                params.append(str(zona).strip())
                n += 1
            where_sql = " AND ".join(conds)

            rows = await conn.fetch(
                """
                SELECT
                    rm.mesa_id,
                    m.numero AS mesa_numero,
                    m.zona,
                    COALESCE(SUM(rm.ingreso_total), 0) AS total_ingresos,
                    COUNT(*)::bigint AS total_visitas,
                    AVG(rm.ingreso_por_hora) AS ingreso_medio_hora,
                    AVG(rm.ingreso_por_comensal) AS ingreso_medio_comensal,
                    AVG(rm.tiempo_ocupacion_minutos) AS tiempo_medio_ocupacion
                FROM rentabilidad_mesas rm
                JOIN mesas m ON m.id = rm.mesa_id
                WHERE """
                + where_sql
                + """
                GROUP BY rm.mesa_id, m.numero, m.zona
                ORDER BY AVG(rm.ingreso_por_hora) DESC NULLS LAST
                """,
                *params,
            )

            glob = await conn.fetchrow(
                """
                SELECT
                    COALESCE(SUM(rm.ingreso_total), 0) AS total_ingresos,
                    COUNT(*)::bigint AS total_visitas,
                    AVG(rm.ingreso_por_hora) AS ingreso_medio_hora,
                    AVG(rm.ingreso_por_comensal) AS ingreso_medio_comensal,
                    AVG(rm.tiempo_ocupacion_minutos) AS tiempo_medio_ocupacion
                FROM rentabilidad_mesas rm
                JOIN mesas m ON m.id = rm.mesa_id
                WHERE """
                + where_sql
                + """
                """,
                *params,
            )

        mesas_out = []
        for r in rows:
            mesas_out.append(
                {
                    "mesa_id": str(r["mesa_id"]),
                    "mesa_numero": r["mesa_numero"],
                    "zona": r["zona"],
                    "total_ingresos": float(_d(r["total_ingresos"]).quantize(Decimal("0.01"), ROUND_HALF_UP)),
                    "total_visitas": int(r["total_visitas"] or 0),
                    "ingreso_medio_hora": float(_d(r["ingreso_medio_hora"]).quantize(Decimal("0.01"), ROUND_HALF_UP)),
                    "ingreso_medio_comensal": float(
                        _d(r["ingreso_medio_comensal"]).quantize(Decimal("0.01"), ROUND_HALF_UP)
                    ),
                    "tiempo_medio_ocupacion_minutos": float(
                        _d(r["tiempo_medio_ocupacion"]).quantize(Decimal("0.01"), ROUND_HALF_UP)
                    ),
                }
            )

        resumen = {
            "desde": d0.isoformat(),
            "hasta": d1.isoformat(),
            "total_ingresos": float(_d(glob["total_ingresos"]).quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "total_visitas": int(glob["total_visitas"] or 0),
            "ingreso_medio_hora": float(_d(glob["ingreso_medio_hora"]).quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "ingreso_medio_comensal": float(
                _d(glob["ingreso_medio_comensal"]).quantize(Decimal("0.01"), ROUND_HALF_UP)
            ),
            "tiempo_medio_ocupacion_minutos": float(
                _d(glob["tiempo_medio_ocupacion"]).quantize(Decimal("0.01"), ROUND_HALF_UP)
            ),
        }

        return {"mesas": mesas_out, "resumen_outlet": resumen}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_rentabilidad_mesas: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
