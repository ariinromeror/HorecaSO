"""
Analytics — ingeniería de menú (BCG).
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db

from .analytics_shared import (
    ROLES_ANALYTICS,
    _d,
    _median_decimal,
    _outlet_id_usuario,
    _resolve_rango_fechas,
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


def _clasificacion_bcg(
    unidades: Decimal,
    margen_pct: Decimal,
    med_u: Decimal,
    med_m: Decimal,
) -> str:
    hi_u = unidades >= med_u
    hi_m = margen_pct >= med_m
    if hi_u and hi_m:
        return "estrella"
    if hi_u and not hi_m:
        return "vaca"
    if not hi_u and hi_m:
        return "interrogante"
    return "perro"


@router.get("/ingenieria-menu")
async def get_ingenieria_menu(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_ANALYTICS)),
):
    user_uuid = _uid(current_user)
    d0, d1 = _resolve_rango_fechas(desde, hasta)
    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            tenant_id = await _tenant_id_usuario(conn, user_uuid)

            raw = await conn.fetch(
                """
                SELECT
                    p.id,
                    p.nombre,
                    p.precio,
                    COALESCE(p.precio_coste, 0) AS precio_coste,
                    COALESCE(SUM(tl.cantidad), 0) AS unidades_vendidas,
                    COALESCE(SUM(tl.subtotal), 0) AS ingreso_total,
                    COALESCE(
                        SUM(tl.cantidad * COALESCE(p.precio_coste, 0)),
                        0
                    ) AS coste_total
                FROM ticket_lineas tl
                JOIN tickets t ON tl.ticket_id = t.id
                JOIN productos p ON tl.producto_id = p.id
                WHERE t.outlet_id = $1
                  AND t.estado = 'cobrado'
                  AND DATE(t.cobrado_at) >= $2
                  AND DATE(t.cobrado_at) <= $3
                  AND p.tenant_id = $4
                GROUP BY p.id, p.nombre, p.precio, COALESCE(p.precio_coste, 0)
                """,
                outlet_id,
                d0,
                d1,
                tenant_id,
            )

        filas: list[dict[str, Any]] = []
        unidades_list: list[Decimal] = []
        margen_pct_list: list[Decimal] = []

        for r in raw:
            ing = _d(r["ingreso_total"])
            coste = _d(r["coste_total"])
            margen_total = (ing - coste).quantize(Decimal("0.01"), ROUND_HALF_UP)
            if ing > 0:
                margen_pct = (margen_total / ing * Decimal("100")).quantize(
                    Decimal("0.01"), ROUND_HALF_UP
                )
            else:
                margen_pct = Decimal("0")
            u = _d(r["unidades_vendidas"])
            unidades_list.append(u)
            margen_pct_list.append(margen_pct)
            filas.append(
                {
                    "id": r["id"],
                    "nombre": r["nombre"],
                    "precio": r["precio"],
                    "precio_coste": r["precio_coste"],
                    "unidades_vendidas": u,
                    "ingreso_total": ing,
                    "coste_total": coste,
                    "margen_total": margen_total,
                    "margen_porcentaje": margen_pct,
                }
            )

        med_u = _median_decimal(unidades_list)
        med_m = _median_decimal(margen_pct_list)

        productos_out: list[dict[str, Any]] = []
        resumen_clase: dict[str, dict[str, Any]] = {
            "estrella": {"count": 0, "ingreso_total": Decimal("0")},
            "vaca": {"count": 0, "ingreso_total": Decimal("0")},
            "interrogante": {"count": 0, "ingreso_total": Decimal("0")},
            "perro": {"count": 0, "ingreso_total": Decimal("0")},
        }

        for row in filas:
            cls = _clasificacion_bcg(
                row["unidades_vendidas"],
                row["margen_porcentaje"],
                med_u,
                med_m,
            )
            resumen_clase[cls]["count"] += 1
            resumen_clase[cls]["ingreso_total"] += row["ingreso_total"]

            productos_out.append(
                {
                    "producto_id": str(row["id"]),
                    "nombre": row["nombre"],
                    "precio": float(
                        _d(row.get("precio")).quantize(Decimal("0.01"), ROUND_HALF_UP)
                    ),
                    "precio_coste": float(
                        _d(row.get("precio_coste")).quantize(Decimal("0.01"), ROUND_HALF_UP)
                    ),
                    "unidades_vendidas": float(row["unidades_vendidas"]),
                    "ingreso_total": float(row["ingreso_total"].quantize(Decimal("0.01"), ROUND_HALF_UP)),
                    "coste_total": float(row["coste_total"].quantize(Decimal("0.01"), ROUND_HALF_UP)),
                    "margen_total": float(row["margen_total"]),
                    "margen_porcentaje": float(row["margen_porcentaje"]),
                    "clasificacion": cls,
                }
            )

        resumen_por_clasificacion = {
            k: {
                "count": v["count"],
                "ingreso_total": float(
                    v["ingreso_total"].quantize(Decimal("0.01"), ROUND_HALF_UP)
                ),
            }
            for k, v in resumen_clase.items()
        }

        return {
            "desde": d0.isoformat(),
            "hasta": d1.isoformat(),
            "mediana_unidades_vendidas": float(med_u.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "mediana_margen_porcentaje": float(med_m),
            "productos": productos_out,
            "resumen_por_clasificacion": resumen_por_clasificacion,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_ingenieria_menu: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
