-- =============================================================================
-- HorecaSO — Auditoría HSO-11 (Fase 4), paso 2 de 2: alinear lotes con stock_actual
--
-- Requisito: migration_hso11_stock_schema.sql ya ejecutada.
--
-- Hasta HSO-11 las entradas, salidas, mermas y recuentos de la pantalla de
-- Inventario solo cambiaban articulos.stock_actual, y la pantalla FIFO movía
-- los lotes. Este script deja SUM(lotes) = stock_actual en cada artículo,
-- tomando stock_actual como referencia (es la cifra que se ha usado a diario).
-- Decisión (07/10/2026): la verdad final es el recuento físico. Después de esta
-- migración y del deploy, hacer el recuento desde Inventario > Inventario
-- físico: cada diferencia quedará registrada como ajuste por el servicio nuevo.
--
-- Qué hace, por artículo (los lotes se suman en todos los outlets del tenant):
--   1. Lotes con cantidad < 0 -> 0.
--   2. stock_actual < 0 o NULL -> objetivo 0.
--   3. Faltan lotes (stock_actual > suma): crea un lote 'MIG-HSO11'
--      (origen 'migracion', sin caducidad, al coste_unitario del artículo) en el
--      outlet principal del tenant (el más antiguo).
--   4. Sobran lotes (suma > stock_actual): consume la diferencia en orden FIFO
--      (caducidad más próxima primero, luego el más antiguo).
--   5. stock_actual negativo o NULL -> 0.
--   6. Cada creación/consumo deja un movimiento 'ajuste' con motivo
--      'migracion_hso11' y delta con signo.
--   7. Añade CHECK (cantidad >= 0) en lotes y CHECK (stock_actual >= 0) en
--      artículos.
--
-- Copia previa en public.ops_hso11_stock_backup y public.ops_hso11_lotes_backup
-- (solo la primera vez). Idempotente: una segunda ejecución no cambia nada.
-- Avisa con NOTICE de los tenants con varios outlets (la diferencia se imputa
-- al principal: revisar) y de artículos cuyo tenant no tiene outlet.
--
-- Ejecutar en Supabase > SQL Editor, con el backend de HSO-11 listo para
-- desplegar justo después. Antes, lanzar el DIAGNÓSTICO del final.
-- Rollback al final del archivo.
-- =============================================================================

BEGIN;

-- PASO 1 — Copias de seguridad (solo la primera vez por fila)
CREATE TABLE IF NOT EXISTS public.ops_hso11_stock_backup (
  articulo_id            uuid PRIMARY KEY,
  stock_actual_anterior  numeric(15,4),
  copiado_at             timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ops_hso11_lotes_backup (
  lote_id            uuid PRIMARY KEY,
  cantidad_anterior  numeric(15,4) NOT NULL,
  copiado_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_hso11_stock_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_hso11_lotes_backup ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.ops_hso11_stock_backup, public.ops_hso11_lotes_backup FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.ops_hso11_stock_backup, public.ops_hso11_lotes_backup FROM authenticated;
  END IF;
END $$;

INSERT INTO public.ops_hso11_stock_backup (articulo_id, stock_actual_anterior)
SELECT id, stock_actual FROM public.articulos
ON CONFLICT (articulo_id) DO NOTHING;

INSERT INTO public.ops_hso11_lotes_backup (lote_id, cantidad_anterior)
SELECT id, cantidad FROM public.lotes_inventario
WHERE origen <> 'migracion'
ON CONFLICT (lote_id) DO NOTHING;

-- PASO 2 — Lotes negativos a 0
UPDATE public.lotes_inventario SET cantidad = 0 WHERE cantidad < 0;

-- PASO 3 — Diferencias por artículo
CREATE TEMP TABLE _hso11_dif ON COMMIT DROP AS
SELECT a.id                                                AS articulo_id,
       a.tenant_id,
       GREATEST(COALESCE(a.stock_actual, 0), 0)            AS objetivo,
       COALESCE(l.suma, 0)                                 AS suma_lotes,
       GREATEST(COALESCE(a.stock_actual, 0), 0) - COALESCE(l.suma, 0) AS diferencia,
       COALESCE(a.coste_unitario, 0)                       AS coste,
       (SELECT o.id FROM public.outlets o
         WHERE o.tenant_id = a.tenant_id
         ORDER BY o.created_at, o.id LIMIT 1)              AS outlet_principal
FROM public.articulos a
LEFT JOIN (
  SELECT articulo_id, SUM(cantidad) AS suma
  FROM public.lotes_inventario
  WHERE cantidad > 0
  GROUP BY articulo_id
) l ON l.articulo_id = a.id;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT t.nombre, count(*) AS articulos
    FROM _hso11_dif d JOIN public.tenants t ON t.id = d.tenant_id
    WHERE d.diferencia <> 0
      AND (SELECT count(*) FROM public.outlets o WHERE o.tenant_id = d.tenant_id) > 1
    GROUP BY t.nombre
  LOOP
    RAISE NOTICE 'HSO-11: tenant "%" tiene varios outlets; % artículos ajustados en el outlet principal. Revisar con un recuento por local.',
      r.nombre, r.articulos;
  END LOOP;
  FOR r IN
    SELECT count(*) AS articulos FROM _hso11_dif
    WHERE diferencia > 0 AND outlet_principal IS NULL
    HAVING count(*) > 0
  LOOP
    RAISE NOTICE 'HSO-11: % artículos con stock pero sin outlet en su tenant; no se les crea lote (ver DIAGNÓSTICO).',
      r.articulos;
  END LOOP;
END $$;

-- PASO 4 — Movimientos de auditoría
INSERT INTO public.movimientos_stock (
  articulo_id, outlet_id, tipo, cantidad, delta, coste_unitario, motivo
)
SELECT articulo_id, outlet_principal, 'ajuste', ABS(diferencia), diferencia, coste, 'migracion_hso11'
FROM _hso11_dif
WHERE diferencia < 0
   OR (diferencia > 0 AND outlet_principal IS NOT NULL);

-- PASO 5 — Faltan lotes: lote de apertura
INSERT INTO public.lotes_inventario (
  articulo_id, outlet_id, cantidad, coste_unitario, numero_lote, origen
)
SELECT articulo_id, outlet_principal, diferencia, coste, 'MIG-HSO11', 'migracion'
FROM _hso11_dif
WHERE diferencia > 0 AND outlet_principal IS NOT NULL;

-- PASO 6 — Sobran lotes: consumo FIFO de la diferencia
WITH ordenados AS (
  SELECT l.id, l.articulo_id, l.cantidad,
         SUM(l.cantidad) OVER (
           PARTITION BY l.articulo_id
           ORDER BY l.fecha_caducidad ASC NULLS LAST, l.created_at ASC, l.id
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
         ) - l.cantidad AS consumido_antes
  FROM public.lotes_inventario l
  JOIN _hso11_dif d ON d.articulo_id = l.articulo_id AND d.diferencia < 0
  WHERE l.cantidad > 0
),
consumo AS (
  SELECT o.id,
         LEAST(o.cantidad, GREATEST(0, -d.diferencia - o.consumido_antes)) AS tomar
  FROM ordenados o
  JOIN _hso11_dif d ON d.articulo_id = o.articulo_id
)
UPDATE public.lotes_inventario l
SET cantidad = l.cantidad - c.tomar
FROM consumo c
WHERE c.id = l.id AND c.tomar > 0;

-- PASO 7 — stock_actual negativo o NULL a 0
UPDATE public.articulos SET stock_actual = 0
WHERE stock_actual IS NULL OR stock_actual < 0;

-- PASO 8 — Restricciones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lotes_inventario_cantidad_no_negativa'
      AND conrelid = 'public.lotes_inventario'::regclass
  ) THEN
    ALTER TABLE public.lotes_inventario
      ADD CONSTRAINT lotes_inventario_cantidad_no_negativa CHECK (cantidad >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'articulos_stock_actual_no_negativo'
      AND conrelid = 'public.articulos'::regclass
  ) THEN
    ALTER TABLE public.articulos
      ADD CONSTRAINT articulos_stock_actual_no_negativo CHECK (stock_actual >= 0);
  END IF;
END $$;

COMMIT;


-- =============================================================================
-- VERIFICACIÓN (solo lectura) — debe dar 0 filas, salvo artículos de tenants
-- sin outlet (avisados por NOTICE)
-- =============================================================================
-- SELECT a.tenant_id, a.nombre, a.stock_actual, COALESCE(SUM(l.cantidad), 0) AS suma_lotes
-- FROM public.articulos a
-- LEFT JOIN public.lotes_inventario l ON l.articulo_id = a.id
-- GROUP BY a.id
-- HAVING COALESCE(a.stock_actual, 0) <> COALESCE(SUM(l.cantidad), 0);
--
-- Lo que ha hecho la migración:
-- SELECT a.nombre, m.delta, m.coste_unitario, m.created_at
-- FROM public.movimientos_stock m JOIN public.articulos a ON a.id = m.articulo_id
-- WHERE m.motivo = 'migracion_hso11' ORDER BY ABS(m.delta * m.coste_unitario) DESC;
--
-- A partir de aquí, el control periódico es:
--   cd backend && python scripts/reconciliar_stock.py

-- =============================================================================
-- DIAGNÓSTICO (solo lectura) — lanzar ANTES de ejecutar
-- =============================================================================
-- Descuadre por artículo (positivo = faltan lotes; negativo = sobran lotes):
-- SELECT t.nombre AS tenant, a.nombre AS articulo, a.stock_actual,
--        COALESCE(SUM(l.cantidad) FILTER (WHERE l.cantidad > 0), 0) AS suma_lotes,
--        COALESCE(a.stock_actual, 0)
--          - COALESCE(SUM(l.cantidad) FILTER (WHERE l.cantidad > 0), 0) AS diferencia,
--        COUNT(l.id) FILTER (WHERE l.cantidad < 0) AS lotes_negativos
-- FROM public.articulos a
-- JOIN public.tenants t ON t.id = a.tenant_id
-- LEFT JOIN public.lotes_inventario l ON l.articulo_id = a.id
-- GROUP BY t.nombre, a.id
-- HAVING COALESCE(a.stock_actual, 0)
--          <> COALESCE(SUM(l.cantidad) FILTER (WHERE l.cantidad > 0), 0)
--     OR COUNT(l.id) FILTER (WHERE l.cantidad < 0) > 0
-- ORDER BY t.nombre, ABS(COALESCE(a.stock_actual, 0)
--          - COALESCE(SUM(l.cantidad) FILTER (WHERE l.cantidad > 0), 0)) DESC;
--
-- Artículos con stock en tenants sin outlet (no se les puede crear lote):
-- SELECT a.tenant_id, a.nombre, a.stock_actual FROM public.articulos a
-- WHERE COALESCE(a.stock_actual, 0) > 0
--   AND NOT EXISTS (SELECT 1 FROM public.outlets o WHERE o.tenant_id = a.tenant_id);

-- =============================================================================
-- ROLLBACK — solo es exacto ANTES de que el backend nuevo registre movimientos:
-- después, los lotes ya consumidos o creados se perderían. Revertir antes el
-- backend a la versión anterior a HSO-11.
-- =============================================================================
-- BEGIN;
-- ALTER TABLE public.articulos DROP CONSTRAINT IF EXISTS articulos_stock_actual_no_negativo;
-- ALTER TABLE public.lotes_inventario DROP CONSTRAINT IF EXISTS lotes_inventario_cantidad_no_negativa;
-- DELETE FROM public.movimientos_stock WHERE motivo = 'migracion_hso11';
-- DELETE FROM public.lotes_inventario WHERE origen = 'migracion' AND numero_lote = 'MIG-HSO11';
-- UPDATE public.lotes_inventario l SET cantidad = b.cantidad_anterior
-- FROM public.ops_hso11_lotes_backup b WHERE b.lote_id = l.id;
-- UPDATE public.articulos a SET stock_actual = b.stock_actual_anterior
-- FROM public.ops_hso11_stock_backup b WHERE b.articulo_id = a.id;
-- DROP TABLE public.ops_hso11_lotes_backup;
-- DROP TABLE public.ops_hso11_stock_backup;
-- COMMIT;
--
-- Cuando el recuento físico esté hecho y validado, las copias se pueden borrar:
-- DROP TABLE IF EXISTS public.ops_hso11_lotes_backup;
-- DROP TABLE IF EXISTS public.ops_hso11_stock_backup;
