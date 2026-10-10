# Credenciales de prueba (desarrollo)

**Actualizado:** 27/03/2026 — Contraseñas alineadas con `backend/scripts/generate_test_hashes.py`. Los `password_hash` en Supabase se actualizaron con la misma pasada bcrypt que este archivo (login coherente con la BD de proyecto).

**No usar en producción.** Cámbialas antes de exponer el sistema.

**Tenant de prueba (seed Fase B):** Restaurante Prueba — `11111111-1111-1111-1111-111111111111` · Outlet Sala principal — `22222222-2222-2222-2222-222222222222`

---

## Plataforma (superadmin)

| Email | Contraseña | Hash en BD (referencia) |
|-------|-------------|-------------------------|
| superadmin@horecaso.com | <ver gestor de contraseñas> | <ver gestor de contraseñas> |

---

## Restaurante Prueba (@prueba.com)

| Email | Contraseña | Hash en BD (referencia) |
|-------|-------------|-------------------------|
| admin@prueba.com | <ver gestor de contraseñas> | <ver gestor de contraseñas> |
| director@prueba.com | <ver gestor de contraseñas> | <ver gestor de contraseñas> |
| jefesala@prueba.com | <ver gestor de contraseñas> | <ver gestor de contraseñas> |
| camarero@prueba.com | <ver gestor de contraseñas> | <ver gestor de contraseñas> |
| cocina@prueba.com | <ver gestor de contraseñas> | <ver gestor de contraseñas> |
| barra@prueba.com | <ver gestor de contraseñas> | <ver gestor de contraseñas> |

---

**Nota:** Si vuelves a ejecutar solo `generate_test_hashes.py`, los hashes serán **distintos** (bcrypt con salt nuevo). Para alinear BD y archivo, genera hashes y ejecuta `UPDATE usuarios SET password_hash = … WHERE email = …`, o vuelve a aplicar el bloque de seed tras vaciar usuarios de prueba.
