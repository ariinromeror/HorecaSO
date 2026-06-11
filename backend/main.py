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
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from config import settings
from database import close_connection_pool, init_connection_pool, get_db
from routers.admin_carta.admin_carta import router as admin_carta_router
from routers.admin_carta.admin_carta import router_alergenos as alergenos_router
from routers.admin_carta.admin_productos import router as admin_productos_router
from routers.dashboard import router as dashboard_router
from routers.analytics.analytics_mesas import router as analytics_mesas_router
from routers.analytics.analytics_menu import router as analytics_menu_router
from routers.analytics.analytics_personal import router as analytics_personal_router
from routers.recetas.admin_recetas import router as admin_recetas_router
from routers.recetas.admin_recetas_ingredientes import (
    router as admin_recetas_ingredientes_router,
)
from routers.costes.admin_gastos_operativos import router as admin_gastos_operativos_router
from routers.auth import router as auth_router
from routers.carta import router_publica as carta_publica_router
from routers.carta import router_tpv as carta_tpv_router
from routers.mesas import router as mesas_router
from routers.tpv.tpv import router as tpv_router
from routers.tpv.tpv_cobro import router as tpv_cobro_router
from routers.verifactu import router as verifactu_router
from routers.inventario.inventario import router as inventario_router
from routers.inventario.inventario_movimientos import (
    router as inventario_movimientos_router,
)
from routers.kds.kds import router as kds_router
from routers.kds.kds_estados import router as kds_estados_router
from routers.proveedores.proveedores import router as proveedores_router
from routers.proveedores.facturas_proveedor import router as facturas_proveedor_router
from routers.empleados.empleados import router as empleados_router
from routers.empleados.fichajes import router as fichajes_router
from routers.empleados.cuadrantes import router as cuadrantes_router
from routers.empleados.ausencias import router as ausencias_router
from routers.nominas import router as nominas_router
from routers.reservas.reservas import router as reservas_router
from routers.reservas.lista_espera import lista_espera_router
from routers.clientes.clientes import router as clientes_router
from routers.clientes.clientes_historial import router as clientes_historial_router
from routers.appcc import router as appcc_router
from routers.fifo.fifo import router as fifo_router
from routers.fifo.fifo_consumo import router as fifo_consumo_router
from routers.reportes.reportes import router as reportes_router
from routers.admin_usuarios import router as admin_usuarios_router
from routers.superadmin import router as superadmin_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Cabeceras HTTP recomendadas en producción (§1.2 GUIA_PRODUCCION_COMPLETA)."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        return response


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
    is_prod = (settings.ENVIRONMENT or "").strip().lower() == "production"
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        lifespan=lifespan,
        redirect_slashes=False,
        docs_url=None if is_prod else "/docs",
        redoc_url=None if is_prod else "/redoc",
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
    app.add_middleware(SecurityHeadersMiddleware)

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
    app.include_router(tpv_cobro_router)
    app.include_router(verifactu_router)
    app.include_router(carta_tpv_router)
    app.include_router(carta_publica_router)
    app.include_router(admin_carta_router)
    app.include_router(admin_productos_router)
    app.include_router(admin_usuarios_router)
    app.include_router(alergenos_router)
    app.include_router(admin_recetas_router)
    app.include_router(admin_recetas_ingredientes_router)
    app.include_router(admin_gastos_operativos_router)
    app.include_router(inventario_router, prefix="/api")
    app.include_router(inventario_movimientos_router, prefix="/api")
    app.include_router(kds_router, prefix="/api")
    app.include_router(kds_estados_router, prefix="/api")
    app.include_router(dashboard_router)
    app.include_router(analytics_mesas_router, prefix="/api")
    app.include_router(analytics_menu_router, prefix="/api")
    app.include_router(analytics_personal_router, prefix="/api")
    app.include_router(proveedores_router, prefix="/api")
    app.include_router(facturas_proveedor_router, prefix="/api")
    app.include_router(empleados_router, prefix="/api")
    app.include_router(fichajes_router, prefix="/api")
    app.include_router(cuadrantes_router, prefix="/api")
    app.include_router(ausencias_router, prefix="/api")
    app.include_router(nominas_router, prefix="/api")
    app.include_router(reservas_router, prefix="/api")
    app.include_router(lista_espera_router, prefix="/api")
    app.include_router(clientes_router, prefix="/api")
    app.include_router(clientes_historial_router, prefix="/api")
    app.include_router(appcc_router, prefix="/api")
    app.include_router(fifo_router, prefix="/api")
    app.include_router(fifo_consumo_router, prefix="/api")
    app.include_router(reportes_router, prefix="/api")
    app.include_router(superadmin_router)

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
