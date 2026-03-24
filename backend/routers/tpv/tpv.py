"""
Router TPV (tickets y líneas) para HorecaSO.
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

from . import tpv_lineas, tpv_tickets_create, tpv_tickets_detalle, tpv_tickets_list

router.include_router(tpv_tickets_create.router)
router.include_router(tpv_tickets_list.router)
router.include_router(tpv_tickets_detalle.router)
router.include_router(tpv_lineas.router)
