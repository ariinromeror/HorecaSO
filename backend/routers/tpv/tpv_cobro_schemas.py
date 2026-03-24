from decimal import Decimal

from pydantic import BaseModel


class CobrarRequest(BaseModel):
    """Body para cobrar ticket."""

    metodo_pago: str


class AddTicketPagoRequest(BaseModel):
    """Body para registrar un pago parcial (división de cuenta)."""

    importe: Decimal
    metodo_pago: str
