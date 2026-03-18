"""
Manejo de JWT para HorecaSO.
Usa settings desde config.py.
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from config import settings


def create_access_token(data: dict) -> str:
    """Crea un JWT con expiración en ACCESS_TOKEN_EXPIRE_MINUTES."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode["exp"] = expire
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY_AUTH,
        algorithm=settings.ALGORITHM,
    )


def verify_token(token: str) -> dict | None:
    """Verifica el token y devuelve el payload. None si inválido."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY_AUTH,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError:
        return None
