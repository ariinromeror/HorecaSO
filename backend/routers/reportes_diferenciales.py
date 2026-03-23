"""
Rutas PDF adicionales de reportes (ventas, cuadrante, rentabilidad, proveedores, APPCC).
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from auth.dependencies import require_roles
from database import get_db
from services.pdf_diferenciales import pdf_cuadrante, pdf_rentabilidad_platos
from services.pdf_diferenciales_2 import pdf_appcc, pdf_comparativa_proveedores
from services.pdf_reportes import pdf_ventas_periodo

logger = logging.getLogger(__name__)

_DIAS_KEYS = [
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
]


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


def _fmt_hora(t) -> str:
    if t is None:
        return ""
    if hasattr(t, "strftime"):
        return t.strftime("%H:%M")
    s = str(t)
    return s[:5] if len(s) >= 5 else s


def register_reportes_diferenciales(router: APIRouter) -> None:
    @router.get("/ventas")
    async def reporte_ventas(
        desde: str = Query(...),
        hasta: str = Query(...),
        current_user: dict = Depends(require_roles(["admin", "director"])),
    ):
        uid = _uid(current_user)
        tenant_id = _tenant_id(current_user)
        try:
            d0 = date.fromisoformat(desde)
            d1 = date.fromisoformat(hasta)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Fechas inválidas (YYYY-MM-DD)"
            )
        if d0 > d1:
            d0, d1 = d1, d0
        try:
            async with get_db() as conn:
                oid = await _outlet_id(conn, uid)
                rows = await conn.fetch(
                    """
                    SELECT (cobrado_at::date) AS fecha,
                        COUNT(*)::bigint AS tickets,
                        SUM(total) AS ventas,
                        SUM(COALESCE(total_iva, 0)) AS iva
                    FROM tickets
                    WHERE outlet_id = $1
                      AND cobrado_at IS NOT NULL
                      AND cobrado_at::date BETWEEN $2 AND $3
                      AND estado = 'cobrado'
                    GROUP BY (cobrado_at::date)
                    ORDER BY fecha
                    """,
                    oid,
                    d0,
                    d1,
                )
                trow = await conn.fetchrow(
                    "SELECT nombre, nif FROM tenants WHERE id = $1",
                    tenant_id,
                )
            total_v = Decimal("0")
            total_tickets = 0
            mejor_dia = None
            mejor_val = Decimal("-1")
            filas = []
            for r in rows:
                v = Decimal(str(r["ventas"] or 0))
                nt = int(r["tickets"] or 0)
                total_v += v
                total_tickets += nt
                fd = r["fecha"]
                if v > mejor_val:
                    mejor_val = v
                    mejor_dia = (
                        fd.isoformat()
                        if hasattr(fd, "isoformat")
                        else str(fd)
                    )
                fs = fd.isoformat() if hasattr(fd, "isoformat") else str(fd)
                filas.append(
                    {
                        "fecha": fs,
                        "tickets": nt,
                        "ventas": r["ventas"],
                        "iva": r["iva"],
                    }
                )
            ticket_medio = (
                (total_v / Decimal(total_tickets)).quantize(
                    Decimal("0.01"), ROUND_HALF_UP
                )
                if total_tickets
                else Decimal("0")
            )
            resumen = {
                "total": total_v,
                "ticket_medio": ticket_medio,
                "mejor_dia": mejor_dia,
            }
            tenant = {
                "nombre": (trow["nombre"] if trow else "") or "—",
                "nif": (trow["nif"] if trow else "") or "",
            }
            pdf_bytes = pdf_ventas_periodo(
                filas, resumen, tenant, desde, hasta
            )
            return _pdf_resp(pdf_bytes, "ventas_periodo")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_ventas: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")

    @router.get("/cuadrante/{semana}")
    async def reporte_cuadrante(
        semana: str,
        current_user: dict = Depends(
            require_roles(["admin", "director", "jefe_sala"])
        ),
    ):
        uid = _uid(current_user)
        tenant_id = _tenant_id(current_user)
        try:
            d0 = date.fromisoformat(semana)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Fecha inválida (YYYY-MM-DD)"
            )
        lunes = d0 - timedelta(days=d0.weekday())
        domingo = lunes + timedelta(days=6)
        label = f"{lunes.isoformat()} — {domingo.isoformat()}"
        try:
            async with get_db() as conn:
                oid = await _outlet_id(conn, uid)
                rows = await conn.fetch(
                    """
                    SELECT t.fecha, t.hora_entrada, t.hora_salida,
                        COALESCE(u.nombre, e.nombre_completo) AS nombre_empleado
                    FROM turnos t
                    JOIN empleados e ON t.empleado_id = e.id AND e.tenant_id = $2
                    LEFT JOIN usuarios u ON u.id = e.usuario_id
                    WHERE t.outlet_id = $1
                      AND t.fecha >= $3 AND t.fecha <= $4
                    ORDER BY nombre_empleado, t.fecha
                    """,
                    oid,
                    tenant_id,
                    lunes,
                    domingo,
                )
                trow = await conn.fetchrow(
                    "SELECT nombre, nif FROM tenants WHERE id = $1",
                    tenant_id,
                )
            cuad: dict[str, dict[str, str]] = {}
            for r in rows:
                name = r["nombre_empleado"] or "—"
                fd = r["fecha"]
                day_key = _DIAS_KEYS[fd.weekday()]
                he = _fmt_hora(r["hora_entrada"])
                hs = _fmt_hora(r["hora_salida"])
                slot = f"{he}-{hs}" if he and hs else (he or hs or "—")
                cuad.setdefault(name, {})
                prev = cuad[name].get(day_key)
                if prev and prev != "—":
                    cuad[name][day_key] = f"{prev} / {slot}"
                else:
                    cuad[name][day_key] = slot
            tenant = {
                "nombre": (trow["nombre"] if trow else "") or "—",
                "nif": (trow["nif"] if trow else "") or "",
            }
            pdf_bytes = pdf_cuadrante(cuad, tenant, label)
            return _pdf_resp(pdf_bytes, f"cuadrante_{lunes.isoformat()}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_cuadrante: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")

    @router.get("/rentabilidad-platos")
    async def reporte_rentabilidad_platos(
        current_user: dict = Depends(require_roles(["admin", "director"])),
    ):
        tenant_id = _tenant_id(current_user)
        try:
            async with get_db() as conn:
                rows = await conn.fetch(
                    """
                    SELECT p.nombre, c.nombre AS categoria, p.precio,
                        r.coste_calculado, r.margen_porcentaje,
                        COALESCE(SUM(tl.cantidad), 0)::bigint AS ventas_mes
                    FROM productos p
                    JOIN recetas r ON p.id = r.producto_id
                    JOIN categorias_menu c ON p.categoria_id = c.id
                    LEFT JOIN ticket_lineas tl ON p.id = tl.producto_id
                    LEFT JOIN tickets t ON tl.ticket_id = t.id
                        AND t.cobrado_at >= NOW() - INTERVAL '30 days'
                        AND t.estado = 'cobrado'
                    WHERE p.tenant_id = $1
                    GROUP BY p.id, c.nombre, p.nombre, p.precio,
                        r.coste_calculado, r.margen_porcentaje
                    ORDER BY p.nombre
                    """,
                    tenant_id,
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
            pdf_bytes = pdf_rentabilidad_platos(filas, tenant)
            return _pdf_resp(pdf_bytes, "rentabilidad_platos")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_rentabilidad_platos: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")

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

    @router.get("/appcc")
    async def reporte_appcc(
        desde: str = Query(...),
        hasta: str = Query(...),
        current_user: dict = Depends(
            require_roles(["admin", "director", "almacen"])
        ),
    ):
        uid = _uid(current_user)
        tenant_id = _tenant_id(current_user)
        try:
            d0 = date.fromisoformat(desde)
            d1 = date.fromisoformat(hasta)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Fechas inválidas (YYYY-MM-DD)"
            )
        if d0 > d1:
            d0, d1 = d1, d0
        try:
            async with get_db() as conn:
                oid = await _outlet_id(conn, uid)
                rows = await conn.fetch(
                    """
                    SELECT ra.*, u.nombre AS responsable
                    FROM registros_appcc ra
                    JOIN usuarios u ON ra.usuario_id = u.id
                    WHERE ra.outlet_id = $1
                      AND ra.created_at::date BETWEEN $2 AND $3
                    ORDER BY ra.created_at
                    """,
                    oid,
                    d0,
                    d1,
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
            pdf_bytes = pdf_appcc(filas, tenant, desde, hasta)
            return _pdf_resp(pdf_bytes, "appcc")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("reporte_appcc: %s", e)
            raise HTTPException(status_code=500, detail="Error interno")
