"""
Gestión de clientes por tenant.
"""

from __future__ import annotations

import logging
from datetime import date
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from auth.dependencies import require_roles
from database import get_db

from .clientes_shared import (
    ROLES_GESTION,
    _serialize_cliente,
    _tenant_id_usuario,
    _uid,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


@router.get("", include_in_schema=False)
@router.get("/")
async def list_clientes(
    buscar: Optional[str] = Query(None),
    puntos_min: Optional[int] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            conds = ["tenant_id = $1"]
            params: list[Any] = [tenant_id]
            n = 2

            if buscar is not None and buscar.strip():
                conds.append(
                    "(nombre ILIKE $"
                    + str(n)
                    + " OR email ILIKE $"
                    + str(n)
                    + " OR telefono ILIKE $"
                    + str(n)
                    + ")"
                )
                params.append("%" + buscar.strip() + "%")
                n += 1

            if puntos_min is not None:
                conds.append("puntos_fidelidad >= $" + str(n))
                params.append(puntos_min)
                n += 1

            where_sql = " AND ".join(conds)
            rows = await conn.fetch(
                """
                SELECT
                    id, tenant_id, nombre, email, telefono, fecha_nacimiento,
                    alergenos, preferencias, total_visitas, gasto_total, gasto_medio,
                    ultima_visita, puntos_fidelidad, notas, created_at
                FROM clientes
                WHERE """
                + where_sql
                + """
                ORDER BY total_visitas DESC, gasto_total DESC
                """,
                *params,
            )
            return [_serialize_cliente(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_clientes: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class CreateClienteBody(BaseModel):
    nombre: str = Field(..., min_length=1)
    email: Optional[str] = None
    telefono: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    alergenos: list[str] = Field(default_factory=list)
    preferencias: Optional[str] = None
    notas: Optional[str] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_cliente(
    body: CreateClienteBody,
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    user_uuid = _uid(current_user)
    cero = Decimal("0.00")
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            row = await conn.fetchrow(
                """
                INSERT INTO clientes (
                    tenant_id, nombre, email, telefono, fecha_nacimiento,
                    alergenos, preferencias, total_visitas, gasto_total,
                    gasto_medio, puntos_fidelidad, notas
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6::text[], $7, 0, $8, $9, 0, $10
                )
                RETURNING
                    id, tenant_id, nombre, email, telefono, fecha_nacimiento,
                    alergenos, preferencias, total_visitas, gasto_total, gasto_medio,
                    ultima_visita, puntos_fidelidad, notas, created_at
                """,
                tenant_id,
                body.nombre.strip(),
                body.email.strip() if body.email else None,
                body.telefono.strip() if body.telefono else None,
                body.fecha_nacimiento,
                body.alergenos if body.alergenos else [],
                body.preferencias,
                cero,
                cero,
                body.notas,
            )
            return _serialize_cliente(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_cliente: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/{cliente_id}")
async def get_cliente(
    cliente_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            row = await conn.fetchrow(
                """
                SELECT
                    id, tenant_id, nombre, email, telefono, fecha_nacimiento,
                    alergenos, preferencias, total_visitas, gasto_total, gasto_medio,
                    ultima_visita, puntos_fidelidad, notas, created_at
                FROM clientes
                WHERE id = $1 AND tenant_id = $2
                """,
                cliente_id,
                tenant_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            return _serialize_cliente(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_cliente: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class UpdateClienteBody(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    alergenos: Optional[list[str]] = None
    preferencias: Optional[str] = None
    notas: Optional[str] = None


@router.put("/{cliente_id}")
async def update_cliente(
    cliente_id: UUID,
    body: UpdateClienteBody,
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    user_uuid = _uid(current_user)
    data = body.model_dump(exclude_unset=True)
    if "nombre" in data and data["nombre"] is not None:
        data["nombre"] = data["nombre"].strip()
    if "email" in data and data["email"] is not None:
        data["email"] = data["email"].strip() or None
    if "telefono" in data and data["telefono"] is not None:
        data["telefono"] = data["telefono"].strip() or None

    cols_map = [
        ("nombre", "nombre"),
        ("email", "email"),
        ("telefono", "telefono"),
        ("fecha_nacimiento", "fecha_nacimiento"),
        ("alergenos", "alergenos"),
        ("preferencias", "preferencias"),
        ("notas", "notas"),
    ]

    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, user_uuid)
            exists = await conn.fetchval(
                "SELECT 1 FROM clientes WHERE id = $1 AND tenant_id = $2",
                cliente_id,
                tenant_id,
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )

            sets: list[str] = []
            vals: list[Any] = []
            i = 1
            for key, col in cols_map:
                if key not in data:
                    continue
                if key == "alergenos":
                    sets.append(col + " = $" + str(i) + "::text[]")
                    vals.append(data[key] if data[key] is not None else [])
                else:
                    sets.append(col + " = $" + str(i))
                    vals.append(data[key])
                i += 1

            if not sets:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Sin campos para actualizar",
                )

            vals.extend([cliente_id, tenant_id])
            sql = (
                "UPDATE clientes SET "
                + ", ".join(sets)
                + " WHERE id = $"
                + str(i)
                + " AND tenant_id = $"
                + str(i + 1)
                + """
                RETURNING
                    id, tenant_id, nombre, email, telefono, fecha_nacimiento,
                    alergenos, preferencias, total_visitas, gasto_total, gasto_medio,
                    ultima_visita, puntos_fidelidad, notas, created_at
                """
            )
            row = await conn.fetchrow(sql, *vals)
            return _serialize_cliente(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_cliente: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
