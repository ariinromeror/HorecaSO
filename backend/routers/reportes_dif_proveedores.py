"""Reporte PDF comparativa proveedores."""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import require_roles
from database import get_db
from routers.reportes_dif_shared import (
    _pdf_resp,
    _tenant_id,
)
from services.pdf_diferenciales_2 import pdf_comparativa_proveedores

logger = logging.getLogger(__name__)


def register_reportes_dif_proveedores(router: APIRouter) -> None:
    @router.get("/comparativa-proveedores/{articulo_id}")
    async def reporte_comparativa_proveedores(
        articulo_id: UUID,
        current_user: dict = Depends(
            require_roles(["admin", "director", "almacen"])
        ),
    ):
        tenant_id = _tenant_id(current_user)
        try:
            async with get_db() as conn:
                art = await conn.fetchrow(
                    """
                    SELECT nombre FROM articulos
                    WHERE id = $1 AND tenant_id = $2
                    """,
                    articulo_id,
                    tenant_id,
                )
                if not art:
                    raise HTTPException(
                        status_code=404, detail="Artículo no encontrado"
                    )
                rows = await conn.fetch(
                    """
                    SELECT prov.nombre AS proveedor_nombre,
                        MAX(fpl.coste_unitario) AS precio_max,
                        MIN(fpl.coste_unitario) AS precio_min,
                        (SELECT fpl2.coste_unitario
                         FROM facturas_proveedor_lineas fpl2
                         JOIN facturas_proveedor fp2 ON fpl2.factura_id = fp2.id
                         WHERE fpl2.articulo_id = $2
                           AND fp2.proveedor_id = prov.id
                         ORDER BY fp2.fecha DESC NULLS LAST
                         LIMIT 1) AS precio_actual,
                        MAX(fp.fecha) AS ultima_compra,
                        COUNT(*)::bigint AS num_compras
                    FROM facturas_proveedor_lineas fpl
                    JOIN facturas_proveedor fp ON fpl.factura_id = fp.id
                    JOIN proveedores prov ON fp.proveedor_id = prov.id
                    WHERE fpl.articulo_id = $2 AND prov.tenant_id = $1
                    GROUP BY prov.id, prov.nombre
                    ORDER BY prov.nombre
                    """,
                    tenant_id,
                    articulo_id,
                )
                trow = await conn.fetchrow(
                    "SELECT nombre, nif FROM tenants WHERE id = $1",
                    tenant_id,
                )
            filas = [dict(x) for x in rows]
            tenant = {
                "nombre": (trow["nombre"] if trow else "") or "—",
                "nif": (trow["nif"] if trow else "") or "",
            }
            precios_pdf = [
                {
                    "proveedor": x.get("proveedor_nombre"),
                    "precio_actual": x.get("precio_actual"),
                    "precio_min": x.get("precio_min"),
                    "precio_max": x.get("precio_max"),
                    "ultima_compra": x.get("ultima_compra"),
                    "num_compras": x.get("num_compras"),
                }
                for x in filas
            ]
            articulo_pdf = {
                "nombre": art["nombre"] or "Artículo",
                "historial": [],
                "proveedor_actual": "",
            }
            pdf_bytes = pdf_comparativa_proveedores(
                articulo_pdf, precios_pdf, tenant
            )
            return _pdf_resp(
                pdf_bytes, f"comparativa_{articulo_id}"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_comparativa_proveedores: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")
