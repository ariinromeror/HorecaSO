"""
Admin — usuarios del mismo tenant que el JWT (solo rol admin).
Emails de login: {localpart}@{email_slug}.com del tenant.
"""

import logging
import re
from typing import Literal
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from pydantic import BaseModel, Field

from auth.dependencies import invalidate_user_session, require_roles
from database import get_db
from services.audit_log import audit_config_change

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"])

ROLES_OPERATIVOS_ADMIN = frozenset(
    {
        "admin",
        "director",
        "jefe_sala",
        "camarero",
        "cocina",
        "barra",
        "almacen",
    }
)

RolOperativo = Literal[
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "barra",
    "almacen",
]

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin usuarios"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

require_admin_tenant = require_roles(["admin"])


def _tenant_uuid_from_jwt(current_user: dict) -> UUID:
    """Tenant del token (negocio_id / tenant_id); sin tenant → 403."""
    raw = current_user.get("negocio_id") or current_user.get("tenant_id")
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin tenant asignado en el token",
        )
    try:
        return UUID(str(raw))
    except ValueError:
        logger.warning("tenant_id JWT inválido: %s", raw)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token sin tenant válido",
        ) from None


def _normalize_localpart(raw: str) -> str:
    part = str(raw or "").strip().lower()
    if "@" in part:
        part = part.split("@", 1)[0]
    part = re.sub(r"[^a-z0-9._+-]+", "", part)
    if not part or len(part) > 64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parte local del email inválida",
        )
    return part


async def _tenant_email_slug(conn, tenant_id: UUID) -> str:
    slug = await conn.fetchval(
        "SELECT email_slug FROM tenants WHERE id = $1",
        tenant_id,
    )
    if not slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El local no tiene email_slug configurado",
        )
    return str(slug)


def _resolve_login_email(raw_email: str, email_slug: str) -> str:
    """Acepta localpart o email completo; fuerza @{email_slug}.com."""
    raw = str(raw_email or "").strip().lower()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email obligatorio",
        )
    expected_suffix = f"@{email_slug}.com"
    if "@" in raw:
        if not raw.endswith(expected_suffix):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El email debe terminar en {expected_suffix}",
            )
        local = _normalize_localpart(raw)
        return f"{local}{expected_suffix}"
    local = _normalize_localpart(raw)
    return f"{local}{expected_suffix}"


def _usuario_public_row(r) -> dict:
    return {
        "id": str(r["id"]),
        "nombre": r["nombre"],
        "email": r["email"],
        "rol": r["rol"],
        "outlet_id": str(r["outlet_id"]) if r.get("outlet_id") else None,
        "activo": r["activo"] if r.get("activo") is not None else True,
        "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
    }


class CreateUsuarioBody(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    rol: RolOperativo
    outlet_id: UUID | None = None


class PatchUsuarioBody(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=255)
    email: str | None = Field(None, min_length=1, max_length=255)
    rol: RolOperativo | None = None
    outlet_id: UUID | None = None
    activo: bool | None = None


@router.get("/usuarios")
async def list_usuarios(
    current_user: dict = Depends(require_admin_tenant),
):
    """Lista usuarios del mismo tenant que el JWT (sin password_hash)."""
    tenant_id = _tenant_uuid_from_jwt(current_user)
    try:
        async with get_db() as conn:
            rows = await conn.fetch(
                """
                SELECT id, nombre, email, rol, outlet_id, activo, created_at
                FROM usuarios
                WHERE tenant_id = $1
                  AND rol <> 'superadmin'
                ORDER BY nombre ASC
                """,
                tenant_id,
            )
    except Exception as e:
        logger.error("list_usuarios: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al listar usuarios",
        ) from e

    return {"items": [_usuario_public_row(r) for r in rows]}


@router.get("/outlets")
async def list_outlets_tenant(
    current_user: dict = Depends(require_admin_tenant),
):
    """Lista outlets (salas) del tenant — para asignar usuarios."""
    tenant_id = _tenant_uuid_from_jwt(current_user)
    try:
        async with get_db() as conn:
            rows = await conn.fetch(
                """
                SELECT id, nombre, num_mesas
                FROM outlets
                WHERE tenant_id = $1
                ORDER BY nombre ASC
                """,
                tenant_id,
            )
    except Exception as e:
        logger.error("list_outlets_tenant: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al listar outlets",
        ) from e

    return {
        "items": [
            {
                "id": str(r["id"]),
                "nombre": r["nombre"] or "Sala",
                "num_mesas": r["num_mesas"],
            }
            for r in rows
        ]
    }


@router.post("/usuarios", status_code=status.HTTP_201_CREATED)
async def create_usuario(
    body: CreateUsuarioBody,
    current_user: dict = Depends(require_admin_tenant),
):
    """Crea usuario en el mismo tenant; password hasheado como en auth."""
    tenant_id = _tenant_uuid_from_jwt(current_user)
    if body.rol not in ROLES_OPERATIVOS_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rol no permitido",
        )

    password_hash = pwd_context.hash(body.password)

    try:
        async with get_db() as conn:
            email_slug = await _tenant_email_slug(conn, tenant_id)
            email = _resolve_login_email(body.email, email_slug)

            if body.outlet_id is not None:
                ok = await conn.fetchval(
                    """
                    SELECT EXISTS(
                        SELECT 1 FROM outlets
                        WHERE id = $1 AND tenant_id = $2
                    )
                    """,
                    body.outlet_id,
                    tenant_id,
                )
                if not ok:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="outlet_id no pertenece al tenant",
                    )

            row = await conn.fetchrow(
                """
                INSERT INTO usuarios (
                    tenant_id, outlet_id, nombre, email, password_hash, rol, activo
                )
                VALUES ($1, $2, $3, $4, $5, $6, true)
                RETURNING id, nombre, email, rol, outlet_id, activo, created_at
                """,
                tenant_id,
                body.outlet_id,
                body.nombre.strip(),
                email,
                password_hash,
                body.rol,
            )
            await audit_config_change(
                conn,
                tenant_id=tenant_id,
                usuario_id=current_user.get("sub"),
                modulo="usuarios",
                accion="create_usuario",
                tabla="usuarios",
                operacion="INSERT",
                registro_id=row["id"],
                detalle={
                    "id": str(row["id"]),
                    "nombre": row["nombre"],
                    "email": row["email"],
                    "rol": row["rol"],
                    "activo": True,
                },
            )
    except HTTPException:
        raise
    except asyncpg.UniqueViolationError:
        logger.warning("create_usuario: email duplicado %s", body.email)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese email",
        ) from None
    except asyncpg.CheckViolationError as e:
        logger.error("create_usuario: CHECK violado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Datos de usuario no válidos para la base de datos",
        ) from e
    except Exception as e:
        logger.error("create_usuario: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear usuario",
        ) from e

    return _usuario_public_row(row)


@router.patch("/usuarios/{usuario_id}")
async def patch_usuario(
    usuario_id: UUID,
    body: PatchUsuarioBody,
    current_user: dict = Depends(require_admin_tenant),
):
    """Actualiza usuario del mismo tenant (no superadmin)."""
    tenant_id = _tenant_uuid_from_jwt(current_user)
    fields_set = body.model_fields_set

    if not fields_set:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sin campos para actualizar",
        )

    if "rol" in fields_set and body.rol is not None:
        if body.rol not in ROLES_OPERATIVOS_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rol no permitido",
            )

    try:
        async with get_db() as conn:
            existing = await conn.fetchrow(
                """
                SELECT id, rol FROM usuarios
                WHERE id = $1 AND tenant_id = $2
                """,
                usuario_id,
                tenant_id,
            )
            if not existing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado",
                )
            if existing["rol"] == "superadmin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No se puede editar este usuario",
                )

            if "outlet_id" in fields_set and body.outlet_id is not None:
                ok = await conn.fetchval(
                    """
                    SELECT EXISTS(
                        SELECT 1 FROM outlets
                        WHERE id = $1 AND tenant_id = $2
                    )
                    """,
                    body.outlet_id,
                    tenant_id,
                )
                if not ok:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="outlet_id no pertenece al tenant",
                    )

            sets: list[str] = []
            args: list = []
            if "nombre" in fields_set:
                if body.nombre is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="nombre inválido",
                    )
                args.append(body.nombre.strip())
                sets.append(f"nombre = ${len(args)}")
            if "email" in fields_set:
                if body.email is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="email inválido",
                    )
                email_slug = await _tenant_email_slug(conn, tenant_id)
                args.append(_resolve_login_email(body.email, email_slug))
                sets.append(f"email = ${len(args)}")
            if "rol" in fields_set:
                if body.rol is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="rol inválido",
                    )
                args.append(body.rol)
                sets.append(f"rol = ${len(args)}")
            if "outlet_id" in fields_set:
                if body.outlet_id is None:
                    sets.append("outlet_id = NULL")
                else:
                    args.append(body.outlet_id)
                    sets.append(f"outlet_id = ${len(args)}")
            if "activo" in fields_set:
                if body.activo is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="activo inválido",
                    )
                args.append(body.activo)
                sets.append(f"activo = ${len(args)}")

            args.append(usuario_id)
            idx_uid = len(args)
            args.append(tenant_id)
            idx_tid = len(args)

            row = await conn.fetchrow(
                f"""
                UPDATE usuarios
                SET {", ".join(sets)}
                WHERE id = ${idx_uid} AND tenant_id = ${idx_tid}
                RETURNING id, nombre, email, rol, outlet_id, activo, created_at
                """,
                *args,
            )
            if row:
                accion = "update_usuario"
                if "activo" in fields_set and body.activo is False:
                    accion = "desactivar_usuario"
                elif "activo" in fields_set and body.activo is True:
                    accion = "activar_usuario"
                await audit_config_change(
                    conn,
                    tenant_id=tenant_id,
                    usuario_id=current_user.get("sub"),
                    modulo="usuarios",
                    accion=accion,
                    tabla="usuarios",
                    operacion="UPDATE",
                    registro_id=usuario_id,
                    detalle={
                        "id": str(row["id"]),
                        "nombre": row["nombre"],
                        "email": row["email"],
                        "rol": row["rol"],
                        "activo": row["activo"],
                    },
                )
    except HTTPException:
        raise
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese email",
        ) from None
    except Exception as e:
        logger.error("patch_usuario: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar usuario",
        ) from e

    invalidate_user_session(usuario_id)
    return _usuario_public_row(row)
