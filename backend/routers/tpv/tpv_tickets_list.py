import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import get_current_user, require_roles
from database import get_db

from .tpv_shared import (
    _decimal_respuesta_dinero,
    _get_user_outlet,
    _get_user_tenant_outlet,
    _ticket_to_dict,
)

logger = logging.getLogger(__name__)

router = APIRouter()

ROLES_TICKETS_HOY = ("admin", "director", "jefe_sala")


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
