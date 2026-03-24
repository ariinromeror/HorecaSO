"""
Reservas: listado y detalle.
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db

from .reservas_shared import (
    ROLES_GESTION,
    _outlet_id_usuario,
    _serialize_reserva,
    _uid,
)

logger = logging.getLogger(__name__)

router = APIRouter()

ROLES_LISTADO_OPERATIVO = [
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "barra",
    "almacen",
]


async def do_list_reservas(
    fecha: Optional[date],
    estado: Optional[str],
    fecha_desde: Optional[date],
    fecha_hasta: Optional[date],
    current_user: dict,
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            conds = ["r.outlet_id = $1"]
            params: list[Any] = [outlet_id]
            n = 2

            if fecha is not None:
                conds.append(f"r.fecha = ${n}")
                params.append(fecha)
                n += 1
            elif fecha_desde is not None and fecha_hasta is not None:
                conds.append(f"r.fecha BETWEEN ${n} AND ${n + 1}")
                params.append(fecha_desde)
                params.append(fecha_hasta)
                n += 2

            if estado is not None:
                conds.append(f"r.estado = ${n}")
                params.append(estado)
                n += 1

            where_sql = " AND ".join(conds)
            rows = await conn.fetch(
                f"""
                SELECT
                    r.id, r.outlet_id, r.mesa_id, r.nombre_cliente, r.telefono,
                    r.fecha, r.hora, r.num_personas, r.estado, r.notas, r.email,
                    r.origen, r.recordatorio_enviado, r.cliente_id, r.created_at,
                    m.numero AS mesa_numero, m.zona
                FROM reservas r
                LEFT JOIN mesas m ON m.id = r.mesa_id
                WHERE {where_sql}
                ORDER BY r.fecha ASC, r.hora ASC
                """,
                *params,
            )
            return [_serialize_reserva(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_reservas: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/")
async def list_reservas(
    fecha: Optional[date] = Query(None),
    estado: Optional[str] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_LISTADO_OPERATIVO)),
):
    return await do_list_reservas(
        fecha, estado, fecha_desde, fecha_hasta, current_user
    )


@router.get("/{reserva_id}")
async def get_reserva(
    reserva_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            row = await conn.fetchrow(
                """
                SELECT
                    r.id, r.outlet_id, r.mesa_id, r.nombre_cliente, r.telefono,
                    r.fecha, r.hora, r.num_personas, r.estado, r.notas, r.email,
                    r.origen, r.recordatorio_enviado, r.cliente_id, r.created_at,
                    m.numero AS mesa_numero, m.zona
                FROM reservas r
                LEFT JOIN mesas m ON m.id = r.mesa_id
                WHERE r.id = $1 AND r.outlet_id = $2
                """,
                reserva_id,
                outlet_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            return _serialize_reserva(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_reserva: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
