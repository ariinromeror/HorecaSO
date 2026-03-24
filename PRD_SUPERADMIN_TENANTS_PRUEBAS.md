# PRD — Fase B: Superadmin, gestión de usuarios y tenant de prueba

**Estado:** borrador / no iniciado (marzo 2026)

Este documento recoge los requisitos de producto para la **Fase B** descrita en [STEP_HORECASO.md](STEP_HORECASO.md) (sección *FASE B — Superadmin, Gestión Usuarios, Tenant Prueba*).

## Alcance previsto

- Rol **superadmin** y comprobaciones en base de datos acordes al modelo multi-tenant.
- Tablas de auditoría y trazabilidad a nivel plataforma / tenant (`platform_logs`, `tenant_audit_log`, `usuario_permisos` u equivalentes definidos aquí).
- API: `/api/superadmin`, `/api/admin/usuarios` (gestión de usuarios por tenant).
- Frontend: `pages/superadmin/`, `pages/admin/usuarios/`.
- Datos de prueba: tenant *restauranteprueba*, script SQL de seed y utilidades (p. ej. `generate_test_hashes.py`) según se especifique en iteraciones posteriores.

## Nota

El código actual **no implementa** aún estos ítems; la auditoría del 24/03/2026 lo confirma. Ampliar este PRD antes de implementar.
