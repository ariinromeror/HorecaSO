"""
Motor de predicción para inventario y mermas.

Modelo baseline (sin dependencias externas) listo para sustituir por un
modelo entrenado (scikit-learn, Prophet o llamada a Groq) sin cambiar el
contrato del router:

    forecast_serie_diaria(historial, horizonte) -> dict

El historial es la serie diaria agregada de `movimientos_stock`
(tipo='merma') del tenant/outlet; cualquier modelo futuro debe aceptar y
devolver las mismas estructuras.

Baseline implementado:
  1. Media móvil ponderada de los últimos 7 días (más peso a lo reciente).
  2. Tendencia lineal (regresión por mínimos cuadrados sobre la serie).
  3. Estacionalidad semanal (factor por día de la semana).
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

_Q4 = Decimal("0.0001")
_PESOS_MOVIL = [Decimal(str(w)) for w in (1, 1, 2, 2, 3, 4, 5)]  # 7 días, reciente pesa más


def _q(v: Decimal) -> Decimal:
    return v.quantize(_Q4, ROUND_HALF_UP)


def _rellenar_huecos(
    historial: list[tuple[date, Decimal]],
) -> list[tuple[date, Decimal]]:
    """Serie continua día a día: los días sin mermas registradas valen 0."""
    if not historial:
        return []
    por_fecha = {f: v for f, v in historial}
    d0 = min(por_fecha)
    d1 = max(por_fecha)
    serie = []
    d = d0
    while d <= d1:
        serie.append((d, por_fecha.get(d, Decimal("0"))))
        d += timedelta(days=1)
    return serie


def _media_movil_ponderada(valores: list[Decimal]) -> Decimal:
    ventana = valores[-len(_PESOS_MOVIL):]
    pesos = _PESOS_MOVIL[-len(ventana):]
    total_pesos = sum(pesos)
    if total_pesos == 0:
        return Decimal("0")
    return sum(v * p for v, p in zip(ventana, pesos)) / total_pesos


def _pendiente_tendencia(valores: list[Decimal]) -> Decimal:
    """Pendiente de la recta de mínimos cuadrados (unidades por día)."""
    n = len(valores)
    if n < 2:
        return Decimal("0")
    xs = [Decimal(i) for i in range(n)]
    media_x = sum(xs) / Decimal(n)
    media_y = sum(valores) / Decimal(n)
    num = sum((x - media_x) * (y - media_y) for x, y in zip(xs, valores))
    den = sum((x - media_x) ** 2 for x in xs)
    if den == 0:
        return Decimal("0")
    return num / den


def _factores_dia_semana(serie: list[tuple[date, Decimal]]) -> dict[int, Decimal]:
    """Factor multiplicativo por día de semana (0=lunes … 6=domingo)."""
    media_global = (
        sum(v for _, v in serie) / Decimal(len(serie)) if serie else Decimal("0")
    )
    if media_global == 0:
        return {i: Decimal("1") for i in range(7)}
    por_dia: dict[int, list[Decimal]] = {i: [] for i in range(7)}
    for f, v in serie:
        por_dia[f.weekday()].append(v)
    factores = {}
    for i in range(7):
        vals = por_dia[i]
        if vals:
            factores[i] = (sum(vals) / Decimal(len(vals))) / media_global
        else:
            factores[i] = Decimal("1")
    return factores


def forecast_serie_diaria(
    historial: list[tuple[date, Decimal]],
    horizonte: int = 7,
) -> dict:
    """
    Predice los próximos `horizonte` días a partir de una serie diaria.

    Devuelve:
        {
          "predicciones": [{"fecha": date, "valor_previsto": Decimal}, ...],
          "total_previsto": Decimal,
          "media_diaria_historica": Decimal,
          "tendencia_diaria": Decimal,   # >0 la merma crece, <0 decrece
          "dias_historial": int,
          "modelo": str,
        }
    """
    serie = _rellenar_huecos(historial)
    if not serie:
        return {
            "predicciones": [],
            "total_previsto": Decimal("0"),
            "media_diaria_historica": Decimal("0"),
            "tendencia_diaria": Decimal("0"),
            "dias_historial": 0,
            "modelo": "baseline_v1 (sin datos)",
        }

    valores = [v for _, v in serie]
    ultima_fecha = serie[-1][0]
    base = _media_movil_ponderada(valores)
    pendiente = _pendiente_tendencia(valores)
    factores = _factores_dia_semana(serie)
    media_hist = sum(valores) / Decimal(len(valores))

    predicciones = []
    for paso in range(1, horizonte + 1):
        fecha = ultima_fecha + timedelta(days=paso)
        crudo = (base + pendiente * Decimal(paso)) * factores[fecha.weekday()]
        valor = _q(max(crudo, Decimal("0")))
        predicciones.append({"fecha": fecha, "valor_previsto": valor})

    return {
        "predicciones": predicciones,
        "total_previsto": _q(sum(p["valor_previsto"] for p in predicciones)),
        "media_diaria_historica": _q(media_hist),
        "tendencia_diaria": _q(pendiente),
        "dias_historial": len(serie),
        "modelo": "baseline_v1 (media móvil ponderada + tendencia + estacionalidad semanal)",
    }
