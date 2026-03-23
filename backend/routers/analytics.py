"""
Analytics avanzado — rentabilidad mesas, ingeniería de menú (BCG), coste personal.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

ROLES_ANALYTICS = ["admin", "director"]

router = APIRouter(
    prefix="/dashboard",
    tags=["Analytics"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


def _uid(current_user: dict) -> UUID:
    s = current_user.get("user_id") or current_user.get("sub")
    if not s:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    return UUID(str(s))


async def _tenant_id_usuario(conn, user_id: UUID) -> UUID:
    row = await conn.fetchrow(
        "SELECT tenant_id FROM usuarios WHERE id = $1",
        user_id,
    )
    if not row or not row["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario sin tenant asignado",
        )
    return row["tenant_id"]


async def _outlet_id_usuario(conn, user_id: UUID) -> UUID:
    row = await conn.fetchrow(
        "SELECT outlet_id FROM usuarios WHERE id = $1",
        user_id,
    )
    if not row or not row["outlet_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario sin outlet asignado",
        )
    return row["outlet_id"]


def _d(v: Any) -> Decimal:
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


def _median_decimal(values: list[Decimal]) -> Decimal:
    if not values:
        return Decimal("0")
    s = sorted(values)
    n = len(s)
    mid = n // 2
    if n % 2 == 1:
        return s[mid]
    return (s[mid - 1] + s[mid]) / Decimal("2")


def _resolve_rango_fechas(
    desde: Optional[date],
    hasta: Optional[date],
) -> tuple[date, date]:
    h = hasta or date.today()
    d = desde or (h - timedelta(days=29))
    if d > h:
        d, h = h, d
    return d, h


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


@router.get("/coste-personal")
async def get_coste_personal(
    mes: Optional[int] = Query(None, ge=1, le=12),
    anio: Optional[int] = Query(None, ge=2000, le=2100),
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
