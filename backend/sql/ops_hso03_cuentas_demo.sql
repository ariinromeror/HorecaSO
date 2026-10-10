-- =============================================================================
-- HSO-03 — Desactivar cuentas demo y rotar contraseña de superadmin
-- =============================================================================
-- Contexto: las contraseñas de estas cuentas están publicadas en GitHub
-- (commit abd5574 en origin/main: backend/scripts/generate_test_hashes.py,
-- docs/CREDENCIALES_PRUEBA.MD, docs/STEP_HORECASO.md, .cursorrules, ...).
-- Borrarlas del repo no las "des-publica": hay que asumir que son conocidas.
--
-- Login (backend/routers/auth.py) filtra "u.activo = true" antes de verificar
-- la contraseña, así que activo = false basta para impedir nuevos logins.
-- Los JWT ya emitidos siguen valiendo hasta que caduquen (HSO-06); para
-- cortarlos ya, rotar SECRET_KEY_AUTH en Render (cierra TODAS las sesiones).
--
-- Ejecutar en: Supabase > SQL Editor, por pasos. No forma parte del deploy.
-- =============================================================================


-- PASO 1 — Vista previa (solo lectura): qué cuentas existen y su estado
SELECT u.email, u.rol, u.activo, t.nombre AS tenant
FROM usuarios u
LEFT JOIN tenants t ON t.id = u.tenant_id
WHERE u.email IN ('admin@test.com', 'admin@prueba.com', 'superadmin@horecaso.com')
   OR u.email LIKE '%@prueba.com'
ORDER BY u.rol, u.email;


-- PASO 2 — Desactivar las dos cuentas demo de administrador
BEGIN;
UPDATE usuarios
SET activo = false
WHERE email IN ('admin@test.com', 'admin@prueba.com')
  AND rol <> 'superadmin'
RETURNING email, rol, activo;
-- Si RETURNING muestra exactamente esas cuentas: COMMIT; si no: ROLLBACK;
COMMIT;


-- PASO 2b (OPCIONAL) — Resto de cuentas @prueba.com con contraseña publicada
-- (director, jefesala, camarero, cocina, barra). Descomentar si no se usan
-- para demos en producción.
-- UPDATE usuarios
-- SET activo = false
-- WHERE email IN ('director@prueba.com', 'jefesala@prueba.com',
--                 'camarero@prueba.com', 'cocina@prueba.com', 'barra@prueba.com')
-- RETURNING email, rol, activo;


-- PASO 3 — Rotar contraseña de superadmin
--   a) En tu PC:  cd backend ; python scripts/hash_password.py
--      (pide la contraseña sin eco, mínimo 14 caracteres; imprime el hash $2b$...)
--   b) Guarda la contraseña en un gestor de contraseñas.
--   c) Sustituye <HASH_BCRYPT> por el hash impreso y ejecuta:
BEGIN;
UPDATE usuarios
SET password_hash = '<HASH_BCRYPT>'
WHERE email = 'superadmin@horecaso.com'
  AND rol = 'superadmin'
  AND '<HASH_BCRYPT>' LIKE '$2b$12$%'
RETURNING email, rol, activo, left(password_hash, 7) AS hash_prefijo;
-- Debe devolver 1 fila. Si devuelve 0 (placeholder sin sustituir): ROLLBACK;
COMMIT;


-- PASO 4 — Verificación (solo lectura)
SELECT email, rol, activo, left(password_hash, 7) AS hash_prefijo
FROM usuarios
WHERE email IN ('admin@test.com', 'admin@prueba.com', 'superadmin@horecaso.com');
-- Esperado: admin@test.com y admin@prueba.com con activo = false;
--           superadmin@horecaso.com con activo = true.
-- Prueba funcional: POST /api/auth/login con la contraseña antigua -> 401;
--                   con la nueva contraseña -> 200.


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- Reactivar cuentas demo (vuelven a ser accesibles con la contraseña publicada):
--   UPDATE usuarios SET activo = true
--   WHERE email IN ('admin@test.com', 'admin@prueba.com');
-- Superadmin: no hay vuelta atrás al hash antiguo (y no se debe volver: está
-- publicado). Si pierdes la nueva contraseña, repite el PASO 3 con otra.
