-- Modelo A (escalable): elaboración = artículo es_elaborado + receta con articulo_salida_id.
-- La receta de plato sigue con producto_id; la de elaboración tiene producto_id NULL.
-- Ejecutar en Supabase tras desplegar backend.

ALTER TABLE articulos ADD COLUMN IF NOT EXISTS es_elaborado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE recetas ADD COLUMN IF NOT EXISTS articulo_salida_id UUID REFERENCES articulos(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_recetas_articulo_salida_id
  ON recetas(articulo_salida_id) WHERE articulo_salida_id IS NOT NULL;

ALTER TABLE recetas ALTER COLUMN producto_id DROP NOT NULL;

ALTER TABLE recetas DROP CONSTRAINT IF EXISTS recetas_plato_o_elaboracion;
ALTER TABLE recetas ADD CONSTRAINT recetas_plato_o_elaboracion CHECK (
  (producto_id IS NOT NULL AND articulo_salida_id IS NULL) OR
  (producto_id IS NULL AND articulo_salida_id IS NOT NULL)
);

COMMENT ON COLUMN articulos.es_elaborado IS 'TRUE si el coste proviene de una receta de elaboración (articulo_salida en recetas).';
COMMENT ON COLUMN recetas.articulo_salida_id IS 'Artículo de almacén que esta receta define (cebolla caramelizada, salsas, etc.).';
