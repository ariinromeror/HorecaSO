"""
Router de mesas para HorecaSO.
"""

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user, require_roles

from .mesas_list import ROLES_LISTADO_OPERATIVO, list_mesas_handler
from .mesas_shared import CreateMesaRequest

router = APIRouter(
    prefix="/api/mesas",
    tags=["Mesas"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


@router.get("", include_in_schema=False)
async def list_mesas_no_slash(
    current_user: dict = Depends(require_roles(ROLES_LISTADO_OPERATIVO)),
):
    return await list_mesas_handler(current_user)


from . import mesas_list, mesas_mutations  # noqa: E402

router.include_router(mesas_list.router)
router.include_router(mesas_mutations.router)


@router.post("", include_in_schema=False)
async def create_mesa_no_slash(
    body: CreateMesaRequest,
    current_user: dict = Depends(get_current_user),
):
    """Alias sin barra final: POST /api/mesas (el FE no usa trailing slash)."""
    return await mesas_mutations.create_mesa_handler(body, current_user)
