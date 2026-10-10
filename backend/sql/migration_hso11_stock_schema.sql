-- =============================================================================
-- HorecaSO — Auditoría HSO-11 (Fase 4), paso 1 de 2: esquema del stock por lotes
--
-- Modelo (opción A, decidida el 07/10/2026):
--   - lotes_inventario es la fuente de verdad (por outlet).
--   - articulos.stock_actual es una caché por tenant = SUM(lotes) de todos sus
--     outlets. Solo la escribe services/stock.py, en la misma transacción que
--     los lotes.
--
-- Este archivo solo añade columnas e índice; no cambia cantidades.
--   - lotes_inventario.origen: compra | ajuste | migracion (las filas existentes
--     quedan como 'compra': hasta hoy solo se creaban desde la pantalla FIFO).
--   - movimientos_stock.delta: variación con signo (+ entra, - sale). En los
--     ajustes `cantidad` pasa a ser |delta| (antes guardaba el recuento final).
--     Se rellena para entradas/salidas/mermas históricas; los ajustes
--     históricos quedan con delta NULL porque no se puede saber la diferencia.
--   - Índice para el consumo FIFO.
--
-- Orden: ESTE archivo -> migration_hso11_datos_lotes.sql -> deploy del backend.
-- Idempotente. Rollback al final del archivo.
-- =============================================================================

BEGIN;

ALTER TABLE public.lotes_inventario
  ADD COLUMN IF NOT EXISTS origen varchar(20) NOT NULL DEFAULT 'compra';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lotes_inventario_origen_valido'
      AND conrelid = 'public.lotes_inventario'::regclass
  ) THEN
    ALTER TABLE public.lotes_inventario
      ADD CONSTRAINT lotes_inventario_origen_valido
      CHECK (origen IN ('compra', 'ajuste', 'migracion'));
  END IF;
END $$;

ALTER TABLE public.movimientos_stock
  ADD COLUMN IF NOT EXISTS delta numeric(15,4);

UPDATE public.movimientos_stock
SET delta = CASE WHEN tipo = 'entrada' THEN cantidad ELSE -cantidad END
WHERE delta IS NULL
  AND tipo IN ('entrada', 'salida', 'merma');

CREATE INDEX IF NOT EXISTS idx_lotes_inventario_fifo
  ON public.lotes_inventario (articulo_id, outlet_id, fecha_caducidad, created_at)
  WHERE cantidad > 0;

COMMIT;


-- =============================================================================
-- VERIFICACIÓN (solo lectura)
-- =============================================================================
-- SELECT origen, count(*) FROM public.lotes_inventario GROUP BY origen;
-- SELECT tipo, count(*) AS total, count(delta) AS con_delta
-- FROM public.movimientos_stock GROUP BY tipo;

-- =============================================================================
-- ROLLBACK — revertir antes el backend a la versión anterior a HSO-11
-- (el código nuevo escribe origen y delta). Si ya se ejecutó
-- migration_hso11_datos_lotes.sql, revertir primero esa.
-- =============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_lotes_inventario_fifo;
-- ALTER TABLE public.movimientos_stock DROP COLUMN IF EXISTS delta;
-- ALTER TABLE public.lotes_inventario DROP CONSTRAINT IF EXISTS lotes_inventario_origen_valido;
-- ALTER TABLE public.lotes_inventario DROP COLUMN IF EXISTS origen;
-- COMMIT;
