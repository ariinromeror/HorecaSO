# HorecaSO — STEP v3.0
## State of The Entire Project
### Última actualización: 20/03/2026 — Fin Fase 3 / Inicio Fase 4

---

## CONTEXTO DEL PROYECTO

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
| Deploy | Render (backend) + Vercel (frontend) | — | ⏳ AL FINAL |
| IA | Groq API (llama3 + vision) | — | ⏳ Fase 4 |
| PDF | ReportLab | — | ⏳ Fase 4 |
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
│   │   ├── auth.py                  ✅ testeado
│   │   ├── mesas.py                 ✅ GET/POST/PUT/DELETE/PATCH estado
│   │   ├── tpv.py                   ✅ cobro simple — PENDIENTE división cuenta
│   │   ├── verifactu.py             ✅ testeado
│   │   ├── carta.py                 ✅ testeado
│   │   ├── admin_carta.py           ✅ require_roles, Decimal, try/except
│   │   ├── admin_recetas.py         ✅ require_roles, Decimal, try/except
│   │   ├── dashboard.py             ✅ testeado
│   │   ├── inventario.py            ✅ SQL sin f-strings, Decimal, try/except
│   │   ├── kds.py                   ✅ implementado
│   │   ├── proveedores.py           ✅ CRUD + facturas + IA escaneo
│   │   ├── reservas.py              ✅ CRUD + estados + lista espera
│   │   ├── clientes.py              ✅ CRUD + historial + puntos fidelidad
│   │   ├── empleados.py             ✅ CRUD + fichajes + turnos + cuadrantes + ausencias
│   │   ├── nominas.py               ✅ cálculo automático SS + IRPF
│   │   ├── analytics.py             ⏳ PENDIENTE Fase 4
│   │   └── reportes.py              ⏳ PENDIENTE Fase 4
│   ├── services/
│   │   ├── verifactu_engine.py      ✅ testeado
│   │   ├── food_cost.py             ⏳ PENDIENTE Fase 4
│   │   ├── inventario_fifo.py       ⏳ PENDIENTE Fase 4
│   │   ├── ia_facturas.py           ✅ Groq vision implementado
│   │   └── pdf_generator.py         ⏳ PENDIENTE Fase 4
│   ├── config.py                    ✅
│   ├── database.py                  ✅
│   ├── main.py                      ✅ todos los routers registrados
│   └── requirements.txt             ✅
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── shared/
│       │   │   ├── StatCard.jsx         ✅
│       │   │   ├── Loader.jsx           ✅
│       │   │   └── EmptyState.jsx       ✅
│       │   └── layout/
│       │       ├── Sidebar.jsx          ✅ todos los módulos, filtrado por rol
│       │       └── AppLayout.jsx        ✅ ml-64 fijo
│       ├── constants/
│       │   └── uiTokens.js              ✅
│       ├── context/
│       │   ├── AuthContext.jsx          ✅
│       │   └── ThemeContext.jsx         ✅
│       ├── pages/
│       │   ├── LoginPage.jsx            ✅
│       │   ├── sala/
│       │   │   └── MesasPage.jsx        ✅
│       │   ├── tpv/
│       │   │   └── TPVPage.jsx          ✅ PENDIENTE cards compactas + división cuenta
│       │   ├── director/
│       │   │   ├── DashboardPage.jsx    ✅
│       │   │   └── VentaLivePage.jsx    ✅ polling 30s
│       │   ├── admin/
│       │   │   ├── CartaPage.jsx        ✅
│       │   │   ├── RecetasPage.jsx      ✅
│       │   │   └── GestionSalaPage.jsx  ✅
│       │   ├── inventario/
│       │   │   ├── InventarioPage.jsx   ✅
│       │   │   └── MermasPage.jsx       ✅
│       │   ├── cocina/
│       │   │   └── KDSPage.jsx          ✅ polling 30s, sin sidebar
│       │   ├── proveedores/
│       │   │   ├── ProveedoresPage.jsx  ✅
│       │   │   └── FacturasPage.jsx     ✅ IA escaneo implementado
│       │   ├── empleados/
│       │   │   ├── EmpleadosPage.jsx    ✅
│       │   │   ├── CuadrantePage.jsx    ✅
│       │   │   ├── FichajesPage.jsx     ✅ RDL 8/2019
│       │   │   └── NominasPage.jsx      ✅
│       │   ├── reservas/
│       │   │   └── ReservasPage.jsx     ✅ tabs Reservas + Lista espera
│       │   ├── clientes/
│       │   │   └── ClientesPage.jsx     ✅ historial + puntos fidelidad
│       │   ├── analytics/
│       │   │   └── AnalyticsPage.jsx    ⏳ PENDIENTE Fase 4
│       │   └── reportes/
│       │       └── ReportesPage.jsx     ⏳ PENDIENTE Fase 4
│       ├── services/
│       │   └── api.js                   ✅
│       ├── App.jsx                      ✅ todas las rutas registradas
│       └── index.css                    ✅
├── Penientes.md                         ✅ actualizado con deuda técnica
├── .cursorrules                         ✅ v2.1
└── .gitignore                           ✅
```

---

## ESTADO DETALLADO POR MÓDULO

### MÓDULO 1 — TPV ✅ COMPLETO (mejoras UI pendientes)
- Backend: tickets, líneas, cobro simple, cierre de caja ✅
- Frontend: TPVPage dos columnas desktop / tabs móvil ✅
- Verifactu integrado en cobro (misma transacción) ✅
- enviado_cocina=true al añadir líneas (para KDS) ✅
- **PENDIENTE refactor final:** Cards compactas (grid 2/3/4/5 cols)
- **PENDIENTE refactor final:** División de cuenta (ticket_pagos ya existe en BD)

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
- Backend: categorías, productos, alérgenos ✅
- Frontend: CartaPage con tabs Categorías/Productos ✅
- 14 alérgenos reglamentarios con checkboxes ✅
- Toggle activo/inactivo por producto ✅
- IVA 10%/21% configurable por producto ✅

### MÓDULO 5 — KDS ✅ COMPLETO
- Backend: GET comandas agrupadas, PATCH estado línea, GET estadísticas ✅
- Frontend: KDSPage pantalla completa sin sidebar ✅
- Polling 30s, colores por tiempo (ok/warning/crítico) ✅
- Botones Preparando / Listo por plato ✅

### MÓDULO 6 — RECETAS Y ESCANDALLOS ✅ COMPLETO
- Backend: CRUD recetas, ingredientes, semáforo, coste en tiempo real ✅
- Frontend: RecetasPage con semáforo global y editor de ingredientes ✅
- Fórmula merma implementada correctamente ✅
- Semáforo: verde >65%, amarillo 40-65%, rojo <40% ✅
- Pendiente Fase 4: Real vs Teórico (food_cost.py)

### MÓDULO 7 — INVENTARIO ✅ COMPLETO
- Backend: artículos, movimientos, alertas, inventario físico ✅
- Frontend: InventarioPage + MermasPage ✅
- Lotes FIFO: Fase 4 (inventario_fifo.py)
- APPCC: Fase 4

### MÓDULO 8 — DASHBOARD ✅ COMPLETO (básico)
- KPIs del día, top productos, cierre por método de pago ✅
- VentaLivePage con polling 30s ✅
- Pendiente Fase 4: rentabilidad mesas/hora, ingeniería menú BCG, previsión IA

### MÓDULO 9 — PROVEEDORES Y COMPRAS ✅ COMPLETO (parcial)
- Backend: CRUD proveedores + facturas + IA escaneo Groq vision ✅
- Frontend: ProveedoresPage + FacturasPage ✅
- **PENDIENTE refactor final:** flujo confirmación modal IA completo
- **PENDIENTE refactor final:** soporte PDF en escaneo
- **PENDIENTE refactor final:** capture="environment" cámara móvil

### MÓDULO 10 — EMPLEADOS Y RRHH ✅ COMPLETO
- empleados.py: CRUD + fichajes + turnos + cuadrantes + ausencias ✅
- nominas.py: cálculo automático SS 6.35% + SS empresa 29.9% + IRPF ✅
- EmpleadosPage.jsx ✅
- FichajesPage.jsx (RDL 8/2019) ✅
- CuadrantePage.jsx ✅
- NominasPage.jsx ✅
- Sidebar: Empleados + Control Horario + Cuadrante + Nóminas ✅
- Tablas Supabase: empleados + turnos + cuadrantes + nominas + ausencias ✅
- nombre_completo como fallback (empleados sin usuario_id) ✅
- **PENDIENTE refactor final:** bug móvil — input se sale de pantalla (cosmético)

### MÓDULO 11 — RESERVAS Y CLIENTES ✅ COMPLETO
- reservas.py: CRUD + PATCH estado + lista espera ✅
- clientes.py: CRUD + historial tickets + puntos fidelidad ✅
- ReservasPage.jsx: tabs Reservas / Lista de espera ✅
- ClientesPage.jsx: tabla + modal historial + modal puntos ✅
- Sidebar: Reservas + Clientes ✅
- Tablas Supabase: reservas + clientes + lista_espera ✅
- Confirmación por email (SendGrid): Fase 4
- Widget embebible online: Fase 5

### MÓDULO 12 — ANALYTICS AVANZADO ⏳ PENDIENTE FASE 4
- Rentabilidad por mesa/hora
- Ingeniería de menú (Matriz BCG): estrella/vaca/perro/interrogante
- Previsión de demanda con IA (Groq)
- Coste de personal vs ingresos por turno
- Comparativa semana/mes/año
- Tablas Supabase necesarias: rentabilidad_mesas, ingenieria_menu (verificar)

### MÓDULO 13 — REPORTES Y PDF ⏳ PENDIENTE FASE 4
- Ticket de venta con QR Verifactu (ReportLab)
- Cierre de caja en PDF
- Nóminas en PDF
- Resumen fiscal modelo 303
- Exportación CSV AEAT

### MÓDULO 14 — APPCC Y FIFO ⏳ PENDIENTE FASE 4
- APPCC: registros de control temperatura, higiene
- FIFO: lotes de inventario con fecha caducidad
- food_cost.py: coste real vs teórico por receta
- Tabla Supabase: registros_appcc, lotes_inventario (verificar)

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
FASE 2 — KDS:                               100% ✅
FASE 2 — Gestión Sala:                      100% ✅
FASE 3 — Proveedores + IA facturas:          85% ✅ (pendiente mejoras menores)
FASE 3 — Empleados + RRHH:                  100% ✅
FASE 3 — Reservas + Clientes:               100% ✅
────────────────────────────────────────────────────
FASE 4 — Analytics avanzado:                  0% ← SIGUIENTE
FASE 4 — PDFs con ReportLab:                  0% ← PENDIENTE
FASE 4 — APPCC + FIFO:                        0% ← PENDIENTE
FASE 5 — Delivery + Enterprise:               0% ← PENDIENTE
────────────────────────────────────────────────────
Refactorización + fixes estéticos:             0% ← ANTES DEL DEPLOY
Deploy Render + Vercel:                        0% ← AL FINAL DE TODO

TOTAL PROYECTO REAL: ~70%
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
6. ⏳ Fase 4 — Analytics (rentabilidad mesas, ingeniería menú, IA)
7. ⏳ Fase 4 — PDFs ReportLab (tickets, nóminas, cierres)
8. ⏳ Fase 4 — APPCC + FIFO inventario
9. ⏳ Fase 5 — Delivery + Enterprise (según prioridad)
─────────────────────────────────────────────────────
10. 🔧 Refactorización JSX (componentes grandes → ~200 líneas)
11. 🔧 Fixes estéticos móvil (inputs, overflow)
12. 🔧 Pendientes Proveedores (modal IA, PDF, cámara)
13. 🔧 Auditoría cursorrules completa
14. 🚀 Deploy Render + Vercel
```

---

## APIS COMPLETADAS

```
Auth:
POST   /api/auth/login
GET    /api/auth/perfil

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

Inventario:
GET    /api/inventario/articulos
POST   /api/inventario/articulos
PUT    /api/inventario/articulos/{id}
GET    /api/inventario/stock-alertas
POST   /api/inventario/movimientos
GET    /api/inventario/movimientos
POST   /api/inventario/inventario-fisico

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

## APIS PENDIENTES

```
TPV (división cuenta — tabla ya existe):
POST   /api/tpv/tickets/{id}/pagos
GET    /api/tpv/tickets/{id}/pagos
DELETE /api/tpv/tickets/{id}/pagos/{pago_id}

Analytics (Fase 4):
GET    /api/dashboard/rentabilidad-mesas
GET    /api/dashboard/ingenieria-menu
GET    /api/dashboard/coste-personal
GET    /api/ia/prevision-demanda
GET    /api/ia/sugerencias-menu

Reportes PDF (Fase 4):
GET    /api/reportes/ticket/{id}
GET    /api/reportes/cierre-caja/{fecha}
GET    /api/reportes/ventas
GET    /api/reportes/costes
GET    /api/reportes/nomina/{id}
GET    /api/reportes/fiscal-trimestre

APPCC (Fase 4):
GET/POST  /api/appcc/registros

Delivery (Fase 5):
POST   /api/delivery/webhook/{plataforma}
GET    /api/delivery/pedidos
GET    /api/delivery/estadisticas
GET    /api/delivery/comisiones
```

---

## TABLAS SUPABASE — ESTADO COMPLETO

```
✅ CREADAS Y VERIFICADAS:
tenants, outlets, usuarios
mesas
categorias_menu, alergenos, productos, producto_alergenos
menus_dia, menu_dia_platos
tickets, ticket_lineas, ticket_pagos, cierres_caja
verifactu_registros
articulos, lotes_inventario, movimientos_stock, mermas
recetas, receta_ingredientes
proveedores, pedidos_proveedor, facturas_proveedor,
  facturas_proveedor_lineas
empleados (+ nombre_completo añadido), turnos, cuadrantes,
  nominas, ausencias
clientes, reservas, lista_espera

⏳ PENDIENTE VERIFICAR ANTES DE FASE 4:
rentabilidad_mesas
ingenieria_menu
registros_appcc
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
1. Refactorización JSX — componentes > 200 líneas:
   EmpleadosPage, NominasPage, CuadrantePage, FichajesPage,
   ReservasPage, ClientesPage, ProveedoresPage, FacturasPage
   → partir en pages/modulo/components/ autónomos

2. Auditoría cursorrules completa:
   - require_roles en todos los endpoints nuevos
   - Decimal en todos los cálculos monetarios
   - dark: en todos los componentes frontend
   - Mobile first en todos los layouts

3. Fixes estéticos móvil:
   - Inputs que se salen de pantalla en barra de búsqueda
   - Revisar overflow en modales móvil

4. Pendientes Proveedores:
   - Flujo confirmación modal IA completo
   - Soporte PDF en escaneo
   - capture="environment" cámara móvil

5. División de cuenta TPV:
   - Backend: POST/GET/DELETE /api/tpv/tickets/{id}/pagos
   - Frontend: UI pagos múltiples en TPVPage
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

## TIEMPO INVERTIDO

- Día 1 (19/03/2026): ~10h — Infraestructura + Fase 1 completa + inicio Fase 2
- Día 2 (20/03/2026): ~10h — Fase 2 completa + KDS + GestionSala + auditoría + cursorrules v2.1
- Día 3 (20/03/2026 tarde): ~4h — RRHH completo backend + frontend
- Día 3 (20/03/2026 noche): ~2h — Reservas y Clientes completos
- **Total acumulado: ~26 horas**

---

*STEP v3.0 — HorecaSO — Arin Romero — 20/03/2026*
*Estado: Fase 3 completa al 100% — Iniciando Fase 4 Analytics*