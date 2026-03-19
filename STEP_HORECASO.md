## PROMPT DE CONTEXTO PARA IA
Contexto del proyecto HorecaSO:

Soy Arin Romero, desarrollador autodidacta con 2 meses de experiencia.
Trabajo solo usando IA como herramienta principal (Cursor para código).

Te adjunto estos archivos que definen el proyecto completo:
- PRD_HorecaSO_v2.md → arquitectura completa, schema DB, módulos, fases
- STEP_HORECASO.md → estado actual — qué está hecho y qué falta (ESTE ARCHIVO)

STACK: FastAPI + React 19 + PostgreSQL + Supabase + asyncpg (sin ORM)
Deploy: Render (backend) + Vercel (frontend)
NO usar: NestJS, SQLAlchemy, TypeScript en backend, Django

Lee los archivos adjuntos y dime:
1. ¿Entiendes el estado actual del proyecto?
2. El siguiente paso según STEP_HORECASO.md es [ESCRIBE AQUÍ EL PASO ACTUAL]
   Ayúdame a completarlo siguiendo las reglas del PRD.

---

# HorecaSO — Estado del Proyecto
## Última actualización: 19/03/2026 — Fin de sesión día 1

---

## 🔧 NOTAS TÉCNICAS CRÍTICAS (leer antes de tocar código)

- **DATABASE_URL** usa pooler Supabase: `aws-1-eu-west-1.pooler.supabase.com:6543`
- **statement_cache_size=0** obligatorio en asyncpg (pgbouncer) — sin esto falla en producción
- **Patrón de conexión:** `async with get_db() as conn` — SIEMPRE así, nunca directo
- **SECRET_KEY_AUTH** en .env (NO llamarla SECRET_KEY)
- **bcrypt==4.0.1** requiere shim en main.py para compatibilidad con passlib 1.7.4
- **email-validator==2.2.0** requerido para que EmailStr de pydantic funcione
- **IVA hostelería España:** 10% general, 21% alcohol y tabaco
- **Verifactu:** SHA-256 en MAYÚSCULAS, campos separados por `&`, encoding UTF-8 sin BOM
- **fecha_hora_generacion** debe guardarse en verifactu_registros — crítico para verificar-cadena
- **Nóminas España:** SS empleado 6.35%, SS empresa 29.9%, IRPF según tabla AEAT
- **Control horario** obligatorio desde RDL 8/2019
- **Decimal** para TODOS los cálculos monetarios — nunca float
- **Semáforo recetas:** verde >65% margen, amarillo 40-65%, rojo <40%
- **cantidad_bruta recetas:** `cantidad_neta / (1 - porcentaje_merma/100)`
- **Métodos de pago válidos:** efectivo, tarjeta_credito, tarjeta_debito, bizum, transferencia, invitacion
- **Producto de prueba Coca Cola ID:** `666291da-ddab-409b-85fb-d682962bee71`
- **Receta Coca Cola ID:** `7ffa8a21-3019-46ff-943c-512b402880a7`
- **Tenant demo:** `00000000-0000-0000-0000-000000000001` (NIF: B12345678)
- **Outlet demo:** `00000000-0000-0000-0000-000000000002` (Sala Principal)
- **Mesa demo:** `e81c7ff3-bd71-4739-b371-d43ddc10067e` (interior, capacidad 4)
- **Usuario admin prueba:** admin@test.com / admin123 (rol: admin)
- **Categoría Bebidas:** `00000000-0000-0000-0000-000000000010`
- **Categoría Entrantes:** `d6768a83-2e98-4698-a5cf-528c5111d6a2`

---

## 📁 ESTRUCTURA DE ARCHIVOS DEL PROYECTO

```
HorecaSO/
├── backend/
│   ├── auth/
│   │   ├── __init__.py          ✅
│   │   ├── schemas.py           ✅
│   │   ├── jwt_handler.py       ✅
│   │   └── dependencies.py      ✅
│   ├── routers/
│   │   ├── __init__.py          ✅
│   │   ├── auth.py              ✅ testeado
│   │   ├── mesas.py             ✅ testeado
│   │   ├── tpv.py               ✅ testeado
│   │   ├── verifactu.py         ✅ testeado
│   │   ├── carta.py             ✅ testeado
│   │   ├── admin_carta.py       ✅ testeado
│   │   ├── admin_recetas.py     ✅ testeado
│   │   ├── dashboard.py         ⏰ SIGUIENTE PASO
│   │   ├── inventario.py        ⏰
│   │   ├── proveedores.py       ⏰
│   │   ├── empleados.py         ⏰
│   │   ├── reservas.py          ⏰
│   │   ├── clientes.py          ⏰
│   │   ├── kds.py               ⏰
│   │   ├── nominas.py           ⏰
│   │   └── reportes.py          ⏰
│   ├── services/
│   │   ├── verifactu_engine.py  ✅ testeado
│   │   ├── food_cost.py         ⏰
│   │   ├── inventario_fifo.py   ⏰
│   │   ├── pdf_generator.py     ⏰
│   │   └── ia_facturas.py       ⏰
│   ├── config.py                ✅
│   ├── database.py              ✅
│   ├── main.py                  ✅
│   └── requirements.txt         ✅
├── frontend/                    ⏰ TODO - no iniciado
├── docs/
│   ├── PRD_HorecaSO_v2.md      ✅
│   └── STEP_HORECASO.md        ✅
└── .gitignore                   ✅
```

---

# ✅ COMPLETADO

## INFRAESTRUCTURA Y BASE
- ✅ Python 3.12, Node.js, Git instalados
- ✅ Repositorio GitHub privado: ariinromeror/HorecaSO
- ✅ .gitignore correcto — .env, .venv, node_modules excluidos
- ✅ Estructura de carpetas creada

## SUPABASE — BASE DE DATOS
- ✅ Proyecto Supabase: HorecaSO (West EU Ireland, plan Nano)
- ✅ Conexión via pooler verificada (puerto 6543)
- ✅ Contraseña cambiada tras exposición accidental
- ✅ Todas las tablas del PRD v2 creadas (33 tablas total)
- ✅ Todas las columnas nuevas añadidas a tablas existentes
- ✅ 14 alérgenos reglamentarios insertados en tabla alergenos

## DATOS DE PRUEBA EN SUPABASE
- ✅ Tenant demo: id=00000000-0000-0000-0000-000000000001, NIF=B12345678
- ✅ Outlet demo: id=00000000-0000-0000-0000-000000000002, nombre=Sala Principal
- ✅ Usuario admin: admin@test.com / admin123, rol=admin
- ✅ Categoría Bebidas: id=00000000-0000-0000-0000-000000000010
- ✅ Categoría Entrantes: id=d6768a83-2e98-4698-a5cf-528c5111d6a2, icono=🥗, color=#22c55e
- ✅ Productos: Coca Cola (2.50€), Agua (1.50€), Cerveza (3.00€)
- ✅ Mesa 1: id=e81c7ff3-bd71-4739-b371-d43ddc10067e, zona=interior
- ✅ Artículo Refresco Lata: coste=0.50€/ud (insertar si no existe)
- ✅ Receta Coca Cola: id=7ffa8a21-3019-46ff-943c-512b402880a7

## BACKEND COMPLETADO Y TESTEADO

### Auth ✅
- ✅ POST /api/auth/login → JWT correcto
- ✅ GET /api/auth/perfil → datos usuario autenticado
- ✅ GET /api/auth/verify → {"valid": true}

### Mesas ✅
- ✅ GET /api/mesas → lista por outlet/tenant
- ✅ POST /api/mesas → crea con estado='libre'
- ✅ GET /api/mesas/{id} → detalle
- ✅ PATCH /api/mesas/{id}/estado → libre/ocupada/reservada

### TPV ✅ — Flujo end-to-end verificado
- ✅ POST /api/tpv/tickets → verifica mesa libre, crea ticket, cambia mesa a ocupada
- ✅ GET /api/tpv/tickets/abiertos
- ✅ GET /api/tpv/tickets/{id} → con líneas
- ✅ POST /api/tpv/tickets/{id}/lineas → Decimal, recalcula total
- ✅ DELETE /api/tpv/tickets/{id}/lineas/{linea_id}
- ✅ POST /api/tpv/tickets/{id}/cobrar → libera mesa + genera Verifactu

### Verifactu ✅ — integra: true verificado
- ✅ services/verifactu_engine.py completo
- ✅ GET /api/verifactu/registros
- ✅ GET /api/verifactu/registros/{id}
- ✅ GET /api/verifactu/verificar-cadena → {"integra": true}
- ✅ GET /api/verifactu/exportar → CSV fiscal

### Carta ✅
- ✅ GET /api/tpv/carta → agrupada por categoría (testeado)
- ✅ GET /api/tpv/carta/productos → lista plana
- ✅ GET /api/carta/publica/{outlet_slug} → sin auth

### Admin Carta ✅
- ✅ GET/POST/PUT/DELETE /api/admin/categorias (testeados)
- ✅ GET/POST/PUT/DELETE /api/admin/productos
- ✅ POST /api/admin/productos/{id}/alergenos
- ✅ GET /api/alergenos → 14 alérgenos (testeado)

### Admin Recetas ✅
- ✅ GET /api/admin/recetas
- ✅ POST /api/admin/recetas → receta Coca Cola creada (testeado)
- ✅ PUT /api/admin/recetas/{id}
- ✅ POST /api/admin/recetas/{id}/ingredientes
- ✅ DELETE /api/admin/recetas/{id}/ingredientes/{id}
- ✅ GET /api/admin/recetas/{id}/coste → semáforo en tiempo real
- ✅ GET /api/admin/recetas/semaforo → todos los platos (testeado, devuelve sin_receta correctamente)

---

# ⏰ PENDIENTE

## 🎯 PRÓXIMO PASO EXACTO AL ABRIR NUEVA SESIÓN

**Paso 1 — Testear semáforo completo (5 min):**
Necesitas el ID del artículo Refresco Lata. Ve a Supabase → Table Editor → articulos → copia el id.
Luego en /docs con token:
```
POST /api/admin/recetas/7ffa8a21-3019-46ff-943c-512b402880a7/ingredientes
Body: {"articulo_id": "[ID_REFRESCO_LATA]", "cantidad_neta": 1, "porcentaje_merma": 0, "unidad": "ud"}
```
Luego:
```
GET /api/admin/recetas/7ffa8a21-3019-46ff-943c-512b402880a7/coste
```
Debe devolver coste=0.50, margen=80%, semaforo="verde"

**Paso 2 — Crear dashboard.py:**
Dale este prompt a Cursor:
```
Crea backend/routers/dashboard.py para HorecaSO (FastAPI + asyncpg, sin ORM).

Endpoints:

1. GET /api/dashboard/director
   Requiere JWT. Devuelve para el tenant del usuario:
   - ventas_hoy: SUM(total) de tickets WHERE estado='cobrado' AND DATE(cobrado_at)=hoy
   - num_tickets_hoy: COUNT de tickets cobrados hoy
   - ticket_medio: ventas_hoy / num_tickets_hoy (0 si no hay tickets)
   - mesas_ocupadas: COUNT mesas WHERE estado='ocupada' del tenant
   - total_mesas: COUNT total mesas del tenant
   - top_5_productos_hoy: JOIN ticket_lineas→tickets→productos, agrupados por producto_id, suma cantidad, ORDER BY cantidad DESC LIMIT 5. Incluir nombre y cantidad
   - alertas_stock: articulos WHERE stock_actual <= stock_minimo del tenant
   - coste_hoy: 0 por ahora (se calculará en Fase 2 con recetas)
   - margen_hoy: ventas_hoy - coste_hoy
   - margen_porcentaje: (margen_hoy / ventas_hoy * 100) si ventas > 0, else 0

2. GET /api/dashboard/cierre-dia
   Requiere JWT. Parámetro opcional: fecha (default=hoy). Devuelve:
   - fecha
   - total_efectivo: SUM tickets cobrados con metodo_pago='efectivo'
   - total_tarjeta: SUM tarjeta_credito + tarjeta_debito
   - total_bizum: SUM bizum
   - total_transferencia: SUM transferencia
   - total_invitaciones: SUM invitacion
   - total_ventas: SUM total
   - num_tickets: COUNT
   - ticket_medio

Registra en main.py con app.include_router().
Usa async with get_db() as conn.
No uses SQLAlchemy ni ORM.
Sigue el patrón de mesas.py.
```

**Paso 3 — Testear dashboard en /docs**

**Paso 4 — Commit:**
```bash
git add backend/routers/dashboard.py backend/main.py
git commit -m "feat: dashboard director y cierre de caja"
git push origin main
```

**Paso 5 — Iniciar frontend React:**
```bash
cd frontend
npm create vite@latest . -- --template react
npm install tailwindcss @tailwindcss/vite axios react-router-dom
```

---

## FASE 1 — FRONTEND COMPLETO ⏰

### Setup
- ⏰ npm create vite@latest frontend -- --template react
- ⏰ npm install tailwindcss @tailwindcss/vite axios react-router-dom
- ⏰ Configurar vite.config.js con proxy a http://localhost:8000
- ⏰ Crear frontend/.env: VITE_API_URL=http://localhost:8000/api

### Servicios y contexto
- ⏰ frontend/src/services/api.js — axios + interceptores JWT
- ⏰ frontend/src/context/AuthContext.jsx — login, logout, user, isAuthenticated

### Componentes base
- ⏰ frontend/src/components/shared/Loader.jsx
- ⏰ frontend/src/components/shared/Toast.jsx
- ⏰ frontend/src/components/shared/StatCard.jsx
- ⏰ frontend/src/components/shared/EmptyState.jsx
- ⏰ frontend/src/constants/colors.js

### Layout y rutas
- ⏰ frontend/src/layouts/AppLayout.jsx — sidebar + header + rutas protegidas
- ⏰ frontend/src/App.jsx — React Router con redirección por rol

### Páginas
- ⏰ frontend/src/pages/LoginPage.jsx — diseño oscuro con acentos ámbar
- ⏰ frontend/src/pages/sala/MesasPage.jsx — grid con colores por estado
- ⏰ frontend/src/pages/tpv/TPVPage.jsx — dos columnas, carta izquierda, ticket derecha
- ⏰ frontend/src/pages/director/DashboardPage.jsx — KPIs + semáforo

---

## FASE 1 — DEPLOY ⏰

- ⏰ Backend en Render (pip install requirements, gunicorn start command)
- ⏰ Frontend en Vercel (Root: frontend, Framework: Vite)
- ⏰ Variables de entorno en ambos
- ⏰ ALLOWED_ORIGINS actualizado con URL de Vercel
- ⏰ Verificar flujo completo en producción

---

## FASE 2 — CONTROL DE NEGOCIO ⏰

- ⏰ backend/routers/inventario.py — stock, movimientos FIFO, alertas, APPCC
- ⏰ backend/services/inventario_fifo.py — descontar lotes al vender
- ⏰ backend/services/food_cost.py — calcular coste real, semáforo, real vs teórico
- ⏰ backend/routers/proveedores.py — proveedores, facturas, escaneo IA con Groq
- ⏰ backend/services/ia_facturas.py — Groq vision extrae líneas de foto factura
- ⏰ backend/routers/kds.py — pantalla cocina en tiempo real (comandas, tiempos)
- ⏰ backend/routers/reservas.py — reservas, lista de espera
- ⏰ POST /api/tpv/cierre-caja — cierre diario por método de pago
- ⏰ Integrar FIFO en cobrar ticket: al vender producto con receta → descuenta ingredientes
- ⏰ Frontend: InventarioPage, ProveedoresPage, KDSPage, ReservasPage, MermasPage

## FASE 3 — RRHH Y ANALYTICS ⏰

- ⏰ backend/routers/empleados.py — empleados, fichajes, cuadrantes, ausencias
- ⏰ backend/routers/nominas.py — cálculo automático (SS 6.35%, empresa 29.9%, IRPF)
- ⏰ backend/services/pdf_generator.py — PDF nóminas, tickets, cierres con ReportLab
- ⏰ GET /api/dashboard/rentabilidad-mesas — €/hora por mesa
- ⏰ GET /api/dashboard/ingenieria-menu — BCG (estrella/caballo/puzzle/perro)
- ⏰ backend/routers/clientes.py — historial, alérgenos, fidelización
- ⏰ Frontend: EmpleadosPage, CuadrantePage, FichajesPage, NominasPage, AnalyticsPage

## FASE 4 — PREMIUM ⏰

- ⏰ Carta digital QR pública multi-idioma (ES/EN/FR/DE)
- ⏰ Reservas online con widget embebible
- ⏰ Confirmaciones automáticas email (SendGrid)
- ⏰ backend/routers/delivery.py — Glovo, UberEats, JustEat webhooks
- ⏰ GET /api/ia/prevision-demanda — Groq predice necesidades
- ⏰ APPCC digital — temperaturas equipos obligatorio sanidad
- ⏰ QR generado por mesa para carta digital

## FASE 5 — ENTERPRISE ⏰

- ⏰ XML SOAP Verifactu + certificado digital + envío real AEAT
- ⏰ Proceso homologación oficial AEAT (~3.000-5.000€ con consultor)
- ⏰ Multi-idioma frontend con react-i18next
- ⏰ Reportes fiscales modelo 303 y 130
- ⏰ Integración datáfono (Ingenico/Verifone)
- ⏰ WhatsApp Business automático (Twilio)
- ⏰ Integración contabilidad (Holded, Contasol)

---

## 📊 PROGRESO GENERAL

```
FASE 0 — Infraestructura:     ████████████████████ 100% ✅
FASE 1 — Backend Core:        █████████████████░░░  85%
FASE 1 — Frontend:            ░░░░░░░░░░░░░░░░░░░░   0% ⏰
FASE 1 — Deploy:              ░░░░░░░░░░░░░░░░░░░░   0% ⏰
FASE 2 — Control negocio:     ░░░░░░░░░░░░░░░░░░░░   0% ⏰
FASE 3 — RRHH y analytics:    ░░░░░░░░░░░░░░░░░░░░   0% ⏰
FASE 4 — Premium:             ░░░░░░░░░░░░░░░░░░░░   0% ⏰
FASE 5 — Enterprise:          ░░░░░░░░░░░░░░░░░░░░   0% ⏰

TOTAL PROYECTO (sobre Fase 1): ██████░░░░░░░░░░░░░░  28%
```

---

*STEP v3.1 — HorecaSO — Arin Romero — 19/03/2026 — Fin sesión día 1*
*Tiempo invertido hoy: ~8 horas*
*Próxima sesión: testear semáforo → dashboard → frontend → deploy*