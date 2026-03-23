"""
APPCC — registros de control (temperatura, higiene, recepción, etc.).
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

ROLES_APPCC = ["admin", "director", "almacen", "cocina"]
ROLES_GESTION = ["admin", "director"]

TIPOS_CONTROL = frozenset(
    {
        "temperatura",
        "higiene",
        "recepcion",
        "limpieza",
        "apertura",
        "cierre",
    }
)

router = APIRouter(
    prefix="/appcc",
    tags=["APPCC"],
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


def _serialize_registro(r: Any) -> dict:
    temp = r.get("temperatura")
    ca = r.get("created_at")
    return {
        "id": str(r["id"]),
        "outlet_id": str(r["outlet_id"]),
        "usuario_id": str(r["usuario_id"]) if r.get("usuario_id") else None,
        "nombre_usuario": r.get("nombre_usuario") or "Sistema",
        "tipo_control": r["tipo_control"],
        "nombre_equipo": r.get("nombre_equipo"),
        "temperatura": float(Decimal(str(temp)).quantize(Decimal("0.01"), ROUND_HALF_UP))
        if temp is not None
        else None,
        "conforme": bool(r["conforme"]),
        "observaciones": r.get("observaciones"),
        "accion_correctora": r.get("accion_correctora"),
        "created_at": ca.isoformat() if ca is not None and hasattr(ca, "isoformat") else None,
    }


def _resolve_rango_no_conformes(
    desde: Optional[date],
    hasta: Optional[date],
) -> tuple[date, date]:
    h = hasta or date.today()
    d = desde or (h - timedelta(days=29))
    if d > h:
        d, h = h, d
    return d, h


@router.get("/registros/no-conformes")
async def list_registros_no_conformes(
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_GESTION)),
):
    user_uuid = _uid(current_user)
    d0, d1 = _resolve_rango_no_conformes(desde, hasta)
    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            rows = await conn.fetch(
                """
                SELECT
                    r.id,
                    r.outlet_id,
                    r.usuario_id,
                    r.tipo_control,
                    r.nombre_equipo,
                    r.temperatura,
                    r.conforme,
                    r.observaciones,
                    r.accion_correctora,
                    r.created_at,
                    COALESCE(u.nombre, 'Sistema') AS nombre_usuario
                FROM registros_appcc r
                LEFT JOIN usuarios u ON r.usuario_id = u.id
                WHERE r.outlet_id = $1
                  AND r.conforme = FALSE
                  AND DATE(r.created_at) >= $2
                  AND DATE(r.created_at) <= $3
                ORDER BY r.created_at DESC
                """,
                outlet_id,
                d0,
                d1,
            )
            return [_serialize_registro(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_registros_no_conformes: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/registros")
async def list_registros_appcc(
    tipo_control: Optional[str] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    conforme: Optional[bool] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_APPCC)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            conds = ["r.outlet_id = $1"]
            params: list[Any] = [outlet_id]
            n = 2

            if desde is not None and hasta is not None:
                conds.append("DATE(r.created_at) BETWEEN $" + str(n) + " AND $" + str(n + 1))
                params.append(desde)
                params.append(hasta)
                n += 2
            elif desde is not None:
                conds.append("DATE(r.created_at) >= $" + str(n))
                params.append(desde)
                n += 1
            else:
                conds.append("DATE(r.created_at) = CURRENT_DATE")

            if tipo_control is not None and str(tipo_control).strip():
                conds.append("r.tipo_control = $" + str(n))
                params.append(str(tipo_control).strip())
                n += 1

            if conforme is not None:
                conds.append("r.conforme = $" + str(n))
                params.append(conforme)
                n += 1

            where_sql = " AND ".join(conds)
            rows = await conn.fetch(
                """
                SELECT
                    r.id,
                    r.outlet_id,
                    r.usuario_id,
                    r.tipo_control,
                    r.nombre_equipo,
                    r.temperatura,
                    r.conforme,
                    r.observaciones,
                    r.accion_correctora,
                    r.created_at,
                    COALESCE(u.nombre, 'Sistema') AS nombre_usuario
                FROM registros_appcc r
                LEFT JOIN usuarios u ON r.usuario_id = u.id
                WHERE """
                + where_sql
                + """
                ORDER BY r.created_at DESC
                """,
                *params,
            )
            return [_serialize_registro(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_registros_appcc: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


class CreateRegistroAppccBody(BaseModel):
    tipo_control: str = Field(..., min_length=1)
    nombre_equipo: Optional[str] = None
    temperatura: Optional[Decimal] = None
    conforme: bool = True
    observaciones: Optional[str] = None
    accion_correctora: Optional[str] = None


@router.post("/registros", status_code=status.HTTP_201_CREATED)
async def create_registro_appcc(
    body: CreateRegistroAppccBody,
    current_user: dict = Depends(require_roles(ROLES_APPCC)),
):
    tc = body.tipo_control.strip().lower()
    if tc not in TIPOS_CONTROL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tipo_control no válido",
        )
    if not body.conforme:
        ac = (body.accion_correctora or "").strip()
        if not ac:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Acción correctora obligatoria cuando no conforme",
            )

    user_uuid = _uid(current_user)
    temp_val = body.temperatura
    if temp_val is not None:
        temp_val = temp_val.quantize(Decimal("0.01"), ROUND_HALF_UP)

    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            row_ins = await conn.fetchrow(
                """
                INSERT INTO registros_appcc (
                    outlet_id,
                    usuario_id,
                    tipo_control,
                    nombre_equipo,
                    temperatura,
                    conforme,
                    observaciones,
                    accion_correctora
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
                """,
                outlet_id,
                user_uuid,
                tc,
                body.nombre_equipo.strip() if body.nombre_equipo else None,
                temp_val,
                body.conforme,
                body.observaciones.strip() if body.observaciones else None,
                body.accion_correctora.strip() if body.accion_correctora else None,
            )
            rid = row_ins["id"]
            r2 = await conn.fetchrow(
                """
                SELECT
                    r.id,
                    r.outlet_id,
                    r.usuario_id,
                    r.tipo_control,
                    r.nombre_equipo,
                    r.temperatura,
                    r.conforme,
                    r.observaciones,
                    r.accion_correctora,
                    r.created_at,
                    COALESCE(u.nombre, 'Sistema') AS nombre_usuario
                FROM registros_appcc r
                LEFT JOIN usuarios u ON r.usuario_id = u.id
                WHERE r.id = $1
                """,
                rid,
            )
            return _serialize_registro(r2)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_registro_appcc: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/resumen-dia")
async def get_resumen_dia_appcc(
    current_user: dict = Depends(require_roles(ROLES_APPCC)),
):
    user_uuid = _uid(current_user)
    try:
        async with get_db() as conn:
            outlet_id = await _outlet_id_usuario(conn, user_uuid)
            tot = await conn.fetchrow(
                """
                SELECT
                    COUNT(*)::bigint AS total_registros,
                    COUNT(*) FILTER (WHERE conforme = TRUE)::bigint AS conformes,
                    COUNT(*) FILTER (WHERE conforme = FALSE)::bigint AS no_conformes
                FROM registros_appcc
                WHERE outlet_id = $1
                  AND DATE(created_at) = CURRENT_DATE
                """,
                outlet_id,
            )
            por_tipo_rows = await conn.fetch(
                """
                SELECT tipo_control, COUNT(*)::bigint AS cnt
                FROM registros_appcc
                WHERE outlet_id = $1
                  AND DATE(created_at) = CURRENT_DATE
                GROUP BY tipo_control
                """,
                outlet_id,
            )

        total = int(tot["total_registros"] or 0)
        conformes = int(tot["conformes"] or 0)
        no_conformes = int(tot["no_conformes"] or 0)

        if total > 0:
            pct = (
                (Decimal(conformes) / Decimal(total) * Decimal("100")).quantize(
                    Decimal("0.01"), ROUND_HALF_UP
                )
            )
        else:
            pct = Decimal("100.00")

        por_tipo: dict[str, int] = {}
        for r in por_tipo_rows:
            por_tipo[str(r["tipo_control"])] = int(r["cnt"] or 0)

        hoy = date.today()

        return {
            "fecha": hoy.isoformat(),
            "total_registros": total,
            "conformes": conformes,
            "no_conformes": no_conformes,
            "porcentaje_conformidad": float(pct),
            "por_tipo": por_tipo,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_resumen_dia_appcc: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
