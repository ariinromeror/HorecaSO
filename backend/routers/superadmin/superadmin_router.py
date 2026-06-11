"""
API superadmin — tenants y platform_logs.
Requiere migración Fase B: tenants.activo, tabla platform_logs.
"""

import logging
from datetime import date, datetime, time, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from auth.dependencies import require_superadmin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/superadmin",
    tags=["Superadmin"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


class TenantActivoBody(BaseModel):
    activo: bool = Field(..., description="Nuevo estado activo del tenant")


def _tenant_row_public(r) -> dict[str, Any]:
    return {
        "id": str(r["id"]),
        "nombre": r["nombre"],
        "nif": r["nif"],
        "plan": r["plan"],
        "activo": r["activo"] if r.get("activo") is not None else True,
        "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
    }


def _log_row_public(r) -> dict[str, Any]:
    det = r["detalle"]
    if det is not None and hasattr(det, "keys"):
        detalle = dict(det)
    else:
        detalle = det
    return {
        "id": str(r["id"]),
        "nivel": r["nivel"],
        "tenant_id": str(r["tenant_id"]) if r.get("tenant_id") else None,
        "usuario_id": str(r["usuario_id"]) if r.get("usuario_id") else None,
        "modulo": r["modulo"],
        "accion": r["accion"],
        "detalle": detalle,
        "ip": r.get("ip"),
        "user_agent": r.get("user_agent"),
        "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
    }


@router.get("/tenants")
async def list_tenants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_superadmin),
):
    """Lista paginada de tenants."""
    _ = current_user
    offset = (page - 1) * page_size
    try:
        async with get_db() as conn:
            total = await conn.fetchval("SELECT COUNT(*)::int FROM tenants")
            rows = await conn.fetch(
                """
                SELECT id, nombre, nif, plan, activo, created_at
                FROM tenants
                ORDER BY created_at DESC NULLS LAST, nombre ASC
                LIMIT $1 OFFSET $2
                """,
                page_size,
                offset,
            )
    except Exception as e:
        logger.error("list_tenants: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al listar tenants",
        ) from e

    return {
        "items": [_tenant_row_public(r) for r in rows],
        "page": page,
        "page_size": page_size,
        "total": int(total or 0),
    }


@router.get("/tenants/{tenant_id}")
async def get_tenant_detail(
    tenant_id: UUID,
    current_user: dict = Depends(require_superadmin),
):
    """Detalle de tenant: datos, outlets y conteo de usuarios activos."""
    _ = current_user
    try:
        async with get_db() as conn:
            t = await conn.fetchrow(
                """
                SELECT id, nombre, nif, plan, activo, created_at,
                       direccion, telefono, email, logo_url
                FROM tenants
                WHERE id = $1
                """,
                tenant_id,
            )
            if not t:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tenant no encontrado",
                )

            outlets = await conn.fetch(
                """
                SELECT id, nombre, num_mesas, created_at
                FROM outlets
                WHERE tenant_id = $1
                ORDER BY nombre ASC
                """,
                tenant_id,
            )

            usuarios_activos = await conn.fetchval(
                """
                SELECT COUNT(*)::int
                FROM usuarios
                WHERE tenant_id = $1 AND COALESCE(activo, true) = true
                """,
                tenant_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_tenant_detail: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener tenant",
        ) from e

    tenant_data = _tenant_row_public(t)
    tenant_data.update(
        {
            "direccion": t.get("direccion"),
            "telefono": t.get("telefono"),
            "email": t.get("email"),
            "logo_url": t.get("logo_url"),
        }
    )

    return {
        "tenant": tenant_data,
        "outlets": [
            {
                "id": str(o["id"]),
                "nombre": o["nombre"],
                "num_mesas": o["num_mesas"],
                "created_at": o["created_at"].isoformat() if o.get("created_at") else None,
            }
            for o in outlets
        ],
        "usuarios_activos_count": int(usuarios_activos or 0),
    }


@router.patch("/tenants/{tenant_id}/activo")
async def patch_tenant_activo(
    tenant_id: UUID,
    body: TenantActivoBody,
    current_user: dict = Depends(require_superadmin),
):
    """Activa o desactiva un tenant y registra en platform_logs."""
    actor_id = current_user.get("sub") or current_user.get("user_id")
    if not actor_id:
        logger.error("patch_tenant_activo: token sin sub/user_id")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    detalle = {"tenant_id": str(tenant_id), "activo": body.activo}

    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM tenants WHERE id = $1",
                tenant_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tenant no encontrado",
                )

            await conn.execute(
                """
                UPDATE tenants
                SET activo = $1
                WHERE id = $2
                """,
                body.activo,
                tenant_id,
            )

            await conn.execute(
                """
                INSERT INTO platform_logs (
                    nivel, tenant_id, usuario_id, modulo, accion, detalle
                )
                VALUES (
                    'info', $1::uuid, $2::uuid, $3, $4, $5::jsonb
                )
                """,
                tenant_id,
                UUID(actor_id),
                "superadmin",
                "set_tenant_activo",
                detalle,
            )

            updated = await conn.fetchrow(
                """
                SELECT id, nombre, nif, plan, activo, created_at
                FROM tenants
                WHERE id = $1
                """,
                tenant_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("patch_tenant_activo: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar tenant",
        ) from e

    return {
        "tenant": _tenant_row_public(updated),
        "accion": "set_tenant_activo",
    }


@router.get("/platform-logs")
async def list_platform_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    fecha_desde: date | None = Query(None, description="Incluir logs desde 00:00 UTC de esta fecha"),
    fecha_hasta: date | None = Query(
        None,
        description="Incluir logs hasta 23:59:59.999999 UTC de esta fecha (inclusive)",
    ),
    current_user: dict = Depends(require_superadmin),
):
    """Lista paginada de platform_logs con filtros de fecha opcionales."""
    _ = current_user
    offset = (page - 1) * page_size

    ts_desde: datetime | None = None
    ts_hasta_incl: datetime | None = None
    if fecha_desde is not None:
        ts_desde = datetime.combine(fecha_desde, time.min, tzinfo=timezone.utc)
    if fecha_hasta is not None:
        ts_hasta_incl = datetime.combine(
            fecha_hasta, time(23, 59, 59, 999999), tzinfo=timezone.utc
        )

    try:
        async with get_db() as conn:
            total = await conn.fetchval(
                """
                SELECT COUNT(*)::int FROM platform_logs
                WHERE ($1::timestamptz IS NULL OR created_at >= $1)
                  AND ($2::timestamptz IS NULL OR created_at <= $2)
                """,
                ts_desde,
                ts_hasta_incl,
            )
            rows = await conn.fetch(
                """
                SELECT id, nivel, tenant_id, usuario_id, modulo, accion, detalle,
                       ip, user_agent, created_at
                FROM platform_logs
                WHERE ($1::timestamptz IS NULL OR created_at >= $1)
                  AND ($2::timestamptz IS NULL OR created_at <= $2)
                ORDER BY created_at DESC NULLS LAST
                LIMIT $3 OFFSET $4
                """,
                ts_desde,
                ts_hasta_incl,
                page_size,
                offset,
            )
    except Exception as e:
        logger.error("list_platform_logs: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al listar platform_logs",
        ) from e

    return {
        "items": [_log_row_public(r) for r in rows],
        "page": page,
        "page_size": page_size,
        "total": int(total or 0),
    }
