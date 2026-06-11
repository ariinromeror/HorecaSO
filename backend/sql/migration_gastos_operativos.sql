-- Gastos fijos mensuales por tenant (alquiler, internet, seguros, etc.)
-- Ejecutar en Supabase SQL editor si aún no existe la tabla.

CREATE TABLE IF NOT EXISTS gastos_operativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  concepto VARCHAR(200) NOT NULL,
  categoria VARCHAR(40) NOT NULL DEFAULT 'otros',
  importe_mensual NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (importe_mensual >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gastos_operativos_tenant ON gastos_operativos(tenant_id);

COMMENT ON TABLE gastos_operativos IS 'Gastos fijos mensuales declarados por el restaurante (no sustituye contabilidad).';
