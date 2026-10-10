"""
Fechas de negocio en hora de Madrid.

La BD trabaja en UTC: en SQL, el día de un timestamptz se obtiene siempre con
    (columna AT TIME ZONE 'Europe/Madrid')::date
y nunca con DATE(columna), columna::date ni CURRENT_DATE.
"""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

MADRID = ZoneInfo("Europe/Madrid")


def fecha_madrid(instante: datetime) -> date:
    """Día natural en Madrid de un instante con zona horaria."""
    return instante.astimezone(MADRID).date()


def hoy_madrid() -> date:
    return fecha_madrid(datetime.now(timezone.utc))
