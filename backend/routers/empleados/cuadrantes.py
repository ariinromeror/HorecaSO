"""
Router RRHH: cuadrantes y asignaciones planificadas.
"""

from __future__ import annotations

import logging
from datetime import date, time
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from auth.dependencies import require_roles
from database import get_db

from .empleados_shared import (
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

r_cuadrantes = APIRouter(prefix="/cuadrantes")


class CuadranteAsignacionIn(BaseModel):
    empleado_id: str
    fecha: date
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    puesto: Optional[str] = None


class CreateCuadranteBody(BaseModel):
    semana_inicio: date
    semana_fin: date
    asignaciones: list[CuadranteAsignacionIn] = Field(default_factory=list)


def _parse_time_optional(s: Optional[str]) -> Any:
    if not s:
        return None
    parts = s.split(":")
    h, m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
    sec = int(parts[2]) if len(parts) > 2 else 0
    return time(h, m, sec)


@r_cuadrantes.get("", include_in_schema=False)
@r_cuadrantes.get("/")
async def get_cuadrantes(
    semana_inicio: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_JEFE)),
):
    tenant_id = _tenant_id(current_user)
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            _, outlet_id = await _usuario_tenant_outlet(conn, user_uuid)
            if not outlet_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuario sin outlet asignado",
                )
            if semana_inicio:
                crow = await conn.fetchrow(
                    """
                    SELECT c.id, c.outlet_id, c.semana_inicio, c.semana_fin,
                           c.publicado, c.created_by, c.created_at
                    FROM cuadrantes c
                    WHERE c.outlet_id = $1 AND c.semana_inicio = $2
                    """,
                    outlet_id,
                    semana_inicio,
                )
            else:
                crow = await conn.fetchrow(
                    """
                    SELECT c.id, c.outlet_id, c.semana_inicio, c.semana_fin,
                           c.publicado, c.created_by, c.created_at
                    FROM cuadrantes c
                    WHERE c.outlet_id = $1
                    ORDER BY c.semana_inicio DESC
                    LIMIT 1
                    """,
                    outlet_id,
                )
            if not crow:
                return None
            asigs = await conn.fetch(
                """
                SELECT a.id, a.empleado_id, a.fecha, a.hora_inicio, a.hora_fin,
                       a.puesto,
                       COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                FROM cuadrante_asignaciones a
                JOIN empleados e ON e.id = a.empleado_id
                LEFT JOIN usuarios u ON u.id = e.usuario_id
                WHERE a.cuadrante_id = $1 AND e.tenant_id = $2
                ORDER BY a.fecha, a.hora_inicio
                """,
                crow["id"],
                tenant_id,
            )
            ca = crow["created_at"]
            out_asig = []
            for a in asigs:
                hi = a["hora_inicio"]
                hf = a["hora_fin"]
                out_asig.append(
                    {
                        "id": str(a["id"]),
                        "empleado_id": str(a["empleado_id"]),
                        "nombre_empleado": a["nombre_empleado"],
                        "fecha": a["fecha"].isoformat(),
                        "hora_inicio": hi.isoformat()
                        if hi and hasattr(hi, "isoformat")
                        else None,
                        "hora_fin": hf.isoformat()
                        if hf and hasattr(hf, "isoformat")
                        else None,
                        "puesto": a["puesto"],
                    }
                )
            return {
                "id": str(crow["id"]),
                "outlet_id": str(crow["outlet_id"]),
                "semana_inicio": crow["semana_inicio"].isoformat(),
                "semana_fin": crow["semana_fin"].isoformat(),
                "publicado": crow["publicado"],
                "created_by": str(crow["created_by"])
                if crow["created_by"]
                else None,
                "created_at": ca.isoformat() if ca else None,
                "asignaciones": out_asig,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_cuadrantes: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@r_cuadrantes.post("/", status_code=status.HTTP_201_CREATED)
async def create_cuadrante(
    body: CreateCuadranteBody,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            async with conn.transaction():
                _, outlet_id = await _usuario_tenant_outlet(conn, user_uuid)
                if not outlet_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Usuario sin outlet asignado",
                    )
                crow = await conn.fetchrow(
                    """
                    INSERT INTO cuadrantes (
                        outlet_id, semana_inicio, semana_fin, publicado, created_by
                    )
                    VALUES ($1, $2, $3, FALSE, $4)
                    RETURNING id, outlet_id, semana_inicio, semana_fin,
                              publicado, created_by, created_at
                    """,
                    outlet_id,
                    body.semana_inicio,
                    body.semana_fin,
                    user_uuid,
                )
                cid = crow["id"]
                for item in body.asignaciones:
                    eid = UUID(item.empleado_id)
                    await _ensure_empleado_tenant(conn, eid, tenant_id)
                    hi = _parse_time_optional(item.hora_inicio)
                    hf = _parse_time_optional(item.hora_fin)
                    await conn.execute(
                        """
                        INSERT INTO cuadrante_asignaciones (
                            cuadrante_id, empleado_id, fecha,
                            hora_inicio, hora_fin, puesto
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                        """,
                        cid,
                        eid,
                        item.fecha,
                        hi,
                        hf,
                        item.puesto,
                    )
                asigs = await conn.fetch(
                    """
                    SELECT a.id, a.empleado_id, a.fecha, a.hora_inicio, a.hora_fin,
                           a.puesto,
                           COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                    FROM cuadrante_asignaciones a
                    JOIN empleados e ON e.id = a.empleado_id
                    LEFT JOIN usuarios u ON u.id = e.usuario_id
                    WHERE a.cuadrante_id = $1
                    ORDER BY a.fecha, a.hora_inicio
                    """,
                    cid,
                )
            out_asig = []
            for a in asigs:
                hi = a["hora_inicio"]
                hf = a["hora_fin"]
                out_asig.append(
                    {
                        "id": str(a["id"]),
                        "empleado_id": str(a["empleado_id"]),
                        "nombre_empleado": a["nombre_empleado"],
                        "fecha": a["fecha"].isoformat(),
                        "hora_inicio": hi.isoformat()
                        if hi and hasattr(hi, "isoformat")
                        else None,
                        "hora_fin": hf.isoformat()
                        if hf and hasattr(hf, "isoformat")
                        else None,
                        "puesto": a["puesto"],
                    }
                )
            ca = crow["created_at"]
            return {
                "id": str(crow["id"]),
                "outlet_id": str(crow["outlet_id"]),
                "semana_inicio": crow["semana_inicio"].isoformat(),
                "semana_fin": crow["semana_fin"].isoformat(),
                "publicado": crow["publicado"],
                "created_by": str(crow["created_by"])
                if crow["created_by"]
                else None,
                "created_at": ca.isoformat() if ca else None,
                "asignaciones": out_asig,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_cuadrante: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


router.include_router(r_cuadrantes)
