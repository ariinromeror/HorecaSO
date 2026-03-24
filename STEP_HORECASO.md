# HorecaSO — STEP v3.4
## State of The Entire Project
### Última actualización: 24/03/2026 — Limpieza documentación (docs/archivo, índice, Fase B); routers en ARQUITECTURA

---

## CONTEXTO DEL PROYECTO

**Mapa técnico detallado (radiografía):** [ARQUITECTURA_HORECASO.md](ARQUITECTURA_HORECASO.md) — routers, prefijos API, flujos TPV/Verifactu/KDS, frontend ↔ backend.

**Producto:** HorecaSO — ERP web SaaS para hostelería española
**Desarrollador:** Arin Romero — autodidacta, 2 meses de experiencia, usa IA como herramienta principal
**Herramientas:** Claude (arquitectura, diseño, prompts) + Cursor (escritura de código)
**Target:** Restaurantes medianos, 5-50 empleados, mercado español
**Posicionamiento:** Por encima de Revo, Agora e ICG en funcionalidad
**Modelo de negocio:** SaaS multi-tenant — planes Básico / Profesional / Premium / Enterprise

---

## STACK TÉCNICO DEFINITIVO

| Capa | Tecnología | Versión | Estado |
|------|-----------|---------|--------|
| Backend | FastAPI | 0.115 | ✅ |
| Python | 3.12 | — | ✅ |
| Driver DB | asyncpg raw SQL (sin ORM) | — | ✅ |
| Frontend | React | 19 | ✅ |
| Build | Vite | 7 | ✅ |
| Estilos | Tailwind CSS | 4 | ✅ |
| Iconos | lucide-react strokeWidth={1.5} | — | ✅ |
| Base de datos | PostgreSQL 15 vía Supabase | — | ✅ |
| Auth | JWT + bcrypt 4.0.1 + passlib 1.7.4 | — | ✅ |
| Deploy | Render (backend) + Vercel (frontend) | — | ⏳ **AL FINAL** (tras fixes local) |
| IA | Groq API (llama3 + vision) | — | ✅ facturas; ⏳ previsión Analytics |
| PDF | ReportLab | — | ✅ nómina, inventario, cierre, ventas, cuadrante, rentabilidad platos, comparativa, appcc |
| Rate limiting | SlowAPI | — | ✅ |
| Email | SendGrid | — | ⏳ Fase 4 |

**Prohibido siempre:** NestJS · Django · SQLAlchemy · TypeScript en backend · Express · Next.js

---

## NOTAS TÉCNICAS CRÍTICAS

- DATABASE_URL pooler Supabase: `aws-1-eu-west-1.pooler.supabase.com:6543`
- `statement_cache_size=0` obligatorio en asyncpg (pgbouncer)
- Patrón conexión: `async with get_db() as conn` — SIEMPRE
- `SECRET_KEY_AUTH` en .env (NO llamarla SECRET_KEY)
- bcrypt==4.0.1 requiere shim en main.py para passlib 1.7.4
- email-validator==2.2.0 requerido para EmailStr de pydantic
- IVA hostelería: 10% general, 21% alcohol y tabaco
- Verifactu: SHA-256 MAYÚSCULAS, campos con &, UTF-8 sin BOM
- `fecha_hora_generacion` guardada en verifactu_registros — crítico
- NUNCA UPDATE/DELETE en verifactu_registros
- Nóminas España: SS empleado 6.35%, SS empresa 29.9%, IRPF tabla AEAT
- Control horario obligatorio desde RDL 8/2019
- Decimal para TODOS los cálculos monetarios — nunca float
- float() solo permitido en dicts de respuesta JSON final
- Semáforo recetas: verde >65%, amarillo 40-65%, rojo <40%
- cantidad_bruta: `cantidad_neta / (1 - porcentaje_merma/100)`
- Métodos de pago: efectivo, tarjeta_credito, tarjeta_debito, bizum, transferencia, invitacion
- División de cuenta: tabla `ticket_pagos` — ticket cobrado cuando suma(pagos) >= total
- Polling tiempo real: cada 30s con setInterval — NO WebSocket hasta Render de pago
- Tema: dark/light con clase `dark` en html, key localStorage `horecaso_theme`
- Iconos: lucide-react strokeWidth={1.5} — NUNCA emojis como iconos de UI
- SQL dinámico: concatenar cláusulas SÍ permitido, valores SIEMPRE por $1,$2
- require_roles([...]) obligatorio en TODOS los endpoints protegidos
- FastAPI: `redirect_slashes=False` en `main.py` — evita 307 en llamadas `/api/recurso` vs `/api/recurso/`; rutas listado duplicadas `""` + `"/"` donde aplica tras el split de routers
- try/except HTTPException/Exception con logger.error en TODOS los endpoints
- Tablas en desktop (md+) → cards apiladas en móvil — SIEMPRE
- Modales con overlay bg-black/60 — SIEMPRE
- Botones táctiles mínimo h-12 (48px) — excepción h-9 en cards de producto
- Fuente mínima 15px en contenido (no badges)
- Sidebar: un solo componente, filtra por rol, siempre expandido con scroll
- Cards de productos: grid compacto 2/3/4/5 cols, scroll interno, tabs sticky
- nombre_completo en empleados es fallback cuando no hay usuario_id vinculado
- asyncpg espera datetime.time para columnas TIME — nunca string 'HH:MM'

---

## IDs DE DATOS DE PRUEBA

- Tenant demo: `00000000-0000-0000-0000-000000000001` (NIF: B12345678)
- Outlet demo: `00000000-0000-0000-0000-000000000002` (Sala Principal)
- Mesa demo: `e81c7ff3-bd71-4739-b371-d43ddc10067e` (interior, cap 4)
- Usuario admin: `admin@test.com` / `admin123` (rol: admin)
- Categoria Bebidas: `00000000-0000-0000-0000-000000000010`
- Categoria Entrantes: `d6768a83-2e98-4698-a5cf-528c5111d6a2`
- Coca Cola ID: `666291da-ddab-409b-85fb-d682962bee71`
- Receta Coca Cola ID: `7ffa8a21-3019-46ff-943c-512b402880a7`
- Articulo Refresco Lata ID: `a9ab9052-d89d-470d-b723-c368f2c87b09`
- Empleado demo: `b19dc957-d31e-4008-a0ad-bed3029adc46` (María García López, Camarera)
- Cliente demo: `94f058b1-5d36-4834-8fd7-f23dc7955ad8` (Ana López)
- Reserva demo: `99ec00d4-50b5-4617-8936-3d00b94a6f82` (Carlos Martínez, 25/03/2026)
- Nómina demo: `a984535c-ec9f-457a-80fc-2c6342bebe4e` (María García, marzo 2026)

---

## ESTRUCTURA DE ARCHIVOS ACTUAL

```
HorecaSO/
├── backend/
│   ├── auth/
│   │   ├── __init__.py              ✅
│   │   ├── schemas.py               ✅
│   │   ├── jwt_handler.py           ✅
│   │   └── dependencies.py          ✅ require_roles factory
│   ├── routers/
│   │   ├── __init__.py              ✅ paquete (imports relativos)
│   │   ├── auth.py                  ✅ testeado
│   │   ├── mesas.py                 ✅ orquestador /api/mesas (+ mesas_list, mesas_mutations, mesas_shared)
│   │   ├── tpv/                     ✅ tpv.py + tpv_cobro + submódulos tickets/líneas/pagos
│   │   ├── verifactu.py             ✅ testeado
│   │   ├── carta.py                 ✅ testeado (pública TPV + pública)
│   │   ├── admin_carta/             ✅ admin_carta + admin_productos + shared
│   │   ├── recetas/                 ✅ admin_recetas + ingredientes + shared
│   │   ├── dashboard.py             ✅ testeado
│   │   ├── inventario/              ✅ inventario.py + inventario_movimientos + shared
│   │   ├── kds/                     ✅ kds.py + kds_estados + shared
│   │   ├── proveedores/             ✅ proveedores + facturas_proveedor + shared
│   │   ├── reservas/                ✅ reservas.py + reservas_read/write + lista_espera + shared
│   │   ├── clientes/                ✅ clientes + clientes_historial + shared
│   │   ├── empleados/               ✅ empleados, fichajes, cuadrantes, ausencias + shared
│   │   ├── nominas.py               ✅ cálculo automático SS + IRPF
│   │   ├── analytics/               ✅ analytics_mesas, menu, personal + shared
│   │   ├── reportes/                ✅ reportes.py + reportes_dif_* + shared
│   │   ├── fifo/                    ✅ fifo + fifo_consumo + shared
│   │   └── appcc.py                 ✅ registros APPCC
│   ├── services/
│   │   ├── verifactu_engine.py      ✅ testeado
│   │   ├── food_cost.py             ⏳ módulo dedicado real vs teórico (no creado; coste en recetas)
│   │   ├── ia_facturas.py           ✅ Groq vision implementado
│   │   ├── pdf_generator.py         ✅ + pdf_nomina, pdf_inventario, pdf_reportes, pdf_diferenciales*
│   ├── config.py                    ✅
│   ├── database.py                  ✅
│   ├── main.py                      ✅ routers + `redirect_slashes=False` (evita 307 en APIs)
│   ├── requirements.txt             ✅
│   └── sql/
│       └── migration_kds_barra_destino.sql  ✅ en repo — aplicar en Supabase (destino_kds, barra, líneas)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── shared/
│       │   │   ├── StatCard.jsx         ✅
│       │   │   ├── Loader.jsx           ✅
│       │   │   └── EmptyState.jsx       ✅
│       │   └── layout/
│       │       ├── Sidebar.jsx          ✅ módulos por rol + KDS cocina/barra/sala + Recetas y Costes
│       │       └── AppLayout.jsx        ✅ ml-64 fijo
│       ├── constants/
│       │   └── uiTokens.js              ✅
│       ├── context/
│       │   ├── AuthContext.jsx          ✅ + fichaje entrada opcional tras login (empleado_id)
│       │   └── ThemeContext.jsx         ✅
│       ├── utils/
│       │   └── textSanitize.js          ✅ strip emojis (carta/TPV)
│       ├── pages/
│       │   ├── LoginPage.jsx            ✅
│       │   ├── sala/
│       │   │   └── MesasPage.jsx        ✅ + marcar mesa libre (PATCH estado)
│       │   ├── tpv/
│       │   │   ├── TPVPage.jsx          ✅ división cuenta + liberar mesa + strip tabs carta
│       │   │   └── components/
│       │   │       └── TpvMesaOcupadaAlert.jsx  ✅ (si aplica flujo mesa ocupada)
│       │   ├── director/
│       │   │   ├── DashboardPage.jsx    ✅
│       │   │   └── VentaLivePage.jsx    ✅ polling 30s
│       │   ├── admin/
│       │   │   ├── CartaPage.jsx        ✅ sin emoji; destino_kds; refetch
│       │   │   ├── RecetasPage.jsx      ✅ + carpeta recetas/ (utils + ingredientes)
│       │   │   └── GestionSalaPage.jsx  ✅ + móvil
│       │   ├── inventario/
│       │   │   ├── InventarioPage.jsx   ✅ + selects/filtros móvil seguros
│       │   │   ├── MermasPage.jsx       ✅ + filtros móvil
│       │   │   ├── APPCCPage.jsx        ✅ (ruta /appcc) + filtros móvil
│       │   │   └── FIFOPage.jsx         ✅ (ruta /fifo) + layout móvil
│       │   ├── cocina/
│       │   │   └── KDSPage.jsx          ✅ polling; vista rol cocina/barra/sala; Ya salió
│       │   ├── proveedores/
│       │   │   ├── ProveedoresPage.jsx  ✅
│       │   │   └── FacturasPage.jsx     ✅ IA escaneo + filtros/grid móvil
│       │   ├── empleados/
│       │   │   ├── EmpleadosPage.jsx    ✅ + layout móvil selects
│       │   │   ├── CuadrantePage.jsx    ✅
│       │   │   ├── FichajesPage.jsx     ✅ RDL 8/2019 + toggle fichar al login + historial
│       │   │   └── NominasPage.jsx      ✅ + selects móvil
│       │   ├── reservas/
│       │   │   └── ReservasPage.jsx     ✅ tabs Reservas + Lista espera
│       │   ├── clientes/
│       │   │   └── ClientesPage.jsx     ✅ historial + puntos fidelidad
│       │   ├── analytics/
│       │   │   └── AnalyticsPage.jsx    ✅ + BCG UI: Ganador, Motor ventas, Bajo rendimiento, Interrogante
│       │   └── reportes/
│       │       ├── ReportesPage.jsx       ✅ tabs PDF (operativos, ventas, RRHH, proveedores)
│       │       └── components/          ✅ ReportesOperativos, Ventas, RRHH, Proveedores
│       ├── services/
│       │   └── api.js                   ✅
│       ├── App.jsx                      ✅ todas las rutas registradas
│       └── index.css                    ✅
├── ARQUITECTURA_HORECASO.md        ✅ radiografía técnica (routers, flujos, mapa repo)
├── BUGS_Y_SOLUCIONES.md            ✅ bugs + fixes (incl. BUG-005…008 routing 24/03)
├── docs/archivo/REFACTOR_SPLIT_ESTADO.md   📁 histórico — refactor backend/frontend cerrado (marzo 2026)
├── (deuda técnica: ver sección final + plan roadmap Cursor)
├── .cursorrules                         ✅ v2.1
└── .gitignore                           ✅
```

---

## ESTADO DETALLADO POR MÓDULO

### MÓDULO 1 — TPV ✅ COMPLETO (refactor UI menor pendiente)
- Backend: tickets, líneas, cobro, **división de cuenta** (`POST/GET/DELETE /api/tpv/tickets/{id}/pagos`) ✅
- Frontend: TPVPage modo división + pagos parciales ✅
- Verifactu integrado al completar cobro (suma pagos ≥ total) ✅
- Líneas TPV: envío KDS según **destino_kds** del producto (`enviado_cocina` / `enviado_barra`) ✅
- **Mesa libre:** `patchMesaEstado` + acción en TPV cuando mesa ocupada sin ticket coherente ✅
- Tabs carta TPV: texto sin emoji (`stripEmojis`) ✅
- **PENDIENTE cosmético:** cards compactas grid (densidad productos)

### MÓDULO 2 — MESAS ✅ COMPLETO
- Backend: GET/POST/PUT/DELETE + PATCH estado ✅
- Frontend: MesasPage tarjetas visuales con sillas y colores ✅
- GestionSalaPage: crear/editar/eliminar mesas ✅
- Pendiente Fase 4: mapa de calor rentabilidad por mesa

### MÓDULO 3 — VERIFACTU ✅ COMPLETO
- Hash chain SHA-256 implementado ✅
- Exportar CSV para AEAT ✅
- Verificar integridad de cadena ✅
- fecha_hora_generacion guardada correctamente ✅
- Envío real AEAT: Fase 5 (requiere certificado digital)

### MÓDULO 4 — CARTA Y MENÚ ✅ COMPLETO
- Backend: categorías, productos, alérgenos ✅ + saneo/prohibición emoji al guardar (`admin_carta`) ✅
- Frontend: CartaPage con tabs Categorías/Productos ✅ + refetch tras guardar + `stripEmojis` en UI ✅
- Campo **destino_kds** por producto (cocina / barra / ninguno) para KDS ✅
- 14 alérgenos reglamentarios con checkboxes ✅
- Toggle activo/inactivo por producto ✅
- IVA 10%/21% configurable por producto ✅

### MÓDULO 5 — KDS ✅ COMPLETO (cocina / barra / sala)
- Backend: GET comandas filtradas por **rol** (cocina → solo `destino_kds=cocina`, barra → barra, sala/admin/director → completo) ✅
- Solo tickets **abierto**; líneas cobradas no se acumulan; estado **servido** + acción **Ya salió** ✅
- Al **cobrar** ticket: líneas enviadas a cocina/barra pasan a `servido` donde aplica ✅
- Columnas línea: `enviado_barra`, `estado_barra` (migración `migration_kds_barra_destino.sql`) ✅
- Rol **`barra`** en usuarios + rutas/sidebar ✅
- Frontend: KDSPage polling 30s, sin sidebar ✅
- Polling 30s, colores por tiempo (ok/warning/crítico) ✅
- Botones Preparando / Listo / Servido (flujo según diseño actual) ✅

### MÓDULO 6 — RECETAS Y COSTES ✅ COMPLETO
- Backend: CRUD recetas, ingredientes, semáforo, coste en tiempo real ✅
- Frontend: RecetasPage con semáforo global ✅ + sección **Ingredientes y cantidades** (`recetas/RecetaDetalleIngredientesSection.jsx`, `recetasUtils.js`) ✅
- Copy UI: sin “escandallo”; tooltips merma en lenguaje claro; tabla precios almacén; coste estimado por ración ✅
- Sidebar: entrada **Recetas y Costes** ✅
- **Merma:** documentada en STEP/PRD; fórmula bruta ↔ neta en código ✅
- Semáforo: verde >65%, amarillo 40-65%, rojo <40% ✅
- Pendiente Fase 4: Real vs Teórico (`food_cost.py`); **futuro:** panel compositor / sub-recetas (plan Cursor)

### MÓDULO 7 — INVENTARIO ✅ COMPLETO
- Backend: artículos, movimientos, alertas, inventario físico ✅
- Frontend: InventarioPage + MermasPage ✅
- **FIFO:** [`routers/fifo.py`](backend/routers/fifo.py) + [`FIFOPage.jsx`](frontend/src/pages/inventario/FIFOPage.jsx) ✅ (lotes, consumos, valoración)
- **APPCC:** [`routers/appcc.py`](backend/routers/appcc.py) + [`APPCCPage.jsx`](frontend/src/pages/inventario/APPCCPage.jsx) ✅

### MÓDULO 8 — DASHBOARD ✅ COMPLETO (básico)
- KPIs del día, top productos, cierre por método de pago ✅
- VentaLivePage con polling 30s ✅
- Rentabilidad mesas/hora e **ingeniería menú BCG** viven en **Analytics** (módulo 12) ✅
- Pendiente Fase 4: previsión IA; KPIs extra en dashboard si se desean

### MÓDULO 9 — PROVEEDORES Y COMPRAS ✅ COMPLETO (parcial)
- Backend: CRUD proveedores + facturas + IA escaneo Groq vision ✅
- Frontend: ProveedoresPage + FacturasPage ✅
- **PENDIENTE refactor final:** flujo confirmación modal IA completo
- **PENDIENTE refactor final:** soporte PDF en escaneo
- **PENDIENTE refactor final:** capture="environment" cámara móvil

### MÓDULO 10 — EMPLEADOS Y RRHH ✅ COMPLETO
- empleados.py: CRUD + fichajes + turnos + cuadrantes + ausencias ✅ (+ rol **barra** donde aplica en cuadrante/fichajes)
- nominas.py: cálculo automático SS 6.35% + SS empresa 29.9% + IRPF ✅
- **Auth:** `GET /api/auth/perfil` incluye **empleado_id** vinculado ✅
- **Fichaje al iniciar sesión:** `AuthContext` → `POST /turnos/fichaje-entrada` si aplica; **FichajesPage** toggle “fichar al entrar” (localStorage) ✅
- EmpleadosPage.jsx ✅
- FichajesPage.jsx (RDL 8/2019) + historial/rango ✅
- CuadrantePage.jsx ✅
- NominasPage.jsx ✅
- Sidebar: Empleados + Control Horario + Cuadrante + Nóminas ✅
- Tablas Supabase: empleados + turnos + cuadrantes + nominas + ausencias ✅
- nombre_completo como fallback (empleados sin usuario_id) ✅
- **Auditoría móvil:** selects/barras RRHH con `min-w-0` / `max-w-full` / overflow (sesión roadmap) ✅

### MÓDULO 11 — RESERVAS Y CLIENTES ✅ COMPLETO
- reservas.py: CRUD + PATCH estado + lista espera ✅
- clientes.py: CRUD + historial tickets + puntos fidelidad ✅
- ReservasPage.jsx: tabs Reservas / Lista de espera ✅
- ClientesPage.jsx: tabla + modal historial + modal puntos ✅
- Sidebar: Reservas + Clientes ✅
- Tablas Supabase: reservas + clientes + lista_espera ✅
- Confirmación por email (SendGrid): Fase 4
- Widget embebible online: Fase 5

### MÓDULO 12 — ANALYTICS ✅ PARCIAL (Fase 4)
- **✅ Backend+frontend:** `GET /api/dashboard/rentabilidad-mesas`, `ingenieria-menu`, `coste-personal` ([`analytics.py`](backend/routers/analytics.py) + [`AnalyticsPage.jsx`](frontend/src/pages/analytics/AnalyticsPage.jsx))
- **✅ Copy BCG en pantalla:** claves API sin cambio; etiquetas UI — **Ganador**, **Motor de ventas**, **Bajo rendimiento**, **Interrogante** ✅
- **✅ PDF rentabilidad platos:** leyenda alineada en [`pdf_diferenciales.py`](backend/services/pdf_diferenciales.py) ✅
- Filtros Analytics: layout móvil seguro (`min-w-0`, etc.) ✅
- **⏳ Pendiente:** previsión demanda IA (Groq); comparativas semana/mes/año ampliadas
- Tabla `rentabilidad_mesas`: en uso por API (mantener datos/job si aplica)

### MÓDULO 13 — REPORTES Y PDF ✅ PARCIAL
- **✅ Implementado (ReportLab):** nómina, inventario, cierre caja, ventas periodo, cuadrante, rentabilidad platos (BCG), comparativa proveedores, appcc ([`reportes.py`](backend/routers/reportes.py) + [`reportes_diferenciales.py`](backend/routers/reportes_diferenciales.py)); UI [`ReportesPage`](frontend/src/pages/reportes/ReportesPage.jsx)
- **⏳ Pendiente:** ticket de venta con QR Verifactu; resumen fiscal modelo 303; más informes si PRD los pide
- **✅** Exportación CSV AEAT (Verifactu) — ya en módulo Verifactu

### MÓDULO 14 — APPCC Y FIFO ✅ HECHO · food_cost ⏳
- **✅ APPCC:** CRUD registros + resumen + PDF informe
- **✅ FIFO:** lotes `lotes_inventario`, entradas/consumos, UI dedicada
- **⏳** `food_cost.py` / **Real vs teórico** agregado por receta: no hay servicio aparte; coste en tiempo real sigue en admin recetas

### MÓDULO 15 — DELIVERY E INTEGRACIONES ⏳ PENDIENTE FASE 5
- Glovo, Uber Eats, Just Eat: webhooks → TPV automático
- Comisiones por plataforma
- Carta digital QR pública multi-idioma

### MÓDULO 16 — ENTERPRISE ⏳ PENDIENTE FASE 5
- XML SOAP Verifactu + certificado digital + envío real AEAT
- Multi-idioma react-i18next ES/EN/FR/DE
- Modelos fiscales 303 y 130
- Integración datáfono Ingenico/Verifone
- WhatsApp Business Twilio
- Contabilidad Holded/Contasol
- WebSocket (requiere Render Starter $7/mes)

---

## PROGRESO REAL POR FASE

```
FASE 0 — Infraestructura:                    100% ✅
FASE 1 — Backend Core (TPV+Mesas+Verifactu): 100% ✅
FASE 1 — Frontend Operativo:                 100% ✅
FASE 2 — Carta y Recetas:                   100% ✅
FASE 2 — Inventario y Mermas:               100% ✅
FASE 2 — KDS:                               100% ✅ (cocina/barra/sala, Ya salió, tickets abiertos, rol barra)
FASE 2 — Gestión Sala:                      100% ✅
FASE 3 — Proveedores + IA facturas:          85% ✅ (modal IA, PDF escaneo, cámara)
FASE 3 — Empleados + RRHH:                  100% ✅
FASE 3 — Reservas + Clientes:               100% ✅
────────────────────────────────────────────────────
FASE 4 — Analytics (dashboard endpoints + UI): ~75% ✅ (falta IA previsión, comparativas)
FASE 4 — PDFs ReportLab:                    ~85% ✅ (falta ticket+QR, 303 fiscal)
FASE 4 — APPCC + FIFO:                      100% ✅
FASE 5 — Delivery + Enterprise:               0% ← PENDIENTE
────────────────────────────────────────────────────
Refactorización JSX (páginas largas):         ~25% ✅ (recetas parcial; TPV/Carta/Analytics pendiente)
Deploy Render + Vercel:                        0% ← ÚLTIMO (tras local estable)

TOTAL PROYECTO REAL: ~84% (estimación post-roadmap bugs/KDS/UX)
```

---

## ORDEN DE TRABAJO ACORDADO

```
1. ✅ Fase 1 — Core completo
2. ✅ Fase 2 — Inventario, KDS, Carta, Recetas, GestionSala
3. ✅ Fase 3 — Proveedores + IA escaneo
4. ✅ Fase 3 — RRHH completo (empleados, nóminas, fichajes, cuadrante)
5. ✅ Fase 3 — Reservas + Clientes + Lista espera
─────────────────────────────────────────────────────
6. ✅ Fase 4 — Analytics base (rentabilidad, ingeniería menú BCG, coste personal)
7. ✅ Fase 4 — PDFs ReportLab (nómina, inventario, cierre, ventas, cuadrante, rentabilidad, comparativa, appcc)
8. ✅ Fase 4 — APPCC + FIFO
9. ⏳ Fase 4 — Restos: IA previsión Analytics; PDF ticket+QR; modelo 303; food_cost agregado
10. ⏳ Fase 5 — Delivery + Enterprise (según prioridad)
─────────────────────────────────────────────────────
11. ✅ Refactor parcial recetas + **bugs plan** (mesa libre, emoji carta, KDS cobrado/servido, selects móvil, fichaje login, BCG UI, rol barra)
12. 🔧 Pendientes Proveedores (modal IA, PDF escaneo, cámara)
13. ✅ **cursorrules** v2.1 + fila rol **barra** en tabla roles
14. 🚀 **Deploy Render + Vercel — AL FINAL** (cuando local OK)
```

---

## APIS COMPLETADAS

```
Auth:
POST   /api/auth/login
GET    /api/auth/perfil                 ✅ incluye empleado_id (fichaje al login)

Mesas:
GET/POST/PUT/DELETE  /api/mesas
PATCH                /api/mesas/{id}/estado

TPV:
POST   /api/tpv/tickets
GET    /api/tpv/tickets/{id}
POST   /api/tpv/tickets/{id}/lineas
DELETE /api/tpv/tickets/{id}/lineas/{linea_id}
POST   /api/tpv/tickets/{id}/cobrar
GET    /api/tpv/tickets/abiertos
GET    /api/tpv/carta
POST   /api/tpv/cierre-caja
GET    /api/tpv/cierre-caja/{fecha}
POST   /api/tpv/tickets/{id}/pagos
GET    /api/tpv/tickets/{id}/pagos
DELETE /api/tpv/tickets/{id}/pagos/{pago_id}

Verifactu:
GET    /api/verifactu/registros
GET    /api/verifactu/verificar-cadena
GET    /api/verifactu/exportar

Carta pública:
GET    /api/carta
GET    /api/alergenos

Admin Carta:
GET/POST/PUT/DELETE  /api/admin/categorias
GET/POST/PUT/DELETE  /api/admin/productos
POST                 /api/admin/productos/{id}/alergenos

Admin Recetas:
GET    /api/admin/recetas
POST   /api/admin/recetas
PUT    /api/admin/recetas/{id}
GET    /api/admin/recetas/semaforo
GET    /api/admin/recetas/{id}/coste
POST   /api/admin/recetas/{id}/ingredientes
DELETE /api/admin/recetas/{id}/ingredientes/{ing_id}

Dashboard:
GET    /api/dashboard/director
GET    /api/dashboard/cierre-dia

Analytics (mismo prefijo dashboard bajo /api):
GET    /api/dashboard/rentabilidad-mesas
GET    /api/dashboard/ingenieria-menu
GET    /api/dashboard/coste-personal

Inventario:
GET    /api/inventario/articulos
POST   /api/inventario/articulos
PUT    /api/inventario/articulos/{id}
GET    /api/inventario/stock-alertas
POST   /api/inventario/movimientos
GET    /api/inventario/movimientos
POST   /api/inventario/inventario-fisico

FIFO:
GET/POST  /api/fifo/lotes
(otros endpoints consumo/valoración según fifo.py)

APPCC:
GET/POST  /api/appcc/registros (+ resumen)

Reportes PDF:
GET    /api/reportes/nomina/{id}
GET    /api/reportes/inventario
GET    /api/reportes/cierre-caja/{fecha}
GET    /api/reportes/ventas?desde&hasta
GET    /api/reportes/cuadrante/{semana}
GET    /api/reportes/rentabilidad-platos
GET    /api/reportes/comparativa-proveedores/{articulo_id}
GET    /api/reportes/appcc?desde&hasta

KDS:
GET    /api/kds/comandas
PATCH  /api/kds/lineas/{id}/estado
GET    /api/kds/estadisticas

Proveedores:
GET/POST       /api/proveedores
GET/PUT        /api/proveedores/{id}
POST/GET       /api/facturas-proveedor
POST           /api/facturas-proveedor/escanear-ia
GET            /api/facturas-proveedor/pendientes-pago

Empleados:
GET/POST       /api/empleados
GET/PUT        /api/empleados/{id}
POST           /api/turnos/fichaje-entrada
POST           /api/turnos/fichaje-salida
GET            /api/turnos
GET            /api/turnos/horas-extra/{empleado_id}
GET/POST       /api/cuadrantes
GET/POST       /api/ausencias
PATCH          /api/ausencias/{id}/estado

Nóminas:
GET            /api/nominas/{empleado_id}
POST           /api/nominas/calcular
GET            /api/nominas/{nomina_id}/detalle

Reservas:
GET/POST       /api/reservas
GET/PUT        /api/reservas/{id}
PATCH          /api/reservas/{id}/estado
GET/POST       /api/lista-espera
PATCH          /api/lista-espera/{id}/estado

Clientes:
GET/POST       /api/clientes
GET/PUT        /api/clientes/{id}
GET            /api/clientes/{id}/historial
POST           /api/clientes/{id}/puntos
```

---

## APIS PENDIENTES (o Fase 5)

```
IA / Analytics extra:
GET    /api/ia/prevision-demanda          ⏳
GET    /api/ia/sugerencias-menu           ⏳

Reportes / fiscal extra:
GET    /api/reportes/ticket/{id}           ⏳ ticket PDF + QR Verifactu
GET    /api/reportes/fiscal-trimestre      ⏳ modelo 303 / resumen

Delivery (Fase 5):
POST   /api/delivery/webhook/{plataforma}
GET    /api/delivery/pedidos
...
```

---

## TABLAS SUPABASE — ESTADO COMPLETO

```
✅ CREADAS Y VERIFICADAS:
tenants, outlets, usuarios (rol puede incluir **barra** tras migración KDS)
mesas
categorias_menu, alergenos, productos (+ **destino_kds** tras migración), producto_alergenos
menus_dia, menu_dia_platos
tickets, ticket_lineas (+ **enviado_barra**, **estado_barra** tras migración), ticket_pagos, cierres_caja
verifactu_registros
articulos, lotes_inventario, movimientos_stock, mermas
recetas, receta_ingredientes
proveedores, pedidos_proveedor, facturas_proveedor,
  facturas_proveedor_lineas
empleados (+ nombre_completo añadido), turnos, cuadrantes,
  nominas, ausencias
clientes, reservas, lista_espera

✅ En uso / creadas para Fase 4:
rentabilidad_mesas (analytics)
registros_appcc
lotes_inventario (FIFO)
```

---

## DECISIONES TÉCNICAS TOMADAS

| Decisión | Motivo |
|----------|--------|
| Raw SQL sin ORM | Control total, rendimiento máximo en TPV bajo presión |
| Polling 30s en lugar de WebSocket | Render plan gratuito no soporta WS estable |
| Supabase pgbouncer | statement_cache_size=0 obligatorio |
| Decimal para dinero | Nunca float en cálculos financieros |
| Un solo Sidebar filtrado por rol | Evitar duplicación y inconsistencias |
| Sidebar siempre expandido con scroll | Iconos siempre con texto en nav |
| Modales con bg-black/60 | Estándar del design system |
| KDSPage sin AppLayout | Pantalla completa de cocina |
| nombre_completo en empleados | Fallback para empleados sin cuenta de usuario |
| asyncpg datetime.time para TIME | asyncpg no acepta strings en columnas TIME |
| ticket_pagos tabla separada | División cuenta sin romper Verifactu |
| Verifactu al completar pagos | Se genera cuando suma(pagos) >= total |
| Deploy al final de todo | Primero todo funcional en local, luego deploy único |
| Refactor al final de todo | Evitar romper funcionalidad activa |

---

## PROBLEMAS CONOCIDOS Y SOLUCIONES APLICADAS

> **Registro detallado y bugs nuevos:** [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md)

| Problema | Causa | Solución |
|----------|-------|----------|
| column "proveedor_habitual_id" does not exist | Columna PRD no creada en Supabase | Eliminada del SELECT |
| Pantalla en blanco tras login | visibleItems no definida en Sidebar | Restaurada navegación plana |
| float en Pydantic models | Generado por Cursor | Corregido a Decimal |
| f-strings en SQL dinámico | Generado por Cursor | Corregido a concatenación + placeholders |
| bg-black/50 en modales | Inconsistencia Cursor | Corregido a bg-black/60 |
| require_roles faltando | Cursor usó get_current_user directo | Corregido en admin_carta, admin_recetas |
| column "nombre_completo" does not exist | Cursor insertaba campo inexistente | Añadida columna + COALESCE en JOINs |
| column "salario_bruto_mensual" does not exist | Tabla empleados incompleta | ALTER TABLE para añadir columnas |
| asyncpg TIME error | String '14:00:00' en lugar de datetime.time | _parse_hora_time() helper en reservas.py |
| Usuario sin outlet_id | Admin demo sin outlet asignado | UPDATE usuarios SET outlet_id en Supabase |
| CuadrantePage "sin outlet" | Mismo problema que arriba | Corregido con UPDATE en Supabase |

---

## DEUDA TÉCNICA — ANTES DEL DEPLOY

```
1. Refactorización código — líneas / mantenibilidad:
   ✅ Backend: split por dominio (TPV, proveedores, mesas, reservas, inventario, …) — ver [docs/archivo/REFACTOR_SPLIT_ESTADO.md](docs/archivo/REFACTOR_SPLIT_ESTADO.md)
   ✅ Recetas JSX: parcial (RecetaDetalleIngredientesSection + recetasUtils)
   ✅ Frontend Fase 2 split: mayoría de páginas troceadas — deuda residual en **QUÉ FALTA → Pendientes operativos**

2. Auditoría cursorrules / endpoints:
   - require_roles en endpoints nuevos (revisar tras cada feature)
   - Decimal en cálculos monetarios
   - dark: y mobile first (continuar en nuevas pantallas)

3. ~~Fixes móvil selects/filtros~~ ✅ amplia auditoría hecha (Analytics, Inventario, FIFO, APPCC,
   Reservas, Mermas, Facturas, GestionSala, TPV select cobro, RRHH…)
   ⏳ Revisar overflow puntual en modales si aparece en dispositivo concreto

4. Pendientes Proveedores / PWA / refactor residual / auditoría código: ver **QUÉ FALTA SEGÚN STEP → Pendientes operativos** (fusionado desde `Penientes.md`, criterio [docs/archivo/AUDITORIA_RESULTADO.md](docs/archivo/AUDITORIA_RESULTADO.md) 24/03/2026).

5. ~~División de cuenta TPV~~ ✅ HECHO
```

---

## CONFIGURACIÓN DE DEPLOY (cuando esté listo)

**Backend en Render:**
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Variables de entorno:
  - `DATABASE_URL` (pooler Supabase)
  - `SECRET_KEY_AUTH`
  - `ALLOWED_ORIGINS` (URL de Vercel)
  - `GROQ_API_KEY`
  - `SENDGRID_API_KEY`

**Frontend en Vercel:**
- Root Directory: `frontend`
- Framework Preset: Vite
- Variables de entorno:
  - `VITE_API_URL=https://horecaso-backend.onrender.com/api`

---

## PRECIOS DEL PRODUCTO

| Plan | Precio/mes | Módulos incluidos |
|------|-----------|-------------------|
| Básico | 79€ | TPV + Mesas + Verifactu + Carta + KDS |
| Profesional | 149€ | Básico + Inventario + Recetas + Reservas + Proveedores |
| Premium | 249€ | Profesional + RRHH + Nóminas + Analytics + IA |
| Enterprise | 399€ | Todo + Delivery + Multi-outlet + API + Soporte prioritario |

---

## BITÁCORA DE TRABAJO (sesiones recientes)

### 24/03/2026 — Refactor routers + routing FastAPI (STEP v3.3)

| Campo | Detalle |
|-------|---------|
| **Enfoque** | Post-split: `redirect_slashes=False`; roles en listados mesas/reservas/turnos; rutas `GET` con y sin `/` final (405); handlers compartidos en `mesas.py` / `reservas.py`. |
| **Docs** | Refactor documentado en [docs/archivo/REFACTOR_SPLIT_ESTADO.md](docs/archivo/REFACTOR_SPLIT_ESTADO.md); [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md) BUG-005…008. |
| **KDS** | Error `destino_kds` en BD → ejecutar migración SQL en Supabase (BUG-008). |

### 18/03/2026 — Roadmap bugs + KDS + UX (sincronizado STEP v3.2)

| Campo | Detalle |
|-------|---------|
| **Ventana trabajo** | **12:00 → 18:30** (y trabajo posterior en días siguientes sobre mismo bloque) |
| **Enfoque** | Plan «bugs críticos, KDS por rol, fichajes, naming, refactor parcial» |

**Implementado y reflejado en código + [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md):**

- **TPV + Mesas:** `patchMesaEstado` en `api.js`; liberar mesa en TPV; marcar mesa libre en **MesasPage**; alerta mesa ocupada si aplica (**TpvMesaOcupadaAlert**).
- **Carta:** sin emojis (`textSanitize.js`, `admin_carta`, refetch Carta/TPV); **destino_kds** en productos (admin + TPV líneas).
- **KDS:** solo tickets `abierto`; filtros por rol **cocina** / **barra** / vista completa; **Ya salió** → `servido`; al cobrar, líneas KDS coherentes; migración **`migration_kds_barra_destino.sql`** (aplicar en Supabase); rol **`barra`** en auth/sidebar/fichajes.
- **Móvil:** auditoría **selects** y contenedores (`min-w-0`, `max-w-full`, overflow) en Analytics, Inventario, FIFO, APPCC, Reservas, Mermas, Facturas, GestionSala, TPV, RRHH, reportes, Carta.
- **Analytics + PDF:** etiquetas BCG en UI (**Ganador**, **Motor de ventas**, **Bajo rendimiento**, **Interrogante**); leyenda PDF en `pdf_diferenciales.py`.
- **Recetas:** componentes `recetas/RecetaDetalleIngredientesSection.jsx`, `recetasUtils.js`; copy sin «escandallo»; sidebar **Recetas y Costes**.
- **Fichajes:** `empleado_id` en **GET /auth/perfil**; fichaje opcional tras login en **AuthContext**; toggle en **FichajesPage**.
- **Docs:** glosario **merma** en STEP/PRD; **BUGS_Y_SOLUCIONES.md** con tabla + bitácora detallada del plan.
- **Refactor:** extracción parcial recetas; pendiente trocear TPV/Carta/Analytics/Dashboard.

> Al **cerrar sesión** puntual, anotar hora final en *TIEMPO INVERTIDO*.

---

## TIEMPO INVERTIDO

- Día 1 (19/03/2026): ~10h — Infraestructura + Fase 1 completa + inicio Fase 2
- Día 2 (20/03/2026): ~10h — Fase 2 completa + KDS + GestionSala + auditoría + cursorrules v2.1
- Día 3 (20/03/2026 tarde): ~4h — RRHH completo backend + frontend
- Día 3 (20/03/2026 noche): ~2h — Reservas y Clientes completos
- **18/03/2026:** +**6 h 30 min** (provisional, 12:00–18:30 mediodía) — **sesión abierta**; ver bitácora
- **Total acumulado:** ~**32 h 30 min** (26 h anteriores + 6h30 hoy provisional) — ajustar al cerrar día

---

## Registro de bugs (fuera del STEP)

Detalle ampliado y seguimiento día a día: **[BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md)**

---

## QUÉ FALTA SEGÚN STEP (actualizado tras roadmap 18/03/2026)

| Área | Estado |
|------|--------|
| Deploy Render + Vercel | ⏳ **Último paso** cuando local estable |
| Supabase | ⏳ Confirmar migración **KDS barra/destino** aplicada en tu proyecto (si no, TPV/KDS fallan en esas columnas) |
| Analytics | ⏳ IA previsión/sugerencias; comparativas tiempo ampliadas |
| PDF | ⏳ Ticket venta + QR; informes fiscales (303) |
| food_cost agregado | ⏳ Servicio “real vs teórico” si se quiere aparte de recetas |
| Proveedores | ⏳ Modal IA completo, PDF en escaneo, `capture="environment"` |
| Recetas UX | ⏳ Panel compositor “tipo post” + sub-recetas (plan Cursor Fase 1/2) |
| Refactor JSX | ⏳ TPV, Carta, Analytics, Dashboard (páginas muy largas) |
| Fase 5 | ⏳ Delivery, Verifactu envío real AEAT, WS, etc. |

### Pendientes operativos (módulo proveedores + auditoría código)

*Extraídos de `Penientes.md` (archivado en [docs/archivo/Penientes.md](docs/archivo/Penientes.md)), conservando solo lo que la auditoría del 24/03/2026 marcó como ❌ pendiente o ⏳ parcial. PDF, `capture` y parte del modal IA ya están resumidos en la fila *Proveedores* de la tabla superior; aquí el detalle y lo que la tabla no cubre.*

1. **Facturas desde modal IA — stock (⏳ parcial):** El flujo de confirmación y `POST /api/facturas-proveedor` está en UI; falta **actualizar inventario** (movimientos de stock al registrar líneas de factura) en backend.
2. **PDF en escaneo IA (❌):** `accept` con `application/pdf` en el input; conversión PDF→imagen en backend antes de Groq.
3. **Cámara directa en móvil (❌):** `capture="environment"` en el input de imagen del escaneo.
4. **PWA (❌):** `manifest.json`, service worker e icono para pantalla de inicio (cuando se haga deploy).
5. **Refactor / archivos grandes (⏳ parcial):** Muchas páginas del listado histórico ya están troceadas; según auditoría quedan sobre todo `frontend/src/pages/inventario/components/ArticulosTable.jsx` (~329 líneas) y en backend `empleados/fichajes.py` (>300), `appcc.py` (~340), `recetas/admin_recetas_ingredientes.py` (~307). Patrón: `pages/<módulo>/components/` y routers en submódulos.
6. **Auditoría `.cursorrules` (⏳ parcial):** Revisión sistemática de `require_roles`, `Decimal`, clases `dark:` y mobile first en archivos nuevos o críticos (no hay barrido completo automatizado).

---

## FASE B — Superadmin, Gestión Usuarios, Tenant Prueba

**Estado:** ❌ No iniciado

| Ítem | Estado |
|------|--------|
| Rol superadmin en BD | ❌ |
| Tabla platform_logs | ❌ |
| Tabla tenant_audit_log | ❌ |
| Tabla usuario_permisos | ❌ |
| Router /api/superadmin | ❌ |
| Router /api/admin/usuarios | ❌ |
| Frontend pages/superadmin/ | ❌ |
| Frontend pages/admin/usuarios/ | ❌ |
| Tenant restauranteprueba (SQL seed) | ❌ |
| Script generate_test_hashes.py | ❌ |

**Referencia completa:** [PRD_SUPERADMIN_TENANTS_PRUEBAS.md](PRD_SUPERADMIN_TENANTS_PRUEBAS.md)

---

*STEP v3.4 — HorecaSO — Arin Romero — 24/03/2026*
*Estado: Fase 3 ✅ · Fase 4 ✅ parcial · Roadmap bugs/KDS/UX ✅ en código · Fase B ❌ no iniciada · Deploy al final*