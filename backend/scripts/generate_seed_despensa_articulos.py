"""Genera backend/sql/seed_despensa_articulos_prueba.sql con ≥150 artículos para el tenant demo."""
from __future__ import annotations

import textwrap

TENANT = "11111111-1111-1111-1111-111111111111"

# (nombre, sku_suffix, unidad, coste_eur, categoria_almacen, temperatura)
# sku = DSP-{suffix} — prefijo distinto de ALM-* del seed_demo_tenant_prueba_abcd.sql
ITEMS: list[tuple[str, str, str, float, str, str]] = []

n = 0


def add(
    nombre: str,
    um: str,
    precio: float,
    cat: str,
    temp: str = "ambiente",
) -> None:
    global n
    n += 1
    sku = f"DSP-{n:03d}"
    ITEMS.append((nombre, sku, um, precio, cat, temp))


# ——— Secos y despensa ———
add("Sal marina fina", "kg", 0.45, "Seco")
add("Sal gorda marina", "kg", 0.42, "Seco")
add("Sal en escamas (Maldon)", "kg", 8.50, "Seco")
add("Azúcar blanco refinado", "kg", 0.95, "Seco")
add("Azúcar moreno", "kg", 1.10, "Seco")
add("Azúcar glass", "kg", 1.35, "Seco")
add("Miel de azahar", "kg", 6.80, "Seco")
add("Jarabe de ágave", "L", 5.20, "Seco")
add("Harina de trigo todo uso", "kg", 0.85, "Seco")
add("Harina de fuerza (W)", "kg", 1.05, "Seco")
add("Harina integral", "kg", 1.20, "Seco")
add("Harina de maíz (polenta)", "kg", 1.40, "Seco")
add("Harina de garbanzo", "kg", 2.10, "Seco")
add("Harina de almendra", "kg", 12.00, "Seco")
add("Maicena", "kg", 1.80, "Seco")
add("Levadura seca instantánea", "kg", 18.00, "Seco")
add("Levadura fresca", "kg", 3.50, "Refrigerado", "4C")
add("Polvo de hornear", "kg", 4.20, "Seco")
add("Bicarbonato sódico", "kg", 2.50, "Seco")
add("Arroz redondo (paella)", "kg", 1.15, "Seco")
add("Arroz basmati", "kg", 2.30, "Seco")
add("Arroz integral", "kg", 1.65, "Seco")
add("Arroz bomba", "kg", 3.80, "Seco")
add("Arroz para sushi", "kg", 2.90, "Seco")
add("Pasta espagueti", "kg", 1.25, "Seco")
add("Pasta macarrones", "kg", 1.20, "Seco")
add("Pasta penne rigate", "kg", 1.30, "Seco")
add("Pasta lasaña seca", "kg", 1.85, "Seco")
add("Fideos orientales (ramen)", "kg", 2.40, "Seco")
add("Cuscús fino", "kg", 2.10, "Seco")
add("Quinoa", "kg", 4.50, "Seco")
add("Lentejas pardinas", "kg", 1.80, "Seco")
add("Garbanzos secos", "kg", 2.00, "Seco")
add("Judías blancas", "kg", 2.20, "Seco")
add("Alubias rojas", "kg", 2.00, "Seco")
add("Soja texturizada", "kg", 3.20, "Seco")
add("Copos de avena", "kg", 1.50, "Seco")
add("Pan rallado", "kg", 2.80, "Seco")
add("Panko", "kg", 3.40, "Seco")
add("Almendras laminadas", "kg", 9.50, "Seco")
add("Nueces peladas", "kg", 11.00, "Seco")
add("Avellanas tostadas", "kg", 10.50, "Seco")
add("Piñones", "kg", 28.00, "Seco")
add("Pasas sultanas", "kg", 3.60, "Seco")
add("Dátiles sin hueso", "kg", 7.20, "Seco")
add("Cacao en polvo", "kg", 6.50, "Seco")
add("Chocolate cobertura negro 70%", "kg", 8.90, "Seco")
add("Chocolate cobertura con leche", "kg", 7.80, "Seco")
add("Gelatina en láminas", "kg", 22.00, "Seco")
add("Agar-agar", "kg", 35.00, "Seco")
add("Vainilla en pasta", "kg", 45.00, "Seco")
add("Canela molida", "kg", 12.00, "Especias")
add("Pimentón dulce", "kg", 8.50, "Especias")
add("Pimentón picante", "kg", 9.00, "Especias")
add("Comino molido", "kg", 7.20, "Especias")
add("Cúrcuma molida", "kg", 9.80, "Especias")
add("Pimienta negra molida", "kg", 14.00, "Especias")
add("Pimienta blanca molida", "kg", 16.00, "Especias")
add("Clavo molido", "kg", 18.00, "Especias")
add("Nuez moscada molida", "kg", 22.00, "Especias")
add("Jengibre en polvo", "kg", 11.00, "Especias")
add("Orégano seco", "kg", 10.00, "Especias")
add("Tomillo seco", "kg", 11.50, "Especias")
add("Romero seco", "kg", 9.00, "Especias")
add("Laurel en hojas", "kg", 8.00, "Especias")
add("Hierbas provenzales", "kg", 12.00, "Especias")
add("Azafrán en hebras", "g", 0.045, "Especias")  # precio por g alto
add("Semillas de sésamo", "kg", 4.20, "Seco")
add("Semillas de amapola", "kg", 5.50, "Seco")
add("Chía", "kg", 6.80, "Seco")
add("Lino molido", "kg", 3.90, "Seco")
add("Aceite de girasol 5 L", "L", 6.50, "Seco")
add("Aceite de semillas", "L", 3.80, "Seco")
add("Vinagre de vino blanco", "L", 1.20, "Seco")
add("Vinagre de vino tinto", "L", 1.25, "Seco")
add("Vinagre de Jerez", "L", 3.50, "Seco")
add("Vinagre balsámico", "L", 4.80, "Seco")
add("Salsa de soja", "L", 2.80, "Seco")
add("Salsa de pescado (nam pla)", "L", 5.20, "Seco")
add("Salsa Worcestershire", "L", 4.50, "Seco")
add("Salsa de ostras", "L", 6.00, "Seco")
add("Pasta de tomate concentrada", "kg", 2.90, "Seco")
add("Tomate triturado brik", "kg", 1.10, "Seco")
add("Passata de tomate", "L", 2.20, "Seco")
add("Kétchup", "kg", 2.50, "Seco")
add("Mostaza Dijon", "kg", 4.20, "Refrigerado", "4C")
add("Mostaza americana", "kg", 3.80, "Seco")
add("Mayonesa industrial", "kg", 3.20, "Refrigerado", "4C")
add("Mayonesa light", "kg", 3.00, "Refrigerado", "4C")
add("Tabasco", "L", 18.00, "Seco")
add("Sriracha", "kg", 5.50, "Seco")
add("Wasabi en pasta", "kg", 22.00, "Refrigerado", "4C")
add("Miso paste blanco", "kg", 8.00, "Refrigerado", "4C")
add("Tahini", "kg", 7.50, "Seco")
add("Crema de cacahuete", "kg", 4.80, "Seco")
add("Mermelada de fresa", "kg", 3.40, "Seco")
add("Mermelada de albaricoque", "kg", 3.50, "Seco")
add("Caldo de pollo deshidratado", "kg", 12.00, "Seco")
add("Caldo de verduras deshidratado", "kg", 11.00, "Seco")
add("Cubitos de caldo (ternera)", "kg", 9.50, "Seco")
add("Leche en polvo", "kg", 5.80, "Seco")
add("Nata en polvo", "kg", 8.00, "Seco")
add("Coco rallado", "kg", 4.20, "Seco")
add("Leche de coco en lata", "L", 2.80, "Seco")
add("Leche condensada", "kg", 3.60, "Seco")
add("Leche evaporada", "L", 2.40, "Seco")
add("Café en grano", "kg", 12.00, "Seco")
add("Café molido", "kg", 10.50, "Seco")
add("Té negro en bolsitas (caja 100)", "ud", 4.50, "Seco")
add("Cacao soluble", "kg", 7.00, "Seco")

# ——— Lácteos y huevos ———
add("Leche entera 1 L", "L", 0.95, "Refrigerado", "4C")
add("Leche semidesnatada 1 L", "L", 0.90, "Refrigerado", "4C")
add("Leche sin lactosa 1 L", "L", 1.10, "Refrigerado", "4C")
add("Nata para cocinar 35% 1 L", "L", 3.80, "Refrigerado", "4C")
add("Nata montar 1 L", "L", 4.20, "Refrigerado", "4C")
add("Mantequilla sin sal 250 g", "kg", 7.20, "Refrigerado", "4C")
add("Mantequilla con sal 250 g", "kg", 6.90, "Refrigerado", "4C")
add("Margarina cocina", "kg", 2.80, "Refrigerado", "4C")
add("Queso parmesano rallado", "kg", 12.50, "Refrigerado", "4C")
add("Queso mozzarella bloque", "kg", 6.80, "Refrigerado", "4C")
add("Queso cheddar curado", "kg", 9.20, "Refrigerado", "4C")
add("Queso emmental lonchas", "kg", 8.50, "Refrigerado", "4C")
add("Queso cabra rulo", "kg", 11.00, "Refrigerado", "4C")
add("Queso azul", "kg", 13.00, "Refrigerado", "4C")
add("Queso burrata", "kg", 14.50, "Refrigerado", "4C")
add("Yogur natural griego", "kg", 3.40, "Refrigerado", "4C")
add("Yogur natural", "kg", 2.20, "Refrigerado", "4C")
add("Crema de queso (Philadelphia)", "kg", 7.80, "Refrigerado", "4C")
add("Requesón", "kg", 4.50, "Refrigerado", "4C")
add("Ricotta", "kg", 5.20, "Refrigerado", "4C")
add("Huevos camperos (caja 12)", "ud", 0.35, "Refrigerado", "4C")
add("Huevos M (caja 30)", "ud", 0.22, "Refrigerado", "4C")
add("Claras pasteurizadas 1 L", "L", 4.50, "Refrigerado", "4C")

# ——— Frutas ———
add("Manzana Golden", "kg", 1.80, "Fresco", "8C")
add("Pera conferencia", "kg", 2.00, "Fresco", "8C")
add("Plátano canario", "kg", 1.50, "Fresco", "12C")
add("Naranja zumo", "kg", 0.95, "Fresco", "8C")
add("Limón", "kg", 1.40, "Fresco", "8C")
add("Lima", "kg", 2.80, "Fresco", "8C")
add("Uva negra sin semilla", "kg", 3.20, "Fresco", "8C")
add("Fresón", "kg", 4.50, "Fresco", "4C")
add("Arándanos", "kg", 8.00, "Fresco", "4C")
add("Frambuesas", "kg", 9.50, "Fresco", "4C")
add("Melocotón", "kg", 2.80, "Fresco", "8C")
add("Albaricoque", "kg", 3.20, "Fresco", "8C")
add("Kiwi", "kg", 3.50, "Fresco", "8C")
add("Mango", "kg", 4.20, "Fresco", "8C")
add("Piña entera", "kg", 2.10, "Fresco", "12C")
add("Aguacate Hass", "kg", 5.80, "Fresco", "8C")
add("Granada", "kg", 3.80, "Fresco", "8C")
add("Higo fresco", "kg", 5.50, "Fresco", "8C")

# ——— Verduras ———
add("Cebolla blanca", "kg", 0.85, "Fresco", "8C")
add("Cebolla morada", "kg", 1.10, "Fresco", "8C")
add("Chalota", "kg", 2.50, "Fresco", "8C")
add("Ajo", "kg", 3.20, "Fresco", "8C")
add("Puerro", "kg", 1.80, "Fresco", "8C")
add("Zanahoria", "kg", 0.90, "Fresco", "8C")
add("Patata nueva", "kg", 0.75, "Fresco", "8C")
add("Batata", "kg", 1.60, "Fresco", "8C")
add("Calabacín", "kg", 1.40, "Fresco", "8C")
add("Berenjena", "kg", 1.80, "Fresco", "8C")
add("Pimiento rojo", "kg", 2.20, "Fresco", "8C")
add("Pimiento verde", "kg", 1.90, "Fresco", "8C")
add("Tomate ramallet", "kg", 1.50, "Fresco", "8C")
add("Tomate cherry", "kg", 3.80, "Fresco", "8C")
add("Lechuga iceberg", "kg", 1.20, "Fresco", "4C")
add("Lechuga romana", "kg", 1.80, "Fresco", "4C")
add("Espinaca fresca", "kg", 2.50, "Fresco", "4C")
add("Rúcula", "kg", 3.20, "Fresco", "4C")
add("Brócoli", "kg", 2.00, "Fresco", "4C")
add("Coliflor", "kg", 1.90, "Fresco", "4C")
add("Col lombarda", "kg", 1.50, "Fresco", "4C")
add("Champiñón laminado", "kg", 3.50, "Fresco", "4C")
add("Setas shiitake", "kg", 8.50, "Fresco", "4C")
add("Apio", "kg", 1.60, "Fresco", "4C")
add("Pepino", "kg", 1.30, "Fresco", "8C")
add("Calabaza", "kg", 1.10, "Fresco", "8C")
add("Judía verde", "kg", 2.80, "Fresco", "4C")
add("Guisantes frescos", "kg", 4.20, "Fresco", "4C")
add("Maíz dulce (mazorca)", "kg", 2.00, "Fresco", "4C")
add("Jengibre fresco", "kg", 4.50, "Fresco", "8C")
add("Cilantro fresco", "kg", 8.00, "Fresco", "4C")
add("Perejil liso", "kg", 6.50, "Fresco", "4C")
add("Albahaca fresca", "kg", 12.00, "Fresco", "4C")
add("Eneldo fresco", "kg", 14.00, "Fresco", "4C")

# ——— Congelados ———
add("Guisantes congelados", "kg", 1.80, "Congelado", "-18C")
add("Espinacas congeladas", "kg", 2.00, "Congelado", "-18C")
add("Broccoli congelado", "kg", 2.20, "Congelado", "-18C")
add("Mezcla wok congelada", "kg", 2.50, "Congelado", "-18C")
add("Marisco surimi", "kg", 4.50, "Congelado", "-18C")
add("Pulpo cocido congelado", "kg", 12.00, "Congelado", "-18C")
add("Masa de hojaldre congelada", "kg", 3.80, "Congelado", "-18C")

# ——— Bebidas cocina ———
add("Vino blanco cocina", "L", 2.20, "Bebidas", "15C")
add("Vino tinto cocina", "L", 2.40, "Bebidas", "15C")
add("Coñac / brandy cocina", "L", 8.00, "Bebidas", "15C")
add("Cerveza rubia cocina", "L", 1.10, "Bebidas", "8C")

# Verificar conteo
assert len(ITEMS) >= 150, len(ITEMS)


def esc_sql(s: str) -> str:
    return s.replace("'", "''")


def main() -> None:
    lines = [
        "-- =============================================================================",
        "-- SEED DESPENSA EXTENDIDA — artículos de cocina para pruebas de recetas",
        f"-- Tenant demo: {TENANT}",
        "-- Prerequisitos: tenants + migration_articulos_elaborados_receta.sql (es_elaborado).",
        "-- Re-ejecutable: no duplica filas con el mismo SKU en ese tenant.",
        "-- SKUs DSP-001… distintos de ALM-* del seed_demo_tenant_prueba_abcd.sql",
        "-- =============================================================================",
        "",
        "INSERT INTO articulos (",
        "  id, tenant_id, nombre, sku, unidad_medida, stock_actual, stock_minimo,",
        "  coste_unitario, categoria_almacen, temperatura_almacen, stock_maximo, es_elaborado",
        ")",
        "SELECT",
        "  gen_random_uuid(),",
        f"  '{TENANT}'::uuid,",
        "  v.nombre,",
        "  v.sku,",
        "  v.um,",
        "  CASE",
        "    WHEN v.cat = 'Especias' THEN 6",
        "    WHEN v.cat = 'Fresco' THEN 30",
        "    WHEN v.cat = 'Refrigerado' THEN 24",
        "    WHEN v.cat = 'Congelado' THEN 18",
        "    ELSE 40",
        "  END,",
        "  CASE",
        "    WHEN v.cat = 'Especias' THEN 2",
        "    WHEN v.cat = 'Fresco' THEN 10",
        "    WHEN v.cat = 'Refrigerado' THEN 8",
        "    WHEN v.cat = 'Congelado' THEN 6",
        "    ELSE 12",
        "  END,",
        "  v.precio,",
        "  v.cat,",
        "  v.temp,",
        "  CASE",
        "    WHEN v.cat = 'Especias' THEN 20",
        "    WHEN v.cat = 'Fresco' THEN 80",
        "    WHEN v.cat = 'Refrigerado' THEN 60",
        "    WHEN v.cat = 'Congelado' THEN 45",
        "    ELSE 120",
        "  END,",
        "  false",
        "FROM (VALUES",
    ]

    value_rows = []
    for nombre, sku, um, precio, cat, temp in ITEMS:
        value_rows.append(
            f"  ('{esc_sql(nombre)}', '{sku}', '{um}', {precio:.2f}, '{cat}', '{temp}')"
        )

    lines.append(",\n".join(value_rows))
    lines.append(
        textwrap.dedent(f"""\
        ) AS v(nombre, sku, um, precio, cat, temp)
        WHERE NOT EXISTS (
          SELECT 1 FROM articulos a
          WHERE a.tenant_id = '{TENANT}'::uuid
            AND a.sku = v.sku
        );
        """)
    )

    out = "\n".join(lines) + "\n"
    root = __file__.rsplit("scripts", 1)[0]
    path = root + "sql/seed_despensa_articulos_prueba.sql"
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"Wrote {path} ({len(ITEMS)} items)")


if __name__ == "__main__":
    main()
