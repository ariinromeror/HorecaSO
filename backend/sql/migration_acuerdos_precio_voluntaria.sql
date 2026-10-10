-- Ampliar precio_tipo: aportacion_voluntaria (piloto gratuito + aportación opcional)

ALTER TABLE acuerdos_piloto
  DROP CONSTRAINT IF EXISTS acuerdos_piloto_precio_tipo_check;

ALTER TABLE acuerdos_piloto
  ALTER COLUMN precio_tipo TYPE VARCHAR(40);

ALTER TABLE acuerdos_piloto
  ADD CONSTRAINT acuerdos_piloto_precio_tipo_check
  CHECK (precio_tipo IN ('gratuito', 'simbolico', 'otro', 'aportacion_voluntaria'));
