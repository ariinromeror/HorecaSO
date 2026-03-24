"""
Reservas por outlet.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query

from auth.dependencies import require_roles

from .reservas_read import ROLES_LISTADO_OPERATIVO, do_list_reservas

router = APIRouter(
    prefix="/reservas",
    tags=["Reservas"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


@router.get("", include_in_schema=False)
async def list_reservas_no_slash(
    fecha: Optional[date] = Query(None),
    estado: Optional[str] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_LISTADO_OPERATIVO)),
):
    return await do_list_reservas(
        fecha, estado, fecha_desde, fecha_hasta, current_user
    )


from . import reservas_read, reservas_write

router.include_router(reservas_read.router)
router.include_router(reservas_write.router)
