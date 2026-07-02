# Credenciales de prueba (desarrollo)

**Actualizado:** 02/07/2026 — Redactado por auditoría de seguridad (Fase 0 del `PRD.md`). Este archivo **ya no contiene contraseñas ni hashes reales**. Antes contenía credenciales en texto plano y hashes bcrypt correspondientes a usuarios realmente sembrados en la base de datos de Supabase — si esas contraseñas siguen activas en cualquier entorno (incluido el de pruebas), **rótalas** antes de continuar, ya que estuvieron expuestas en el repositorio.

**No usar nunca contraseñas reales en este archivo.** Este documento es solo una referencia de **qué usuarios existen** en el tenant de prueba, no de sus credenciales.

**Tenant de prueba (seed Fase B):** Restaurante Prueba — `11111111-1111-1111-1111-111111111111` · Outlet Sala principal — `22222222-2222-2222-2222-222222222222`

---

## Cómo generar credenciales de prueba localmente

1. Ejecuta `python backend/scripts/generate_test_hashes.py` — genera contraseñas y hashes bcrypt nuevos en cada ejecución (salt aleatorio).
2. Guarda el resultado en un archivo **no versionado** (ej. `TEST_CREDENTIALS.md` en la raíz del repo — ya está en `.gitignore`) o en un gestor de secretos local.
3. Actualiza `password_hash` en la tabla `usuarios` de tu base de datos de desarrollo/test con `UPDATE usuarios SET password_hash = $1 WHERE email = $2`, usando placeholders (nunca f-strings) como en el resto del proyecto.
4. Nunca reutilices esos hashes/contraseñas en producción ni los commitees en ningún archivo trackeado por git.

---

## Usuarios existentes en el tenant de prueba (solo emails/roles — sin contraseñas)

| Email | Rol |
|-------|-----|
| superadmin@horecaso.com | superadmin (plataforma) |
| admin@prueba.com | admin |
| director@prueba.com | director |
| jefesala@prueba.com | jefe_sala |
| camarero@prueba.com | camarero |
| cocina@prueba.com | cocina |
| barra@prueba.com | barra |

**Nota:** para volver a tener acceso a estos usuarios en un entorno local, genera hashes nuevos con el script del paso 1 y actualiza la base de datos de ese entorno. No hay contraseña "correcta" documentada aquí a propósito.
