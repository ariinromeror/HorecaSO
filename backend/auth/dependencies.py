"""
Dependencias de autenticación para FastAPI.
"""

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.jwt_handler import verify_token
from database import get_db

logger = logging.getLogger(__name__)

# Fase 11 — margen de gracia tras un pago fallido (`past_due`) antes de
# bloquear el acceso del tenant. Ver require_active_subscription().
SUBSCRIPTION_GRACE_PERIOD_DAYS = 7

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


async def require_active_subscription(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Bloquea el acceso (402) si la suscripción Stripe del tenant no está en
    un estado que permita operar. Pensada para aplicarse como dependencia
    de *router* (no por endpoint) sobre los routers operativos del tenant en
    `main.py` — ver Fase 11 del PRD.

    Reglas:
    - `superadmin` nunca se bloquea (no gestiona su propia suscripción).
    - Usuarios sin tenant en el token (no debería ocurrir salvo superadmin)
      se dejan pasar; otras dependencias (`require_roles`) ya cubren ese caso.
    - `subscription_status IS NULL` = tenant "grandfathered" (nunca ha
      pasado por checkout de Stripe, p. ej. datos de prueba o tenants
      creados antes de esta fase) → acceso permitido, para no romper tenants
      existentes que todavía no se han dado de alta en Stripe.
    - `active` / `trialing` → acceso permitido.
    - `past_due` → acceso permitido durante `SUBSCRIPTION_GRACE_PERIOD_DAYS`
      días desde `current_period_end`; pasado ese margen, bloqueado.
    - `canceled` / `unpaid` / `incomplete` → bloqueado.
    """
    if current_user.get("role") == "superadmin":
        return current_user

    tenant_id_raw = current_user.get("negocio_id")
    if not tenant_id_raw:
        return current_user

    async with get_db() as conn:
        row = await conn.fetchrow(
            """
            SELECT subscription_status, current_period_end
            FROM tenants
            WHERE id = $1
            """,
            UUID(str(tenant_id_raw)),
        )

    if not row or row["subscription_status"] is None:
        return current_user

    estado = row["subscription_status"]
    if estado in ("active", "trialing"):
        return current_user

    if estado == "past_due" and row["current_period_end"] is not None:
        limite_con_gracia = row["current_period_end"] + timedelta(
            days=SUBSCRIPTION_GRACE_PERIOD_DAYS
        )
        if datetime.now(timezone.utc) <= limite_con_gracia:
            return current_user

    logger.warning(
        "Acceso bloqueado por suscripción '%s' (tenant %s)",
        estado,
        tenant_id_raw,
    )
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail="Suscripción inactiva o con pago pendiente. Regulariza el pago para continuar.",
    )
