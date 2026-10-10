-- =============================================================================
-- HSO-01 — Consultas de verificación (solo lectura). Ejecutar ANTES y DESPUÉS
-- de migration_hso01_rls_revoke_anon.sql en Supabase > SQL Editor.
-- =============================================================================

-- V0. Rol con el que conecta el backend (lanzar desde el backend o psql con
--     el mismo DATABASE_URL). Esperado: postgres | rolbypassrls = true
SELECT current_user, r.rolbypassrls
FROM pg_roles r WHERE r.rolname = current_user;

-- V1. Tablas sin RLS. Esperado DESPUÉS: 0 filas
SELECT c.relname
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity
ORDER BY 1;

-- V2. Cualquier privilegio de anon/authenticated sobre tablas. Esperado DESPUÉS: 0 filas
SELECT c.relname, rol,
       has_table_privilege(rol, c.oid, 'SELECT') AS sel,
       has_table_privilege(rol, c.oid, 'INSERT') AS ins,
       has_table_privilege(rol, c.oid, 'UPDATE') AS upd,
       has_table_privilege(rol, c.oid, 'DELETE') AS del
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN (VALUES ('anon'), ('authenticated')) v(rol)
WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m')
  AND (has_table_privilege(rol, c.oid, 'SELECT')
    OR has_table_privilege(rol, c.oid, 'INSERT')
    OR has_table_privilege(rol, c.oid, 'UPDATE')
    OR has_table_privilege(rol, c.oid, 'DELETE'))
ORDER BY 1, 2;

-- V3. Secuencias accesibles. Esperado DESPUÉS: 0 filas
SELECT c.relname, rol
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN (VALUES ('anon'), ('authenticated')) v(rol)
WHERE n.nspname = 'public' AND c.relkind = 'S'
  AND has_sequence_privilege(rol, c.oid, 'USAGE,SELECT,UPDATE');

-- V4. Funciones ejecutables por anon/authenticated. Esperado DESPUÉS: 0 filas
SELECT p.proname, rol
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (VALUES ('anon'), ('authenticated')) v(rol)
WHERE n.nspname = 'public' AND has_function_privilege(rol, p.oid, 'EXECUTE');

-- V5. Default privileges. Esperado DESPUÉS: ninguna fila de postgres con
--     "anon=" ni "authenticated=" en defaclacl (supabase_admin puede seguir
--     si el bloque opcional emitió NOTICE).
SELECT pg_get_userbyid(d.defaclrole) AS owner, d.defaclobjtype, d.defaclacl
FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace
WHERE n.nspname = 'public';

-- V6. Advisor de Supabase: Dashboard > Advisors > Security.
--     Esperado: sin "rls_disabled_in_public". Aparecerá "rls_enabled_no_policy"
--     (INFO) en cada tabla: es intencionado (sin acceso por la API pública).

-- V7. Prueba externa (desde tu PC, con la clave anon/publishable del proyecto):
--   curl "https://<ref>.supabase.co/rest/v1/usuarios?select=email&limit=1" ^
--        -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
--   ANTES: devuelve filas.  DESPUÉS: 401/403 "permission denied for table usuarios".
