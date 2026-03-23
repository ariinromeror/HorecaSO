"""
Router TPV (tickets y líneas) para HorecaSO.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.dependencies import get_current_user, require_roles
from database import get_db

logger = logging.getLogger(__name__)

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


ROLES_TICKETS_HOY = ("admin", "director", "jefe_sala")

ROLES_TICKET_DETALLE = ("admin", "director", "jefe_sala", "camarero")


from routers.tpv_shared import (
    _decimal_respuesta_dinero,
    _get_user_outlet,
    _get_user_tenant_outlet,
    _linea_to_dict,
    _require_ticket_tpv_access,
    _ticket_to_dict,
)


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


@router.get("/tickets/hoy")
async def list_tickets_hoy(
    current_user: dict = Depends(require_roles(list(ROLES_TICKETS_HOY))),
):
    """
    Tickets del outlet (o tenant si admin/director sin outlet) creados hoy
    (fecha local Europe/Madrid), cualquier estado. Más recientes primero.
    """
    try:
        async with get_db() as conn:
            user_outlet_id = await _get_user_outlet(conn, current_user["sub"])
            if not user_outlet_id:
                tenant_id, _ = await _get_user_tenant_outlet(
                    conn, current_user["sub"]
                )
                if not tenant_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Usuario sin tenant asignado",
                    )
                rows = await conn.fetch(
                    """
                    SELECT
                        t.id,
                        t.estado,
                        t.total,
                        t.metodo_pago,
                        t.num_comensales,
                        t.created_at,
                        t.cobrado_at,
                        t.tiempo_ocupacion,
                        m.numero AS mesa_numero,
                        u.nombre AS camarero_nombre,
                        (
                            SELECT COUNT(*)::INTEGER
                            FROM ticket_lineas tl
                            WHERE tl.ticket_id = t.id
                        ) AS num_lineas
                    FROM tickets t
                    JOIN mesas m ON t.mesa_id = m.id
                    LEFT JOIN usuarios u ON t.camarero_id = u.id
                    JOIN outlets o ON t.outlet_id = o.id
                    WHERE o.tenant_id = $1
                      AND (
                          (t.created_at AT TIME ZONE 'Europe/Madrid')::date
                          = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date
                      )
                    ORDER BY t.created_at DESC
                    """,
                    UUID(tenant_id),
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT
                        t.id,
                        t.estado,
                        t.total,
                        t.metodo_pago,
                        t.num_comensales,
                        t.created_at,
                        t.cobrado_at,
                        t.tiempo_ocupacion,
                        m.numero AS mesa_numero,
                        u.nombre AS camarero_nombre,
                        (
                            SELECT COUNT(*)::INTEGER
                            FROM ticket_lineas tl
                            WHERE tl.ticket_id = t.id
                        ) AS num_lineas
                    FROM tickets t
                    JOIN mesas m ON t.mesa_id = m.id
                    LEFT JOIN usuarios u ON t.camarero_id = u.id
                    WHERE t.outlet_id = $1
                      AND (
                          (t.created_at AT TIME ZONE 'Europe/Madrid')::date
                          = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date
                      )
                    ORDER BY t.created_at DESC
                    """,
                    UUID(user_outlet_id),
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_tickets_hoy: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    result = []
    for r in rows:
        result.append(
            {
                "id": str(r["id"]),
                "mesa_numero": r.get("mesa_numero"),
                "camarero_nombre": r.get("camarero_nombre"),
                "estado": r["estado"],
                "total": _decimal_respuesta_dinero(r["total"]),
                "metodo_pago": r["metodo_pago"],
                "num_comensales": r["num_comensales"]
                if r.get("num_comensales") is not None
                else 1,
                "created_at": r["created_at"].isoformat()
                if r["created_at"]
                else None,
                "cobrado_at": r["cobrado_at"].isoformat()
                if r["cobrado_at"]
                else None,
                "tiempo_ocupacion": r["tiempo_ocupacion"],
                "num_lineas": int(r["num_lineas"] or 0),
            }
        )
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
