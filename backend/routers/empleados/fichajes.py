"""
Router RRHH: fichajes (entrada/salida) e historial de turnos.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from auth.dependencies import require_roles
from database import get_db

from .empleados_shared import (
    ROLES_EMPLEADO,
    ROLES_JEFE,
    ROLES_RRHH,
    _ensure_empleado_tenant,
    _tenant_id,
    _uid,
    _usuario_tenant_outlet,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["EmpleadosRRHH"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

r_turnos = APIRouter(prefix="/turnos")

ROLES_LISTADO_OPERATIVO = [
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "barra",
    "almacen",
]


# --- Turnos / fichajes ---
class FichajeBody(BaseModel):
    empleado_id: str


@r_turnos.post("/fichaje-entrada")
async def fichaje_entrada(
    body: FichajeBody,
    current_user: dict = Depends(require_roles(ROLES_EMPLEADO)),
):
    tenant_id = _tenant_id(current_user)
    user_uuid = _uid(current_user)
    emp_id = UUID(body.empleado_id)
    try:
        async with get_db() as conn:
            _, outlet_id = await _usuario_tenant_outlet(conn, user_uuid)
            if not outlet_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuario sin outlet asignado",
                )
            await _ensure_empleado_tenant(conn, emp_id, tenant_id)

            open_t = await conn.fetchrow(
                """
                SELECT id FROM turnos
                WHERE empleado_id = $1
                  AND fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date
                  AND hora_entrada IS NOT NULL
                  AND hora_salida IS NULL
                """,
                emp_id,
            )
            if open_t:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya hay un fichaje de entrada activo",
                )

            row = await conn.fetchrow(
                """
                INSERT INTO turnos (
                    empleado_id, outlet_id, fecha, hora_entrada, tipo
                )
                VALUES (
                    $1, $2,
                    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date,
                    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::time,
                    'normal'
                )
                RETURNING id, empleado_id, hora_entrada, fecha
                """,
                emp_id,
                outlet_id,
            )
            he = row["hora_entrada"]
            return {
                "turno_id": str(row["id"]),
                "empleado_id": str(row["empleado_id"]),
                "hora_entrada": he.isoformat() if hasattr(he, "isoformat") else str(he),
                "fecha": row["fecha"].isoformat(),
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("fichaje_entrada: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


def _jornada_diaria_esperada(jornada_semanal: Any) -> Decimal:
    if jornada_semanal is None:
        return Decimal("8")
    j = Decimal(str(jornada_semanal))
    if j <= Decimal("0"):
        return Decimal("8")
    return (j / Decimal("5")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@r_turnos.post("/fichaje-salida")
async def fichaje_salida(
    body: FichajeBody,
    current_user: dict = Depends(require_roles(ROLES_EMPLEADO)),
):
    tenant_id = _tenant_id(current_user)
    emp_id = UUID(body.empleado_id)
    tz_mad = ZoneInfo("Europe/Madrid")
    try:
        async with get_db() as conn:
            await _ensure_empleado_tenant(conn, emp_id, tenant_id)

            row = await conn.fetchrow(
                """
                SELECT t.id, t.hora_entrada, t.fecha, e.jornada_horas
                FROM turnos t
                JOIN empleados e ON e.id = t.empleado_id
                WHERE t.empleado_id = $1
                  AND t.fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date
                  AND t.hora_entrada IS NOT NULL
                  AND t.hora_salida IS NULL
                FOR UPDATE OF t
                """,
                emp_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No hay fichaje de entrada activo",
                )

            jornada_dia = _jornada_diaria_esperada(row["jornada_horas"])
            now_local = datetime.now(tz_mad)
            salida_time: time = now_local.time()
            fecha_d: date = row["fecha"]
            entrada_t = row["hora_entrada"]

            e_dt = datetime.combine(fecha_d, entrada_t, tzinfo=tz_mad)
            s_dt = datetime.combine(fecha_d, salida_time, tzinfo=tz_mad)
            if s_dt <= e_dt:
                s_dt += timedelta(days=1)

            horas_trabajadas = (
                Decimal(str((s_dt - e_dt).total_seconds() / 3600.0))
                .quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            )
            horas_extra = (
                (horas_trabajadas - jornada_dia)
                if horas_trabajadas > jornada_dia
                else Decimal("0")
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            updated = await conn.fetchrow(
                """
                UPDATE turnos SET
                    hora_salida = $2,
                    horas_trabajadas = $3,
                    horas_extra = $4
                WHERE id = $1
                RETURNING id, hora_entrada, hora_salida, horas_trabajadas, horas_extra
                """,
                row["id"],
                salida_time,
                horas_trabajadas,
                horas_extra,
            )

            he = updated["hora_entrada"]
            hs = updated["hora_salida"]
            return {
                "turno_id": str(updated["id"]),
                "hora_entrada": he.isoformat()
                if hasattr(he, "isoformat")
                else str(he),
                "hora_salida": hs.isoformat()
                if hasattr(hs, "isoformat")
                else str(hs),
                "horas_trabajadas": float(updated["horas_trabajadas"]),
                "horas_extra": float(updated["horas_extra"]),
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("fichaje_salida: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


def _serialize_turno_row(r: Any) -> dict:
    fe = r["fecha"]
    he = r["hora_entrada"]
    hs = r["hora_salida"]
    return {
        "id": str(r["id"]),
        "empleado_id": str(r["empleado_id"]),
        "nombre_empleado": r.get("nombre_empleado"),
        "outlet_id": str(r["outlet_id"]) if r.get("outlet_id") else None,
        "fecha": fe.isoformat() if fe else None,
        "hora_entrada": he.isoformat() if he and hasattr(he, "isoformat") else None,
        "hora_salida": hs.isoformat() if hs and hasattr(hs, "isoformat") else None,
        "horas_trabajadas": float(r["horas_trabajadas"])
        if r.get("horas_trabajadas") is not None
        else None,
        "horas_extra": float(r["horas_extra"])
        if r.get("horas_extra") is not None
        else None,
        "tipo": r.get("tipo"),
    }


@r_turnos.get("/horas-extra/{empleado_id}")
async def turnos_horas_extra(
    empleado_id: UUID,
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2000, le=2100),
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            await _ensure_empleado_tenant(conn, empleado_id, tenant_id)
            rows = await conn.fetch(
                """
                SELECT
                    t.id,
                    t.fecha,
                    t.horas_extra,
                    t.hora_entrada,
                    t.hora_salida,
                    COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                FROM turnos t
                JOIN empleados e ON e.id = t.empleado_id AND e.tenant_id = $4
                LEFT JOIN usuarios u ON u.id = e.usuario_id
                WHERE t.empleado_id = $1
                  AND EXTRACT(MONTH FROM t.fecha)::int = $2
                  AND EXTRACT(YEAR FROM t.fecha)::int = $3
                ORDER BY t.fecha DESC
                """,
                empleado_id,
                mes,
                anio,
                tenant_id,
            )
            total = Decimal("0")
            turnos_out: list[dict] = []
            for r in rows:
                hx = r["horas_extra"]
                if hx is not None:
                    total += Decimal(str(hx))
                turnos_out.append(
                    {
                        "id": str(r["id"]),
                        "fecha": r["fecha"].isoformat(),
                        "horas_extra": float(r["horas_extra"])
                        if r["horas_extra"] is not None
                        else 0.0,
                    }
                )
            return {
                "empleado_id": str(empleado_id),
                "mes": mes,
                "anio": anio,
                "total_horas_extra": float(
                    total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                ),
                "turnos": turnos_out,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("turnos_horas_extra: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@r_turnos.get("", include_in_schema=False)
@r_turnos.get("/")
async def list_turnos(
    empleado_id: Optional[str] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    fecha: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_LISTADO_OPERATIVO)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            cond = ["e.tenant_id = $1"]
            params: list[Any] = [tenant_id]
            n = 2
            if empleado_id:
                cond.append(f"t.empleado_id = ${n}")
                params.append(UUID(empleado_id))
                n += 1
            if desde:
                cond.append(f"t.fecha >= ${n}")
                params.append(desde)
                n += 1
            if hasta:
                cond.append(f"t.fecha <= ${n}")
                params.append(hasta)
                n += 1
            if fecha:
                cond.append(f"t.fecha = ${n}")
                params.append(fecha)
                n += 1
            w = " AND ".join(cond)
            rows = await conn.fetch(
                f"""
                SELECT
                    t.id,
                    t.empleado_id,
                    t.outlet_id,
                    t.fecha,
                    t.hora_entrada,
                    t.hora_salida,
                    t.horas_trabajadas,
                    t.horas_extra,
                    t.tipo,
                    COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                FROM turnos t
                JOIN empleados e ON e.id = t.empleado_id
                LEFT JOIN usuarios u ON u.id = e.usuario_id
                WHERE {w}
                ORDER BY t.fecha DESC, t.hora_entrada DESC NULLS LAST
                """,
                *params,
            )
            return [_serialize_turno_row(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_turnos: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


router.include_router(r_turnos)
