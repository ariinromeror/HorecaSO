"""

Router de mesas para HorecaSO.

"""



from fastapi import APIRouter, Depends



from auth.dependencies import require_roles



from .mesas_list import ROLES_LISTADO_OPERATIVO, list_mesas_handler



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





from . import mesas_list, mesas_mutations



router.include_router(mesas_list.router)

router.include_router(mesas_mutations.router)


