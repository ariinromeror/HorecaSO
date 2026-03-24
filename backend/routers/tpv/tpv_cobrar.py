"""
TPV: cobro simple de ticket.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import get_current_user
from database import get_db
from services.verifactu_engine import crear_registro_verifactu

from .tpv_cobro_schemas import CobrarRequest
from .tpv_shared import (
    METODOS_PAGO,
    _get_user_tenant_outlet,
    _marcar_lineas_kds_servido,
    _ticket_to_dict,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/tickets/{ticket_id}/cobrar")
async def cobrar_ticket(
    ticket_id: UUID,
    body: CobrarRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Cobra ticket. Cambia estado a cobrado, guarda metodo_pago y cobrado_at.
    Cambia mesa a libre. Todo en la misma transacción.
    """
    if body.metodo_pago not in METODOS_PAGO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Método de pago inválido. Válidos: {', '.join(METODOS_PAGO)}",
        )

    async with get_db() as conn:
        ticket_row = await conn.fetchrow(
            "SELECT * FROM tickets WHERE id = $1",
            ticket_id,
        )
        if not ticket_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket no encontrado",
            )
        if ticket_row["estado"] != "abierto":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El ticket no está abierto",
            )

        await conn.execute(
            """
            UPDATE tickets
            SET estado = 'cobrado', metodo_pago = $1, cobrado_at = NOW()
            WHERE id = $2
            """,
            body.metodo_pago,
            ticket_id,
        )
        await _marcar_lineas_kds_servido(conn, ticket_id)
        await conn.execute(
            "UPDATE mesas SET estado = 'libre' WHERE id = $1",
            ticket_row["mesa_id"],
        )

        tenant_id, _ = await _get_user_tenant_outlet(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuario sin tenant asignado",
            )
        try:
            await crear_registro_verifactu(str(ticket_id), str(tenant_id), conn)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

        ticket_row = await conn.fetchrow(
            "SELECT * FROM tickets WHERE id = $1",
            ticket_id,
        )

    logger.info("Ticket %s cobrado con %s", ticket_id, body.metodo_pago)
    return _ticket_to_dict(ticket_row)
