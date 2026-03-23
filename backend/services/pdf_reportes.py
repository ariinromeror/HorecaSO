"""PDFs cierre de caja y ventas por periodo."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from services.pdf_generator import (
    ACENTO, BORDE, FONDO_HEADER, crear_buffer, cabecera_empresa,
    color_semaforo, pie_documento, tabla_basica,
)

def _q2(x) -> Decimal:
    return Decimal(str(x or 0)).quantize(Decimal("0.01"), ROUND_HALF_UP)

def _m(v) -> str:
    return str(_q2(v))

def _fc(c: dict) -> str:
    f = c.get("fecha")
    return f.isoformat() if f is not None and hasattr(f, "isoformat") else str(f or "—")

def _hx(col) -> str:
    r, g, b = [
        int(max(0, min(255, getattr(col, x, 0) * 255))) for x in ("red", "green", "blue")
    ]
    return f"#{r:02x}{g:02x}{b:02x}"

def _pc(val: float, st) -> Paragraph:
    h = _hx(color_semaforo(val, 40, 20))
    return Paragraph(f'<para align="right"><font color="{h}"><b>{_m(val)} %</b></font></para>', st["Normal"])

def pdf_cierre_caja(cierre: dict, tenant: dict) -> bytes:
    buf = crear_buffer()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    st, story = getSampleStyleSheet(), []
    cabecera_empresa(story, tenant, f"CIERRE DE CAJA — {_fc(cierre)}", st)
    tc, cr, db = cierre.get("total_tarjeta"), _q2(cierre.get("total_tarjeta_credito")), _q2(cierre.get("total_tarjeta_debito"))
    if tc is not None and cr == 0 and db == 0:
        cr = _q2(tc)
    md = [
        ("Efectivo", "num_tickets_efectivo", cierre.get("total_efectivo")),
        ("Tarjeta crédito", "num_tickets_tarjeta_credito", cr),
        ("Tarjeta débito", "num_tickets_tarjeta_debito", db),
        ("Bizum", "num_tickets_bizum", cierre.get("total_bizum")),
        ("Transferencia", "num_tickets_transferencia", cierre.get("total_transferencia")),
        ("Invitación", "num_tickets_invitacion", cierre.get("total_invitaciones")),
    ]
    pay = [["Método de pago", "Nº Tickets", "Importe €"]] + [
        [a, str(cierre.get(b) if cierre.get(b) is not None else "—"), f"{_m(c)} €"] for a, b, c in md
    ]
    story += [tabla_basica(pay, [6.5 * cm, 3.2 * cm, 4.3 * cm]), Spacer(1, 0.35 * cm)]
    tv = _q2(cierre.get("total_ventas"))
    b10, q10 = _q2(cierre.get("base_imponible_10")), _q2(cierre.get("cuota_iva_10"))
    if b10 == 0 and q10 == 0 and tv > 0:
        b10 = (tv / Decimal("1.10")).quantize(Decimal("0.01"), ROUND_HALF_UP)
        q10 = (tv - b10).quantize(Decimal("0.01"), ROUND_HALF_UP)
    b21, q21 = _q2(cierre.get("base_imponible_21")), _q2(cierre.get("cuota_iva_21"))
    w4 = (A4[0] - 144) / 4
    story += [
        tabla_basica(
            [
                ["Tipo IVA", "Base imponible €", "Cuota IVA €", "Total €"],
                ["10% hostelería", f"{_m(b10)} €", f"{_m(q10)} €", f"{_m(b10 + q10)} €"],
                ["21% alcohol/tabaco", f"{_m(b21)} €", f"{_m(q21)} €", f"{_m(b21 + q21)} €"],
            ],
            [w4 * 1.1, w4, w4, w4],
        ),
        Spacer(1, 0.4 * cm),
    ]
    tot = tv if tv > 0 else sum((_q2(x) for _, _, x in md), Decimal("0"))
    bx = (
        f"<font color='#e8eaf0' size='11'><b>TOTAL CAJA</b></font><br/>"
        f"<font size='22' color='#f59e0b'><b>{_m(tot)} €</b></font>"
    )
    tb = Table([[Paragraph(bx, st["Normal"])]], [A4[0] - 144], [1.35 * cm])
    tb.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), FONDO_HEADER), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("BOX", (0, 0), (-1, -1), 0.5, BORDE)]))
    story += [tb, Spacer(1, 0.45 * cm)]
    pie_documento(story, st)
    doc.build(story)
    return buf.getvalue()

def pdf_ventas_periodo(ventas: list, resumen: dict, tenant: dict, desde: str, hasta: str) -> bytes:
    buf = crear_buffer()
    pg = landscape(A4)
    doc = SimpleDocTemplate(buf, pagesize=pg)
    st, lw = getSampleStyleSheet(), pg[0] - 144
    story = []
    cabecera_empresa(story, tenant, f"VENTAS {desde} — {hasta}", st)
    ks = [
        f"<b>Total ventas</b><br/>{_m(resumen.get('total'))} €",
        f"<b>Ticket medio</b><br/>{_m(resumen.get('ticket_medio'))} €",
        f"<b>Mejor día</b><br/>{resumen.get('mejor_dia') or '—'}",
        f"<b>Top producto</b><br/>{resumen.get('top_producto') or '—'}",
    ]
    kt = Table([[Paragraph(x, st["Normal"]) for x in ks]], [lw / 4] * 4, [1.0 * cm])
    kt.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("BOX", (0, 0), (-1, -1), 0.5, BORDE), ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDE), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f4f6f9"))]))
    story += [kt, Spacer(1, 0.4 * cm)]
    hd = ["Fecha", "Tickets", "Ventas €", "Coste €", "Margen €", "Margen %"]
    rows, tv, tc, tm = [hd], Decimal("0"), Decimal("0"), Decimal("0")
    for r in ventas:
        v, c = _q2(r.get("ventas")), _q2(r.get("coste"))
        mg = _q2(r.get("margen") if r.get("margen") is not None else (v - c))
        pv = (
            float(r.get("margen_pct"))
            if r.get("margen_pct") is not None
            else float((mg / v * 100).quantize(Decimal("0.01"), ROUND_HALF_UP) if v else 0)
        )
        tv, tc, tm = tv + v, tc + c, tm + mg
        rows.append(
            [
                str(r.get("fecha") or "—"),
                str(r.get("tickets") or 0),
                f"{_m(v)} €",
                f"{_m(c)} €",
                f"{_m(mg)} €",
                _pc(pv, st),
            ]
        )
    cw = [lw * 0.14, lw * 0.1, lw * 0.14, lw * 0.14, lw * 0.14, lw * 0.14]
    story += [tabla_basica(rows, cw), Spacer(1, 0.12 * cm)]
    tp = float((tm / tv * 100).quantize(Decimal("0.01"), ROUND_HALF_UP)) if tv else 0.0
    tt = Table(
        [
            [
                Paragraph("<b>TOTALES</b>", st["Normal"]),
                "",
                Paragraph(f"<b>{_m(tv)} €</b>", st["Normal"]),
                Paragraph(f"<b>{_m(tc)} €</b>", st["Normal"]),
                Paragraph(f"<b>{_m(tm)} €</b>", st["Normal"]),
                _pc(tp, st),
            ]
        ],
        colWidths=cw,
    )
    tt.setStyle(TableStyle([("SPAN", (0, 0), (1, 0)), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f4f6f9")), ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"), ("GRID", (0, 0), (-1, -1), 0.25, BORDE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    story += [tt, Spacer(1, 0.45 * cm)]
    tr = [["Producto", "Unidades", "Ingresos €", "Coste €", "Margen %"]]
    for p in (resumen.get("top_productos") or [])[:10]:
        ing, co = _q2(p.get("ingresos")), _q2(p.get("coste"))
        mp = (
            float(p.get("margen_pct"))
            if p.get("margen_pct") is not None
            else float(((ing - co) / ing * 100).quantize(Decimal("0.01"), ROUND_HALF_UP) if ing else 0)
        )
        tr.append(
            [
                str(p.get("producto") or p.get("nombre") or "—"),
                str(int(p.get("unidades") or 0)),
                f"{_m(ing)} €",
                f"{_m(co)} €",
                _pc(mp, st),
            ]
        )
    if len(tr) == 1:
        tr.append(["—", "0", "0 €", "0 €", _pc(0, st)])
    tw = lw / 5
    pt = Table(tr, colWidths=[tw * 1.4, tw * 0.8, tw, tw, tw])
    pt.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), ACENTO), ("TEXTCOLOR", (0, 0), (-1, 0), colors.black), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, 0), 10), ("GRID", (0, 0), (-1, -1), 0.25, BORDE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f6f9")])]))
    story += [pt, Spacer(1, 0.4 * cm)]
    pie_documento(story, st)
    doc.build(story)
    return buf.getvalue()
