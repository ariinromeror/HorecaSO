"""
Tokens JWT para tests, con los mismos claims que emite POST /api/auth/login
(routers/auth.py). Así se puede probar cualquier rol sin pasar por bcrypt.
"""

from datetime import datetime, timedelta, timezone

import jwt

from auth.jwt_handler import create_access_token
from config import settings
from tests.factories import SeedUser


def claims_for(user: SeedUser) -> dict:
    if user.rol == "superadmin":
        return {
            "sub": user.id,
            "user_id": user.id,
            "role": "superadmin",
            "negocio_id": None,
            "tenant_id": None,
        }
    return {
        "sub": user.id,
        "user_id": user.id,
        "role": user.rol,
        "negocio_id": user.tenant_id,
    }


def token_for(user: SeedUser, **overrides) -> str:
    """JWT válido para `user`. `overrides` permite falsear claims (p. ej. role='admin')."""
    claims = claims_for(user)
    claims.update(overrides)
    return create_access_token(claims)


def expired_token_for(user: SeedUser) -> str:
    claims = claims_for(user)
    claims["exp"] = datetime.now(timezone.utc) - timedelta(minutes=5)
    return jwt.encode(claims, settings.SECRET_KEY_AUTH, algorithm=settings.ALGORITHM)


def auth_headers(user_or_token: SeedUser | str, **overrides) -> dict[str, str]:
    token = user_or_token if isinstance(user_or_token, str) else token_for(user_or_token, **overrides)
    return {"Authorization": f"Bearer {token}"}
