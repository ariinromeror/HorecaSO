"""
Router inventario: artículos CRUD y stock (listado).
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

from . import inventario_articulos_list, inventario_articulos_mutations

router.include_router(inventario_articulos_list.router)
router.include_router(inventario_articulos_mutations.router)
