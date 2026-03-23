"""
Utilidades base ReportLab para PDFs HorecaSO (cabecera, tablas, pie, semáforo).
"""
from __future__ import annotations

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_RIGHT
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Paleta design system HorecaSO (PDFs)
FONDO_HEADER = HexColor("#1a1d27")
TEXTO_HEADER = HexColor("#e8eaf0")
FONDO_FILA_PAR = HexColor("#f4f6f9")
ACENTO = HexColor("#f59e0b")
VERDE = HexColor("#10b981")
AMARILLO = HexColor("#f59e0b")
ROJO = HexColor("#ef4444")
BORDE = HexColor("#e2e5ed")


def _esc(texto: object) -> str:
    s = "" if texto is None else str(texto)
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def crear_buffer() -> io.BytesIO:
    return io.BytesIO()


def cabecera_empresa(story, tenant: dict, titulo: str, styles) -> None:
    nombre = _esc(tenant.get("nombre") or tenant.get("nombre_empresa") or "—")
    nif = _esc(tenant.get("nif") or "")
    ancho = A4[0] - 144  # ~márgenes 72 pt típicos SimpleDocTemplate

    izq = (
        f'<para><b><font size="14">{nombre}</font></b><br/>'
        f'<font size="8" color="#6b7280">NIF: {nif}</font></para>'
    )
    titulo_style = ParagraphStyle(
        name="HorecaTituloDoc",
        parent=styles["Normal"],
        fontSize=13,
        leading=16,
        textColor=ACENTO,
        alignment=TA_RIGHT,
        fontName="Helvetica-Bold",
    )
    der = Paragraph(_esc(titulo), titulo_style)

    tbl_top = Table(
        [[Paragraph(izq, styles["Normal"]), der]],
        colWidths=[ancho * 0.55, ancho * 0.45],
    )
    tbl_top.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(tbl_top)

    sep = Table([[""]], colWidths=[ancho], rowHeights=[2])
    sep.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), ACENTO),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(sep)
    story.append(Spacer(1, 0.35 * cm))


def pie_documento(story, styles) -> None:
    ts = datetime.now().strftime("%d/%m/%Y %H:%M")
    txt = f"Generado por HorecaSO · {ts}"
    story.append(Spacer(1, 0.5 * cm))
    story.append(
        Paragraph(
            f'<para align="center"><font size="8" color="#6b7280">{_esc(txt)}</font></para>',
            styles["Normal"],
        )
    )


def tabla_basica(data: list, col_widths: list) -> Table:
    t = Table(data, colWidths=col_widths, repeatRows=1)
    nrows = len(data)
    cmds: list = [
        ("BACKGROUND", (0, 0), (-1, 0), FONDO_HEADER),
        ("TEXTCOLOR", (0, 0), (-1, 0), TEXTO_HEADER),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, ACENTO),
        ("GRID", (0, 0), (-1, -1), 0.25, BORDE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]
    for ri in range(1, nrows):
        bg = FONDO_FILA_PAR if ri % 2 == 0 else colors.white
        cmds.append(("BACKGROUND", (0, ri), (-1, ri), bg))
        cmds.append(("FONTNAME", (0, ri), (-1, ri), "Helvetica"))
        cmds.append(("FONTSIZE", (0, ri), (-1, ri), 9))
        cmds.append(("TEXTCOLOR", (0, ri), (-1, ri), colors.black))
    t.setStyle(TableStyle(cmds))
    return t


def color_semaforo(
    valor: float, umbral_verde: float, umbral_rojo: float
) -> HexColor:
    if valor >= umbral_verde:
        return VERDE
    if valor >= umbral_rojo:
        return AMARILLO
    return ROJO
