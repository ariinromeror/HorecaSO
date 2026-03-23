"""PDF matriz BCG / rentabilidad platos."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from statistics import median

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, TableStyle

from services.pdf_diferenciales_shared import _m, _q2
from services.pdf_generator import (
    FONDO_FILA_PAR,
    crear_buffer,
    cabecera_empresa,
    color_semaforo,
    pie_documento,
    tabla_basica,
)

from reportlab.lib.colors import Color

_BCG_BG = {
    "Ganador": Color(16 / 255, 185 / 255, 129 / 255, alpha=0.2),
    "Motor de ventas": Color(245 / 255, 158 / 255, 11 / 255, alpha=0.2),
    "Interrogante": Color(59 / 255, 130 / 255, 246 / 255, alpha=0.2),
    "Bajo rendimiento": Color(239 / 255, 68 / 255, 68 / 255, alpha=0.2),
}


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
