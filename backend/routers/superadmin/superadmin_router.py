"""
API superadmin — tenants y platform_logs.
Requiere migración Fase B: tenants.activo, tabla platform_logs.
"""

import json
import logging
from datetime import date, datetime, time, timezone
from typing import Any, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field

from auth.dependencies import require_superadmin
from database import get_db

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"])

router = APIRouter(
    prefix="/api/superadmin",
    tags=["Superadmin"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

DEFAULT_MODULOS = {
    "sala": True,
    "tpv": True,
    "kds": True,
    "carta": True,
    "inventario": True,
    "reservas": True,
    "reportes": True,
    "fifo": False,
    "nominas": False,
    "ia_facturas": False,
    "predicciones": False,
    "empleados": True,
    "proveedores": True,
    "clientes": True,
    "appcc": True,
}


class TenantActivoBody(BaseModel):
    activo: bool = Field(..., description="Nuevo estado activo del tenant")


class TenantCreateBody(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    nif: str = Field(..., min_length=5, max_length=20)
    razon_social: Optional[str] = None
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = None
    ciudad: Optional[str] = None
    provincia: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    plan: str = "basico"
    serie_facturacion: str = "A"
    outlet_nombre: str = "Sala Principal"
    admin_nombre: str = Field(..., min_length=1)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)
    modulos: Optional[dict[str, bool]] = None


class TenantPatchBody(BaseModel):
    nombre: Optional[str] = None
    nif: Optional[str] = None
    razon_social: Optional[str] = None
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = None
    ciudad: Optional[str] = None
    provincia: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    plan: Optional[str] = None
    serie_facturacion: Optional[str] = None
    modulos: Optional[dict[str, bool]] = None
    activo: Optional[bool] = None


def _safe_col(r, key, default=None):
    try:
        if key in r.keys():
            return r[key]
    except Exception:
        pass
    return default


def _tenant_row_public(r) -> dict[str, Any]:
    modulos = _safe_col(r, "modulos")
    if modulos is not None and hasattr(modulos, "keys"):
        modulos = dict(modulos)
    created = _safe_col(r, "created_at")
    return {
        "id": str(r["id"]),
        "nombre": r["nombre"],
        "nif": r["nif"],
        "plan": r["plan"],
        "activo": True if _safe_col(r, "activo") is None else bool(_safe_col(r, "activo")),
        "created_at": created.isoformat() if created else None,
        "razon_social": _safe_col(r, "razon_social"),
        "codigo_postal": _safe_col(r, "codigo_postal"),
        "ciudad": _safe_col(r, "ciudad"),
        "provincia": _safe_col(r, "provincia"),
        "serie_facturacion": _safe_col(r, "serie_facturacion"),
        "direccion": _safe_col(r, "direccion"),
        "telefono": _safe_col(r, "telefono"),
        "email": _safe_col(r, "email"),
        "logo_url": _safe_col(r, "logo_url"),
        "modulos": modulos,
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
                SELECT id, nombre, nif, plan, activo, created_at,
                       razon_social, codigo_postal, ciudad, provincia,
                       serie_facturacion, modulos
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
                       direccion, telefono, email, logo_url,
                       razon_social, codigo_postal, ciudad, provincia,
                       serie_facturacion, modulos
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


@router.post("/tenants", status_code=status.HTTP_201_CREATED)
async def create_tenant(
    body: TenantCreateBody,
    current_user: dict = Depends(require_superadmin),
):
    """Crea tenant + outlet por defecto + usuario admin inicial."""
    actor_id = current_user.get("sub") or current_user.get("user_id")
    tenant_id = uuid4()
    outlet_id = uuid4()
    user_id = uuid4()
    modulos = {**DEFAULT_MODULOS, **(body.modulos or {})}
    password_hash = pwd_context.hash(body.admin_password)
    razon = body.razon_social or body.nombre

    try:
        async with get_db() as conn:
            async with conn.transaction():
                exists = await conn.fetchval(
                    "SELECT 1 FROM usuarios WHERE email = $1",
                    str(body.admin_email).lower(),
                )
                if exists:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Email de admin ya registrado",
                    )
                await conn.execute(
                    """
                    INSERT INTO tenants (
                        id, nombre, nif, direccion, telefono, email, plan, activo,
                        razon_social, codigo_postal, ciudad, provincia,
                        serie_facturacion, modulos
                    )
                    VALUES (
                        $1, $2, $3, $4, $5, $6, $7, true,
                        $8, $9, $10, $11, $12, $13::jsonb
                    )
                    """,
                    tenant_id,
                    body.nombre,
                    body.nif,
                    body.direccion,
                    body.telefono,
                    body.email,
                    body.plan,
                    razon,
                    body.codigo_postal,
                    body.ciudad,
                    body.provincia,
                    body.serie_facturacion,
                    json.dumps(modulos),
                )
                await conn.execute(
                    """
                    INSERT INTO outlets (id, tenant_id, nombre, num_mesas)
                    VALUES ($1, $2, $3, 10)
                    """,
                    outlet_id,
                    tenant_id,
                    body.outlet_nombre,
                )
                await conn.execute(
                    """
                    INSERT INTO usuarios (
                        id, tenant_id, outlet_id, nombre, email,
                        password_hash, rol, activo
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 'admin', true)
                    """,
                    user_id,
                    tenant_id,
                    outlet_id,
                    body.admin_nombre,
                    str(body.admin_email).lower(),
                    password_hash,
                )
                if actor_id:
                    await conn.execute(
                        """
                        INSERT INTO platform_logs (
                            nivel, tenant_id, usuario_id, modulo, accion, detalle
                        )
                        VALUES (
                            'info', $1::uuid, $2::uuid, 'superadmin',
                            'create_tenant', $3::jsonb
                        )
                        """,
                        tenant_id,
                        UUID(str(actor_id)),
                        json.dumps({"tenant_id": str(tenant_id), "admin_email": str(body.admin_email)}),
                    )
                row = await conn.fetchrow(
                    """
                    SELECT id, nombre, nif, plan, activo, created_at,
                           razon_social, codigo_postal, ciudad, provincia,
                           serie_facturacion, modulos, direccion, telefono, email
                    FROM tenants WHERE id = $1
                    """,
                    tenant_id,
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_tenant: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear tenant",
        ) from e

    return {
        "tenant": _tenant_row_public(row),
        "outlet_id": str(outlet_id),
        "admin_user_id": str(user_id),
        "admin_email": str(body.admin_email).lower(),
    }


@router.patch("/tenants/{tenant_id}")
async def patch_tenant(
    tenant_id: UUID,
    body: TenantPatchBody,
    current_user: dict = Depends(require_superadmin),
):
    """Actualiza datos fiscales, plan y módulos del tenant."""
    _ = current_user
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sin campos para actualizar",
        )
    try:
        async with get_db() as conn:
            exists = await conn.fetchval(
                "SELECT 1 FROM tenants WHERE id = $1", tenant_id
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tenant no encontrado",
                )
            sets = []
            args: list[Any] = []
            for key, val in fields.items():
                args.append(json.dumps(val) if key == "modulos" else val)
                placeholder = f"${len(args)}"
                if key == "modulos":
                    sets.append(f"modulos = {placeholder}::jsonb")
                else:
                    sets.append(f"{key} = {placeholder}")
            args.append(tenant_id)
            sql = (
                "UPDATE tenants SET "
                + ", ".join(sets)
                + f" WHERE id = ${len(args)} RETURNING id, nombre, nif, plan, activo, created_at, "
                "razon_social, codigo_postal, ciudad, provincia, serie_facturacion, "
                "modulos, direccion, telefono, email, logo_url"
            )
            row = await conn.fetchrow(sql, *args)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("patch_tenant: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar tenant",
        ) from e

    return {"tenant": _tenant_row_public(row)}


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
