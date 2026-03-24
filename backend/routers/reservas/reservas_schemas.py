from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


class CreateReservaBody(BaseModel):
    nombre_cliente: str = Field(..., min_length=1)
    telefono: str = Field(..., min_length=1)
    fecha: date
    hora: str = Field(..., min_length=1)
    num_personas: int = Field(..., ge=1)
    mesa_id: Optional[str] = None
    cliente_id: Optional[str] = None
    email: Optional[str] = None
    origen: Literal["telefono", "web", "app", "walk_in"] = "telefono"
    notas: Optional[str] = None


ESTADOS_RESERVA = frozenset(
    {"pendiente", "confirmada", "sentada", "cancelada", "no_show"}
)


class PatchReservaEstadoBody(BaseModel):
    estado: str


class UpdateReservaBody(BaseModel):
    nombre_cliente: Optional[str] = None
    telefono: Optional[str] = None
    fecha: Optional[date] = None
    hora: Optional[str] = None
    num_personas: Optional[int] = Field(None, ge=1)
    mesa_id: Optional[str] = None
    email: Optional[str] = None
    notas: Optional[str] = None
    origen: Optional[Literal["telefono", "web", "app", "walk_in"]] = None
