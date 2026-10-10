-- =============================================================================
-- HSO-01 — Cerrar el acceso de la API pública de Supabase (PostgREST) a public
-- =============================================================================
-- Qué hace:
--   1. ENABLE ROW LEVEL SECURITY en todas las tablas de public (sin políticas:
--      anon/authenticated no ven ni modifican ninguna fila).
--   2. REVOKE ALL a anon y authenticated sobre tablas, secuencias y funciones
--      de public.
--   3. ALTER DEFAULT PRIVILEGES para que los objetos futuros no hereden esos
--      permisos.
--
-- Por qué no rompe el backend:
--   - El backend (asyncpg) conecta como "postgres.<project_ref>" vía Supavisor,
--     que es el rol postgres (rolbypassrls = true) y además owner de todas las
--     tablas. RLS sin FORCE no aplica al owner.
--   - Ningún código del repo usa supabase-js ni /rest/v1.
--   - service_role no se toca.
--
-- Idempotente: se puede ejecutar varias veces sin efecto adicional.
-- Ejecutar en: Supabase > SQL Editor (como postgres). NO forma parte del deploy.
-- Rollback: ver bloque comentado al final del archivo.
-- =============================================================================

BEGIN;

-- 1. RLS en todas las tablas (normales y particionadas) de public
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    RAISE NOTICE 'RLS activado: public.%', r.relname;
  END LOOP;
END $$;

-- 2. Quitar permisos existentes a los roles de la API pública
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
-- EXECUTE de funciones se concede a PUBLIC por defecto; anon lo heredaría.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- 3. Objetos futuros creados por postgres (dashboard, SQL Editor, MCP)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Objetos futuros creados por supabase_admin (extensiones, etc.).
-- postgres puede no tener permiso para alterarlos: se avisa y se continúa.
DO $$
BEGIN
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Sin permiso para ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin (no bloqueante)';
END $$;

COMMIT;

-- Que PostgREST recargue su caché de esquema
NOTIFY pgrst, 'reload schema';


-- =============================================================================
-- ROLLBACK (solo emergencia: vuelve a EXPONER los datos a la clave anon)
-- =============================================================================
-- Estado previo verificado el 06/10/2026:
--   - 41 tablas sin RLS; 4 con RLS ya activado antes de esta migración:
--     gastos_operativos, platform_logs, tenant_audit_log, usuario_permisos
--     (NO desactivar esas 4 en el rollback).
--   - anon/authenticated con ALL sobre tablas (arwdDxtm), secuencias (rwU) y
--     EXECUTE en funciones; mismos default privileges para postgres y
--     supabase_admin.
--
-- BEGIN;
-- DO $$
-- DECLARE r record;
-- BEGIN
--   FOR r IN
--     SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--     WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relrowsecurity
--       AND c.relname NOT IN ('gastos_operativos','platform_logs','tenant_audit_log','usuario_permisos')
--   LOOP
--     EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.relname);
--   END LOOP;
-- END $$;
-- GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
-- GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
-- COMMIT;
-- NOTIFY pgrst, 'reload schema';
