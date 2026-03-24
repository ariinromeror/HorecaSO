"""
Router facturas de proveedor y escaneo IA.
"""

from fastapi import APIRouter

router = APIRouter(
    tags=["Proveedores"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

from . import facturas_proveedor_escaneo, facturas_proveedor_list, facturas_proveedor_mutations

router.include_router(facturas_proveedor_list.router)
router.include_router(facturas_proveedor_mutations.router)
router.include_router(facturas_proveedor_escaneo.router)
