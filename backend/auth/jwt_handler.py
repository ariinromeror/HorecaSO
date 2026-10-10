"""
Manejo de JWT para HorecaSO (PyJWT, HSO-19).
Usa settings desde config.py.
"""

from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError

from config import settings

# Tope de duración aunque ACCESS_TOKEN_EXPIRE_MINUTES del entorno sea mayor.
MAX_TOKEN_MINUTES = 720


def create_access_token(data: dict) -> str:
    """Crea un JWT con expiración en ACCESS_TOKEN_EXPIRE_MINUTES (máx. 12 h).

    Valores None en el payload (p. ej. tenant_id / negocio_id para superadmin)
    se serializan como JSON null.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=min(settings.ACCESS_TOKEN_EXPIRE_MINUTES, MAX_TOKEN_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY_AUTH,
        algorithm=settings.ALGORITHM,
    )


def verify_token(token: str) -> dict | None:
    """Verifica el token y devuelve el payload. None si inválido.

    Tras decodificar, normaliza claims opcionales nulos para superadmin
    (algunas versiones u opciones de codificación pueden omitir claves con null).
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY_AUTH,
            algorithms=[settings.ALGORITHM],
        )
    except InvalidTokenError:
        return None

    if payload.get("role") == "superadmin":
        payload = dict(payload)
        payload.setdefault("tenant_id", None)
        payload.setdefault("negocio_id", None)

    return payload
