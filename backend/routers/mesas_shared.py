"""
Helpers y modelos compartidos del router de mesas.
"""

from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel

ESTADOS_VALIDOS = ("libre", "ocupada", "reservada")


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
