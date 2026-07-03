-- Calibración merma (regla de tres): cantidad comprada vs cantidad útil tras limpieza.
-- Coste efectivo en recetas = coste_unitario * (comprado / util).
-- Ejecutar en Supabase (SQL Editor) tras desplegar backend.

ALTER TABLE articulos
  ADD COLUMN IF NOT EXISTS calibracion_comprado NUMERIC(15, 4),
  ADD COLUMN IF NOT EXISTS calibracion_util NUMERIC(15, 4);

COMMENT ON COLUMN articulos.calibracion_comprado IS
  'Cantidad en la compra/manipulación inicial (misma unidad lógica que el coste en factura).';
COMMENT ON COLUMN articulos.calibracion_util IS
  'Cantidad útil que queda para usar en cocina tras limpiar/pelar.';
