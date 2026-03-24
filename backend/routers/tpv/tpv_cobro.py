"""
Router TPV: cobro, pagos parciales y Verifactu al cerrar ticket.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/api/tpv",
    tags=["TPV"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

from . import tpv_cobrar, tpv_pagos

router.include_router(tpv_cobrar.router)
router.include_router(tpv_pagos.router)
