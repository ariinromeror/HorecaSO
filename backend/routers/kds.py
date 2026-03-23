"""
Router KDS (Kitchen Display System) — comandas cocina y barra.
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

ROLES_KDS_LECTURA = [
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "barra",
]
ROLES_KDS_ESCRITURA = [
    "admin",
    "director",
    "jefe_sala",
    "camarero",
    "cocina",
    "barra",
]

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


def _kds_vista_for_role(role: str | None) -> Literal["cocina", "barra", "completa"]:
    r = role or ""
    if r == "cocina":
        return "cocina"
    if r == "barra":
        return "barra"
    if r in ("camarero", "jefe_sala", "admin", "director"):
        return "completa"
    return "cocina"


def _resolve_vista(current_user: dict, vista_query: str | None) -> str:
    role = current_user.get("role")
    if vista_query and role in ("admin", "director"):
        if vista_query not in ("cocina", "barra", "completa"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="vista debe ser cocina, barra o completa",
            )
        return vista_query
    return _kds_vista_for_role(role)


def _assert_patch_role_destino(role: str | None, destino_kds: str) -> None:
    r = role or ""
    dk = destino_kds or "cocina"
    if r == "cocina" and dk != "cocina":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para líneas de barra",
        )
    if r == "barra" and dk != "barra":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para líneas de cocina",
        )


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
    estado: Literal["preparando", "listo", "servido"]


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


def _valid_transition(actual: str, nuevo: str) -> bool:
    if actual == "servido":
        return False
    if nuevo == "preparando":
        return actual == "pendiente"
    if nuevo == "listo":
        return actual in ("pendiente", "preparando")
    if nuevo == "servido":
        return actual == "listo"
    return False


@router.patch("/lineas/{linea_id}/estado")
async def patch_linea_estado(
    linea_id: UUID,
    body: PatchLineaEstadoBody,
    current_user: dict = Depends(require_roles(ROLES_KDS_ESCRITURA)),
):
    """Actualiza estado KDS de la línea (columna cocina o barra según producto)."""
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
                SELECT tl.id, tl.ticket_id, tl.estado_cocina, tl.estado_barra,
                       COALESCE(p.destino_kds, 'cocina') AS destino_kds,
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

            dk = str(row["destino_kds"] or "cocina")
            if dk == "ninguno":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Este producto no usa KDS",
                )

            _assert_patch_role_destino(current_user.get("role"), dk)

            if dk == "barra":
                col = "estado_barra"
                anterior = row["estado_barra"] or "pendiente"
            else:
                col = "estado_cocina"
                anterior = row["estado_cocina"] or "pendiente"

            if anterior == "servido":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El plato ya fue marcado como servido",
                )
            if not _valid_transition(anterior, body.estado):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Transición de estado no válida",
                )

            if col not in ("estado_cocina", "estado_barra"):
                raise HTTPException(status_code=500, detail="Error interno")

            await conn.execute(
                f"UPDATE ticket_lineas SET {col} = $1 WHERE id = $2",
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
            "destino_kds": dk,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en patch_linea_estado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


async def _estadisticas_counts(
    conn, oid: UUID, desde: date, vista: str
) -> tuple[dict[str, int], int]:
    """Cuentas por estado y comandas activas para una vista KDS."""
    rows_estado = await conn.fetch(
        """
        SELECT COALESCE(
            CASE WHEN COALESCE(p.destino_kds, 'cocina') = 'barra'
                 THEN tl.estado_barra
                 ELSE tl.estado_cocina
            END,
            'pendiente'
        ) AS st,
        COUNT(*)::int AS cnt
        FROM ticket_lineas tl
        JOIN tickets t ON tl.ticket_id = t.id
        JOIN productos p ON tl.producto_id = p.id
        WHERE t.outlet_id = $1
          AND t.created_at::date >= $2
          AND (
            ($3::text = 'cocina'
             AND COALESCE(p.destino_kds, 'cocina') = 'cocina'
             AND tl.enviado_cocina = true)
            OR
            ($3::text = 'barra'
             AND COALESCE(p.destino_kds, 'cocina') = 'barra'
             AND tl.enviado_barra = true)
            OR
            ($3::text = 'completa'
             AND (
               (COALESCE(p.destino_kds, 'cocina') = 'cocina' AND tl.enviado_cocina)
               OR
               (COALESCE(p.destino_kds, 'cocina') = 'barra' AND tl.enviado_barra)
             ))
          )
        GROUP BY 1
        """,
        oid,
        desde,
        vista,
    )

    counts = {"pendiente": 0, "preparando": 0, "listo": 0, "servido": 0}
    for r in rows_estado:
        st = r["st"]
        if st in counts:
            counts[st] = r["cnt"]

    comandas_activas = await conn.fetchval(
        """
        SELECT COUNT(DISTINCT tl.ticket_id)::int
        FROM ticket_lineas tl
        JOIN tickets t ON tl.ticket_id = t.id
        JOIN productos p ON tl.producto_id = p.id
        WHERE t.outlet_id = $1
          AND t.estado = 'abierto'
          AND t.created_at::date >= $2
          AND (
            ($3::text = 'cocina'
             AND COALESCE(p.destino_kds, 'cocina') = 'cocina'
             AND tl.enviado_cocina = true
             AND COALESCE(tl.estado_cocina, 'pendiente') <> 'servido')
            OR
            ($3::text = 'barra'
             AND COALESCE(p.destino_kds, 'cocina') = 'barra'
             AND tl.enviado_barra = true
             AND COALESCE(tl.estado_barra, 'pendiente') <> 'servido')
            OR
            ($3::text = 'completa'
             AND (
               (COALESCE(p.destino_kds, 'cocina') = 'cocina'
                AND tl.enviado_cocina
                AND COALESCE(tl.estado_cocina, 'pendiente') <> 'servido')
               OR
               (COALESCE(p.destino_kds, 'cocina') = 'barra'
                AND tl.enviado_barra
                AND COALESCE(tl.estado_barra, 'pendiente') <> 'servido')
             ))
          )
        """,
        oid,
        desde,
        vista,
    )

    return counts, int(comandas_activas or 0)


@router.get("/estadisticas")
async def get_estadisticas(
    desde: date = Query(default_factory=date.today),
    vista: str | None = Query(default=None),
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
            v = _resolve_vista(current_user, vista)

            if v == "completa":
                ca, _ = await _estadisticas_counts(conn, oid, desde, "cocina")
                cb, _ = await _estadisticas_counts(conn, oid, desde, "barra")
                counts = {k: ca[k] + cb[k] for k in ca}
                comandas_activas = await conn.fetchval(
                    """
                    SELECT COUNT(DISTINCT tl.ticket_id)::int
                    FROM ticket_lineas tl
                    JOIN tickets t ON tl.ticket_id = t.id
                    JOIN productos p ON tl.producto_id = p.id
                    WHERE t.outlet_id = $1
                      AND t.estado = 'abierto'
                      AND t.created_at::date >= $2
                      AND (
                        (COALESCE(p.destino_kds, 'cocina') = 'cocina'
                         AND tl.enviado_cocina = true
                         AND COALESCE(tl.estado_cocina, 'pendiente') <> 'servido')
                        OR
                        (COALESCE(p.destino_kds, 'cocina') = 'barra'
                         AND tl.enviado_barra = true
                         AND COALESCE(tl.estado_barra, 'pendiente') <> 'servido')
                      )
                    """,
                    oid,
                    desde,
                )
                comandas_activas = int(comandas_activas or 0)
            else:
                counts, comandas_activas = await _estadisticas_counts(
                    conn, oid, desde, v
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
            "vista": v,
            "platos_completados": counts["servido"],
            "platos_listos_recogida": counts["listo"],
            "platos_pendientes": counts["pendiente"],
            "platos_preparando": counts["preparando"],
            "comandas_activas": comandas_activas,
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
