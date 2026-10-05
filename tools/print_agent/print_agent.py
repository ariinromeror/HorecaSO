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


class PrintPayload(BaseModel):
    tipo: str = Field("ticket", description="comanda|ticket")
    mesa: str | None = None
    lineas: list[PrintLine] = Field(default_factory=list)
    total: float | None = None
    tenant: str | None = None


def _format_text(body: PrintPayload) -> str:
    lines = [
        body.tenant or "HorecaSO",
        body.tipo.upper(),
        f"Mesa {body.mesa}" if body.mesa else "",
        "-" * 32,
    ]
    for ln in body.lineas:
        lines.append(f"{ln.cantidad:g}x {ln.nombre}")
        if ln.nota:
            lines.append(f"  {ln.nota}")
        if ln.subtotal is not None and body.tipo == "ticket":
            lines.append(f"  {ln.subtotal:.2f} EUR")
    if body.tipo == "ticket" and body.total is not None:
        lines.append("-" * 32)
        lines.append(f"TOTAL {body.total:.2f} EUR")
    lines.append("Gracias")
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
