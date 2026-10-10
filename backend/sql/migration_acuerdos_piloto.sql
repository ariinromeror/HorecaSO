-- Acuerdo comercial piloto (solo plataforma / superadmin)
-- Plantilla proveedor + borradores de acuerdos con clientes.

CREATE TABLE IF NOT EXISTS acuerdo_proveedor_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social VARCHAR(200) NOT NULL DEFAULT '',
  nif VARCHAR(20),
  email VARCHAR(200) NOT NULL DEFAULT '',
  direccion TEXT,
  soporte_canal VARCHAR(200),
  soporte_horario VARCHAR(200),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE acuerdo_proveedor_defaults IS
  'Plantilla única de datos del proveedor HorecaSO (NIF opcional hasta alta autónomo).';

CREATE TABLE IF NOT EXISTS acuerdos_piloto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_acuerdo DATE,
  periodo_desde DATE,
  periodo_hasta DATE,
  precio_tipo VARCHAR(20) NOT NULL DEFAULT 'gratuito'
    CHECK (precio_tipo IN ('gratuito', 'simbolico', 'otro')),
  precio_importe NUMERIC(12, 2) CHECK (precio_importe IS NULL OR precio_importe >= 0),
  precio_otro_texto VARCHAR(200),
  modulos JSONB NOT NULL DEFAULT '[]'::jsonb,
  modulos_otros VARCHAR(200),
  cliente_nombre_comercial VARCHAR(200) NOT NULL DEFAULT '',
  cliente_razon_social VARCHAR(200),
  cliente_nif VARCHAR(20),
  cliente_direccion TEXT,
  cliente_contacto VARCHAR(200),
  cliente_email VARCHAR(200),
  proveedor_razon_social VARCHAR(200) NOT NULL DEFAULT '',
  proveedor_nif VARCHAR(20),
  proveedor_email VARCHAR(200) NOT NULL DEFAULT '',
  proveedor_direccion TEXT,
  soporte_canal VARCHAR(200),
  soporte_horario VARCHAR(200),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acuerdos_piloto_created
  ON acuerdos_piloto (created_at DESC);

COMMENT ON TABLE acuerdos_piloto IS
  'Borradores de acuerdos de piloto SaaS generados por superadmin.';
