from pydantic import BaseModel, Field


class CreateTicketRequest(BaseModel):
    """Body para crear ticket."""

    mesa_id: str
    outlet_id: str


class AddLineaRequest(BaseModel):
    """Body para añadir línea."""

    producto_id: str
    cantidad: int = Field(..., gt=0, le=999)
    nota: str | None = None


class PatchLineaNotaRequest(BaseModel):
    """Actualiza nota de cocina/barra en una línea."""

    nota: str | None = Field(None, max_length=500)