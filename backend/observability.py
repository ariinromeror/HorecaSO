"""
Observabilidad — Sentry, logging JSON estructurado y request_id de correlación.
Fase 7 del PRD de hardening técnico (docs/../PRD.md).

Todo aquí es opcional/no-invasivo por diseño:
- Sentry solo se activa si `SENTRY_DSN` está configurado (nunca en tests/CI
  sin esa variable, ver `init_sentry`).
- El logging JSON estructurado sustituye a `logging.basicConfig`, pero el
  contenido de cada mensaje (`logger.info("...", args)`) no cambia — solo
  cambia el formato de salida.
"""

from __future__ import annotations

import contextvars
import logging
import uuid

from pythonjsonlogger.json import JsonFormatter
from starlette.middleware.base import BaseHTTPMiddleware

REQUEST_ID_HEADER = "X-Request-ID"

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default="-"
)


class _RequestIdLogFilter(logging.Filter):
    """Inyecta el request_id actual (contextvar) en cada registro de log."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def configure_logging(level: int = logging.INFO) -> None:
    """
    Logging JSON estructurado (un objeto JSON por línea) con `request_id` de
    correlación en cada entrada, para poder filtrar/agregar logs por request
    en cualquier herramienta externa que los ingiera (Render, Datadog, etc.).
    """
    handler = logging.StreamHandler()
    handler.setFormatter(
        JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(request_id)s %(message)s",
            rename_fields={
                "asctime": "timestamp",
                "levelname": "level",
                "name": "logger",
            },
        )
    )
    handler.addFilter(_RequestIdLogFilter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Genera un `request_id` por request (o reutiliza el que venga en el header
    `X-Request-ID`, útil detrás de un proxy/CDN que ya lo propague), lo deja
    disponible para los logs vía contextvar, y lo devuelve en la respuesta.
    """

    async def dispatch(self, request, call_next):
        incoming = request.headers.get(REQUEST_ID_HEADER)
        req_id = incoming or str(uuid.uuid4())
        token = request_id_var.set(req_id)
        try:
            response = await call_next(request)
        finally:
            request_id_var.reset(token)
        response.headers[REQUEST_ID_HEADER] = req_id
        return response


def init_sentry(dsn: str, environment: str, release: str) -> bool:
    """
    Inicializa Sentry si `dsn` no está vacío. No hace nada (ni importa
    `sentry_sdk` más allá de esta función) si no hay DSN configurado —
    así CI y entornos locales sin `SENTRY_DSN` arrancan exactamente igual
    que antes de esta fase.

    Devuelve True si Sentry quedó activado.
    """
    if not (dsn or "").strip():
        return False

    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        # Sin tracing de performance por defecto (no aporta valor sin plan de
        # pago de Sentry con volumen suficiente); solo captura de errores.
        traces_sample_rate=0.0,
        send_default_pii=False,
    )
    return True
