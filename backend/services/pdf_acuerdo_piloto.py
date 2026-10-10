"""
PDF Acuerdo de piloto HorecaSO (contrato de uso SaaS).
"""
from __future__ import annotations

from datetime import date, datetime
from io import BytesIO
from typing import Any

from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from services.pdf_generator import ACENTO, BORDE, FONDO_HEADER, TEXTO_HEADER, _esc


def _fmt_date(v: Any) -> str:
    if v is None or v == "":
        return "—"
    if isinstance(v, datetime):
        return v.strftime("%d/%m/%Y")
    if isinstance(v, date):
        return v.strftime("%d/%m/%Y")
    s = str(v)[:10]
    try:
        y, m, d = s.split("-")
        return f"{d}/{m}/{y}"
    except ValueError:
        return str(v)


def _precio_texto(data: dict) -> str:
    tipo = (data.get("precio_tipo") or "gratuito").lower()
    if tipo == "gratuito":
        return "Gratuito"
    if tipo == "aportacion_voluntaria":
        try:
            imp = data.get("precio_importe")
            if imp is not None and float(imp) > 0:
                return (
                    "Gratuito + aportación voluntaria opcional "
                    f"(orientativo sugerido: {float(imp):.2f} €)"
                )
        except (TypeError, ValueError):
            pass
        return "Gratuito + aportación voluntaria opcional"
    if tipo == "simbolico":
        try:
            return f"Precio simbólico: {float(data.get('precio_importe') or 0):.2f} €"
        except (TypeError, ValueError):
            return "Precio simbólico"
    otro = (data.get("precio_otro_texto") or "").strip()
    if otro:
        return otro
    try:
        if data.get("precio_importe") is not None:
            return f"{float(data['precio_importe']):.2f} €"
    except (TypeError, ValueError):
        pass
    return "Otro"


def _modulos_texto(data: dict) -> str:
    mods = data.get("modulos") or []
    if isinstance(mods, str):
        mods = [mods]
    labels = {
        "sala": "Sala / caja",
        "kds": "KDS",
        "carta": "Carta",
        "recetas": "Recetas",
        "inventario": "Inventario",
        "reservas": "Reservas",
        "reportes": "Reportes",
    }
    parts = [labels.get(m, str(m)) for m in mods]
    otros = (data.get("modulos_otros") or "").strip()
    if otros:
        parts.append(otros)
    return ", ".join(parts) if parts else "—"


def _prov_nif(data: dict) -> str:
    nif = (data.get("proveedor_nif") or "").strip()
    return nif if nif else "—"


def pdf_acuerdo_piloto(data: dict) -> bytes:
    """Genera PDF A4 del acuerdo de piloto a partir de un dict de acuerdo."""
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.4 * cm,
        bottomMargin=1.4 * cm,
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "AcuerdoTitle",
        parent=styles["Heading1"],
        fontSize=14,
        textColor=ACENTO,
        spaceAfter=8,
        alignment=TA_CENTER,
    )
    h2 = ParagraphStyle(
        "AcuerdoH2",
        parent=styles["Heading2"],
        fontSize=11,
        spaceBefore=10,
        spaceAfter=4,
    )
    body = ParagraphStyle(
        "AcuerdoBody",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        alignment=TA_JUSTIFY,
        spaceAfter=4,
    )
    small = ParagraphStyle(
        "AcuerdoSmall",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        spaceAfter=2,
    )

    story = []
    story.append(Paragraph("Acuerdo de piloto — HorecaSO", title))
    story.append(
        Paragraph(
            "Contrato de uso temporal del servicio (SaaS). "
            "No sustituye el asesoramiento de un abogado.",
            small,
        )
    )

    prov_nif = _esc(_prov_nif(data))
    ancho = A4[0] - 3.2 * cm
    datos = [
        [
            Paragraph("<b>Campo</b>", small),
            Paragraph("<b>Valor</b>", small),
        ],
        [
            Paragraph("Fecha del acuerdo", small),
            Paragraph(_esc(_fmt_date(data.get("fecha_acuerdo"))), small),
        ],
        [
            Paragraph("Periodo del piloto", small),
            Paragraph(
                _esc(
                    f"{_fmt_date(data.get('periodo_desde'))} — "
                    f"{_fmt_date(data.get('periodo_hasta'))}"
                ),
                small,
            ),
        ],
        [
            Paragraph("Proveedor (HorecaSO)", small),
            Paragraph(
                _esc(
                    f"{data.get('proveedor_razon_social') or '—'} · "
                    f"NIF: {_prov_nif(data)} · "
                    f"Email: {data.get('proveedor_email') or '—'}"
                ),
                small,
            ),
        ],
        [
            Paragraph("Dirección proveedor", small),
            Paragraph(_esc(data.get("proveedor_direccion") or "—"), small),
        ],
        [
            Paragraph("Cliente (restaurante)", small),
            Paragraph(
                _esc(
                    f"Comercial: {data.get('cliente_nombre_comercial') or '—'} · "
                    f"Razón social: {data.get('cliente_razon_social') or '—'} · "
                    f"NIF: {data.get('cliente_nif') or '—'} · "
                    f"Contacto: {data.get('cliente_contacto') or '—'} · "
                    f"Email: {data.get('cliente_email') or '—'}"
                ),
                small,
            ),
        ],
        [
            Paragraph("Dirección cliente", small),
            Paragraph(_esc(data.get("cliente_direccion") or "—"), small),
        ],
        [
            Paragraph("Precio del piloto", small),
            Paragraph(_esc(_precio_texto(data)), small),
        ],
        [
            Paragraph("Módulos incluidos", small),
            Paragraph(_esc(_modulos_texto(data)), small),
        ],
        [
            Paragraph("Soporte", small),
            Paragraph(
                _esc(
                    f"Canal: {data.get('soporte_canal') or '—'} · "
                    f"Horario: {data.get('soporte_horario') or '—'}"
                ),
                small,
            ),
        ],
    ]
    tbl = Table(datos, colWidths=[ancho * 0.28, ancho * 0.72])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), FONDO_HEADER),
                ("TEXTCOLOR", (0, 0), (-1, 0), TEXTO_HEADER),
                ("GRID", (0, 0), (-1, -1), 0.25, BORDE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(tbl)
    story.append(Spacer(1, 0.3 * cm))

    canal = data.get("soporte_canal") or "a convenir"
    horario = data.get("soporte_horario") or "a convenir"
    clauses = [
        (
            "1. Objeto",
            "El Proveedor concede al Cliente un derecho de uso temporal y no "
            "exclusivo del servicio HorecaSO (aplicación web de gestión hostelera), "
            "durante el periodo del piloto indicado, para evaluar el producto en el "
            "establecimiento del Cliente. El Cliente no adquiere la propiedad del "
            "software, del código, de las marcas ni de la documentación. Solo "
            "obtiene acceso al servicio según este acuerdo.",
        ),
        (
            "2. Acceso y cuenta",
            "El Proveedor creará una cuenta separada para el Cliente, con usuarios "
            "y contraseñas. El Cliente facilitará datos fiscales correctos, no "
            "compartirá contraseñas fuera del personal autorizado y usará el "
            "servicio solo para el establecimiento indicado. El Proveedor mantendrá "
            "los datos del Cliente separados de otros restaurantes en la medida "
            "técnica habitual del servicio multi-cliente.",
        ),
        (
            "3. Responsabilidades fiscales",
            "El Cliente sigue siendo el único responsable ante la Agencia "
            "Tributaria y demás administraciones de sus obligaciones fiscales, "
            "contables y laborales. HorecaSO no sustituye a la gestoría ni "
            "presenta declaraciones en nombre del Cliente. Al cobrar una cuenta "
            "por completo, el servicio puede generar un registro interno "
            "inalterable orientado a la preparación de la normativa de sistemas "
            "de facturación (Verifactu). Ese registro ordena y documenta ventas "
            "y puede exportarse para la gestoría; no implica remisión automática "
            "a la AEAT ni homologación Verifactu al 100 % en todas las "
            "modalidades. El Cliente entregará a su contador los cierres, PDF y "
            "exportaciones que precise.",
        ),
        (
            "4. Datos personales y confidencialidad",
            "El Cliente es responsable de la información que introduce y de "
            "disponer de base legítima para tratarla. El Proveedor tratará esos "
            "datos solo para prestar el servicio del piloto. Ambas partes no "
            "divulgarán información confidencial del otro fuera de lo necesario. "
            "Al terminar el piloto, el Cliente podrá solicitar una exportación "
            "razonable de sus datos operativos y el Proveedor podrá desactivar "
            "la cuenta.",
        ),
        (
            "5. Disponibilidad y soporte",
            "El servicio se presta en la medida de lo posible (piloto). Puede "
            f"haber interrupciones o errores. Soporte: {canal}; horario: {horario}.",
        ),
        (
            "6. Precio, aportación voluntaria y responsabilidad",
            "El acceso al servicio durante el piloto no tiene precio obligatorio: "
            "el Cliente puede usar HorecaSO sin contraprestación contractual. "
            "El Cliente puede, si lo desea, realizar una aportación voluntaria al "
            "Proveedor; esa aportación no es condición para usar el servicio ni "
            "genera derecho a exigir factura de suscripción por el piloto. "
            "En la medida permitida por la ley, el Proveedor no responde de lucro "
            "cesante, pérdida de negocio o daños indirectos derivados del uso del "
            "piloto. La responsabilidad máxima del Proveedor frente al Cliente por "
            "este piloto es 0 € cuando no hay precio obligatorio; una aportación "
            "voluntaria del Cliente no amplía esa responsabilidad ni convierte el "
            "piloto en un servicio con garantía comercial plena. El Cliente es "
            "responsable del uso por su personal y de las decisiones del local.",
        ),
        (
            "7. Duración y salida",
            "El acuerdo entra en vigor en la fecha indicada y termina en la fecha "
            "de fin del piloto, salvo prórroga escrita. Cualquiera de las partes "
            "puede dar por terminado el piloto con un aviso de 7 días por escrito "
            "(email válido). Al terminar se desactiva el acceso; siguen vigentes "
            "confidencialidad y cláusulas fiscales en lo que corresponda.",
        ),
        (
            "8. Después del piloto",
            "Si ambas partes desean continuar, firmarán o aceptarán las "
            "condiciones de uso / suscripción del producto en vigor. Este acuerdo "
            "de piloto no obliga a contratar después.",
        ),
        (
            "9. Aceptación",
            "Al firmar este documento, las partes aceptan su contenido.",
        ),
    ]
    for heading, text in clauses:
        story.append(Paragraph(_esc(heading), h2))
        story.append(Paragraph(_esc(text), body))

    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph("<b>Firmas</b>", h2))
    firmas = Table(
        [
            [
                Paragraph(
                    f"<b>Proveedor</b><br/><br/>Nombre: "
                    f"{_esc(data.get('proveedor_razon_social') or '—')}<br/>"
                    f"NIF: {prov_nif}<br/><br/>Firma: ________________<br/><br/>"
                    f"Fecha: ____________",
                    small,
                ),
                Paragraph(
                    f"<b>Cliente</b><br/><br/>Nombre: "
                    f"{_esc(data.get('cliente_nombre_comercial') or data.get('cliente_razon_social') or '—')}<br/>"
                    f"NIF: {_esc(data.get('cliente_nif') or '—')}<br/><br/>"
                    f"Firma: ________________<br/><br/>Fecha: ____________",
                    small,
                ),
            ]
        ],
        colWidths=[ancho * 0.5, ancho * 0.5],
    )
    firmas.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (0, 0), 0.5, BORDE),
                ("BOX", (1, 0), (1, 0), 0.5, BORDE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(firmas)
    story.append(Spacer(1, 0.4 * cm))
    story.append(
        Paragraph(
            f"Generado por HorecaSO · {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            ParagraphStyle(
                "Pie",
                parent=small,
                alignment=TA_CENTER,
                textColor=ACENTO,
            ),
        )
    )

    doc.build(story)
    return buf.getvalue()
