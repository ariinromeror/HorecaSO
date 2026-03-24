"""
Router KDS — comandas cocina y barra (lectura).
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db

from .kds_shared import (
    ROLES_KDS_LECTURA,
    _alerta_comanda,
    _alerta_linea,
    _get_user_outlet,
    _minutos_espera,
    _resolve_vista,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/kds",
    tags=["KDS"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


_SQL_COMANDAS_BASE = """
                SELECT
                    tl.id, tl.ticket_id, tl.cantidad,
                    tl.nota,
                    COALESCE(p.destino_kds, 'cocina') AS destino_kds,
                    CASE WHEN COALESCE(p.destino_kds, 'cocina') = 'barra'
                         THEN tl.estado_barra
                         ELSE tl.estado_cocina
                    END AS estado_kds,
                    tl.estado_cocina,
                    tl.estado_barra,
                    CASE WHEN COALESCE(p.destino_kds, 'cocina') = 'barra'
                         THEN tl.enviado_barra_at
                         ELSE tl.enviado_cocina_at
                    END AS kds_enviado_at,
                    tl.enviado_cocina_at,
                    tl.enviado_barra_at,
                    p.nombre AS producto_nombre,
                    p.tiempo_preparacion,
                    t.created_at AS ticket_created_at,
                    m.numero AS mesa_numero, m.zona AS mesa_zona,
                    EXTRACT(EPOCH FROM (NOW() - (
                        CASE WHEN COALESCE(p.destino_kds, 'cocina') = 'barra'
                             THEN tl.enviado_barra_at
                             ELSE tl.enviado_cocina_at
                        END
                    ))) / 60 AS minutos_espera
                FROM ticket_lineas tl
                JOIN tickets t ON tl.ticket_id = t.id
                JOIN productos p ON tl.producto_id = p.id
                LEFT JOIN mesas m ON t.mesa_id = m.id
                WHERE t.outlet_id = $1
                  AND t.estado = 'abierto'
                  AND (
                    ($2::text = 'cocina'
                     AND COALESCE(p.destino_kds, 'cocina') = 'cocina'
                     AND tl.enviado_cocina = true
                     AND COALESCE(tl.estado_cocina, 'pendiente') <> 'servido')
                    OR
                    ($2::text = 'barra'
                     AND COALESCE(p.destino_kds, 'cocina') = 'barra'
                     AND tl.enviado_barra = true
                     AND COALESCE(tl.estado_barra, 'pendiente') <> 'servido')
                    OR
                    ($2::text = 'completa'
                     AND (
                       (COALESCE(p.destino_kds, 'cocina') = 'cocina'
                        AND tl.enviado_cocina = true
                        AND COALESCE(tl.estado_cocina, 'pendiente') <> 'servido')
                       OR
                       (COALESCE(p.destino_kds, 'cocina') = 'barra'
                        AND tl.enviado_barra = true
                        AND COALESCE(tl.estado_barra, 'pendiente') <> 'servido')
                     ))
                  )
                ORDER BY kds_enviado_at ASC NULLS LAST
"""


@router.get("/comandas")
async def get_comandas(
    vista: str | None = Query(
        default=None,
        description="Solo admin/director: cocina | barra | completa",
    ),
    current_user: dict = Depends(require_roles(ROLES_KDS_LECTURA)),
):
    """Líneas KDS agrupadas por ticket (cocina, barra o vista completa)."""
    try:
        async with get_db() as conn:
            outlet_id = await _get_user_outlet(conn, current_user["sub"])
            if not outlet_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuario sin outlet asignado",
                )

            v = _resolve_vista(current_user, vista)
            rows = await conn.fetch(
                _SQL_COMANDAS_BASE,
                UUID(outlet_id),
                v,
            )

        by_ticket: dict = {}
        for r in rows:
            tid = str(r["ticket_id"])
            if tid not in by_ticket:
                by_ticket[tid] = {
                    "ticket_id": tid,
                    "mesa_numero": r["mesa_numero"],
                    "mesa_zona": r["mesa_zona"],
                    "ticket_created_at": r["ticket_created_at"].isoformat()
                    if r.get("ticket_created_at")
                    else "",
                    "lineas": [],
                    "_sort_key": r.get("kds_enviado_at"),
                }
            mins = _minutos_espera(r.get("minutos_espera"))
            al = _alerta_linea(mins)
            cant = r["cantidad"]
            try:
                cant_int = int(cant)
            except (TypeError, ValueError):
                cant_int = int(float(cant))

            est = (r.get("estado_kds") or "pendiente").strip()
            enviado = r.get("kds_enviado_at")
            enviado_iso = enviado.isoformat() if enviado else ""

            linea = {
                "id": str(r["id"]),
                "producto_nombre": r["producto_nombre"] or "",
                "cantidad": cant_int,
                "nota": r["nota"],
                "destino_kds": r.get("destino_kds") or "cocina",
                "estado_kds": est,
                "estado_cocina": est,
                "enviado_cocina_at": enviado_iso,
                "minutos_espera": mins,
                "tiempo_preparacion": r["tiempo_preparacion"],
                "alerta": al,
            }
            by_ticket[tid]["lineas"].append(linea)

        result = []
        for data in by_ticket.values():
            alertas = [ln["alerta"] for ln in data["lineas"]]
            data["alerta_comanda"] = _alerta_comanda(alertas)
            del data["_sort_key"]
            result.append(data)

        result.sort(
            key=lambda x: min(
                (ln.get("enviado_cocina_at") or "" for ln in x["lineas"]),
                default="",
            )
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_comandas: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
