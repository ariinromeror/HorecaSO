# PRD — Superadmin, tenants, gestión de usuarios y tenant de prueba (Fase B)

**Producto:** HorecaSO  
**Versión PRD:** 1.1 (alineado con auditoría de código)  
**Referencias:** [docs/archivo/AUDITORIA_RESULTADO.md](docs/archivo/AUDITORIA_RESULTADO.md) §3 · [STEP_HORECASO.md](STEP_HORECASO.md) Fase B · [PRD_HorecaSO.md](PRD_HorecaSO.md) schema · [.cursorrules](.cursorrules)

---

> **Estado a 24/03/2026: 0% implementado (Fase B)** — Ningún ítem de la checklist superadmin/auditoría/plataforma existe aún en el repositorio. Lo descrito en §2–§7 es **pendiente de implementación**.  
> Lo marcado como **YA IMPLEMENTADO** son piezas del **producto actual** que **no deben romperse** al extender el sistema.

---

## 1. Contexto y estado actual

### 1.1 Objetivo de Fase B

Dotar a HorecaSO de:

- Un rol **superadmin** (plataforma) separado del **admin** de tenant (restaurante).
- **Auditoría** mínima (plataforma y tenant).
- **Permisos** opcionales por usuario (más allá del rol único actual).
- **API y UI** para operaciones de plataforma y para que un **manager** del tenant gestione usuarios sin ser superadmin.
- Un **tenant de prueba** reproducible (`restauranteprueba`) vía SQL + utilidad de hashes.

### 1.2 Qué dice la auditoría (24/03/2026)

| Ítem | En repo |
|------|---------|
| `superadmin` en CHECK / código | ❌ |
| `platform_logs`, `tenant_audit_log`, `usuario_permisos` | ❌ |
| `/api/superadmin`, `/api/admin/usuarios` | ❌ |
| `frontend/src/pages/superadmin/`, `pages/admin/usuarios/` | ❌ |
| `backend/sql/seed_restauranteprueba.sql` | ❌ |
| UUID fijo `11111111-1111-1111-1111-111111111111` | ❌ |
| `generate_test_hashes.py` | ❌ |

### 1.3 YA IMPLEMENTADO — no tocar (base producto, fuera de Fase B)

- **Multi-tenant en datos:** tablas `tenants`, `outlets`, `usuarios` con `tenant_id` / `outlet_id` según [PRD_HorecaSO.md](PRD_HorecaSO.md) §4 — *no sustituir el modelo; solo ampliar constraints y tablas nuevas*.
- **Auth actual:** JWT (`auth/jwt_handler.py`, `auth/dependencies.py`), `get_current_user`, `require_roles([...])`, login en `routers/auth.py` — *extender para incluir `superadmin` en payload y validación, sin romper flujos existentes*.
- **Roles operativos:** `admin`, `director`, `jefe_sala`, `camarero`, `cocina`, `barra`, `almacen` — ver [.cursorrules](.cursorrules) y PRD; *mantener compatibilidad con datos y JWT actuales*.

---

## 2. Rol Superadmin (BD + permisos)

### 2.1 YA IMPLEMENTADO — no tocar

- Columna `usuarios.rol` como `VARCHAR(50)` con roles de negocio tenant.
- Patrón **siempre filtrar por `tenant_id`** en endpoints de datos de restaurante.

### 2.2 A implementar

1. **Ampliar dominio de `usuarios.rol`**  
   - Añadir valor **`superadmin`** al `CHECK` de PostgreSQL (o crearlo si no existe).  
   - Incluir en la lista documentada **`barra`** si el CHECK aún no la tiene (coherente con [backend/sql/migration_kds_barra_destino.sql](backend/sql/migration_kds_barra_destino.sql)).  
   - **Regla:** `superadmin` puede tener `tenant_id` **NULL** (recomendado) o un tenant “sistema” explícito — documentar la opción elegida en comentario SQL.

2. **Tabla `usuario_permisos` (opcional granular)**  
   - Objetivo: flags por usuario del tenant (p. ej. `puede_editar_carta`, `puede_ver_nominas`) sin multiplicar roles.  
   - Esquema sugerido (ajustar nombres si chocan con futuro PRD):

```sql
CREATE TABLE usuario_permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clave VARCHAR(80) NOT NULL,   -- ej. 'editar_carta', 'gestionar_usuarios'
    permitido BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (usuario_id, clave)
);
CREATE INDEX idx_usuario_permisos_tenant ON usuario_permisos(tenant_id);
```

3. **Tabla `platform_logs`**  
   - Eventos a nivel plataforma: quién (superadmin), qué acción, payload resumido (JSON texto), IP opcional, `created_at`.

4. **Tabla `tenant_audit_log`**  
   - Eventos por tenant: cambios relevantes (alta usuario, cambio plan, desactivación tenant), `actor_usuario_id`, `tenant_id`, `accion`, `detalle` (JSON o texto), `created_at`.

5. **Política de acceso**  
   - Solo **superadmin** puede listar/crear tenants, ver `platform_logs` global, impersonación (si se implementa más adelante).  
   - **admin** de tenant + permiso `gestionar_usuarios` (o rol único admin) puede usar `/api/admin/usuarios` **solo dentro de su `tenant_id`**.

---

## 3. Panel Superadmin Frontend (rutas + pantallas)

### 3.1 YA IMPLEMENTADO — no tocar

- `App.jsx`, guards por rol, `Sidebar` / `navConfig` — *añadir rutas y entradas condicionales sin eliminar las actuales*.

### 3.2 A implementar

- **Ruta base sugerida:** `/superadmin` (solo si `role === 'superadmin'`).  
- **Pantallas mínimas v1:**  
  - Listado de **tenants** (nombre, NIF, plan, activo, fecha).  
  - Detalle tenant: outlets asociados, conteo usuarios, acciones seguras (activar/desactivar tenant — con confirmación).  
  - Listado **platform_logs** (paginado, filtros por fecha).  
- **UX:** Tailwind 4, `dark:`, mobile first, modales `bg-black/60`, iconos lucide `strokeWidth={1.5}` — [.cursorrules](.cursorrules).

---

## 4. Gestión de usuarios por manager (nueva página + permisos simplificados)

### 4.1 YA IMPLEMENTADO — no tocar

- CRUD implícito vía admin actual si existe en otro flujo — *la auditoría no encontró página dedicada `/admin/usuarios`; no asumir comportamiento no localizado*.

### 4.2 A implementar

- **Ruta:** `/admin/usuarios` (roles: `admin` del tenant o quien tenga permiso `gestionar_usuarios` en `usuario_permisos`).  
- **Funciones:** listar usuarios del **mismo `tenant_id`**, crear invitación/alta (email, nombre, rol operativo, `outlet_id` opcional), desactivar, resetear PIN si aplica.  
- **Prohibido:** ver o editar usuarios de otro tenant; exponer `password_hash`.  
- **Backend:** validar siempre `tenant_id` del JWT contra el recurso.

---

## 5. Tenant restauranteprueba (script SQL completo ejecutable)

### 5.1 YA IMPLEMENTADO — no tocar

- Tenant demo documentado en STEP (`00000000-0000-0000-0000-000000000001`) — *el seed de Fase B usa un UUID **diferente** para no chocar con datos locales existentes*.

### 5.2 A implementar — archivo `backend/sql/seed_restauranteprueba.sql`

**Objetivo:** crear tenant **Restaurante Prueba**, un outlet, usuario admin de tenant y usuario superadmin de prueba (opcional), usando UUID fijos para reproducibilidad.

- **Tenant id:** `11111111-1111-1111-1111-111111111111`  
- **Outlet id:** `22222222-2222-2222-2222-222222222222` (ejemplo; documentar en cabecera del script)  
- **Usuarios:** al menos `admin@restauranteprueba.test` (rol `admin`, `tenant_id` = tenant anterior) y opcional `superadmin@horecaso.test` (rol `superadmin`, `tenant_id` NULL).  
- **Passwords:** usar **placeholders** `__HASH_ADMIN__` y `__HASH_SUPERADMIN__` en el SQL y documentar que se reemplazan con salida de `scripts/generate_test_hashes.py` (ver §7 / Prompt 7), **o** usar `crypt()` de pgcrypto si se acuerda usar extensión (preferir hashes generados con el mismo stack que producción: bcrypt/passlib).

Ejemplo de estructura del script (el implementador debe completar hashes reales y comprobar FKs):

```sql
-- seed_restauranteprueba.sql — ejecutar manualmente en Supabase tras migraciones Fase B
-- Requiere: usuarios.rol admite 'superadmin'; columnas según PRD_HorecaSO

BEGIN;

INSERT INTO tenants (id, nombre, nif, plan, activo)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Restaurante Prueba',
  'B00000000',
  'profesional',
  TRUE
) ON CONFLICT (id) DO NOTHING;

INSERT INTO outlets (id, tenant_id, nombre, num_mesas, capacidad_total)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Sala principal',
  8,
  32
) ON CONFLICT (id) DO NOTHING;

-- Sustituir __HASH_ADMIN__ por hash bcrypt real (mismo algoritmo que backend)
INSERT INTO usuarios (id, tenant_id, outlet_id, nombre, email, password_hash, rol, activo)
VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Admin Prueba',
  'admin@restauranteprueba.test',
  '__HASH_ADMIN__',
  'admin',
  TRUE
) ON CONFLICT (email) DO NOTHING;

COMMIT;
```

*(Añadir en el archivo real el bloque superadmin y cualquier dato mínimo legal para pruebas E2E.)*

---

## 6. Backend — nuevos routers y endpoints

### 6.1 YA IMPLEMENTADO — no tocar

- Prefijos `/api/...`, `include_router` en `main.py`, patrón `try/except` + `logger.error`, `get_db()`, `require_roles` — [.cursorrules](.cursorrules).

### 6.2 A implementar

**Paquete sugerido:** `backend/routers/superadmin/` (o `superadmin.py` si se prefiere plano al inicio).

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/superadmin/tenants` | superadmin | Lista tenants (paginación) |
| GET | `/api/superadmin/tenants/{id}` | superadmin | Detalle + outlets |
| PATCH | `/api/superadmin/tenants/{id}` | superadmin | Plan, activo, límites acordados |
| GET | `/api/superadmin/platform-logs` | superadmin | Logs plataforma |
| POST | `/api/superadmin/platform-logs` | interno/superadmin | *(opcional)* registro desde otros servicios |

**Paquete:** `backend/routers/admin_usuarios/` o bajo `routers/empleados` si se prefiere consistencia — **nuevo prefijo dedicado** recomendado:

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/api/admin/usuarios` | admin (+ permiso si aplica) | Lista usuarios del tenant del JWT |
| POST | `/api/admin/usuarios` | admin | Alta usuario mismo tenant |
| PATCH | `/api/admin/usuarios/{id}` | admin | Actualizar rol, outlet, activo |
| PATCH | `/api/admin/usuarios/{id}/permisos` | admin | CRUD simplificado en `usuario_permisos` |

- **Login:** extender `POST /api/auth/login` (o endpoint dedicado) para emitir JWT con `role: superadmin` cuando corresponda.  
- **JWT payload:** incluir `tenant_id` nullable para superadmin.  
- **Registradores:** en mutaciones sensibles, escribir en `tenant_audit_log` / `platform_logs` según proceda.

---

## 7. Frontend — nuevas páginas

### 7.1 YA IMPLEMENTADO — no tocar

- `frontend/src/services/api.js` — *añadir funciones nuevas; no romper firmas existentes*.  
- `AuthContext` — *extender estado si hace falta flag superadmin*.

### 7.2 A implementar

| Ruta React | Carpeta | Componentes |
|------------|---------|-------------|
| `/superadmin`, `/superadmin/tenants`, … | `frontend/src/pages/superadmin/` | `SuperadminLayout.jsx`, `TenantsListPage.jsx`, `TenantDetailPage.jsx`, `PlatformLogsPage.jsx` |
| `/admin/usuarios` | `frontend/src/pages/admin/usuarios/` | `UsuariosPage.jsx`, tabla, modales alta/edición |

- Registro en `App.jsx` con **guard** de rol.  
- Entrada en `navConfig.js` solo para roles autorizados.

---

## 8. Hoja de ruta hacia deploy seguro (fases A→F)

| Fase | Contenido | Salida |
|------|-----------|--------|
| **A** | Migraciones SQL: CHECK `rol`, tablas `platform_logs`, `tenant_audit_log`, `usuario_permisos` | SQL aplicado en Supabase (staging) |
| **B** | Seed `seed_restauranteprueba.sql` + `generate_test_hashes.py` | Datos reproducibles |
| **C** | Auth + JWT superadmin + routers backend + logs en mutaciones | `python -c "from main import create_app; create_app()"` OK |
| **D** | Páginas React + `api.js` | `npm run build` OK |
| **E** | Revisión seguridad (§9), rate limit rutas sensibles, sin fugas cross-tenant | Checklist cerrada |
| **F** | Deploy: variables entorno, CORS, smoke test staging | Listo para producción restringida |

---

## 9. Checklist de seguridad

- [ ] Ningún endpoint superadmin sin `require_roles(['superadmin'])`.  
- [ ] Ningún endpoint `/api/admin/usuarios` sin filtro estricto `tenant_id` del JWT.  
- [ ] Nunca devolver `password_hash` ni tokens ajenos.  
- [ ] SQL solo con placeholders `$1, $2` — [.cursorrules](.cursorrules).  
- [ ] Superadmin: considerar rate limiting más estricto (SlowAPI ya en proyecto).  
- [ ] Logs: no guardar secretos ni payloads completos con PII innecesaria.  
- [ ] Revisar CORS y orígenes al exponer nuevas rutas.  
- [ ] Documentar en STEP/BUGS cualquier cambio de contrato auth.

---

## 10. Tabla resumen prioridades

| Prioridad | Bloque | Entregable |
|-----------|--------|------------|
| P0 | §2 DDL + §5 seed | SQL migración + `seed_restauranteprueba.sql` |
| P1 | §6 auth + login JWT | `superadmin` en login y claims |
| P2 | §6 routers superadmin | Lista tenants + logs |
| P3 | §6 routers admin usuarios | CRUD usuarios tenant |
| P4 | §3 + §7 UI superadmin | Rutas y pantallas mínimas |
| P5 | §4 + §7 UI admin usuarios | Gestión usuarios manager |
| P6 | §8 F + §9 | Hardening y deploy |

---

## 11. Prompts Cursor para implementar (uno por bloque)

Cada prompt: seguir **FastAPI + asyncpg + Decimal + require_roles + try/except + logger** y **React 19 + Tailwind 4 + lucide + mobile first + dark** — [.cursorrules](.cursorrules). No introducir ORM ni stack alternativo.

---

### Prompt 1 — SQL base Fase B (Secciones 2 y 5)

```
Lee PRD_SUPERADMIN_TENANTS_PRUEBAS.md secciones 2 (apartado «A implementar»), 5 y 9.

Crea backend/sql/migration_superadmin_fase_b.sql con:
- ALTER TABLE usuarios para CHECK de rol incluyendo superadmin y barra (si falta).
- CREATE TABLE platform_logs, tenant_audit_log, usuario_permisos con índices y FKs alineados al PRD_HorecaSO.

Crea backend/sql/seed_restauranteprueba.sql con UUIDs fijos 11111111-… y 22222222-… según la sección 5; usa placeholders __HASH_ADMIN__ para password_hash y comenta cómo reemplazarlos.

No modifiques código Python todavía. Verificación: revisar sintaxis SQL en editor y que no haya conflictos de nombres con tablas existentes del PRD_HorecaSO.
```

---

### Prompt 2 — Script hashes (Sección 5 y pie de datos)

```
Lee PRD_SUPERADMIN_TENANTS_PRUEBAS.md sección 5 y el stack de auth en backend (passlib/bcrypt como en main.py).

Crea scripts/generate_test_hashes.py en la raíz del repo (o backend/scripts/) que lea contraseñas por argumento o variables de entorno y imprima hashes bcrypt compatibles con el login actual.

Documenta en docstring cómo pegar el hash en seed_restauranteprueba.sql.

Verificación: python scripts/generate_test_hashes.py --help (o ejecución de ejemplo) y comprobar que el hash verifica con passlib en un one-liner Python.
```

---

### Prompt 3 — Auth y JWT superadmin (Sección 2 y 6)

```
Lee PRD_SUPERADMIN_TENANTS_PRUEBAS.md secciones 2 y 6, .cursorrules (auth), y backend/routers/auth.py + auth/jwt_handler.py.

Extiende el login para que usuarios con rol superadmin reciban JWT con role superadmin y tenant_id null o coherente con el diseño del PRD. Mantén compatibilidad total con usuarios tenant existentes.

Añade require_superadmin o amplía require_roles para incluir superadmin donde proceda sin debilitar endpoints actuales.

Verificación: cd backend && python -c "from main import create_app; create_app()"
```

---

### Prompt 4 — Router /api/superadmin (Sección 6)

```
Lee PRD_SUPERADMIN_TENANTS_PRUEBAS.md sección 6 y ARQUITECTURA_HORECASO.md (patrón de prefijos).

Crea backend/routers/superadmin/ con router montado en main.py bajo prefijo acordado (p. ej. /api/superadmin). Implementa GET tenants list y GET tenant por id con paginación y filtro tenant_id obligatorio en datos de negocio no globales.

Usa get_db(), require_roles(['superadmin']), Decimal si hay importes, y registro en platform_logs en operaciones PATCH sensibles.

Verificación: cd backend && python -c "from main import create_app; create_app()"
```

---

### Prompt 5 — Router /api/admin/usuarios (Secciones 4 y 6)

```
Lee PRD_SUPERADMIN_TENANTS_PRUEBAS.md secciones 4 y 6.

Crea backend/routers/admin_usuarios/ (o nombre alineado al repo) con GET/POST/PATCH para usuarios del mismo tenant_id que el JWT. Prohibe listar otros tenants. No devolver password_hash.

Opcional: integrar usuario_permisos en PATCH permisos.

Verificación: cd backend && python -c "from main import create_app; create_app()"
```

---

### Prompt 6 — Frontend superadmin (Secciones 3 y 7)

```
Lee PRD_SUPERADMIN_TENANTS_PRUEBAS.md secciones 3 y 7, y frontend/src/App.jsx + components/layout/constants/navConfig.js.

Crea frontend/src/pages/superadmin/ con layout mínimo: lista de tenants y enlace a detalle. Añade rutas protegidas solo para role superadmin. Añade funciones en frontend/src/services/api.js.

Cumple Tailwind dark:, modales bg-black/60, lucide strokeWidth 1.5.

Verificación: cd frontend && npm run build
```

---

### Prompt 7 — Frontend admin usuarios (Secciones 4 y 7)

```
Lee PRD_SUPERADMIN_TENANTS_PRUEBAS.md secciones 4 y 7.

Crea frontend/src/pages/admin/usuarios/UsuariosPage.jsx (y componentes hijos si hace falta) con tabla de usuarios del tenant, modal alta/edición, llamadas a /api/admin/usuarios.

Registra la ruta en App.jsx y navConfig para rol admin (tenant).

Verificación: cd frontend && npm run build
```

---

*Fin del PRD Fase B — mantener sincronizado con STEP y con futuras auditorías.*
