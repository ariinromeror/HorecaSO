"""
Router facturas de proveedor y escaneo IA.
"""

from __future__ import annotations

import asyncio
import base64
import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import require_roles
from database import get_db

from routers.proveedores_shared import (
    ROLES_ADMIN_ALMACEN,
    ROLES_LECTURA,
    CreateFacturaProveedorRequest,
    EscanearFacturaIARequest,
    _factura_linea_to_dict,
    _factura_row_to_dict,
    _groq_escanear_sync,
    _strip_data_url,
    _tenant_id_usuario,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Proveedores"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)

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
