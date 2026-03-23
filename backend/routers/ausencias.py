"""
Router RRHH: solicitudes de ausencia e incidencias.
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from auth.dependencies import require_roles
from database import get_db

from routers.empleados_shared import (
    ROLES_EMPLEADO,
    ROLES_JEFE,
    ROLES_RRHH,
    _ensure_empleado_tenant,
    _tenant_id,
    _uid,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["EmpleadosRRHH"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

r_ausencias = APIRouter(prefix="/ausencias")


@r_ausencias.get("")
async def list_ausencias(
    empleado_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_JEFE)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            cond = ["e.tenant_id = $1"]
            params: list[Any] = [tenant_id]
            n = 2
            if empleado_id:
                cond.append(f"s.empleado_id = ${n}")
                params.append(UUID(empleado_id))
                n += 1
            if estado:
                cond.append(f"s.estado = ${n}")
                params.append(estado)
                n += 1
            w = " AND ".join(cond)
            rows = await conn.fetch(
                f"""
                SELECT s.id, s.empleado_id, s.tipo, s.fecha_inicio, s.fecha_fin,
                       s.estado, s.motivo, s.aprobada_por, s.created_at,
                       COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                FROM solicitudes_ausencia s
                JOIN empleados e ON e.id = s.empleado_id
                LEFT JOIN usuarios u ON u.id = e.usuario_id
                WHERE {w}
                ORDER BY s.created_at DESC
                """,
                *params,
            )
            out = []
            for r in rows:
                ca = r["created_at"]
                out.append(
                    {
                        "id": str(r["id"]),
                        "empleado_id": str(r["empleado_id"]),
                        "nombre_empleado": r["nombre_empleado"],
                        "tipo": r["tipo"],
                        "fecha_inicio": r["fecha_inicio"].isoformat(),
                        "fecha_fin": r["fecha_fin"].isoformat(),
                        "estado": r["estado"],
                        "motivo": r["motivo"],
                        "aprobada_por": str(r["aprobada_por"])
                        if r["aprobada_por"]
                        else None,
                        "created_at": ca.isoformat() if ca else None,
                    }
                )
            return out
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_ausencias: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class CreateAusenciaBody(BaseModel):
    empleado_id: str
    tipo: Literal["vacaciones", "enfermedad", "personal", "maternidad"]
    fecha_inicio: date
    fecha_fin: date
    motivo: Optional[str] = None


@r_ausencias.post("", status_code=status.HTTP_201_CREATED)
async def create_ausencia(
    body: CreateAusenciaBody,
    current_user: dict = Depends(require_roles(ROLES_EMPLEADO)),
):
    tenant_id = _tenant_id(current_user)
    emp_id = UUID(body.empleado_id)
    if body.fecha_fin < body.fecha_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fecha_fin debe ser >= fecha_inicio",
        )
    try:
        async with get_db() as conn:
            await _ensure_empleado_tenant(conn, emp_id, tenant_id)
            row = await conn.fetchrow(
                """
                INSERT INTO solicitudes_ausencia (
                    empleado_id, tipo, fecha_inicio, fecha_fin, estado, motivo
                )
                VALUES ($1, $2, $3, $4, 'pendiente', $5)
                RETURNING id, empleado_id, tipo, fecha_inicio, fecha_fin,
                          estado, motivo, aprobada_por, created_at
                """,
                emp_id,
                body.tipo,
                body.fecha_inicio,
                body.fecha_fin,
                body.motivo,
            )
            ca = row["created_at"]
            return {
                "id": str(row["id"]),
                "empleado_id": str(row["empleado_id"]),
                "tipo": row["tipo"],
                "fecha_inicio": row["fecha_inicio"].isoformat(),
                "fecha_fin": row["fecha_fin"].isoformat(),
                "estado": row["estado"],
                "motivo": row["motivo"],
                "aprobada_por": None,
                "created_at": ca.isoformat() if ca else None,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_ausencia: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class PatchAusenciaEstadoBody(BaseModel):
    estado: Literal["aprobada", "rechazada"]


@r_ausencias.patch("/{ausencia_id}/estado")
async def patch_ausencia_estado(
    ausencia_id: UUID,
    body: PatchAusenciaEstadoBody,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    approver = _uid(current_user)
    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                """
                SELECT s.id
                FROM solicitudes_ausencia s
                JOIN empleados e ON e.id = s.empleado_id
                WHERE s.id = $1 AND e.tenant_id = $2
                """,
                ausencia_id,
                tenant_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            upd = await conn.fetchrow(
                """
                UPDATE solicitudes_ausencia SET
                    estado = $2,
                    aprobada_por = $3
                WHERE id = $1
                RETURNING id, empleado_id, tipo, fecha_inicio, fecha_fin,
                          estado, motivo, aprobada_por, created_at
                """,
                ausencia_id,
                body.estado,
                approver,
            )
            ca = upd["created_at"]
            return {
                "id": str(upd["id"]),
                "empleado_id": str(upd["empleado_id"]),
                "tipo": upd["tipo"],
                "fecha_inicio": upd["fecha_inicio"].isoformat(),
                "fecha_fin": upd["fecha_fin"].isoformat(),
                "estado": upd["estado"],
                "motivo": upd["motivo"],
                "aprobada_por": str(upd["aprobada_por"])
                if upd["aprobada_por"]
                else None,
                "created_at": ca.isoformat() if ca else None,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("patch_ausencia_estado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


router.include_router(r_ausencias)
