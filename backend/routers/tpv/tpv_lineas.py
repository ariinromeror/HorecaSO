import logging
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import get_current_user
from database import get_db

from .tpv_schemas import AddLineaRequest
from .tpv_shared import (
    _linea_to_dict,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/tickets/{ticket_id}/lineas")
async def add_linea(
    ticket_id: UUID,
    body: AddLineaRequest,
    current_user: dict = Depends(get_current_user),
):
    """Añade línea al ticket. Recalcula total."""
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

        # Obtener producto y verificar tenant
        producto_row = await conn.fetchrow(
            """
            SELECT id, precio, tenant_id,
                   COALESCE(destino_kds, 'cocina') AS destino_kds
            FROM productos WHERE id = $1 AND activo = true
            """,
            UUID(body.producto_id),
        )
        if not producto_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado",
            )

        outlet_row = await conn.fetchrow(
            "SELECT tenant_id FROM outlets WHERE id = $1",
            ticket_row["outlet_id"],
        )
        if outlet_row and str(producto_row["tenant_id"]) != str(outlet_row["tenant_id"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Producto no pertenece al tenant del ticket",
            )

        precio = Decimal(str(producto_row["precio"]))
        subtotal = (precio * body.cantidad).quantize(Decimal("0.01"), ROUND_HALF_UP)

        dk = str(producto_row.get("destino_kds") or "cocina")
        if dk == "cocina":
            linea_row = await conn.fetchrow(
                """
                INSERT INTO ticket_lineas (
                    ticket_id, producto_id, cantidad, precio_unitario, subtotal, nota,
                    enviado_cocina, enviado_cocina_at, estado_cocina,
                    enviado_barra, enviado_barra_at, estado_barra
                )
                VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), 'pendiente',
                        false, NULL, 'pendiente')
                RETURNING *
                """,
                ticket_id,
                UUID(body.producto_id),
                body.cantidad,
                precio,
                subtotal,
                body.nota,
            )
        elif dk == "barra":
            linea_row = await conn.fetchrow(
                """
                INSERT INTO ticket_lineas (
                    ticket_id, producto_id, cantidad, precio_unitario, subtotal, nota,
                    enviado_cocina, enviado_cocina_at, estado_cocina,
                    enviado_barra, enviado_barra_at, estado_barra
                )
                VALUES ($1, $2, $3, $4, $5, $6, false, NULL, 'pendiente',
                        true, NOW(), 'pendiente')
                RETURNING *
                """,
                ticket_id,
                UUID(body.producto_id),
                body.cantidad,
                precio,
                subtotal,
                body.nota,
            )
        else:
            linea_row = await conn.fetchrow(
                """
                INSERT INTO ticket_lineas (
                    ticket_id, producto_id, cantidad, precio_unitario, subtotal, nota,
                    enviado_cocina, enviado_cocina_at, estado_cocina,
                    enviado_barra, enviado_barra_at, estado_barra
                )
                VALUES ($1, $2, $3, $4, $5, $6, false, NULL, 'pendiente',
                        false, NULL, 'pendiente')
                RETURNING *
                """,
                ticket_id,
                UUID(body.producto_id),
                body.cantidad,
                precio,
                subtotal,
                body.nota,
            )

        # Recalcular total del ticket
        total_row = await conn.fetchrow(
            "SELECT COALESCE(SUM(subtotal), 0) as total FROM ticket_lineas WHERE ticket_id = $1",
            ticket_id,
        )
        nuevo_total = total_row["total"]
        await conn.execute(
            "UPDATE tickets SET total = $1 WHERE id = $2",
            nuevo_total,
            ticket_id,
        )

    logger.info("Línea añadida al ticket %s: producto %s x%d", ticket_id, body.producto_id, body.cantidad)
    return _linea_to_dict(linea_row)


@router.delete("/tickets/{ticket_id}/lineas/{linea_id}")
async def delete_linea(
    ticket_id: UUID,
    linea_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Elimina línea del ticket. Recalcula total."""
    async with get_db() as conn:
        linea_row = await conn.fetchrow(
            "SELECT * FROM ticket_lineas WHERE id = $1 AND ticket_id = $2",
            linea_id,
            ticket_id,
        )
        if not linea_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Línea no encontrada",
            )

        ticket_row = await conn.fetchrow(
            "SELECT * FROM tickets WHERE id = $1",
            ticket_id,
        )
        if not ticket_row or ticket_row["estado"] != "abierto":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede modificar un ticket cerrado",
            )

        await conn.execute(
            "DELETE FROM ticket_lineas WHERE id = $1",
            linea_id,
        )

        total_row = await conn.fetchrow(
            "SELECT COALESCE(SUM(subtotal), 0) as total FROM ticket_lineas WHERE ticket_id = $1",
            ticket_id,
        )
        nuevo_total = total_row["total"]
        await conn.execute(
            "UPDATE tickets SET total = $1 WHERE id = $2",
            nuevo_total,
            ticket_id,
        )

    logger.info("Línea %s eliminada del ticket %s", linea_id, ticket_id)
    return {"deleted": True}
