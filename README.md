# HorecaSO

<p align="center">
  <strong>ERP SaaS multi-tenant para hostelería española</strong><br/>
  TPV · KDS · Verifactu · Inventario · Recetas · RRHH · Analytics · Panel de plataforma
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" alt="Python 3.12"/>
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI 0.115"/>
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black" alt="React 19"/>
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white" alt="Vite 8"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4"/>
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 15"/>
  <img src="https://img.shields.io/badge/Supabase-Cloud-3FCF8E?logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Deploy-Render_%7C_Vercel-000000" alt="Render + Vercel"/>
</p>

---

## 1. Nombre y descripción del proyecto

**HorecaSO** es un sistema operativo web (ERP) orientado al mercado español de hostelería — restaurantes medianos con 5–50 empleados. Unifica en una sola aplicación lo que habitualmente está fragmentado entre TPV de sala, pantallas de cocina, hojas de escandallo, Excel de almacén, RRHH en papel y herramientas fiscales desconectadas.

### Qué hace

| Área | Funcionalidad |
|------|---------------|
| **Sala y cobro** | Mapa de mesas, TPV con división de cuenta, múltiples métodos de pago |
| **Cocina** | KDS (Kitchen Display System) con filtrado cocina/barra y polling en tiempo casi real |
| **Fiscal** | Registros Verifactu encadenados (SHA-256), generados al completar el cobro |
| **Carta y costes** | CRUD de productos, recetas, escandallos, semáforo de margen, gastos operativos |
| **Inventario** | Artículos, movimientos, mermas, FIFO por lotes, APPCC |
| **Compras** | Proveedores, facturas de compra, escaneo IA con Groq |
| **RRHH** | Empleados, fichajes, cuadrantes, ausencias, nóminas (SS/IRPF España) |
| **Clientes** | CRM, reservas, lista de espera, fidelización |
| **Dirección** | Dashboard, venta live, analytics (mesas, menú BCG, coste personal), reportes PDF |
| **Plataforma SaaS** | Panel superadmin para gestionar tenants (restaurantes clientes) |

### Problema que resuelve

Conecta la cadena operativa **ticket → producto → receta → artículo → stock → coste → margen → fiscal**, de modo que el dueño puede responder cuánto costó vender un plato sin exportar a Excel. El modelo es **SaaS multi-tenant**: una instancia de aplicación da servicio a múltiples restaurantes con aislamiento lógico por `tenant_id` en PostgreSQL.

### Modelo de negocio

Planes previstos: Básico / Profesional / Premium / Enterprise (`tenants.plan`). El onboarding de nuevos restaurantes es **manual** (SQL en Supabase o panel superadmin); no hay auto-registro público.

---

## 2. Tech stack

### Backend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Python | 3.12 | Runtime |
| FastAPI | 0.115.0 | Framework HTTP / API REST |
| Uvicorn | 0.30.6 | Servidor ASGI (desarrollo) |
| Gunicorn | 22.0.0 | Proceso maestro en producción (Render) |
| asyncpg | 0.29.0 | Driver PostgreSQL asíncrono (SQL raw, sin ORM) |
| Pydantic | 2.9.0 | Validación de esquemas |
| pydantic-settings | 2.5.2 | Configuración desde `.env` |
| python-jose | 3.3.0 | JWT (HS256) |
| passlib + bcrypt | 1.7.4 / 4.0.1 | Hash de contraseñas |
| SlowAPI | 0.1.9 | Rate limiting global |
| ReportLab | 4.0.8 | Generación de PDFs |
| Groq SDK | ≥0.11.0 | IA visión para escaneo de facturas |
| qrcode + Pillow | 7.4.2 / 10.3.0 | QR en documentos |
| python-dotenv | 1.0.1 | Variables de entorno |
| email-validator | 2.2.0 | Validación de emails |

### Frontend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 19.2.4 | UI |
| React DOM | 19.2.4 | Renderizado |
| Vite | 8.0.1 | Build y dev server |
| React Router DOM | 7.13.1 | Enrutamiento SPA |
| Tailwind CSS | 4.2.2 | Estilos (vía `@tailwindcss/vite`) |
| Axios | 1.13.6 | Cliente HTTP |
| lucide-react | 0.577.0 | Iconos (strokeWidth 1.5) |
| ESLint | 9.39.4 | Linting |

### Base de datos e infraestructura

| Componente | Detalle |
|------------|---------|
| PostgreSQL | 15 — esquema `public`, 42 tablas |
| Supabase | Hosting gestionado, pooler pgbouncer (puerto 6543) |
| Render | Deploy del backend API |
| Vercel | Deploy del frontend estático |

### Decisiones explícitas del stack

- **Sin ORM** (no SQLAlchemy, no Prisma): SQL parametrizado con placeholders `$1, $2`.
- **Sin WebSocket**: polling cada 30 s en pantallas live (KDS, venta live) por limitaciones del plan gratuito de Render.
- **Sin TypeScript** en backend ni frontend.
- **Sin framer-motion** en `package.json` actual (no está instalado).
- **SendGrid** mencionado en la documentación de producto pero **no implementado** en el código backend actual.

---

## 3. Arquitectura

### Patrón general

Monorepo con **dos aplicaciones** desacopladas:

```
Navegador → React SPA (Vercel) → HTTPS + JWT Bearer → FastAPI (Render) → asyncpg pool → PostgreSQL (Supabase)
```

No es MVC clásico ni clean architecture estricta. El backend sigue un patrón **Router + Service**:

- **`routers/`**: endpoints HTTP, validación Pydantic, `Depends(require_roles)`, SQL con `get_db()`.
- **`services/`**: lógica reutilizable sin HTTP (Verifactu, generación PDF).
- **`auth/`**: JWT y dependencias de autorización.
- **`database.py`**: pool de conexiones y transacciones.

El frontend es una **SPA** con guards por rol en `App.jsx`, estado de autenticación en `AuthContext`, y llamadas centralizadas en `services/api.js`.

### Multi-tenancy

Aislamiento **a nivel de fila** en PostgreSQL:

```
tenants (restaurante)
  └── outlets (local físico)
        └── mesas, tickets, reservas, movimientos_stock…
  └── usuarios, productos, articulos, empleados, clientes…
```

Cada query de negocio filtra por `tenant_id` (del JWT `negocio_id`) y, en operaciones de sala, por `outlet_id`.

### Dos planos de administración

| Plano | Rol | JWT | Rutas |
|-------|-----|-----|-------|
| **Plataforma** | `superadmin` | `tenant_id` y `negocio_id` = `null` | `/api/superadmin/*`, UI `/superadmin/*` |
| **Tenant** | `admin`, roles operativos | `negocio_id` = UUID del tenant | `/api/*` con filtro SQL |

### Seguridad transversal (`main.py`)

- CORS dinámico desde `ALLOWED_ORIGINS`.
- `SecurityHeadersMiddleware` (X-Frame-Options, nosniff, etc.).
- SlowAPI rate limiting global.
- OpenAPI `/docs` y `/redoc` **desactivados** cuando `ENVIRONMENT=production`.
- Handler global de excepciones → JSON 500 genérico (sin stack trace).
- `lifespan`: init/close del pool asyncpg al arrancar/apagar workers.

### Tiempo real

Polling cada **30 segundos** en KDS y Venta Live. Indicador «Actualizado hace X segundos» en UI. Migración a WebSocket prevista al contratar Render Starter.

---

## 4. Estructura de carpetas

```
HorecaSO/
├── backend/                          # API Python (FastAPI)
│   ├── main.py                       # App factory: routers, middlewares, /api/health
│   ├── config.py                     # Settings (pydantic-settings)
│   ├── database.py                   # Pool asyncpg + get_db()
│   ├── requirements.txt
│   ├── auth/
│   │   ├── dependencies.py           # get_current_user, require_roles, require_superadmin
│   │   ├── jwt_handler.py            # create_access_token, verify_token
│   │   └── schemas.py                # LoginRequest, TokenResponse
│   ├── routers/                      # ~96 archivos .py — dominios HTTP
│   │   ├── auth.py, mesas*.py, carta.py, dashboard.py, verifactu.py, nominas.py, appcc.py
│   │   ├── admin_carta/              # CRUD categorías, productos, alérgenos
│   │   ├── admin_usuarios/           # Gestión usuarios del tenant (solo admin)
│   │   ├── superadmin/               # Panel plataforma (tenants, logs)
│   │   ├── tpv/                      # Tickets, líneas, pagos, cobro
│   │   ├── kds/                      # Comandas cocina/barra
│   │   ├── inventario/               # Artículos, movimientos, alertas
│   │   ├── recetas/                  # Escandallos, ingredientes, semáforo
│   │   ├── costes/                   # Gastos operativos
│   │   ├── proveedores/              # Proveedores + facturas + escaneo IA
│   │   ├── empleados/                # RRHH: empleados, fichajes, cuadrantes, ausencias
│   │   ├── reservas/                 # Reservas + lista de espera
│   │   ├── clientes/                 # CRM + historial + puntos
│   │   ├── fifo/                     # Lotes, consumo FIFO, valoración
│   │   ├── analytics/                # Rentabilidad mesas, ingeniería menú, coste personal
│   │   └── reportes/                 # PDFs (nómina, inventario, cierre, diferenciales)
│   ├── services/                     # Lógica no-HTTP
│   │   ├── verifactu_engine.py       # Huellas SHA-256, registro fiscal
│   │   └── pdf_*.py                  # Generadores PDF (ReportLab)
│   ├── sql/                          # Migraciones y seeds (aplicación manual en Supabase)
│   │   ├── migration_*.sql
│   │   └── seed_*.sql
│   └── scripts/                      # Utilidades (hashes bcrypt, seeds, schema MD)
│
├── frontend/                         # SPA React
│   ├── package.json
│   ├── vite.config.js                # Proxy /api → localhost:8000 en dev
│   ├── .env.example
│   └── src/
│       ├── main.jsx                  # Punto de entrada
│       ├── App.jsx                   # Rutas y guards por rol
│       ├── index.css                 # Tailwind 4
│       ├── context/                  # AuthContext, ThemeContext
│       ├── components/
│       │   ├── layout/               # AppLayout, Sidebar, SidebarNav, navConfig.js
│       │   └── shared/               # Loader, StatCard, EmptyState
│       ├── pages/                    # Pantallas por dominio (sala, tpv, admin, …)
│       ├── services/api.js           # Axios + helpers por endpoint
│       ├── constants/uiTokens.js
│       └── utils/
│
├── docs/                             # Documentación archivada
├── .cursorrules                      # Convenciones obligatorias del proyecto
├── SCHEMA_BASE_DATOS.md              # Referencia de 42 tablas PostgreSQL
├── ARQUITECTURA_HORECASO.md            # Mapa routers ↔ frontend
├── GUIA_PRODUCCION_COMPLETA.md       # Deploy, seguridad, tenants
├── BITACORA_HORECASO.md              # Registro de trabajo por sesión
├── BUGS_Y_SOLUCIONES.md              # Bugs reproducibles documentados
├── STEP_HORECASO.md                  # Estado global del proyecto por módulo
├── PRD_HorecaSO.md                   # Especificación de producto
└── CREDENCIALES_PRUEBA.MD            # Usuarios de desarrollo (no producción)
```

---

## 5. Requisitos previos

| Requisito | Versión / detalle |
|-----------|-------------------|
| **Python** | 3.12 |
| **Node.js** | 18+ recomendado (compatible con Vite 8) |
| **npm** | Incluido con Node.js |
| **PostgreSQL** | 15 — vía proyecto Supabase (local no obligatorio si usas Supabase remoto) |
| **Git** | Para clonar el repositorio |
| **Cuenta Supabase** | Base de datos y SQL Editor para migraciones |
| **Cuenta Groq** | Opcional — solo para escaneo IA de facturas (`GROQ_API_KEY`) |

**No requerido en el repositorio actual:**

- Docker / docker-compose (no incluidos).
- Alembic ni herramienta de migraciones automática (SQL manual en `backend/sql/`).

---

## 6. Instalación y configuración

### 6.1 Clonar el repositorio

```bash
git clone <url-del-repositorio> HorecaSO
cd HorecaSO
```

### 6.2 Backend

```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Crear `backend/.env` (no está versionado; ver sección 9):

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres
SECRET_KEY_AUTH=tu_clave_secreta_minimo_32_caracteres
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:5173
ENVIRONMENT=development
GROQ_API_KEY=
APP_NAME=HorecaSO
APP_VERSION=1.0.0
```

> Usa el **pooler** de Supabase (puerto `6543`) con `statement_cache_size=0` ya configurado en `database.py`.

### 6.3 Base de datos (Supabase)

Ejecutar en **Supabase → SQL Editor** (en orden, según necesidad):

| Archivo | Obligatorio si… |
|---------|-----------------|
| `backend/sql/migration_kds_barra_destino.sql` | Usas KDS/TPV con destino cocina/barra |
| `backend/sql/migration_fase_b.sql` | Panel superadmin y tenant de prueba |
| `backend/sql/migration_gastos_operativos.sql` | Módulo Costes |
| `backend/sql/migration_articulos_calibracion_merma.sql` | Calibración de merma en inventario |
| `backend/sql/migration_articulos_elaborados_receta.sql` | Elaboraciones (artículos elaborados) |

Para hashes bcrypt del seed Fase B:

```bash
python backend/scripts/generate_test_hashes.py
```

Pegar los hashes en `migration_fase_b.sql` antes de ejecutarlo.

### 6.4 Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # opcional
```

El proxy de Vite reenvía `/api` a `http://localhost:8000` en desarrollo; normalmente **no hace falta** `VITE_API_URL` en local.

### 6.5 Verificación de instalación

```bash
# Backend — debe importar sin errores
cd backend
python -c "from main import create_app; create_app()"

# Frontend — build limpio
cd frontend
npm run build
```

---

## 7. Cómo ejecutar el proyecto

### Desarrollo local

**Terminal 1 — Backend** (desde `backend/` con venv activo):

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs` (solo si `ENVIRONMENT != production`)
- Health: `http://localhost:8000/api/health`

**Terminal 2 — Frontend** (desde `frontend/`):

```bash
npm run dev
```

- UI: `http://localhost:5173`
- Login de prueba: ver `CREDENCIALES_PRUEBA.MD` (tenant Restaurante Prueba o demo legacy `admin@test.com` si existe en tu BD).

### Preview de producción (frontend)

```bash
cd frontend
npm run build
npm run preview
```

`vite.config.js` incluye proxy `/api` también en `preview`.

### Producción

| Capa | Comando / plataforma |
|------|----------------------|
| Backend | Render — ver sección 13 |
| Frontend | Vercel — `npm run build`, output `dist/` |

**No hay** `docker-compose.yml` ni imagen Docker en el repositorio.

---

## 8. Scripts disponibles

### Frontend (`frontend/package.json`)

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `vite` | Servidor de desarrollo con HMR en puerto 5173 |
| `build` | `vite build` | Compila la SPA a `frontend/dist/` |
| `preview` | `vite preview` | Sirve el build localmente (con proxy `/api`) |
| `lint` | `eslint .` | Analiza código JS/JSX con ESLint 9 flat config |

### Backend (scripts Python en `backend/scripts/`)

| Script | Descripción |
|--------|-------------|
| `generate_test_hashes.py` | Genera hashes bcrypt para seeds SQL |
| `schema_mcp_json_to_markdown.py` | Regenera `SCHEMA_BASE_DATOS.md` desde volcado MCP |
| `apply_seed_shell_batches.py` | Aplica seeds por lotes (desarrollo) |
| `generate_seed_despensa_articulos.py` | Genera SQL de artículos de prueba |

### Comandos operativos habituales (no en package.json)

```bash
# Verificar app factory
cd backend && python -c "from main import create_app; create_app()"

# Arrancar API en desarrollo
cd backend && uvicorn main:app --reload

# Producción local (simular Render)
cd backend && gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120
```

---

## 9. Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `DATABASE_URL` | Connection string PostgreSQL (Supabase pooler `:6543`) | **Sí** |
| `SECRET_KEY_AUTH` | Clave para firmar JWT (mín. 32 caracteres aleatorios en prod) | **Sí** |
| `ALGORITHM` | Algoritmo JWT | No (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token en minutos | No (default: `1440`) |
| `ALLOWED_ORIGINS` | Orígenes CORS separados por coma | No (default: `http://localhost:5173`) |
| `ENVIRONMENT` | `development` \| `production` — controla `/docs` | No (default: `development`) |
| `GROQ_API_KEY` | API key Groq para escaneo IA de facturas | No (vacío desactiva IA) |
| `APP_NAME` | Nombre mostrado en metadatos | No (default: `HorecaSO`) |
| `APP_VERSION` | Versión de la app | No (default: `1.0.0`) |

### Frontend (`frontend/.env` / `.env.local`)

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `VITE_API_URL` | URL base del API. Debe terminar en `/api` o se añade automáticamente. Ej: `https://tu-backend.onrender.com/api` | No en dev (usa proxy `/api`). **Sí en Vercel** |

Ejemplo (`frontend/.env.example`):

```env
# VITE_API_URL=http://127.0.0.1:8000/api
```

---

## 10. API / Endpoints

Base URL en desarrollo: `http://localhost:8000`. Todas las rutas de negocio bajo `/api/...` salvo `GET /` (metadatos) y `GET /api/health`.

**Autenticación:** `Authorization: Bearer <JWT>` en endpoints protegidos (excepto login y carta pública).

**Autorización:** `require_roles([...])` por endpoint. Respuestas estándar: `401` sin token válido, `403` rol no permitido, `500` con `{"detail":"Error interno"}`.

### Auth — `/api/auth`

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/login` | Público | Login email/password → JWT |
| GET | `/perfil` | Autenticado | Perfil del usuario actual |
| GET | `/verify` | Autenticado | Verificación de token |

### Mesas — `/api/mesas`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listado de mesas del outlet |
| GET | `/{mesa_id}` | Detalle de mesa |
| POST | `/` | Crear mesa |
| PUT | `/{mesa_id}` | Actualizar mesa |
| PATCH | `/{mesa_id}/estado` | Cambiar estado (`libre`, `ocupada`, `reservada`) |
| DELETE | `/{mesa_id}` | Eliminar mesa |

### TPV — `/api/tpv`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/carta` | Productos agrupados por categoría |
| GET | `/carta/productos` | Lista plana de productos |
| POST | `/tickets` | Crear ticket (`mesa_id`, `outlet_id`) |
| GET | `/tickets/abiertos` | Tickets abiertos |
| GET | `/tickets/hoy` | Tickets del día (venta live) |
| GET | `/tickets/{ticket_id}` | Ticket resumido |
| GET | `/tickets/{ticket_id}/detalle` | Ticket con líneas y pagos |
| POST | `/tickets/{ticket_id}/lineas` | Añadir línea (`producto_id`, `cantidad`) |
| DELETE | `/tickets/{ticket_id}/lineas/{linea_id}` | Eliminar línea |
| POST | `/tickets/{ticket_id}/pagos` | Registrar pago parcial (`importe`, `metodo_pago`) |
| GET | `/tickets/{ticket_id}/pagos` | Listar pagos del ticket |
| DELETE | `/tickets/{ticket_id}/pagos/{pago_id}` | Anular pago |
| POST | `/tickets/{ticket_id}/cobrar` | Cobro (simple o cierre tras pagos) |

**Métodos de pago válidos:** `efectivo`, `tarjeta_credito`, `tarjeta_debito`, `bizum`, `transferencia`, `invitacion`.

### Verifactu — `/api/verifactu`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/registros` | Listado de registros fiscales |
| GET | `/registros/{registro_id}` | Detalle de registro |
| GET | `/verificar-cadena` | Verificación de cadena de huellas |
| GET | `/exportar` | Exportación de registros |

> Regla inamovible: **nunca** UPDATE ni DELETE en `verifactu_registros`.

### Carta pública — `/api/carta`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/publica/{outlet_slug}` | No | Carta pública para QR |

### Admin carta — `/api/admin`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/categorias` | CRUD categorías |
| PUT/DELETE | `/categorias/{id}` | |
| GET/POST | `/productos` | CRUD productos |
| PUT/DELETE | `/productos/{id}` | |
| POST | `/productos/{id}/alergenos` | Asignar alérgenos |
| GET | `/alergenos` | Catálogo de alérgenos (`/api/alergenos`) |

### Admin recetas — `/api/admin`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/recetas` | Listado de recetas |
| GET | `/recetas/semaforo` | Semáforo de margen |
| POST | `/recetas` | Crear receta |
| POST | `/elaboraciones` | Artículo elaborado + receta |
| POST | `/recetas/plato-nuevo` | Producto carta + receta en un paso |
| PUT | `/recetas/{id}` | Actualizar receta |
| DELETE | `/recetas/{id}` | Eliminar receta |
| POST | `/recetas/{id}/ingredientes` | Añadir ingrediente |
| DELETE | `/recetas/{id}/ingredientes/{ingrediente_id}` | Quitar ingrediente |
| GET | `/recetas/{id}/coste` | Coste calculado de la receta |

### Admin costes — `/api/admin`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/gastos-operativos` | Gastos fijos mensuales |
| POST | `/gastos-operativos` | Crear gasto |
| DELETE | `/gastos-operativos/{gasto_id}` | Eliminar gasto |

### Admin usuarios — `/api/admin` (solo `admin`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/usuarios` | Usuarios del tenant |
| POST | `/usuarios` | Alta de usuario operativo |
| PATCH | `/usuarios/{usuario_id}` | Modificar usuario |

### Superadmin — `/api/superadmin` (solo `superadmin`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/tenants` | Listado paginado de tenants |
| GET | `/tenants/{tenant_id}` | Detalle de tenant |
| PATCH | `/tenants/{tenant_id}/activo` | Activar/desactivar tenant |
| GET | `/platform-logs` | Logs de plataforma (filtros fecha) |

### Dashboard — `/api/dashboard`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/director` | KPIs del panel director |
| GET | `/cierre-dia` | Cierre del día (`?fecha=YYYY-MM-DD`) |

### Analytics — `/api/dashboard`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/rentabilidad-mesas` | Rentabilidad por mesa |
| GET | `/ingenieria-menu` | Análisis BCG del menú |
| GET | `/coste-personal` | Coste de personal |

### Inventario — `/api/inventario`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/articulos` | Listado (`?buscar`, `?categoria`, `?alerta`) |
| POST | `/articulos` | Crear artículo |
| PUT | `/articulos/{articulo_id}` | Actualizar artículo |
| PUT | `/articulos/{articulo_id}/calibracion-merma` | Calibración merma (`comprado`, `util`) |
| GET | `/stock-alertas` | Alertas de stock bajo |
| POST | `/movimientos` | Movimiento (`entrada`, `salida`, `ajuste`, `merma`) |
| GET | `/movimientos` | Historial (`?articulo_id`, `?tipo`, `?desde`, `?hasta`) |
| POST | `/inventario-fisico` | Ajuste por inventario físico |

### KDS — `/api/kds`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/comandas` | Comandas pendientes (filtro cocina/barra por rol) |
| PATCH | `/lineas/{linea_id}/estado` | Cambiar estado de línea |
| GET | `/estadisticas` | Estadísticas KDS |

### FIFO — `/api/fifo`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/lotes` | Lotes de inventario |
| POST | `/lotes` | Crear lote |
| POST | `/consumir` | Consumo FIFO |
| GET | `/alertas-caducidad` | Alertas de caducidad |
| GET | `/valoracion-stock` | Valoración de stock |

### Proveedores — `/api`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/proveedores` | Listado |
| GET | `/proveedores/{proveedor_id}` | Detalle |
| POST | `/proveedores` | Crear |
| PUT | `/proveedores/{proveedor_id}` | Actualizar |
| DELETE | `/proveedores/{proveedor_id}` | Eliminar |
| GET | `/facturas-proveedor` | Listado facturas |
| GET | `/facturas-proveedor/pendientes-pago` | Pendientes de pago |
| GET | `/facturas-proveedor/{factura_id}` | Detalle factura |
| POST | `/facturas-proveedor` | Registrar factura |
| PATCH | `/facturas-proveedor/{factura_id}/pagar` | Marcar como pagada |
| POST | `/facturas-proveedor/escanear-ia` | Escaneo con Groq vision |

### Empleados / RRHH — `/api`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/empleados` | Listado (`?buscar`, `?activo`, `?cargo`) |
| POST | `/empleados` | Alta empleado |
| GET | `/empleados/{empleado_id}` | Detalle |
| PUT | `/empleados/{empleado_id}` | Actualizar |
| POST | `/turnos/fichaje-entrada` | Fichar entrada |
| POST | `/turnos/fichaje-salida` | Fichar salida |
| GET | `/turnos/horas-extra/{empleado_id}` | Horas extra |
| GET | `/turnos` | Historial de turnos |
| GET | `/cuadrantes` | Cuadrantes |
| POST | `/cuadrantes` | Crear cuadrante |
| GET | `/ausencias` | Ausencias |
| POST | `/ausencias` | Solicitar ausencia |
| PATCH | `/ausencias/{ausencia_id}/estado` | Aprobar/rechazar |

### Nóminas — `/api/nominas`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/calcular` | Calcular nómina (SS 6,35 % empleado / 29,9 % empresa) |
| GET | `/{empleado_id}` | Nóminas de un empleado |
| GET | `/{nomina_id}/detalle` | Detalle de nómina |

### Reservas — `/api`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/reservas` | Listado |
| GET | `/reservas/{reserva_id}` | Detalle |
| POST | `/reservas` | Crear reserva |
| PUT | `/reservas/{reserva_id}` | Actualizar |
| PATCH | `/reservas/{reserva_id}/estado` | Cambiar estado |
| GET | `/lista-espera` | Lista de espera |
| POST | `/lista-espera` | Añadir a lista de espera |
| PATCH | `/lista-espera/{entrada_id}/estado` | Actualizar entrada |

### Clientes — `/api/clientes`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listado |
| POST | `/` | Crear cliente |
| GET | `/{cliente_id}` | Detalle |
| PUT | `/{cliente_id}` | Actualizar |
| GET | `/{cliente_id}/historial` | Historial de visitas/tickets |
| POST | `/{cliente_id}/puntos` | Ajustar puntos fidelidad |

### APPCC — `/api/appcc`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/registros` | Registros de control |
| GET | `/registros/no-conformes` | No conformidades |
| POST | `/registros` | Nuevo registro (temperatura, etc.) |
| GET | `/resumen-dia` | Resumen del día |

### Reportes PDF — `/api/reportes`

| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/nomina/{nomina_id}` | PDF nómina |
| GET | `/inventario` | PDF inventario |
| GET | `/cierre-caja/{fecha}` | PDF cierre de caja |
| GET | `/ventas` | PDF ventas por periodo |
| GET | `/cuadrante/{semana}` | PDF cuadrante semanal |
| GET | `/rentabilidad-platos` | PDF rentabilidad carta |
| GET | `/comparativa-proveedores/{articulo_id}` | PDF comparativa proveedores |
| GET | `/appcc` | PDF registros APPCC |

### Sistema

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Metadatos (`app`, `version`) |
| GET | `/api/health` | Health check — `SELECT 1` en BD → `{"status":"ok"}` o `503` |

---

## 11. Base de datos

### Motor y hosting

- **PostgreSQL 15** en **Supabase**.
- **42 tablas** en esquema `public` (documentadas en [`SCHEMA_BASE_DATOS.md`](docs/SCHEMA_BASE_DATOS.md)).
- **RLS (Row Level Security):** desactivado en la instancia auditada; el aislamiento multi-tenant se aplica en la capa de aplicación (`WHERE tenant_id = $1`).
- **Pool:** asyncpg con `statement_cache_size=0` (obligatorio para pgbouncer de Supabase).

### Entidades principales

| Dominio | Tablas clave |
|---------|--------------|
| Core | `tenants`, `outlets`, `usuarios`, `configuracion` |
| Sala / TPV | `mesas`, `tickets`, `ticket_lineas`, `ticket_pagos`, `cierres_caja` |
| Carta | `categorias_menu`, `productos`, `alergenos`, `producto_alergenos` |
| Recetas | `recetas`, `receta_ingredientes` |
| Inventario | `articulos`, `lotes_inventario`, `movimientos_stock`, `mermas` |
| Fiscal | `verifactu_registros` (solo INSERT) |
| Compras | `proveedores`, `facturas_proveedor`, `facturas_proveedor_lineas`, `pedidos_proveedor` |
| RRHH | `empleados`, `turnos`, `cuadrantes`, `cuadrante_asignaciones`, `ausencias`, `nominas` |
| Clientes | `clientes`, `reservas`, `lista_espera` |
| Analytics | `rentabilidad_mesas`, `ingenieria_menu` |
| Plataforma | `platform_logs`, `tenant_audit_log`, `usuario_permisos` |
| APPCC | `registros_appcc` |

### Roles (`usuarios.rol`)

`superadmin`, `admin`, `director`, `jefe_sala`, `camarero`, `cocina`, `barra`, `almacen`

### Migraciones versionadas (`backend/sql/`)

| Archivo | Contenido |
|---------|-----------|
| `migration_kds_barra_destino.sql` | `destino_kds` en productos, columnas barra en líneas |
| `migration_fase_b.sql` | Superadmin, logs plataforma, seed tenant prueba |
| `migration_gastos_operativos.sql` | Tabla `gastos_operativos` |
| `migration_articulos_calibracion_merma.sql` | Calibración de merma en artículos |
| `migration_articulos_elaborados_receta.sql` | Elaboraciones vinculadas a recetas |

Las migraciones se aplican **manualmente** en Supabase SQL Editor. No hay runner automático al arrancar la app.

### Datos de prueba

| Entidad | UUID |
|---------|------|
| Tenant demo (legacy en docs) | `00000000-0000-0000-0000-000000000001` |
| Outlet demo | `00000000-0000-0000-0000-000000000002` |
| Tenant Restaurante Prueba (Fase B) | `11111111-1111-1111-1111-111111111111` |

Credenciales: [`CREDENCIALES_PRUEBA.MD`](docs/CREDENCIALES_PRUEBA.MD).

---

## 12. Tests

**El repositorio no incluye actualmente una suite de tests automatizados** (no hay `pytest`, `jest`, `vitest` ni carpetas `tests/` / `__tests__/` configuradas).

### Verificación manual recomendada

```bash
# Importación del backend
cd backend && python -c "from main import create_app; create_app()"

# Build frontend
cd frontend && npm run build

# Lint frontend
cd frontend && npm run lint

# Health check (con backend en marcha)
curl http://localhost:8000/api/health
```

### Smoke tests post-deploy

Documentados en [`GUIA_PRODUCCION_COMPLETA.md`](docs/GUIA_PRODUCCION_COMPLETA.md) §1.2 y §2.3: login, mesas con JWT, aislamiento tenant, superadmin sin acceso a datos de negocio, KDS 200, `/docs` → 404 en producción.

### Registro de bugs

Fallos reproducibles en [`BUGS_Y_SOLUCIONES.md`](docs/BUGS_Y_SOLUCIONES.md).

---

## 13. Despliegue

### Arquitectura de producción

```
Usuario → Vercel (React estático) → HTTPS → Render (Gunicorn + Uvicorn workers) → Supabase PostgreSQL
```

### Backend — Render

| Parámetro | Valor |
|-----------|-------|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120` |
| Health Check Path | `/api/health` |

**Variables de entorno en Render:**

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
SECRET_KEY_AUTH=[generar con: python -c "import secrets; print(secrets.token_hex(32))"]
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
ALLOWED_ORIGINS=https://tu-app.vercel.app
ENVIRONMENT=production
GROQ_API_KEY=[clave Groq]
APP_NAME=HorecaSO ERP
APP_VERSION=1.0.0
```

### Frontend — Vercel

| Parámetro | Valor |
|-----------|-------|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Variable crítica | `VITE_API_URL=https://tu-backend.onrender.com/api` |

### Checklist pre-producción

1. Migraciones SQL aplicadas en Supabase de producción (KDS, Fase B, etc.).
2. `SECRET_KEY_AUTH` aleatoria (no la de desarrollo).
3. `ALLOWED_ORIGINS` solo con dominio Vercel (no `*`).
4. `ENVIRONMENT=production` → `/docs` devuelve 404.
5. Credenciales de prueba rotadas o eliminadas.
6. Superadmin de producción creado manualmente en SQL (no usar seed).
7. Smoke tests: health, login, TPV → cobro → fila en `verifactu_registros`.

Guía completa: [`GUIA_PRODUCCION_COMPLETA.md`](docs/GUIA_PRODUCCION_COMPLETA.md).

---

## 14. Contribución

### Convenciones obligatorias

Leer y seguir [`.cursorrules`](.cursorrules) antes de contribuir. Resumen:

**Backend:**
- SQL con placeholders `$1, $2` — nunca f-strings con valores de usuario.
- Dinero siempre con `Decimal` de Python.
- `async with get_db() as conn` en todos los endpoints.
- `Depends(require_roles([...]))` en endpoints protegidos.
- Patrón try/except: re-lanzar `HTTPException`, log + 500 genérico para el resto.
- Filtrar por `tenant_id` y `outlet_id` donde aplique.

**Frontend:**
- Mobile first (Tailwind responsive).
- Dark/light mode obligatorio en todos los componentes.
- Iconos: `lucide-react` con `strokeWidth={1.5}` — nunca emojis como iconos UI.
- Botones táctiles mínimo `h-12` (excepción `h-9` en cards de producto TPV).
- Sin `<form submit>` — usar `onClick` handlers.
- Polling 30 s en pantallas live (no WebSocket).

### Flujo de trabajo

1. Crear rama desde `main` para tu cambio.
2. Implementar siguiendo patrones existentes en el router/página más cercano.
3. Verificar `python -c "from main import create_app; create_app()"` y `npm run build`.
4. Documentar trabajo relevante en [`docs/BITACORA_HORECASO.md`](docs/BITACORA_HORECASO.md).
5. Si aparece un bug reproducible, registrarlo en [`docs/BUGS_Y_SOLUCIONES.md`](docs/BUGS_Y_SOLUCIONES.md).
6. Abrir pull request con descripción del cambio y plan de prueba manual.

### Documentación viva

| Documento | Cuándo actualizar |
|-----------|-------------------|
| `BITACORA_HORECASO.md` | Tras cada bloque de trabajo relevante |
| `STEP_HORECASO.md` | Cambios de roadmap o estado de fase |
| `ARQUITECTURA_HORECASO.md` | Nuevo router, ruta React o migración crítica |
| `SCHEMA_BASE_DATOS.md` | Cambios de esquema en Supabase |

---

## 15. Licencia

**No existe archivo `LICENSE` en el repositorio.** El código no declara una licencia open source explícita. Contacta al autor (**Arin Romero**) para condiciones de uso, distribución o contribución externa.

---

## Información adicional

### Roles del sistema y acceso UI

| Rol | Acceso principal |
|-----|------------------|
| `superadmin` | Panel plataforma `/superadmin/*` |
| `admin` | Todo el tenant + `/admin/usuarios` |
| `director` | Dashboard, analytics, configuración, reportes, nóminas |
| `jefe_sala` | Mesas, reservas, TPV, venta live, KDS, gestión sala |
| `camarero` | TPV, mesas |
| `cocina` | KDS cocina, recetas, inventario (lectura) |
| `barra` | KDS barra |
| `almacen` | Inventario, proveedores, mermas |

La navegación se define en [`frontend/src/components/layout/constants/navConfig.js`](frontend/src/components/layout/constants/navConfig.js) y se filtra por `user.rol`.

### Rutas frontend principales

| Ruta | Pantalla |
|------|----------|
| `/login` | Login |
| `/mesas` | Mapa de sala |
| `/tpv/:mesaId` | TPV (sin sidebar) |
| `/kds` | KDS pantalla completa |
| `/dashboard` | Panel director |
| `/venta-live` | Venta en tiempo casi real |
| `/analytics` | Analytics avanzado |
| `/admin/carta` | Gestión de carta |
| `/admin/recetas` | Escandallos |
| `/admin/costes` | Gastos operativos |
| `/admin/sala` | Gestión de mesas |
| `/admin/usuarios` | Usuarios del tenant |
| `/inventario`, `/inventario/mermas` | Inventario y mermas |
| `/fifo`, `/appcc` | FIFO y APPCC |
| `/proveedores`, `/proveedores/facturas` | Compras |
| `/empleados`, `/fichajes`, `/cuadrante`, `/nominas` | RRHH |
| `/reservas`, `/clientes` | Clientes y reservas |
| `/reportes` | Descarga de informes |
| `/superadmin/tenants` | Gestión de tenants |

### Reglas de negocio críticas

- **Verifactu:** cobro + registro en la misma transacción; huella SHA-256 en mayúsculas; IVA hostelería 10 % general, 21 % alcohol/tabaco.
- **División de cuenta:** tabla `ticket_pagos`; ticket cobrado cuando `suma(pagos) >= total`.
- **Semáforo recetas:** verde >65 % margen, amarillo 40–65 %, rojo <40 %.
- **Merma:** `cantidad_bruta = cantidad_neta / (1 - porcentaje_merma / 100)`.
- **Nóminas España:** SS empleado 6,35 %, SS empresa 29,9 %.

### Documentación de referencia

| Documento | Contenido |
|-----------|-----------|
| [docs/GUIA_PRODUCCION_COMPLETA.md](docs/GUIA_PRODUCCION_COMPLETA.md) | Deploy, seguridad, tenants, smoke tests |
| [docs/SCHEMA_BASE_DATOS.md](docs/SCHEMA_BASE_DATOS.md) | 42 tablas, columnas, FKs |
| [docs/ARQUITECTURA_HORECASO.md](docs/ARQUITECTURA_HORECASO.md) | Mapa técnico routers ↔ frontend |
| [docs/STEP_HORECASO.md](docs/STEP_HORECASO.md) | Estado del proyecto por módulo |
| [docs/PRD_HorecaSO.md](docs/PRD_HorecaSO.md) | Especificación de producto |
| [docs/BITACORA_HORECASO.md](docs/BITACORA_HORECASO.md) | Historial de implementación |
| [docs/BUGS_Y_SOLUCIONES.md](docs/BUGS_Y_SOLUCIONES.md) | Bugs documentados |
| [docs/MANUAL_USUARIO_HORECASO.md](docs/MANUAL_USUARIO_HORECASO.md) | Manual de usuario |
| [docs/CREDENCIALES_PRUEBA.MD](docs/CREDENCIALES_PRUEBA.MD) | Usuarios de desarrollo |

---

**HorecaSO** — Desarrollado por Arin Romero  
*README generado a partir del análisis del código fuente, `package.json`, `requirements.txt`, routers FastAPI, rutas React y documentación del repositorio.*
