"""PDF cuadrante semanal."""
from __future__ import annotations

import re
from decimal import Decimal, ROUND_HALF_UP

from reportlab.lib import colors
from reportlab.lib.colors import Color
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Spacer, Table, TableStyle

from services.pdf_diferenciales_shared import _m, _q2
from services.pdf_generator import (
    ACENTO,
    BORDE,
    FONDO_FILA_PAR,
    FONDO_HEADER,
    TEXTO_HEADER,
    crear_buffer,
    cabecera_empresa,
    pie_documento,
)

_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
_HDR_DIA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
_TURN = {"mañana": Color(59 / 255, 130 / 255, 246 / 255, alpha=0.15), "tarde": Color(245 / 255, 158 / 255, 11 / 255, alpha=0.15), "noche": Color(139 / 255, 92 / 255, 246 / 255, alpha=0.15), "libre": FONDO_FILA_PAR}


def _celda_turno(raw) -> tuple[str, str]:
    if isinstance(raw, dict):
        t = str(raw.get("franja") or raw.get("tipo") or "libre").lower()
        tx = str(raw.get("texto") or raw.get("label") or "LIBRE")
        if t not in _TURN:
            t = "libre"
        return tx, t
    s = str(raw).strip()
    if not s or s.upper() in ("LIBRE", "—", "-"):
        return "LIBRE", "libre"
    m = re.search(r"(\d{1,2}):(\d{2})", s.replace(" ", ""))
    if not m:
        return s, "libre"
    h = int(m.group(1))
    if h < 14:
        return s, "mañana"
    if h < 20:
        return s, "tarde"
    return s, "noche"


def _horas_str(s: str) -> Decimal:
    if not s or s.upper() == "LIBRE":
        return Decimal("0")
    pts = re.findall(r"(\d{1,2}):(\d{2})", s)
    if len(pts) < 2:
        return Decimal("0")
    t0 = int(pts[0][0]) * 60 + int(pts[0][1])
    t1 = int(pts[1][0]) * 60 + int(pts[1][1])
    if t1 < t0:
        t1 += 24 * 60
    return (Decimal(t1 - t0) / Decimal(60)).quantize(Decimal("0.01"), ROUND_HALF_UP)


def pdf_cuadrante(turnos_por_empleado: dict, tenant: dict, semana: str) -> bytes:
    buf = crear_buffer()
    pg = landscape(A4)
    doc = SimpleDocTemplate(buf, pagesize=pg)
    st, lw = getSampleStyleSheet(), pg[0] - 144
    story = []
    cabecera_empresa(story, tenant, f"CUADRANTE SEMANAL — {semana}", st)
    hc = ["Empleado"] + _HDR_DIA + ["Total h"]
    w = lw / len(hc)
    rows = [hc]
    col_h = [Decimal("0")] * 7
    _g = colors.HexColor("#e5e7eb")
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), FONDO_HEADER),
        ("TEXTCOLOR", (0, 0), (-1, 0), TEXTO_HEADER),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, ACENTO),
        ("GRID", (0, 0), (-1, -1), 0.25, BORDE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    ri = 1
    for nombre in sorted(turnos_por_empleado.keys(), key=lambda x: str(x).lower()):
        dias = turnos_por_empleado[nombre] or {}
        row, tot_e = [str(nombre)], Decimal("0")
        for di, dk in enumerate(_DIAS):
            txt, fr = _celda_turno(dias.get(dk, "LIBRE"))
            row.append(txt)
            h = _horas_str(txt)
            tot_e += h
            col_h[di] += h
            style_cmds.append(("BACKGROUND", (di + 1, ri), (di + 1, ri), _TURN[fr]))
        row.append(f"{_m(tot_e)} h")
        rows.append(row)
        ri += 1
    if len(rows) == 1:
        rows.append(["(sin datos)"] + ["LIBRE"] * 7 + ["0 h"])
        for di in range(7):
            style_cmds.append(("BACKGROUND", (di + 1, 1), (di + 1, 1), _TURN["libre"]))
    tot_ri = len(rows)
    tot_row = ["Totales"] + [f"{_m(c)} h" for c in col_h] + [f"{_m(sum(col_h))} h"]
    rows.append(tot_row)
    for ci in range(1, 8):
        style_cmds.append(("BACKGROUND", (ci, tot_ri), (ci, tot_ri), _g))
    style_cmds += [
        ("FONTNAME", (0, tot_ri), (-1, tot_ri), "Helvetica-Bold"),
        ("BACKGROUND", (0, tot_ri), (0, tot_ri), _g),
        ("BACKGROUND", (8, tot_ri), (8, tot_ri), _g),
    ]
    t = Table(rows, colWidths=[w * 1.15] + [w] * 7 + [w * 0.9])
    t.setStyle(TableStyle(style_cmds))
    story += [t, Spacer(1, 0.4 * cm)]
    pie_documento(story, st)
    doc.build(story)
    return buf.getvalue()
