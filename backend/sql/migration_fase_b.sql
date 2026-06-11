-- ============================================================
-- MIGRATION FASE B — Superadmin, tablas plataforma, tenant prueba
-- INSTRUCCIONES ANTES DE EJECUTAR:
-- 1. Ejecutar: python backend/scripts/generate_test_hashes.py
-- 2. Copiar cada hash generado y reemplazar los PLACEHOLDER_HASH
--    y REEMPLAZAR_CON_HASH_DE_generate_test_hashes.py
-- 3. Ejecutar este archivo completo en Supabase → SQL Editor
-- 4. Verificar: SELECT rol FROM usuarios WHERE email = 'superadmin@horecaso.com';
-- ============================================================

-- -----------------------------------------------------------------
-- 0. tenants.activo — PRD / seed usan esta columna; BDs antiguas pueden no tenerla
--     (evita: column "activo" of relation "tenants" does not exist)
-- -----------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- -----------------------------------------------------------------
-- 1–2. usuarios: tenant_id nullable + CHECK rol completo (idempotente)
-- -----------------------------------------------------------------
ALTER TABLE usuarios
  ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_rol_check CHECK (
    rol IN (
      'superadmin',
      'admin',
      'director',
      'jefe_sala',
      'camarero',
      'cocina',
      'barra',
      'almacen'
    )
  );

-- -----------------------------------------------------------------
-- 3. platform_logs
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel TEXT NOT NULL CHECK (nivel IN ('info', 'warning', 'error', 'critical')),
  tenant_id UUID REFERENCES tenants (id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios (id) ON DELETE SET NULL,
  modulo TEXT NOT NULL,
  accion TEXT NOT NULL,
  detalle JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_logs_tenant_created_at
  ON platform_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_logs_nivel_created_at
  ON platform_logs (nivel, created_at DESC);

-- -----------------------------------------------------------------
-- 4. tenant_audit_log
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios (id) ON DELETE SET NULL,
  tabla TEXT NOT NULL,
  operacion TEXT NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
  registro_id UUID,
  datos_antes JSONB,
  datos_despues JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_tenant_created_at
  ON tenant_audit_log (tenant_id, created_at DESC);

-- -----------------------------------------------------------------
-- 5. usuario_permisos
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  clave VARCHAR(80) NOT NULL,
  permitido BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (usuario_id, clave)
);

CREATE INDEX IF NOT EXISTS idx_usuario_permisos_tenant
  ON usuario_permisos (tenant_id);

-- -----------------------------------------------------------------
-- 6. Superadmin plataforma (solo si no existe)
-- -----------------------------------------------------------------
INSERT INTO usuarios (
  id,
  tenant_id,
  outlet_id,
  nombre,
  email,
  password_hash,
  rol,
  activo
)
SELECT
  gen_random_uuid(),
  NULL,
  NULL,
  'Superadmin HorecaSO',
  'superadmin@horecaso.com',
  'REEMPLAZAR_CON_HASH_DE_generate_test_hashes.py',
  'superadmin',
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM usuarios
  WHERE email = 'superadmin@horecaso.com'
);

-- -----------------------------------------------------------------
-- 7. Tenant restauranteprueba + 6 usuarios @prueba.com + 15 mesas
--    UUIDs fijos; ON CONFLICT DO NOTHING
-- -----------------------------------------------------------------
DO $$
DECLARE
  v_tenant UUID := '11111111-1111-1111-1111-111111111111';
  v_outlet UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  INSERT INTO tenants (
    id,
    nombre,
    nif,
    direccion,
    telefono,
    email,
    logo_url,
    plan,
    activo
  )
  VALUES (
    v_tenant,
    'Restaurante Prueba',
    'B00000999',
    'Calle Demo 1, Madrid',
    '910000000',
    'info@restauranteprueba.test',
    NULL,
    'profesional',
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  -- Columnas reales en outlets (sin direccion/telefono/capacidad_total en esquema actual)
  INSERT INTO outlets (
    id,
    tenant_id,
    nombre,
    num_mesas
  )
  VALUES (
    v_outlet,
    v_tenant,
    'Sala principal',
    15
  )
  ON CONFLICT (id) DO NOTHING;

  -- 6 usuarios @prueba.com (roles variados para pruebas)
  INSERT INTO usuarios (
    id,
    tenant_id,
    outlet_id,
    nombre,
    email,
    password_hash,
    rol,
    activo
  )
  VALUES
    (
      '44000000-0000-4000-8000-000000000001',
      v_tenant,
      v_outlet,
      'Admin Prueba',
      'admin@prueba.com',
      'PLACEHOLDER_HASH',
      'admin',
      TRUE
    ),
    (
      '44000000-0000-4000-8000-000000000002',
      v_tenant,
      v_outlet,
      'Director Prueba',
      'director@prueba.com',
      'PLACEHOLDER_HASH',
      'director',
      TRUE
    ),
    (
      '44000000-0000-4000-8000-000000000003',
      v_tenant,
      v_outlet,
      'Jefe Sala Prueba',
      'jefesala@prueba.com',
      'PLACEHOLDER_HASH',
      'jefe_sala',
      TRUE
    ),
    (
      '44000000-0000-4000-8000-000000000004',
      v_tenant,
      v_outlet,
      'Camarero Prueba',
      'camarero@prueba.com',
      'PLACEHOLDER_HASH',
      'camarero',
      TRUE
    ),
    (
      '44000000-0000-4000-8000-000000000005',
      v_tenant,
      v_outlet,
      'Cocina Prueba',
      'cocina@prueba.com',
      'PLACEHOLDER_HASH',
      'cocina',
      TRUE
    ),
    (
      '44000000-0000-4000-8000-000000000006',
      v_tenant,
      v_outlet,
      'Barra Prueba',
      'barra@prueba.com',
      'PLACEHOLDER_HASH',
      'barra',
      TRUE
    )
  ON CONFLICT (email) DO NOTHING;

  -- 15 mesas: 5 terraza (cap 2–4), 6 interior (cap 2–8), 4 privado (cap 2–10)
  -- Sin columna forma en mesas (esquema actual)
  INSERT INTO mesas (
    id,
    outlet_id,
    numero,
    capacidad,
    estado,
    zona
  )
  VALUES
    ('33000000-0000-4000-8000-000000000001', v_outlet, 1, 2, 'libre', 'terraza'),
    ('33000000-0000-4000-8000-000000000002', v_outlet, 2, 2, 'libre', 'terraza'),
    ('33000000-0000-4000-8000-000000000003', v_outlet, 3, 3, 'libre', 'terraza'),
    ('33000000-0000-4000-8000-000000000004', v_outlet, 4, 3, 'libre', 'terraza'),
    ('33000000-0000-4000-8000-000000000005', v_outlet, 5, 4, 'libre', 'terraza'),
    ('33000000-0000-4000-8000-000000000006', v_outlet, 6, 2, 'libre', 'interior'),
    ('33000000-0000-4000-8000-000000000007', v_outlet, 7, 4, 'libre', 'interior'),
    ('33000000-0000-4000-8000-000000000008', v_outlet, 8, 4, 'libre', 'interior'),
    ('33000000-0000-4000-8000-000000000009', v_outlet, 9, 6, 'libre', 'interior'),
    ('33000000-0000-4000-8000-00000000000a', v_outlet, 10, 6, 'libre', 'interior'),
    ('33000000-0000-4000-8000-00000000000b', v_outlet, 11, 8, 'libre', 'interior'),
    ('33000000-0000-4000-8000-00000000000c', v_outlet, 12, 4, 'libre', 'privado'),
    ('33000000-0000-4000-8000-00000000000d', v_outlet, 13, 6, 'libre', 'privado'),
    ('33000000-0000-4000-8000-00000000000e', v_outlet, 14, 8, 'libre', 'privado'),
    ('33000000-0000-4000-8000-00000000000f', v_outlet, 15, 10, 'libre', 'privado')
  ON CONFLICT (id) DO NOTHING;
END $$;
