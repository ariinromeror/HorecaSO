"""
Helpers compartidos: proveedores y facturas de proveedor.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel, Field

from config import settings

logger = logging.getLogger(__name__)

ROLES_ADMIN_ALMACEN = ["admin", "director", "almacen"]
ROLES_LECTURA = ["admin", "director", "almacen", "cocina"]

GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

ESCANEAR_PROMPT = """Analiza esta factura de proveedor de hostelería española.
Extrae SOLO un JSON con este formato exacto, sin texto adicional:
{
  "numero_factura": string o null,
  "fecha": string YYYY-MM-DD o null,
  "proveedor_nombre": string o null,
  "total": number o null,
  "lineas": [
    { "descripcion": string, "cantidad": number,
      "precio_unitario": number, "subtotal": number }
  ]
}"""


def _groq_api_key() -> str:
    return (settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "") or "").strip()

async def _tenant_id_usuario(conn, user_id: str) -> UUID:
    row = await conn.fetchrow(
        "SELECT tenant_id FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario sin tenant asignado",
        )
    return row["tenant_id"]


def _money_float(v: Any) -> float:
    if v is None:
        return 0.0
    return float(Decimal(str(v)).quantize(Decimal("0.01"), ROUND_HALF_UP))


def _proveedor_row_to_dict(r: Any) -> dict:
    ca = r.get("created_at")
    created_iso = ca.isoformat() if ca is not None and hasattr(ca, "isoformat") else None
    return {
        "id": str(r["id"]),
        "nombre": r["nombre"],
        "nif": r["nif"],
        "email": r["email"],
        "telefono": r["telefono"],
        "direccion": r["direccion"],
        "condiciones_pago": r["condiciones_pago"],
        "dias_entrega": r["dias_entrega"],
        "activo": r["activo"],
        "created_at": created_iso,
    }


def _factura_row_to_dict(r: Any, proveedor_nombre: str | None = None) -> dict:
    fn = r.get("fecha")
    fv = r.get("fecha_vencimiento")
    pa = r.get("pagada_at")
    ca = r.get("created_at")
    return {
        "id": str(r["id"]),
        "proveedor_id": str(r["proveedor_id"]) if r.get("proveedor_id") else None,
        "proveedor_nombre": proveedor_nombre if proveedor_nombre is not None else r.get("proveedor_nombre"),
        "numero_factura": r.get("numero_factura"),
        "fecha": fn.isoformat() if fn is not None and hasattr(fn, "isoformat") else str(fn) if fn else None,
        "fecha_vencimiento": fv.isoformat()
        if fv is not None and hasattr(fv, "isoformat")
        else str(fv)
        if fv
        else None,
        "total": _money_float(r.get("total")),
        "pagada": bool(r.get("pagada")) if r.get("pagada") is not None else False,
        "pagada_at": pa.isoformat() if pa is not None and hasattr(pa, "isoformat") else None,
        "procesada_ia": bool(r.get("procesada_ia")) if r.get("procesada_ia") is not None else False,
        "created_at": ca.isoformat() if ca is not None and hasattr(ca, "isoformat") else None,
    }


def _factura_linea_to_dict(r: Any) -> dict:
    return {
        "id": str(r["id"]),
        "articulo_id": str(r["articulo_id"]) if r.get("articulo_id") else None,
        "cantidad": float(Decimal(str(r["cantidad"])).quantize(Decimal("0.0001"), ROUND_HALF_UP)),
        "coste_unitario": _money_float(r.get("coste_unitario")),
        "subtotal": _money_float(r.get("subtotal")),
    }


class FacturaLineaIn(BaseModel):
    articulo_id: str
    cantidad: Decimal = Field(..., gt=0)
    coste_unitario: Decimal = Field(..., ge=0)


class CreateFacturaProveedorRequest(BaseModel):
    proveedor_id: str
    numero_factura: Optional[str] = None
    fecha: date
    fecha_vencimiento: Optional[date] = None
    total: Optional[Decimal] = None
    lineas: list[FacturaLineaIn] = Field(..., min_length=1)


class EscanearFacturaIARequest(BaseModel):
    imagen_base64: str = Field(..., min_length=1)
    proveedor_id: Optional[str] = None


def _strip_data_url(b64: str) -> tuple[str, str]:
    s = b64.strip()
    mime = "image/jpeg"
    m = re.match(r"^data:([^;]+);base64,(.+)$", s, re.DOTALL)
    if m:
        mime = m.group(1).strip() or mime
        s = m.group(2).strip()
    return s, mime


def _parse_json_desde_groq(text: str) -> dict[str, Any]:
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\s*```\s*$", "", t)
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", t)
        if m:
            return json.loads(m.group(0))
        raise


def _groq_escanear_sync(imagen_base64: str, mime: str) -> dict[str, Any]:
    try:
        from groq import Groq
    except ImportError:
        return {"error": "Paquete groq no instalado", "lineas": []}

    key = _groq_api_key()
    if not key:
        return {"error": "GROQ_API_KEY no configurada", "lineas": []}

    try:
        client = Groq(api_key=key)
        data_url = f"data:{mime};base64,{imagen_base64}"
        completion = client.chat.completions.create(
            model=GROQ_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": ESCANEAR_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url},
                        },
                    ],
                }
            ],
            temperature=0.2,
            max_tokens=4096,
        )
        choice = completion.choices[0] if completion.choices else None
        if not choice or not choice.message or not choice.message.content:
            return {"error": "Respuesta vacía del modelo", "lineas": []}
        raw = choice.message.content
        try:
            parsed = _parse_json_desde_groq(raw)
            if not isinstance(parsed, dict):
                return {"error": "JSON inválido: no es un objeto", "lineas": []}
            parsed.setdefault("lineas", [])
            return parsed
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("No se pudo parsear JSON de Groq: %s", e)
            return {
                "error": f"No se pudo parsear la respuesta: {e!s}",
                "lineas": [],
            }
    except Exception as e:
        logger.error("Error llamada Groq: %s", e)
        return {"error": str(e), "lineas": []}
