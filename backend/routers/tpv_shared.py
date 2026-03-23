"""
Helpers compartidos entre routers TPV (operativa y cobro).
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import HTTPException, status

from services.verifactu_engine import crear_registro_verifactu

logger = logging.getLogger(__name__)

METODOS_PAGO = ("efectivo", "tarjeta_credito", "tarjeta_debito", "bizum", "transferencia", "invitacion")


async def _get_user_outlet(conn, user_id: str) -> str | None:
    """Obtiene outlet_id del usuario."""
    row = await conn.fetchrow(
        "SELECT outlet_id FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["outlet_id"]:
        return None
    return str(row["outlet_id"])


async def _get_user_tenant_outlet(conn, user_id: str) -> tuple[str | None, str | None]:
    """Obtiene tenant_id y outlet_id del usuario."""
    row = await conn.fetchrow(
        "SELECT tenant_id, outlet_id FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row:
        return None, None
    return (
        str(row["tenant_id"]) if row["tenant_id"] else None,
        str(row["outlet_id"]) if row["outlet_id"] else None,
    )


def _ticket_to_dict(row) -> dict:
    """Convierte fila ticket a dict."""
    return {
        "id": str(row["id"]),
        "outlet_id": str(row["outlet_id"]) if row["outlet_id"] else None,
        "mesa_id": str(row["mesa_id"]) if row["mesa_id"] else None,
        "camarero_id": str(row["camarero_id"]) if row["camarero_id"] else None,
        "estado": row["estado"],
        "total": float(row["total"]) if row["total"] is not None else 0,
        "metodo_pago": row["metodo_pago"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "cobrado_at": row["cobrado_at"].isoformat() if row["cobrado_at"] else None,
    }


def _linea_to_dict(row) -> dict:
    """Convierte fila línea a dict."""
    return {
        "id": str(row["id"]),
        "ticket_id": str(row["ticket_id"]) if row["ticket_id"] else None,
        "producto_id": str(row["producto_id"]) if row["producto_id"] else None,
        "cantidad": row["cantidad"],
        "precio_unitario": float(row["precio_unitario"]) if row["precio_unitario"] else 0,
        "subtotal": float(row["subtotal"]) if row["subtotal"] else 0,
        "nota": row["nota"],
    }


def _decimal_respuesta_dinero(value) -> float:
    """float solo en respuesta JSON."""
    if value is None:
        return 0.0
    return float(
        Decimal(str(value)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    )


async def _require_ticket_tpv_access(conn, ticket_id: UUID, user_id: str):
    """
    Ticket existe; outlet del ticket coincide con tenant del usuario;
    si el usuario tiene outlet_id, debe ser el mismo que el del ticket.
    """
    tenant_id, user_outlet_id = await _get_user_tenant_outlet(conn, user_id)
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario sin tenant asignado",
        )
    ticket_row = await conn.fetchrow(
        """
        SELECT t.*, o.tenant_id AS outlet_tenant_id
        FROM tickets t
        JOIN outlets o ON t.outlet_id = o.id
        WHERE t.id = $1
        """,
        ticket_id,
    )
    if not ticket_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket no encontrado",
        )
    if str(ticket_row["outlet_tenant_id"]) != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puede acceder a este ticket",
        )
    if user_outlet_id and str(ticket_row["outlet_id"]) != user_outlet_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puede acceder a este ticket",
        )
    return ticket_row


async def _marcar_lineas_kds_servido(conn, ticket_id: UUID) -> None:
    """
    Al cobrar el ticket, las líneas enviadas a cocina/barra pasan a servido
    para no dejar colas huérfanas en históricos o vistas que filtren mal.
    """
    await conn.execute(
        """
        UPDATE ticket_lineas
        SET estado_cocina = CASE
                WHEN enviado_cocina = true THEN 'servido'
                ELSE estado_cocina
            END,
            estado_barra = CASE
                WHEN COALESCE(enviado_barra, false) = true THEN 'servido'
                ELSE estado_barra
            END
        WHERE ticket_id = $1
        """,
        ticket_id,
    )


async def _sum_pagos_ticket(conn, ticket_id: UUID) -> Decimal:
    row = await conn.fetchrow(
        """
        SELECT COALESCE(SUM(importe), 0) AS s
        FROM ticket_pagos
        WHERE ticket_id = $1
        """,
        ticket_id,
    )
    return Decimal(str(row["s"])).quantize(Decimal("0.01"), ROUND_HALF_UP)


async def _completar_cobro_mixto_verifactu(
    conn,
    ticket_id: UUID,
    mesa_id,
    tenant_id: str,
):
    """
    Cierra ticket como cobrado (mixto), mesa libre, minutos ocupación y Verifactu.
    Misma secuencia que POST /cobrar más tiempo_ocupacion y metodo_pago mixto.
    """
    await conn.execute(
        """
        UPDATE tickets
        SET estado = 'cobrado',
            metodo_pago = 'mixto',
            cobrado_at = NOW(),
            tiempo_ocupacion = (
                EXTRACT(EPOCH FROM (NOW() - created_at)) / 60
            )::INTEGER
        WHERE id = $1
        """,
        ticket_id,
    )
    await _marcar_lineas_kds_servido(conn, ticket_id)
    if mesa_id:
        await conn.execute(
            "UPDATE mesas SET estado = 'libre' WHERE id = $1",
            mesa_id,
        )
    await crear_registro_verifactu(str(ticket_id), str(tenant_id), conn)
