"""
Router dashboard para HorecaSO.
"""

import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import require_roles
from database import get_db
from services.fechas import hoy_madrid
from services.totales_cobro import totales_por_metodo

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

# jefe_sala necesita /director para Venta Live (useVentaLivePolling).
ROLES_DASHBOARD_DIRECTOR = ["admin", "director", "jefe_sala"]
ROLES_CIERRE_DIA = ["admin", "director"]


async def _get_user_tenant(conn, user_id: str) -> str | None:
    """Obtiene tenant_id del usuario."""
    row = await conn.fetchrow(
        "SELECT tenant_id FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["tenant_id"]:
        return None
    return str(row["tenant_id"])


@router.get("/director")
async def get_dashboard_director(
    current_user: dict = Depends(require_roles(ROLES_DASHBOARD_DIRECTOR)),
):
    """Dashboard director: ventas, mesas, top productos, alertas stock."""
    try:
        async with get_db() as conn:
            tenant_id = await _get_user_tenant(conn, current_user["sub"])
            if not tenant_id:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            hoy = hoy_madrid()

            ventas_row = await conn.fetchrow(
                """
                SELECT COALESCE(SUM(t.total), 0) as ventas, COUNT(*) as num_tickets
                FROM tickets t
                JOIN outlets o ON t.outlet_id = o.id
                WHERE t.estado = 'cobrado' AND o.tenant_id = $1
                  AND (t.cobrado_at AT TIME ZONE 'Europe/Madrid')::date = $2
                """,
                UUID(tenant_id),
                hoy,
            )

            mesas_row = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) FILTER (WHERE m.estado = 'ocupada') as ocupadas,
                    COUNT(*) as total
                FROM mesas m
                JOIN outlets o ON m.outlet_id = o.id
                WHERE o.tenant_id = $1
                """,
                UUID(tenant_id),
            )

            top_productos = await conn.fetch(
                """
                SELECT p.nombre, SUM(tl.cantidad) as cantidad
                FROM ticket_lineas tl
                JOIN tickets t ON tl.ticket_id = t.id
                JOIN outlets o ON t.outlet_id = o.id
                JOIN productos p ON tl.producto_id = p.id
                WHERE t.estado = 'cobrado' AND o.tenant_id = $1
                  AND (t.cobrado_at AT TIME ZONE 'Europe/Madrid')::date = $2
                GROUP BY tl.producto_id, p.nombre
                ORDER BY cantidad DESC
                LIMIT 5
                """,
                UUID(tenant_id),
                hoy,
            )

            alertas = await conn.fetch(
                """
                SELECT id, nombre, stock_actual, stock_minimo
                FROM articulos
                WHERE tenant_id = $1 AND stock_actual <= stock_minimo
                ORDER BY stock_actual ASC
                """,
                UUID(tenant_id),
            )

        ventas_hoy = Decimal(str(ventas_row["ventas"] or 0))
        num_tickets_hoy = ventas_row["num_tickets"] or 0
        ticket_medio = (
            (ventas_hoy / num_tickets_hoy).quantize(Decimal("0.01"), ROUND_HALF_UP)
            if num_tickets_hoy > 0
            else Decimal("0")
        )

        coste_hoy = Decimal("0")
        margen_hoy = ventas_hoy - coste_hoy
        margen_porcentaje = (
            (margen_hoy / ventas_hoy * 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
            if ventas_hoy > 0
            else Decimal("0")
        )

        return {
            "ventas_hoy": float(ventas_hoy),
            "num_tickets_hoy": num_tickets_hoy,
            "ticket_medio": float(ticket_medio),
            "mesas_ocupadas": mesas_row["ocupadas"] or 0,
            "total_mesas": mesas_row["total"] or 0,
            "top_5_productos_hoy": [
                {"nombre": r["nombre"], "cantidad": int(r["cantidad"])}
                for r in top_productos
            ],
            "alertas_stock": [
                {
                    "id": str(r["id"]),
                    "nombre": r["nombre"],
                    "stock_actual": float(r["stock_actual"] or 0),
                    "stock_minimo": float(r["stock_minimo"] or 0),
                }
                for r in alertas
            ],
            "coste_hoy": float(coste_hoy),
            "margen_hoy": float(margen_hoy),
            "margen_porcentaje": float(margen_porcentaje),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_dashboard_director: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.get("/cierre-dia")
async def get_cierre_dia(
    current_user: dict = Depends(require_roles(ROLES_CIERRE_DIA)),
    fecha: date | None = Query(default=None, description="Fecha (default: hoy)"),
):
    """Cierre de día: totales por método de pago."""
    try:
        async with get_db() as conn:
            tenant_id = await _get_user_tenant(conn, current_user["sub"])
            if not tenant_id:
                raise HTTPException(status_code=403, detail="Usuario sin tenant")

            f = fecha or hoy_madrid()

            tickets = await conn.fetch(
                """
                SELECT t.id, t.total, t.metodo_pago
                FROM tickets t
                JOIN outlets o ON t.outlet_id = o.id
                WHERE t.estado = 'cobrado' AND o.tenant_id = $1
                  AND t.cobrado_at IS NOT NULL
                  AND (t.cobrado_at AT TIME ZONE 'Europe/Madrid')::date = $2
                """,
                UUID(tenant_id),
                f,
            )
            totales = await totales_por_metodo(conn, tickets)

        return {
            "fecha": f.isoformat(),
            "total_efectivo": float(totales["total_efectivo"]),
            "total_tarjeta": float(totales["total_tarjeta"]),
            "total_bizum": float(totales["total_bizum"]),
            "total_transferencia": float(totales["total_transferencia"]),
            "total_invitaciones": float(totales["total_invitaciones"]),
            "total_ventas": float(totales["total_ventas"]),
            "num_tickets": totales["num_tickets"],
            "ticket_medio": float(totales["ticket_medio"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_cierre_dia: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")
