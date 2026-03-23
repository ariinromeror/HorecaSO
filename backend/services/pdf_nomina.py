"""PDF nómina individual."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Spacer

from services.pdf_generator import cabecera_empresa, crear_buffer, pie_documento, tabla_basica


def _m(v) -> str:
    d = Decimal(str(v or 0)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    return f"{d} €"


def pdf_nomina(row: dict) -> bytes:
    buf = crear_buffer()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    tenant = {
        "nombre": row.get("tenant_nombre") or "—",
        "nif": row.get("tenant_nif") or "",
    }
    cabecera_empresa(story, tenant, "Nómina", styles)
    mes = row.get("mes")
    anio = row.get("anio")
    data = [
        ["Campo", "Valor"],
        ["Período", f"{mes}/{anio}"],
        ["DNI", str(row.get("dni") or "—")],
        ["NSS", str(row.get("nss") or "—")],
        ["Cargo", str(row.get("cargo") or "—")],
        ["Contrato", str(row.get("contrato") or "—")],
        ["Salario bruto", _m(row.get("salario_bruto"))],
        ["Total devengos", _m(row.get("total_devengos"))],
        ["Total deducciones", _m(row.get("total_deducciones"))],
        ["IRPF", _m(row.get("irpf"))],
        ["Líquido", _m(row.get("liquido"))],
    ]
    irpf_pct = row.get("irpf_porcentaje")
    if irpf_pct is not None:
        data.append(
            [
                "IRPF %",
                f"{Decimal(str(irpf_pct)).quantize(Decimal('0.01'), ROUND_HALF_UP)} %",
            ]
        )
    story.append(tabla_basica(data, [6 * cm, 10 * cm]))
    story.append(Spacer(1, 0.4 * cm))
    pie_documento(story, styles)
    doc.build(story)
    return buf.getvalue()
