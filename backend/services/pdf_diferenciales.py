"""PDFs cuadrante semanal y rentabilidad platos (BCG)."""
from __future__ import annotations

import re
from decimal import Decimal, ROUND_HALF_UP
from statistics import median

from reportlab.lib import colors
from reportlab.lib.colors import Color
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from services.pdf_generator import (
    ACENTO, BORDE, FONDO_FILA_PAR, FONDO_HEADER, TEXTO_HEADER, crear_buffer,
    cabecera_empresa, color_semaforo, pie_documento, tabla_basica,
)

_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
_HDR_DIA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
_BCG_BG = {
    "Ganador": Color(16 / 255, 185 / 255, 129 / 255, alpha=0.2),
    "Motor de ventas": Color(245 / 255, 158 / 255, 11 / 255, alpha=0.2),
    "Interrogante": Color(59 / 255, 130 / 255, 246 / 255, alpha=0.2),
    "Bajo rendimiento": Color(239 / 255, 68 / 255, 68 / 255, alpha=0.2),
}
_TURN = {"mañana": Color(59 / 255, 130 / 255, 246 / 255, alpha=0.15), "tarde": Color(245 / 255, 158 / 255, 11 / 255, alpha=0.15), "noche": Color(139 / 255, 92 / 255, 246 / 255, alpha=0.15), "libre": FONDO_FILA_PAR}

def _q2(x) -> Decimal:
    return Decimal(str(x or 0)).quantize(Decimal("0.01"), ROUND_HALF_UP)

def _m(v) -> str:
    return str(_q2(v))

def _hx(col) -> str:
    r, g, b = [int(max(0, min(255, getattr(col, k, 0) * 255))) for k in ("red", "green", "blue")]
    return f"#{r:02x}{g:02x}{b:02x}"

def _pc_pct(val: float, st) -> Paragraph:
    h = _hx(color_semaforo(val, 65, 40))
    return Paragraph(f'<para align="right"><font color="{h}"><b>{_m(val)} %</b></font></para>', st["Normal"])

def _bcg(v: float, m: float, mv: float, mm: float) -> str:
    hv, hm = v >= mv, m >= mm
    if hv and hm:
        return "Ganador"
    if hv and not hm:
        return "Motor de ventas"
    if not hv and hm:
        return "Interrogante"
    return "Bajo rendimiento"

def pdf_rentabilidad_platos(platos: list, tenant: dict) -> bytes:
    buf = crear_buffer()
    pg = landscape(A4)
    doc = SimpleDocTemplate(buf, pagesize=pg)
    st, lw = getSampleStyleSheet(), pg[0] - 144
    story = []
    cabecera_empresa(story, tenant, "INGENIERÍA DE MENÚ — RENTABILIDAD POR PLATO", st)
    _leg = (
        '<font size="8" color="#6b7280">Leyenda: Ganador = alta venta + alto margen | '
        "Motor de ventas = alta venta + bajo margen | Interrogante = baja venta + alto margen | "
        "Bajo rendimiento = baja venta + bajo margen</font>"
    )
    story += [Paragraph(_leg, st["Normal"]), Spacer(1, 0.25 * cm)]
    vs = [float(p.get("ventas_mes") or 0) for p in platos]
    ms = [float(p.get("margen_porcentaje") or 0) for p in platos]
    mv = float(median(vs)) if vs else 0.0
    mm = float(median(ms)) if ms else 0.0
    perros, estrellas = [], []
    hdr = ["Plato", "Categoría", "Precio", "Coste", "Margen €", "Margen %", "Ventas/mes", "BCG"]
    data = [hdr]
    for p in platos:
        pr, co = _q2(p.get("precio")), _q2(p.get("coste_calculado"))
        vm = int(p.get("ventas_mes") or 0)
        m_eur = _q2((pr - co) * vm) if vm else _q2(pr - co)
        mp = float(p.get("margen_porcentaje") or 0)
        if mp == 0 and pr > 0:
            mp = float((((pr - co) / pr) * 100).quantize(Decimal("0.01"), ROUND_HALF_UP))
        cat = _bcg(float(vm), mp, mv, mm)
        if cat == "Bajo rendimiento":
            perros.append(str(p.get("nombre") or "—"))
        elif cat == "Ganador":
            estrellas.append(str(p.get("nombre") or "—"))
        data.append(
            [
                str(p.get("nombre") or "—"),
                str(p.get("categoria") or "—"),
                f"{_m(pr)} €",
                f"{_m(co)} €",
                f"{_m(m_eur)} €",
                _pc_pct(mp, st),
                str(vm),
                cat,
            ]
        )
    if len(data) == 1:
        data.append(["—", "—", "0 €", "0 €", "0 €", _pc_pct(0, st), "0", "—"])
    cw = [lw * 0.16, lw * 0.12, lw * 0.09, lw * 0.09, lw * 0.1, lw * 0.1, lw * 0.09, lw * 0.08]
    tbl = tabla_basica(data, cw)
    cmds = [("BACKGROUND", (7, ri), (7, ri), _BCG_BG.get(str(data[ri][7]), FONDO_FILA_PAR)) for ri in range(1, len(data))]
    if cmds:
        tbl.setStyle(TableStyle(cmds))
    story += [tbl, Spacer(1, 0.35 * cm)]
    rp, rs = ", ".join(perros) if perros else "—", ", ".join(estrellas) if estrellas else "—"
    _rec = f'<font size="9" color="#6b7280"><b>Considerar retirar:</b> {rp}<br/><b>Potenciar en carta:</b> {rs}</font>'
    story += [Paragraph(_rec, st["Normal"]), Spacer(1, 0.35 * cm)]
    pie_documento(story, st)
    doc.build(story)
    return buf.getvalue()

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
