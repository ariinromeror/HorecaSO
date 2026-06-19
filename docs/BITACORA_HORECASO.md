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
