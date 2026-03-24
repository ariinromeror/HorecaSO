"""
Router inventario: movimientos de stock, alertas e inventario físico.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/inventario",
    tags=["Inventario"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

from . import inventario_movimientos_alertas, inventario_movimientos_core

router.include_router(inventario_movimientos_alertas.router)
router.include_router(inventario_movimientos_core.router)
