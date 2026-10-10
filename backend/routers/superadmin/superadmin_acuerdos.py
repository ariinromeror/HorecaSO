"""
Acuerdos comerciales de piloto — solo superadmin.
"""

from __future__ import annotations

import json
import logging
from datetime import date
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from auth.dependencies import require_superadmin
from database import get_db
from services.pdf_acuerdo_piloto import pdf_acuerdo_piloto

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/superadmin",
    tags=["Superadmin — Acuerdos"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

MODULOS_VALIDOS = {
    "sala",
    "kds",
    "carta",
    "recetas",
    "inventario",
    "reservas",
    "reportes",
}


class ProveedorDefaultsBody(BaseModel):
    razon_social: str = Field("", max_length=200)
    nif: Optional[str] = Field(None, max_length=20)
    email: str = Field("", max_length=200)
    direccion: Optional[str] = None
    soporte_canal: Optional[str] = Field(None, max_length=200)
    soporte_horario: Optional[str] = Field(None, max_length=200)


class AcuerdoPilotoBody(BaseModel):
    fecha_acuerdo: Optional[date] = None
    periodo_desde: Optional[date] = None
    periodo_hasta: Optional[date] = None
    precio_tipo: str = Field("gratuito", max_length=40)
    precio_importe: Optional[Decimal] = None
    precio_otro_texto: Optional[str] = Field(None, max_length=200)
    modulos: list[str] = Field(default_factory=list)
    modulos_otros: Optional[str] = Field(None, max_length=200)
    cliente_nombre_comercial: str = Field("", max_length=200)
    cliente_razon_social: Optional[str] = Field(None, max_length=200)
    cliente_nif: Optional[str] = Field(None, max_length=20)
    cliente_direccion: Optional[str] = None
    cliente_contacto: Optional[str] = Field(None, max_length=200)
    cliente_email: Optional[str] = Field(None, max_length=200)
    proveedor_razon_social: Optional[str] = Field(None, max_length=200)
    proveedor_nif: Optional[str] = Field(None, max_length=20)
    proveedor_email: Optional[str] = Field(None, max_length=200)
    proveedor_direccion: Optional[str] = None
    soporte_canal: Optional[str] = Field(None, max_length=200)
    soporte_horario: Optional[str] = Field(None, max_length=200)
    tenant_id: Optional[UUID] = None


def _empty_defaults() -> dict:
    return {
        "id": None,
        "razon_social": "",
        "nif": None,
        "email": "",
        "direccion": None,
        "soporte_canal": None,
        "soporte_horario": None,
        "updated_at": None,
    }


def _defaults_public(row) -> dict:
    if not row:
        return _empty_defaults()
    return {
        "id": str(row["id"]),
        "razon_social": row["razon_social"] or "",
        "nif": row["nif"],
        "email": row["email"] or "",
        "direccion": row["direccion"],
        "soporte_canal": row["soporte_canal"],
        "soporte_horario": row["soporte_horario"],
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


def _parse_modulos(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw]
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
        except json.JSONDecodeError:
            return []
    return []


def _acuerdo_public(row) -> dict:
    importe = row["precio_importe"]
    return {
        "id": str(row["id"]),
        "fecha_acuerdo": row["fecha_acuerdo"].isoformat()
        if row["fecha_acuerdo"]
        else None,
        "periodo_desde": row["periodo_desde"].isoformat()
        if row["periodo_desde"]
        else None,
        "periodo_hasta": row["periodo_hasta"].isoformat()
        if row["periodo_hasta"]
        else None,
        "precio_tipo": row["precio_tipo"] or "gratuito",
        "precio_importe": float(importe) if importe is not None else None,
        "precio_otro_texto": row["precio_otro_texto"],
        "modulos": _parse_modulos(row["modulos"]),
        "modulos_otros": row["modulos_otros"],
        "cliente_nombre_comercial": row["cliente_nombre_comercial"] or "",
        "cliente_razon_social": row["cliente_razon_social"],
        "cliente_nif": row["cliente_nif"],
        "cliente_direccion": row["cliente_direccion"],
        "cliente_contacto": row["cliente_contacto"],
        "cliente_email": row["cliente_email"],
        "proveedor_razon_social": row["proveedor_razon_social"] or "",
        "proveedor_nif": row["proveedor_nif"],
        "proveedor_email": row["proveedor_email"] or "",
        "proveedor_direccion": row["proveedor_direccion"],
        "soporte_canal": row["soporte_canal"],
        "soporte_horario": row["soporte_horario"],
        "tenant_id": str(row["tenant_id"]) if row["tenant_id"] else None,
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


def _normalize_precio(body: AcuerdoPilotoBody) -> tuple[str, Optional[Decimal], Optional[str]]:
    tipo = (body.precio_tipo or "gratuito").strip().lower()
    if tipo not in ("gratuito", "simbolico", "otro", "aportacion_voluntaria"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="precio_tipo inválido",
        )
    importe = body.precio_importe
    if tipo == "gratuito":
        importe = None
    return tipo, importe, body.precio_otro_texto


def _normalize_modulos(modulos: list[str]) -> list[str]:
    out = []
    for m in modulos or []:
        key = str(m).strip().lower()
        if key in MODULOS_VALIDOS and key not in out:
            out.append(key)
    return out


async def _fetch_defaults(conn):
    return await conn.fetchrow(
        """
        SELECT id, razon_social, nif, email, direccion,
               soporte_canal, soporte_horario, updated_at
        FROM acuerdo_proveedor_defaults
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1
        """
    )


@router.get("/acuerdo-proveedor-defaults")
async def get_proveedor_defaults(
    current_user: dict = Depends(require_superadmin),
):
    _ = current_user
    try:
        async with get_db() as conn:
            row = await _fetch_defaults(conn)
        return _defaults_public(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_proveedor_defaults: %s", e)
        raise HTTPException(status_code=500, detail="Error interno") from e


@router.put("/acuerdo-proveedor-defaults")
async def put_proveedor_defaults(
    body: ProveedorDefaultsBody,
    current_user: dict = Depends(require_superadmin),
):
    _ = current_user
    nif = (body.nif or "").strip() or None
    try:
        async with get_db() as conn:
            existing = await _fetch_defaults(conn)
            if existing:
                row = await conn.fetchrow(
                    """
                    UPDATE acuerdo_proveedor_defaults SET
                      razon_social = $1,
                      nif = $2,
                      email = $3,
                      direccion = $4,
                      soporte_canal = $5,
                      soporte_horario = $6,
                      updated_at = NOW()
                    WHERE id = $7
                    RETURNING id, razon_social, nif, email, direccion,
                              soporte_canal, soporte_horario, updated_at
                    """,
                    body.razon_social.strip(),
                    nif,
                    body.email.strip(),
                    (body.direccion or "").strip() or None,
                    (body.soporte_canal or "").strip() or None,
                    (body.soporte_horario or "").strip() or None,
                    existing["id"],
                )
            else:
                row = await conn.fetchrow(
                    """
                    INSERT INTO acuerdo_proveedor_defaults (
                      razon_social, nif, email, direccion,
                      soporte_canal, soporte_horario, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    RETURNING id, razon_social, nif, email, direccion,
                              soporte_canal, soporte_horario, updated_at
                    """,
                    body.razon_social.strip(),
                    nif,
                    body.email.strip(),
                    (body.direccion or "").strip() or None,
                    (body.soporte_canal or "").strip() or None,
                    (body.soporte_horario or "").strip() or None,
                )
        return _defaults_public(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("put_proveedor_defaults: %s", e)
        raise HTTPException(status_code=500, detail="Error interno") from e


@router.get("/acuerdos-piloto")
async def list_acuerdos_piloto(
    current_user: dict = Depends(require_superadmin),
):
    _ = current_user
    try:
        async with get_db() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM acuerdos_piloto
                ORDER BY updated_at DESC NULLS LAST, created_at DESC
                """
            )
        return [_acuerdo_public(r) for r in rows]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_acuerdos_piloto: %s", e)
        raise HTTPException(status_code=500, detail="Error interno") from e


@router.get("/acuerdos-piloto/{acuerdo_id}")
async def get_acuerdo_piloto(
    acuerdo_id: UUID,
    current_user: dict = Depends(require_superadmin),
):
    _ = current_user
    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM acuerdos_piloto WHERE id = $1",
                acuerdo_id,
            )
        if not row:
            raise HTTPException(status_code=404, detail="Acuerdo no encontrado")
        return _acuerdo_public(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_acuerdo_piloto: %s", e)
        raise HTTPException(status_code=500, detail="Error interno") from e


async def _resolve_proveedor_snapshot(conn, body: AcuerdoPilotoBody) -> dict:
    defaults = await _fetch_defaults(conn)
    d = _defaults_public(defaults)

    def pick(body_val, default_val):
        if body_val is not None and str(body_val).strip() != "":
            return str(body_val).strip()
        return default_val

    return {
        "proveedor_razon_social": pick(
            body.proveedor_razon_social, d.get("razon_social") or ""
        ),
        "proveedor_nif": pick(body.proveedor_nif, d.get("nif")),
        "proveedor_email": pick(body.proveedor_email, d.get("email") or ""),
        "proveedor_direccion": pick(body.proveedor_direccion, d.get("direccion")),
        "soporte_canal": pick(body.soporte_canal, d.get("soporte_canal")),
        "soporte_horario": pick(body.soporte_horario, d.get("soporte_horario")),
    }


@router.post("/acuerdos-piloto", status_code=status.HTTP_201_CREATED)
async def create_acuerdo_piloto(
    body: AcuerdoPilotoBody,
    current_user: dict = Depends(require_superadmin),
):
    _ = current_user
    precio_tipo, precio_importe, precio_otro = _normalize_precio(body)
    modulos = _normalize_modulos(body.modulos)
    try:
        async with get_db() as conn:
            snap = await _resolve_proveedor_snapshot(conn, body)
            if body.tenant_id:
                exists = await conn.fetchval(
                    "SELECT 1 FROM tenants WHERE id = $1",
                    body.tenant_id,
                )
                if not exists:
                    raise HTTPException(
                        status_code=400, detail="tenant_id no encontrado"
                    )
            row = await conn.fetchrow(
                """
                INSERT INTO acuerdos_piloto (
                  fecha_acuerdo, periodo_desde, periodo_hasta,
                  precio_tipo, precio_importe, precio_otro_texto,
                  modulos, modulos_otros,
                  cliente_nombre_comercial, cliente_razon_social, cliente_nif,
                  cliente_direccion, cliente_contacto, cliente_email,
                  proveedor_razon_social, proveedor_nif, proveedor_email,
                  proveedor_direccion, soporte_canal, soporte_horario,
                  tenant_id, created_at, updated_at
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7::jsonb, $8,
                  $9, $10, $11, $12, $13, $14,
                  $15, $16, $17, $18, $19, $20,
                  $21, NOW(), NOW()
                )
                RETURNING *
                """,
                body.fecha_acuerdo,
                body.periodo_desde,
                body.periodo_hasta,
                precio_tipo,
                precio_importe,
                precio_otro,
                json.dumps(modulos),
                (body.modulos_otros or "").strip() or None,
                body.cliente_nombre_comercial.strip(),
                (body.cliente_razon_social or "").strip() or None,
                (body.cliente_nif or "").strip() or None,
                (body.cliente_direccion or "").strip() or None,
                (body.cliente_contacto or "").strip() or None,
                (body.cliente_email or "").strip() or None,
                snap["proveedor_razon_social"],
                snap["proveedor_nif"],
                snap["proveedor_email"],
                snap["proveedor_direccion"],
                snap["soporte_canal"],
                snap["soporte_horario"],
                body.tenant_id,
            )
        return _acuerdo_public(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_acuerdo_piloto: %s", e)
        raise HTTPException(status_code=500, detail="Error interno") from e


@router.patch("/acuerdos-piloto/{acuerdo_id}")
async def patch_acuerdo_piloto(
    acuerdo_id: UUID,
    body: AcuerdoPilotoBody,
    current_user: dict = Depends(require_superadmin),
):
    _ = current_user
    precio_tipo, precio_importe, precio_otro = _normalize_precio(body)
    modulos = _normalize_modulos(body.modulos)
    try:
        async with get_db() as conn:
            existing = await conn.fetchrow(
                "SELECT id FROM acuerdos_piloto WHERE id = $1",
                acuerdo_id,
            )
            if not existing:
                raise HTTPException(status_code=404, detail="Acuerdo no encontrado")
            snap = await _resolve_proveedor_snapshot(conn, body)
            if body.tenant_id:
                exists = await conn.fetchval(
                    "SELECT 1 FROM tenants WHERE id = $1",
                    body.tenant_id,
                )
                if not exists:
                    raise HTTPException(
                        status_code=400, detail="tenant_id no encontrado"
                    )
            row = await conn.fetchrow(
                """
                UPDATE acuerdos_piloto SET
                  fecha_acuerdo = $1,
                  periodo_desde = $2,
                  periodo_hasta = $3,
                  precio_tipo = $4,
                  precio_importe = $5,
                  precio_otro_texto = $6,
                  modulos = $7::jsonb,
                  modulos_otros = $8,
                  cliente_nombre_comercial = $9,
                  cliente_razon_social = $10,
                  cliente_nif = $11,
                  cliente_direccion = $12,
                  cliente_contacto = $13,
                  cliente_email = $14,
                  proveedor_razon_social = $15,
                  proveedor_nif = $16,
                  proveedor_email = $17,
                  proveedor_direccion = $18,
                  soporte_canal = $19,
                  soporte_horario = $20,
                  tenant_id = $21,
                  updated_at = NOW()
                WHERE id = $22
                RETURNING *
                """,
                body.fecha_acuerdo,
                body.periodo_desde,
                body.periodo_hasta,
                precio_tipo,
                precio_importe,
                precio_otro,
                json.dumps(modulos),
                (body.modulos_otros or "").strip() or None,
                body.cliente_nombre_comercial.strip(),
                (body.cliente_razon_social or "").strip() or None,
                (body.cliente_nif or "").strip() or None,
                (body.cliente_direccion or "").strip() or None,
                (body.cliente_contacto or "").strip() or None,
                (body.cliente_email or "").strip() or None,
                snap["proveedor_razon_social"],
                snap["proveedor_nif"],
                snap["proveedor_email"],
                snap["proveedor_direccion"],
                snap["soporte_canal"],
                snap["soporte_horario"],
                body.tenant_id,
                acuerdo_id,
            )
        return _acuerdo_public(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("patch_acuerdo_piloto: %s", e)
        raise HTTPException(status_code=500, detail="Error interno") from e


@router.post("/acuerdos-piloto/{acuerdo_id}/pdf")
async def pdf_acuerdo(
    acuerdo_id: UUID,
    current_user: dict = Depends(require_superadmin),
):
    _ = current_user
    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM acuerdos_piloto WHERE id = $1",
                acuerdo_id,
            )
        if not row:
            raise HTTPException(status_code=404, detail="Acuerdo no encontrado")
        data = _acuerdo_public(row)
        if not (data.get("proveedor_razon_social") or "").strip():
            raise HTTPException(
                status_code=400,
                detail="Falta nombre/marca del proveedor (guarda la plantilla o el acuerdo)",
            )
        if not (data.get("proveedor_email") or "").strip():
            raise HTTPException(
                status_code=400,
                detail="Falta email del proveedor",
            )
        if not (data.get("cliente_nombre_comercial") or "").strip():
            raise HTTPException(
                status_code=400,
                detail="Falta nombre comercial del cliente",
            )
        pdf_bytes = pdf_acuerdo_piloto(data)
        nombre = (data.get("cliente_nombre_comercial") or "piloto").replace(" ", "_")[:40]
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="acuerdo_piloto_{nombre}.pdf"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("pdf_acuerdo: %s", e)
        raise HTTPException(status_code=500, detail="Error interno") from e
