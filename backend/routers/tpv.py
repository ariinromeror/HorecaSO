"""
Router TPV (tickets y líneas) para HorecaSO.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.dependencies import get_current_user
from database import get_db
from services.verifactu_engine import crear_registro_verifactu

logger = logging.getLogger(__name__)

METODOS_PAGO = ("efectivo", "tarjeta_credito", "tarjeta_debito", "bizum", "transferencia", "invitacion")

router = APIRouter(
    prefix="/api/tpv",
    tags=["TPV"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


class CreateTicketRequest(BaseModel):
    """Body para crear ticket."""

    mesa_id: str
    outlet_id: str


class AddLineaRequest(BaseModel):
    """Body para añadir línea."""

    producto_id: str
    cantidad: int
    nota: str | None = None


class CobrarRequest(BaseModel):
    """Body para cobrar ticket."""

    metodo_pago: str


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


@router.get("/tickets/abiertos")
async def list_tickets_abiertos(current_user: dict = Depends(get_current_user)):
    """Lista tickets abiertos del outlet del usuario. Incluye número de mesa."""
    async with get_db() as conn:
        user_outlet_id = await _get_user_outlet(conn, current_user["sub"])
        if not user_outlet_id:
            # Admin/director: todos los tickets abiertos del tenant
            tenant_id, _ = await _get_user_tenant_outlet(conn, current_user["sub"])
            if not tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Usuario sin tenant asignado",
                )
            rows = await conn.fetch(
                """
                SELECT t.*, m.numero as mesa_numero
                FROM tickets t
                JOIN mesas m ON t.mesa_id = m.id
                JOIN outlets o ON t.outlet_id = o.id
                WHERE t.estado = 'abierto' AND o.tenant_id = $1
                ORDER BY t.created_at
                """,
                UUID(tenant_id),
            )
        else:
            rows = await conn.fetch(
                """
                SELECT t.*, m.numero as mesa_numero
                FROM tickets t
                JOIN mesas m ON t.mesa_id = m.id
                WHERE t.estado = 'abierto' AND t.outlet_id = $1
                ORDER BY t.created_at
                """,
                UUID(user_outlet_id),
            )

    result = []
    for r in rows:
        item = _ticket_to_dict(r)
        item["mesa_numero"] = r.get("mesa_numero")
        result.append(item)
    return result


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
            "SELECT id, precio, tenant_id FROM productos WHERE id = $1 AND activo = true",
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

        linea_row = await conn.fetchrow(
            """
            INSERT INTO ticket_lineas (ticket_id, producto_id, cantidad, precio_unitario, subtotal, nota)
            VALUES ($1, $2, $3, $4, $5, $6)
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
