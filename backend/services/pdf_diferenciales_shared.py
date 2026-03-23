"""Helpers compartidos PDFs diferenciales (cuadrante y BCG)."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP


def _q2(x) -> Decimal:
    return Decimal(str(x or 0)).quantize(Decimal("0.01"), ROUND_HALF_UP)


def _m(v) -> str:
    return str(_q2(v))
