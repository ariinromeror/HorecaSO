"""
Router RRHH: CRUD empleados.

Tabla empleados: incluye nombre_completo VARCHAR(255).
Nombre mostrado: COALESCE(u.nombre, e.nombre_completo) (LEFT JOIN usuarios).
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, model_validator

from auth.dependencies import require_roles
from database import get_db

from routers.empleados_shared import (
    ROLES_RRHH,
    _fetch_empleado_con_usuario,
    _q2,
    _serialize_empleado_full,
    _serialize_empleado_list_row,
    _tenant_id,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["EmpleadosRRHH"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

r_empleados = APIRouter(prefix="/empleados")


# --- GET /empleados ---
@r_empleados.get("")
async def list_empleados(
    buscar: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    cargo: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            conditions = ["e.tenant_id = $1"]
            params: list[Any] = [tenant_id]
            n = 2

            if buscar:
                conditions.append(
                    f"(u.nombre ILIKE ${n} OR u.email ILIKE ${n})"
                )
                params.append(f"%{buscar}%")
                n += 1
            if activo is not None:
                conditions.append(f"e.activo = ${n}")
                params.append(activo)
                n += 1
            if cargo:
                conditions.append(f"e.cargo ILIKE ${n}")
                params.append(f"%{cargo}%")
                n += 1

            where_sql = " AND ".join(conditions)
            rows = await conn.fetch(
                f"""
                SELECT
                    e.id,
                    COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado,
                    u.email AS email,
                    e.dni,
                    e.cargo,
                    e.contrato,
                    e.jornada_horas,
                    e.salario_bruto_mensual,
                    e.activo,
                    e.fecha_inicio,
                    e.usuario_id
                FROM empleados e
                LEFT JOIN usuarios u ON u.id = e.usuario_id
                WHERE {where_sql}
                ORDER BY nombre_empleado NULLS LAST, e.id
                """,
                *params,
            )
            return [_serialize_empleado_list_row(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_empleados: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class CreateEmpleadoBody(BaseModel):
    nombre_completo: Optional[str] = None
    dni: Optional[str] = None
    nss: Optional[str] = None
    cargo: Optional[str] = None
    categoria_profesional: Optional[str] = None
    contrato: Optional[str] = None
    jornada_horas: Optional[Decimal] = None
    salario_bruto_mensual: Optional[Decimal] = None
    irpf_porcentaje: Optional[Decimal] = None
    fecha_inicio: Optional[date] = None
    iban: Optional[str] = None
    usuario_id: Optional[str] = None


@r_empleados.post("", status_code=status.HTTP_201_CREATED)
async def create_empleado(
    body: CreateEmpleadoBody,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    uid_link = UUID(body.usuario_id) if body.usuario_id else None
    try:
        async with get_db() as conn:
            if uid_link:
                urow = await conn.fetchrow(
                    "SELECT id FROM usuarios WHERE id = $1 AND tenant_id = $2",
                    uid_link,
                    tenant_id,
                )
                if not urow:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="usuario_id no válido para este tenant",
                    )
            unset = body.model_dump(exclude_unset=True)
            cols = ["tenant_id", "usuario_id"]
            params_ins: list[Any] = [tenant_id, uid_link]
            if "nombre_completo" in unset:
                cols.append("nombre_completo")
                nv = unset["nombre_completo"]
                if isinstance(nv, str):
                    nv = nv.strip() or None
                params_ins.append(nv)
            cols.extend(
                [
                    "dni",
                    "nss",
                    "cargo",
                    "contrato",
                    "jornada_horas",
                    "salario_bruto_mensual",
                    "irpf_porcentaje",
                    "fecha_inicio",
                    "iban",
                    "activo",
                ]
            )
            params_ins.extend(
                [
                    body.dni,
                    body.nss,
                    body.cargo,
                    body.contrato,
                    body.jornada_horas,
                    body.salario_bruto_mensual,
                    body.irpf_porcentaje,
                    body.fecha_inicio,
                    body.iban,
                ]
            )
            ph = [f"${k}" for k in range(1, len(params_ins) + 1)]
            ph.append("TRUE")
            sql_ins = (
                f"INSERT INTO empleados ({', '.join(cols)}) "
                f"VALUES ({', '.join(ph)}) RETURNING id"
            )
            row = await conn.fetchrow(sql_ins, *params_ins)
            detail = await _fetch_empleado_con_usuario(conn, row["id"], tenant_id)
            return _serialize_empleado_full(detail)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_empleado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@r_empleados.get("/{empleado_id}")
async def get_empleado(
    empleado_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            row = await _fetch_empleado_con_usuario(conn, empleado_id, tenant_id)
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            return _serialize_empleado_full(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_empleado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class UpdateEmpleadoBody(BaseModel):
    nombre_completo: Optional[str] = None
    dni: Optional[str] = None
    nss: Optional[str] = None
    cargo: Optional[str] = None
    categoria_profesional: Optional[str] = None
    contrato: Optional[str] = None
    jornada_horas: Optional[Decimal] = None
    salario_bruto_mensual: Optional[Decimal] = None
    irpf_porcentaje: Optional[Decimal] = None
    fecha_inicio: Optional[date] = None
    iban: Optional[str] = None
    activo: Optional[bool] = None
    usuario_id: Optional[str] = None

    @model_validator(mode="after")
    def at_least_one(self):
        data = self.model_dump(exclude_unset=True)
        if not data:
            raise ValueError("Al menos un campo es requerido")
        return self


@r_empleados.put("/{empleado_id}")
async def update_empleado(
    empleado_id: UUID,
    body: UpdateEmpleadoBody,
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
    tenant_id = _tenant_id(current_user)
    data = body.model_dump(exclude_unset=True)
    if "nombre_completo" in data and isinstance(data["nombre_completo"], str):
        data["nombre_completo"] = data["nombre_completo"].strip() or None
    if "usuario_id" in data and data["usuario_id"]:
        data["usuario_id"] = UUID(data["usuario_id"])
    elif "usuario_id" in data and not data["usuario_id"]:
        data["usuario_id"] = None

    cols_map = {
        "nombre_completo": "nombre_completo",
        "dni": "dni",
        "nss": "nss",
        "cargo": "cargo",
        "contrato": "contrato",
        "jornada_horas": "jornada_horas",
        "salario_bruto_mensual": "salario_bruto_mensual",
        "irpf_porcentaje": "irpf_porcentaje",
        "fecha_inicio": "fecha_inicio",
        "iban": "iban",
        "activo": "activo",
        "usuario_id": "usuario_id",
    }

    try:
        async with get_db() as conn:
            exists = await conn.fetchval(
                "SELECT 1 FROM empleados WHERE id = $1 AND tenant_id = $2",
                empleado_id,
                tenant_id,
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            if data.get("usuario_id"):
                urow = await conn.fetchrow(
                    "SELECT id FROM usuarios WHERE id = $1 AND tenant_id = $2",
                    data["usuario_id"],
                    tenant_id,
                )
                if not urow:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="usuario_id no válido para este tenant",
                    )

            sets: list[str] = []
            vals: list[Any] = []
            i = 1
            for key, col in cols_map.items():
                if key not in data:
                    continue
                sets.append(f"{col} = ${i}")
                vals.append(data[key])
                i += 1
            if not sets:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Al menos un campo es requerido",
                )
            vals.extend([empleado_id, tenant_id])
            sql = (
                "UPDATE empleados SET "
                + ", ".join(sets)
                + f" WHERE id = ${i} AND tenant_id = ${i + 1} RETURNING *"
            )
            await conn.fetchrow(sql, *vals)
            detail = await _fetch_empleado_con_usuario(conn, empleado_id, tenant_id)
            return _serialize_empleado_full(detail)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_empleado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


router.include_router(r_empleados)
