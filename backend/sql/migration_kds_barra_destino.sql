-- =============================================================================
-- KDS cocina / barra — ejecutar en Supabase (SQL editor) si falta el esquema.
-- Corrige errores del tipo: column p.destino_kds does not exist
-- =============================================================================

-- -----------------------------------------------------------------------------
-- productos.destino_kds
-- -----------------------------------------------------------------------------
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS destino_kds VARCHAR(10) DEFAULT 'cocina';

-- Valores permitidos: cocina | barra | ninguno
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_destino_kds_check;
ALTER TABLE productos ADD CONSTRAINT productos_destino_kds_check
  CHECK (destino_kds IN ('cocina', 'barra', 'ninguno'));

-- Si la columna ya existía como VARCHAR(20) u otro tipo, alinear longitud
ALTER TABLE productos
  ALTER COLUMN destino_kds TYPE VARCHAR(10);

ALTER TABLE productos
  ALTER COLUMN destino_kds SET DEFAULT 'cocina';

-- Opcional: repartir destinos según receta/bebida
-- UPDATE productos SET destino_kds = CASE
--   WHEN tiene_receta IS TRUE THEN 'cocina'
--   WHEN es_bebida IS TRUE THEN 'barra'
--   ELSE 'ninguno'
-- END;

-- -----------------------------------------------------------------------------
-- ticket_lineas — espejo barra (mismos estados que cocina: pendiente, etc.)
-- -----------------------------------------------------------------------------
ALTER TABLE ticket_lineas
  ADD COLUMN IF NOT EXISTS enviado_barra BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE ticket_lineas
  ADD COLUMN IF NOT EXISTS enviado_barra_at TIMESTAMPTZ;

ALTER TABLE ticket_lineas
  ADD COLUMN IF NOT EXISTS estado_barra VARCHAR(20) NOT NULL DEFAULT 'pendiente';

-- -----------------------------------------------------------------------------
-- Si usuarios.rol tiene CHECK antiguo, ampliar para incluir barra (ajustar lista a tu esquema):
-- -----------------------------------------------------------------------------
-- ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
-- ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
--   CHECK (rol IN ('director','jefe_sala','camarero','cocina','barra','almacen','admin'));
