"""
Rate limiting (SlowAPI) en módulo propio para evitar imports circulares con main.

IP del cliente: última entrada de X-Forwarded-For. La añade el proxy de la
plataforma (Render/Railway) y el cliente no puede falsificarla; las entradas
a su izquierda sí las escribe el cliente. Solo es fiable si la app no es
accesible directamente sin pasar por ese proxy.

Almacenamiento en memoria: con N workers de gunicorn el límite real es N veces
el configurado (cada proceso cuenta por separado).
"""

import logging

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from limits import parse
from limits.storage import MemoryStorage
from limits.strategies import MovingWindowRateLimiter
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

LOGIN_LIMIT_POR_IP = "30/minute"
LOGIN_LIMIT_POR_CUENTA = parse("5/minute")
DETALLE_429 = "Demasiados intentos de inicio de sesión. Espera un minuto y vuelve a intentarlo."


def client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        ultima = xff.split(",")[-1].strip()
        if ultima:
            return ultima
    return get_remote_address(request)


limiter = Limiter(key_func=client_ip)

_cuenta_storage = MemoryStorage()
_cuenta_limiter = MovingWindowRateLimiter(_cuenta_storage)


def check_login_por_cuenta(request: Request, email: str) -> None:
    """5/minuto por IP + email. HTTP 429 si se supera."""
    ip = client_ip(request)
    if not _cuenta_limiter.hit(LOGIN_LIMIT_POR_CUENTA, "login", ip, email.strip().lower()):
        logger.warning("Rate limit login (cuenta) ip=%s", ip)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=DETALLE_429)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    logger.warning("Rate limit %s ip=%s", request.url.path, client_ip(request))
    return JSONResponse(status_code=status.HTTP_429_TOO_MANY_REQUESTS, content={"detail": DETALLE_429})


def reset_rate_limits() -> None:
    limiter.reset()
    _cuenta_storage.reset()
