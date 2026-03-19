"""
HorecaSO ERP — FastAPI application factory.
Patrón InfoCampus — producción.
"""

# Bcrypt compatibility shim: passlib 1.7.4 con bcrypt 4.x
# Debe ejecutarse ANTES de importar passlib
import bcrypt

bcrypt.__about__ = bcrypt

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from config import settings
from database import close_connection_pool, init_connection_pool, get_db
from routers.admin_carta import router as admin_carta_router
from routers.admin_carta import router_alergenos as alergenos_router
from routers.dashboard import router as dashboard_router
from routers.admin_recetas import router as admin_recetas_router
from routers.auth import router as auth_router
from routers.carta import router_publica as carta_publica_router
from routers.carta import router_tpv as carta_tpv_router
from routers.mesas import router as mesas_router
from routers.tpv import router as tpv_router
from routers.verifactu import router as verifactu_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan: init pool al arrancar, close al cerrar."""
    await init_connection_pool()
    try:
        yield
    finally:
        await close_connection_pool()


def create_app() -> FastAPI:
    """App factory."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # CORS dinámico
    origins = settings.allowed_origins_list
    if not origins:
        origins = ["*"]
        allow_credentials = False
    else:
        allow_credentials = True

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global exception handler — 500 sin stack trace (HTTPException se re-lanza)
    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        if isinstance(exc, HTTPException):
            raise exc
        logger.error("Error no controlado: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Error interno del servidor"},
        )

    @app.get("/")
    async def root():
        """Root endpoint con info básica."""
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }

    app.include_router(auth_router)
    app.include_router(mesas_router)
    app.include_router(tpv_router)
    app.include_router(verifactu_router)
    app.include_router(carta_tpv_router)
    app.include_router(carta_publica_router)
    app.include_router(admin_carta_router)
    app.include_router(alergenos_router)
    app.include_router(admin_recetas_router)
    app.include_router(dashboard_router)

    @app.get("/api/health")
    async def health_check():
        """Health check — verifica conexión a DB con SELECT 1."""
        try:
            async with get_db() as conn:
                await conn.fetchval("SELECT 1")
            return {"status": "ok"}
        except Exception as e:
            logger.error("Health check fallido: %s", e)
            return JSONResponse(
                status_code=503,
                content={"status": "error", "detail": "DB no disponible"},
            )

    return app


app = create_app()
