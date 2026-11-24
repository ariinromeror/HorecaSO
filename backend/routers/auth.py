"""
Router de autenticación.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth.dependencies import get_current_user
from auth.schemas import LoginRequest, TokenResponse
from auth.jwt_handler import create_access_token
from config import settings
from database import get_db
from passlib.context import CryptContext
from rate_limit import LOGIN_LIMIT_POR_IP, check_login_por_cuenta, limiter

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"])

router = APIRouter(
    prefix="/api/auth",
    tags=["Auth"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(LOGIN_LIMIT_POR_IP)
async def login(request: Request, login_data: LoginRequest):
    """
    Login: verifica email/password y devuelve JWT.
    HTTP 401 si credenciales incorrectas. HTTP 429 si se supera el límite de intentos.
    """
    check_login_por_cuenta(request, login_data.email)
    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                """
                SELECT u.id, u.tenant_id, u.outlet_id, u.nombre, u.email,
                       u.password_hash, u.rol,
                       t.activo AS tenant_activo
                FROM usuarios u
                LEFT JOIN tenants t ON t.id = u.tenant_id
                WHERE u.email = $1 AND u.activo = true
                """,
                login_data.email,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en login: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        ) from e

    if not row:
        logger.warning("Login fallido: usuario no encontrado o inactivo")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    if not pwd_context.verify(login_data.password, row["password_hash"]):
        logger.warning("Login fallido: password incorrecta")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    rol = row["rol"]
    if rol != "superadmin":
        tenant_activo = row["tenant_activo"]
        if tenant_activo is False:
            logger.warning("Login bloqueado: tenant suspendido %s", row["tenant_id"])
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cuenta del local suspendida. Contacte con soporte.",
            )

    if rol == "superadmin":
        token_data = {
            "sub": str(row["id"]),
            "user_id": str(row["id"]),
            "role": "superadmin",
            "negocio_id": None,
            "tenant_id": None,
        }
        negocio_id_resp = None
    else:
        token_data = {
            "sub": str(row["id"]),
            "user_id": str(row["id"]),
            "role": rol,
            "negocio_id": str(row["tenant_id"]) if row["tenant_id"] else None,
        }
        negocio_id_resp = str(row["tenant_id"]) if row["tenant_id"] else None

    access_token = create_access_token(token_data)

    logger.info("Login exitoso: %s", login_data.email)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=str(row["id"]),
        role=rol,
        negocio_id=negocio_id_resp,
    )


# Cuentas del tenant de prueba (migration_fase_b.sql). No tienen contraseña
# utilizable: neon_apply.py les pone un hash aleatorio descartado, así que solo
# se entra por este endpoint.
DEMO_EMAILS = {
    "admin": "admin@prueba.com",
    "camarero": "camarero@prueba.com",
    "cocina": "cocina@prueba.com",
}
DEMO_LIMIT_POR_IP = "20/minute"


@router.post("/demo/{rol}", response_model=TokenResponse)
@limiter.limit(DEMO_LIMIT_POR_IP)
async def login_demo(request: Request, rol: str):
    """Acceso de demostración sin contraseña. 404 si DEMO_MODE está apagado."""
    if not settings.DEMO_MODE or rol not in DEMO_EMAILS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No encontrado")

    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                """
                SELECT u.id, u.tenant_id, u.rol, t.activo AS tenant_activo
                FROM usuarios u
                JOIN tenants t ON t.id = u.tenant_id
                WHERE u.email = $1 AND u.rol = $2 AND u.activo = true
                """,
                DEMO_EMAILS[rol],
                rol,
            )
    except Exception as e:
        logger.error("Error en login demo: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno"
        ) from e

    if not row or row["tenant_activo"] is False:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No encontrado")

    negocio_id = str(row["tenant_id"])
    access_token = create_access_token(
        {
            "sub": str(row["id"]),
            "user_id": str(row["id"]),
            "role": row["rol"],
            "negocio_id": negocio_id,
            "demo": True,
        }
    )
    logger.info("Login demo: %s", rol)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=str(row["id"]),
        role=row["rol"],
        negocio_id=negocio_id,
    )


@router.get("/perfil")
async def get_perfil(current_user: dict = Depends(get_current_user)):
    """
    Devuelve el perfil del usuario autenticado.
    HTTP 404 si no existe el usuario.
    """
    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                """
                SELECT u.id, u.nombre, u.email, u.rol, u.tenant_id, u.outlet_id, u.activo,
                       t.modulos AS tenant_modulos,
                       t.email_slug AS tenant_email_slug,
                       t.nombre AS tenant_nombre,
                       (SELECT e.id FROM empleados e
                        WHERE e.usuario_id = u.id AND COALESCE(e.activo, true)
                        ORDER BY e.id
                        LIMIT 1) AS empleado_id
                FROM usuarios u
                LEFT JOIN tenants t ON t.id = u.tenant_id
                WHERE u.id = $1
                """,
                current_user["sub"],
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_perfil: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        ) from e

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    modulos = row["tenant_modulos"]
    if isinstance(modulos, str):
        try:
            modulos = json.loads(modulos)
        except (json.JSONDecodeError, TypeError):
            modulos = {}
    if modulos is not None and hasattr(modulos, "keys"):
        modulos = dict(modulos)
    elif not isinstance(modulos, dict):
        modulos = {}

    return {
        "id": str(row["id"]),
        "nombre": row["nombre"],
        "email": row["email"],
        "rol": row["rol"],
        "tenant_id": str(row["tenant_id"]) if row["tenant_id"] else None,
        "outlet_id": str(row["outlet_id"]) if row["outlet_id"] else None,
        "activo": row["activo"],
        "empleado_id": str(row["empleado_id"]) if row.get("empleado_id") else None,
        "modulos": modulos,
        "email_slug": row["tenant_email_slug"],
        "tenant_nombre": row["tenant_nombre"],
    }


@router.get("/verify")
async def verify(current_user: dict = Depends(get_current_user)):
    """
    Verifica que el token JWT sea válido.
    No hace query a DB.
    """
    return {
        "valid": True,
        "user_id": current_user["sub"],
        "role": current_user.get("role"),
    }
