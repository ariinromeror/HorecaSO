"""
Unidades de receta alineadas con inventario: masa (kg/g), volumen (l/ml), unidades (ud).
Evita mezclar litros con sólidos y normaliza cantidad a la unidad del artículo para el coste.
"""

from decimal import Decimal, ROUND_HALF_UP

FAMILIA_MASA = "masa"
FAMILIA_VOLUMEN = "volumen"
FAMILIA_UNIDAD = "unidad"

_VOLUMEN_ALIAS = frozenset(
    {
        "l",
        "lt",
        "litro",
        "litros",
        "litro(s)",
        "ml",
        "mililitro",
        "mililitros",
    }
)
_MASA_ALIAS = frozenset(
    {
        "kg",
        "kilo",
        "kilos",
        "kilogramo",
        "kilogramos",
        "g",
        "gr",
        "gramo",
        "gramos",
        "gramo(s)",
    }
)
_UNIDAD_ALIAS = frozenset({"ud", "unidad", "unidades", "u", "uds"})


def normalizar_unidad(u: str | None) -> str:
    """Canoniza sinónimos de inventario a kg|g|l|ml|ud."""
    if not u:
        return ""
    x = str(u).strip().lower()
    if x in ("ml", "mililitro", "mililitros"):
        return "ml"
    if x in ("l", "lt", "litro", "litros", "litro(s)"):
        return "l"
    if x in ("g", "gr", "gramo", "gramos", "gramo(s)"):
        return "g"
    if x in ("kg", "kilo", "kilos", "kilogramo", "kilogramos"):
        return "kg"
    if x in _UNIDAD_ALIAS:
        return "ud"
    return x


def familia_unidad(u: str | None) -> str:
    if not u:
        return "desconocido"
    x = normalizar_unidad(u)
    raw = str(u).strip().lower()
    if x in ("kg", "g") or raw in _MASA_ALIAS:
        return FAMILIA_MASA
    if x in ("l", "ml") or raw in _VOLUMEN_ALIAS:
        return FAMILIA_VOLUMEN
    if x == "ud" or raw in _UNIDAD_ALIAS:
        return FAMILIA_UNIDAD
    return "desconocido"


def unidades_permitidas_para_articulo(unidad_medida_articulo: str | None) -> list[str]:
    """Unidades que puede elegir la línea de receta según la unidad de compra/stock del artículo."""
    fam = familia_unidad(unidad_medida_articulo)
    if fam == FAMILIA_VOLUMEN:
        return ["l", "ml"]
    if fam == FAMILIA_MASA:
        return ["kg", "g"]
    if fam == FAMILIA_UNIDAD:
        return ["ud"]
    return ["kg", "g", "l", "ml", "ud"]


def _a_kg(cantidad: Decimal, u: str) -> Decimal:
    x = normalizar_unidad(u)
    if x == "kg":
        return cantidad
    if x == "g":
        return cantidad / Decimal("1000")
    raise ValueError("unidad_masa")


def _desde_kg(cantidad_kg: Decimal, unidad_art: str) -> Decimal:
    x = normalizar_unidad(unidad_art)
    if x == "kg":
        return cantidad_kg
    if x == "g":
        return cantidad_kg * Decimal("1000")
    raise ValueError("unidad_masa_art")


def _a_litros(cantidad: Decimal, u: str) -> Decimal:
    x = normalizar_unidad(u)
    if x == "l":
        return cantidad
    if x == "ml":
        return cantidad / Decimal("1000")
    raise ValueError("unidad_volumen")


def _desde_litros(cantidad_l: Decimal, unidad_art: str) -> Decimal:
    x = normalizar_unidad(unidad_art)
    if x == "l":
        return cantidad_l
    if x == "ml":
        return cantidad_l * Decimal("1000")
    raise ValueError("unidad_volumen_art")


def cantidad_en_unidad_articulo(
    cantidad: Decimal,
    unidad_linea: str,
    unidad_articulo: str,
) -> Decimal:
    """
    Convierte cantidad expresada en unidad_linea a la unidad en la que está el coste_unitario del artículo.
    """
    fam_l = familia_unidad(unidad_linea)
    fam_a = familia_unidad(unidad_articulo)
    if fam_l != fam_a or fam_l in ("desconocido",):
        raise ValueError(
            f"Unidad de receta '{unidad_linea}' incompatible con unidad de inventario '{unidad_articulo}'"
        )
    if fam_l == FAMILIA_UNIDAD:
        return cantidad
    if fam_l == FAMILIA_MASA:
        kg = _a_kg(cantidad, unidad_linea)
        return _desde_kg(kg, unidad_articulo)
    if fam_l == FAMILIA_VOLUMEN:
        lit = _a_litros(cantidad, unidad_linea)
        return _desde_litros(lit, unidad_articulo)
    raise ValueError("familia")


def coste_unitario_efectivo_calibracion(
    coste_unitario: Decimal,
    comprado: object | None,
    util: object | None,
) -> Decimal:
    """
    Regla de tres inventario: si compras C y tras limpiar te queda U (misma unidad lógica),
    el coste por unidad ÚTIL = coste_factura * (C / U).
    """
    base = Decimal(str(coste_unitario or 0))
    if comprado is None or util is None:
        return base
    c = Decimal(str(comprado))
    u = Decimal(str(util))
    if c <= 0 or u <= 0 or u > c:
        return base
    return (base * (c / u)).quantize(Decimal("0.0001"), ROUND_HALF_UP)
