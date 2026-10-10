"""
Dependencias de autenticación para FastAPI.
"""

import json
import logging
import time
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.jwt_handler import verify_token
from database import get_db

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Caché por proceso del estado de usuario/tenant. La invalidación explícita solo
# afecta al worker que atiende el cambio; en los demás el cambio se aplica al
# caducar la entrada, así que este TTL es el retraso máximo de una revocación.
SESSION_CACHE_TTL_SECONDS = 10
_session_cache: dict[str, tuple[float, dict | None]] = {}


def invalidate_user_session(user_id) -> None:
    _session_cache.pop(str(user_id), None)


def invalidate_tenant_sessions(tenant_id) -> None:
    tid = str(tenant_id)
    for uid, (_, estado) in list(_session_cache.items()):
        if estado and estado["tenant_id"] == tid:
            _session_cache.pop(uid, None)


def clear_session_cache() -> None:
    _session_cache.clear()


async def _estado_sesion(user_id: str) -> dict | None:
    ahora = time.monotonic()
    cached = _session_cache.get(user_id)
    if cached and cached[0] > ahora:
        return cached[1]
    async with get_db() as conn:
        row = await conn.fetchrow(
            """
            SELECT u.activo, u.rol, u.tenant_id, t.activo AS tenant_activo
            FROM usuarios u
            LEFT JOIN tenants t ON t.id = u.tenant_id
            WHERE u.id = $1
            """,
            UUID(user_id),
        )
    estado = None
    if row:
        estado = {
            "activo": bool(row["activo"]),
            "rol": row["rol"],
            "tenant_id": str(row["tenant_id"]) if row["tenant_id"] else None,
            "tenant_activo": row["tenant_activo"],
        }
    _session_cache[user_id] = (ahora + SESSION_CACHE_TTL_SECONDS, estado)
    return estado


def _sesion_invalida(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Obtiene el usuario actual desde el token JWT y revalida en BD (con caché
    corta) que el usuario siga activo, con el mismo rol y tenant, y que el
    tenant no esté suspendido. HTTP 401 en cualquier otro caso.
    """
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        logger.warning("Token inválido o expirado")
        raise _sesion_invalida("Token inválido o expirado")

    user_id = str(payload.get("sub") or "")
    try:
        UUID(user_id)
    except ValueError:
        raise _sesion_invalida("Token inválido o expirado")

    try:
        estado = await _estado_sesion(user_id)
    except Exception as e:
        logger.error("Error en get_current_user: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        ) from e

    if not estado or not estado["activo"]:
        logger.warning("Sesión rechazada: usuario %s inexistente o desactivado", user_id)
        raise _sesion_invalida("Sesión no válida. Inicia sesión de nuevo.")
    if estado["rol"] != payload.get("role"):
        logger.warning("Sesión rechazada: rol de %s cambiado", user_id)
        raise _sesion_invalida("Tu rol ha cambiado. Inicia sesión de nuevo.")
    if estado["rol"] != "superadmin":
        if estado["tenant_activo"] is False:
            raise _sesion_invalida("Cuenta del local suspendida. Contacte con soporte.")
        if (payload.get("negocio_id") or None) != estado["tenant_id"]:
            logger.warning("Sesión rechazada: tenant de %s cambiado", user_id)
            raise _sesion_invalida("Sesión no válida. Inicia sesión de nuevo.")
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


def require_modulo(modulo: str):
    """
    Factory: Depends(require_modulo('fifo'))
    Comprueba tenants.modulos[modulo] == true para el tenant del JWT.
    Superadmin no usa módulos de tenant.
    Si modulos vacío/ausente → permite (compatibilidad tenants antiguos).
    """

    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        from uuid import UUID

        from database import get_db

        if current_user.get("role") == "superadmin":
            return current_user

        tenant_id = current_user.get("negocio_id") or current_user.get("tenant_id")
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant",
            )
        try:
            async with get_db() as conn:
                row = await conn.fetchrow(
                    "SELECT modulos FROM tenants WHERE id = $1",
                    UUID(str(tenant_id)),
                )
        except Exception as e:
            logger.error("require_modulo(%s): %s", modulo, e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error interno",
            ) from e

        if not row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant no encontrado",
            )
        modulos = row["modulos"]
        if modulos is None:
            return current_user
        if isinstance(modulos, str):
            # asyncpg devuelve jsonb como texto (el pool no registra codec JSON).
            try:
                modulos = json.loads(modulos)
            except ValueError:
                modulos = {}
        if hasattr(modulos, "keys"):
            modulos = dict(modulos)
        if not isinstance(modulos, dict) or len(modulos) == 0:
            return current_user
        if modulos.get(modulo) is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Módulo '{modulo}' no incluido en el plan",
            )
        return current_user

    return _check
