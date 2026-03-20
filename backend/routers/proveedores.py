"""
Router proveedores y facturas de compra para HorecaSO.
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

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, model_validator

from auth.dependencies import require_roles
from config import settings
from database import get_db

logger = logging.getLogger(__name__)

ROLES_ADMIN_ALMACEN = ["admin", "director", "almacen"]
ROLES_LECTURA = ["admin", "director", "almacen", "cocina"]

router = APIRouter(
    tags=["Proveedores"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

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


class CreateProveedorRequest(BaseModel):
    nombre: str = Field(..., min_length=1)
    nif: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    condiciones_pago: Optional[str] = None
    dias_entrega: Optional[int] = None


class UpdateProveedorRequest(BaseModel):
    nombre: Optional[str] = None
    nif: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    condiciones_pago: Optional[str] = None
    dias_entrega: Optional[int] = None
    activo: Optional[bool] = None

    @model_validator(mode="after")
    def al_menos_uno(self):
        fields = (
            self.nombre,
            self.nif,
            self.email,
            self.telefono,
            self.direccion,
            self.condiciones_pago,
            self.dias_entrega,
            self.activo,
        )
        if all(v is None for v in fields):
            raise ValueError("Debe enviar al menos un campo para actualizar")
        return self


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


@router.get("/proveedores")
async def list_proveedores(
    buscar: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            conds: list[str] = ["p.tenant_id = $1"]
            args: list[Any] = [tenant_id]
            n = 2
            if buscar and buscar.strip():
                conds.append(f"p.nombre ILIKE ${n}")
                args.append(f"%{buscar.strip()}%")
                n += 1
            if activo is not None:
                conds.append(f"p.activo = ${n}")
                args.append(activo)
                n += 1
            where_sql = " AND ".join(conds)
            sql = f"""
                SELECT
                    p.id, p.nombre, p.nif, p.email, p.telefono, p.direccion,
                    p.condiciones_pago, p.dias_entrega, p.activo
                FROM proveedores p
                WHERE {where_sql}
                ORDER BY p.nombre ASC
            """
            rows = await conn.fetch(sql, *args)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_proveedores: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return [_proveedor_row_to_dict(r) for r in rows]


@router.post("/proveedores")
async def create_proveedor(
    body: CreateProveedorRequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            row = await conn.fetchrow(
                """
                INSERT INTO proveedores (
                    tenant_id, nombre, nif, email, telefono, direccion,
                    condiciones_pago, dias_entrega, activo
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 1), TRUE)
                RETURNING
                    id, nombre, nif, email, telefono, direccion,
                    condiciones_pago, dias_entrega, activo
                """,
                tenant_id,
                body.nombre.strip(),
                body.nif,
                body.email,
                body.telefono,
                body.direccion,
                body.condiciones_pago,
                body.dias_entrega,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en create_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return _proveedor_row_to_dict(row)


@router.get("/proveedores/{proveedor_id}")
async def get_proveedor(
    proveedor_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            row = await conn.fetchrow(
                """
                SELECT
                    id, nombre, nif, email, telefono, direccion,
                    condiciones_pago, dias_entrega, activo
                FROM proveedores
                WHERE id = $1 AND tenant_id = $2
                """,
                proveedor_id,
                tenant_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proveedor no encontrado",
                )
            facturas = await conn.fetch(
                """
                SELECT
                    id, proveedor_id, numero_factura, fecha, fecha_vencimiento,
                    total, pagada, pagada_at, procesada_ia, created_at
                FROM facturas_proveedor
                WHERE proveedor_id = $1 AND tenant_id = $2
                ORDER BY fecha DESC, created_at DESC
                LIMIT 5
                """,
                proveedor_id,
                tenant_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    base = _proveedor_row_to_dict(row)
    base["facturas_recientes"] = [
        _factura_row_to_dict(f, proveedor_nombre=row["nombre"]) for f in facturas
    ]
    return base


@router.put("/proveedores/{proveedor_id}")
async def update_proveedor(
    proveedor_id: UUID,
    body: UpdateProveedorRequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            exists = await conn.fetchval(
                "SELECT 1 FROM proveedores WHERE id = $1 AND tenant_id = $2",
                proveedor_id,
                tenant_id,
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proveedor no encontrado",
                )

            sets: list[str] = []
            vals: list[Any] = []
            n = 1

            if body.nombre is not None:
                sets.append(f"nombre = ${n}")
                vals.append(body.nombre.strip())
                n += 1
            if body.nif is not None:
                sets.append(f"nif = ${n}")
                vals.append(body.nif)
                n += 1
            if body.email is not None:
                sets.append(f"email = ${n}")
                vals.append(body.email)
                n += 1
            if body.telefono is not None:
                sets.append(f"telefono = ${n}")
                vals.append(body.telefono)
                n += 1
            if body.direccion is not None:
                sets.append(f"direccion = ${n}")
                vals.append(body.direccion)
                n += 1
            if body.condiciones_pago is not None:
                sets.append(f"condiciones_pago = ${n}")
                vals.append(body.condiciones_pago)
                n += 1
            if body.dias_entrega is not None:
                sets.append(f"dias_entrega = ${n}")
                vals.append(body.dias_entrega)
                n += 1
            if body.activo is not None:
                sets.append(f"activo = ${n}")
                vals.append(body.activo)
                n += 1

            vals.extend([proveedor_id, tenant_id])
            sql = f"""
                UPDATE proveedores
                SET {", ".join(sets)}
                WHERE id = ${n} AND tenant_id = ${n + 1}
                RETURNING
                    id, nombre, nif, email, telefono, direccion,
                    condiciones_pago, dias_entrega, activo
            """
            row = await conn.fetchrow(sql, *vals)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en update_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return _proveedor_row_to_dict(row)


@router.delete("/proveedores/{proveedor_id}")
async def delete_proveedor(
    proveedor_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            exists = await conn.fetchval(
                "SELECT 1 FROM proveedores WHERE id = $1 AND tenant_id = $2",
                proveedor_id,
                tenant_id,
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proveedor no encontrado",
                )
            cnt = await conn.fetchval(
                """
                SELECT COUNT(*)::INTEGER FROM facturas_proveedor
                WHERE proveedor_id = $1 AND tenant_id = $2
                """,
                proveedor_id,
                tenant_id,
            )
            if cnt and int(cnt) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Proveedor con facturas no se puede eliminar",
                )
            await conn.execute(
                """
                UPDATE proveedores SET activo = FALSE
                WHERE id = $1 AND tenant_id = $2
                """,
                proveedor_id,
                tenant_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en delete_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return {"deleted": True, "id": str(proveedor_id)}


@router.get("/facturas-proveedor")
async def list_facturas_proveedor(
    proveedor_id: Optional[str] = Query(None),
    pagada: Optional[bool] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            conds: list[str] = ["f.tenant_id = $1"]
            args: list[Any] = [tenant_id]
            n = 2
            if proveedor_id:
                conds.append(f"f.proveedor_id = ${n}")
                args.append(UUID(proveedor_id))
                n += 1
            if pagada is not None:
                conds.append(f"f.pagada = ${n}")
                args.append(pagada)
                n += 1
            if desde is not None:
                conds.append(f"f.fecha >= ${n}")
                args.append(desde)
                n += 1
            if hasta is not None:
                conds.append(f"f.fecha <= ${n}")
                args.append(hasta)
                n += 1
            where_sql = " AND ".join(conds)
            sql = f"""
                SELECT
                    f.id, f.proveedor_id, p.nombre AS proveedor_nombre,
                    f.numero_factura, f.fecha, f.fecha_vencimiento,
                    f.total, f.pagada, f.pagada_at, f.procesada_ia, f.created_at
                FROM facturas_proveedor f
                JOIN proveedores p ON p.id = f.proveedor_id AND p.tenant_id = f.tenant_id
                WHERE {where_sql}
                ORDER BY f.fecha DESC, f.created_at DESC
            """
            rows = await conn.fetch(sql, *args)
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="proveedor_id inválido",
        )
    except Exception as e:
        logger.error("Error en list_facturas_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return [_factura_row_to_dict(r) for r in rows]


@router.get("/facturas-proveedor/pendientes-pago")
async def list_facturas_pendientes_pago(
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            rows = await conn.fetch(
                """
                SELECT
                    f.id, f.proveedor_id, p.nombre AS proveedor_nombre,
                    f.numero_factura, f.fecha, f.fecha_vencimiento,
                    f.total, f.pagada, f.pagada_at, f.procesada_ia, f.created_at,
                    (f.fecha_vencimiento - CURRENT_DATE) AS dias_vencimiento
                FROM facturas_proveedor f
                JOIN proveedores p ON p.id = f.proveedor_id AND p.tenant_id = f.tenant_id
                WHERE f.tenant_id = $1 AND f.pagada = FALSE
                ORDER BY f.fecha_vencimiento ASC NULLS LAST, f.fecha ASC
                """,
                tenant_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en list_facturas_pendientes_pago: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    out = []
    for r in rows:
        d = _factura_row_to_dict(r)
        dv = r.get("dias_vencimiento")
        d["dias_vencimiento"] = int(dv) if dv is not None else None
        out.append(d)
    return out


@router.get("/facturas-proveedor/{factura_id}")
async def get_factura_proveedor_detalle(
    factura_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_LECTURA)),
):
    """Factura con líneas y nombre de artículo (lectura)."""
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            factura = await conn.fetchrow(
                """
                SELECT
                    f.id, f.proveedor_id, p.nombre AS proveedor_nombre,
                    f.numero_factura, f.fecha, f.fecha_vencimiento,
                    f.total, f.pagada, f.pagada_at, f.procesada_ia, f.created_at
                FROM facturas_proveedor f
                JOIN proveedores p ON p.id = f.proveedor_id AND p.tenant_id = f.tenant_id
                WHERE f.id = $1 AND f.tenant_id = $2
                """,
                factura_id,
                tenant_id,
            )
            if not factura:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Factura no encontrada",
                )
            lineas_rows = await conn.fetch(
                """
                SELECT
                    fl.id, fl.articulo_id, a.nombre AS articulo_nombre,
                    fl.cantidad, fl.coste_unitario, fl.subtotal
                FROM facturas_proveedor_lineas fl
                LEFT JOIN articulos a ON a.id = fl.articulo_id
                WHERE fl.factura_id = $1
                ORDER BY fl.id
                """,
                factura_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en get_factura_proveedor_detalle: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    result = _factura_row_to_dict(factura)
    lineas_out = []
    for lr in lineas_rows:
        d = _factura_linea_to_dict(lr)
        d["articulo_nombre"] = lr.get("articulo_nombre") or ""
        lineas_out.append(d)
    result["lineas"] = lineas_out
    return result


@router.post("/facturas-proveedor")
async def create_factura_proveedor(
    body: CreateFacturaProveedorRequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            prov = await conn.fetchrow(
                "SELECT id FROM proveedores WHERE id = $1 AND tenant_id = $2",
                UUID(body.proveedor_id),
                tenant_id,
            )
            if not prov:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Proveedor no válido para este tenant",
                )

            lineas_calc: list[tuple[UUID, Decimal, Decimal, Decimal]] = []
            for ln in body.lineas:
                aid = UUID(ln.articulo_id)
                ok = await conn.fetchval(
                    "SELECT 1 FROM articulos WHERE id = $1 AND tenant_id = $2",
                    aid,
                    tenant_id,
                )
                if not ok:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Artículo no válido: {ln.articulo_id}",
                    )
                cu = Decimal(str(ln.coste_unitario)).quantize(
                    Decimal("0.0001"), ROUND_HALF_UP
                )
                cant = Decimal(str(ln.cantidad)).quantize(
                    Decimal("0.0001"), ROUND_HALF_UP
                )
                sub = (cant * cu).quantize(Decimal("0.01"), ROUND_HALF_UP)
                lineas_calc.append((aid, cant, cu, sub))

            total_factura: Decimal
            if body.total is not None:
                total_factura = Decimal(str(body.total)).quantize(
                    Decimal("0.01"), ROUND_HALF_UP
                )
            else:
                total_factura = sum(
                    (x[3] for x in lineas_calc), start=Decimal("0")
                ).quantize(Decimal("0.01"), ROUND_HALF_UP)

            factura = await conn.fetchrow(
                """
                INSERT INTO facturas_proveedor (
                    tenant_id, proveedor_id, numero_factura, fecha,
                    fecha_vencimiento, total, pagada, procesada_ia
                )
                VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE)
                RETURNING
                    id, proveedor_id, numero_factura, fecha, fecha_vencimiento,
                    total, pagada, pagada_at, procesada_ia, created_at
                """,
                tenant_id,
                UUID(body.proveedor_id),
                body.numero_factura,
                body.fecha,
                body.fecha_vencimiento,
                total_factura,
            )
            fid = factura["id"]
            for aid, cant, cu, sub in lineas_calc:
                await conn.execute(
                    """
                    INSERT INTO facturas_proveedor_lineas (
                        factura_id, articulo_id, cantidad, coste_unitario, subtotal
                    )
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    fid,
                    aid,
                    cant,
                    cu,
                    sub,
                )
            lineas_rows = await conn.fetch(
                """
                SELECT id, articulo_id, cantidad, coste_unitario, subtotal
                FROM facturas_proveedor_lineas
                WHERE factura_id = $1
                ORDER BY id
                """,
                fid,
            )
            pn = await conn.fetchval(
                "SELECT nombre FROM proveedores WHERE id = $1",
                UUID(body.proveedor_id),
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en create_factura_proveedor: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    result = _factura_row_to_dict(factura, proveedor_nombre=pn)
    result["lineas"] = [_factura_linea_to_dict(lr) for lr in lineas_rows]
    return result


@router.patch("/facturas-proveedor/{factura_id}/pagar")
async def marcar_factura_pagada(
    factura_id: UUID,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    try:
        async with get_db() as conn:
            tenant_id = await _tenant_id_usuario(conn, current_user["sub"])
            row = await conn.fetchrow(
                """
                SELECT
                    f.id, f.proveedor_id, f.numero_factura, f.fecha, f.fecha_vencimiento,
                    f.total, f.pagada, f.pagada_at, f.procesada_ia, f.created_at
                FROM facturas_proveedor f
                WHERE f.id = $1 AND f.tenant_id = $2
                """,
                factura_id,
                tenant_id,
            )
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Factura no encontrada",
                )
            if row["pagada"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La factura ya está pagada",
                )
            await conn.execute(
                """
                UPDATE facturas_proveedor
                SET pagada = TRUE, pagada_at = NOW()
                WHERE id = $1 AND tenant_id = $2
                """,
                factura_id,
                tenant_id,
            )
            updated = await conn.fetchrow(
                """
                SELECT
                    f.id, f.proveedor_id, p.nombre AS proveedor_nombre,
                    f.numero_factura, f.fecha, f.fecha_vencimiento,
                    f.total, f.pagada, f.pagada_at, f.procesada_ia, f.created_at
                FROM facturas_proveedor f
                JOIN proveedores p ON p.id = f.proveedor_id AND p.tenant_id = f.tenant_id
                WHERE f.id = $1 AND f.tenant_id = $2
                """,
                factura_id,
                tenant_id,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en marcar_factura_pagada: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )

    return _factura_row_to_dict(updated)


@router.post("/facturas-proveedor/escanear-ia")
async def escanear_factura_ia(
    body: EscanearFacturaIARequest,
    current_user: dict = Depends(require_roles(ROLES_ADMIN_ALMACEN)),
):
    _ = current_user
    try:
        raw_b64, mime = _strip_data_url(body.imagen_base64)
        try:
            base64.b64decode(raw_b64, validate=True)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="imagen_base64 no es válida",
            )
        try:
            return await asyncio.to_thread(_groq_escanear_sync, raw_b64, mime)
        except Exception as e:
            logger.error("Error Groq escanear_factura_ia: %s", e)
            return {"error": str(e), "lineas": []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en escanear_factura_ia: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno",
        )
