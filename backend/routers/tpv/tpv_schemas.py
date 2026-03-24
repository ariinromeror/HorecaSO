from pydantic import BaseModel


class CreateTicketRequest(BaseModel):
    """Body para crear ticket."""

    mesa_id: str
    outlet_id: str


class AddLineaRequest(BaseModel):
    """Body para añadir línea."""

    producto_id: str
    cantidad: int
    nota: str | None = None
