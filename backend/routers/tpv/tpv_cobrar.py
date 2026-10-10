"""
TPV: cobro simple de ticket.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import require_roles
from database import get_db
from services.verifactu_engine import crear_registro_verifactu, generar_qr_url

from .tpv_cobro_schemas import CobrarRequest
from .tpv_shared import (
    METODOS_PAGO,
    ROLES_TPV_SALA,
    _fijar_total_iva,
    _get_user_tenant_outlet,
    _marcar_lineas_kds_servido,
    _require_ticket_tpv_access,
    _sum_pagos_ticket,
    _ticket_to_dict,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/tickets/{ticket_id}/cobrar")
async def cobrar_ticket(
    ticket_id: UUID,
    body: CobrarRequest,
    current_user: dict = Depends(require_roles(list(ROLES_TPV_SALA))),
):
    """
    Cobra ticket. Cambia estado a cobrado, guarda metodo_pago y cobrado_at.
    Registra el importe pendiente en ticket_pagos (si ya había pagos parciales,
    el ticket queda como 'mixto'). Cambia mesa a libre. Todo en la misma transacción.
    """
    if body.metodo_pago not in METODOS_PAGO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Método de pago inválido. Válidos: {', '.join(METODOS_PAGO)}",
        )

    verifactu_reg = None
    tenant_nif = None
    try:
        async with get_db() as conn:
            ticket_row = await _require_ticket_tpv_access(
                conn, ticket_id, current_user["sub"], for_update=True
            )
            if ticket_row["estado"] != "abierto":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El ticket no está abierto",
                )

            ticket_total = Decimal(str(ticket_row["total"] or 0)).quantize(
                Decimal("0.01"), ROUND_HALF_UP
            )
            pagado_previo = await _sum_pagos_ticket(conn, ticket_id)
            pendiente = ticket_total - pagado_previo
            if pendiente > 0:
                await conn.execute(
                    """
                    INSERT INTO ticket_pagos (ticket_id, importe, metodo_pago)
                    VALUES ($1, $2, $3)
                    """,
                    ticket_id,
                    pendiente,
                    body.metodo_pago,
                )
            metodo_ticket = body.metodo_pago if pagado_previo == 0 else "mixto"

            await conn.execute(
                """
                UPDATE tickets
                SET estado = 'cobrado', metodo_pago = $1, cobrado_at = NOW()
                WHERE id = $2
                """,
                metodo_ticket,
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
                verifactu_reg = await crear_registro_verifactu(
                    str(ticket_id), str(tenant_id), conn
                )
                await _fijar_total_iva(conn, ticket_id, verifactu_reg)
                tenant_nif = await conn.fetchval(
                    "SELECT nif FROM tenants WHERE id = $1",
                    UUID(str(tenant_id)),
                )
            except ValueError as e:
                msg = str(e)
                if msg.startswith("El ticket") or msg.startswith("Tenant"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=msg,
                    )
                logger.error("Error Verifactu en cobrar_ticket: %s", e)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se pudo completar el cobro",
                )

            ticket_row = await conn.fetchrow(
                "SELECT * FROM tickets WHERE id = $1",
                ticket_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en cobrar_ticket: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    result = _ticket_to_dict(ticket_row)
    if verifactu_reg:
        result["verifactu_numero_serie"] = verifactu_reg["numero_serie"]
        result["verifactu_qr_url"] = verifactu_reg.get("qr_url")
        if not result["verifactu_qr_url"] and tenant_nif:
            fe = verifactu_reg.get("fecha_expedicion")
            if hasattr(fe, "strftime"):
                fecha_str = fe.strftime("%d-%m-%Y")
            else:
                fecha_str = str(fe)[:10]
            result["verifactu_qr_url"] = generar_qr_url(
                tenant_nif,
                verifactu_reg["numero_serie"],
                fecha_str,
                f"{Decimal(str(verifactu_reg['importe_total'])):.2f}",
            )
    logger.info("Ticket %s cobrado con %s", ticket_id, result["metodo_pago"])
    return result
