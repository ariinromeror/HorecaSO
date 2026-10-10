"""Routers de plataforma — rol superadmin."""

from .superadmin_router import router
from .superadmin_acuerdos import router as acuerdos_router

__all__ = ["router", "acuerdos_router"]
