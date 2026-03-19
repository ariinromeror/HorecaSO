"""
Motor Verifactu para HorecaSO.
Orden HAC/1177/2024 — normativa fiscal española.
"""

import hashlib
import logging
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

logger = logging.getLogger(__name__)


def generar_huella(registro: dict, huella_anterior: str) -> str:
    """
    Genera huella SHA-256 según Orden HAC/1177/2024.
    Orden exacto de campos, concatenados con &, UTF-8 sin BOM.
    """
    campos = [
        registro["nif_emisor"],
        registro["numero_serie"],
        registro["fecha_expedicion"],
        registro["tipo_factura"],
        str(registro["cuota_iva"]),
        str(registro["importe_total"]),
        huella_anterior or "",
        registro["fecha_hora_generacion"],
    ]
    cadena = "&".join(campos)
    return hashlib.sha256(cadena.encode("utf-8")).hexdigest().upper()


async def generar_numero_serie(tenant_id: str, conn) -> str:
    """
    Genera numero_serie correlativo para el tenant.
    Formato: SERIE-YYYY-NNNNNN (ej: SERIE-2026-000001)
    """
    year = datetime.now(timezone.utc).strftime("%Y")
    prefix = f"SERIE-{year}-"

    row = await conn.fetchrow(
        """
        SELECT numero_serie
        FROM verifactu_registros
        WHERE tenant_id = $1 AND numero_serie LIKE $2
        ORDER BY numero_serie DESC
        LIMIT 1
        """,
        UUID(tenant_id),
        prefix + "%",
    )

    if not row:
        return f"{prefix}000001"

    ultimo = row["numero_serie"]
    try:
        num_str = ultimo.split("-")[-1]
        siguiente = int(num_str) + 1
    except (ValueError, IndexError):
        siguiente = 1

    return f"{prefix}{siguiente:06d}"


def generar_qr_url(nif: str, numero_serie: str, fecha: str, importe: str) -> str:
    """Genera URL de cotejo AEAT para el QR."""
    return (
        f"https://www.aeat.es/wlpl/TIKE-CONT/ValidarQR"
        f"?nif={nif}&numserie={numero_serie}&fecha={fecha}&importe={importe}"
    )


async def crear_registro_verifactu(
    ticket_id: str, tenant_id: str, conn
) -> dict:
    """
    Crea registro Verifactu para un ticket cobrado.
    IVA 10% hostelería. Devuelve el registro creado.
    """
    # Obtener datos del ticket y tenant
    ticket_row = await conn.fetchrow(
        """
        SELECT t.total, t.cobrado_at, t.created_at, o.tenant_id
        FROM tickets t
        JOIN outlets o ON t.outlet_id = o.id
        WHERE t.id = $1
        """,
        UUID(ticket_id),
    )
    if not ticket_row:
        raise ValueError("Ticket no encontrado")

    if str(ticket_row["tenant_id"]) != tenant_id:
        raise ValueError("El ticket no pertenece al tenant")

    tenant_row = await conn.fetchrow(
        "SELECT nif FROM tenants WHERE id = $1",
        UUID(tenant_id),
    )
    if not tenant_row:
        raise ValueError("Tenant no encontrado")

    # Huella anterior
    huella_anterior_row = await conn.fetchrow(
        """
        SELECT huella_actual
        FROM verifactu_registros
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        """,
        UUID(tenant_id),
    )
    huella_anterior = huella_anterior_row["huella_actual"] if huella_anterior_row else ""

    # Fecha expedición (datetime.date para asyncpg)
    fecha_ref = ticket_row["cobrado_at"] or ticket_row["created_at"]
    if hasattr(fecha_ref, "date"):
        fecha_expedicion = fecha_ref.date()
    else:
        fecha_str = str(fecha_ref)[:10]
        fecha_expedicion = datetime.strptime(fecha_str, "%Y-%m-%d").date()

    # Cálculos monetarios con Decimal
    total = Decimal(str(ticket_row["total"]))
    base_imponible = (total / Decimal("1.10")).quantize(Decimal("0.01"), ROUND_HALF_UP)
    cuota_iva = (total - base_imponible).quantize(Decimal("0.01"), ROUND_HALF_UP)

    fecha_hora_generacion = datetime.now(timezone.utc)

    numero_serie = await generar_numero_serie(tenant_id, conn)

    registro = {
        "nif_emisor": tenant_row["nif"],
        "numero_serie": numero_serie,
        "fecha_expedicion": fecha_expedicion.isoformat(),
        "tipo_factura": "F1",
        "cuota_iva": cuota_iva,
        "importe_total": total,
        "fecha_hora_generacion": fecha_hora_generacion.strftime("%Y-%m-%dT%H:%M:%S") + "+00:00",
    }

    huella_actual = generar_huella(registro, huella_anterior)

    row = await conn.fetchrow(
        """
        INSERT INTO verifactu_registros (
            tenant_id, ticket_id, numero_serie, fecha_expedicion,
            tipo_factura, base_imponible, cuota_iva, importe_total,
            huella_anterior, huella_actual, fecha_hora_generacion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        """,
        UUID(tenant_id),
        UUID(ticket_id),
        numero_serie,
        fecha_expedicion,
        "F1",
        base_imponible,
        cuota_iva,
        total,
        huella_anterior or None,
        huella_actual,
        fecha_hora_generacion,
    )

    logger.info("Registro Verifactu creado: %s para ticket %s", numero_serie, ticket_id)

    return dict(row)
