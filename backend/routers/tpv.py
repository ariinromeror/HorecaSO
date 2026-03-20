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


class AddTicketPagoRequest(BaseModel):
    """Body para registrar un pago parcial (división de cuenta)."""

    importe: Decimal
    metodo_pago: str


ROLES_TPV_PAGOS = ("admin", "camarero", "jefe_sala")

ROLES_TICKETS_HOY = ("admin", "director", "jefe_sala")

ROLES_TICKET_DETALLE = ("admin", "director", "jefe_sala", "camarero")


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
    if mesa_id:
        await conn.execute(
            "UPDATE mesas SET estado = 'libre' WHERE id = $1",
            mesa_id,
        )
    await crear_registro_verifactu(str(ticket_id), str(tenant_id), conn)


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
            INSERT INTO ticket_lineas (
                ticket_id, producto_id, cantidad, precio_unitario, subtotal, nota,
                enviado_cocina, enviado_cocina_at, estado_cocina
            )
            VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), 'pendiente')
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
