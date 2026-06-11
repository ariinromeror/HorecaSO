"""
Analytics — predicción de mermas (ML baseline).

Serie histórica: `movimientos_stock` con tipo='merma' agregada por día.
El modelo vive en `services/ml_predicciones.py`; este router solo
prepara los datos y serializa la respuesta.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db
from services.ml_predicciones import forecast_serie_diaria

from .analytics_shared import _d, _outlet_id_usuario, _tenant_id_usuario, _uid

logger = logging.getLogger(__name__)

ROLES_PREDICCIONES = ["admin", "director", "almacen"]

router = APIRouter(
    prefix="/dashboard",
    tags=["Analytics"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


def _f2(v: Decimal) -> float:
    return float(v.quantize(Decimal("0.01"), ROUND_HALF_UP))


@router.get("/prediccion-mermas")
async def get_prediccion_mermas(
    articulo_id: Optional[UUID] = Query(None),
    dias_historial: int = Query(60, ge=14, le=365),
    dias_horizonte: int = Query(7, ge=1, le=30),
    current_user: dict = Depends(require_roles(ROLES_PREDICCIONES)),
):
    """
    Predicción de mermas (coste €/día) para los próximos `dias_horizonte` días.

    Sin `articulo_id`: agregado del outlet. Con `articulo_id`: serie de ese
    artículo (verificando que pertenece al tenant).
    """
    user_uuid = _uid(current_user)
    desde = date.today() - timedelta(days=dias_historial)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            outlet_id = await _outlet_id_usuario(conn, user_uuid)

            conds = [
                "ms.tipo = 'merma'",
                "ms.outlet_id = $1",
                "a.tenant_id = $2",
                "ms.created_at >= $3",
            ]
            params: list = [outlet_id, tenant_id, desde]
            if articulo_id is not None:
                propio = await conn.fetchrow(
                    "SELECT id FROM articulos WHERE id = $1 AND tenant_id = $2",
                    articulo_id,
                    tenant_id,
                )
                if not propio:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Artículo no encontrado",
                    )
                params.append(articulo_id)
                conds.append("ms.articulo_id = $" + str(len(params)))

            where_sql = " AND ".join(conds)

            rows = await conn.fetch(
                """
                SELECT
                    ms.created_at::date AS fecha,
                    COALESCE(SUM(ms.cantidad * COALESCE(ms.coste_unitario, a.coste_unitario, 0)), 0) AS coste_dia
                FROM movimientos_stock ms
                JOIN articulos a ON a.id = ms.articulo_id
                WHERE """
                + where_sql
                + """
                GROUP BY ms.created_at::date
                ORDER BY fecha
                """,
                *params,
            )

            top_rows = []
            if articulo_id is None:
                top_rows = await conn.fetch(
                    """
                    SELECT
                        a.id, a.nombre,
                        COALESCE(SUM(ms.cantidad), 0) AS cantidad_total,
                        COALESCE(SUM(ms.cantidad * COALESCE(ms.coste_unitario, a.coste_unitario, 0)), 0) AS coste_total
                    FROM movimientos_stock ms
                    JOIN articulos a ON a.id = ms.articulo_id
                    WHERE ms.tipo = 'merma'
                      AND ms.outlet_id = $1
                      AND a.tenant_id = $2
                      AND ms.created_at >= $3
                    GROUP BY a.id, a.nombre
                    ORDER BY coste_total DESC
                    LIMIT 5
                    """,
                    outlet_id,
                    tenant_id,
                    desde,
                )

        historial = [(r["fecha"], _d(r["coste_dia"])) for r in rows]
        resultado = forecast_serie_diaria(historial, dias_horizonte)

        return {
            "modelo": resultado["modelo"],
            "dias_historial_usados": resultado["dias_historial"],
            "media_diaria_historica": _f2(resultado["media_diaria_historica"]),
            "tendencia_diaria": _f2(resultado["tendencia_diaria"]),
            "coste_total_previsto": _f2(resultado["total_previsto"]),
            "predicciones": [
                {
                    "fecha": p["fecha"].isoformat(),
                    "coste_previsto": _f2(p["valor_previsto"]),
                }
                for p in resultado["predicciones"]
            ],
            "top_articulos_merma": [
                {
                    "articulo_id": str(r["id"]),
                    "nombre": r["nombre"],
                    "cantidad_total": float(_d(r["cantidad_total"]).quantize(Decimal("0.0001"), ROUND_HALF_UP)),
                    "coste_total": _f2(_d(r["coste_total"])),
                }
                for r in top_rows
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_prediccion_mermas: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
