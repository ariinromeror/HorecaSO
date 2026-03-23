"""PDF inventario a fecha — landscape, resumen y tabla con estados."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from reportlab.lib.colors import Color
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from services.pdf_generator import (
    BORDE,
    FONDO_FILA_PAR,
    crear_buffer,
    cabecera_empresa,
    pie_documento,
    tabla_basica,
)

def _q4(x) -> Decimal:
    return Decimal(str(x or 0)).quantize(Decimal("0.0001"), ROUND_HALF_UP)

def _q2(x) -> Decimal:
    return Decimal(str(x or 0)).quantize(Decimal("0.01"), ROUND_HALF_UP)

def _esc(s: object) -> str:
    t = "" if s is None else str(s)
    return (
        t.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _badge_estado(stock: Decimal, minimo: Decimal, styles) -> Paragraph:
    if stock <= 0:
        html = '<para align="center"><font color="#ef4444"><b>AGOTADO</b></font></para>'
    elif stock < minimo:
        html = '<para align="center"><font color="#f59e0b"><b>BAJO</b></font></para>'
    else:
        html = '<para align="center"><font color="#10b981"><b>OK</b></font></para>'
    return Paragraph(html, styles["Normal"])

def pdf_inventario(articulos: list, tenant: dict, fecha: str) -> bytes:
    buf = crear_buffer()
    page = landscape(A4)
    doc = SimpleDocTemplate(buf, pagesize=page)
    styles = getSampleStyleSheet()
    lw = page[0] - 144

    ordenados = sorted(
        articulos,
        key=lambda a: (
            str(a.get("categoria_almacen") or "").lower(),
            str(a.get("nombre") or "").lower(),
        ),
    )

    total_valor = Decimal("0")
    n_bajo_min = 0
    for a in ordenados:
        st = _q4(a.get("stock_actual"))
        smin = _q4(a.get("stock_minimo"))
        total_valor += _q2(st * _q4(a.get("coste_unitario")))
        if st < smin:
            n_bajo_min += 1

    n_total = len(ordenados)
    st_center = ParagraphStyle(
        name="InvSum",
        parent=styles["Normal"],
        alignment=1,
        fontSize=10,
        leading=14,
    )
    red_bg = Color(239 / 255, 68 / 255, 68 / 255, alpha=0.12)
    amb_bg = Color(245 / 255, 158 / 255, 11 / 255, alpha=0.12)
    c1 = Paragraph(
        f"<font size=9 color='#6b7280'>Total artículos</font><br/>"
        f"<b><font size=16 color='#111827'>{n_total}</font></b>",
        st_center,
    )
    c2 = Paragraph(
        f"<font size=9 color='#ef4444'>Bajo mínimo</font><br/>"
        f"<b><font size=16 color='#ef4444'>{n_bajo_min}</font></b>",
        st_center,
    )
    c3 = Paragraph(
        f"<font size=9 color='#f59e0b'>Valor total stock</font><br/>"
        f"<b><font size=16 color='#f59e0b'>{_q2(total_valor)} €</font></b>",
        st_center,
    )
    sum_tbl = Table([[c1, c2, c3]], colWidths=[lw / 3, lw / 3, lw / 3], rowHeights=[1.1 * cm])
    sum_tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("BACKGROUND", (0, 0), (0, 0), FONDO_FILA_PAR),
                ("BACKGROUND", (1, 0), (1, 0), red_bg),
                ("BACKGROUND", (2, 0), (2, 0), amb_bg),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDE),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story = []
    cabecera_empresa(story, tenant, f"INVENTARIO A FECHA: {_esc(fecha)}", styles)
    story.append(sum_tbl)
    story.append(Spacer(1, 0.45 * cm))
    data = [
        [
            "Artículo",
            "Categoría",
            "Stock",
            "Unidad",
            "Mín",
            "Máx",
            "Valor €",
            "Estado",
        ]
    ]
    for a in ordenados:
        st = _q4(a.get("stock_actual"))
        smin = _q4(a.get("stock_minimo"))
        smax = a.get("stock_maximo")
        smax_s = (
            str(_q4(smax))
            if smax is not None and str(smax).strip() != ""
            else "—"
        )
        cu = _q4(a.get("coste_unitario"))
        v_line = _q2(st * cu)
        data.append(
            [
                _esc(a.get("nombre") or "—"),
                _esc(a.get("categoria_almacen") or "—"),
                str(st),
                _esc(a.get("unidad_medida") or ""),
                str(smin),
                smax_s,
                f"{v_line} €",
                _badge_estado(st, smin, styles),
            ]
        )

    cw = [
        lw * 0.22,
        lw * 0.13,
        lw * 0.09,
        lw * 0.07,
        lw * 0.07,
        lw * 0.07,
        lw * 0.10,
        lw * 0.12,
    ]
    story.append(tabla_basica(data, cw))
    story.append(Spacer(1, 0.15 * cm))

    tot_row = Table(
        [
            [
                Paragraph("<b>TOTAL</b>", styles["Normal"]),
                "",
                "",
                "",
                "",
                "",
                Paragraph(f"<b>{_q2(total_valor)} €</b>", styles["Normal"]),
                "",
            ]
        ],
        colWidths=cw,
    )
    tot_row.setStyle(
        TableStyle(
            [
                ("SPAN", (0, 0), (5, 0)),
                ("BACKGROUND", (0, 0), (-1, -1), FONDO_FILA_PAR),
                ("GRID", (0, 0), (-1, -1), 0.25, BORDE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("ALIGN", (6, 0), (6, 0), "RIGHT"),
            ]
        )
    )
    story.append(tot_row)
    story.append(Spacer(1, 0.35 * cm))
    pie_documento(story, styles)
    doc.build(story)
    return buf.getvalue()
