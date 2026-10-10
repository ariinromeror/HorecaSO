import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from auth.dependencies import require_roles
from database import get_db
from services.totales_cobro import totales_por_metodo

from .tpv_shared import _get_user_tenant_outlet

logger = logging.getLogger(__name__)

router = APIRouter()

ROLES_CIERRE = ("admin", "director", "jefe_sala")
ZERO = Decimal("0")


class CierreCajaBody(BaseModel):
    fecha: Optional[date] = None
    notas: Optional[str] = None


def _d(val) -> Decimal:
    if val is None:
        return ZERO
    return Decimal(str(val))


def _money(val: Decimal) -> float:
    return float(val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


async def _hoy_madrid(conn) -> date:
    return await conn.fetchval(
        "SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::date"
    )


async def _resolve_outlet(
    conn, tenant_id: str, user_outlet_id: str | None
) -> UUID:
    if user_outlet_id:
        row = await conn.fetchrow(
            """
            SELECT id FROM outlets
            WHERE id = $1 AND tenant_id = $2
            """,
            UUID(user_outlet_id),
            UUID(tenant_id),
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Outlet no válido",
            )
        return row["id"]

    row = await conn.fetchrow(
        """
        SELECT id FROM outlets
        WHERE tenant_id = $1
        ORDER BY created_at NULLS LAST, nombre
        LIMIT 1
        """,
        UUID(tenant_id),
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El local no tiene outlet",
        )
    return row["id"]


async def _compute_totales(conn, outlet_id: UUID, fecha: date) -> dict:
    tickets = await conn.fetch(
        """
        SELECT t.id, t.total, t.metodo_pago
        FROM tickets t
        WHERE t.outlet_id = $1
          AND t.estado = 'cobrado'
          AND t.cobrado_at IS NOT NULL
          AND (t.cobrado_at AT TIME ZONE 'Europe/Madrid')::date = $2
        """,
        outlet_id,
        fecha,
    )
    return await totales_por_metodo(conn, tickets)


async def _tenant_print(conn, outlet_id: UUID) -> dict | None:
    tn = await conn.fetchrow(
        """
        SELECT
            t.nombre, t.razon_social, t.nif, t.direccion,
            t.codigo_postal, t.ciudad, t.provincia, t.telefono
        FROM outlets o
        JOIN tenants t ON t.id = o.tenant_id
        WHERE o.id = $1
        """,
        outlet_id,
    )
    if not tn:
        return None
    return {
        "nombre": tn["nombre"],
        "razon_social": tn["razon_social"],
        "nif": tn["nif"],
        "direccion": tn["direccion"],
        "codigo_postal": tn["codigo_postal"],
        "ciudad": tn["ciudad"],
        "provincia": tn["provincia"],
        "telefono": tn["telefono"],
    }


def _payload(
    *,
    fecha: date,
    outlet_id: UUID,
    totales: dict,
    ya_cerrado: bool,
    cierre_id: str | None,
    cerrado_por_nombre: str,
    tenant_print: dict | None,
    notas: str | None = None,
) -> dict:
    return {
        "fecha": fecha.isoformat(),
        "outlet_id": str(outlet_id),
        "ya_cerrado": ya_cerrado,
        "cierre_id": cierre_id,
        "total_efectivo": _money(totales["total_efectivo"]),
        "total_tarjeta": _money(totales["total_tarjeta"]),
        "total_bizum": _money(totales["total_bizum"]),
        "total_transferencia": _money(totales["total_transferencia"]),
        "total_invitaciones": _money(totales["total_invitaciones"]),
        "total_ventas": _money(totales["total_ventas"]),
        "num_tickets": int(totales["num_tickets"]),
        "ticket_medio": _money(totales["ticket_medio"]),
        "cerrado_por_nombre": cerrado_por_nombre,
        "tenant_print": tenant_print,
        "notas": notas,
    }


@router.get("/cierre-caja/preview")
async def preview_cierre_caja(
    fecha: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(list(ROLES_CIERRE))),
):
    """Resumen de cobros del día (Madrid) + si ya hay cierre registrado."""
    try:
        async with get_db() as conn:
            dia = fecha or await _hoy_madrid(conn)
            tenant_id, user_outlet = await _get_user_tenant_outlet(
                conn, current_user["sub"]
            )
            if not tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Usuario sin tenant",
                )
            outlet_id = await _resolve_outlet(conn, tenant_id, user_outlet)

            user_row = await conn.fetchrow(
                "SELECT nombre FROM usuarios WHERE id = $1",
                UUID(current_user["sub"]),
            )
            usuario_nombre = (
                user_row["nombre"] if user_row and user_row["nombre"] else "Usuario"
            )

            cierre = await conn.fetchrow(
                """
                SELECT c.*, u.nombre AS cerrado_por_nombre
                FROM cierres_caja c
                LEFT JOIN usuarios u ON u.id = c.usuario_id
                WHERE c.outlet_id = $1 AND c.fecha = $2
                ORDER BY c.created_at DESC
                LIMIT 1
                """,
                outlet_id,
                dia,
            )

            tenant_print = await _tenant_print(conn, outlet_id)

            if cierre:
                return _payload(
                    fecha=dia,
                    outlet_id=outlet_id,
                    totales={
                        "total_efectivo": _d(cierre["total_efectivo"]),
                        "total_tarjeta": _d(cierre["total_tarjeta"]),
                        "total_bizum": _d(cierre["total_bizum"]),
                        "total_transferencia": _d(cierre["total_transferencia"]),
                        "total_invitaciones": _d(cierre["total_invitaciones"]),
                        "total_ventas": _d(cierre["total_ventas"]),
                        "num_tickets": cierre["num_tickets"] or 0,
                        "ticket_medio": _d(cierre["ticket_medio"]),
                    },
                    ya_cerrado=True,
                    cierre_id=str(cierre["id"]),
                    cerrado_por_nombre=cierre["cerrado_por_nombre"]
                    or usuario_nombre,
                    tenant_print=tenant_print,
                    notas=cierre["notas"],
                )

            totales = await _compute_totales(conn, outlet_id, dia)
            return _payload(
                fecha=dia,
                outlet_id=outlet_id,
                totales=totales,
                ya_cerrado=False,
                cierre_id=None,
                cerrado_por_nombre=usuario_nombre,
                tenant_print=tenant_print,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("preview_cierre_caja: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        ) from e


@router.post("/cierre-caja")
async def crear_cierre_caja(
    body: CierreCajaBody,
    current_user: dict = Depends(require_roles(list(ROLES_CIERRE))),
):
    """Registra el cierre de caja del día para el outlet del usuario."""
    try:
        async with get_db() as conn:
            dia = body.fecha or await _hoy_madrid(conn)
            tenant_id, user_outlet = await _get_user_tenant_outlet(
                conn, current_user["sub"]
            )
            if not tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Usuario sin tenant",
                )
            outlet_id = await _resolve_outlet(conn, tenant_id, user_outlet)
            user_id = UUID(current_user["sub"])

            user_row = await conn.fetchrow(
                "SELECT nombre FROM usuarios WHERE id = $1",
                user_id,
            )
            usuario_nombre = (
                user_row["nombre"] if user_row and user_row["nombre"] else "Usuario"
            )

            existente = await conn.fetchval(
                """
                SELECT id FROM cierres_caja
                WHERE outlet_id = $1 AND fecha = $2
                LIMIT 1
                """,
                outlet_id,
                dia,
            )
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya existe un cierre de caja para esta fecha",
                )

            totales = await _compute_totales(conn, outlet_id, dia)
            row = await conn.fetchrow(
                """
                INSERT INTO cierres_caja (
                    outlet_id, usuario_id, fecha,
                    total_efectivo, total_tarjeta, total_bizum,
                    total_transferencia, total_invitaciones,
                    total_ventas, num_tickets, ticket_medio, notas
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
                )
                RETURNING *
                """,
                outlet_id,
                user_id,
                dia,
                totales["total_efectivo"],
                totales["total_tarjeta"],
                totales["total_bizum"],
                totales["total_transferencia"],
                totales["total_invitaciones"],
                totales["total_ventas"],
                totales["num_tickets"],
                totales["ticket_medio"],
                body.notas,
            )
            tenant_print = await _tenant_print(conn, outlet_id)

        logger.info(
            "Cierre caja outlet=%s fecha=%s usuario=%s total=%s",
            outlet_id,
            dia,
            user_id,
            totales["total_ventas"],
        )
        return _payload(
            fecha=dia,
            outlet_id=outlet_id,
            totales=totales,
            ya_cerrado=True,
            cierre_id=str(row["id"]),
            cerrado_por_nombre=usuario_nombre,
            tenant_print=tenant_print,
            notas=body.notas,
        )
    except HTTPException:
        raise
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un cierre de caja para esta fecha",
        )
    except Exception as e:
        logger.error("crear_cierre_caja: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        ) from e
