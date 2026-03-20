"""
Reservas y lista de espera por outlet.
"""

from __future__ import annotations

import logging
import re
from datetime import date, datetime, time
from typing import Any, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

ROLES_GESTION = ["admin", "director", "jefe_sala"]
ROLES_TODOS = [
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "almacen",
]

router = APIRouter(
    prefix="/reservas",
    tags=["Reservas"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

lista_espera_router = APIRouter(
    prefix="/lista-espera",
    tags=["Lista Espera"],
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


_HORA_RE = re.compile(r"^\d{1,2}:\d{2}$")


def _parse_hora_time(s: str) -> time:
    """Valida HH:MM y devuelve datetime.time para asyncpg (columna TIME)."""
    if not s or not _HORA_RE.match(s.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hora debe ser HH:MM",
        )
    partes = s.strip().split(":")
    h, m = int(partes[0]), int(partes[1])
    if h < 0 or h > 23 or m < 0 or m > 59:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hora inválida",
        )
    return time(h, m)


def _serialize_reserva(r: Any) -> dict:
    fe = r.get("fecha")
    ho = r.get("hora")
    ca = r.get("created_at")
    return {
        "id": str(r["id"]),
        "outlet_id": str(r["outlet_id"]),
        "mesa_id": str(r["mesa_id"]) if r.get("mesa_id") else None,
        "mesa_numero": r.get("mesa_numero"),
        "zona": r.get("zona"),
        "nombre_cliente": r["nombre_cliente"],
        "telefono": r["telefono"],
        "email": r.get("email"),
        "fecha": fe.isoformat() if fe is not None and hasattr(fe, "isoformat") else None,
        "hora": ho.isoformat()
        if ho is not None and hasattr(ho, "isoformat")
        else str(ho)
        if ho is not None
        else None,
        "num_personas": r["num_personas"],
        "estado": r["estado"],
        "notas": r.get("notas"),
        "origen": r.get("origen"),
        "recordatorio_enviado": r.get("recordatorio_enviado", False),
        "cliente_id": str(r["cliente_id"]) if r.get("cliente_id") else None,
        "created_at": ca.isoformat() if ca is not None and hasattr(ca, "isoformat") else None,
    }


def _serialize_lista_espera(r: Any) -> dict:
    hl = r.get("hora_llegada")
    return {
        "id": str(r["id"]),
        "outlet_id": str(r["outlet_id"]),
        "nombre_cliente": r["nombre_cliente"],
        "telefono": r["telefono"],
        "num_personas": r["num_personas"],
        "hora_llegada": hl.isoformat() if hl is not None and hasattr(hl, "isoformat") else None,
        "estado": r["estado"],
        "tiempo_estimado": r.get("tiempo_estimado"),
    }


@router.get("")
async def list_reservas(
    fecha: Optional[date] = Query(None),
    estado: Optional[str] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
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


class CreateReservaBody(BaseModel):
    nombre_cliente: str = Field(..., min_length=1)
    telefono: str = Field(..., min_length=1)
    fecha: date
    hora: str = Field(..., min_length=1)
    num_personas: int = Field(..., ge=1)
    mesa_id: Optional[str] = None
    cliente_id: Optional[str] = None
    email: Optional[str] = None
    origen: Literal["telefono", "web", "app", "walk_in"] = "telefono"
    notas: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
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


ESTADOS_RESERVA = frozenset(
    {"pendiente", "confirmada", "sentada", "cancelada", "no_show"}
)


class PatchReservaEstadoBody(BaseModel):
    estado: str


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


class UpdateReservaBody(BaseModel):
    nombre_cliente: Optional[str] = None
    telefono: Optional[str] = None
    fecha: Optional[date] = None
    hora: Optional[str] = None
    num_personas: Optional[int] = Field(None, ge=1)
    mesa_id: Optional[str] = None
    email: Optional[str] = None
    notas: Optional[str] = None
    origen: Optional[Literal["telefono", "web", "app", "walk_in"]] = None


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


@lista_espera_router.get("")
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


@lista_espera_router.post("", status_code=status.HTTP_201_CREATED)
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
