"""
HorecaSO Print Agent (Camino 2) — ESC/POS opcional en el PC de la Epson.

Uso:
  pip install fastapi uvicorn python-escpos
  python print_agent.py

Escucha http://127.0.0.1:9173/print
Si no hay impresora ESC/POS configurada, responde 503 y el TPV usa window.print.

Variables:
  HORECASO_PRINTER=USB  (o nombre de red; por defecto simula OK sin hardware)
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logger = logging.getLogger("horecaso_print_agent")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="HorecaSO Print Agent", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PrintLine(BaseModel):
    cantidad: float = 1
    nombre: str = ""
    subtotal: float | None = None
    nota: str | None = None


class TenantPrint(BaseModel):
    nombre: str | None = None
    razon_social: str | None = None
    nif: str | None = None
    direccion: str | None = None
    codigo_postal: str | None = None
    ciudad: str | None = None
    provincia: str | None = None
    telefono: str | None = None


class PrintPayload(BaseModel):
    tipo: str = Field("ticket", description="comanda|ticket|cierre")
    mesa: str | None = None
    lineas: list[PrintLine] = Field(default_factory=list)
    total: float | None = None
    tenant: str | None = None
    tenant_print: TenantPrint | None = None
    cerrado_por: str | None = None
    fecha: str | None = None
    num_tickets: int | None = None
    ticket_medio: float | None = None


def _nonempty(val: str | None) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s or None


def _display_name(body: PrintPayload) -> str:
    tp = body.tenant_print
    if tp:
        return (
            _nonempty(tp.razon_social)
            or _nonempty(tp.nombre)
            or _nonempty(body.tenant)
            or "HorecaSO"
        )
    return _nonempty(body.tenant) or "HorecaSO"


def _append_tenant_header(lines: list[str], body: PrintPayload, fiscal: bool) -> None:
    lines.append(_display_name(body))
    tp = body.tenant_print
    if not fiscal or not tp:
        return
    nif = _nonempty(tp.nif)
    if nif:
        lines.append(f"NIF {nif}")
    direccion = _nonempty(tp.direccion)
    if direccion:
        lines.append(direccion)
    loc_bits = []
    if _nonempty(tp.codigo_postal):
        loc_bits.append(tp.codigo_postal.strip())
    if _nonempty(tp.ciudad):
        loc_bits.append(tp.ciudad.strip())
    if _nonempty(tp.provincia):
        loc_bits.append(f"({tp.provincia.strip()})")
    if loc_bits:
        lines.append(" ".join(loc_bits))
    tel = _nonempty(tp.telefono)
    if tel:
        lines.append(f"Tel. {tel}")


def _fmt_fecha_es(fecha: str | None) -> str:
    if not fecha:
        return datetime.now().strftime("%d/%m/%Y")
    parts = fecha.split("-")
    if len(parts) == 3:
        return f"{parts[2]}/{parts[1]}/{parts[0]}"
    return fecha


def _format_cierre(body: PrintPayload) -> str:
    lines: list[str] = []
    _append_tenant_header(lines, body, fiscal=True)
    lines.append("CIERRE DE CAJA")
    hora = datetime.now().strftime("%H:%M")
    lines.append(f"Fecha: {_fmt_fecha_es(body.fecha)} · {hora}")
    if body.cerrado_por:
        lines.append(f"Cerrado por: {body.cerrado_por}")
    lines.append("-" * 32)

    for ln in body.lineas:
        importe = ln.subtotal if ln.subtotal is not None else 0.0
        lines.append(f"{ln.nombre} ........ {importe:.2f} EUR")

    lines.append("-" * 32)
    total = body.total if body.total is not None else 0.0
    lines.append(f"TOTAL ............ {total:.2f} EUR")
    n = body.num_tickets if body.num_tickets is not None else 0
    medio = body.ticket_medio if body.ticket_medio is not None else 0.0
    lines.append(f"Tickets: {n} · Medio: {medio:.2f} EUR")
    lines.append("-" * 32)
    lines.append("Powered by HorecaSO")
    return "\n".join(lines)


def _format_text(body: PrintPayload) -> str:
    if body.tipo == "cierre":
        return _format_cierre(body)

    is_ticket = body.tipo == "ticket"
    lines: list[str] = []
    _append_tenant_header(lines, body, fiscal=is_ticket)

    lines.append(body.tipo.upper())
    if body.mesa:
        lines.append(f"Mesa {body.mesa}")
    lines.append("-" * 32)

    for ln in body.lineas:
        lines.append(f"{ln.cantidad:g}x {ln.nombre}")
        if ln.nota and not is_ticket:
            lines.append(f"  {ln.nota}")
        if ln.subtotal is not None and is_ticket:
            lines.append(f"  {ln.subtotal:.2f} EUR")

    if is_ticket and body.total is not None:
        lines.append("-" * 32)
        lines.append(f"TOTAL {body.total:.2f} EUR")
        lines.append("-" * 32)
        lines.append("Gracias por su compra!")
        lines.append("Le esperamos pronto")
        lines.append("Powered by HorecaSO")
    else:
        lines.append("-" * 32)
        lines.append("HorecaSO")

    return "\n".join(x for x in lines if x is not None)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/print")
def print_ticket(body: PrintPayload) -> dict[str, Any]:
    text = _format_text(body)
    printer = os.getenv("HORECASO_PRINTER", "").strip()
    if not printer:
        logger.info("Print (simulado, sin HORECASO_PRINTER):\n%s", text)
        return {"ok": True, "mode": "simulated", "chars": len(text)}

    try:
        from escpos.printer import Usb  # type: ignore

        # IDs genéricos — el local debe ajustar vendor/product de su Epson
        p = Usb(0x04B8, 0x0E15, 0)
        p.text(text + "\n\n")
        p.cut()
        return {"ok": True, "mode": "usb"}
    except Exception as e:
        logger.error("Print agent error: %s", e)
        raise HTTPException(status_code=503, detail=str(e)) from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=9173)
