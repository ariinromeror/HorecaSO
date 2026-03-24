import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import get_current_user
from database import get_db

from .tpv_schemas import CreateTicketRequest
from .tpv_shared import (
    _get_user_tenant_outlet,
    _ticket_to_dict,
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/tickets")
async def create_ticket(
    body: CreateTicketRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Crea ticket. Verifica mesa libre. Cambia mesa a ocupada.
    Todo en la misma transacción.
    """
    async with get_db() as conn:
        tenant_id, user_outlet_id = await _get_user_tenant_outlet(
            conn, current_user["sub"]
        )
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant asignado",
            )

        # Verificar outlet pertenece al tenant
        outlet_row = await conn.fetchrow(
            "SELECT id, tenant_id FROM outlets WHERE id = $1",
            UUID(body.outlet_id),
        )
        if not outlet_row or str(outlet_row["tenant_id"]) != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Outlet no válido",
            )
        if user_outlet_id and user_outlet_id != body.outlet_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo puede crear tickets en su outlet",
            )

        # Verificar mesa existe y está libre
        mesa_row = await conn.fetchrow(
            """
            SELECT m.*, o.tenant_id
            FROM mesas m
            JOIN outlets o ON m.outlet_id = o.id
            WHERE m.id = $1 AND m.outlet_id = $2
            """,
            UUID(body.mesa_id),
            UUID(body.outlet_id),
        )
        if not mesa_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mesa no encontrada",
            )
        if mesa_row["estado"] != "libre":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mesa ya ocupada",
            )

        # Crear ticket y actualizar mesa
        ticket_row = await conn.fetchrow(
            """
            INSERT INTO tickets (outlet_id, mesa_id, camarero_id, estado)
            VALUES ($1, $2, $3, 'abierto')
            RETURNING *
            """,
            UUID(body.outlet_id),
            UUID(body.mesa_id),
            UUID(current_user["sub"]),
        )
        await conn.execute(
            "UPDATE mesas SET estado = 'ocupada' WHERE id = $1",
            UUID(body.mesa_id),
        )

    logger.info("Ticket creado: %s mesa %s", ticket_row["id"], body.mesa_id)
    return _ticket_to_dict(ticket_row)
