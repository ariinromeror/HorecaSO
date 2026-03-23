"""PDFs comparativa proveedores y registro APPCC."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from reportlab.lib import colors
from reportlab.lib.colors import Color
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from services.pdf_generator import (
    ACENTO, BORDE, FONDO_FILA_PAR, FONDO_HEADER, TEXTO_HEADER, crear_buffer,
    cabecera_empresa, color_semaforo, pie_documento, tabla_basica,
)

_G15 = Color(16 / 255, 185 / 255, 129 / 255, alpha=0.15)
_A10 = Color(245 / 255, 158 / 255, 11 / 255, alpha=0.1)
_R10 = Color(239 / 255, 68 / 255, 68 / 255, alpha=0.1)
_REC_G = Color(16 / 255, 185 / 255, 129 / 255, alpha=0.12)
_REC_R = Color(239 / 255, 68 / 255, 68 / 255, alpha=0.12)

def _q(x) -> Decimal:
    return Decimal(str(x or 0)).quantize(Decimal("0.01"), ROUND_HALF_UP)

def _m(x) -> str:
    return str(_q(x))

def _hx(c) -> str:
    r, g, b = [int(max(0, min(255, getattr(c, k, 0) * 255))) for k in ("red", "green", "blue")]
    return f"#{r:02x}{g:02x}{b:02x}"

def _prov(p: dict) -> str:
    return str(p.get("proveedor") or p.get("nombre_proveedor") or "—")

def _tabla_filas(data: list, cw: list, fila_verde: int | None) -> Table:
    t = Table(data, colWidths=cw, repeatRows=1)
    n, cmds = len(data), [
        ("BACKGROUND", (0, 0), (-1, 0), FONDO_HEADER), ("TEXTCOLOR", (0, 0), (-1, 0), TEXTO_HEADER),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, ACENTO), ("GRID", (0, 0), (-1, -1), 0.25, BORDE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]
    for ri in range(1, n):
        bg = _G15 if fila_verde == ri else (FONDO_FILA_PAR if ri % 2 == 0 else colors.white)
        cmds += [
            ("BACKGROUND", (0, ri), (-1, ri), bg), ("FONTNAME", (0, ri), (-1, ri), "Helvetica"),
            ("FONTSIZE", (0, ri), (-1, ri), 9), ("TEXTCOLOR", (0, ri), (-1, ri), colors.black),
        ]
    t.setStyle(TableStyle(cmds))
    return t

def _nc(estado) -> bool:
    s = str(estado or "").strip().lower()
    return "no conforme" in s or s in ("nc", "nok", "no", "0", "false")

def pdf_comparativa_proveedores(articulo: dict, precios: list, tenant: dict) -> bytes:
    buf, st = crear_buffer(), getSampleStyleSheet()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    lw, story = A4[0] - 144, []
    nom = str(articulo.get("nombre") or "—")
    cabecera_empresa(story, tenant, f"COMPARATIVA PRECIOS — {nom}", st)
    hdr = ["Proveedor", "Precio actual €", "Precio mín histórico €", "Precio máx histórico €", "Última compra", "Nº compras"]
    rows, best_i, best_p = [hdr], None, None
    for i, p in enumerate(precios or []):
        pa = _q(p.get("precio_actual") or p.get("precio"))
        if best_p is None or pa < best_p:
            best_p, best_i = pa, i + 1
        rows.append([
            _prov(p), f"{_m(pa)} €", f"{_m(p.get('precio_min_historico') or p.get('precio_min'))} €",
            f"{_m(p.get('precio_max_historico') or p.get('precio_max'))} €",
            str(p.get("ultima_compra") or "—"), str(int(p.get("num_compras") or p.get("n_compras") or 0)),
        ])
    if len(rows) == 1:
        rows.append(["—", "0 €", "0 €", "0 €", "—", "0"])
        best_i = None
    cw = [lw * 0.22, lw * 0.14, lw * 0.16, lw * 0.16, lw * 0.18, lw * 0.14]
    story += [_tabla_filas(rows, cw, best_i), Spacer(1, 0.4 * cm)]
    hist = sorted(
        articulo.get("historial") or articulo.get("historial_compras") or [],
        key=lambda h: str(h.get("fecha") or ""),
    )
    hdata = [["Fecha", "Proveedor", "Precio €"]] + [
        [str(h.get("fecha") or "—"), str(h.get("proveedor") or "—"), f"{_m(h.get('precio'))} €"] for h in hist
    ]
    if len(hdata) == 1:
        hdata.append(["—", "—", "—"])
    story += [Paragraph("<b>Historial cronológico</b>", st["Normal"]), Spacer(1, 0.15 * cm), tabla_basica(hdata, [lw * 0.28, lw * 0.42, lw * 0.3]), Spacer(1, 0.4 * cm)]
    ch_n, ch_p = "—", Decimal("0")
    if precios and best_i:
        ch = precios[best_i - 1]
        ch_n, ch_p = _prov(ch), _q(ch.get("precio_actual") or ch.get("precio"))
    act_n = str(articulo.get("proveedor_actual") or "")
    act_p = None
    for p in precios or []:
        if act_n and _prov(p) == act_n:
            act_p = _q(p.get("precio_actual") or p.get("precio"))
            break
    txt = f"<b>Proveedor más económico:</b> {ch_n} → {ch_p}€"
    if act_p is not None and act_n and ch_n != act_n and ch_p < act_p:
        txt += f"<br/><b>Ahorro potencial:</b> {_m(act_p - ch_p)}€ por unidad"
    rec = Table([[Paragraph(f'<font size="10">{txt}</font>', st["Normal"])]], colWidths=[lw])
    rec.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), _A10), ("BOX", (0, 0), (-1, -1), 0.5, BORDE), ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12), ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
    story += [rec, Spacer(1, 0.5 * cm)]
    pie_documento(story, st)
    doc.build(story)
    return buf.getvalue()

def pdf_appcc(registros: list, tenant: dict, desde: str, hasta: str) -> bytes:
    buf, st = crear_buffer(), getSampleStyleSheet()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    lw, story = A4[0] - 144, []
    cabecera_empresa(story, tenant, f"REGISTRO APPCC — {desde} a {hasta}", st)
    story += [Paragraph('<font size="9" color="#6b7280">Reglamento CE 852/2004 — Sistema APPCC</font>', st["Normal"]), Spacer(1, 0.3 * cm)]
    hdr = ["Fecha", "Hora", "Punto control", "Valor", "Límite", "Estado", "Responsable", "Acción correctora"]
    data = [hdr]
    for r in registros or []:
        data.append([
            str(r.get("fecha") or "—"), str(r.get("hora") or "—"), str(r.get("punto_control") or "—"),
            str(r.get("valor") or "—"), str(r.get("limite") or "—"), str(r.get("estado") or "—"),
            str(r.get("responsable") or "—"), str(r.get("accion_correctora") or r.get("accion") or "—"),
        ])
    if len(data) == 1:
        data.append(["—"] * 8)
    cw = [lw * 0.1, lw * 0.08, lw * 0.16, lw * 0.1, lw * 0.1, lw * 0.1, lw * 0.14, lw * 0.14]
    t = Table(data, colWidths=cw, repeatRows=1)
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), FONDO_HEADER), ("TEXTCOLOR", (0, 0), (-1, 0), TEXTO_HEADER),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, ACENTO), ("GRID", (0, 0), (-1, -1), 0.25, BORDE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    n_ok = sum(1 for r in registros or [] if not _nc(r.get("estado")))
    n_bad = len(registros or []) - n_ok
    pct = (100.0 * n_ok / len(registros)) if registros else None
    for ri in range(1, len(data)):
        bad = _nc(data[ri][5])
        bg, tc = (_R10, colors.HexColor("#ef4444")) if bad else (FONDO_FILA_PAR if ri % 2 == 0 else colors.white, colors.black)
        cmds += [("BACKGROUND", (0, ri), (-1, ri), bg), ("TEXTCOLOR", (0, ri), (-1, ri), tc), ("FONTNAME", (0, ri), (-1, ri), "Helvetica"), ("FONTSIZE", (0, ri), (-1, ri), 8)]
    t.setStyle(TableStyle(cmds))
    story += [t, Spacer(1, 0.45 * cm)]
    w3 = (lw - 12) / 3
    col = _hx(color_semaforo(pct, 95.0, 80.0)) if pct is not None else "#6b7280"
    pct_txt = f"{_m(pct)} %" if pct is not None else "N/A"
    boxes = []
    for lab, val, bg, fc in (
        ("Conformes", str(n_ok), _REC_G, "#10b981"),
        ("No conformes", str(n_bad), _REC_R, "#ef4444"),
        ("% Conformidad", pct_txt, colors.white, col),
    ):
        p = f'<para align="center"><font color="{fc}"><b>{lab}</b><br/>{val}</font></para>'
        tt = Table([[Paragraph(p, st["Normal"])]], colWidths=[w3])
        tt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 0.5, BORDE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ]))
        boxes.append(tt)
    sum_t = Table([boxes], colWidths=[w3, w3, w3])
    sum_t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 6)]))
    story += [
        sum_t, Spacer(1, 0.7 * cm),
        Paragraph('<font size="10"><b>Firma responsable APPCC</b></font>', st["Normal"]),
        Spacer(1, 0.15 * cm), Paragraph("_" * 42, st["Normal"]), Spacer(1, 0.4 * cm),
        Paragraph('<font size="8" color="#6b7280">Documento generado conforme al Reglamento CE 852/2004</font>', st["Normal"]),
        Spacer(1, 0.35 * cm),
    ]
    pie_documento(story, st)
    doc.build(story)
    return buf.getvalue()
