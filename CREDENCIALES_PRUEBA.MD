# Credenciales de prueba (desarrollo)

**Actualizado:** 27/03/2026 — Contraseñas alineadas con `backend/scripts/generate_test_hashes.py`. Los `password_hash` en Supabase se actualizaron con la misma pasada bcrypt que este archivo (login coherente con la BD de proyecto).

**No usar en producción.** Cámbialas antes de exponer el sistema.

**Tenant de prueba (seed Fase B):** Restaurante Prueba — `11111111-1111-1111-1111-111111111111` · Outlet Sala principal — `22222222-2222-2222-2222-222222222222`

---

## Plataforma (superadmin)

| Email | Contraseña | Hash en BD (referencia) |
|-------|-------------|-------------------------|
| superadmin@horecaso.com | SuperAdmin2024! | $2b$12$A.B.OrrorO87.4DJYXwE8eQA7RAlSW/BZ/m44eN6AIl9aWLfDe2ZG |

---

## Restaurante Prueba (@prueba.com)

| Email | Contraseña | Hash en BD (referencia) |
|-------|-------------|-------------------------|
| admin@prueba.com | Admin1234! | $2b$12$ih8PncMrzwXmzrB4DEM5/uH6a2Vajo.uJ18Mx9IxxuBuipgpABKdK |
| director@prueba.com | Director1234! | $2b$12$BnFZ8CtWMgBf/taGx8eaZOHduU6hcjyH8g024fNp3QUcN6VrNuyEa |
| jefesala@prueba.com | JefeSala1234! | $2b$12$3cFyXRDGL59p319s.FYwEu5QnDQ/A.qh46ZDXLv1vSxTN/AWZR7la |
| camarero@prueba.com | Camarero1234! | $2b$12$9lzy0rOfkCaa8CwOEXTTse63jLHvtm0h/Jj3qKB3DmzWMwuo2wAWS |
| cocina@prueba.com | Cocina1234! | $2b$12$dUD4eJEY2E6YjQQHuT7xVOXZsAQSxg2RRslMqA.m7GjAym2b0OCRO |
| barra@prueba.com | Barra1234! | $2b$12$54sI/cXkEy7CnrmvIHvSX.BElXr5AdfuLO.vBW.RpVvBrVfnrhUcC |

---

**Nota:** Si vuelves a ejecutar solo `generate_test_hashes.py`, los hashes serán **distintos** (bcrypt con salt nuevo). Para alinear BD y archivo, genera hashes y ejecuta `UPDATE usuarios SET password_hash = … WHERE email = …`, o vuelve a aplicar el bloque de seed tras vaciar usuarios de prueba.
