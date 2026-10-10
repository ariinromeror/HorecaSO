from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class MovimientoRequest(BaseModel):
    articulo_id: str
    tipo: Literal["entrada", "salida", "ajuste", "merma"]
    # En "ajuste", cantidad es el stock real contado (se registra la diferencia).
    cantidad: Decimal = Field(ge=0)
    motivo: Optional[str] = None
    # Solo entrada y ajuste al alza; salidas y mermas se valoran al coste FIFO.
    coste_unitario: Optional[Decimal] = Field(None, ge=0)
    fecha_caducidad: Optional[date] = None
    numero_lote: Optional[str] = Field(None, max_length=50)

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
