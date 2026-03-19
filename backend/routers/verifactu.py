"""
Router Verifactu para HorecaSO.
"""

import csv
import io
import logging
from datetime import timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from auth.dependencies import get_current_user
from database import get_db
from services.verifactu_engine import generar_huella

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/verifactu",
    tags=["Verifactu"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


async def _get_user_tenant(conn, user_id: str) -> str | None:
    """Obtiene tenant_id del usuario."""
    row = await conn.fetchrow(
        "SELECT tenant_id FROM usuarios WHERE id = $1",
        UUID(user_id),
    )
    if not row or not row["tenant_id"]:
        return None
    return str(row["tenant_id"])


def _registro_to_dict(row) -> dict:
    """Convierte fila verifactu_registros a dict."""
    return {
        "id": str(row["id"]),
        "tenant_id": str(row["tenant_id"]) if row["tenant_id"] else None,
        "ticket_id": str(row["ticket_id"]) if row["ticket_id"] else None,
        "numero_serie": row["numero_serie"],
        "fecha_expedicion": row["fecha_expedicion"].isoformat() if hasattr(row["fecha_expedicion"], "isoformat") else str(row["fecha_expedicion"]),
        "tipo_factura": row["tipo_factura"],
        "base_imponible": float(row["base_imponible"]) if row["base_imponible"] is not None else 0,
        "cuota_iva": float(row["cuota_iva"]) if row["cuota_iva"] is not None else 0,
        "importe_total": float(row["importe_total"]) if row["importe_total"] is not None else 0,
        "huella_anterior": row["huella_anterior"],
        "huella_actual": row["huella_actual"],
        "xml_generado": row["xml_generado"],
        "enviado_aeat": row["enviado_aeat"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }


@router.get("/registros")
async def list_registros(current_user: dict = Depends(get_current_user)):
    """Lista todos los registros Verifactu del tenant del usuario."""
    async with get_db() as conn:
        tenant_id = await _get_user_tenant(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant asignado",
            )

        rows = await conn.fetch(
            """
            SELECT * FROM verifactu_registros
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            """,
            UUID(tenant_id),
        )

    return [_registro_to_dict(r) for r in rows]


@router.get("/registros/{registro_id}")
async def get_registro(
    registro_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Devuelve detalle completo de un registro. 404 si no existe o no pertenece al tenant."""
    async with get_db() as conn:
        tenant_id = await _get_user_tenant(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant asignado",
            )

        row = await conn.fetchrow(
            "SELECT * FROM verifactu_registros WHERE id = $1 AND tenant_id = $2",
            registro_id,
            UUID(tenant_id),
        )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado",
        )

    return _registro_to_dict(row)


@router.get("/verificar-cadena")
async def verificar_cadena(current_user: dict = Depends(get_current_user)):
    """
    Verifica la integridad del hash chaining del tenant.
    Recalcula la huella de cada registro y compara con la almacenada.
    """
    async with get_db() as conn:
        tenant_id = await _get_user_tenant(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant asignado",
            )

        tenant_row = await conn.fetchrow(
            "SELECT nif FROM tenants WHERE id = $1",
            UUID(tenant_id),
        )
        if not tenant_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant no encontrado",
            )

        rows = await conn.fetch(
            """
            SELECT * FROM verifactu_registros
            WHERE tenant_id = $1
            ORDER BY created_at ASC
            """,
            UUID(tenant_id),
        )

    nif = tenant_row["nif"]
    errores = []
    huella_anterior = ""

    for row in rows:
        fecha_expedicion = row["fecha_expedicion"]
        if hasattr(fecha_expedicion, "isoformat"):
            fecha_expedicion_str = fecha_expedicion.isoformat()
        else:
            fecha_expedicion_str = str(fecha_expedicion)[:10]

        if row.get("fecha_hora_generacion"):
            fecha_hora_generacion = row["fecha_hora_generacion"].strftime("%Y-%m-%dT%H:%M:%S+00:00")
        else:
            dt = row["created_at"]
            if dt and hasattr(dt, "astimezone"):
                dt = dt.astimezone(timezone.utc)
            fecha_hora_generacion = dt.strftime("%Y-%m-%dT%H:%M:%S+00:00") if dt else ""

        registro = {
            "nif_emisor": nif,
            "numero_serie": row["numero_serie"],
            "fecha_expedicion": fecha_expedicion_str,
            "tipo_factura": row["tipo_factura"] or "F1",
            "cuota_iva": Decimal(str(row["cuota_iva"])).quantize(Decimal("0.01"), ROUND_HALF_UP),
            "importe_total": Decimal(str(row["importe_total"])).quantize(Decimal("0.01"), ROUND_HALF_UP),
            "fecha_hora_generacion": fecha_hora_generacion,
        }

        huella_calculada = generar_huella(registro, huella_anterior)

        if huella_calculada != row["huella_actual"]:
            errores.append({
                "registro_id": str(row["id"]),
                "numero_serie": row["numero_serie"],
                "mensaje": "Huella no coincide",
            })

        huella_anterior = row["huella_actual"]

    return {
        "integra": len(errores) == 0,
        "total_registros": len(rows),
        "errores": errores,
    }


@router.get("/exportar")
async def exportar_registros(current_user: dict = Depends(get_current_user)):
    """Exporta todos los registros del tenant en formato CSV."""
    async with get_db() as conn:
        tenant_id = await _get_user_tenant(conn, current_user["sub"])
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario sin tenant asignado",
            )

        rows = await conn.fetch(
            """
            SELECT numero_serie, fecha_expedicion, tipo_factura,
                   base_imponible, cuota_iva, importe_total, huella_actual
            FROM verifactu_registros
            WHERE tenant_id = $1
            ORDER BY created_at ASC
            """,
            UUID(tenant_id),
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "numero_serie", "fecha_expedicion", "tipo_factura",
        "base_imponible", "cuota_iva", "importe_total", "huella_actual",
    ])

    for row in rows:
        fecha = row["fecha_expedicion"]
        fecha_str = fecha.isoformat() if hasattr(fecha, "isoformat") else str(fecha)
        writer.writerow([
            row["numero_serie"],
            fecha_str,
            row["tipo_factura"] or "F1",
            row["base_imponible"],
            row["cuota_iva"],
            row["importe_total"],
            row["huella_actual"],
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=verifactu_registros.csv"},
    )
