import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import get_current_user, require_roles
from database import get_db

from .tpv_shared import (
    _decimal_respuesta_dinero,
    _linea_to_dict,
    _require_ticket_tpv_access,
    _ticket_to_dict,
)

logger = logging.getLogger(__name__)

router = APIRouter()

ROLES_TICKET_DETALLE = ("admin", "director", "jefe_sala", "camarero")


@router.get("/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Devuelve ticket con sus líneas. HTTP 404 si no existe."""
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

        lineas_rows = await conn.fetch(
            "SELECT * FROM ticket_lineas WHERE ticket_id = $1 ORDER BY id",
            ticket_id,
        )

    result = _ticket_to_dict(ticket_row)
    result["lineas"] = [_linea_to_dict(l) for l in lineas_rows]
    return result


@router.get("/tickets/{ticket_id}/detalle")
async def get_ticket_detalle(
    ticket_id: UUID,
    current_user: dict = Depends(require_roles(list(ROLES_TICKET_DETALLE))),
):
    """
    Ticket completo con líneas (nombre de producto) y pagos parciales.
    Verifica outlet/tenant vía _require_ticket_tpv_access.
    """
    try:
        async with get_db() as conn:
            ticket_row = await _require_ticket_tpv_access(
                conn, ticket_id, current_user["sub"]
            )

            mesa_numero = None
            if ticket_row.get("mesa_id"):
                m = await conn.fetchrow(
                    "SELECT numero FROM mesas WHERE id = $1",
                    ticket_row["mesa_id"],
                )
                if m:
                    mesa_numero = m["numero"]

            camarero_nombre = None
            if ticket_row.get("camarero_id"):
                u = await conn.fetchrow(
                    "SELECT nombre FROM usuarios WHERE id = $1",
                    ticket_row["camarero_id"],
                )
                if u:
                    camarero_nombre = u["nombre"]

            lineas_rows = await conn.fetch(
                """
                SELECT
                    tl.id,
                    tl.cantidad,
                    tl.precio_unitario,
                    tl.subtotal,
                    tl.nota,
                    p.nombre AS producto_nombre
                FROM ticket_lineas tl
                LEFT JOIN productos p ON p.id = tl.producto_id
                WHERE tl.ticket_id = $1
                ORDER BY tl.id
                """,
                ticket_id,
            )

            pagos_rows = await conn.fetch(
                """
                SELECT id, importe, metodo_pago, created_at
                FROM ticket_pagos
                WHERE ticket_id = $1
                ORDER BY created_at ASC
                """,
                ticket_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_ticket_detalle: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    lineas_out = []
    for ln in lineas_rows:
        lineas_out.append(
            {
                "id": str(ln["id"]),
                "producto_nombre": ln["producto_nombre"] or "",
                "cantidad": ln["cantidad"],
                "precio_unitario": _decimal_respuesta_dinero(
                    ln["precio_unitario"]
                ),
                "subtotal": _decimal_respuesta_dinero(ln["subtotal"]),
                "nota": ln["nota"],
            }
        )

    pagos_out = []
    for p in pagos_rows:
        pagos_out.append(
            {
                "id": str(p["id"]),
                "importe": _decimal_respuesta_dinero(p["importe"]),
                "metodo_pago": p["metodo_pago"],
                "created_at": p["created_at"].isoformat()
                if p["created_at"]
                else None,
            }
        )

    return {
        "id": str(ticket_row["id"]),
        "mesa_numero": mesa_numero,
        "camarero_nombre": camarero_nombre,
        "estado": ticket_row["estado"],
        "total": _decimal_respuesta_dinero(ticket_row["total"]),
        "metodo_pago": ticket_row["metodo_pago"],
        "num_comensales": ticket_row["num_comensales"]
        if ticket_row.get("num_comensales") is not None
        else 1,
        "created_at": ticket_row["created_at"].isoformat()
        if ticket_row["created_at"]
        else None,
        "cobrado_at": ticket_row["cobrado_at"].isoformat()
        if ticket_row["cobrado_at"]
        else None,
        "tiempo_ocupacion": ticket_row["tiempo_ocupacion"],
        "lineas": lineas_out,
        "pagos": pagos_out,
    }
