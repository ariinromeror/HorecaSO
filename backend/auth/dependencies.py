"""
Dependencias de autenticación para FastAPI.
"""

import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.jwt_handler import verify_token

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Obtiene el usuario actual desde el token JWT. HTTP 401 si inválido."""
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        logger.warning("Token inválido o expirado")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )
    return payload


async def require_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Verifica que el usuario tenga role admin. HTTP 403 si no."""
    if current_user.get("role") != "admin":
        logger.warning("Acceso denegado: se requiere rol admin")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol admin",
        )
    return current_user


def require_roles(allowed_roles: list[str]):
    """
    Factory: Depends(require_roles(['director', 'admin']))
    El JWT usa la clave 'role' (valor = rol de usuarios.rol).
    tenant_id / negocio_id pueden ser None (p. ej. rol superadmin); no se validan aquí.
    """

    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        role = current_user.get("role")
        if role not in allowed_roles:
            logger.warning(
                "Acceso denegado: rol %s no permitido (requerido: %s)",
                role,
                allowed_roles,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No autorizado para esta operación",
            )
        return current_user

    return _check


require_superadmin = require_roles(["superadmin"])
