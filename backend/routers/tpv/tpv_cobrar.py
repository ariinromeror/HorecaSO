"""
TPV: cobro simple de ticket.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth.dependencies import require_roles
from database import get_db
from rate_limit import limiter
from services.verifactu_engine import crear_registro_verifactu

from .tpv_cobro_schemas import CobrarRequest
from .tpv_shared import (
    METODOS_PAGO,
    _marcar_lineas_kds_servido,
    _require_ticket_tpv_access,
    _ticket_to_dict,
)

logger = logging.getLogger(__name__)

router = APIRouter()

ROLES_TPV_COBRO = ["admin", "camarero", "jefe_sala"]


@router.post("/tickets/{ticket_id}/cobrar")
@limiter.limit("60/minute")
async def cobrar_ticket(
    request: Request,
    ticket_id: UUID,
    body: CobrarRequest,
    current_user: dict = Depends(require_roles(ROLES_TPV_COBRO)),
):
    """
    Cobra ticket. Cambia estado a cobrado, guarda metodo_pago y cobrado_at.
    Cambia mesa a libre. Todo en la misma transacción.
    Límite generoso (60/min por IP) para no interferir con el uso normal
    en hora punta desde la misma IP de local (varios TPV compartiendo salida NAT).
    """
    if body.metodo_pago not in METODOS_PAGO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Método de pago inválido. Válidos: {', '.join(METODOS_PAGO)}",
        )

    async with get_db() as conn:
        ticket_row = await _require_ticket_tpv_access(
            conn, ticket_id, current_user["sub"]
        )
        if ticket_row["estado"] != "abierto":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El ticket no está abierto",
            )

        # tenant_id del propio ticket (no del usuario) — evita registrar el
        # Verifactu con un tenant_id distinto si en el futuro un usuario
        # pudiera operar sobre outlets de más de un tenant.
        tenant_id = str(ticket_row["outlet_tenant_id"])

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

        try:
            await crear_registro_verifactu(str(ticket_id), tenant_id, conn)
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
