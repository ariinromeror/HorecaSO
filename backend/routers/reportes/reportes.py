"""
PDFs de informes (nómina, inventario, cierre de caja).
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from auth.dependencies import require_roles
from database import get_db

from .reportes_dif_appcc import register_reportes_dif_appcc
from .reportes_dif_carta import register_reportes_dif_carta
from .reportes_dif_personal import register_reportes_dif_personal
from .reportes_dif_proveedores import register_reportes_dif_proveedores
from .reportes_dif_ventas import register_reportes_dif_ventas
from services.pdf_inventario import pdf_inventario
from services.pdf_nomina import pdf_nomina
from services.pdf_reportes import pdf_cierre_caja

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reportes", tags=["Reportes"])


def _uid(cu: dict) -> UUID:
    s = cu.get("user_id") or cu.get("sub")
    if not s:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    return UUID(str(s))


def _tenant_id(cu: dict) -> UUID:
    tid = cu.get("negocio_id")
    if not tid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario sin tenant asignado",
        )
    return UUID(str(tid))


async def _outlet_id(conn, user_id: UUID) -> UUID:
    row = await conn.fetchrow(
        "SELECT outlet_id FROM usuarios WHERE id = $1",
        user_id,
    )
    if not row or not row["outlet_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario sin outlet asignado",
        )
    return row["outlet_id"]


def _pdf_resp(pdf_bytes: bytes, nombre: str) -> Response:
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={nombre}.pdf"},
    )


@router.get("/nomina/{nomina_id}")
async def reporte_nomina(
    nomina_id: UUID,
    current_user: dict = Depends(require_roles(["admin", "director"])),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                """
                SELECT nominas.*, empleados.dni, empleados.nss, empleados.cargo,
                    empleados.contrato, empleados.fecha_inicio, empleados.irpf_porcentaje,
                    tenants.nombre AS tenant_nombre, tenants.nif AS tenant_nif
                FROM nominas
                JOIN empleados ON nominas.empleado_id = empleados.id
                JOIN usuarios ON empleados.usuario_id = usuarios.id
                JOIN tenants ON usuarios.tenant_id = tenants.id
                WHERE nominas.id = $1 AND tenants.id = $2
                """,
                nomina_id,
                tenant_id,
            )
        if not row:
            raise HTTPException(status_code=404, detail="Nómina no encontrada")
        pdf_bytes = pdf_nomina(dict(row))
        return _pdf_resp(pdf_bytes, f"nomina_{nomina_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("reporte_nomina: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.get("/inventario")
async def reporte_inventario(
    fecha: str = Query(default_factory=lambda: str(date.today())),
    current_user: dict = Depends(
        require_roles(["admin", "director", "almacen"])
    ),
):
    tenant_id = _tenant_id(current_user)
    try:
        async with get_db() as conn:
            trow = await conn.fetchrow(
                "SELECT nombre, nif FROM tenants WHERE id = $1",
                tenant_id,
            )
            rows = await conn.fetch(
                """
                SELECT * FROM articulos
                WHERE tenant_id = $1
                ORDER BY categoria_almacen, nombre
                """,
                tenant_id,
            )
        tenant = {
            "nombre": (trow["nombre"] if trow else "") or "—",
            "nif": (trow["nif"] if trow else "") or "",
        }
        arts = [dict(r) for r in rows]
        pdf_bytes = pdf_inventario(arts, tenant, fecha)
        return _pdf_resp(pdf_bytes, "inventario")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("reporte_inventario: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.get("/cierre-caja/{fecha}")
async def reporte_cierre_caja(
    fecha: str,
    current_user: dict = Depends(require_roles(["admin", "director"])),
):
    uid = _uid(current_user)
    tenant_id = _tenant_id(current_user)
    try:
        f = date.fromisoformat(fecha)
    except ValueError:
        raise HTTPException(status_code=400, detail="Fecha inválida (YYYY-MM-DD)")
    try:
        async with get_db() as conn:
            oid = await _outlet_id(conn, uid)
            row = await conn.fetchrow(
                """
                SELECT * FROM cierres_caja
                WHERE outlet_id = $1 AND fecha = $2
                """,
                oid,
                f,
            )
            trow = await conn.fetchrow(
                "SELECT nombre, nif FROM tenants WHERE id = $1",
                tenant_id,
            )
        if not row:
            raise HTTPException(status_code=404, detail="Cierre no encontrado")
        tenant = {
            "nombre": (trow["nombre"] if trow else "") or "—",
            "nif": (trow["nif"] if trow else "") or "",
        }
        pdf_bytes = pdf_cierre_caja(dict(row), tenant)
        return _pdf_resp(pdf_bytes, f"cierre_caja_{fecha}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("reporte_cierre_caja: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


@router.get("/fiscal-trimestre")
async def fiscal_trimestre(
    anio: int = Query(..., ge=2020, le=2100),
    trimestre: int = Query(..., ge=1, le=4),
    current_user: dict = Depends(require_roles(["admin", "director"])),
):
    """
    Resumen gestoría (Modelo 303 light): bases/cuotas por IVA de ventas
    (verifactu_registros + desglose por iva en líneas) y compras si hay facturas.
    """
    from decimal import Decimal, ROUND_HALF_UP

    tenant_id = _tenant_id(current_user)
    mes_ini = (trimestre - 1) * 3 + 1
    mes_fin = mes_ini + 2
    fecha_desde = date(anio, mes_ini, 1)
    if mes_fin == 12:
        fecha_hasta = date(anio, 12, 31)
    else:
        fecha_hasta = date(anio, mes_fin + 1, 1) - timedelta(days=1)

    try:
        async with get_db() as conn:
            ventas = await conn.fetch(
                """
                SELECT
                    COALESCE(p.iva_porcentaje, 10) AS iva_porcentaje,
                    COALESCE(SUM(tl.subtotal), 0) AS importe_con_iva
                FROM verifactu_registros vr
                JOIN ticket_lineas tl ON tl.ticket_id = vr.ticket_id
                LEFT JOIN productos p ON p.id = tl.producto_id
                WHERE vr.tenant_id = $1
                  AND vr.fecha_expedicion >= $2
                  AND vr.fecha_expedicion <= $3
                GROUP BY COALESCE(p.iva_porcentaje, 10)
                ORDER BY 1
                """,
                tenant_id,
                fecha_desde,
                fecha_hasta,
            )
            compras = await conn.fetch(
                """
                SELECT
                    COALESCE(SUM(f.total), 0) AS total_facturas,
                    COUNT(*)::int AS num_facturas
                FROM facturas_proveedor f
                WHERE f.tenant_id = $1
                  AND f.fecha >= $2
                  AND f.fecha <= $3
                """,
                tenant_id,
                fecha_desde,
                fecha_hasta,
            )

        desglose = []
        total_base = Decimal("0")
        total_cuota = Decimal("0")
        for v in ventas:
            iva = Decimal(str(v["iva_porcentaje"]))
            importe = Decimal(str(v["importe_con_iva"]))
            factor = Decimal("1") + iva / Decimal("100")
            base = (importe / factor).quantize(Decimal("0.01"), ROUND_HALF_UP)
            cuota = (importe - base).quantize(Decimal("0.01"), ROUND_HALF_UP)
            total_base += base
            total_cuota += cuota
            desglose.append(
                {
                    "iva_porcentaje": float(iva),
                    "base_imponible": float(base),
                    "cuota_iva": float(cuota),
                    "importe_total": float(importe),
                }
            )

        compra_row = compras[0] if compras else None
        return {
            "anio": anio,
            "trimestre": trimestre,
            "periodo": {
                "desde": fecha_desde.isoformat(),
                "hasta": fecha_hasta.isoformat(),
            },
            "ventas": {
                "desglose_iva": desglose,
                "base_imponible_total": float(total_base),
                "cuota_iva_total": float(total_cuota),
            },
            "compras": {
                "total_facturas": float(compra_row["total_facturas"]) if compra_row else 0,
                "num_facturas": int(compra_row["num_facturas"]) if compra_row else 0,
                "nota": "IVA soportado aproximado vía total facturas; desglose fino pendiente",
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("fiscal_trimestre: %s", e)
        raise HTTPException(status_code=500, detail="Error interno")


register_reportes_dif_ventas(router)
register_reportes_dif_personal(router)
register_reportes_dif_carta(router)
register_reportes_dif_proveedores(router)
register_reportes_dif_appcc(router)
