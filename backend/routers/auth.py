"""
Router de autenticación.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import get_current_user
from auth.schemas import LoginRequest, TokenResponse
from auth.jwt_handler import create_access_token
from database import get_db
from passlib.context import CryptContext

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
async def login(login_data: LoginRequest):
    """
    Login: verifica email/password y devuelve JWT.
    HTTP 401 si credenciales incorrectas.
    """
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


@router.get("/perfil")
async def get_perfil(current_user: dict = Depends(get_current_user)):
    """
    Devuelve el perfil del usuario autenticado.
    HTTP 404 si no existe el usuario.
    """
    async with get_db() as conn:
        row = await conn.fetchrow(
            """
            SELECT u.id, u.nombre, u.email, u.rol, u.tenant_id, u.outlet_id, u.activo,
                   t.modulos AS tenant_modulos,
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

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    modulos = row["tenant_modulos"]
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
