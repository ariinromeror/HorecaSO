"""
Reservas: alta y actualización.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import require_roles
from database import get_db

from .reservas_schemas import (
    CreateReservaBody,
    ESTADOS_RESERVA,
    PatchReservaEstadoBody,
    UpdateReservaBody,
)
from .reservas_shared import (
    ROLES_GESTION,
    _outlet_id_usuario,
    _parse_hora_time,
    _serialize_reserva,
    _uid,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_reserva(
    body: CreateReservaBody,
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    user_uuid = _uid(current_user)
    hora_time = _parse_hora_time(body.hora)
    mesa_uuid = UUID(body.mesa_id) if body.mesa_id else None
    cliente_uuid = UUID(body.cliente_id) if body.cliente_id else None
    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            if mesa_uuid:
                ok_m = await conn.fetchval(
                    "SELECT 1 FROM mesas WHERE id = $1 AND outlet_id = $2",
                    mesa_uuid,
                    outlet_id,
                )
                if not ok_m:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="mesa_id no válido para este local",
                    )
            row = await conn.fetchrow(
                """
                INSERT INTO reservas (
                    outlet_id, mesa_id, nombre_cliente, telefono, fecha, hora,
                    num_personas, estado, notas, email, origen,
                    recordatorio_enviado, cliente_id
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, 'pendiente', $8, $9, $10,
                    FALSE, $11
                )
                RETURNING
                    id, outlet_id, mesa_id, nombre_cliente, telefono, fecha, hora,
                    num_personas, estado, notas, email, origen,
                    recordatorio_enviado, cliente_id, created_at
                """,
                outlet_id,
                mesa_uuid,
                body.nombre_cliente.strip(),
                body.telefono.strip(),
                body.fecha,
                hora_time,
                body.num_personas,
                body.notas,
                body.email,
                body.origen,
                cliente_uuid,
            )
            r2 = await conn.fetchrow(
                """
                SELECT
                    r.id, r.outlet_id, r.mesa_id, r.nombre_cliente, r.telefono,
                    r.fecha, r.hora, r.num_personas, r.estado, r.notas, r.email,
                    r.origen, r.recordatorio_enviado, r.cliente_id, r.created_at,
                    m.numero AS mesa_numero, m.zona
                FROM reservas r
                LEFT JOIN mesas m ON m.id = r.mesa_id
                WHERE r.id = $1
                """,
                row["id"],
            )
            return _serialize_reserva(r2)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_reserva: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.patch("/{reserva_id}/estado")
async def patch_reserva_estado(
    reserva_id: UUID,
    body: PatchReservaEstadoBody,
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    if body.estado not in ESTADOS_RESERVA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estado no válido",
        )
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            row = await conn.fetchrow(
                """
                UPDATE reservas SET estado = $1
                WHERE id = $2 AND outlet_id = $3
                RETURNING id
                """,
                body.estado,
                reserva_id,
                outlet_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            r2 = await conn.fetchrow(
                """
                SELECT
                    r.id, r.outlet_id, r.mesa_id, r.nombre_cliente, r.telefono,
                    r.fecha, r.hora, r.num_personas, r.estado, r.notas, r.email,
                    r.origen, r.recordatorio_enviado, r.cliente_id, r.created_at,
                    m.numero AS mesa_numero, m.zona
                FROM reservas r
                LEFT JOIN mesas m ON m.id = r.mesa_id
                WHERE r.id = $1
                """,
                reserva_id,
            )
            return _serialize_reserva(r2)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("patch_reserva_estado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.put("/{reserva_id}")
async def update_reserva(
    reserva_id: UUID,
    body: UpdateReservaBody,
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    user_uuid = _uid(current_user)
    data = body.model_dump(exclude_unset=True)
    if "hora" in data and data["hora"] is not None:
        data["hora"] = _parse_hora_time(data["hora"])
    if "mesa_id" in data:
        if data["mesa_id"]:
            data["mesa_id"] = UUID(data["mesa_id"])
        else:
            data["mesa_id"] = None

    cols_map = {
        "nombre_cliente": "nombre_cliente",
        "telefono": "telefono",
        "fecha": "fecha",
        "hora": "hora",
        "num_personas": "num_personas",
        "mesa_id": "mesa_id",
        "email": "email",
        "notas": "notas",
        "origen": "origen",
    }

    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            exists = await conn.fetchval(
                "SELECT 1 FROM reservas WHERE id = $1 AND outlet_id = $2",
                reserva_id,
                outlet_id,
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            if data.get("mesa_id"):
                ok_m = await conn.fetchval(
                    "SELECT 1 FROM mesas WHERE id = $1 AND outlet_id = $2",
                    data["mesa_id"],
                    outlet_id,
                )
                if not ok_m:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="mesa_id no válido para este local",
                    )

            sets: list[str] = []
            vals: list[Any] = []
            i = 1
            for key, col in cols_map.items():
                if key not in data:
                    continue
                if key == "hora":
                    sets.append(f"{col} = ${i}")
                else:
                    sets.append(f"{col} = ${i}")
                vals.append(data[key])
                i += 1
            if not sets:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Sin campos para actualizar",
                )
            vals.extend([reserva_id, outlet_id])
            sql = (
                "UPDATE reservas SET "
                + ", ".join(sets)
                + f" WHERE id = ${i} AND outlet_id = ${i + 1} RETURNING id"
            )
            await conn.fetchrow(sql, *vals)
            r2 = await conn.fetchrow(
                """
                SELECT
                    r.id, r.outlet_id, r.mesa_id, r.nombre_cliente, r.telefono,
                    r.fecha, r.hora, r.num_personas, r.estado, r.notas, r.email,
                    r.origen, r.recordatorio_enviado, r.cliente_id, r.created_at,
                    m.numero AS mesa_numero, m.zona
                FROM reservas r
                LEFT JOIN mesas m ON m.id = r.mesa_id
                WHERE r.id = $1
                """,
                reserva_id,
            )
            return _serialize_reserva(r2)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_reserva: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
