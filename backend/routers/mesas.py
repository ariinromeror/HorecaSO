"""
Router de mesas para HorecaSO.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.dependencies import get_current_user, require_roles
from database import get_db

logger = logging.getLogger(__name__)

ESTADOS_VALIDOS = ("libre", "ocupada", "reservada")

router = APIRouter(
    prefix="/api/mesas",
    tags=["Mesas"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


class CreateMesaRequest(BaseModel):
    """Body para crear mesa."""

    numero: int
    capacidad: int = 4
    zona: str | None = None
    posicion_x: float | None = None
    posicion_y: float | None = None
    outlet_id: str


class EstadoUpdateRequest(BaseModel):
    """Body para actualizar estado."""

    estado: str


class UpdateMesaPutRequest(BaseModel):
    """Body para editar mesa (al menos un campo en el endpoint)."""

    numero: int | None = None
    capacidad: int | None = None
    zona: str | None = None
    forma: str | None = None
    posicion_x: float | None = None
    posicion_y: float | None = None


def _mesa_to_dict(row) -> dict:
    """Convierte fila asyncpg a dict con UUIDs como string."""
    r = dict(row)
    return {
        "id": str(r["id"]),
        "outlet_id": str(r["outlet_id"]) if r["outlet_id"] else None,
        "numero": r["numero"],
        "capacidad": r["capacidad"],
        "estado": r["estado"],
        "posicion_x": float(r["posicion_x"]) if r["posicion_x"] is not None else None,
        "posicion_y": float(r["posicion_y"]) if r["posicion_y"] is not None else None,
        "zona": r["zona"],
        "forma": r.get("forma"),
    }


async def _get_user_tenant_outlet(conn, user_id: str) -> tuple[str | None, str | None]:
    """Obtiene tenant_id y outlet_id del usuario. (tenant_id, outlet_id)."""
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


@router.get("")
async def list_mesas(current_user: dict = Depends(get_current_user)):
    """
    Lista mesas. Si usuario tiene outlet_id → solo ese outlet.
    Si no (admin/director) → todas las mesas del tenant.
    """
    async with get_db() as conn:
        tenant_id, outlet_id = await _get_user_tenant_outlet(conn, current_user["sub"])

        if outlet_id:
            rows = await conn.fetch(
                "SELECT * FROM mesas WHERE outlet_id = $1 ORDER BY numero",
                UUID(outlet_id),
            )
        elif tenant_id:
            rows = await conn.fetch(
                """
                SELECT m.* FROM mesas m
                JOIN outlets o ON m.outlet_id = o.id
                WHERE o.tenant_id = $1
                ORDER BY m.numero
                """,
                UUID(tenant_id),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant asignado",
            )

    return [_mesa_to_dict(r) for r in rows]


@router.get("/{mesa_id}")
async def get_mesa(
    mesa_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Devuelve detalle de una mesa. HTTP 404 si no existe."""
    async with get_db() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM mesas WHERE id = $1",
            mesa_id,
        )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesa no encontrada",
        )

    return _mesa_to_dict(row)


@router.post("")
async def create_mesa(
    body: CreateMesaRequest,
    current_user: dict = Depends(get_current_user),
):
    """Crea nueva mesa con estado='libre'."""
    async with get_db() as conn:
        tenant_id, user_outlet_id = await _get_user_tenant_outlet(
            conn, current_user["sub"]
        )
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant asignado",
            )

        # Verificar que el outlet pertenece al tenant del usuario
        outlet_row = await conn.fetchrow(
            "SELECT id, tenant_id FROM outlets WHERE id = $1",
            UUID(body.outlet_id),
        )
        if not outlet_row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Outlet no encontrado",
            )
        if str(outlet_row["tenant_id"]) != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puede crear mesas en ese outlet",
            )
        if user_outlet_id and user_outlet_id != body.outlet_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo puede crear mesas en su outlet",
            )

        row = await conn.fetchrow(
            """
            INSERT INTO mesas (outlet_id, numero, capacidad, estado, posicion_x, posicion_y, zona)
            VALUES ($1, $2, $3, 'libre', $4, $5, $6)
            RETURNING *
            """,
            UUID(body.outlet_id),
            body.numero,
            body.capacidad,
            body.posicion_x,
            body.posicion_y,
            body.zona,
        )

    logger.info("Mesa creada: %s en outlet %s", body.numero, body.outlet_id)
    return _mesa_to_dict(row)


@router.patch("/{mesa_id}/estado")
async def update_mesa_estado(
    mesa_id: UUID,
    body: EstadoUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Actualiza solo el estado de la mesa."""
    if body.estado not in ESTADOS_VALIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estado inválido. Válidos: {', '.join(ESTADOS_VALIDOS)}",
        )

    async with get_db() as conn:
        tenant_id, user_outlet_id = await _get_user_tenant_outlet(
            conn, current_user["sub"]
        )
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant asignado",
            )

        # Verificar que la mesa existe y pertenece al tenant/outlet del usuario
        mesa_row = await conn.fetchrow(
            """
            SELECT m.*, o.tenant_id
            FROM mesas m
            JOIN outlets o ON m.outlet_id = o.id
            WHERE m.id = $1
            """,
            mesa_id,
        )
        if not mesa_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mesa no encontrada",
            )
        if str(mesa_row["tenant_id"]) != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puede modificar esa mesa",
            )
        if user_outlet_id and str(mesa_row["outlet_id"]) != user_outlet_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puede modificar esa mesa",
            )

        row = await conn.fetchrow(
            "UPDATE mesas SET estado = $1 WHERE id = $2 RETURNING *",
            body.estado,
            mesa_id,
        )

    logger.info("Mesa %s estado actualizado a %s", mesa_id, body.estado)
    return _mesa_to_dict(row)


async def _require_mesa_in_user_scope(conn, mesa_id: UUID, user_id: str):
    """
    Mesa debe existir y pertenecer al tenant del usuario;
    si el usuario tiene outlet_id, solo mesas de ese outlet.
    """
    tenant_id, user_outlet_id = await _get_user_tenant_outlet(conn, user_id)
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario sin tenant asignado",
        )
    mesa_row = await conn.fetchrow(
        """
        SELECT m.*, o.tenant_id
        FROM mesas m
        JOIN outlets o ON m.outlet_id = o.id
        WHERE m.id = $1
        """,
        mesa_id,
    )
    if not mesa_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesa no encontrada",
        )
    if str(mesa_row["tenant_id"]) != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puede modificar esa mesa",
        )
    if user_outlet_id and str(mesa_row["outlet_id"]) != user_outlet_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puede modificar esa mesa",
        )
    return mesa_row


@router.put("/{mesa_id}")
async def update_mesa(
    mesa_id: UUID,
    body: UpdateMesaPutRequest,
    current_user: dict = Depends(
        require_roles(["admin", "director", "jefe_sala"])
    ),
):
    """Edita campos de una mesa (numero, capacidad, zona, forma, posición)."""
    try:
        has_any = (
            body.numero is not None
            or body.capacidad is not None
            or body.zona is not None
            or body.forma is not None
            or body.posicion_x is not None
            or body.posicion_y is not None
        )
        if not has_any:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Al menos un campo es requerido",
            )

        async with get_db() as conn:
            await _require_mesa_in_user_scope(conn, mesa_id, current_user["sub"])

            args: list = []
            updates: list[str] = []
            if body.numero is not None:
                args.append(body.numero)
                updates.append("numero = $" + str(len(args)))
            if body.capacidad is not None:
                args.append(body.capacidad)
                updates.append("capacidad = $" + str(len(args)))
            if body.zona is not None:
                args.append(body.zona)
                updates.append("zona = $" + str(len(args)))
            if body.forma is not None:
                args.append(body.forma)
                updates.append("forma = $" + str(len(args)))
            if body.posicion_x is not None:
                args.append(body.posicion_x)
                updates.append("posicion_x = $" + str(len(args)))
            if body.posicion_y is not None:
                args.append(body.posicion_y)
                updates.append("posicion_y = $" + str(len(args)))

            args.append(mesa_id)
            ph_id = len(args)
            sql = (
                "UPDATE mesas SET "
                + ", ".join(updates)
                + " WHERE id = $"
                + str(ph_id)
                + " RETURNING *"
            )
            row = await conn.fetchrow(sql, *args)

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mesa no encontrada",
            )
        logger.info("Mesa actualizada: %s", mesa_id)
        return _mesa_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en update_mesa: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )


@router.delete("/{mesa_id}")
async def delete_mesa(
    mesa_id: UUID,
    current_user: dict = Depends(
        require_roles(["admin", "director", "jefe_sala"])
    ),
):
    """Elimina una mesa solo si está libre."""
    try:
        async with get_db() as conn:
            mesa_row = await _require_mesa_in_user_scope(
                conn, mesa_id, current_user["sub"]
            )

            if mesa_row["estado"] != "libre":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se puede eliminar una mesa ocupada o reservada",
                )

            await conn.execute("DELETE FROM mesas WHERE id = $1", mesa_id)

        logger.info("Mesa eliminada: %s", mesa_id)
        return {"deleted": True, "id": str(mesa_id)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en delete_mesa: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
