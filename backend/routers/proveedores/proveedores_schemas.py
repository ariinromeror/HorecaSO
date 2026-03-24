from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, model_validator


class CreateProveedorRequest(BaseModel):
    nombre: str = Field(..., min_length=1)
    nif: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    condiciones_pago: Optional[str] = None
    dias_entrega: Optional[int] = None


class UpdateProveedorRequest(BaseModel):
    nombre: Optional[str] = None
    nif: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    condiciones_pago: Optional[str] = None
    dias_entrega: Optional[int] = None
    activo: Optional[bool] = None

    @model_validator(mode="after")
    def al_menos_uno(self):
        fields = (
            self.nombre,
            self.nif,
            self.email,
            self.telefono,
            self.direccion,
            self.condiciones_pago,
            self.dias_entrega,
            self.activo,
        )
        if all(v is None for v in fields):
            raise ValueError("Debe enviar al menos un campo para actualizar")
        return self
