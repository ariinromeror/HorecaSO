-- Piloto SaaS: campos fiscales + feature flags en tenants
-- Ejecutar en Supabase (HorecaSO)

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS razon_social TEXT,
  ADD COLUMN IF NOT EXISTS codigo_postal TEXT,
  ADD COLUMN IF NOT EXISTS ciudad TEXT,
  ADD COLUMN IF NOT EXISTS provincia TEXT,
  ADD COLUMN IF NOT EXISTS serie_facturacion TEXT DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS modulos JSONB DEFAULT '{}'::jsonb;

-- Defaults básicos para filas existentes (módulos piloto cafetería)
UPDATE tenants
SET modulos = COALESCE(modulos, '{}'::jsonb) || jsonb_build_object(
  'sala', true,
  'tpv', true,
  'kds', true,
  'carta', true,
  'inventario', true,
  'reservas', true,
  'reportes', true,
  'fifo', false,
  'nominas', false,
  'ia_facturas', false,
  'predicciones', false,
  'empleados', true,
  'proveedores', true,
  'clientes', true,
  'appcc', true
)
WHERE modulos IS NULL OR modulos = '{}'::jsonb;

UPDATE tenants
SET razon_social = COALESCE(razon_social, nombre)
WHERE razon_social IS NULL;
