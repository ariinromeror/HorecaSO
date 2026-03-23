"""
Router TPV: cobro, pagos parciales y Verifactu al cerrar ticket.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.dependencies import get_current_user, require_roles
from database import get_db
from services.verifactu_engine import crear_registro_verifactu

from routers.tpv_shared import (
    METODOS_PAGO,
    _completar_cobro_mixto_verifactu,
    _decimal_respuesta_dinero,
    _get_user_tenant_outlet,
    _marcar_lineas_kds_servido,
    _require_ticket_tpv_access,
    _sum_pagos_ticket,
    _ticket_to_dict,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/tpv",
    tags=["TPV"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


class CobrarRequest(BaseModel):
    """Body para cobrar ticket."""

    metodo_pago: str


class AddTicketPagoRequest(BaseModel):
    """Body para registrar un pago parcial (división de cuenta)."""

    importe: Decimal
    metodo_pago: str


ROLES_TPV_PAGOS = ("admin", "camarero", "jefe_sala")


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


@router.post("/tickets/{ticket_id}/pagos")
async def add_ticket_pago(
    ticket_id: UUID,
    body: AddTicketPagoRequest,
    current_user: dict = Depends(require_roles(list(ROLES_TPV_PAGOS))),
):
    """Registra un pago parcial; si la suma cubre el total, cierra ticket y Verifactu."""
    if body.metodo_pago not in METODOS_PAGO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Método de pago inválido. Válidos: {', '.join(METODOS_PAGO)}",
        )
    try:
        async with get_db() as conn:
            ticket_row = await _require_ticket_tpv_access(
                conn, ticket_id, current_user["sub"]
            )
            if ticket_row["estado"] != "abierto":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El ticket no está abierto",
                )

            importe = Decimal(str(body.importe)).quantize(
                Decimal("0.01"), ROUND_HALF_UP
            )
            if importe <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El importe debe ser mayor que cero",
                )

            ticket_total = Decimal(str(ticket_row["total"])).quantize(
                Decimal("0.01"), ROUND_HALF_UP
            )

            pago_row = await conn.fetchrow(
                """
                INSERT INTO ticket_pagos (ticket_id, importe, metodo_pago)
                VALUES ($1, $2, $3)
                RETURNING *
                """,
                ticket_id,
                importe,
                body.metodo_pago,
            )

            total_pagado = await _sum_pagos_ticket(conn, ticket_id)

            tenant_id, _ = await _get_user_tenant_outlet(
                conn, current_user["sub"]
            )
            completado = False
            if total_pagado >= ticket_total:
                try:
                    await _completar_cobro_mixto_verifactu(
                        conn,
                        ticket_id,
                        ticket_row["mesa_id"],
                        tenant_id,
                    )
                except ValueError as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(e),
                    )
                completado = True

            pendiente = ticket_total - total_pagado
            if pendiente < 0:
                pendiente = Decimal("0")
            pendiente = pendiente.quantize(Decimal("0.01"), ROUND_HALF_UP)

        return {
            "pago_id": str(pago_row["id"]),
            "ticket_id": str(ticket_id),
            "importe_pagado": _decimal_respuesta_dinero(importe),
            "total_pagado": _decimal_respuesta_dinero(total_pagado),
            "total_ticket": _decimal_respuesta_dinero(ticket_total),
            "pendiente": _decimal_respuesta_dinero(pendiente),
            "completado": completado,
            "metodo_pago": body.metodo_pago,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en add_ticket_pago: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/tickets/{ticket_id}/pagos")
async def list_ticket_pagos(
    ticket_id: UUID,
    current_user: dict = Depends(require_roles(list(ROLES_TPV_PAGOS))),
):
    """Lista pagos registrados para un ticket y totales."""
    try:
        async with get_db() as conn:
            ticket_row = await _require_ticket_tpv_access(
                conn, ticket_id, current_user["sub"]
            )

            rows = await conn.fetch(
                """
                SELECT id, importe, metodo_pago, created_at
                FROM ticket_pagos
                WHERE ticket_id = $1
                ORDER BY created_at ASC
                """,
                ticket_id,
            )

            total_pagado = await _sum_pagos_ticket(conn, ticket_id)
            ticket_total = Decimal(str(ticket_row["total"])).quantize(
                Decimal("0.01"), ROUND_HALF_UP
            )
            pendiente = ticket_total - total_pagado
            if pendiente < 0:
                pendiente = Decimal("0")
            pendiente = pendiente.quantize(Decimal("0.01"), ROUND_HALF_UP)

        pagos = []
        for r in rows:
            pagos.append(
                {
                    "id": str(r["id"]),
                    "importe": _decimal_respuesta_dinero(r["importe"]),
                    "metodo_pago": r["metodo_pago"],
                    "created_at": r["created_at"].isoformat()
                    if r.get("created_at")
                    else None,
                }
            )

        return {
            "pagos": pagos,
            "total_ticket": _decimal_respuesta_dinero(ticket_total),
            "total_pagado": _decimal_respuesta_dinero(total_pagado),
            "pendiente": _decimal_respuesta_dinero(pendiente),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_ticket_pagos: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.delete("/tickets/{ticket_id}/pagos/{pago_id}")
async def delete_ticket_pago(
    ticket_id: UUID,
    pago_id: UUID,
    current_user: dict = Depends(require_roles(list(ROLES_TPV_PAGOS))),
):
    """Elimina un pago parcial solo si el ticket sigue abierto."""
    try:
        async with get_db() as conn:
            ticket_row = await _require_ticket_tpv_access(
                conn, ticket_id, current_user["sub"]
            )
            if ticket_row["estado"] != "abierto":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se puede eliminar pagos de un ticket cobrado",
                )

            pago_row = await conn.fetchrow(
                """
                SELECT id FROM ticket_pagos
                WHERE id = $1 AND ticket_id = $2
                """,
                pago_id,
                ticket_id,
            )
            if not pago_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Pago no encontrado",
                )

            await conn.execute(
                "DELETE FROM ticket_pagos WHERE id = $1",
                pago_id,
            )

            total_pagado = await _sum_pagos_ticket(conn, ticket_id)
            ticket_total = Decimal(str(ticket_row["total"])).quantize(
                Decimal("0.01"), ROUND_HALF_UP
            )
            pendiente = ticket_total - total_pagado
            if pendiente < 0:
                pendiente = Decimal("0")
            pendiente = pendiente.quantize(Decimal("0.01"), ROUND_HALF_UP)

        return {
            "deleted": True,
            "pendiente": _decimal_respuesta_dinero(pendiente),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en delete_ticket_pago: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
