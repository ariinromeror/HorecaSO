"""
Totales de cobro por método de pago (cierre de caja TPV y cierre del dashboard).

La fuente es ticket_pagos. Los tickets cobrados sin filas en ticket_pagos
(cobros por /cobrar anteriores a HSO-21) se imputan a tickets.metodo_pago.
"""

from decimal import Decimal, ROUND_HALF_UP

ZERO = Decimal("0")

CAMPOS_METODO = (
    "total_efectivo",
    "total_tarjeta",
    "total_bizum",
    "total_transferencia",
    "total_invitaciones",
)


def _d(val) -> Decimal:
    if val is None:
        return ZERO
    return Decimal(str(val))


def _add_metodo(buckets: dict[str, Decimal], metodo: str | None, importe: Decimal) -> None:
    m = (metodo or "").strip()
    if m == "efectivo":
        buckets["total_efectivo"] += importe
    elif m in ("tarjeta_credito", "tarjeta_debito"):
        buckets["total_tarjeta"] += importe
    elif m == "bizum":
        buckets["total_bizum"] += importe
    elif m == "transferencia":
        buckets["total_transferencia"] += importe
    elif m == "invitacion":
        buckets["total_invitaciones"] += importe


async def totales_por_metodo(conn, tickets) -> dict:
    """`tickets`: filas cobradas con id, total y metodo_pago."""
    buckets = {k: ZERO for k in CAMPOS_METODO}
    num_tickets = len(tickets)
    if not tickets:
        return {**buckets, "total_ventas": ZERO, "num_tickets": 0, "ticket_medio": ZERO}

    pagos = await conn.fetch(
        """
        SELECT ticket_id, importe, metodo_pago
        FROM ticket_pagos
        WHERE ticket_id = ANY($1::uuid[])
        """,
        [r["id"] for r in tickets],
    )
    pagos_por_ticket: dict = {}
    for p in pagos:
        pagos_por_ticket.setdefault(p["ticket_id"], []).append(p)

    total_ventas = ZERO
    for t in tickets:
        total_ventas += _d(t["total"])
        plist = pagos_por_ticket.get(t["id"])
        if plist:
            for p in plist:
                _add_metodo(buckets, p["metodo_pago"], _d(p["importe"]))
        else:
            _add_metodo(buckets, t["metodo_pago"], _d(t["total"]))

    ticket_medio = (total_ventas / Decimal(num_tickets)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    return {
        **buckets,
        "total_ventas": total_ventas,
        "num_tickets": num_tickets,
        "ticket_medio": ticket_medio,
    }
