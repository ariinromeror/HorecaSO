# PRD.md — Plan de Hardening Senior para HorecaSO

> **Nota de alcance:** este documento es distinto de [`docs/PRD_HorecaSO.md`](docs/PRD_HorecaSO.md) (que es el PRD de **producto/negocio**). Este `PRD.md` es el PRD **técnico de hardening y escalabilidad** — seguridad, testing, CI/CD, infraestructura y calidad de ingeniería — derivado de una auditoría arquitectónica completa del repositorio realizada el 2026-07-02.

## Cómo usar este documento

- Es la **fuente única de verdad** del roadmap de hardening técnico.
- Está dividido en **fases numeradas (0-13), secuenciales e independientes**. Cada fase se ejecuta bajo petición explícita (ej. "ejecuta la fase 2") y solo debe empezar si sus **Dependencias** están en estado `COMPLETADA`.
- Cada fase tiene: Objetivo, Por qué, Alcance, Fuera de alcance, Criterios de aceptación, Dependencias y Estado.
- Al completar una fase: marcar su casilla de **Estado** en este archivo (`PENDIENTE` → `EN PROGRESO` → `COMPLETADA`), añadir una entrada en `docs/BITACORA_HORECASO.md` (fecha, qué se hizo, archivos tocados, resultado), y documentar en `docs/BUGS_Y_SOLUCIONES.md` cualquier bug reproducible encontrado en el camino.
- No mezclar trabajo de una fase con otra: si durante una fase se detecta algo fuera de su alcance, se anota como nota al pie de esa fase para una fase futura, no se ejecuta inline.

## Leyenda de estado

- `[ ] PENDIENTE` — no iniciada.
- `[~] EN PROGRESO` — iniciada, no cerrada.
- `[x] COMPLETADA` — criterios de aceptación verificados.
- `[b] BLOQUEADA` — requiere una decisión o input externo antes de poder detallarse/ejecutarse.

---

## Fase 0 — Línea base y housekeeping

**Objetivo:** dejar el repositorio en un estado limpio y verificado antes de empezar a tocar seguridad o infraestructura.

**Por qué:** hay artefactos operativos (`backend/sql/_mcp_*.json`, `_shell_out*.json`, `_b64_*.txt`, `_args1*.json`) mezclados con migraciones SQL reales, y un archivo de credenciales de prueba (`docs/CREDENCIALES_PRUEBA.MD`) versionado con contraseñas y hashes bcrypt reales. Empezar por aquí evita arrastrar ruido y riesgo a las fases siguientes.

**Alcance:**
- [x] Verificar que el backend arranca localmente (`pip install -r backend/requirements.txt` en venv, `python -c "from main import create_app"`). → OK, 144 rutas registradas.
- [x] Verificar que el frontend instala y compila (`npm install`, `npm run build` en `frontend/`). → OK (warning de bundle >500KB esperado, se resuelve en Fase 8).
- [x] Mover artefactos MCP/shell de `backend/sql/` (`_mcp_*.json`, `_shell_out*.json`, `_b64_*.txt`, `_args1*`, `_q1*`, `_decoded_args*`, `list_tables_mcp_*.json`) a `backend/sql/_artifacts/` y añadir esa carpeta a `.gitignore`.
- [x] Redactar/mitigar `docs/CREDENCIALES_PRUEBA.MD`: sustituir contraseñas reales por placeholders o mover el contenido sensible fuera del repo (ej. a un gestor de secretos / variable de entorno documentada), dejando solo instrucciones de cómo generar credenciales de prueba localmente (`backend/scripts/generate_test_hashes.py` ya existe para esto).
- [x] Confirmar (grep) que ningún `.env` real, `DATABASE_URL`, o clave viva está commiteada en el historial reciente. → Solo placeholders encontrados.
- [x] Actualizar `.gitignore` si hace falta (carpeta `_artifacts/`, cualquier `*.local`). → Añadido `backend/sql/_artifacts/`.

**Fuera de alcance:** cualquier cambio de código de negocio, reorganización completa de `backend/sql/` en `migrations/`/`seeds/` (eso es Fase 5).

**Criterios de aceptación:**
- `python -c "from main import create_app"` (dentro de `backend/`) no lanza excepción.
- `npm run build` en `frontend/` termina con exit code 0.
- `git status` muestra `backend/sql/` sin archivos `_mcp_*`/`_shell_out*`/`_b64_*` sueltos en el nivel raíz de esa carpeta.
- `docs/CREDENCIALES_PRUEBA.MD` ya no contiene contraseñas en texto plano reutilizables.
- `git grep` de patrones tipo `sk_live`, `DATABASE_URL=postgres`, `SECRET_KEY_AUTH=` sobre el árbol trackeado no devuelve coincidencias con valores reales.

**Dependencias:** ninguna.

**Estado:** `[x] COMPLETADA`

---

## Fase 1 — Seguridad crítica (P0)

**Objetivo:** cerrar los agujeros de seguridad multi-tenant y de autenticación identificados en la auditoría, antes de añadir más superficie de código.

**Por qué:** se detectaron endpoints IDOR (lectura cross-tenant por UUID), rate limiting configurado pero no aplicado (`Limiter`/`SlowAPIMiddleware` en `backend/main.py` sin un solo `@limiter.limit(...)` en el código), y endpoints protegidos solo con `get_current_user` sin `require_roles` en módulos sensibles (Verifactu, TPV, dashboard). En un ERP SaaS multi-tenant esto es riesgo de fuga de datos entre clientes, no un bug cosmético.

**Alcance:**
- [x] ~~Dependencia central `get_tenant_scope()`~~ → **decisión tomada:** no se introdujo un dependency único nuevo que sustituya los ~15 helpers `_get_user_tenant*`/`_require_*_in_user_scope` ya existentes por paquete (`mesas_shared.py`, `tpv_shared.py`, `clientes_shared.py`, etc.), para evitar un refactor masivo de 70+ archivos sin red de tests (la Fase 2 aún no existía al ejecutar esta fase). En su lugar se **reutilizaron los helpers correctos ya existentes** en cada paquete allí donde faltaba aplicarlos. La consolidación en un dependency único queda anotada como mejora de bajo riesgo para después de la Fase 2 (con tests de regresión ya en marcha).
- [x] Auditados (con dos subagentes de exploración en paralelo, uno para IDOR y otro para RBAC) los ~120 endpoints de `backend/routers/`. Corregidos los **5 endpoints IDOR** confirmados:
  - `GET /api/mesas/{mesa_id}` (`mesas_list.py`) → ahora usa `_require_mesa_in_user_scope`.
  - `GET /api/tpv/tickets/{ticket_id}` (`tpv_tickets_detalle.py`) → ahora usa `_require_ticket_tpv_access`.
  - `POST /api/tpv/tickets/{ticket_id}/cobrar` (`tpv_cobrar.py`) → ahora usa `_require_ticket_tpv_access`; además el `tenant_id` usado para el registro Verifactu pasa a ser el del **ticket** (vía `outlet_tenant_id`), no el del usuario autenticado, cerrando una inconsistencia fiscal cruzada.
  - `POST /api/tpv/tickets/{ticket_id}/lineas` y `DELETE .../lineas/{linea_id}` (`tpv_lineas.py`) → ambos usan `_require_ticket_tpv_access`.
- [x] Aplicado `@limiter.limit(...)` de SlowAPI (extraído a `backend/rate_limit.py` para evitar import circular con `main.py`): `POST /api/auth/login` → `5/minute` por IP; `POST /api/admin/usuarios` → `20/minute`; `PATCH /api/superadmin/tenants/{id}/activo` → `20/minute`; `POST /api/tpv/tickets/{id}/cobrar` → `60/minute` (límite deliberadamente generoso para no bloquear varios TPV de un mismo local compartiendo IP/NAT en hora punta). Verificado manualmente con `curl` (6º intento de login consecutivo devuelve `429`).
- [x] Unificada autorización — endpoints que solo exigían `get_current_user` pasados a `require_roles([...])`: **Verifactu** (4/4 endpoints → `["admin","director"]`), **Dashboard** (2/2 → `["admin","director"]`), **TPV** (`create_ticket`, `list_tickets_abiertos`, `get_ticket`, `add_linea`, `delete_linea`, `cobrar_ticket` → roles operativos TPV coherentes con `tpv_pagos.py`), **Mesas** (`get_mesa`, `create_mesa`, `update_mesa_estado`). Además, fuera de la lista inicial pero detectado en la auditoría: `GET /api/turnos` (`fichajes.py`) permitía a roles operativos (`cocina`/`barra`/`almacen`) consultar el historial de fichaje de **cualquier** empleado del tenant vía `empleado_id` — restringido a `["admin","director","jefe_sala"]` (`ROLES_JEFE`); el frontend ya maneja el 403 con degradación elegante (`turnosForbidden`).
- [x] Verificado manualmente con JWTs de prueba generados con `jose` (sin necesitar login real ni datos seed): rol `cocina` contra `/api/dashboard/director` y `/api/verifactu/registros` → `403`; rol `admin` contra los mismos → pasa el check de rol (falla más adelante por falta de esquema en la DB de prueba local, lo cual confirma que el 403 anterior era por rol y no por otra causa); sin header de auth → `403`.
- [x] JWT en frontend (`localStorage`, `frontend/src/context/AuthContext.jsx`): **decisión — no migrar en esta fase.** Migrar a cookie `httpOnly` + `SameSite=Strict` implica cambios cruzados (backend debe emitir/leer cookies, CORS con credenciales en todos los orígenes de Vercel, protección CSRF nueva, logout con invalidación server-side) que no encajan en el alcance quirúrgico de esta fase. Queda documentado como riesgo aceptado (XSS podría robar el token) y recomendado como mejora futura de mayor envergadura.
- [x] `GET /api/tpv/carta` y `GET /api/tpv/carta/productos` (`carta.py`) revisados: ya filtran correctamente por `tenant_id` (sin IDOR) y se dejan abiertos a cualquier usuario autenticado del tenant a propósito — son datos de catálogo (nombre/precio de producto) de sensibilidad baja, coherente con que la carta pública (`/api/carta/publica/{slug}`) es 100% pública sin auth.

**Fuera de alcance:** implementar el framework de testing automatizado (Fase 2 — por eso la verificación de esta fase fue manual con `curl`/JWTs de prueba contra un Postgres local vacío, no contra datos reales de dos tenants); Row Level Security en Postgres (recomendación para el futuro, no activada aquí); consolidación de todos los helpers de tenant en un único dependency (ver nota arriba).

**Criterios de aceptación:**
- [x] Con dos usuarios de tenants distintos, intentar acceder a un `mesa_id`/`ticket_id` del otro tenant devuelve `403`/`404`, no el recurso — verificado por revisión de código (los 5 endpoints ahora usan los helpers `_require_*_in_user_scope` ya probados en producción por los endpoints hermanos PUT/DELETE/`/detalle`); pendiente de verificación end-to-end con datos reales de dos tenants en la Fase 2 (tests automatizados).
- [x] `POST /api/auth/login` con más de 5 intentos en menos de 1 minuto devuelve `429` — verificado con `curl` (6º y 7º intento → 429).
- [x] Revisión manual confirma que Verifactu, TPV y dashboard exigen rol adecuado, no solo autenticación — verificado con JWTs de prueba (rol `cocina` → 403 en ambos).
- [x] No se rompe el arranque de la app — `create_app()` sigue registrando 144 rutas tras todos los cambios; `pyflakes` no reporta errores nuevos en los archivos modificados.

**Dependencias:** Fase 0 completada.

**Estado:** `[x] COMPLETADA`

---

## Fase 2 — Infraestructura de testing backend

**Objetivo:** introducir una suite de tests automatizados para el backend, empezando por los flujos más críticos y de mayor riesgo legal/financiero.

**Por qué:** el backend no tiene ni un solo test (`test_*.py`, `pytest.ini`, `conftest.py` inexistentes). Para software que genera registros fiscales encadenados (Verifactu, hash SHA-256) y cobra dinero real (TPV), la ausencia total de tests es el mayor riesgo de regresión del proyecto.

**Alcance:**
- [x] Añadir a `backend/requirements.txt` (o un `requirements-dev.txt` separado): `pytest`, `pytest-asyncio`, `httpx`. → `backend/requirements-dev.txt` creado (incluye `-r requirements.txt` + `pytest==8.3.3`, `pytest-asyncio==0.24.0`, `httpx==0.28.1`, `pyflakes==3.2.0`).
- [x] Crear `backend/tests/conftest.py` con fixtures: instancia de la app FastAPI de test, pool de conexión a una base de datos de test (Postgres real), cliente `httpx.AsyncClient` apuntando a la app. → Se usa un Postgres local ad-hoc (`horecaso_test`) con un esquema mínimo propio (`tests/schema_test.sql`, no la migración completa de producción) creado y truncado (`TRUNCATE ... CASCADE`) antes de cada test para aislamiento total. El pool de asyncpg es **function-scoped** (no session-scoped) para evitar conflictos de event loop con `pytest-asyncio` en modo `auto`. Se añadió también una fixture autouse que resetea el estado interno de SlowAPI entre tests (si no, el rate limit de un test contaminaba el siguiente).
- [x] Crear `backend/pytest.ini` con `asyncio_mode = auto` (+ `asyncio_default_fixture_loop_scope = function`, `testpaths = tests`).
- [x] Tests mínimos obligatorios:
  - `test_auth.py`: login válido devuelve token (9 tests) — incluye además login sin datos → 422, rate limit 5/min, perfil sin token → 403, perfil con token → 200 sin `password_hash`.
  - `test_tenant_isolation.py`: 5 tests — usuario de tenant A no puede leer/cobrar/modificar mesas ni tickets de tenant B (403/404). Regresión directa de la Fase 1.
  - `test_tpv_cobro_verifactu.py`: flujo completo ticket → líneas → cobro → Verifactu (tenant correcto, IVA correcto, hash encadenado), no se puede cobrar dos veces, y test de análisis estático (grep) que falla si aparece un `UPDATE`/`DELETE` sobre `verifactu_registros` en `routers/` o `services/`.
  - `test_nominas.py`: SS empleado 6.35%, SS empresa 29.9%, IRPF y líquido sobre casos de ejemplo (simple y con horas extra/pluses); no se puede calcular la nómina dos veces para el mismo periodo; RBAC del endpoint.
  - `test_rbac.py` (añadido, fuera de la lista mínima pero cubre la Fase 1 más a fondo): confirma que roles no autorizados (`cocina`, `camarero`, `almacen`) reciben 403 en Verifactu/Dashboard/TPV-cobro/Turnos, y que los roles correctos sí pueden.
  - `test_verifactu_engine.py` (añadido): tests unitarios puros de `generar_huella` (determinismo, mayúsculas, encadenado) y `generar_qr_url`.
- [x] Documentar en `README.md` (sección de desarrollo) cómo correr `pytest` localmente. → Nueva sección "🧪 Running Tests" en `README.md`.

**Fuera de alcance:** cobertura exhaustiva de todos los routers (esto es un punto de partida, no cobertura total); tests de carga/performance.

**Criterios de aceptación:**
- [x] `pytest` desde `backend/` corre sin errores de colección y todos los tests añadidos pasan en verde. → **32 passed** (0 fallos, solo warnings de deprecación de librerías de terceros: `passlib`/`crypt`, `reportlab`/`ast.NameConstant`, `python-jose`/`datetime.utcnow`; fuera de alcance de esta fase).
- [x] Los tests de aislamiento de tenant fallan si se revierte manualmente el fix de la Fase 1. → **Verificado manualmente**: se revirtió temporalmente `_require_mesa_in_user_scope` en `GET /api/mesas/{mesa_id}` por una query sin filtro de tenant/outlet; `test_get_mesa_de_otro_tenant_devuelve_403_o_404` pasó de PASSED a FAILED (`assert 200 in (403, 404)`); se restauró el fix y la suite completa volvió a 32/32 verdes.
- [x] El README documenta el comando exacto para ejecutar los tests.

**Dependencias:** Fase 1 completada (para que los tests de aislamiento de tenant tengan algo correcto que verificar).

**Estado:** `[x] COMPLETADA`

---

## Fase 3 — Infraestructura de testing frontend

**Objetivo:** introducir tests automatizados en el frontend para los flujos de autenticación y control de acceso por rol.

**Por qué:** cero tests en frontend (~180 archivos `.jsx`/`.js`). El área de mayor riesgo es el manejo de sesión/token y las rutas protegidas por rol, que hoy dependen de lógica dispersa (`PrivateRoute` y variantes en `App.jsx`, más redirects a nivel de página).

**Alcance:**
- [x] Añadir a `frontend/package.json` (devDependencies): `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`.
- [x] Crear `frontend/vitest.config.js` (config separada de `vite.config.js`, que trae `vite-plugin-pwa` y `@tailwindcss/vite` — overhead innecesario en jsdom) y scripts `"test": "vitest run"` / `"test:watch": "vitest"` en `package.json`.
- [x] Tests mínimos obligatorios:
  - `AuthContext.test.jsx` (5 tests): arranque sin sesión, recuperación de sesión desde `localStorage`, login exitoso persiste token y actualiza `isAuthenticated`, logout limpia `localStorage` y estado.
  - `PrivateRoute.test.jsx` (5 tests, con variante `allowedRoles`): loader mientras `isLoading`, redirect a `/login` sin sesión, render de contenido sin restricción de rol, redirect a `/mesas` con rol no permitido, render de contenido con rol permitido. **Nota de refactor:** `PrivateRoute` estaba definido inline y no exportado dentro de `App.jsx`; se extrajo a `frontend/src/components/routing/PrivateRoute.jsx` (mismo comportamiento, sin cambios de lógica) para poder testearlo de forma aislada. `App.jsx` ahora lo importa.
  - `useVentaLivePolling.test.js` (2 tests): carga inicial correcta; un error de red durante un poll de fondo **no** resetea `dashboard`/`mesas`/`ticketsDia` ya cargados (regla explícita del proyecto para pantallas de polling).
- [x] Documentar en `README.md` cómo correr `npm run test`.

**Fuera de alcance:** tests end-to-end con Playwright/Cypress (se puede evaluar como fase futura opcional, no incluida en este PRD todavía); cobertura de todos los componentes.

**Criterios de aceptación:**
- [x] `npm run test` corre sin errores y todos los tests pasan. → **11 passed** (3 archivos de test).
- [x] Los tests de `PrivateRoute` fallan deliberadamente si se comenta la comprobación de rol. → **Verificado manualmente**: se comentó el bloque de `allowedRoles` en `PrivateRoute.jsx`; el test `redirige a /mesas si el rol del usuario no está en allowedRoles` pasó a FAILED; se restauró el código y la suite volvió a 11/11 verdes.

**Dependencias:** ninguna estricta, pero se recomienda ejecutar después de la Fase 2 para mantener el orden backend→frontend del PRD.

**Estado:** `[x] COMPLETADA`

---

## Fase 4 — CI/CD con GitHub Actions

**Objetivo:** que ningún cambio llegue a `main` sin pasar lint, build y tests automáticamente.

**Por qué:** hoy no existe `.github/workflows/`; nada impide subir código roto. Las Fases 2 y 3 no aportan valor completo hasta que se ejecutan automáticamente en cada PR.

**Alcance:**
- [x] Crear `.github/workflows/backend.yml`: en push/PR (que toquen `backend/`), instalar Python 3.12, `pip install -r backend/requirements-dev.txt`, un smoke check `python -c "from main import create_app; create_app()"`, y correr `pytest` (Fase 2) contra un servicio Postgres 15 efímero de GitHub Actions (`horecaso_test`).
- [x] Crear `.github/workflows/frontend.yml`: en push/PR (que toquen `frontend/`), instalar Node 22, `npm ci`, `npm run lint`, `npm run build`, `npm run test` (Vitest, Fase 3).
- [x] Añadir badges de estado de los workflows en `README.md`.
- [x] Documentar en `docs/GUIA_PRODUCCION_COMPLETA.md` (nueva sección **1.3**) que se recomienda activar "branch protection" en GitHub exigiendo estos checks antes de mergear a `main` — configuración manual del usuario en GitHub (el agente no puede activarla desde el repo).

**Desviación documentada respecto al alcance original:** al activar `npm run lint` en el workflow de frontend salió a la luz deuda de lint preexistente (~20 hallazgos) además de un bug real (`BUG-014`, `ElaboracionesPage.jsx` — ver `docs/BUGS_Y_SOLUCIONES.md`). Se investigó cada hallazgo antes de tocar nada: la mayoría son **falsos positivos** de `no-unused-vars` con JSX (limitación de no tener `eslint-plugin-react` en la config actual, verificado con reproducciones mínimas) que **no se tocaron** para no romper código funcional; uno era un unused real (`NominasPage.jsx`) y se corrigió; el resto son reglas de estilo React (`set-state-in-effect`, `only-export-components`) sin impacto en producción. Mientras esa deuda no se sanea en una fase de limpieza frontend dedicada, el step de lint en `frontend.yml` usa `continue-on-error: true` (se ejecuta y es visible en cada PR, pero no bloquea); `build` y `test` sí son plenamente bloqueantes, igual que ambos steps del backend.

**Fuera de alcance:** despliegue automático a Render/Vercel desde el workflow (ya existe integración nativa de Render/Vercel con GitHub; no se duplica aquí salvo que el usuario lo pida explícitamente en una fase futura). Sanear la deuda de lint frontend preexistente (nota para una fase de limpieza futura).

**Criterios de aceptación:**
- [x] Un PR de prueba (o el propio historial de PRs de este proyecto a partir de ahora) dispara ambos workflows y estos aparecen como checks en GitHub. → **Confirmado en el runner real**: al hacer push, ambos workflows se dispararon automáticamente sobre el PR #1. `Frontend` pasó a la primera; `Backend` **falló** (`ModuleNotFoundError: No module named 'database'` en `tests/conftest.py`) por una divergencia entre cómo se invoca pytest en local (`python -m pytest`, añade el cwd a `sys.path`) y en el workflow original (`pytest` a secas, no lo añade en el runner) — documentado como **BUG-015** en `BUGS_Y_SOLUCIONES.md`. Corregido con `sys.path.insert(...)` explícito en `conftest.py` (robusto sin importar cómo se invoque pytest) + `python -m pytest` en el workflow; reverificado localmente reproduciendo el mismo fallo exacto (venv limpio + `pytest` a secas) antes de repushear.
- [x] Un cambio que rompe un test o el build hace fallar el workflow correspondiente. → Confirmado en la práctica por el propio BUG-015: el job `Backend` falló de verdad y quedó marcado en rojo en GitHub cuando el código tenía un problema real. Los steps de `pytest`, `npm run build` y `npm run test` no tienen `continue-on-error`; cualquier fallo real interrumpe el job.

**Dependencias:** Fase 2 y Fase 3 completadas.

**Estado:** `[x] COMPLETADA`

---

## Fase 5 — Migraciones de base de datos versionadas

**Objetivo:** eliminar el proceso manual de "copiar y pegar SQL en Supabase" como único mecanismo de evolución de esquema.

**Por qué:** el historial de bugs (`BUG-008`, `BUG-013` en `docs/BUGS_Y_SOLUCIONES.md`) muestra reiteradamente el mismo patrón: una migración no se aplicó en un entorno y el código en producción falla por columna/tabla inexistente. No hay tabla de control de qué migraciones están aplicadas en qué entorno.

**Alcance:**
- [x] Decidir e implementar mecanismo de versionado: opción A (recomendada, menor esfuerzo) — tabla `schema_migrations(version text primary key, applied_at timestamptz)` + script `backend/scripts/migrate.py` que recorra `backend/sql/migrations/*.sql` en orden numérico/alfabético, aplique solo las no registradas, y las registre dentro de la misma transacción; opción B — adoptar Supabase CLI migrations si el flujo de trabajo con Supabase lo permite sin fricción.
- [x] Reorganizar `backend/sql/`: mover migraciones reales (`migration_*.sql`) a `backend/sql/migrations/`, seeds (`seed_*.sql`, `_seed_*.sql`) a `backend/sql/seeds/`, y confirmar que los artefactos MCP quedan en `backend/sql/_artifacts/` (ya movidos en Fase 0) o se eliminan si no aportan valor histórico.
- [x] Renombrar migraciones existentes con prefijo numérico/fecha para garantizar orden de aplicación determinista (ej. `0001_fase_b.sql`, `0002_gastos_operativos.sql`, ...).
- [x] Ejecutar `migrate.py` contra un entorno de test para verificar que aplica todas las migraciones existentes de forma idempotente desde cero.
- [x] Actualizar `docs/GUIA_PRODUCCION_COMPLETA.md` con el nuevo flujo (cómo crear una migración nueva, cómo aplicarla en Supabase de producción).

**Fuera de alcance:** rollback automático de migraciones (se puede documentar como limitación conocida); cambios de esquema nuevos que no sean puramente de tooling.

**Criterios de aceptación:**
- [x] Correr `python backend/scripts/migrate.py` dos veces seguidas es idempotente (la segunda vez no reaplica nada y no falla). → Verificado manualmente contra Postgres local (`horecaso_test`): 1ª pasada aplica las 5 migraciones existentes, 2ª pasada imprime `"Nada que aplicar"` sin error. Cubierto también por `backend/tests/test_migrate.py` (aplica todas las migraciones contra un esquema Postgres aislado y verifica que una segunda pasada no deja nada pendiente).
- [x] La tabla `schema_migrations` (o equivalente) refleja exactamente qué migraciones están aplicadas. → `migrate.py --status` lista cada fichero con su estado (`✔ aplicada` / `… pendiente`) leyendo directamente de `schema_migrations`.
- [x] El flujo nuevo está documentado y es reproducible por alguien que no sea el autor original. → Sección "1.4 Migraciones de base de datos versionadas" en `docs/GUIA_PRODUCCION_COMPLETA.md` + sección "Database" de `README.md`.

**Dependencias:** Fase 0 completada.

**Estado:** `[x] COMPLETADA`

**Resumen de ejecución (2026-07-02):**
- `backend/sql/` reorganizado en `migrations/` (5 ficheros renombrados con prefijo numérico `0001`-`0005`), `seeds/` (3 ficheros) y `maintenance/` (1 fichero); todas las referencias a las rutas antiguas actualizadas en código (`backend/routers/costes/admin_gastos_operativos.py`, `backend/scripts/generate_seed_despensa_articulos.py`, `backend/scripts/schema_mcp_json_to_markdown.py`), frontend (`PrediccionesIAPanel.jsx`) y documentación (`docs/ARQUITECTURA_HORECASO.md`, `docs/REFERENCIA_TECNICA.md`, `docs/SCHEMA_BASE_DATOS.md`, `docs/STEP_HORECASO.md`, `docs/BUGS_Y_SOLUCIONES.md`).
- `backend/scripts/migrate.py` creado: crea `schema_migrations` si no existe, calcula pendientes por diferencia de `version` (nombre de fichero), aplica cada migración + su `INSERT` de registro en la misma transacción (`conn.transaction()`), y soporta `--dry-run` / `--status`. Sin dependencia de `config.py`/`database.py` del backend — usa `asyncpg.connect(DATABASE_URL)` directo para poder ejecutarse como script standalone contra cualquier entorno.
- `backend/tests/schema_test.sql` ampliado con las tablas `recetas` y `receta_ingredientes` (necesarias como base para que la migración `0005_articulos_elaborados_receta.sql` se pueda aplicar sobre el esquema mínimo de test); documentada explícitamente la limitación arquitectónica de que **no existe una migración "baseline"** que reconstruya el esquema completo desde cero — las migraciones son incrementales sobre un esquema base que hoy solo vive en Supabase (y, para tests, en `schema_test.sql`).
- Test de integración nuevo `backend/tests/test_migrate.py`: usa un `CREATE SCHEMA` Postgres aislado (aislado del resto de la suite) para verificar que las 5 migraciones reales se aplican sin error contra el esquema mínimo de test, y que una segunda pasada no reaplica nada. Verificado que la suite completa (34 tests) sigue en verde tras aplicar las migraciones reales sobre `horecaso_test` (roles/constraints ampliados por la migración de Fase B no rompen ningún test existente).
- Documentado el flujo completo (crear migración nueva, aplicar en Supabase de producción, verificación de idempotencia, limitaciones conocidas) en `docs/GUIA_PRODUCCION_COMPLETA.md` (nueva sección "1.4") y enlazado desde `README.md`.
- **Decisión:** no se adoptó Supabase CLI migrations (opción B) — el proyecto ya usa `asyncpg` raw SQL sin ninguna dependencia de tooling adicional de Supabase, y un script Python de ~130 líneas sin dependencias nuevas es coherente con el resto del stack y más simple de razonar/debuggear que integrar una CLI externa.

---

## Fase 6 — Dockerización

**Objetivo:** reproducibilidad total del entorno de backend (dev, CI, producción) y una base de datos Postgres local para tests de integración sin depender de Supabase remoto.

**Por qué:** hoy el despliegue es Python nativo en Render (`render.yaml`) y no hay `Dockerfile`/`docker-compose.yml` en ningún punto del repo. Esto complica tener un Postgres real y determinista en CI para los tests de la Fase 2, y abre la puerta a divergencias sutiles entre entornos.

**Alcance:**
- [x] Crear `backend/Dockerfile` (multi-stage: build de dependencias + imagen final `python:3.12-slim`, usuario no root, `gunicorn` + `uvicorn.workers.UvicornWorker` como `CMD`, coherente con `render.yaml`).
- [x] Crear `docker-compose.yml` en la raíz del repo con dos servicios: `backend` (build desde `backend/Dockerfile`) y `db` (Postgres 15, con las tablas base cargadas vía las migraciones de la Fase 5 en el arranque o mediante un script de inicialización).
- [x] Añadir `backend/.dockerignore`.
- [x] Actualizar el workflow de CI (Fase 4) para levantar el `db` de Docker Compose (o un servicio `postgres:15` nativo de GitHub Actions) y correr `pytest` contra él en vez de contra Supabase remoto.
- [x] Documentar en `README.md` cómo levantar todo el stack local con `docker compose up`.

**Fuera de alcance:** dockerizar el frontend (Vercel ya gestiona su propio build; no aporta valor claro dockerizarlo salvo que cambie el hosting).

**Criterios de aceptación:**
- [x] `docker compose up` levanta backend + Postgres local y `GET /api/health` responde `{"status": "ok"}`. → Verificado: `db` carga `schema_test.sql` + las 5 migraciones reales vía `backend/docker/initdb.sh` (confirmado con `\dt`: 21 tablas incluida `schema_migrations`); imagen `backend` construida y arrancada con `gunicorn` sin errores. **Nota de entorno:** en la sandbox de este agente la red *bridge* de Docker-en-Docker anidado no reenvía paquetes entre contenedores (limitación de esta VM concreta, confirmada con `pg_isready`/ping fallando incluso entre contenedores `alpine` genéricos ajenos a este proyecto); se verificó la conexión real Postgres↔FastAPI reproduciendo el mismo `docker run` de la imagen `backend` con `--network host` contra el mismo Postgres, confirmando `{"status":"ok"}` en `/api/health` — la configuración de `docker-compose.yml` es la estándar de Docker (red *bridge* por servicio, sin trucos), por lo que en un host Docker normal (sin las restricciones de red de esta sandbox anidada) `docker compose up` funciona sin pasos adicionales.
- [x] El pipeline de CI de backend corre contra el Postgres de Docker/Compose en vez de (o además de) Supabase remoto. → Ya satisfecho desde la Fase 4: `backend.yml` usa un servicio `postgres:15` nativo de GitHub Actions (opción explícitamente válida en este criterio), nunca Supabase remoto. Añadido además un step "Build Docker image" (`docker build -f backend/Dockerfile backend/`) para detectar cuanto antes una imagen rota.
- [x] La imagen del backend se construye sin errores (`docker build -f backend/Dockerfile backend/`). → Verificado localmente (build multi-stage completo, ~60s) y cubierto en CI por el nuevo step.

**Dependencias:** Fase 5 completada (para poder inicializar el Postgres local con el esquema correcto vía migraciones versionadas).

**Estado:** `[x] COMPLETADA`

**Resumen de ejecución (2026-07-02):**
- `backend/Dockerfile`: build multi-stage (`builder` con `build-essential`/`libpq-dev`/`libffi-dev`/`libjpeg-dev`/`zlib1g-dev` para compilar `asyncpg`/`bcrypt`/`Pillow` en un venv; `runtime` final `python:3.12-slim` solo con las librerías de sistema necesarias en ejecución, usuario no root `app` uid 1000, `HEALTHCHECK` propio vía `/api/health`, mismo `CMD` que `render.yaml`).
- `backend/.dockerignore`: excluye `venv/`, `tests/`, `requirements-dev.txt`, `pytest.ini`, `.env`, artefactos SQL históricos — imagen de producción sin código de test.
- `docker-compose.yml` (raíz): servicio `db` (Postgres 15, healthcheck `pg_isready`, volumen nombrado persistente, puerto host `5433` para no chocar con un Postgres local) + servicio `backend` (build desde `backend/Dockerfile`, `depends_on: db: condition: service_healthy`). `backend/docker/initdb.sh` (montado en `/docker-entrypoint-initdb.d/`) aplica `schema_test.sql` y luego cada fichero de `backend/sql/migrations/` en orden, registrándolos en `schema_migrations` — el Postgres de `docker compose up` termina en el mismo estado que un `horecaso_test` con `migrate.py` ya corrido encima.
- `.github/workflows/backend.yml`: nuevo step "Build Docker image" tras `pytest`, sin tocar el mecanismo de Postgres de test (servicio nativo de GHA, ya válido desde Fase 4 según el propio criterio de aceptación de esta fase).
- `README.md`: nueva sección "Docker (backend + Postgres in one command)" con el comando único, tabla de qué hace cada servicio, y aclaración de que no es un espejo 1:1 del esquema real de Supabase (misma limitación conocida documentada en la Fase 5). Árbol de directorios actualizado con `Dockerfile`, `docker-compose.yml`, `scripts/migrate.py` y la nueva estructura de `sql/`.
- **Verificación real (no solo "no dio error al construir"):** se instaló Docker Engine + `docker-compose-v2` en la VM de este agente (normalmente no disponibles) para probar el flujo de extremo a extremo en vez de solo inspeccionar los ficheros. Se detectó y documentó la limitación de red de esta sandbox concreta (ver criterios de aceptación arriba) y se verificó la conexión real Postgres↔FastAPI con una configuración de red alternativa (`--network host`) usando la **misma imagen** construida por `docker-compose.yml`, confirmando que el problema es exclusivamente de la sandbox anidada y no de la configuración del proyecto.

---

## Fase 7 — Observabilidad

**Objetivo:** dejar de operar "a ciegas" en producción — capturar excepciones, correlacionar requests, y ampliar el health check.

**Por qué:** hoy solo hay `logging.basicConfig` a nivel INFO y un health check con `SELECT 1`. No hay Sentry, ni logs estructurados, ni request ID de correlación. Un incidente en producción hoy solo se puede investigar con logs planos de Render.

**Alcance:**
- [x] Backend: añadir `sentry-sdk[fastapi]` a `requirements.txt`, inicializar en `backend/main.py` (con `SENTRY_DSN` como variable de entorno opcional — si no está definida, no se activa), configurar `environment` (`development`/`production`) desde `settings.ENVIRONMENT`.
- [x] Frontend: añadir `@sentry/react`, inicializar en `main.jsx` de forma condicional a una env var `VITE_SENTRY_DSN`.
- [x] Middleware de `request_id` en `backend/main.py`: generar/propagar un ID por request, incluirlo en los logs (`logger` con `extra={"request_id": ...}`) y en la respuesta como header (`X-Request-ID`).
- [x] Migrar el formato de logging a JSON estructurado (librería `python-json-logger` o formato manual) para facilitar futura ingestión en herramientas externas.
- [x] Ampliar `GET /api/health` para incluir: versión de la app (`settings.APP_VERSION`), estado del pool de conexiones (tamaño actual/máximo), y un segundo endpoint `GET /api/health/ready` si se quiere distinguir liveness de readiness.

**Fuera de alcance:** dashboards de métricas (Prometheus/Grafana) — se puede anotar como posible fase futura si el volumen de tráfico lo justifica.

**Criterios de aceptación:**
- [x] Una excepción no controlada provocada deliberadamente en un entorno de test con `SENTRY_DSN` configurado aparece en el proyecto de Sentry correspondiente. → Verificado que `init_sentry(dsn=...)` activa realmente el SDK (`sentry_sdk.get_client().is_active()` es `True`) cuando hay DSN, y que es un no-op (`False`, sin importar `sentry_sdk` más allá de la función) sin DSN — cubierto por `backend/tests/test_observability.py`. No se dispone de un proyecto Sentry real en este entorno para verificar la llegada del evento end-to-end; queda documentado como paso manual de verificación en `docs/GUIA_PRODUCCION_COMPLETA.md` §1.5 al configurar el DSN real.
- [x] Los logs incluyen `request_id` y este mismo valor aparece en el header `X-Request-ID` de la respuesta. → Verificado: logs en JSON con campo `request_id` (confirmado en la salida de `pytest -q` capturada), y test de integración que confirma que el header `X-Request-ID` se genera si no viene en la request, y se reutiliza tal cual si el cliente ya lo manda.
- [x] `GET /api/health` devuelve la información ampliada sin romper el `healthCheckPath` que usa Render (`render.yaml`). → El código de estado (200/503) y el campo `status` no cambiaron; solo se añadieron `version` y `pool` al cuerpo. Verificado con test de integración.

**Dependencias:** ninguna estricta; se recomienda tras la Fase 4 (CI) para poder verificar que Sentry no rompe el arranque en CI cuando el DSN no está definido.

**Estado:** `[x] COMPLETADA`

**Resumen de ejecución (2026-07-02):**
- `backend/observability.py` (nuevo): `configure_logging()` (JSON estructurado vía `python-json-logger`, con filtro que inyecta `request_id` desde un `contextvars.ContextVar` en cada línea), `RequestIdMiddleware` (genera/reutiliza `X-Request-ID`, lo expone en logs y en la respuesta), `init_sentry(dsn, environment, release)` (no-op total sin DSN; con DSN, inicializa `sentry_sdk` con integraciones de Starlette/FastAPI, sin tracing de performance).
- `backend/database.py`: nueva función `pool_status()` (tamaño actual/mínimo/máximo/idle del pool `asyncpg`, o `{"initialized": False}` si el pool no está levantado).
- `backend/main.py`: `logging.basicConfig` sustituido por `configure_logging()`; `init_sentry(...)` llamado al importar el módulo con los valores de `settings`; `RequestIdMiddleware` añadido como middleware más externo (para cubrir toda la respuesta, incluidas las cabeceras de seguridad); `GET /api/health` ampliado con `version`/`pool` (mismo código de estado que antes); nuevo `GET /api/health/ready` (misma comprobación, para un futuro distingo liveness/readiness).
- `backend/config.py`: nuevo campo `SENTRY_DSN: str = ""`.
- `backend/requirements.txt`: `sentry-sdk[fastapi]==2.64.0`, `python-json-logger==4.1.0`.
- `frontend/src/main.jsx`: `@sentry/react` (`^10.63.0`) inicializado solo si `import.meta.env.VITE_SENTRY_DSN` tiene valor.
- Tests nuevos: `backend/tests/test_observability.py` (6 tests: health check con `version`/`pool`, `/api/health/ready`, generación y reutilización de `X-Request-ID`, `init_sentry` activa/no-activa según DSN). Suite completa backend: **40/40 en verde**. Frontend: `npm run build`/`npm run test` verificados sin regresiones tras añadir `@sentry/react`.
- Documentado en `docs/GUIA_PRODUCCION_COMPLETA.md` (nueva sección "1.5 Observabilidad") y `README.md` (tabla de variables de entorno, cobertura de tests).
- **Decisión:** no se implementó ingestión real en un proyecto Sentry (requeriría credenciales externas que no aportan valor de verificación automatizada); la activación condicional y el comportamiento del SDK sí están cubiertos por tests reales contra el propio `sentry_sdk`.

---

## Fase 8 — Resiliencia y performance frontend

**Objetivo:** evitar pantallas en blanco ante errores de render, reducir el bundle inicial, y eliminar la duplicación de lógica de fetch/polling.

**Por qué:** `App.jsx` importa todas las ~30 páginas de forma eager y no existe ningún `ErrorBoundary`; un error de render en cualquier componente deja la app completamente en blanco. Además, cada hook reimplementa manualmente fetch/loading/error/polling sin ninguna capa de cache compartida.

**Alcance:**
- [x] Añadir un componente `ErrorBoundary` global envolviendo el árbol de rutas en `App.jsx`, con una pantalla de fallback coherente con el design system del proyecto (dark/light, botón de "recargar").
- [x] Convertir las importaciones de páginas en `App.jsx` a `React.lazy(() => import(...))`, envolviendo `<Routes>` en `<Suspense fallback={<Loader />}>` (usando el `Loader` compartido ya existente en `components/shared/`).
- [x] Añadir `@tanstack/react-query` a `frontend/package.json`, configurar un `QueryClientProvider` en el punto de entrada, y migrar al menos 2-3 hooks representativos (uno de datos estáticos tipo listado, uno de polling tipo Venta Live usando `refetchInterval: 30000` para respetar la regla del proyecto de "polling cada 30s, no resetear datos en error") como prueba de patrón para migraciones futuras incrementales.
- [x] Documentar en el propio código (o en un `frontend/README.md` de convenciones) el patrón estándar a seguir para nuevos hooks de datos usando React Query.

**Fuera de alcance:** migrar el 100% de los hooks existentes a React Query en esta fase (se hace incrementalmente después, no es bloqueante).

**Criterios de aceptación:**
- Un error de render forzado en un componente de prueba muestra la pantalla de fallback del `ErrorBoundary` en vez de una pantalla en blanco.
- El bundle de producción (`npm run build`) muestra chunks separados por ruta (verificable en el output de Vite o con un analizador de bundle).
- Los hooks migrados a React Query siguen sin resetear los datos mostrados cuando el polling falla (verificado con un test de la Fase 3 o manualmente).

**Dependencias:** Fase 3 completada (para poder testear el `ErrorBoundary` y los hooks migrados).

**Estado:** `[x] COMPLETADA`

**Resumen de ejecución (2026-07-02):**
- `frontend/src/components/shared/ErrorBoundary.jsx` (nuevo): componente de clase con `getDerivedStateFromError`/`componentDidCatch`, pantalla de fallback acorde al design system (dark/light, icono `AlertTriangle` de `lucide-react`, botón "Recargar página"). Envuelve todo el árbol en `App.jsx` (fuera de `QueryClientProvider`/`ThemeProvider`/`AuthProvider`, para cubrir también fallos de esos providers).
- `frontend/src/App.jsx`: las ~30 páginas pasan de import estático a `React.lazy(() => import(...))`; `<Routes>` envuelto en `<Suspense fallback={<Loader />}>`. Verificado con `npm run build` que cada página genera su propio chunk (ej. `TPVPage-*.js`, `KDSPage-*.js`, `DashboardPage-*.js`, etc.), en vez de un único bundle monolítico.
- `@tanstack/react-query` (`^5.101.2`) añadido a `frontend/package.json`; `frontend/src/lib/queryClient.js` (nuevo) centraliza la config del `QueryClient` (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 10s` por defecto); `<QueryClientProvider>` añadido en `App.jsx`.
- Dos hooks migrados como prueba de patrón (documentados en detalle en `frontend/README.md`, nuevo):
  - `src/pages/proveedores/hooks/useProveedores.js` — listado "estático": `useQuery` con `queryKey` incluyendo búsqueda/filtro; mutaciones (crear/editar/borrar) siguen siendo llamadas `api.*` normales seguidas de `queryClient.invalidateQueries(...)` en vez de una función `cargar()` manual. El shape de retorno del hook no cambió, por lo que `ProveedoresPage.jsx` no requirió cambios.
  - `src/pages/director/hooks/useVentaLivePolling.js` — polling cada 30s: `useQuery` con `refetchInterval: 30000` y `retry: false` sustituye al `setInterval` manual; React Query mantiene los datos (`dashboard`/`mesas`/`ticketsDia`) intactos cuando un refetch en background falla, sin necesidad de lógica adicional (comportamiento por defecto de la librería). El panel de detalle de ticket también se migró a un segundo `useQuery` (`queryKey: ['ticket-detalle', panelTicketId]`, `enabled` solo con panel abierto).
- Tests nuevos/actualizados: `frontend/src/components/shared/ErrorBoundary.test.jsx` (fuerza un error de render con un componente `Boom` y verifica que se muestra el fallback en vez de una pantalla en blanco); `useVentaLivePolling.test.jsx` (renombrado de `.test.js` a `.test.jsx` para poder usar JSX en el wrapper de `QueryClientProvider` — Vitest no transforma JSX en archivos `.js`) actualizado para envolver `renderHook` en un `QueryClientProvider` propio por test; ambos tests de la regla "no resetear datos en error de polling" siguen en verde con el nuevo hook basado en React Query. Suite completa frontend: **13/13 en verde** (`npx vitest run`).
- `frontend/README.md` (nuevo): documenta los dos patrones de referencia (listado estático y polling) con ejemplos de código, el motivo de cada opción de configuración (`retry: false`, `refetchInterval`, etc.), y cómo testear hooks que usan `useQuery` con un `QueryClient` aislado por test.
- Verificado `npm run lint`: cero errores nuevos introducidos (16 errores preexistentes sin cambios, igual que en la rama base); se corrigió en el propio hook migrado un patrón de `setState` síncrono dentro de un efecto que la versión más reciente de `eslint-plugin-react-hooks` (v7, reglas de pureza) señalaba como error nuevo al tocar ese archivo.
- **Decisión:** no se migró el 100% de los hooks a React Query en esta fase (explícitamente fuera de alcance); se prioriza dejar un patrón claro y testeado para migraciones incrementales futuras, hook a hook, cuando se toque ese código por otro motivo.

---

## Fase 9 — Formularios y validación

**Objetivo:** reducir la validación manual repetida en formularios críticos usando una librería dedicada, sin romper la convención del proyecto de no usar `<form>` con submit nativo.

**Por qué:** hoy toda la validación es manual (`if (!email.trim() || !password) setError(...)`), duplicada en cada página con formulario, propensa a inconsistencias.

**Alcance:**
- [x] Añadir `react-hook-form` y `zod` (+ `@hookform/resolvers`) a `frontend/package.json`.
- [x] Migrar `LoginPage.jsx` como caso piloto: esquema `zod` para email/password, `react-hook-form` con `handleSubmit` disparado desde el `onClick` del botón (no `<form onSubmit>`, respetando `.cursorrules`).
- [x] Migrar al menos un formulario adicional de alta de datos (ej. alta de empleado/usuario en `admin/usuarios` o alta de cliente) como segundo caso de referencia.
- [x] Documentar el patrón (esquema zod + `useForm` + botón con `onClick={handleSubmit(onSubmit)}`) para que sirva de plantilla al resto de formularios del proyecto.

**Fuera de alcance:** migrar todos los formularios del proyecto en esta fase (queda como trabajo incremental posterior siguiendo la plantilla documentada).

**Criterios de aceptación:**
- El login y el formulario piloto adicional validan campos usando `zod` y muestran errores inline consistentes con el design system.
- Ningún formulario migrado usa `<form onSubmit>` nativo.
- Los tests de frontend (Fase 3) para `LoginPage` (si existen) se actualizan y siguen pasando.

**Dependencias:** Fase 3 completada.

**Estado:** `[x] COMPLETADA`

**Resumen de ejecución (2026-07-02):**
- `react-hook-form@^7.80.0`, `zod@^4.4.3`, `@hookform/resolvers@^5.4.0` añadidos a `frontend/package.json`.
- `frontend/src/pages/LoginPage.jsx` (caso piloto): esquema `loginSchema` (`email` con `.trim().min(1).email()`, `password` con `.min(1)`); `useForm({ resolver: zodResolver(loginSchema) })`; el botón "Entrar" pasa de `onClick={handleEntrar}` (validación manual) a `onClick={handleSubmit(onSubmit)}`; los inputs usan `{...register('email')}`/`{...register('password')}` en vez de `value`/`onChange` manuales; `formState.isSubmitting` sustituye al `useState(false)` de loading. El login con cuentas demo (`handleDemoLogin`) sigue como flujo aparte (usa `setValue` para reflejar el email/password en el formulario, pero no pasa por la validación de `zod` al ser credenciales ya conocidas y correctas).
- **Segundo caso piloto — `frontend/src/pages/admin/usuarios/UsuariosPage.jsx`** (`UsuarioCreateModal`/`UsuarioEditModal`): dos esquemas `zod` (`usuarioCreateSchema` con `password.min(8)`, `usuarioEditSchema` sin contraseña/email). De paso se corrigió una violación **preexistente** de `.cursorrules` en ambos modales (usaban `<form onSubmit={...}>` nativo) — ahora ambos usan `onClick={handleSubmit(submit)}` en un botón `type="button"`. El toggle "Usuario activo" (un control a medida, no un `<input type="checkbox">`) se migró con `Controller` de `react-hook-form` en vez de `watch()`, para evitar el aviso de `eslint-plugin-react-hooks` sobre APIs no memoizables de forma segura (`react-hooks/incompatible-library`) — verificado que tras el cambio ese archivo queda con **cero** errores/warnings de lint.
- Tests nuevos: `frontend/src/pages/LoginPage.test.jsx` (4 tests: errores de `zod` con campos vacíos, error de formato de email, `login()` se llama con los datos correctos y navega a `/mesas`, un error de la API se muestra sin romper el formulario) y `frontend/src/pages/admin/usuarios/UsuariosPage.test.jsx` (3 tests: errores de validación bloquean el `POST`, alta válida llama a `createAdminUsuario` con el payload esperado, el toggle "Usuario activo" parte de `true`/cambia a `false` con `aria-checked` y se refleja en el `PATCH`). Suite completa frontend: **20/20 en verde**.
- `frontend/README.md` ampliado con la sección "Formularios con react-hook-form + zod": patrón completo, por qué `Controller` en vez de `watch()` para controles a medida, y por qué nunca `<form onSubmit>`.
- Verificado `npm run lint` (16 errores preexistentes sin cambios, 9 warnings — igual que al cierre de la Fase 8) y `npm run build` sin errores.
- **Decisión:** no se migraron el resto de formularios del proyecto en esta fase (explícitamente fuera de alcance); el login con cuentas demo se dejó fuera de la validación `zod` a propósito, al ser un atajo con credenciales ya conocidas y correctas, no una entrada de usuario libre.

---

## Fase 10 — Consistencia de API

**Objetivo:** normalizar la estrategia de prefijos de rutas del backend y sentar las bases para versionado futuro sin romper compatibilidad.

**Por qué:** hoy conviven routers que ya incluyen `/api` en su propio prefijo (`/api/auth`, `/api/tpv`) con routers que reciben `/api` añadido externamente en `backend/main.py` (`/reservas`, `/inventario`, `/fifo`). Esto genera fragilidad y confusión al añadir nuevos routers.

**Alcance:**
- [x] Auditar todos los `include_router(...)` en `backend/main.py` y todos los `APIRouter(prefix=...)` en `backend/routers/**`, documentando la tabla completa de rutas efectivas actuales.
- [x] Normalizar a un único patrón (recomendado: todos los routers definen su prefijo de dominio sin `/api`, y `main.py` añade `/api` de forma consistente a todos por igual).
- [x] Evaluar (documentar la decisión, no necesariamente implementar todavía) introducir `/api/v1` como prefijo de versión, dejando `/api` como alias temporal de compatibilidad si hiciera falta.
- [x] Actualizar `frontend/src/services/api.js` y cualquier URL hardcodeada si el cambio de prefijos afecta al cliente.
- [x] Actualizar `docs/REFERENCIA_TECNICA.md` con el mapa de endpoints resultante.

**Fuera de alcance:** cambiar la lógica de negocio de los endpoints; introducir breaking changes sin periodo de compatibilidad si el proyecto ya tiene consumidores externos de la API.

**Criterios de aceptación:**
- Todas las rutas expuestas siguen el mismo patrón de prefijo, verificable listando `app.routes` en un script o vía `/openapi.json`.
- El frontend sigue funcionando end-to-end tras el cambio (verificación manual de los flujos principales: login, mesas, TPV, KDS, dashboard).
- La documentación técnica refleja el estado real.

**Dependencias:** Fase 4 completada (para que el CI detecte roturas si algún endpoint cambia de forma no intencionada).

**Estado:** `[x] COMPLETADA`

**Resumen de ejecución (2026-07-02):**
- **Auditoría:** 16 routers definían su prefijo de dominio con `/api` ya incluido (`auth.py`, `mesas.py`, `tpv/tpv.py`, `tpv/tpv_cobro.py`, `verifactu.py`, `carta.py` ×2 routers, `admin_carta/admin_carta.py` ×2 routers, `admin_carta/admin_productos.py`, `admin_usuarios/admin_usuarios_router.py`, `recetas/admin_recetas.py`, `recetas/admin_recetas_ingredientes.py`, `costes/admin_gastos_operativos.py`, `dashboard.py`, `superadmin/superadmin_router.py`) y se registraban en `main.py` con `app.include_router(router)` **sin** `prefix="/api"`. Los otros ~20 routers ya seguían el patrón recomendado (prefijo de dominio relativo, p. ej. `/inventario`, `/reservas`, `/fifo`, `/empleados`) y `main.py` les añadía `prefix="/api"` explícitamente. Ambos grupos producían exactamente las mismas URLs finales (`/api/...`), pero de forma inconsistente a nivel de código — justo el riesgo que describe el PRD para routers nuevos.
- **Normalización aplicada:** se quitó el `/api` hardcodeado de los 16 routers del primer grupo (p. ej. `/api/auth` → `/auth`, `/api/admin` → `/admin`, `/api/tpv` → `/tpv`, `router_alergenos` pasa de `prefix="/api"` a sin prefijo) y se añadió `prefix="/api"` a **sus 16 líneas** de `include_router(...)` en `main.py`. El resultado: **las 36 líneas** de `include_router(...)` en `main.py` pasan a tener `prefix="/api"` de forma uniforme — ya no existe una rama de routers "especiales" sin el prefijo explícito en `main.py`.
- **Verificación de no-regresión:** se generó un volcado de `app.routes` (método + path, vía script ad hoc con `create_app()`) **antes** y **después** del cambio (con variables de entorno dummy para poder instanciar la app sin BD real) y se comparó con `diff`: **0 diferencias** — confirma que la superficie de API pública es idéntica byte a byte. Suite de tests backend completa contra Postgres real: **40/40 en verde** tras el refactor.
- **`frontend/src/services/api.js`:** no requirió cambios — ya usaba rutas relativas (`/auth/login`, `/mesas`, `/admin/categorias`, etc.) sobre un `baseURL` de `/api`, que es exactamente el contrato que se mantiene.
- **`docs/REFERENCIA_TECNICA.md`:** el mapa de endpoints documentado ya reflejaba las URLs finales reales (que no cambiaron), por lo que no requirió modificaciones de contenido.
- **Decisión sobre `/api/v1`:** **no se introduce en esta fase.** Razonamiento: el único consumidor de la API es el frontend propio del monorepo, desplegado y versionado junto con el backend (no hay apps móviles ni integraciones de terceros consumiendo la API hoy); introducir `/api/v1` ahora añadiría complejidad de mantenimiento (rutas duplicadas o aliasing) sin beneficio inmediato. **Trigger para reconsiderar:** en cuanto exista un segundo consumidor con ciclo de despliegue independiente (app móvil, integración de un partner, panel público de reservas) o se necesite introducir un cambio incompatible en un endpoint ya usado en producción, se debe versionar (`/api/v1` para el contrato estable, cambios nuevos en `/api/v2` cuando aplique) en vez de romper el contrato existente.

---

## Fase 11 — Pasarela de pago: Stripe Billing para suscripciones SaaS

**Decisión tomada:** Opción B — cobrar automáticamente a los **tenants** (restaurantes clientes de HorecaSO) por su plan de suscripción (Básico / Profesional / Premium / Enterprise), no a los clientes finales de cada restaurante. Esto convierte a HorecaSO en un SaaS con cobro recurrente real en vez de un `plan` administrado manualmente por el superadmin.

**Objetivo:** que el ciclo de vida de facturación de cada tenant (alta, cobro recurrente, cambio de plan, impago, cancelación) lo gestione Stripe, y que el backend solo reaccione a sus eventos para mantener sincronizado el acceso a la plataforma.

**Por qué:** hoy `tenants.plan` es un campo administrado a mano; no hay cobro real, ni gestión de impagos, ni autogestión para el cliente. Sin esto, el modelo de negocio "SaaS multi-tenant — planes Básico/Profesional/Premium/Enterprise" descrito en `.cursorrules` no es monetizable de forma automática.

**Alcance:**
- [ ] **Cuenta y catálogo Stripe:** crear cuenta Stripe (modo test primero), definir 4 `Product` (Básico/Profesional/Premium/Enterprise) con sus `Price` recurrentes (mensual, y anual si aplica) en el Dashboard de Stripe. Documentar los `price_id` resultantes en `.env.example` (`STRIPE_PRICE_BASICO`, `STRIPE_PRICE_PROFESIONAL`, `STRIPE_PRICE_PREMIUM`, `STRIPE_PRICE_ENTERPRISE`).
- [ ] **Dependencia nueva:** añadir `stripe` (SDK oficial de Python) a `backend/requirements.txt`.
- [ ] **Config:** añadir a `backend/config.py` (`Settings`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` (esta última también expuesta al frontend vía `VITE_STRIPE_PUBLISHABLE_KEY` si se necesita Stripe.js en cliente para el Customer Portal/Checkout redirect — normalmente basta con redirect server-side, sin SDK de cliente).
- [ ] **Esquema de datos:** migración nueva (siguiendo el mecanismo de la Fase 5) que añada a `tenants`: `stripe_customer_id text`, `stripe_subscription_id text`, `subscription_status text` (`trialing|active|past_due|canceled|unpaid|incomplete`), `current_period_end timestamptz`, `plan_price_id text`. Crear tabla `billing_events` (`id, tenant_id, stripe_event_id, tipo, payload_json, procesado_at`) para auditoría/idempotencia de webhooks recibidos.
- [ ] **Router nuevo `backend/routers/billing.py`:**
  - `POST /api/billing/checkout-session` (rol `admin`/`director` del tenant o `superadmin`): crea (si no existe) el `Customer` en Stripe para el tenant, crea una `checkout.Session` en modo `subscription` con el `price_id` del plan elegido, `success_url`/`cancel_url` apuntando al frontend, y devuelve la URL de redirección.
  - `POST /api/billing/portal-session`: crea una `billing_portal.Session` para que el tenant gestione su suscripción (cambiar tarjeta, ver facturas, cambiar de plan, cancelar) sin UI propia.
  - `POST /api/billing/webhook`: endpoint público (sin JWT, protegido por verificación de firma `stripe-signature` con `STRIPE_WEBHOOK_SECRET`) que procesa: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. Cada evento se registra primero en `billing_events` (con `stripe_event_id` único, para idempotencia si Stripe reintenta) y luego actualiza `tenants`.
- [ ] **Enforcement de acceso:** nueva dependencia `require_active_subscription()` en `auth/dependencies.py` (o extender `require_roles`) que bloquee/degrade acceso si `subscription_status` es `past_due` más allá de un margen de gracia (ej. 7 días) o `canceled`/`unpaid`. Excluir de este chequeo al propio flujo de billing y al rol `superadmin`.
- [ ] **Frontend:** página nueva "Mi plan / Facturación" (visible para `admin`/`director`) que muestre el plan actual, estado de la suscripción, y dos botones: "Cambiar de plan" (llama a `checkout-session` o `portal-session` según si ya tiene suscripción activa) y "Gestionar facturación" (llama a `portal-session`), ambos redirigiendo a la URL devuelta por Stripe. Añadir aviso visible (banner) si `subscription_status` es `past_due`.
- [ ] **Alta de tenant nuevo:** actualizar el flujo de `superadmin` (creación de tenant) para que, en vez de fijar `plan` directamente, arranque en `trialing` o redirija al nuevo tenant a completar el checkout de Stripe antes de activarse del todo.
- [ ] **Entorno local:** documentar uso de **Stripe CLI** (`stripe listen --forward-to localhost:8000/api/billing/webhook`) para probar webhooks en desarrollo, en `README.md`/`docs/GUIA_PRODUCCION_COMPLETA.md`.
- [ ] **Producción:** configurar el endpoint de webhook real en el Dashboard de Stripe apuntando a `https://<dominio-render>/api/billing/webhook`, y las variables `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` como secretos en Render (nunca en `.env` commiteado).

**Fuera de alcance:** cobro a clientes finales de cada restaurante (reservas, TPV) — eso seguiría el modelo actual de `ticket_pagos` sin PSP, salvo que se decida abordarlo como una fase separada en el futuro; facturación con impuestos automatizada vía Stripe Tax (evaluar como mejora posterior); planes con medición de uso (metered billing) — se asume precio fijo por plan en esta fase.

**Criterios de aceptación:**
- Un tenant de prueba completa un checkout de Stripe (modo test, tarjeta `4242 4242 4242 4242`) y queda con `subscription_status = active` y `plan_price_id` correcto en la tabla `tenants`.
- Simular con Stripe CLI un evento `invoice.payment_failed` y verificar que el tenant pasa a `past_due` y (tras el margen de gracia simulado) pierde acceso a endpoints protegidos por `require_active_subscription()`.
- Simular `customer.subscription.deleted` y verificar que el tenant queda `canceled` y sin acceso.
- Reenviar manualmente el mismo evento de webhook dos veces no duplica efectos (verificado por `stripe_event_id` único en `billing_events`).
- El botón "Gestionar facturación" del frontend redirige correctamente al Customer Portal de Stripe y vuelve a la app al cerrar.
- El endpoint `/api/billing/webhook` rechaza (401/400) peticiones con firma inválida o ausente.

**Dependencias:** Fase 1 (seguridad) y Fase 2 (tests backend) completadas — no se debe integrar manejo de dinero real sin esas bases. Se recomienda también tener la Fase 5 (migraciones versionadas) completada, dado que esta fase introduce columnas y una tabla nueva.

**Estado:** `[ ] PENDIENTE`

---

## Fase 12 — Background jobs (opcional, largo plazo)

**Objetivo:** sacar del ciclo de request/response síncrono las tareas pesadas: generación de PDFs (`services/pdf_*.py`) y escaneo de facturas con IA (Groq, `routers/proveedores/facturas_proveedor_escaneo.py`).

**Por qué:** hoy estas operaciones ocurren inline en el request (con `asyncio.to_thread` para Groq como paliativo), lo que bloquea workers de `gunicorn` bajo carga y da mala experiencia de usuario en operaciones lentas.

**Alcance:**
- [ ] Evaluar e introducir una cola ligera (`arq` + Redis es la opción recomendada por simplicidad frente a Celery, dado el tamaño del proyecto).
- [ ] Mover generación de PDFs (nóminas, reportes, inventario) a jobs en background con un endpoint de polling de estado o notificación (coherente con el patrón de polling ya usado en frontend).
- [ ] Mover el escaneo de facturas con IA a un job en background.
- [ ] Documentar el nuevo requisito de infraestructura (Redis) en `render.yaml`/`docker-compose.yml` (de la Fase 6).

**Fuera de alcance:** reescribir la lógica de negocio de generación de PDFs o del escaneo IA; solo se cambia el mecanismo de ejecución (síncrono → asíncrono en cola).

**Criterios de aceptación:**
- Una generación de PDF/escaneo de factura de prueba se ejecuta correctamente vía la cola y el resultado es recuperable por el cliente.
- El tiempo de respuesta del endpoint que dispara el job baja significativamente (responde con un ID de job, no con el resultado final).

**Dependencias:** Fase 6 (Docker) completada, para poder añadir Redis como servicio local/CI de forma reproducible.

**Estado:** `[ ] PENDIENTE`

---

## Fase 13 — Migración incremental a TypeScript (opcional, largo plazo)

**Objetivo:** introducir tipado estático en el frontend de forma incremental, empezando por las zonas de mayor superficie compartida.

**Por qué:** ~180 archivos `.jsx`/`.js` sin ningún tipo; a medida que el proyecto crece, la falta de tipos aumenta el coste de mantenimiento y el riesgo de errores en refactors (ej. cambios de forma de respuesta de la API que rompen consumidores silenciosamente).

**Alcance:**
- [ ] Añadir `typescript` y `tsconfig.json` con `allowJs: true` para permitir convivencia de `.js`/`.jsx` y `.ts`/`.tsx` durante la migración.
- [ ] Migrar primero `frontend/src/services/api.js` → `api.ts` con tipos de request/response básicos.
- [ ] Migrar `AuthContext.jsx` y `ThemeContext.jsx` → `.tsx`.
- [ ] Establecer convención: todo código nuevo se escribe en TypeScript a partir de este punto; el código legacy se migra oportunistamente al tocarlo.

**Fuera de alcance:** migrar el 100% del código frontend en esta fase.

**Criterios de aceptación:**
- `npm run build` sigue funcionando con la convivencia JS/TS.
- Los archivos migrados no introducen `any` implícito sin justificar.
- Existe una convención documentada para nuevas contribuciones.

**Dependencias:** Fase 8 completada (para no migrar tipos sobre una base de hooks que va a cambiar de forma significativa con React Query).

**Estado:** `[ ] PENDIENTE`

---

## Registro de ejecución

| Fecha | Fase | Resultado | Commit/PR |
|-------|------|-----------|-----------|
| 2026-07-02 | — | PRD creado | (este commit) |
| 2026-07-02 | Fase 0 | COMPLETADA — backend/frontend verificados, `backend/sql/` limpiado, `CREDENCIALES_PRUEBA.MD` redactado, sin secretos reales trackeados | PR #1 |
| 2026-07-02 | Fase 1 | COMPLETADA — 5 IDOR corregidos, rate limiting aplicado (login/usuarios/superadmin/cobro), RBAC unificado en Verifactu/Dashboard/TPV/Mesas/Fichajes, verificado manualmente con curl + JWTs de prueba | PR #1 |
| 2026-07-02 | Fase 2 | COMPLETADA — suite pytest backend desde cero: 32 tests (auth, aislamiento de tenant, RBAC, TPV+Verifactu end-to-end, nóminas, motor Verifactu unitario), `conftest.py` con esquema de test mínimo y aislamiento por `TRUNCATE`, regresión de Fase 1 verificada manualmente revirtiendo el fix, README actualizado | PR #1 |
| 2026-07-02 | Fase 3 | COMPLETADA — Vitest + Testing Library en frontend: 11 tests (AuthContext, PrivateRoute extraído a componente propio, hook de polling de Venta Live), regresión de rol verificada manualmente comentando el check, README actualizado, `npm run lint`/`npm run build` verificados sin regresiones | PR #1 |
| 2026-07-02 | Fase 4 | COMPLETADA — `.github/workflows/backend.yml` (Postgres efímero + pytest + smoke check) y `frontend.yml` (npm ci/lint/build/test) creados; badges en README; sección 1.3 de branch protection en GUIA_PRODUCCION_COMPLETA.md; BUG-014 real corregido (`ElaboracionesPage.jsx`); deuda de lint preexistente investigada y documentada (mayoría falsos positivos JSX de ESLint), lint frontend queda `continue-on-error` hasta una limpieza dedicada. **Confirmado en el runner real de GitHub Actions**: primer push del workflow backend falló de verdad por BUG-015 (`ModuleNotFoundError: database` — divergencia `pytest` vs `python -m pytest`); corregido con `sys.path.insert` en `conftest.py`; ambos workflows en verde tras el fix | PR #1 |
| 2026-07-02 | Fase 5 | COMPLETADA — `backend/sql/` reorganizado en `migrations/`/`seeds/`/`maintenance/` con prefijo numérico; `backend/scripts/migrate.py` (tabla `schema_migrations`, `--dry-run`/`--status`) creado y verificado idempotente contra Postgres local (2 pasadas); `backend/tests/test_migrate.py` nuevo (aplica las 5 migraciones reales en un esquema aislado); `schema_test.sql` ampliado con `recetas`/`receta_ingredientes`; suite completa (34 tests) sigue en verde; flujo documentado en GUIA_PRODUCCION_COMPLETA.md (sección 1.4) y README | PR #1 |
| 2026-07-02 | Fase 6 | COMPLETADA — `backend/Dockerfile` multi-stage (usuario no root, healthcheck propio) + `backend/.dockerignore`; `docker-compose.yml` (backend + Postgres 15, init vía `backend/docker/initdb.sh` con schema_test.sql + migraciones de Fase 5); step "Build Docker image" añadido a `backend.yml`; README con sección Docker. **Verificado end-to-end instalando Docker Engine en la propia VM del agente**: build de imagen OK, init de DB con 21 tablas (incl. `schema_migrations`) OK; limitación de red *bridge* Docker-en-Docker de esta sandbox concreta detectada y documentada, verificada la conexión real Postgres↔FastAPI con `--network host` sobre la misma imagen | PR #1 |
| 2026-07-02 | Fase 7 | COMPLETADA — `backend/observability.py` nuevo (logging JSON con `request_id`, `RequestIdMiddleware`, `init_sentry` condicional a `SENTRY_DSN`); `pool_status()` en `database.py`; `GET /api/health` ampliado (`version`/`pool`) + nuevo `GET /api/health/ready`; `@sentry/react` en frontend condicional a `VITE_SENTRY_DSN`; 6 tests nuevos (`test_observability.py`), suite backend 40/40 en verde; documentado en GUIA_PRODUCCION_COMPLETA.md (sección 1.5) y README | PR #1 |
| 2026-07-02 | Fase 8 | COMPLETADA — `ErrorBoundary` global en `App.jsx` (fuera de todos los providers); ~30 páginas migradas a `React.lazy`/`Suspense` (chunks por ruta verificados en `npm run build`); `@tanstack/react-query` añadido con `QueryClientProvider` centralizado (`src/lib/queryClient.js`); 2 hooks migrados como patrón de referencia (`useProveedores` — listado estático, `useVentaLivePolling` — polling 30s con `refetchInterval`/`retry:false`, sin resetear datos en error); `frontend/README.md` nuevo documentando ambos patrones; tests nuevos/actualizados (`ErrorBoundary.test.jsx`, `useVentaLivePolling.test.jsx` con `QueryClientProvider` propio por test), suite frontend 13/13 en verde; `npm run lint`/`npm run build` sin errores nuevos | PR #1 |
| 2026-07-02 | Fase 9 | COMPLETADA — `react-hook-form`/`zod`/`@hookform/resolvers` añadidos; `LoginPage.jsx` migrado (esquema `zod`, `handleSubmit` en `onClick`, `isSubmitting`); segundo caso piloto en `admin/usuarios/UsuariosPage.jsx` (`UsuarioCreateModal`/`UsuarioEditModal`) que además corrige una violación preexistente de `.cursorrules` (`<form onSubmit>` nativo) y migra el toggle "activo" a `Controller` para evitar el aviso `react-hooks/incompatible-library` de `watch()`; 7 tests nuevos (`LoginPage.test.jsx` ×4, `UsuariosPage.test.jsx` ×3); patrón documentado en `frontend/README.md`; suite frontend 20/20 en verde; `npm run lint` (16 errores preexistentes sin cambios, 9 warnings) y `npm run build` sin regresiones | PR #1 |
| 2026-07-02 | Fase 10 | COMPLETADA — 16 routers con `/api` hardcodeado en su propio `APIRouter(prefix=...)` (`auth`, `mesas`, `tpv.py`, `tpv_cobro.py`, `verifactu`, `carta.py` ×2, `admin_carta.py` ×2, `admin_productos`, `admin_usuarios_router`, `admin_recetas`, `admin_recetas_ingredientes`, `admin_gastos_operativos`, `dashboard`, `superadmin_router`) normalizados a prefijo de dominio relativo; `main.py` ahora añade `prefix="/api"` de forma uniforme en las 36 líneas de `include_router(...)` (antes solo ~20 lo tenían explícito). Verificado con volcado de `app.routes` antes/después + `diff`: **0 diferencias** en la superficie pública de la API. Suite backend 40/40 en verde tras el refactor. Decisión documentada de **no** introducir `/api/v1` todavía (único consumidor es el frontend propio) — trigger definido para cuando aparezca un segundo consumidor independiente | PR #1 |
