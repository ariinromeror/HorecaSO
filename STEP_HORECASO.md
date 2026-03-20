# HorecaSO — STEP v2.1
## State of The Entire Project
### Última actualización: 20/03/2026 — Día 3 tarde

---

## CONTEXTO DEL PROYECTO

**Producto:** HorecaSO — ERP web SaaS para hostelería española
**Desarrollador:** Arin Romero — autodidacta, 2 meses de experiencia, usa IA como herramienta principal
**Herramientas:** Claude (arquitectura, diseño y prompts) + Cursor (escritura de código)
**Target:** Restaurantes medianos, 5-50 empleados, mercado español
**Posicionamiento:** Por encima de Revo, Agora e ICG en funcionalidad
**Modelo de negocio:** SaaS multi-tenant con planes Básico / Profesional / Premium / Enterprise

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
| Deploy | Render (backend) + Vercel (frontend) | — | PENDIENTE |
| IA | Groq API (llama3 + vision) | — | PENDIENTE |
| PDF | ReportLab | — | PENDIENTE |
| Rate limiting | SlowAPI | — | ✅ |
| Email | SendGrid | — | PENDIENTE |

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
│   │   ├── tpv.py                   ✅ enviado_cocina=true — PENDIENTE división cuenta
│   │   ├── verifactu.py             ✅ testeado
│   │   ├── carta.py                 ✅ testeado
│   │   ├── admin_carta.py           ✅ require_roles, Decimal, try/except
│   │   ├── admin_recetas.py         ✅ require_roles, Decimal, try/except
│   │   ├── dashboard.py             ✅ testeado
│   │   ├── inventario.py            ✅ SQL sin f-strings, Decimal, try/except
│   │   ├── kds.py                   ✅ implementado — pendiente testeo completo
│   │   ├── proveedores.py           PENDIENTE Fase 3
│   │   ├── reservas.py              PENDIENTE Fase 3
│   │   ├── clientes.py              PENDIENTE Fase 3
│   │   ├── empleados.py             PENDIENTE Fase 3
│   │   ├── nominas.py               PENDIENTE Fase 3
│   │   └── reportes.py              PENDIENTE Fase 4
│   ├── services/
│   │   ├── verifactu_engine.py      ✅ testeado
│   │   ├── food_cost.py             PENDIENTE Fase 4
│   │   ├── inventario_fifo.py       PENDIENTE Fase 4
│   │   ├── ia_facturas.py           PENDIENTE Fase 3
│   │   └── pdf_generator.py         PENDIENTE Fase 4
│   ├── config.py                    ✅
│   ├── database.py                  ✅
│   ├── main.py                      ✅
│   └── requirements.txt             ✅
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── shared/
│       │   │   ├── StatCard.jsx         ✅ dark: en trend corregido
│       │   │   ├── Loader.jsx           ✅
│       │   │   └── EmptyState.jsx       ✅
│       │   └── layout/
│       │       ├── Sidebar.jsx          ✅ sin modo colapsado, overflow-y-auto
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
│       │   │   └── TPVPage.jsx          ✅ — PENDIENTE cards compactas + división
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
│       │   │   ├── ProveedoresPage.jsx  PENDIENTE
│       │   │   └── FacturasPage.jsx     PENDIENTE
│       │   ├── empleados/
│       │   │   ├── EmpleadosPage.jsx    PENDIENTE
│       │   │   ├── CuadrantePage.jsx    PENDIENTE
│       │   │   ├── FichajesPage.jsx     PENDIENTE
│       │   │   └── NominasPage.jsx      PENDIENTE
│       │   ├── reservas/
│       │   │   └── ReservasPage.jsx     PENDIENTE
│       │   ├── clientes/
│       │   │   └── ClientesPage.jsx     PENDIENTE
│       │   └── reportes/
│       │       └── ReportesPage.jsx     PENDIENTE
│       ├── services/
│       │   └── api.js                   ✅ todas las funciones hasta KDS y mesas
│       ├── App.jsx                      ✅ rutas placeholder para módulos pendientes
│       └── index.css                    ✅
├── .cursorrules                         ⚠️ v2.1 generado — PENDIENTE aplicar al proyecto
└── .gitignore                           ✅
```

---

## ESTADO DETALLADO POR MÓDULO

### MÓDULO 1 — TPV ✅ COMPLETO (parcial — pendiente mejoras UI)
- Backend: tickets, líneas, cobro, cierre de caja ✅
- Frontend: TPVPage dos columnas desktop / tabs móvil ✅
- Verifactu integrado en cobro (misma transacción) ✅
- enviado_cocina=true al añadir líneas (para KDS) ✅
- **PENDIENTE:** Cards compactas (grid 2/3/4/5 cols, scroll interno)
- **PENDIENTE:** División de cuenta (múltiples métodos de pago por ticket)

### MÓDULO 2 — MESAS ✅ COMPLETO
- Backend: GET/POST/PUT/DELETE + PATCH estado ✅
- Frontend: MesasPage tarjetas visuales con sillas y colores ✅
- GestionSalaPage: configuración del local (crear/editar/eliminar mesas) ✅
- Pendiente Fase 4: mapa de calor de rentabilidad por mesa

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

### MÓDULO 5 — KDS (Kitchen Display System) ✅ COMPLETO
- Backend: GET comandas agrupadas, PATCH estado línea, GET estadísticas ✅
- Frontend: KDSPage pantalla completa sin sidebar ✅
- Polling 30s, colores por tiempo (ok/warning/crítico) ✅
- Botones Preparando / Listo por plato ✅
- Pendiente: testeo completo con datos reales en Swagger

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
- Backend proveedores.py + facturas + IA escaneo ✅
- ProveedoresPage + FacturasPage ✅
- PENDIENTE: flujo confirmación modal IA completo
- PENDIENTE: soporte PDF en escaneo
- PENDIENTE: capture="environment" móvil

### MÓDULO 10 — EMPLEADOS Y RRHH ✅ COMPLETO
- empleados.py: CRUD + fichajes + turnos + cuadrantes + ausencias ✅
- nominas.py: cálculo automático SS 6.35% + SS empresa 29.9% + IRPF ✅
- EmpleadosPage.jsx ✅
- FichajesPage.jsx (RDL 8/2019) ✅
- CuadrantePage.jsx ✅
- NominasPage.jsx ✅
- Sidebar: Control Horario + Cuadrante + Nóminas ✅
- Tabla ausencias creada en Supabase ✅
- nombre_completo añadido como fallback en empleados ✅
- PENDIENTE: bug móvil input se sale de pantalla (cosmético)

### MÓDULO 11 — RESERVAS Y CLIENTES ⏳ PENDIENTE FASE 3
- Backend reservas.py: CRUD reservas, estados, origen
- Backend clientes.py: historial, puntos fidelidad, alérgenos
- Frontend: ReservasPage calendario + ClientesPage historial
- Confirmación por SMS/email (SendGrid): Fase 4
- Widget embebible online: Fase 5

### MÓDULO 12 — ANALYTICS AVANZADO ⏳ PENDIENTE FASE 4
- Rentabilidad por mesa/hora (mapa de calor)
- Ingeniería de menú (Matriz BCG): estrella/caballo/puzzle/perro
- Previsión de demanda con IA (Groq)
- Coste de personal vs ingresos por turno
- Comparativa semana/mes

### MÓDULO 13 — REPORTES Y PDF ⏳ PENDIENTE FASE 4
- Ticket de venta con QR Verifactu (ReportLab)
- Cierre de caja en PDF
- Nóminas en PDF
- Resumen fiscal modelo 303
- Exportación CSV AEAT

### MÓDULO 14 — DELIVERY E INTEGRACIONES ⏳ PENDIENTE FASE 5
- Glovo, Uber Eats, Just Eat: webhooks → TPV automático
- Comisiones por plataforma
- Carta digital QR pública multi-idioma

### MÓDULO 15 — ENTERPRISE ⏳ PENDIENTE FASE 5
- XML SOAP Verifactu + certificado + envío real AEAT
- Multi-idioma react-i18next ES/EN/FR/DE
- Modelos fiscales 303 y 130
- Integración datáfono Ingenico/Verifone
- WhatsApp Business Twilio
- Contabilidad Holded/Contasol
- WebSocket (requiere Render Starter $7/mes)

---

## PROGRESO REAL POR FASE

```
FASE 0 — Infraestructura:              100% ✅
FASE 1 — Backend Core:                 100% ✅
FASE 1 — Frontend Operativo:           100% ✅
FASE 2 — Carta y Recetas:             100% ✅
FASE 2 — Inventario y Mermas:         100% ✅
FASE 2 — KDS:                         100% ✅
FASE 2 — Gestión Sala:                100% ✅
FASE 2 — Auditoría cursorrules:       100% ✅
────────────────────────────────────────────────
PENDIENTE INMEDIATO (antes de Fase 3):
  cursorrules v2.1 aplicar al proyecto   0% ← MAÑANA PRIMERO
  TPV cards compactas                    0% ← MAÑANA SEGUNDO
  División de cuenta (BD + backend + UI) 0% ← MAÑANA TERCERO
────────────────────────────────────────────────
FASE 3 — Proveedores + IA facturas:    85% ✅ (pendiente mejoras)
FASE 3 — Empleados + RRHH:            100% ✅
FASE 3 — Reservas + Clientes:           0% SIGUIENTE
FASE 4 — Analytics avanzado:           0% PENDIENTE
FASE 4 — PDF y Reportes:               0% PENDIENTE
FASE 4 — APPCC + FIFO:                 0% PENDIENTE
FASE 5 — Enterprise:                   0% PENDIENTE
Deploy Render + Vercel:                 0% PENDIENTE

TOTAL PROYECTO REAL: ~60%
```

---

## TAREAS PARA MAÑANA — EN ESTE ORDEN EXACTO

### PASO 1 — Aplicar .cursorrules v2.1 al proyecto
El archivo .cursorrules v2.1 ya está generado (descargado en esta sesión).
Reemplazar el .cursorrules en la raíz del proyecto HorecaSO/
con el archivo v2.1 descargado.
NO dar ningún prompt a Cursor para esto — es solo copiar el archivo.

### PASO 2 — TPV cards compactas
Dar a Cursor el prompt de cards compactas para TPVPage.jsx.
El prompt ya está redactado — ver sección "PROMPTS LISTOS".
Verificar en el navegador que con 3+ productos se ven compactos.

### PASO 3 — División de cuenta (3 partes)
**Parte A — Supabase:**
Crear la tabla ticket_pagos en Supabase manualmente:
```sql
CREATE TABLE ticket_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    importe NUMERIC(10,2) NOT NULL,
    metodo_pago VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ticket_pagos_ticket_id ON ticket_pagos(ticket_id);
```

**Parte B — Backend tpv.py:**
Dar a Cursor el prompt de división de cuenta backend.
Ver sección "PROMPTS LISTOS".

**Parte C — Frontend TPVPage.jsx:**
Dar a Cursor el prompt de división de cuenta frontend.
Ver sección "PROMPTS LISTOS".

### PASO 4 — Backend Proveedores
Dar a Cursor el prompt de proveedores.py.
Es el módulo más complejo de Fase 3 — incluye IA Groq.

### PASO 5 — Frontend Proveedores
ProveedoresPage + FacturasPage (con botón escanear IA).

### PASO 6 — Backend Empleados + Nóminas
empleados.py + nominas.py — dos routers.

### PASO 7 — Frontend RRHH
EmpleadosPage + CuadrantePage + FichajesPage + NominasPage.

### PASO 8 — Backend Reservas + Clientes
reservas.py + clientes.py.

### PASO 9 — Frontend Reservas + Clientes
ReservasPage (calendario) + ClientesPage.

---

## PROMPTS LISTOS PARA MAÑANA

### PROMPT A — TPV Cards Compactas
```
Mejorar el grid de productos en src/pages/tpv/TPVPage.jsx.

PROBLEMA:
Las cards de productos son demasiado grandes.
Con 30+ productos el scroll sería inmanejable en un TPV táctil.

CAMBIOS:

1. Grid de productos:
   grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5
   gap-2 entre cards

2. Cada card compacta:
   <div onClick={() => añadirProducto(producto)}
     className="bg-white dark:bg-[#1a1d27]
       border border-[#e2e5ed] dark:border-[#2e3347]
       rounded-xl p-3 cursor-pointer
       hover:border-amber-500 hover:shadow-md
       transition-all duration-150 active:scale-95
       flex flex-col gap-2">
     <span className="text-[14px] font-medium leading-tight
       line-clamp-2 min-h-[2.5rem]
       text-[#111827] dark:text-[#e8eaf0]">
       {producto.nombre}
     </span>
     <span className="text-base font-bold text-amber-500">
       {precio}€
     </span>
     <button className="w-full h-9 bg-amber-500 hover:bg-amber-600
       text-black text-sm font-semibold rounded-lg
       flex items-center justify-center gap-1">
       <Plus size={14} strokeWidth={1.5} /> Añadir
     </button>
   </div>
   Card entera clickable. Botón usa e.stopPropagation().

3. Área de productos: overflow-y-auto flex-1
   Tabs de categorías: sticky top-0 fuera del área scrollable

NO tocar columna derecha, flujo de cobro, otros archivos.
npm run build al terminar.
```

### PROMPT B — División de cuenta backend
```
Añadir división de cuenta en backend/routers/tpv.py.
La tabla ticket_pagos ya existe en Supabase.
NO crear nuevos archivos — solo modificar tpv.py.

NUEVOS ENDPOINTS:

1. POST /api/tpv/tickets/{ticket_id}/pagos
   Body: { importe: Decimal, metodo_pago: str }
   - Verificar que el ticket existe y está abierto
   - Verificar que el importe > 0
   - Verificar que metodo_pago es válido:
     efectivo|tarjeta_credito|tarjeta_debito|bizum|transferencia|invitacion
   - INSERT en ticket_pagos
   - Calcular total pagado = suma de todos los pagos del ticket
   - Si total_pagado >= ticket.total:
     * Marcar ticket como cobrado (estado = 'cobrado', cobrado_at = NOW())
     * Calcular tiempo_ocupacion en minutos
     * Generar registro Verifactu (mismo código que cobro normal)
     * Actualizar mesa a estado 'libre'
     * Todo en la misma transacción
   - Retornar:
     { pago_id, ticket_id, importe_pagado, total_pagado,
       pendiente, completado: bool, metodo_pago }

2. GET /api/tpv/tickets/{ticket_id}/pagos
   - Lista todos los pagos de un ticket
   - Retornar:
     { pagos: [{id, importe, metodo_pago, created_at}],
       total_ticket, total_pagado, pendiente }

3. DELETE /api/tpv/tickets/{ticket_id}/pagos/{pago_id}
   - Solo si el ticket sigue abierto (no cobrado)
   - Eliminar el pago
   - Retornar { deleted: true, pendiente_actualizado }

ROLES: admin, camarero, jefe_sala en todos.
Decimal para todos los cálculos.
try/except en todos.
Verifactu en misma transacción que cobro.
```

### PROMPT C — División de cuenta frontend
```
Añadir división de cuenta en src/pages/tpv/TPVPage.jsx.
NO crear nuevos archivos. NO tocar el backend.

FUNCIONALIDAD:
Cuando el camarero pulsa "Cobrar", en lugar de seleccionar
un solo método de pago, puede registrar múltiples pagos parciales
hasta completar el total.

CAMBIOS EN LA SECCIÓN DE COBRO:

1. Reemplazar el select de método de pago único por
   una interfaz de pagos múltiples:

   ESTADO nuevo:
   pagosRegistrados: []  → { importe, metodo_pago }[]
   importePago: ''       → input del importe actual
   metodoPago: 'efectivo' → método del pago actual
   totalPagado: calculado desde pagosRegistrados
   pendiente: ticket.total - totalPagado

2. UI de división:
   - Mostrar "Total: X€" prominente
   - Mostrar "Pagado: X€" en verde
   - Mostrar "Pendiente: X€" en rojo/amber según quede
   - Input importe (number step 0.01)
     Con botón rápido "Pendiente" que rellena el importe restante
   - Select método de pago
   - Botón "Añadir pago" → POST /api/tpv/tickets/{id}/pagos
   - Lista de pagos añadidos con botón eliminar cada uno
   - Botón "Completar cobro" visible solo cuando pendiente <= 0

3. Flujo:
   Mesa 1: 90€ total
   → Añadir pago: 30€ efectivo → pendiente: 60€
   → Añadir pago: 30€ bizum → pendiente: 30€
   → Añadir pago: 30€ tarjeta → pendiente: 0€
   → "Completar cobro" aparece → click → mesa libre

4. Actualizar api.js:
   addTicketPago(ticketId, { importe, metodo_pago })
   getTicketPagos(ticketId)
   deleteTicketPago(ticketId, pagoId)

NO cambiar el resto del TPV.
npm run build al terminar.
```

---

## APIS COMPLETADAS

```
Auth:
POST   /api/auth/login
GET    /api/auth/perfil

Mesas:
GET    /api/mesas
POST   /api/mesas
GET    /api/mesas/{id}
PUT    /api/mesas/{id}
DELETE /api/mesas/{id}
PATCH  /api/mesas/{id}/estado

TPV:
POST   /api/tpv/tickets
GET    /api/tpv/tickets/{id}
POST   /api/tpv/tickets/{id}/lineas
DELETE /api/tpv/tickets/{id}/lineas/{linea_id}
POST   /api/tpv/tickets/{id}/cobrar         ← cobro simple (mantener)
POST   /api/tpv/tickets/{id}/pagos          ← PENDIENTE (división cuenta)
GET    /api/tpv/tickets/{id}/pagos          ← PENDIENTE
DELETE /api/tpv/tickets/{id}/pagos/{id}     ← PENDIENTE
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
GET/POST/PUT/DELETE /api/admin/categorias
GET/POST/PUT/DELETE /api/admin/productos
POST   /api/admin/productos/{id}/alergenos

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
```

---

## APIS PENDIENTES

```
Proveedores (Fase 3):
GET/POST       /api/proveedores
GET/PUT        /api/proveedores/{id}
POST/GET       /api/facturas-proveedor
POST           /api/facturas-proveedor/escanear-ia  ← Groq vision
GET            /api/facturas-proveedor/pendientes-pago
POST/GET       /api/pedidos-proveedor
GET            /api/proveedores/comparativa-precios/{articulo_id}

Empleados (Fase 3):
GET/POST       /api/empleados
GET/PUT        /api/empleados/{id}
POST           /api/turnos/fichaje-entrada
POST           /api/turnos/fichaje-salida
GET            /api/turnos
GET            /api/turnos/horas-extra/{empleado_id}
GET/POST       /api/cuadrantes
GET/POST       /api/ausencias
PATCH          /api/ausencias/{id}/estado
GET            /api/nominas/{empleado_id}
POST           /api/nominas/calcular
GET            /api/nominas/{id}/pdf

Reservas y Clientes (Fase 3):
GET/POST       /api/reservas
PATCH          /api/reservas/{id}/estado
GET/POST       /api/clientes
GET            /api/clientes/{id}/historial
GET            /api/lista-espera
POST           /api/lista-espera

Analytics (Fase 4):
GET            /api/dashboard/rentabilidad-mesas
GET            /api/dashboard/ingenieria-menu
GET            /api/dashboard/coste-personal
GET            /api/ia/prevision-demanda
GET            /api/ia/sugerencias-menu

Reportes (Fase 4):
GET            /api/reportes/ticket/{id}
GET            /api/reportes/cierre-caja/{fecha}
GET            /api/reportes/ventas
GET            /api/reportes/costes
GET            /api/reportes/nomina/{id}
GET            /api/reportes/fiscal-trimestre

APPCC (Fase 4):
GET/POST       /api/appcc/registros

Delivery (Fase 5):
POST           /api/delivery/webhook/{plataforma}
GET            /api/delivery/pedidos
GET            /api/delivery/estadisticas
GET            /api/delivery/comisiones
```

---

## DECISIONES TÉCNICAS TOMADAS Y POR QUÉ

| Decisión | Motivo |
|----------|--------|
| Raw SQL sin ORM | Control total, rendimiento máximo en TPV bajo presión |
| Polling 30s en lugar de WebSocket | Render plan gratuito no soporta WS estable |
| Supabase pgbouncer | statement_cache_size=0 obligatorio |
| Decimal para dinero | Nunca float en cálculos financieros |
| Un solo Sidebar filtrado por rol | Evitar duplicación y inconsistencias |
| Sidebar siempre expandido con scroll | Regla: iconos siempre con texto en nav |
| Modales con bg-black/60 | Estándar del design system |
| KDSPage sin AppLayout | Pantalla completa de cocina, igual que TPV |
| Placeholders en App.jsx | Navegación sin errores para módulos pendientes |
| Cards compactas en TPV | 30+ productos → scroll inmanejable con cards grandes |
| ticket_pagos tabla separada | División de cuenta múltiples métodos sin romper Verifactu |
| Verifactu al completar pagos | Se genera cuando suma(pagos) >= total del ticket |
| GestionSalaPage separada de MesasPage | MesasPage es operativa, GestionSala es configuración |

---

## PROBLEMAS CONOCIDOS Y SOLUCIONES APLICADAS

| Problema | Causa | Solución aplicada |
|----------|-------|-------------------|
| column "proveedor_habitual_id" does not exist | Columna del PRD no creada en Supabase | Eliminada del SELECT hasta Fase 3 |
| Pantalla en blanco tras login | visibleItems no definida en Sidebar refactorizado | Restaurada navegación plana |
| float en Pydantic models | Generado por Cursor sin seguir cursorrules | Corregido a Decimal |
| f-strings en SQL dinámico | Generado por Cursor | Corregido a concatenación + placeholders |
| bg-black/50 en modales | Inconsistencia generada por Cursor | Corregido a bg-black/60 |
| require_roles faltando | Cursor usó get_current_user directo | Corregido en admin_carta, admin_recetas |
| TPV sidebar click muerto | Ruta /tpv tenía Navigate to /mesas | Eliminada la ruta /tpv, flujo Sala→Mesa→TPV |
| Cards de producto gigantes | Cursor generó grid de 1-2 cols con padding grande | PENDIENTE fix mañana |

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
  - `GROQ_API_KEY` (cuando se implemente IA en Fase 3)
  - `SENDGRID_API_KEY` (cuando se implemente email en Fase 4)

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

- Día 1 (19/03/2026): ~10 horas — Infraestructura + Fase 1 completa + inicio Fase 2
- Día 2 (20/03/2026): ~10 horas — Fase 2 completa + KDS + GestionSala + auditoría + cursorrules v2.1
- Día 3 (20/03/2026 tarde): ~4 horas — RRHH completo backend + frontend

---

*STEP v2.1 — HorecaSO — Arin Romero — 20/03/2026 — Día 3 tarde*
*Próxima sesión: Reservas + Clientes (Fase 3) — mejoras Proveedores / IA facturas (opcional)*