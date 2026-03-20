"""
Router KDS (Kitchen Display System) — comandas en cocina.
"""

import logging
from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

ROLES_KDS_LECTURA = ["admin", "director", "jefe_sala", "cocina"]
ROLES_KDS_ESCRITURA = ["admin", "director", "jefe_sala", "cocina"]

router = APIRouter(
    prefix="/kds",
    tags=["KDS"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


async def _get_user_outlet(conn, user_id: str) -> str | None:
    row = await conn.fetchrow(
        "SELECT outlet_id FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["outlet_id"]:
        return None
    return str(row["outlet_id"])


def _minutos_espera(val) -> float:
    if val is None:
        return 0.0
    return max(0.0, round(float(val), 1))


def _alerta_linea(minutos: float) -> Literal["ok", "warning", "critico"]:
    if minutos < 5:
        return "ok"
    if minutos < 10:
        return "warning"
    return "critico"


def _alerta_comanda(lineas_alertas: list[str]) -> Literal["ok", "warning", "critico"]:
    if "critico" in lineas_alertas:
        return "critico"
    if "warning" in lineas_alertas:
        return "warning"
    return "ok"


class PatchLineaEstadoBody(BaseModel):
    estado: Literal["preparando", "listo"]


@router.get("/comandas")
async def get_comandas(
    current_user: dict = Depends(require_roles(ROLES_KDS_LECTURA)),
):
    """Líneas pendientes de cocina agrupadas por ticket."""
    try:
        async with get_db() as conn:
            outlet_id = await _get_user_outlet(conn, current_user["sub"])
            if not outlet_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuario sin outlet asignado",
                )

            rows = await conn.fetch(
                """
                SELECT
                    tl.id, tl.ticket_id, tl.cantidad,
                    tl.nota, tl.estado_cocina, tl.enviado_cocina_at,
                    p.nombre AS producto_nombre,
                    p.tiempo_preparacion,
                    t.created_at AS ticket_created_at,
                    m.numero AS mesa_numero, m.zona AS mesa_zona,
                    EXTRACT(EPOCH FROM (NOW() - tl.enviado_cocina_at)) / 60
                        AS minutos_espera
                FROM ticket_lineas tl
                JOIN tickets t ON tl.ticket_id = t.id
                JOIN productos p ON tl.producto_id = p.id
                LEFT JOIN mesas m ON t.mesa_id = m.id
                WHERE t.outlet_id = $1
                  AND tl.enviado_cocina = true
                  AND tl.estado_cocina != 'listo'
                ORDER BY tl.enviado_cocina_at ASC
                """,
                UUID(outlet_id),
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
                    "_sort_key": r.get("enviado_cocina_at"),
                }
            mins = _minutos_espera(r.get("minutos_espera"))
            al = _alerta_linea(mins)
            cant = r["cantidad"]
            try:
                cant_int = int(cant)
            except (TypeError, ValueError):
                cant_int = int(float(cant))

            linea = {
                "id": str(r["id"]),
                "producto_nombre": r["producto_nombre"] or "",
                "cantidad": cant_int,
                "nota": r["nota"],
                "estado_cocina": r["estado_cocina"] or "pendiente",
                "enviado_cocina_at": r["enviado_cocina_at"].isoformat()
                if r.get("enviado_cocina_at")
                else "",
                "minutos_espera": mins,
                "tiempo_preparacion": r["tiempo_preparacion"],
                "alerta": al,
            }
            by_ticket[tid]["lineas"].append(linea)

        result = []
        for data in by_ticket.values():
            alertas = [ln["alerta"] for ln in data["lineas"]]
            data["alerta_comanda"] = _alerta_comanda(alertas)
            result.append(data)

        result.sort(
            key=lambda x: min(
                (
                    ln.get("enviado_cocina_at") or ""
                    for ln in x["lineas"]
                ),
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


def _valid_transition(actual: str, nuevo: str) -> bool:
    if actual == "listo":
        return False
    if nuevo == "preparando":
        return actual == "pendiente"
    if nuevo == "listo":
        return actual in ("pendiente", "preparando")
    return False


@router.patch("/lineas/{linea_id}/estado")
async def patch_linea_estado(
    linea_id: UUID,
    body: PatchLineaEstadoBody,
    current_user: dict = Depends(require_roles(ROLES_KDS_ESCRITURA)),
):
    """Actualiza estado_cocina de una línea (preparando / listo)."""
    try:
        async with get_db() as conn:
            outlet_id = await _get_user_outlet(conn, current_user["sub"])
            if not outlet_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuario sin outlet asignado",
                )

            row = await conn.fetchrow(
                """
                SELECT tl.id, tl.ticket_id, tl.estado_cocina,
                       p.nombre AS producto_nombre,
                       m.numero AS mesa_numero
                FROM ticket_lineas tl
                JOIN tickets t ON tl.ticket_id = t.id
                JOIN productos p ON tl.producto_id = p.id
                LEFT JOIN mesas m ON t.mesa_id = m.id
                WHERE tl.id = $1 AND t.outlet_id = $2
                """,
                linea_id,
                UUID(outlet_id),
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Línea no encontrada",
                )

            anterior = row["estado_cocina"] or "pendiente"
            if anterior == "listo":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se puede revertir un plato listo",
                )
            if not _valid_transition(anterior, body.estado):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Transición de estado no válida",
                )

            await conn.execute(
                """
                UPDATE ticket_lineas
                SET estado_cocina = $1
                WHERE id = $2
                """,
                body.estado,
                linea_id,
            )

        return {
            "linea_id": str(linea_id),
            "estado_anterior": anterior,
            "estado_nuevo": body.estado,
            "producto_nombre": row["producto_nombre"] or "",
            "mesa_numero": row["mesa_numero"],
            "ticket_id": str(row["ticket_id"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en patch_linea_estado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.get("/estadisticas")
async def get_estadisticas(
    desde: date = Query(default_factory=date.today),
    current_user: dict = Depends(require_roles(ROLES_KDS_LECTURA)),
):
    """Métricas KDS para el outlet desde una fecha (por defecto hoy)."""
    try:
        async with get_db() as conn:
            outlet_id = await _get_user_outlet(conn, current_user["sub"])
            if not outlet_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuario sin outlet asignado",
                )

            oid = UUID(outlet_id)

            rows_estado = await conn.fetch(
                """
                SELECT COALESCE(tl.estado_cocina, 'pendiente') AS st,
                       COUNT(*)::int AS cnt
                FROM ticket_lineas tl
                JOIN tickets t ON tl.ticket_id = t.id
                WHERE t.outlet_id = $1
                  AND tl.enviado_cocina = true
                  AND t.created_at::date >= $2
                GROUP BY COALESCE(tl.estado_cocina, 'pendiente')
                """,
                oid,
                desde,
            )

            counts = {"pendiente": 0, "preparando": 0, "listo": 0}
            for r in rows_estado:
                st = r["st"]
                if st in counts:
                    counts[st] = r["cnt"]

            comandas_activas = await conn.fetchval(
                """
                SELECT COUNT(DISTINCT tl.ticket_id)::int
                FROM ticket_lineas tl
                JOIN tickets t ON tl.ticket_id = t.id
                WHERE t.outlet_id = $1
                  AND tl.enviado_cocina = true
                  AND tl.estado_cocina != 'listo'
                  AND t.created_at::date >= $2
                """,
                oid,
                desde,
            )

            top = await conn.fetchrow(
                """
                SELECT p.nombre, SUM(tl.cantidad)::int AS total_cant
                FROM ticket_lineas tl
                JOIN tickets t ON tl.ticket_id = t.id
                JOIN productos p ON tl.producto_id = p.id
                WHERE t.outlet_id = $1
                  AND t.estado = 'cobrado'
                  AND t.created_at::date >= $2
                GROUP BY p.id, p.nombre
                ORDER BY total_cant DESC
                LIMIT 1
                """,
                oid,
                desde,
            )

        producto_mas = None
        if top and top["nombre"] is not None:
            producto_mas = {
                "nombre": top["nombre"],
                "cantidad": int(top["total_cant"] or 0),
            }

        return {
            "desde": desde.isoformat(),
            "platos_completados": counts["listo"],
            "platos_pendientes": counts["pendiente"],
            "platos_preparando": counts["preparando"],
            "comandas_activas": int(comandas_activas or 0),
            "tiempo_medio_preparacion": None,
            "producto_mas_pedido": producto_mas,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_estadisticas: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
