-- Ejecutar en Supabase (SQL editor) antes de usar KDS cocina/barra separados.
-- Añade destino KDS en productos, columnas barra en líneas y amplía rol usuario.

-- Productos: cocina | barra | ninguno
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS destino_kds VARCHAR(20) NOT NULL DEFAULT 'cocina';

-- Opcional (una vez): repartir destinos según receta/bebida
-- UPDATE productos SET destino_kds = CASE
--   WHEN tiene_receta IS TRUE THEN 'cocina'
--   WHEN es_bebida IS TRUE THEN 'barra'
--   ELSE 'ninguno'
-- END;

-- Líneas: espejo barra (mismos estados que cocina: pendiente, preparando, listo, servido)
ALTER TABLE ticket_lineas
  ADD COLUMN IF NOT EXISTS enviado_barra BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ticket_lineas
  ADD COLUMN IF NOT EXISTS enviado_barra_at TIMESTAMPTZ;
ALTER TABLE ticket_lineas
  ADD COLUMN IF NOT EXISTS estado_barra VARCHAR(20) DEFAULT 'pendiente';

-- Si usuarios.rol tiene CHECK, sustituir por uno que incluya barra:
-- ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
-- ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
--   CHECK (rol IN ('director','jefe_sala','camarero','cocina','barra','almacen','admin'));
