from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class MovimientoRequest(BaseModel):
    articulo_id: str
    tipo: Literal["entrada", "salida", "ajuste", "merma"]
    cantidad: Decimal = Field(ge=0)
    motivo: Optional[str] = None
    coste_unitario: Optional[Decimal] = None

    @model_validator(mode="after")
    def cantidad_segun_tipo(self):
        if self.tipo in ("entrada", "salida", "merma") and self.cantidad <= 0:
            raise ValueError("cantidad debe ser mayor que 0 para este tipo")
        return self


class InventarioFisicoItem(BaseModel):
    articulo_id: str
    cantidad_real: Decimal = Field(..., ge=0)


class InventarioFisicoRequest(BaseModel):
    articulos: list[InventarioFisicoItem]
