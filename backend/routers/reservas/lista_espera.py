"""
Lista de espera por outlet.
"""

from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth.dependencies import require_roles
from database import get_db

from .reservas_shared import (
    ROLES_GESTION,
    ROLES_TODOS,
    _outlet_id_usuario,
    _serialize_lista_espera,
    _uid,
)

logger = logging.getLogger(__name__)

lista_espera_router = APIRouter(
    prefix="/lista-espera",
    tags=["Lista Espera"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


@lista_espera_router.get("/")
async def list_lista_espera(
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            rows = await conn.fetch(
                """
                SELECT id, outlet_id, nombre_cliente, telefono, num_personas,
                       hora_llegada, estado, tiempo_estimado
                FROM lista_espera
                WHERE outlet_id = $1
                  AND estado IN ('esperando', 'avisado')
                ORDER BY hora_llegada ASC
                """,
                outlet_id,
            )
            return [_serialize_lista_espera(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_lista_espera: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class CreateListaEsperaBody(BaseModel):
    nombre_cliente: str = Field(..., min_length=1)
    telefono: str = Field(..., min_length=1)
    num_personas: int = Field(..., ge=1)
    tiempo_estimado: Optional[int] = None


@lista_espera_router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lista_espera(
    body: CreateListaEsperaBody,
    current_user: dict = Depends(require_roles(ROLES_TODOS)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            row = await conn.fetchrow(
                """
                INSERT INTO lista_espera (
                    outlet_id, nombre_cliente, telefono, num_personas,
                    hora_llegada, estado, tiempo_estimado
                )
                VALUES (
                    $1, $2, $3, $4, NOW(), 'esperando', $5
                )
                RETURNING id, outlet_id, nombre_cliente, telefono, num_personas,
                          hora_llegada, estado, tiempo_estimado
                """,
                outlet_id,
                body.nombre_cliente.strip(),
                body.telefono.strip(),
                body.num_personas,
                body.tiempo_estimado,
            )
            return _serialize_lista_espera(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_lista_espera: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


ESTADOS_LISTA = frozenset({"esperando", "avisado", "sentado", "cancelado"})


class PatchListaEstadoBody(BaseModel):
    estado: str


@lista_espera_router.patch("/{entrada_id}/estado")
async def patch_lista_espera_estado(
    entrada_id: UUID,
    body: PatchListaEstadoBody,
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    if body.estado not in ESTADOS_LISTA:
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
                UPDATE lista_espera SET estado = $1
                WHERE id = $2 AND outlet_id = $3
                RETURNING id, outlet_id, nombre_cliente, telefono, num_personas,
                          hora_llegada, estado, tiempo_estimado
                """,
                body.estado,
                entrada_id,
                outlet_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No encontrado",
                )
            return _serialize_lista_espera(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("patch_lista_espera_estado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
