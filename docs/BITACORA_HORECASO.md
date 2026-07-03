# BITÁCORA HORECASO — Estado real del proyecto
**Última actualización:** 27 de marzo de 2026 (inventario calibración + docs bugs)  
**Generada por:** Cursor leyendo el repo real

---

## 1. ESTADO POR MÓDULO

Criterio: existencia de routers/páginas/API en el código leído; sin asumir que la BD de producción tiene migraciones aplicadas.

| Módulo | Backend | Frontend | Notas |
|--------|---------|----------|-------|
| Auth / Login | ✅ | ✅ | `routers/auth.py`, `AuthContext.jsx`, JWT con `role` y `negocio_id` (nullable si `tenant_id` NULL en fila). |
| Mesas / Sala | ✅ | ✅ | `routers/mesas.py` + `pages/sala/MesasPage.jsx`, `admin/sala/GestionSalaPage.jsx`. |
| TPV | ✅ | ✅ | Paquete `routers/tpv/` (`tpv.py`, `tpv_cobro.py`, …); `TPVPage.jsx`. **No existe** `backend/routers/tpv.py` suelto. |
| Verifactu | ✅ | ⏳ | `verifactu_router` en `main.py`; UI específica no listada en `App.jsx` como ruta dedicada (consulta vía otros flujos/reportes según producto). |
| Carta / Admin carta | ✅ | ✅ | `carta.py`, `admin_carta/`, `pages/admin/carta/CartaPage.jsx`. |
| KDS | ✅ | ✅ | `routers/kds/kds.py`, `kds_estados.py`, `kds_shared.py`. **No existe** `backend/routers/kds.py` suelto. Refinamiento **25/03/2026:** vista por rol (cocina / barra / completa para camarero y gestión), API enriquecida, chips Cocina·Barra y “Ya terminado” en UI — ver §8. |
| Recetas / Escandallos | ✅ | ✅ | `recetas/` + `RecetasPage.jsx` (producto evita término “escandallo” en UI). **27/03/2026 (tarde):** conversión de unidades (kg/g, l/ml) y validación por familia en coste; `recetas_unidades.py`; sidebar **Recetas** y **Costes** separados; página `CostesPage.jsx` (`/admin/costes`); API `GET/POST/DELETE /api/admin/gastos-operativos` + SQL `migration_gastos_operativos.sql` (ejecutar en Supabase para persistir gastos fijos). **27/03/2026 (noche):** si el artículo tiene **calibración útil** en inventario, el coste de ingrediente en semáforo/detalle usa **coste unitario efectivo** (regla de tres); ver §8 y [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md) (MEJ-008). |
| Costes (vista global) | ✅ | ✅ | Router `routers/costes/admin_gastos_operativos.py` registrado en `main.py`. Resumen materias (suma costes receta vía semáforo), enlace nóminas, tabla gastos fijos mensuales (tras migración). |
| Inventario | ✅ | ✅ | `inventario/` + `InventarioPage.jsx`. **27/03/2026 (tarde):** contraste texto en modo oscuro en tablas/`dl` — utilidad `.horeca-body-text` en `index.css` aplicada a tablas del ERP. **27/03/2026 (noche):** cabecera tipo Carta con pestañas **Artículos** \| **Movimientos** \| **Calibración útil**; regla de tres (comprado / útil) sin pedir % a mano; API `PUT /api/inventario/articulos/{id}/calibracion-merma`; columnas `calibracion_comprado`, `calibracion_util` vía `migration_articulos_calibracion_merma.sql` (**obligatoria** tras actualizar backend — ver BUG-013 en bugs). |
| Mermas | ✅ | ✅ | UI `MermasPage.jsx` usa `createMovimiento` / `getMovimientos` (`api.js`) con flujo tipo merma; sin router dedicado `mermas` en grep bajo `backend/routers`. |
| Dashboard | ✅ | ✅ | `dashboard.py` + `DashboardPage.jsx`. |
| Venta Live | ✅ | ✅ | Página `VentaLivePage.jsx`; datos vía API de dashboard/actividad (detalle en routers de analytics/dashboard). |
| Proveedores | ✅ | ✅ | `proveedores/` + `ProveedoresPage.jsx`. |
| Facturas proveedor + IA | ✅ | ✅ | `facturas_proveedor` + `FacturasPage.jsx`; escaneo IA en submódulos proveedores. |
| Empleados | ✅ | ✅ | `empleados/` + `EmpleadosPage.jsx`. |
| Nóminas | ✅ | ✅ | `nominas.py` + `NominasPage.jsx`. |
| Reservas | ✅ | ✅ | `reservas/` + `lista_espera` + `ReservasPage.jsx`. |
| Clientes | ✅ | ✅ | `clientes/` + `ClientesPage.jsx`. |
| Reportes PDF | ✅ | ✅ | `reportes/reportes.py` + `ReportesPage.jsx`; servicios `pdf_*` en `backend/services/`. |
| Analytics avanzado | ✅ | ✅ | `analytics_*` routers + `AnalyticsPage.jsx`. **IA previsión** u otros ítems roadmap: no verificados aquí como endpoints separados. |
| Superadmin (Fase B) | ✅ | ✅ | **Backend (26/03):** JWT + `routers/superadmin/`. **Frontend (26/03):** `pages/superadmin/` — listado tenants, detalle + activar/desactivar con modal, logs con filtro fecha; rutas bajo `/superadmin/*`, guard `PrivateRoute` + `allowedRoles: ['superadmin']`; `api.js` (`getSuperadminTenants`, …); `navConfig` `SUPERADMIN_NAV_ITEMS` + `SidebarNav` solo plataforma si `rol === 'superadmin'`. BD: `migration_fase_b.sql` en Supabase. Ver §8. |
| Admin usuarios (Fase B) | ✅ | ✅ | **Backend (26/03):** `routers/admin_usuarios/`. **Frontend (26/03):** `pages/admin/usuarios/UsuariosPage.jsx`, ruta `/admin/usuarios` con `AdminOnlyRoute` (`rol === 'admin'`); `api.js` (`getAdminUsuarios`, `createAdminUsuario`, `patchAdminUsuario`); ítem `navConfig` solo `admin`. Outlets en formulario: derivados de `GET /mesas` (únicos `outlet_id`). Ver §8. |
| FIFO inventario | ✅ | ✅ | `fifo/` + `FIFOPage.jsx`. |
| APPCC | ✅ | ✅ | `appcc.py` + `APPCCPage.jsx`. |

---

## 2. ROUTERS REGISTRADOS EN main.py

Origen: `app.include_router(...)` en `backend/main.py` (función `create_app`). El **prefijo efectivo** es la suma del `prefix` del `include_router` en `main` más el `prefix` del `APIRouter` en cada módulo (cuando existe). Donde el router ya define `/api/...`, no se añade otro prefijo en `main` salvo lo indicado.

| Línea aprox. | Variable | Prefijo en `main` | Prefijo en router / nota | Base efectiva (ejemplos) |
|--------------|----------|-------------------|---------------------------|---------------------------|
| 133 | `auth_router` | — | `/api/auth` | `/api/auth/login`, `/api/auth/perfil` |
| 134 | `mesas_router` | — | `/api/mesas` | `/api/mesas`, … |
| 135 | `tpv_router` | — | `/api/tpv` | `/api/tpv/...` |
| 136 | `tpv_cobro_router` | — | `/api/tpv` | Mismo prefijo; rutas de cobro bajo `/api/tpv` |
| 137 | `verifactu_router` | — | `/api/verifactu` | … |
| 138 | `carta_tpv_router` | — | (sub-router en `carta.py`) | Rutas bajo `/api/tpv` y relacionadas carta TPV |
| 139 | `carta_publica_router` | — | (sub-router en `carta.py`) | Carta pública |
| 140 | `admin_carta_router` | — | `/api/admin` | Categorías, … |
| 141 | `admin_productos_router` | — | `/api/admin` | Productos admin |
| 162 | `admin_usuarios_router` | — | `/api/admin` | `GET/POST /usuarios`, `PATCH /usuarios/{id}` — ver §8 |
| 163 | `alergenos_router` | — | según `admin_carta` (p. ej. `/api`) | Alérgenos |
| 164 | `admin_recetas_router` | — | `/api/admin` | Recetas |
| 165–166 | `admin_recetas_ingredientes_router` | — | `/api/admin` | Ingredientes / coste / semáforo (cálculo coste con conversión de unidades desde 27/03/2026 tarde) |
| *(tras recetas)* | `admin_gastos_operativos_router` | — | `/api/admin` | `GET/POST/DELETE /gastos-operativos` — gastos fijos mensuales por tenant |
| 166–167 | `inventario_router` | `prefix="/api"` | `/inventario` | `/api/inventario/...` |
| 167–168 | `inventario_movimientos_router` | `prefix="/api"` | `/inventario` o subrutas del módulo | Movimientos, alertas, … |
| 168–169 | `kds_router` | `prefix="/api"` | `/kds` | `/api/kds/...` |
| 169–170 | `kds_estados_router` | `prefix="/api"` | `/kds` | Estados líneas KDS |
| 170 | `dashboard_router` | — | `/api/dashboard` | Director, cierre |
| 171–173 | `analytics_*_router` (×3) | `prefix="/api"` | `/dashboard` (interno en analytics) | `/api/dashboard/rentabilidad-mesas`, … |
| 174–175 | `proveedores_router`, `facturas_proveedor_router` | `prefix="/api"` | rutas absolutas `/api/...` en paths | `/api/proveedores`, `/api/facturas-proveedor`, … |
| 176–179 | `empleados`, `fichajes`, `cuadrantes`, `ausencias` | `prefix="/api"` | `/empleados`, `/turnos`, `/cuadrantes`, `/ausencias` | `/api/empleados`, `/api/turnos/...`, … |
| 180 | `nominas_router` | `prefix="/api"` | `/nominas` | `/api/nominas/...` |
| 181–182 | `reservas_router`, `lista_espera_router` | `prefix="/api"` | `/reservas`, lista espera | `/api/reservas`, `/api/lista-espera`, … |
| 183–184 | `clientes_router`, `clientes_historial_router` | `prefix="/api"` | `/clientes` | `/api/clientes`, … |
| 185 | `appcc_router` | `prefix="/api"` | `/appcc` | `/api/appcc/...` |
| 186–187 | `fifo_router`, `fifo_consumo_router` | `prefix="/api"` | `/fifo` | `/api/fifo/...` |
| 188 | `reportes_router` | `prefix="/api"` | `/reportes` | PDFs vía `/api/reportes/...` |
| 189 | `superadmin_router` | — | `/api/superadmin` en el `APIRouter` | `/api/superadmin/tenants`, `/api/superadmin/platform-logs`, … |

**Endpoint adicional:** `GET /api/health` definido en `create_app` sobre `app`, no vía `include_router`.

---

## 3. RUTAS FRONTEND EN App.jsx

Archivo: `frontend/src/App.jsx`. Guards tal como están en el código.

| Ruta | Componente / elemento | Guard de rol (resumen) |
|------|------------------------|-------------------------|
| `/` | `<Navigate to="/mesas" />` | — |
| `/login` | `LoginPage` | Público |
| `/superadmin` | `<Navigate to="/superadmin/tenants" />` (index) | `PrivateRoute` + `allowedRoles`: **superadmin**; layout `SuperadminLayout` |
| `/superadmin/tenants` | `TenantsListPage` | Mismo grupo |
| `/superadmin/tenants/:id` | `TenantDetailPage` | Mismo grupo |
| `/superadmin/logs` | `PlatformLogsPage` | Mismo grupo |
| `/kds` | `KDSPage` | `PrivateRoute` con `allowedRoles`: admin, director, jefe_sala, camarero, cocina, barra |
| *(grupo)* | `PrivateRoute` (sin `allowedRoles`) + `AppLayout` | Cualquier usuario **autenticado** |
| `/mesas` | `MesasPage` | Solo autenticación (dentro del grupo anterior) |
| `/admin/sala` | `GestionSalaPage` | `AdminDirectorJefeSalaRoute`: admin, director, jefe_sala |
| `/dashboard` | `DashboardPage` | Solo autenticación (sin `allowedRoles` extra en la `Route`) |
| `/analytics` | `AnalyticsPage` | Solo autenticación |
| `/venta-live` | `VentaLivePage` | Solo autenticación |
| `/inventario`, `/inventario/mermas` | `InventarioPage`, `MermasPage` | `InventarioRoute`: admin, director, almacen, cocina |
| `/appcc` | `APPCCPage` | Solo autenticación |
| `/fifo` | `FIFOPage` | Solo autenticación |
| `/proveedores`, `/proveedores/facturas` | `ProveedoresPage`, `FacturasProveedorPage` | `ProveedoresRoute`: admin, director, almacen, cocina |
| `/admin/carta` | `CartaPage` | `AdminDirectorRoute`: admin, director |
| `/admin/usuarios` | `UsuariosPage` | `AdminOnlyRoute`: **solo admin** |
| `/admin/recetas` | `RecetasPage` | `AdminDirectorCocinaRoute`: admin, director, cocina |
| `/admin/costes` | `CostesPage` | `AdminDirectorCocinaRoute`: admin, director, cocina |
| `/empleados` | `EmpleadosPage` | Solo autenticación |
| `/fichajes` | `FichajesPage` | Solo autenticación |
| `/cuadrante` | `CuadrantePage` | Solo autenticación |
| `/nominas` | `NominasPage` | Solo autenticación |
| `/reservas` | `ReservasPage` | Solo autenticación |
| `/clientes` | `ClientesPage` | Solo autenticación |
| `/reportes` | `ReportesPage` | Solo autenticación |
| `/tpv/:mesaId` | `TPVPage` | `PrivateRoute` sin `AppLayout` (mismo grupo autenticado) |

**Observación:** Varias rutas sensibles (dashboard, analytics, RRHH, etc.) **no** tienen `allowedRoles` en `App.jsx`; el filtrado puede depender del menú (`navConfig`) y de la API (403). Esto es comportamiento **real del archivo**, no una recomendación.

**Exportado y no usado en rutas:** `ModulePlaceholder` está definido pero **no** aparece en ningún `<Route>` del fragmento leído.

---

## 4. MIGRACIONES SQL EJECUTADAS

Solo se listan archivos presentes en `backend/sql/` y referencias en documentación/código. **El repo no indica** si ya se ejecutaron en Supabase.

| Archivo | Contenido / menciones |
|---------|------------------------|
| `backend/sql/migration_kds_barra_destino.sql` | `destino_kds`, columnas barra en líneas, rol barra. **BUG-008** marcado resuelto en `BUGS_Y_SOLUCIONES.md` tras aplicación en Supabase (25/03/2026). |
| `backend/sql/migration_fase_b.sql` | Fase B: CHECK `rol`, `tenant_id` nullable, `platform_logs`, `tenant_audit_log`, `usuario_permisos`, superadmin seed, tenant prueba. Cabecera: ejecutar tras `generate_test_hashes.py` y pegar hashes. |
| `backend/sql/migration_gastos_operativos.sql` | Tabla `gastos_operativos` (gastos fijos mensuales por tenant). **Requerida** para que `POST /api/admin/gastos-operativos` persista datos; sin ejecutarla, la API responde 503 con mensaje orientativo. |

**No encontrado en `backend/sql/`:** `seed_restauranteprueba.sql` como archivo separado (el PRD Fase B lo menciona; el seed de prueba está **integrado** en `migration_fase_b.sql` según ese archivo).

**`SCHEMA_BASE_DATOS.md`:** documenta tablas (incl. `platform_logs` etiquetada como Fase B); actualizado manualmente según su propia cabecera — **no prueba** por sí solo que una migración se haya ejecutado en la instancia Supabase del desarrollador.

---

## 5. LO QUE FALTA PARA FASE B (superadmin)

Referencia: [GUIA_PRODUCCION_COMPLETA.md](GUIA_PRODUCCION_COMPLETA.md) Anexo A + `STEP_HORECASO.md` (Fase B). Estado **repo** (archivos / código), no BD remota.

| Entregable | Estado repo | Notas |
|------------|-------------|--------|
| SQL: CHECK `rol` + `superadmin`, `tenant_id` nullable | [x] Archivo existe | `backend/sql/migration_fase_b.sql` |
| Tablas `platform_logs`, `tenant_audit_log`, `usuario_permisos` | [x] En ese SQL | Ejecución en Supabase: **no verificable desde git** |
| Usuario `superadmin@horecaso.com` en SQL | [x] En `migration_fase_b.sql` | Requiere sustituir placeholder de hash |
| `backend/sql/seed_restauranteprueba.sql` separado | [ ] **No encontrado** | PRD lo menciona; seed embebido en `migration_fase_b.sql` |
| `backend/scripts/generate_test_hashes.py` | [x] Existe | Ruta usada en comentarios del SQL |
| Router `/api/superadmin` | [x] Implementado (26/03) | `routers/superadmin/superadmin_router.py` + `include_router` sin prefijo extra en `main.py` |
| Router `/api/admin/usuarios` | [x] Implementado (26/03) | `routers/admin_usuarios/` — `Depends(require_roles(['admin']))`, tenant desde JWT; ver §8 |
| Frontend `pages/superadmin/` | [x] Implementado (26/03) | `SuperadminLayout`, `TenantsListPage`, `TenantDetailPage`, `PlatformLogsPage`; rutas en `App.jsx` |
| Frontend `pages/admin/usuarios/` | [x] Implementado (26/03) | `UsuariosPage.jsx`, `App.jsx`, `navConfig` |
| `navConfig` entradas superadmin | [x] Implementado (26/03) | `SUPERADMIN_NAV_ITEMS` + `SidebarNav`: si `rol === 'superadmin'`, solo enlaces plataforma |
| Login JWT para `superadmin` | [x] Implementado (26/03) | `auth.py`: rama `rol == superadmin` → claims `tenant_id`/`negocio_id` null; `jwt_handler.verify_token` normaliza; `require_superadmin` en `dependencies.py`. Convivencia: sin cambios en routers existentes; validar E2E tras SQL Fase B en BD. |

---

## 6. DECISIONES TÉCNICAS TOMADAS

Hallazgos en código leído que actúan como convenciones o workarounds (resumen):

| Dónde | Decisión |
|-------|----------|
| `backend/main.py` (inicio) | Shim `bcrypt.__about__ = bcrypt` **antes** de importar passlib — compatibilidad bcrypt 4.x con passlib 1.7.4. |
| `backend/main.py` | `FastAPI(..., redirect_slashes=False)` — evita redirecciones 307 en clientes que llaman con/sin barra final. |
| `backend/main.py` | `SlowAPIMiddleware` + `Limiter` global; CORS según `settings.allowed_origins_list`. |
| `backend/main.py` | `@app.exception_handler(Exception)` devuelve JSON 500 genérico; `HTTPException` se re-lanza. |
| `backend/auth/jwt_handler.py` | JWT con `jose.jwt`, expiración desde `settings.ACCESS_TOKEN_EXPIRE_MINUTES`. **Superadmin:** tras decode, `setdefault` de `tenant_id` y `negocio_id` a `None`. |
| `backend/routers/auth.py` | Payload token: `sub`, `user_id`, `role` (desde `usuarios.rol`). **Tenant:** `negocio_id` = UUID tenant o `None`. **Superadmin:** además `tenant_id` y `negocio_id` explícitos `None` en JWT. |
| `backend/auth/dependencies.py` | RBAC vía `current_user.get("role")` en `require_roles`; alias `require_superadmin` en `routers/superadmin/`; `require_roles(['admin'])` en `routers/admin_usuarios/`. |
| `frontend/src/context/AuthContext.jsx` | Tras login, posible `POST /turnos/fichaje-entrada` automático según roles y preferencia `horecaso_fichar_al_login`. |
| `frontend/src/pages/superadmin/` + `App.jsx` | Panel plataforma fuera de `AppLayout`; `PrivateRoute` con `allowedRoles={['superadmin']}`; menú lateral en `SuperadminLayout`; `SidebarNav` sustituye ítems por `SUPERADMIN_NAV_ITEMS` cuando `user.rol === 'superadmin'`. |

Detalle adicional: **`.cursorrules`** fija stack (FastAPI, asyncpg, sin ORM, Decimal, Tailwind, lucide, polling 30s, etc.) — fuente normativa para futuros cambios.

---

## 7. PRÓXIMOS PASOS RECOMENDADOS

**Convención para avanzar:** al retomar el proyecto o abrir un nuevo hilo con el agente, **leer (o pedir explícitamente que se lean)** los `.md` de referencia: esta bitácora, [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md), [STEP_HORECASO.md](STEP_HORECASO.md), [SCHEMA_BASE_DATOS.md](SCHEMA_BASE_DATOS.md), [GUIA_PRODUCCION_COMPLETA.md](GUIA_PRODUCCION_COMPLETA.md) (incl. Anexo A para Fase B) y `PRD_HorecaSO.md` donde aplique. Así se evita desalineación entre código, BD y documentación.

Orden sugerido **solo desde el estado del repo** (sin romper flujos actuales):

1. **Supabase:** Migración KDS (`migration_kds_barra_destino.sql`) aplicada en instancia de desarrollo; BUG-008 cerrado en docs. Revalidar en **cada** entorno antes de producción.  
2. **Supabase:** Ejecutar `migration_fase_b.sql` tras generar y pegar hashes reales (`backend/scripts/generate_test_hashes.py`). Con MCP **sin** `--read-only` (ver §8, BUG-009), se puede usar `apply_migration` / SQL Editor; recargar MCP tras editar `.cursor/mcp.json`.  
3. **Backend:** Routers `superadmin/` y `admin_usuarios/` registrados. **Pendiente:** más endpoints superadmin si el PRD lo amplía.  
4. **Backend:** En endpoints superadmin, no filtrar por `tenant_id` del JWT como un usuario restaurante; endpoints tenant siguen filtrando por `negocio_id` / `tenant_id` del token cuando exista.  
5. **Frontend:** Rutas `superadmin` y `/admin/usuarios` en `App.jsx` + `navConfig.js` (hecho).  
6. **Frontend (opcional endurecimiento):** Revisar rutas que hoy solo exigen “autenticado” y alinear con roles de negocio si el producto lo exige.  
7. **Documentación:** Tras cambios, actualizar `STEP_HORECASO.md`, `ARQUITECTURA_HORECASO.md` y `SCHEMA_BASE_DATOS.md` si la BD cambia.

---

## 8. REGISTRO BREVE (docs)

### 02/07/2026 — **PRD.md hardening senior — Fase 11 (Stripe Billing SaaS)**

- **Decisión de producto (ya reflejada en el PRD antes de ejecutar):** cobrar a los **tenants** (restaurantes clientes de HorecaSO) por su plan de suscripción vía Stripe Billing, no a los clientes finales de cada restaurante. `tenants.plan` deja de ser un campo administrado a mano por superadmin y pasa a sincronizarse desde los webhooks de Stripe.
- **Backend — esquema:** migración `backend/sql/migrations/0006_stripe_billing.sql` — `tenants` gana `stripe_customer_id`, `stripe_subscription_id`, `subscription_status` (`CHECK` con los 6 estados válidos de Stripe + `NULL` para tenants "grandfathered"), `current_period_end`, `plan_price_id`; tabla nueva `billing_events` (`stripe_event_id UNIQUE`) para idempotencia de webhooks. `backend/tests/schema_test.sql` actualizado con las mismas columnas/tabla + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (ver BUG-016 en `BUGS_Y_SOLUCIONES.md` — el `CREATE TABLE IF NOT EXISTS` original no bastaba porque `horecaso_test` ya existía de sesiones anteriores).
- **Backend — router `billing.py` (nuevo):** `GET /billing/estado` (plan + estado de suscripción del tenant del usuario), `POST /billing/checkout-session` (crea `Customer` de Stripe si no existe + `checkout.Session` en modo `subscription`, devuelve `checkout_url`), `POST /billing/portal-session` (`billing_portal.Session`, devuelve `portal_url`), `POST /billing/webhook` (público, verificación `stripe-signature` + `STRIPE_WEBHOOK_SECRET`, inserta en `billing_events` con `ON CONFLICT (stripe_event_id) DO NOTHING` antes de aplicar el efecto — reenvíos de Stripe no duplican cambios de estado).
- **Backend — enforcement:** `require_active_subscription()` nueva en `auth/dependencies.py`, aplicada como dependencia de **router** (no por endpoint) en `main.py` sobre todos los routers operativos del tenant; excluidos explícitamente `auth_router`, `billing_router`, `carta_publica_router` y `superadmin_router` para no romper login, el propio flujo de pago, el menú público sin JWT, ni la gestión de plataforma. Bloquea con `402 Payment Required` si `subscription_status` es `canceled`/`unpaid`/`incomplete`, o `past_due` más allá de `SUBSCRIPTION_GRACE_PERIOD_DAYS = 7` días desde `current_period_end`. Tenants con `subscription_status IS NULL` (el tenant demo y cualquier tenant creado antes de esta fase) **no se bloquean** — decisión explícita para no romper datos existentes.
- **Backend — config:** `FRONTEND_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_BASICO/PROFESIONAL/PREMIUM/ENTERPRISE` en `config.py` (+ `.env.example`) y propiedad `stripe_price_por_plan` para mapear plan → `price_id`. Dependencia `stripe==11.6.0` en `requirements.txt`.
- **Backend — tests (`test_billing.py`, nuevo):** SDK de Stripe **mockeado por completo** (`stripe.Customer.create`, `stripe.checkout.Session.create`, `stripe.billing_portal.Session.create`, `stripe.Webhook.construct_event`) — la suite corre sin ninguna credencial real de Stripe. Cobertura: checkout-session (cliente nuevo/existente, plan sin `price_id`, autorización por rol), portal-session, cada tipo de evento del webhook, idempotencia con evento duplicado, y todas las combinaciones de `require_active_subscription` (bloqueado/permitido por estado, grace period, grandfathered `NULL`, exención `superadmin`, accesibilidad de `auth`/`billing` sin depender del estado de suscripción). Suite completa: **59/59 backend en verde**.
- **Frontend — página `/facturacion` (nueva, `pages/admin/facturacion/FacturacionPage.jsx`, roles `admin`/`director`):** plan actual + badge de estado (`active`/`trialing`/`past_due`/`canceled`/`unpaid`/`incomplete`/sin suscripción), banner de aviso si `past_due` (margen de gracia) o bloqueado, grid con los 4 planes y botón "Elegir plan" por cada uno (→ `checkout-session` → `window.location.href` a Stripe), botón "Gestionar facturación" (→ `portal-session`, deshabilitado si el tenant aún no tiene `stripe_customer_id`), y manejo de los query params `?checkout=success|cancel` que Stripe añade al volver del Checkout (con reintento de carga a los 3s para dar tiempo al webhook). Entrada de sidebar añadida en `navConfig.js` (icono `CreditCard`, roles `admin`/`director`). Helpers `getBillingEstado`/`createBillingCheckoutSession`/`createBillingPortalSession` en `services/api.js`.
- **Frontend — tests:** `FacturacionPage.test.jsx` (Vitest + `MemoryRouter`) — 5 tests: plan/estado mostrado, banner `past_due`, botón de portal deshabilitado sin `stripe_customer_id`, selección de plan crea la checkout session y redirige, feedback al volver con `?checkout=success`. Suite completa frontend: **25/25 en verde**. `npm run build` y `npx eslint .` sin problemas nuevos (mismos 26 problemas preexistentes de antes de esta fase, verificado con `git stash`/`git stash pop`).
- **Alta de tenant nuevo — decisión tomada (no había flujo que tocar):** se auditó `superadmin_router.py` y no existe ningún endpoint de creación de tenant (se provisionan por SQL/soporte manual); por tanto no se construyó un flujo nuevo de alta de tenant en esta fase (habría sido una feature nueva fuera del alcance real de "Stripe Billing"). Documentado en `docs/GUIA_PRODUCCION_COMPLETA.md` §1.9: un tenant recién provisionado nace con `subscription_status = NULL` (grandfathered) hasta que complete un checkout desde `/facturacion`; si en el futuro se construye alta self-service, debe dejar `NULL` al crear (no asumir `trialing` sin `Subscription` real).
- **Documentación:** `README.md` — nueva sección `## 💳 Stripe Billing (SaaS subscriptions)` con instrucciones de Stripe CLI para webhooks locales, tabla de variables de entorno ampliada, y nota de producción en la sección de Deploy (Render). `docs/GUIA_PRODUCCION_COMPLETA.md` — nueva sección `## 1.9 Facturación SaaS: Stripe Billing (Fase 11)` con el detalle completo (esquema, enforcement, variables, Stripe CLI, producción, decisión de alta de tenant, alcance de las pruebas). `docs/BUGS_Y_SOLUCIONES.md` — `BUG-016` (schema drift en `schema_test.sql` al añadir columnas a una tabla ya existente en la BD de test persistida).
- **Limitación honesta de esta fase:** no hay cuenta Stripe real ni credenciales disponibles en este entorno de agente cloud, así que **no se ejecutó un checkout real de extremo a extremo** (tarjeta `4242 4242 4242 4242` contra Stripe test-mode) ni se probó el webhook con Stripe CLI contra un backend en marcha. Todo lo que se puede verificar sin credenciales reales (código, migración, enforcement, idempotencia, UI) está implementado y cubierto por tests mockeados; el smoke test real con Stripe queda documentado paso a paso para quien tenga (o añada como secreto de Cursor Dashboard) una cuenta Stripe de test.
- **Resultado:** OK. `PRD.md` Fase 11 marcada COMPLETADA con la salvedad anterior documentada explícitamente en sus criterios de aceptación.

### 02/07/2026 — **PRD.md hardening senior — Fase 10 (Consistencia de API)**

- **Problema detectado en la auditoría:** 16 routers definían su prefijo de dominio con `/api` ya incluido dentro del propio `APIRouter(prefix=...)` (`routers/auth.py`, `routers/mesas.py`, `routers/tpv/tpv.py`, `routers/tpv/tpv_cobro.py`, `routers/verifactu.py`, `routers/carta.py` — sus dos routers `router_tpv`/`router_publica` —, `routers/admin_carta/admin_carta.py` — sus dos routers `router`/`router_alergenos` —, `routers/admin_carta/admin_productos.py`, `routers/admin_usuarios/admin_usuarios_router.py`, `routers/recetas/admin_recetas.py`, `routers/recetas/admin_recetas_ingredientes.py`, `routers/costes/admin_gastos_operativos.py`, `routers/dashboard.py`, `routers/superadmin/superadmin_router.py`) y se registraban en `backend/main.py` con `app.include_router(router)` **sin** el argumento `prefix`. El resto (~20 routers: `inventario`, `kds`, `analytics_*`, `proveedores`, `empleados`/`fichajes`/`cuadrantes`/`ausencias`, `nominas`, `reservas`, `lista_espera`, `clientes`, `appcc`, `fifo`, `reportes`) ya seguía el patrón recomendado por el PRD: prefijo de dominio relativo (p. ej. `/inventario`, `/reservas`) + `app.include_router(router, prefix="/api")` explícito en `main.py`. Ambos grupos producían las mismas URLs finales, pero la inconsistencia de código es justo el riesgo que señala el PRD para quien añada un router nuevo sin saber qué convención tocaba seguir.
- **Cambio aplicado:** se quitó el `/api` hardcodeado de los 16 routers del primer grupo (`/api/auth` → `/auth`, `/api/mesas` → `/mesas`, `/api/tpv` → `/tpv` ×3 routers distintos que comparten ese prefijo de dominio, `/api/verifactu` → `/verifactu`, `/api/carta` → `/carta`, `/api/admin` → `/admin` ×6 routers, `router_alergenos` de `prefix="/api"` a sin prefijo — su único endpoint ya se declara como `/alergenos`, `/api/dashboard` → `/dashboard`, `/api/superadmin` → `/superadmin`), y se añadió `prefix="/api"` a esas 16 líneas de `include_router(...)` en `main.py`. Resultado: **las 36 líneas** de `include_router(...)` en `main.py` quedan con `prefix="/api"` de forma uniforme, con un comentario explicando la convención para futuros routers.
- **Verificación de no-regresión (crítica en esta fase, ya que no hay cambio de lógica de negocio, solo de "plumbing"):** script ad hoc que instancia `create_app()` (con `DATABASE_URL`/`SECRET_KEY_AUTH` dummy, ya que el pool no se levanta hasta el `lifespan`) y vuelca `(path, methods)` de `app.routes`, ordenado y deduplicado. Se generó el volcado **antes** del cambio (con `git stash`) y **después**, y se comparó con `diff`: **0 líneas de diferencia** — la superficie de API pública es idéntica byte a byte a la de antes de la fase. Suite de tests backend completa ejecutada contra Postgres real tras el refactor: **40/40 en verde**.
- **`frontend/src/services/api.js`:** sin cambios — ya usaba rutas relativas (`/auth/login`, `/mesas`, `/admin/categorias`, `/tpv/carta`, etc.) sobre un `baseURL` de `/api`, que es exactamente el contrato final que se mantiene tras el refactor.
- **`docs/REFERENCIA_TECNICA.md`:** revisado — el mapa de endpoints documentado ya reflejaba las URLs finales reales (que no cambiaron), por lo que no requirió cambios de contenido en esta fase.
- **Decisión sobre `/api/v1` (evaluada, no implementada):** se documenta en `PRD.md` que **no** se introduce versionado de API todavía porque el único consumidor de la API hoy es el frontend propio del monorepo (desplegado junto con el backend, sin apps móviles ni integraciones de terceros). Se define el trigger para reconsiderarlo: aparición de un segundo consumidor con ciclo de despliegue independiente, o necesidad de introducir un cambio incompatible en un endpoint ya usado en producción.
- **Resultado:** OK. `PRD.md` Fase 10 marcada COMPLETADA.

### 02/07/2026 — **PRD.md hardening senior — Fase 9 (Formularios y validación)**

- **`react-hook-form@^7.80.0`, `zod@^4.4.3`, `@hookform/resolvers@^5.4.0`** añadidos a `frontend/package.json`.
- **`frontend/src/pages/LoginPage.jsx` (caso piloto 1):** esquema `loginSchema` (`email` con `.trim().min(1).email()`, `password` con `.min(1)`); `useForm({ resolver: zodResolver(loginSchema) })`; el botón "Entrar" pasa de `onClick={handleEntrar}` (validación manual con `if (!email.trim() || !password) setError(...)`) a `onClick={handleSubmit(onSubmit)}`; los `<input>` usan `{...register('email')}`/`{...register('password')}` en vez de `value`/`onChange` controlados a mano; `formState.isSubmitting` sustituye al `useState(false)` de loading del botón. El login con cuentas demo (`handleDemoLogin`) sigue como flujo aparte — usa `setValue('email', ...)`/`setValue('password', ...)` para reflejar las credenciales en el formulario visualmente, pero no pasa por la validación de `zod` (son credenciales ya conocidas y correctas, no entrada libre del usuario).
- **`frontend/src/pages/admin/usuarios/UsuariosPage.jsx` (caso piloto 2, `UsuarioCreateModal`/`UsuarioEditModal`):** dos esquemas `zod` (`usuarioCreateSchema` con `password.min(8, ...)`; `usuarioEditSchema` sin contraseña ni email, ya que el email "no se puede cambiar desde aquí" según el propio texto de la UI). **Bug de estilo preexistente corregido de paso:** ambos modales usaban `<form onSubmit={(e) => { e.preventDefault(); ... }}>` — una violación directa de `.cursorrules` ("NUNCA `<form>` con submit — usar onClick handlers") que llevaba ahí desde antes de este PRD. Se sustituyó por un `<div>` con el botón de guardar en `type="button"` + `onClick={handleSubmit(submit)}`.
- **Detalle técnico — toggle "Usuario activo":** es un `<button role="switch">` a medida, no un `<input type="checkbox">`. El primer intento leyó su valor con `watch('activo')` de `react-hook-form`, pero `npx eslint` señaló un nuevo warning `react-hooks/incompatible-library` ("React Hook Form's `watch()` function which cannot be memoized safely"). Se sustituyó por `<Controller name="activo" control={control} render={({field}) => ...}>`, que sí es compatible con esa regla — tras el cambio, `UsuariosPage.jsx` queda con **cero** errores/warnings de lint. Se añadió también `aria-label="Usuario activo"` al botón del switch (antes solo tenía un `<span>` hermano con el texto, sin relación de accesibilidad explícita) para poder testear con `getByRole('switch', {name: ...})`.
- **Tests nuevos:** `frontend/src/pages/LoginPage.test.jsx` (4 tests: errores de `zod` con campos vacíos sin llamar a `login()`, error de formato si el email no es válido, `login()` se llama con los datos correctos y navega a `/mesas` tras un submit válido, un error de la API se muestra sin romper el formulario) y `frontend/src/pages/admin/usuarios/UsuariosPage.test.jsx` (3 tests: errores de validación bloquean el `POST` a `createAdminUsuario`, un alta válida llama a `createAdminUsuario` con el payload exacto esperado, el toggle "Usuario activo" parte de `aria-checked="true"`, cambia a `"false"` al pulsarlo y ese valor llega correctamente al `PATCH`). Suite completa frontend: **20/20 en verde**.
- **`frontend/README.md`:** nueva sección "Formularios con react-hook-form + zod" con el patrón completo (esquema + `useForm` + `register` + botón `onClick={handleSubmit(onSubmit)}`), y una nota explícita sobre cuándo usar `Controller` en vez de `watch()` para controles a medida.
- **Verificación:** `npm run lint` → 16 errores preexistentes sin cambios (mismo número que al cierre de la Fase 8), 9 warnings (sin warnings nuevos, gracias al cambio a `Controller`); `npm run build` sin errores.
- **Resultado:** OK. `PRD.md` Fase 9 marcada COMPLETADA.

### 02/07/2026 — **PRD.md hardening senior — Fase 8 (Resiliencia y performance frontend)**

- **`frontend/src/components/shared/ErrorBoundary.jsx` (nuevo):** componente de clase (`getDerivedStateFromError`/`componentDidCatch`) con pantalla de fallback consistente con el design system (dark/light, icono `AlertTriangle`, botón "Recargar página" que resetea el estado del boundary y hace `window.location.reload()`). Envuelve **todo** el árbol en `App.jsx` — fuera de `QueryClientProvider`/`ThemeProvider`/`AuthProvider`, para que un fallo en cualquiera de esos providers también quede cubierto en vez de dejar pantalla en blanco.
- **`frontend/src/App.jsx`:** las ~30 páginas pasan de `import` estático a `React.lazy(() => import(...))`; `<Routes>` envuelto en `<Suspense fallback={<Loader />}>`. Verificado con `npm run build` que cada página genera su propio chunk (`TPVPage-*.js`, `KDSPage-*.js`, `DashboardPage-*.js`, `LoginPage-*.js`, etc.) en vez de un único bundle monolítico — el aviso de Vite sobre bundle >500KB que quedó pendiente desde la Fase 0 se debe ahora casi en su totalidad al chunk de vendor de `index-*.js` (~280KB) e iconos (`createLucideIcon-*.js`, ~51KB compartido), no a código de páginas.
- **`@tanstack/react-query@^5.101.2`** añadido a `frontend/package.json`. **`frontend/src/lib/queryClient.js`** (nuevo): instancia única de `QueryClient` con defaults pensados para el proyecto (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 10s`). `<QueryClientProvider>` añadido en `App.jsx`.
- **Dos hooks migrados como prueba de patrón** (no se migró el 100% de los hooks — explícitamente fuera de alcance de esta fase):
  - `src/pages/proveedores/hooks/useProveedores.js` (listado "estático"): `useQuery` con `queryKey: ['proveedores', {buscar, soloActivos}]`; las mutaciones (crear/editar/borrar) siguen siendo llamadas `api.*` normales seguidas de `queryClient.invalidateQueries({queryKey: ['proveedores']})` en vez de una función `cargar()` que releía manualmente el estado. El shape de retorno del hook (`proveedores`, `loading`, `error`, `cargar`, ...) no cambió, así que `ProveedoresPage.jsx` no requirió ningún cambio.
  - `src/pages/director/hooks/useVentaLivePolling.js` (polling cada 30s — regla `.cursorrules`): `useQuery` con `refetchInterval: 30000` y `retry: false` sustituye al `setInterval` manual; React Query mantiene `dashboard`/`mesas`/`ticketsDia` intactos cuando un refetch en background falla (comportamiento por defecto de la librería, sin lógica adicional necesaria — a diferencia del `useState` manual anterior, donde había que evitar explícitamente pisar el estado en el `catch`). El panel de detalle de ticket se migró a un segundo `useQuery` (`queryKey: ['ticket-detalle', panelTicketId]`, `enabled` solo con el panel abierto).
- **Tests:** `frontend/src/components/shared/ErrorBoundary.test.jsx` (nuevo) fuerza un error de render con un componente `Boom` y verifica que se muestra el fallback (`"Algo ha ido mal"` + botón "Recargar página") en vez de una pantalla en blanco. `useVentaLivePolling.test.js` renombrado a **`useVentaLivePolling.test.jsx`** (Vitest no transforma JSX en archivos `.js` sin config adicional — necesario para el wrapper `<QueryClientProvider>` del test) y actualizado para envolver `renderHook` en un `QueryClient` propio por test (aislamiento de caché); los dos tests existentes (carga inicial, "no resetear datos en error de polling") siguen en verde sin cambiar sus aserciones. Suite completa frontend: **13/13 en verde**.
- **`frontend/README.md` (nuevo):** documenta los dos patrones de referencia (listado estático y polling) con ejemplos de código, el motivo de cada opción de configuración (`retry: false`, `refetchInterval`, `staleTime`, etc.), y cómo testear hooks que usan `useQuery` con un `QueryClient` aislado por test.
- **Lint:** `npm run lint` verificado sin errores nuevos (16 errores preexistentes, sin cambios respecto a la rama base antes de esta fase). Se corrigió en el propio `useVentaLivePolling.js` un patrón de `setState` síncrono dentro de un efecto (rama que reseteaba `panelAnimIn` a `false` al cerrar el panel) que la regla de pureza más reciente de `eslint-plugin-react-hooks` (v7) señalaba como error nuevo al reordenar los hooks del archivo — el reset ya lo hacía explícitamente `cerrarPanel()`, así que la rama del efecto era redundante y se eliminó.
- **Resultado:** OK. `PRD.md` Fase 8 marcada COMPLETADA.

### 02/07/2026 — **PRD.md hardening senior — Fase 7 (Observabilidad)**

- **`backend/observability.py` (nuevo):** `configure_logging()` sustituye `logging.basicConfig` por logs JSON estructurados (`python-json-logger`, campos `timestamp`/`level`/`logger`/`request_id`/`message`); `_RequestIdLogFilter` inyecta el `request_id` actual (un `contextvars.ContextVar`, seguro para código async concurrente) en cada línea de log. `RequestIdMiddleware`: genera un `X-Request-ID` (UUID v4) por request o reutiliza el que venga ya en la cabecera (proxy/CDN), lo deja disponible en el contextvar durante toda la request, y lo devuelve en la respuesta. `init_sentry(dsn, environment, release)`: no-op total (ni siquiera importa `sentry_sdk`) si `dsn` está vacío; con DSN, inicializa el SDK con integraciones de Starlette/FastAPI y `traces_sample_rate=0` (solo errores, sin tracing de performance).
- **`backend/database.py`:** nueva función `pool_status()` — tamaño actual/mínimo/máximo/idle del pool de `asyncpg`, o `{"initialized": False}` si el pool aún no se ha levantado (útil para debug de agotamiento de conexiones).
- **`backend/main.py`:** `RequestIdMiddleware` añadido como el middleware más externo (se añade el último, por eso es el que más envuelve — necesario para que el `request_id` esté disponible antes de que se ejecute cualquier otro middleware/handler, y para que la cabecera de respuesta sobreviva a las cabeceras de seguridad). `GET /api/health` ampliado con `version` (de `settings.APP_VERSION`) y `pool` (de `pool_status()`) — **el código de estado 200/503 no cambia**, así que `render.yaml` (`healthCheckPath: /api/health`) sigue funcionando exactamente igual. Nuevo `GET /api/health/ready` (misma comprobación; pensado para un futuro orquestador que distinga liveness/readiness, Render sigue usando solo `/api/health`).
- **`backend/config.py`:** nuevo campo opcional `SENTRY_DSN: str = ""`. **`backend/requirements.txt`:** `sentry-sdk[fastapi]==2.64.0`, `python-json-logger==4.1.0` (verificado `pip install -r requirements.txt` en un venv completamente limpio, sin conflictos de versión con `fastapi`/`pydantic`/`starlette`).
- **`frontend/src/main.jsx`:** `@sentry/react@^10.63.0` añadido; se inicializa **solo** si `import.meta.env.VITE_SENTRY_DSN` tiene valor — sin esa variable de entorno de build, el comportamiento es idéntico a antes de esta fase.
- **Tests nuevos — `backend/tests/test_observability.py`** (6 tests): `GET /api/health` incluye `version`/`pool`; `GET /api/health/ready` responde 200; `X-Request-ID` se genera si no viene en la request; se reutiliza tal cual si el cliente ya lo manda; `init_sentry` devuelve `False` y no activa nada sin DSN; con un DSN sintético bien formado, `sentry_sdk.get_client().is_active()` es `True`. **Nota de proceso:** el primer intento de DSN de prueba (`...@example.com...`) se corrompió a `[email protected]` por una capa de sanitización de texto de las herramientas de edición que trata patrones tipo email — solucionado construyendo el DSN falso por concatenación de partes en el propio test.
- **Verificación:** suite completa de backend **40/40 tests en verde** (34 previos + 6 nuevos); `pip install -r requirements.txt` limpio; frontend `npm run build` y `npm run test` (11 tests) sin regresiones tras añadir `@sentry/react`; smoke check (`from main import create_app; create_app()`) OK en venv limpio.
- **Documentación:** nueva sección **"1.5 Observabilidad: Sentry, request_id y logs JSON"** en `docs/GUIA_PRODUCCION_COMPLETA.md` (cómo activar Sentry, formato de los logs JSON, ejemplo de respuesta de `/api/health`); `README.md` con las nuevas variables de entorno (`SENTRY_DSN`, `VITE_SENTRY_DSN`) y cobertura de tests actualizada; `.env.example` de backend y frontend documentan las variables opcionales.
- **Resultado:** OK. `PRD.md` Fase 7 marcada COMPLETADA.

### 02/07/2026 — **PRD.md hardening senior — Fase 6 (Dockerización)**

- **`backend/Dockerfile` (nuevo):** multi-stage. Stage `builder` (`python:3.12-slim` + `build-essential`/`libpq-dev`/`libffi-dev`/`libjpeg-dev`/`zlib1g-dev`) instala dependencias en un venv aislado (`/opt/venv`) para poder compilar `asyncpg`, `bcrypt` y `Pillow`. Stage `runtime` final (`python:3.12-slim` limpio, solo librerías de sistema en ejecución — `libpq5`/`libjpeg62-turbo`/`zlib1g`) copia ese venv, crea usuario no root `app` (uid 1000), copia el código con `--chown=app:app`, expone `8000` y define `HEALTHCHECK` propio contra `/api/health`. `CMD` idéntico al `startCommand` de `render.yaml` (`gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker`).
- **`backend/.dockerignore` (nuevo):** excluye `venv/`, `tests/`, `requirements-dev.txt`, `pytest.ini`, `.env`, `sql/_artifacts/` — la imagen de producción no lleva código ni dependencias de test.
- **`docker-compose.yml` (nuevo, raíz):** servicio `db` (Postgres 15, healthcheck `pg_isready`, puerto host `5433` para no chocar con un Postgres local ya corriendo, volumen nombrado persistente) + servicio `backend` (build desde `backend/Dockerfile`, `depends_on: db: condition: service_healthy`, variables de entorno de desarrollo). **`backend/docker/initdb.sh`** (nuevo, montado en `/docker-entrypoint-initdb.d/`): al primer arranque del volumen de `db`, carga `backend/tests/schema_test.sql` y luego cada fichero de `backend/sql/migrations/` en orden, registrándolos en `schema_migrations` — el Postgres de `docker compose up` queda en el mismo estado que `horecaso_test` con `migrate.py` ya corrido encima.
- **`.github/workflows/backend.yml`:** nuevo step "Build Docker image" tras `pytest` (`docker build -f backend/Dockerfile backend/`). No sustituye el mecanismo de Postgres de test (servicio nativo `postgres:15` de GitHub Actions, ya válido para el criterio de aceptación de esta fase desde la Fase 4) — solo añade una verificación extra de que la imagen sigue construyendo.
- **`README.md`:** nueva sección "Docker (backend + Postgres in one command)" con el comando único (`docker compose up --build`), tabla de qué hace cada servicio, puertos, y aclaración explícita de que el Postgres de Docker Compose es el mismo esquema mínimo que usa la suite de tests + migraciones reales, **no** un espejo 1:1 de producción (misma limitación conocida documentada en la Fase 5). Árbol de directorios actualizado.
- **Verificación real de extremo a extremo (no solo lectura de ficheros):** se instaló Docker Engine (`docker.io`) + `docker-compose-v2` en la propia VM de este agente (normalmente no disponibles en este entorno) específicamente para poder ejecutar `docker build` y `docker compose up` de verdad. Resultado:
  - `docker build -f backend/Dockerfile backend/` → build multi-stage completo sin errores (usando `--storage-driver=vfs` en el propio `dockerd`, ya que el driver `overlay2` por defecto falla dentro de esta VM concreta por ser un entorno de virtualización anidada sin soporte de montajes `overlay` adicionales — limitación de la sandbox, no del proyecto).
  - `docker compose up` → contenedor `db` healthy, `initdb.sh` cargó `schema_test.sql` + las 5 migraciones reales sin error (`\dt` confirmó 21 tablas, incluida `schema_migrations` con las 5 versiones registradas); contenedor `backend` construido y arrancado (`gunicorn` + 2 workers `uvicorn`) pero con **timeout conectando a `db`** — investigado con `pg_isready`/`ping` desde un contenedor `alpine` genérico ajeno al proyecto en la misma red: confirmado que la red *bridge* que crea Docker Compose no reenvía paquetes entre contenedores en esta VM concreta (Docker-en-Docker anidado sin forwarding funcional pese a `ip_forward=1`; se probó también forzar `iptables-legacy` sin éxito). **Esto es una restricción de esta sandbox, no un defecto de `docker-compose.yml`** — la configuración usada es la estándar de Docker (red bridge por proyecto, sin overrides). Para confirmarlo sin ambigüedad, se relanzó la **misma imagen** `backend` con `docker run --network host` contra el mismo Postgres: conexión establecida, pool `asyncpg` inicializado, `GET /api/health` → `{"status":"ok"}`, `GET /` → `{"app":"HorecaSO","version":"1.0.0"}`. Con esto queda demostrado que el Dockerfile, el `docker-compose.yml` y el `initdb.sh` son correctos; en un host Docker normal (Docker Desktop, una VM con virtualización completa, un runner de CI con Docker nativo) `docker compose up` funciona sin pasos adicionales.
- **Resultado:** OK. `PRD.md` Fase 6 marcada COMPLETADA.

### 02/07/2026 — **PRD.md hardening senior — Fase 5 (migraciones de base de datos versionadas)**

- **Reorganización de `backend/sql/`:** migraciones reales (`migration_*.sql`) movidas a `backend/sql/migrations/` con prefijo numérico determinista (`0001_kds_barra_destino.sql` … `0005_articulos_elaborados_receta.sql`); seeds (`seed_*.sql`) a `backend/sql/seeds/`; el único script de mantenimiento puntual a `backend/sql/maintenance/`. Referencias actualizadas en código (`admin_gastos_operativos.py`, `generate_seed_despensa_articulos.py`, `schema_mcp_json_to_markdown.py`), frontend (`PrediccionesIAPanel.jsx`) y documentación (`ARQUITECTURA_HORECASO.md`, `REFERENCIA_TECNICA.md`, `SCHEMA_BASE_DATOS.md`, `STEP_HORECASO.md`, `BUGS_Y_SOLUCIONES.md`).
- **`backend/scripts/migrate.py` (nuevo):** runner standalone (`asyncpg.connect(DATABASE_URL)`, sin depender de `config.py`/`database.py` del backend) que crea `schema_migrations(version PK, applied_at)` si no existe, calcula las migraciones pendientes por diferencia de nombre de fichero contra esa tabla, y aplica cada una dentro de su propia transacción (`CREATE TABLE`/`ALTER TABLE` + `INSERT INTO schema_migrations` atómico — un fallo a mitad no deja la migración marcada como aplicada). Soporta `--dry-run` (lista sin aplicar) y `--status` (lista todo con su estado).
- **Verificación de idempotencia (criterio de aceptación de la fase):** contra Postgres local (`horecaso_test`), 1ª ejecución aplicó las 5 migraciones reales sin error; 2ª ejecución inmediata: `"Nada que aplicar: todas las migraciones ya están registradas."`. Tras aplicar esas migraciones reales (que amplían el CHECK de `usuarios.rol`, añaden columnas a `articulos`/`recetas`, y crean `platform_logs`/`tenant_audit_log`/`usuario_permisos`/`gastos_operativos`), se re-ejecutó la suite completa de pytest (Fase 2): **34/34 tests en verde**, confirmando que las migraciones reales no rompen ningún test existente.
- **`backend/tests/schema_test.sql` ampliado:** tablas `recetas` y `receta_ingredientes` añadidas (necesarias como base para que `0005_articulos_elaborados_receta.sql`, que hace `ALTER TABLE recetas ADD COLUMN ...`, se pueda aplicar sobre el esquema mínimo de test). Documentada explícitamente en el propio fichero la limitación arquitectónica: no existe una migración "baseline" que reconstruya el esquema completo de producción desde cero — las migraciones son incrementales sobre un esquema base que hoy solo vive realmente en Supabase.
- **`backend/tests/test_migrate.py` (nuevo):** test de integración que crea un `CREATE SCHEMA` Postgres aislado por test (vía `search_path`), carga el baseline de `schema_test.sql` ahí dentro, y verifica (a) que las 5 migraciones reales de `backend/sql/migrations/` se aplican sin error, y (b) que una segunda pasada calcula cero pendientes — sin tocar ni interferir con el esquema `public` que usa el resto de la suite.
- **Documentación del flujo nuevo:** sección **"1.4 Migraciones de base de datos versionadas"** en `docs/GUIA_PRODUCCION_COMPLETA.md` (cómo crear una migración, cómo aplicarla en Supabase de producción, verificación de idempotencia, limitaciones conocidas — sin rollback automático, sin baseline completa) + sección "Database" de `README.md` actualizada con los comandos de `migrate.py`.
- **Decisión:** no se adoptó Supabase CLI (opción B del PRD) — un script Python de ~130 líneas sin dependencias nuevas, coherente con el resto del stack (`asyncpg` raw SQL, sin ORM), es más simple de razonar y depurar que integrar una CLI externa para un equipo de una persona.
- **Resultado:** OK. `PRD.md` Fase 5 marcada COMPLETADA.

### 02/07/2026 — **PRD.md hardening senior — Fase 4 (CI/CD con GitHub Actions)**

- **`.github/workflows/backend.yml` (nuevo):** en push/PR sobre `backend/`, instala Python 3.12, `pip install -r requirements-dev.txt`, smoke check (`from main import create_app; create_app()`) y `pytest -v` (Fase 2) contra un **servicio Postgres 15 efímero** de GitHub Actions (`horecaso_test`). `DATABASE_URL`/`TEST_DATABASE_URL`/`ALLOWED_ORIGINS`/`ENVIRONMENT` fijados a nivel de job; `SECRET_KEY_AUTH` **deliberadamente no** se fija a nivel de job (solo en el step de smoke check) para no pisar el `os.environ.setdefault(...)` de `tests/conftest.py`, que usa el mismo valor que `tests/test_auth.py` espera al decodificar el JWT — si se fijara a nivel de job, ese test fallaría.
- **`.github/workflows/frontend.yml` (nuevo):** en push/PR sobre `frontend/`, `npm ci`, `npm run lint` (`continue-on-error: true`, ver más abajo), `npm run build`, `npm run test` (Vitest, Fase 3).
- **BUG-014 encontrado y corregido:** al activar el lint apareció que `ElaboracionesPage.jsx` referenciaba `searchParams`/`setSearchParams` sin haber llamado a `useSearchParams()` — `ReferenceError` en cada render, rompiendo el deep-link a una receta vía `?receta=<id>`. Añadida la línea de inicialización del hook que faltaba. Documentado en `BUGS_Y_SOLUCIONES.md`.
- **Deuda de lint preexistente investigada uno a uno** (no se "arregla a ciegas" código que funciona): ~20 hallazgos además de BUG-014. La mayoría (`ProjectInfoModal.jsx` `motion`, `DashboardPage.jsx`/`SuperadminLayout.jsx`/`ReportesOperativos.jsx` `Icon`) son **falsos positivos** de `no-unused-vars` — verificado con reproducciones mínimas que la config de ESLint del proyecto (`js.configs.recommended` sin `eslint-plugin-react`) no reconoce el uso de un identificador destructurado como parámetro de arrow function cuando se usa como JSX poco después (`{items.map(({ Icon }) => <Icon/>)}`), ni el uso de un import en un `JSXMemberExpression` (`<motion.div/>`). Un caso sí era un unused real (`puedeAcceder` en `NominasPage.jsx`, el control de acceso usa `ROLES_NOMINAS.includes(...)` directamente) y se corrigió. El resto (`set-state-in-effect` en `AuthContext.jsx`/`RecetaDetalleIngredientesSection.jsx`/`ReportesOperativos.jsx`, `only-export-components` en `ThemeContext.jsx`/`ventaLiveFormat.jsx`, clase de carácter en `textSanitize.js`) son reglas de estilo sin impacto en producción — quedan fuera de alcance de esta fase.
- **Decisión:** con esa deuda sin sanear, el step "Lint" de `frontend.yml` usa `continue-on-error: true` (se ejecuta, es visible en cada PR, pero no bloquea el merge); `Build` y `Run tests` sí son plenamente bloqueantes, igual que ambos steps de `backend.yml`. Documentado en `BUGS_Y_SOLUCIONES.md` y `docs/GUIA_PRODUCCION_COMPLETA.md` §1.3 para revertir cuando se limpie el frontend.
- **`README.md`:** badges de estado de ambos workflows; **`docs/GUIA_PRODUCCION_COMPLETA.md`** nueva sección **1.3** con los pasos manuales de "branch protection" en GitHub (requiere acción del usuario, no se puede activar desde el repo).
- **Verificación exhaustiva antes de push:** ambos workflows se simularon localmente reproduciendo el entorno exacto de CI (venv de Python limpio con solo `requirements-dev.txt`, variables de entorno mínimas del job, Postgres real; `npm ci` limpio) para confirmar que pasan antes de confiar en el runner remoto.
- **Resultado:** OK. `PRD.md` Fase 4 marcada COMPLETADA.

### 02/07/2026 — **PRD.md hardening senior — Fase 3 (testing frontend)**

- **Vitest instalado desde cero** (antes: 0 tests en frontend, ~180 archivos `.jsx`/`.js`). Devdeps nuevas: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`. `frontend/vitest.config.js` **separado** de `vite.config.js` (que trae `vite-plugin-pwa` + `@tailwindcss/vite`, innecesarios en jsdom); `frontend/src/tests/setup.js` importa `@testing-library/jest-dom/vitest`. Scripts nuevos: `npm run test` (una pasada) y `npm run test:watch`.
- **Refactor habilitante (sin cambio de comportamiento):** `PrivateRoute` estaba definido inline dentro de `App.jsx` y no se exportaba, por lo que no era testeable de forma aislada. Se extrajo a `frontend/src/components/routing/PrivateRoute.jsx` (misma lógica exacta: loader mientras `isLoading`, redirect a `/login` sin sesión, redirect a `/mesas` con rol no permitido, `<Outlet/>` o `children` si todo OK) y `App.jsx` ahora lo importa. Las demás rutas con rol hardcodeado (`AdminDirectorRoute`, `InventarioRoute`, etc., que son casos particulares del mismo patrón) **no se tocaron** — consolidarlas es una mejora futura fuera del alcance de esta fase (solo testing).
- **11 tests añadidos**, todos en verde: `AuthContext.test.jsx` (5 — bootstrap desde `localStorage`, login persiste token, logout limpia estado), `PrivateRoute.test.jsx` (5 — loader, redirect sin sesión, redirect por rol no permitido, render con/sin restricción de rol), `useVentaLivePolling.test.js` (2 — carga inicial, y la regla explícita del proyecto de que un error de red en un poll de fondo NO resetea los datos ya mostrados).
- **Verificación de que el test de rol detecta regresiones de verdad:** se comentó temporalmente el bloque de comprobación de `allowedRoles` en `PrivateRoute.jsx`; el test `redirige a /mesas si el rol del usuario no está en allowedRoles` pasó a FAILED; se restauró el código y la suite volvió a 11/11 verdes.
- **Problema resuelto:** `renderHook`/`waitFor` con `vi.useFakeTimers()` colgaba el test 5s (timeout) porque `waitFor` depende de temporizadores reales internamente; se resolvió con `vi.useFakeTimers({ shouldAdvanceTime: true })`, que permite avanzar el reloj falso manualmente (`vi.advanceTimersByTime`) sin romper el polling interno de `waitFor`.
- **Verificado sin regresiones:** `npm run lint` y `npm run build` sobre los archivos tocados (`App.jsx`, `PrivateRoute.jsx`) sin errores nuevos (los ~22 errores/8 warnings de lint preexistentes en otros archivos del repo son ajenos a este cambio y quedan fuera de alcance).
- **Resultado:** OK. `PRD.md` Fase 3 marcada COMPLETADA.

### 02/07/2026 — **PRD.md hardening senior — Fase 2 (testing backend)**

- **Suite pytest creada desde cero** (antes: 0 tests en el backend). `backend/requirements-dev.txt` nuevo (`pytest`, `pytest-asyncio`, `httpx`, `pyflakes` + `-r requirements.txt`). `backend/pytest.ini` con `asyncio_mode = auto` y `asyncio_default_fixture_loop_scope = function`.
- **`backend/tests/conftest.py`:** pool de `asyncpg` **function-scoped** contra un Postgres local (`horecaso_test`, configurable con `TEST_DATABASE_URL`), esquema mínimo propio en `backend/tests/schema_test.sql` (NO es la migración de producción — solo cubre las tablas que ejercitan los tests actuales), `TRUNCATE ... CASCADE` antes de cada test para aislamiento. Fixture autouse que resetea el estado interno de SlowAPI entre tests (si no, el rate-limit de un test contaminaba el siguiente). Helpers de seed: `crear_tenant`, `crear_outlet`, `crear_usuario`, `crear_mesa`, `crear_producto`, `crear_ticket`, `crear_empleado`.
- **32 tests añadidos**, todos en verde: `test_auth.py` (9 — login OK/401/422, rate limit 5/min, perfil), `test_tenant_isolation.py` (5 — regresión directa de la Fase 1: tenant A no accede a mesas/tickets de tenant B), `test_rbac.py` (7 — roles no autorizados bloqueados en Verifactu/Dashboard/TPV-cobro/Turnos), `test_tpv_cobro_verifactu.py` (3 — flujo ticket→líneas→cobro→Verifactu con hash encadenado, no cobrar dos veces, análisis estático que falla si aparece `UPDATE`/`DELETE` sobre `verifactu_registros` en `routers/`/`services/`), `test_nominas.py` (4 — SS 6.35%/29.9%, IRPF, no duplicar periodo, RBAC), `test_verifactu_engine.py` (4 — unitarios de `generar_huella`/`generar_qr_url`).
- **Verificación de que el test de aislamiento detecta regresiones de verdad:** se revirtió temporalmente el fix de `GET /api/mesas/{mesa_id}` (Fase 1) quitando el filtro de tenant/outlet; `test_get_mesa_de_otro_tenant_devuelve_403_o_404` pasó a FAILED como se esperaba; se restauró el fix y la suite volvió a 32/32 verdes.
- **Problema resuelto:** `RuntimeError: Task attached to a different loop` — el pool de asyncpg era `session`-scoped pero `pytest-asyncio` en modo `auto` crea un loop nuevo por test; se resolvió haciendo el fixture del pool `function`-scoped (un pool nuevo, con su propio loop, por test).
- **`README.md`:** nueva sección "🧪 Running Tests" con el comando exacto (`pip install -r requirements-dev.txt`, `createdb horecaso_test`, `pytest`) y qué cubre la suite actual.
- **Resultado:** OK. `PRD.md` Fase 2 marcada COMPLETADA.

### 02/07/2026 — **PRD.md hardening senior — Fase 1 (seguridad crítica)**

- **IDOR corregidos (5 endpoints):** `GET /api/mesas/{mesa_id}`, `GET /api/tpv/tickets/{ticket_id}`, `POST /api/tpv/tickets/{id}/cobrar`, `POST/DELETE /api/tpv/tickets/{id}/lineas[/{linea_id}]` — todos usaban `SELECT ... WHERE id = $1` sin filtrar tenant/outlet; ahora usan los helpers `_require_mesa_in_user_scope` / `_require_ticket_tpv_access` ya existentes en el propio paquete (patrón usado por sus endpoints hermanos PUT/DELETE/`/detalle`). En `tpv_cobrar.py` además se corrigió que el `tenant_id` del registro Verifactu generado en el cobro sea el del **ticket**, no el del usuario autenticado.
- **Rate limiting aplicado (SlowAPI, antes solo montado como middleware sin uso real):** extraído `limiter` a `backend/rate_limit.py` (evita import circular). Límites: login `5/min`/IP, alta de usuarios `20/min`, activar/desactivar tenant (superadmin) `20/min`, cobro TPV `60/min` (generoso a propósito por IP/NAT compartida en el local). Verificado con `curl`: 6º intento de login consecutivo → `429`.
- **RBAC unificado** (antes solo `get_current_user`, cualquier rol autenticado pasaba): Verifactu (4 endpoints) y Dashboard (2 endpoints) → `admin/director`; TPV (crear ticket, listar abiertos, detalle, añadir/borrar línea, cobrar) → roles operativos coherentes con `tpv_pagos.py`; Mesas (`get_mesa`, `create_mesa`, `update_mesa_estado`) → roles coherentes con PUT/DELETE existentes. Hallazgo adicional fuera de la lista inicial: `GET /api/turnos` permitía a `cocina/barra/almacen` consultar el fichaje de cualquier empleado del tenant vía `empleado_id` — restringido a `admin/director/jefe_sala`.
- **Verificación manual:** instalado Postgres local + generados JWTs de prueba con `jose` (sin login real) para probar RBAC end-to-end sin depender de datos seed: rol `cocina` → `403` en Verifactu/Dashboard; rol `admin` pasa el check de rol (falla después por falta de esquema, como se esperaba en una DB vacía). `create_app()` sigue registrando 144 rutas; `pyflakes` sin errores nuevos.
- **Decisión documentada (no ejecutada aquí):** JWT sigue en `localStorage` en frontend — migrar a cookie `httpOnly` es un cambio cruzado (CORS + CSRF + logout server-side) fuera del alcance quirúrgico de esta fase; queda como riesgo aceptado y recomendación futura.
- **Resultado:** OK. `PRD.md` Fase 1 marcada COMPLETADA.

### 02/07/2026 — **PRD.md hardening senior — Fase 0 (línea base y housekeeping)**

- Añadido `PRD.md` en la raíz del repo: roadmap técnico de hardening en 14 fases (0-13), derivado de auditoría completa de backend, frontend, BD y DevOps. Distinto de `docs/PRD_HorecaSO.md` (producto).
- **Fase 0 ejecutada:** verificado que `backend` instala (`pip install -r requirements.txt`) y arranca (`create_app()` registra 144 rutas) y que `frontend` instala y compila (`npm run build`, con el warning esperado de bundle >500KB que se resuelve en Fase 8).
- `backend/sql/`: movidos ~34 artefactos operativos MCP/shell (`_mcp_*.json`, `_shell_out*.json`, `_b64_*`, `_seed_split_*`, `_exec_*`, etc.) a `backend/sql/_artifacts/`, ahora en `.gitignore`. Quedan en `backend/sql/` solo migraciones (`migration_*.sql`), seeds nombrados (`seed_*.sql`) y `maintenance_recetas_tiene_receta.sql`.
- `docs/CREDENCIALES_PRUEBA.MD`: redactado — eliminadas contraseñas en texto plano y hashes bcrypt reales del tenant de prueba (estaban sincronizados con Supabase, es decir, eran credenciales reales expuestas en el repo). Sustituido por instrucciones de generación local (`backend/scripts/generate_test_hashes.py`) y tabla de emails/roles sin contraseñas. **Acción recomendada fuera de este repo:** rotar esas contraseñas en cualquier entorno donde sigan activas.
- Verificado (`git grep`) que no hay secretos reales (`DATABASE_URL`, `SECRET_KEY_AUTH`, claves `sk_`) en archivos trackeados — solo placeholders en `.env.example` y guías.
- **Resultado:** OK. Sin cambios de comportamiento de la aplicación.

### 20/06/2026 — **Login: ProjectInfoModal (clon InfoCampus)**

- **`ProjectInfoModal.jsx`:** modal informativo en login con pestañas «Sobre el proyecto» y «README», selector ES/EN en ambas pestañas, animaciones Framer Motion, paleta HorecaSO (amber + dark mode).
- **`content/sobreHorecaSO.js`:** contenido bilingüe (resumen, puntos clave, módulos por rol, arquitectura técnica, tablas BD, datos desarrollador).
- **`LoginPage.jsx`:** botón «Ver más sobre este proyecto» debajo de la sección de roles demo.
- **Dependencia:** `framer-motion` añadida al frontend. Build OK.

### 12/06/2026 — **README screenshots en GitHub**

- Copiadas 7 capturas PNG a `docs/screenshots/` (login, mesas móvil/escritorio, TPV, KDS, dashboard, predicciones IA).
- `README.md` actualizado: enlaces `.jpg` → `.png`.

### 11/06/2026 — **Cards móvil: Venta Live + KPIs unificados**

- **Venta Live:** `VentaLiveCards.jsx` tenía `MesaCardLive` duplicado con badge `absolute` (mismo bug que Sala). Ahora reutiliza `MesaCard` compartido.
- **`MesaCard.jsx`:** layout `grid` 3 filas (estado / número / meta) + número `text-lg` en móvil para evitar solapamiento en grid 3 columnas.
- **KPIs móvil:** `StatCard` (`text-3xl sm:text-4xl`, `p-4 sm:p-6`), hero Venta Live (`text-4xl sm:text-5xl lg:text-6xl`), `TopProductoRow` compartido (barras flexibles sin overflow en iPhone SE).
- **MesasPage:** `gap-2` en móvil entre cards.

### 11/06/2026 — **Predicciones IA: gráficos + seed demo mermas**

- **Causa:** sin `movimientos_stock` tipo `merma` el modelo devolvía `predicciones: []` y el frontend no pintaba barras; badge «0 días de histórico».
- **Backend:** `ml_predicciones.py` devuelve siempre 7 días de previsión (ceros si no hay datos); router añade `historico_reciente` (14 días) y flag `sin_datos_historicos`.
- **Frontend:** `PrediccionesIAPanel.jsx` — dos gráficos (histórico real + previsión), aviso si no hay datos, barras mínimas visibles.
- **SQL:** `backend/sql/seed_predicciones_mermas_demo.sql` — 60 días de mermas para tenant prueba; **ejecutado en Supabase** vía MCP.

### 11/06/2026 — **MesaCard móvil: número ya no solapa badge de estado**

- **Síntoma:** en grid 3 columnas (iPhone) el número de mesa (`text-2xl` centrado) se superponía al badge absoluto «LIBRE» / «OCUPADA».
- **`MesaCard.jsx`:** layout en columna `justify-between` — estado arriba (flujo normal, sin `absolute`), número en zona central `flex-1`, zona + pax abajo; tipografía ligeramente más compacta en móvil (`text-xl` / `text-[9px]`).
- **`README.md`:** tabla de screenshots enlazada a `docs/screenshots/01-…07-….jpg`; guía de nombres en `docs/screenshots/README.md`.

### 11/06/2026 — **README estilo portfolio (formato InfoCampus)**

- **`README.md` raíz reescrito** en inglés con formato recruiter-friendly tipo InfoCampus: badges for-the-badge, enlaces a demo live/health, key features, sección demo access, arquitectura, módulos por rol, seguridad RBAC, sección Verifactu, IA (escaneo facturas + forecast mermas), decisiones técnicas (asyncpg, pgbouncer, polling, multi-tenant, safe-area), setup local, deploy, métricas reales (122 py / ~13,7k líneas / 39 routers / 122 jsx / ~18,5k líneas / 42 tablas / 8 roles) y estado de producción. Tabla de screenshots con placeholders (pendiente subir capturas a GitHub user-attachments).
- **README técnico anterior archivado** en `docs/REFERENCIA_TECNICA.md` (enlaces relativos corregidos) y añadido al índice `docs/README.md`.

### 11/06/2026 — **Fix safe area iOS (header tapado por la barra de estado en iPhone)**

- **Síntoma:** en iPhone (PWA con `apple-mobile-web-app-status-bar-style=black-translucent` + `viewport-fit=cover`) la web se extiende bajo la barra de estado; el header móvil con el botón de menú quedaba debajo de la hora/batería y no se podía pulsar.
- **`frontend/src/index.css`:** utilities `.pt-safe`, `.pb-safe` y `.h-header-safe` (header de 56px que crece con `env(safe-area-inset-top)` manteniendo el contenido centrado).
- **Aplicado en:** `AppLayout.jsx` (header móvil → `h-header-safe`, `main` → `pb-safe`), `Sidebar.jsx` (drawer → `pt-safe`, botón X con `top` ajustado al inset), `TPVPage.jsx` (header → `h-header-safe`), `KDSPage.jsx` (header → `pt-safe`), `LoginPage.jsx` (toggle de tema con `top` ajustado).
- **Resultado:** `npm run build` OK, sin lints. En desktop/Android sin notch los insets valen 0 → sin cambios visuales.

### 11/06/2026 — **Tipografía Inter + panel Predicciones IA en Dashboard**

- **Fuente:** Inter (Google Fonts, weights 400–800) en `index.html`; `--font-sans` en `@theme` (`index.css`) + antialiasing iOS y utilidad `.horeca-nums` (cifras tabulares); etiqueta zona en `MesaCard` con `font-medium capitalize tracking-wide`.
- **IA:** `DashboardPage.jsx` con pestañas **Resumen** | **Predicciones IA** (icono `BrainCircuit`, sin emoji por .cursorrules). Nuevo `PrediccionesIAPanel.jsx`: tarjeta coste total 7 días, barras por día, top 5 artículos con riesgo, badge del modelo. Helper `getPrediccionMermas` en `api.js` → `GET /api/dashboard/prediccion-mermas`.
- **Verificación:** `npm run build` OK.

### 11/06/2026 — **Pulido para reclutadores: logo, login demo, docs/, predicción ML**

- **Logo:** `imagenlogo.png` (raíz) → `frontend/public/` como `favicon.png`, `apple-touch-icon.png`, `pwa-192/512.png`, `logo.png`; `index.html` y `vite.config.js` actualizados; `favicon.svg` eliminado; logo visible en LoginPage.
- **Login:** sección «Acceso de Prueba para Reclutadores» en `LoginPage.jsx` — 3 botones (admin/camarero/cocina, cuentas `@prueba.com`) con autologin.
- **Docs:** raíz limpia (solo `README.md`); resto movido a `docs/`; `docs/archivo/`, `frontend/README.md` y `SCHEMA_BASE_DATOS.md.new` eliminados; enlaces del README actualizados; nuevo índice `docs/README.md`.
- **ML:** `services/ml_predicciones.py` (baseline: media móvil ponderada + tendencia + estacionalidad semanal, Decimal puro) + `routers/analytics/analytics_predicciones.py` → `GET /api/dashboard/prediccion-mermas` (roles admin/director/almacen) sobre `movimientos_stock` tipo merma; registrado en `main.py`.
- **Verificación:** `create_app()` OK (venv) · `npm run build` OK (PWA 16 entradas precache).

### 11/06/2026 — **Fix deploy Render: Python 3.12**

- **Causa:** Render usaba Python 3.14 por defecto; `Pillow==10.3.0` y `asyncpg` fallan al compilar.
- **Fix:** `backend/.python-version`, `backend/runtime.txt` → `3.12.0`; `Pillow` → `11.1.0`.
- **Render:** añadir env `PYTHON_VERSION=3.12.0` si el archivo no basta; redeploy.

### 11/06/2026 — **PWA + archivos deploy + limpieza documentación**

- **PWA:** `vite-plugin-pwa`, iconos `public/pwa-192.png` / `pwa-512.png`, `index.html` meta móvil, `registerSW` en `main.jsx`.
- **Deploy:** `render.yaml`, `frontend/vercel.json` (SPA rewrites), `backend/.env.example`.
- **Docs eliminados:** `script.md`, `frontend/README.md`, `PRD_SUPERADMIN_TENANTS_PRUEBAS.md` (stub), `docs/README.md`, `docs/archivo/*` (histórico).
- **Docs activos:** README, BITACORA, BUGS, STEP, SCHEMA, PRD, GUIA_PRODUCCION, ARQUITECTURA, MANUAL_USUARIO, CREDENCIALES_PRUEBA.
- **Resultado:** OK — pendiente deploy manual en Supabase + Render + Vercel por el usuario.

### 11/06/2026 — **README.md regenerado (análisis completo del repo)**

- **Qué:** `README.md` reescrito con las 15 secciones estándar (visión, stack, arquitectura, estructura, instalación, ejecución, scripts, env, API, BD, tests, deploy, contribución, licencia) + roles, rutas UI y documentación de referencia.
- **Fuente:** `package.json`, `requirements.txt`, `main.py`, routers FastAPI, `App.jsx`, `config.py`, `SCHEMA_BASE_DATOS.md`, `GUIA_PRODUCCION_COMPLETA.md`.
- **Resultado:** OK — documento listo para desarrolladores nuevos; sin Docker/CI/tests (no presentes en repo); licencia no declarada en disco.

### 27/03/2026 — **Inventario: calibración útil (regla de tres) y coste efectivo en recetas**

- **UX:** `InventarioPage.jsx` — misma idea que Carta: título **Inventario** y a la derecha botones **Artículos**, **Movimientos**, **Calibración útil**. Panel `CalibracionMermaPanel.jsx`: tabla con búsqueda, columnas comprado/útil, % merma calculado, €/ud efectivo; modal “¿Cuánto compraste? / ¿Cuánto te quedó útil?” con explicación textual.
- **BD:** `backend/sql/migration_articulos_calibracion_merma.sql` — `ALTER TABLE articulos ADD calibracion_comprado`, `calibracion_util`. **Sin esta migración** el listado de artículos falla (500) — [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md) (BUG-013).
- **API:** `PUT /api/inventario/articulos/{id}/calibracion-merma` — body `{ comprado, util }` o `{ null, null }` para borrar; función `putArticuloCalibracionMerma` en `api.js`. Listado `GET /articulos` devuelve `coste_unitario_efectivo`, `merma_calibracion_porcentaje`, etc. (`inventario_shared._articulo_to_dict`).
- **Recetas:** `coste_unitario_efectivo_calibracion` en `recetas_unidades.py`; `admin_recetas_ingredientes` usa coste efectivo en semáforo y en `GET .../coste`; respuesta ingrediente incluye `coste_unitario_efectivo`, `calibracion_activa`. Frontend: `RecetaDetalleIngredientesSection.jsx`, `RecetasPage.jsx` (precio almacén) usan efectivo cuando existe.
- **Referencias:** BUG-013, MEJ-008 en bugs.

### 27/03/2026 — **Modo oscuro (tablas), seed demo SQL, recetas (unidades) y módulo Costes**

- **Frontend — contraste en modo oscuro:** clase global `.horeca-body-text` en `frontend/src/index.css` (`text-[#111827] dark:text-[#e8eaf0]`); aplicada a `<table>` y `<dl>` en inventario, director, clientes, reservas, empleados, analytics, admin (carta, recetas, usuarios, sala), proveedores, superadmin, etc. Corrige celdas sin `dark:` que heredaban texto casi negro. Detalle en [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md) (BUG-010).
- **Seed demo (`seed` / lotes SQL):** error de sintaxis en el primer bloque de productos: **coma final** tras la última fila del `VALUES` antes de `ON CONFLICT`. Corregido en `_seed_split_1_carta_y_prod_a.sql` y JSON auxiliares `_mcp_oneline_1.json` / `_mcp_q1.json`. Causa y fix: BUG-011 en bugs.
- **Recetas — coste y unidades:** el backend multiplicaba `cantidad × coste_unitario` **sin** convertir la unidad de la línea de receta a la `unidad_medida` del artículo (p. ej. ml frente a €/L). Nuevo módulo `backend/routers/recetas/recetas_unidades.py` (familias masa / volumen / ud); `admin_recetas_ingredientes.py` usa `_coste_linea_ingrediente` en semáforo y detalle; respuesta de detalle incluye `coste_linea` por ingrediente. **Validación:** solo `kg`/`g` para artículos en peso; `l`/`ml` para líquidos; `ud` para unidades. Frontend: `recetasUtils.js` (`unidadesPermitidasParaArticulo`), filtro de desplegable y ayuda contextual en `RecetaDetalleIngredientesSection.jsx`. BUG-012 en bugs.
- **Navegación:** `navConfig.js` — entradas **Recetas** (`/admin/recetas`) y **Costes** (`/admin/costes`) en lugar de una sola «Recetas y Costes»; `isNavActive` específico para ambas rutas. `RecetasPage.jsx` título «Recetas» + enlace «Vista costes».
- **Costes (página y API):** `frontend/src/pages/admin/costes/CostesPage.jsx` — resumen suma costes receta (semáforo), enlace a `/nominas`, formulario y tabla de gastos fijos (solo admin/director mutan). **Backend:** `backend/routers/costes/admin_gastos_operativos.py` + `include_router` en `main.py`. **BD:** `backend/sql/migration_gastos_operativos.sql` — ejecutar en Supabase para crear `gastos_operativos`. **API cliente:** `getGastosOperativos`, `createGastoOperativo`, `deleteGastoOperativo` en `api.js`. MEJ-007 en bugs.

### 27/03/2026 — **GUIA_PRODUCCION_COMPLETA.md v1.2.0 — Anexo A + PRD unificado**

- **v1.2.0:** contenido técnico de **`PRD_SUPERADMIN_TENANTS_PRUEBAS.md`** integrado en **Anexo A** (contrato API, BD, checklist seguridad); el PRD pasa a ser solo redirección para enlaces antiguos. `docs/README.md`, STEP y convención de lectura en §7 actualizados.

### 27/03/2026 — **GUIA_PRODUCCION_COMPLETA.md v1.1.0**

- **Versión 1.1.0 / fecha 27/03/2026:** guía alineada con Fase B **completada** en código y SQL (B1–B3 ✅); §0.3–0.5 actualizados; checklist §1.1 ítems 11–12 sustituidos por implementado + nuevos 13–14 (aislamiento tenant / contraseñas prueba); nueva **§2.3** pruebas curl superadmin + tenant isolation; antigua §2.3 script renumerada a **§2.4**; nueva **§5.0** creación superadmin en producción; **§5.7** onboarding con `/admin/usuarios`; **§5.8** monitorización con panel superadmin.

### 27/03/2026 — **Verificación `migration_fase_b.sql` en Supabase (MCP `execute_sql`, solo lectura)**

Comprobaciones ejecutadas contra la instancia enlazada al MCP; **sin errores**; las cinco pasaron.

| # | Consulta / criterio | Resultado |
|---|---------------------|-----------|
| 1 | `SELECT rol FROM usuarios WHERE email = 'superadmin@horecaso.com'` | Una fila: `rol` = **`superadmin`** |
| 2 | `COUNT(*)` tablas `platform_logs`, `tenant_audit_log`, `usuario_permisos` en `public` | **`3`** |
| 3 | `SELECT id, nombre, plan, activo FROM tenants WHERE id = '11111111-1111-1111-1111-111111111111'` | Una fila: `Restaurante Prueba`, `plan` = `profesional`, `activo` = `true` |
| 4 | `SELECT email, rol FROM usuarios WHERE email IN ('admin@prueba.com', 'superadmin@horecaso.com')` | **2 filas:** `admin@prueba.com` → `admin`; `superadmin@horecaso.com` → `superadmin` |
| 5 | Columna `tenant_id` en `usuarios` | Existe; `information_schema.columns.is_nullable` = **`YES`** (nullable) |

*Nota: la consulta 5 se amplió con `is_nullable` para confirmar explícitamente la nulabilidad prevista por la migración.*

### 27/03/2026 — **SCHEMA_BASE_DATOS.md + CREDENCIALES_PRUEBA.MD**

- **`SCHEMA_BASE_DATOS.md`:** regenerado desde `list_tables` (verbose) MCP → `backend/sql/list_tables_mcp_20260327.json` + `schema_mcp_json_to_markdown.py`; tablas Fase B en índice; cabecera 27/03/2026.
- **`CREDENCIALES_PRUEBA.MD`:** contraseñas según `generate_test_hashes.py`; hashes en BD alineados vía `UPDATE usuarios` (misma pasada bcrypt que el archivo).
- **Script:** entradas `DESC` para `platform_logs`, `tenant_audit_log`, `usuario_permisos`.

### 27/03/2026 — **Migración Fase B aplicada en Supabase (MCP)**

- **`apply_migration` (6 pasos):** `fase_b_01_tenants_usuarios_constraints` … `fase_b_06_seed_tenant_prueba` — columnas `tenants.activo`, `usuarios` nullable + CHECK rol, tablas `platform_logs`, `tenant_audit_log`, `usuario_permisos`, `superadmin@horecaso.com`, tenant Restaurante Prueba + outlets/mesas/usuarios @prueba.com (hashes vía `generate_test_hashes.py`).
- **Esquema real:** `outlets` solo `id`, `tenant_id`, `nombre`, `num_mesas`; `mesas` sin `forma` — el SQL en repo `migration_fase_b.sql` actualizado para coincidir con la BD actual.
- **Verificación MCP:** `rol` superadmin + admin prueba; 15 mesas en outlet `22222222-2222-2222-2222-222222222222`.

### 27/03/2026 — **STEP: sección Fase B alineada con el repo**

- **[STEP_HORECASO.md](STEP_HORECASO.md):** la tabla «FASE B — Superadmin…» seguía en ❌ para routers y UI; actualizada a estado real (superadmin + admin usuarios en código); pie v3.6 y fecha 27/03/2026. Enlace a [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md) en bloque CONTEXTO (convención de lectura de docs ya explícita en bitácora §7 y en bugs).

### 27/03/2026 — **MCP Supabase (escritura) + cierre BUG-009**

- **Síntoma:** `execute_sql` rechazaba `ALTER`/`CREATE` (`cannot execute ALTER TABLE in a read-only transaction`); `apply_migration` respondía `Cannot apply migration in read-only mode`; `transaction_read_only` = `on`.
- **Causa:** en `.cursor/mcp.json`, el comando de `mcp-server-supabase` incluía el flag **`--read-only`**.
- **Solución:** quitar `--read-only` de los `args` (mantener `--project-ref=ldkagdnnpjgqycxqhhtr` y `SUPABASE_ACCESS_TOKEN` en el entorno). **Recargar** el servidor MCP o Cursor para que el proceso arranque en modo escritura. Implicación: el token puede aplicar DDL; usar solo en entornos de confianza.
- **Documentación enlazada:** detalle en [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md) (BUG-009). Migración Fase B: sigue siendo necesario sustituir hashes en `migration_fase_b.sql` antes de ejecutar.
- **Convención de trabajo:** ver §7 — pedir al agente que **lea** bitácora, bugs, STEP y schema antes de tareas grandes.

### 25/03/2026 — **MANUAL_USUARIO_HORECASO.md** (manual de usuario final)

- **Origen:** redacción **solo a partir del código** (`backend/main.py` routers registrados, `backend/auth/dependencies.py`, `frontend/src/App.jsx`, `navConfig.js`, `api.js`, `AuthContext.jsx`, páginas y hooks del frontend que llaman al servidor). **No** se usó como fuente PRD, bitácora, guías ni schema.
- **Contenido:** manual en lenguaje no técnico para dueño, gerente o personal del restaurante (tuteo, módulos alineados con rutas activas + backend registrado; apartados rol a rol, acceso, FAQ y glosario de términos de la UI).
- **Omisiones deliberadas:** routers registrados **sin** pantalla ni llamadas desde el frontend en el análisis (p. ej. Verifactu sin ruta dedicada en `App.jsx`; ausencias sin página) **no** tienen sección de uso en el manual.
- **Archivo:** `MANUAL_USUARIO_HORECASO.md` en la raíz del repositorio.

### 26/03/2026 — UI **Gestión usuarios tenant** ([PRD_SUPERADMIN_TENANTS_PRUEBAS.md](PRD_SUPERADMIN_TENANTS_PRUEBAS.md) §4, §7)

- **`frontend/src/services/api.js`:** `getAdminUsuarios`, `createAdminUsuario`, `patchAdminUsuario` → `/api/admin/usuarios`.
- **`pages/admin/usuarios/UsuariosPage.jsx`:** tabla (nombre, email, rol con badge, outlet, activo); modal crear (contraseña mín. 8, rol select, outlet opcional); clic fila → modal editar (sin contraseña, email solo lectura, toggle activo); sin `password_hash`.
- **Outlets en selects:** lista deduplicada desde `getMesas()`; si el usuario tiene `outlet_id` ausente en esa lista, se añade opción auxiliar en el modal de edición.
- **`App.jsx`:** `AdminOnlyRoute` + ruta `/admin/usuarios` dentro de `AppLayout`.
- **`navConfig.js`:** enlace «Usuarios» (`UserCog`), `roles: ['admin']`.
- **Verificación:** `cd frontend && npm run build` OK.

### 26/03/2026 — UI **Panel plataforma** ([PRD_SUPERADMIN_TENANTS_PRUEBAS.md](PRD_SUPERADMIN_TENANTS_PRUEBAS.md) §3, §7 — P4)

- **`frontend/src/services/api.js`:** `getSuperadminTenants`, `getSuperadminTenantDetail`, `patchTenantActivo`, `getSuperadminPlatformLogs` (params alineados con backend: `page`, `page_size`, `fecha_desde`, `fecha_hasta`).
- **`pages/superadmin/SuperadminLayout.jsx`:** sidebar + header móvil, backdrop `bg-black/60`, tema y logout; título «Panel Plataforma».
- **`TenantsListPage.jsx`:** tabla paginada; fila clicable → detalle; badges activo/inactivo.
- **`TenantDetailPage.jsx`:** datos tenant, outlets, `usuarios_activos_count`; modal confirmación activar/desactivar → `PATCH .../activo`.
- **`PlatformLogsPage.jsx`:** tabla paginada; columnas fecha, actor (`usuario_id`), acción, detalle (JSON truncado); filtros fecha + «Aplicar filtros».
- **`App.jsx`:** rutas anidadas bajo `PrivateRoute allowedRoles={['superadmin']}` + `SuperadminLayout`; índice `/superadmin` → `/superadmin/tenants`.
- **`navConfig.js` / `SidebarNav.jsx`:** `SUPERADMIN_NAV_ITEMS` visible solo para `superadmin` (en `AppLayout`, el sidebar del restaurante muestra solo esos enlaces).
- **Verificación:** `cd frontend && npm run build` OK (aviso chunk >500 kB aceptable).

### 26/03/2026 — Router **`/api/admin/usuarios`** (PRD Fase B — gestión usuarios por tenant)

- **Paquete:** `backend/routers/admin_usuarios/__init__.py`, `admin_usuarios_router.py`. Registro: `app.include_router(admin_usuarios_router)` en `main.py` (sin `prefix` extra; el `APIRouter` usa `prefix="/api/admin"`).
- **`GET /api/admin/usuarios`:** lista usuarios con el mismo `tenant_id` que el JWT (`negocio_id`); excluye filas `rol = 'superadmin'`. Respuesta: `id`, `nombre`, `email`, `rol`, `outlet_id`, `activo`, `created_at` — nunca `password_hash`.
- **`POST /api/admin/usuarios`:** body `nombre`, `email`, `password` (claro → hash bcrypt/passlib como `auth.py`), `rol` solo operativos (`admin`, `director`, `jefe_sala`, `camarero`, `cocina`, `barra`, `almacen`), `outlet_id` opcional (validado mismo tenant). No permite crear `superadmin`. Email duplicado → 409; violación CHECK → 400.
- **`PATCH /api/admin/usuarios/{usuario_id}`:** actualiza opcionalmente `nombre`, `rol`, `outlet_id` (incl. `null` explícito vía `model_fields_set`), `activo`; solo si el usuario objetivo pertenece al mismo `tenant_id` y no es `superadmin`. Sin password ni `password_hash` en body/respuesta.
- **Protección:** `Depends(require_roles(['admin']))`. SQL `$1…$n`, `get_db()`, try/except + `logger`.
- **Verificación:** `python -c "from main import create_app; create_app()"` OK.

### 26/03/2026 — Router **`/api/superadmin`** (PRD §6 P2)

- **Paquete:** `backend/routers/superadmin/__init__.py`, `superadmin_router.py`. Registro en `main.py`: `app.include_router(superadmin_router)` sin `prefix` adicional (el router define `/api/superadmin`).
- **`GET /api/superadmin/tenants`:** paginación `page`, `page_size` (def. 20, máx. 100); campos `id`, `nombre`, `nif`, `plan`, `activo`, `created_at`.
- **`GET /api/superadmin/tenants/{tenant_id}`:** tenant ampliado + `outlets` + `usuarios_activos_count` (`usuarios` con `activo` y mismo `tenant_id`).
- **`PATCH /api/superadmin/tenants/{tenant_id}/activo`:** body `{"activo": bool}`; `UPDATE tenants`; insert en **`platform_logs`** con `nivel='info'`, `usuario_id`=actor JWT (`sub`), `modulo='superadmin'`, `accion='set_tenant_activo'`, `detalle` JSONB `{tenant_id, activo}` (esquema según `migration_fase_b.sql`).
- **`GET /api/superadmin/platform-logs`:** paginación; filtros opcionales `fecha_desde`, `fecha_hasta` (día UTC inclusive en `hasta`).
- **Protección:** todos con `Depends(require_superadmin)`. SQL con placeholders `$1…$n`, `get_db()`, try/except + `logger.error`.
- **Requisito BD:** columna `tenants.activo` y tabla `platform_logs` (Fase B). Sin migración, estos endpoints fallan al ejecutar.
- **Verificación:** `python -c "from main import create_app; create_app()"` OK.

### 26/03/2026 — Auth / JWT rol **superadmin** ([PRD_SUPERADMIN_TENANTS_PRUEBAS.md](PRD_SUPERADMIN_TENANTS_PRUEBAS.md) §2, §6 — prioridad P1)

- **Objetivo:** Extender autenticación para rol plataforma **superadmin** sin romper usuarios multi-tenant existentes. Referencia explícita a secciones **2** (rol superadmin, `tenant_id` NULL en BD) y **6** (login JWT con `tenant_id` nullable, futuros `/api/superadmin`).
- **`backend/routers/auth.py` — `POST /api/auth/login`:** Tras verificar email/password, si `rol == 'superadmin'`, el payload del JWT lleva `role='superadmin'`, `negocio_id=None`, `tenant_id=None`. Usuarios con otros roles: mismo `token_data` que antes (`sub`, `user_id`, `role`, `negocio_id` desde `tenant_id`). `TokenResponse` mantiene forma; `negocio_id` null para superadmin. SQL sin cambios (sigue `SELECT id, tenant_id, …, rol` con placeholders); no se expone `password_hash`.
- **`backend/auth/jwt_handler.py`:** Documentación sobre serialización de `None` en claims. En **`verify_token`**, si `role == 'superadmin'`, se hace copia del payload y `setdefault('tenant_id', None)` y `setdefault('negocio_id', None)` para claims opcionales ausentes o nulas tras decode. Verificación local: round-trip encode/decode con nulos OK.
- **`backend/auth/dependencies.py`:** Docstring en `require_roles` aclarando que `tenant_id`/`negocio_id` pueden ser `None`. Alias **`require_superadmin = require_roles(['superadmin'])`** para uso futuro en routers (ningún router existente modificado en este paso).
- **`get_current_user`:** Sin cambio de contrato; sigue devolviendo el dict del JWT decodificado.
- **Verificación:** `cd backend && python -c "from main import create_app; create_app()"` sin errores.
- **Pendiente Fase B tras este bloque:** ejecutar `migration_fase_b.sql` en Supabase si aún no. **Hecho (26/03):** API `admin_usuarios/`, UI `/superadmin/*` y `/admin/usuarios` — ver entradas §8.

### 26/03/2026

- **GUIA_PRODUCCION_COMPLETA.md** v1.0.2: nueva sección **0. Plan ejecutable paso a paso** (orden Fase A Supabase KDS → deploy §1.2 → Fase B1 SQL opcional → B2/B3 código → Fase C), tabla «qué ya está en repo» y quién ejecuta cada tipo de tarea.
- **migration_fase_b.sql:** bloque previo `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS activo` para BDs sin esa columna (error 42703 al insertar tenant prueba). **SCHEMA_BASE_DATOS.md:** fila `tenants.activo` alineada con PRD.
- **`.cursor/mcp.json`:** MCP Supabase vía `npx` + `@supabase/mcp-server-supabase` (patrón recomendado en Windows cuando falla la URL remota `mcp.supabase.com`); **`--project-ref`** HorecaSO; token en variable de entorno `SUPABASE_ACCESS_TOKEN` (no en el repo). **27/03/2026:** eliminado **`--read-only`** del arranque para permitir `apply_migration` y DDL vía MCP (tras cambio, recargar MCP/Cursor). Ver entrada §8 «27/03/2026 — MCP Supabase» y `BUGS_Y_SOLUCIONES.md` (BUG-009).

### 26/03/2026 (schema + guía)

- **[SCHEMA_BASE_DATOS.md](SCHEMA_BASE_DATOS.md):** regenerado desde volcado JSON de `list_tables` (verbose) MCP Supabase — **39 tablas** en `public`, columnas/PK/FK, RLS off en snapshot, nota `tenants.activo` ausente en instancia, bloque «Fase B prevista» sin `platform_logs` / `tenant_audit_log` / `usuario_permisos` en ese volcado.
- **[backend/scripts/schema_mcp_json_to_markdown.py](backend/scripts/schema_mcp_json_to_markdown.py):** script para repetir la generación: `python backend/scripts/schema_mcp_json_to_markdown.py <dump_mcp.json> SCHEMA_BASE_DATOS.md`
- **[GUIA_PRODUCCION_COMPLETA.md](GUIA_PRODUCCION_COMPLETA.md) v1.0.3:** fila en §0.1 con enlace al schema + script.

### 25/03/2026 — KDS cocina / barra (roles, API, UI)

- **Objetivo de producto:** cocina no ve líneas de barra; barra no ve líneas de cocina; roles de sala (`camarero`, `jefe_sala`, `admin`, `director`) ven **vista completa**. Bebidas/platos deben llevar `productos.destino_kds` correcto (`cocina` | `barra` | `ninguno`) en carta/admin; líneas con `ninguno` no se listan en KDS.
- **Backend — `backend/routers/kds/kds_shared.py`:** `jefe_sala` puede forzar `?vista=cocina|barra|completa` (antes solo admin/director). `_assert_patch_role_destino`: `camarero`, `jefe_sala`, `admin` y `director` pueden actualizar estado tanto en líneas de cocina como de barra (PATCH coherente con vista completa).
- **Backend — `backend/routers/kds/kds.py`:** Respuesta de `GET /api/kds/comandas` con campos explícitos (`estado_cocina`, `estado_barra`, `enviado_*_at`, `destino_kds_label`, `kds_terminado`). Query **`incluir_servidos`**: por defecto `true` si la vista resuelta es `completa`, `false` en cocina/barra (líneas ya servidas visibles para sala). Filtro `destino_kds <> 'ninguno'`.
- **Frontend:** `KDSPage.jsx` título según rol (`tituloKdsPorRol`). `KdsTicketCard.jsx`: chip **Cocina** / **Barra**, estado servido como **“Ya terminado”** sin acciones. `KdsColumnaEstado` + `emptyKdsCopy(rol)` para textos vacíos por estación. `kdsHelpers.js`: `destinoKdsBadgeClass`, `estadoLabel` servido → “Ya terminado”. **`frontend/src/services/api.js`:** `getKDSComandas(params)` opcional para query params futuros.

### 25/03/2026 — Prep deploy (guía §1.2 parcial en repo)

- **`backend/config.py`:** `ENVIRONMENT` (default `development`). Con `ENVIRONMENT=production` en Render u otro host: OpenAPI `/docs` y `/redoc` desactivados.
- **`backend/main.py`:** `SecurityHeadersMiddleware` (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, etc.). Verificación local: `python -c "from main import create_app; create_app()"`.
- **`BUGS_Y_SOLUCIONES.md`:** BUG-008 ✅. **`npm run build`** en `frontend/`: OK (aviso Vite por tamaño de chunk >500 kB, no falla el build).

---

*Este documento refleja únicamente lo inspeccionado en los archivos indicados por el usuario; no sustituye a ejecutar tests ni a comprobar el estado real de Supabase.*

**Nota MCP (27/03/2026):** Tras quitar `--read-only`, confirmar en tu máquina que `apply_migration` y DDL funcionan; el estado de tablas Fase B (`platform_logs`, etc.) depende de ejecutar `migration_fase_b.sql` en la instancia.
