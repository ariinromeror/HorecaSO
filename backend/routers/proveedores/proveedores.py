"""
Router proveedores (CRUD) para HorecaSO.
"""

from fastapi import APIRouter

router = APIRouter(
    tags=["Proveedores"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

from . import proveedores_list, proveedores_mutations

router.include_router(proveedores_list.router)
router.include_router(proveedores_mutations.router)
