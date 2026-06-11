# HorecaSO

<p align="center">
  <strong>ERP SaaS multi-tenant para hostelerÃ­a espaÃ±ola</strong><br/>
  TPV Â· KDS Â· Verifactu Â· Inventario Â· Recetas Â· RRHH Â· Analytics Â· Panel de plataforma
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

## 1. Nombre y descripciÃ³n del proyecto

**HorecaSO** es un sistema operativo web (ERP) orientado al mercado espaÃ±ol de hostelerÃ­a â€” restaurantes medianos con 5â€“50 empleados. Unifica en una sola aplicaciÃ³n lo que habitualmente estÃ¡ fragmentado entre TPV de sala, pantallas de cocina, hojas de escandallo, Excel de almacÃ©n, RRHH en papel y herramientas fiscales desconectadas.

### QuÃ© hace

| Ãrea | Funcionalidad |
|------|---------------|
| **Sala y cobro** | Mapa de mesas, TPV con divisiÃ³n de cuenta, mÃºltiples mÃ©todos de pago |
| **Cocina** | KDS (Kitchen Display System) con filtrado cocina/barra y polling en tiempo casi real |
| **Fiscal** | Registros Verifactu encadenados (SHA-256), generados al completar el cobro |
| **Carta y costes** | CRUD de productos, recetas, escandallos, semÃ¡foro de margen, gastos operativos |
| **Inventario** | ArtÃ­culos, movimientos, mermas, FIFO por lotes, APPCC |
| **Compras** | Proveedores, facturas de compra, escaneo IA con Groq |
| **RRHH** | Empleados, fichajes, cuadrantes, ausencias, nÃ³minas (SS/IRPF EspaÃ±a) |
| **Clientes** | CRM, reservas, lista de espera, fidelizaciÃ³n |
| **DirecciÃ³n** | Dashboard, venta live, analytics (mesas, menÃº BCG, coste personal), reportes PDF |
| **Plataforma SaaS** | Panel superadmin para gestionar tenants (restaurantes clientes) |

### Problema que resuelve

Conecta la cadena operativa **ticket â†’ producto â†’ receta â†’ artÃ­culo â†’ stock â†’ coste â†’ margen â†’ fiscal**, de modo que el dueÃ±o puede responder cuÃ¡nto costÃ³ vender un plato sin exportar a Excel. El modelo es **SaaS multi-tenant**: una instancia de aplicaciÃ³n da servicio a mÃºltiples restaurantes con aislamiento lÃ³gico por `tenant_id` en PostgreSQL.

### Modelo de negocio

Planes previstos: BÃ¡sico / Profesional / Premium / Enterprise (`tenants.plan`). El onboarding de nuevos restaurantes es **manual** (SQL en Supabase o panel superadmin); no hay auto-registro pÃºblico.

---

## 2. Tech stack

### Backend

| TecnologÃ­a | VersiÃ³n | Uso |
|------------|---------|-----|
| Python | 3.12 | Runtime |
| FastAPI | 0.115.0 | Framework HTTP / API REST |
| Uvicorn | 0.30.6 | Servidor ASGI (desarrollo) |
| Gunicorn | 22.0.0 | Proceso maestro en producciÃ³n (Render) |
| asyncpg | 0.29.0 | Driver PostgreSQL asÃ­ncrono (SQL raw, sin ORM) |
| Pydantic | 2.9.0 | ValidaciÃ³n de esquemas |
| pydantic-settings | 2.5.2 | ConfiguraciÃ³n desde `.env` |
| python-jose | 3.3.0 | JWT (HS256) |
| passlib + bcrypt | 1.7.4 / 4.0.1 | Hash de contraseÃ±as |
| SlowAPI | 0.1.9 | Rate limiting global |
| ReportLab | 4.0.8 | GeneraciÃ³n de PDFs |
| Groq SDK | â‰¥0.11.0 | IA visiÃ³n para escaneo de facturas |
| qrcode + Pillow | 7.4.2 / 10.3.0 | QR en documentos |
| python-dotenv | 1.0.1 | Variables de entorno |
| email-validator | 2.2.0 | ValidaciÃ³n de emails |

### Frontend

| TecnologÃ­a | VersiÃ³n | Uso |
|------------|---------|-----|
| React | 19.2.4 | UI |
| React DOM | 19.2.4 | Renderizado |
| Vite | 8.0.1 | Build y dev server |
| React Router DOM | 7.13.1 | Enrutamiento SPA |
| Tailwind CSS | 4.2.2 | Estilos (vÃ­a `@tailwindcss/vite`) |
| Axios | 1.13.6 | Cliente HTTP |
| lucide-react | 0.577.0 | Iconos (strokeWidth 1.5) |
| ESLint | 9.39.4 | Linting |

### Base de datos e infraestructura

| Componente | Detalle |
|------------|---------|
| PostgreSQL | 15 â€” esquema `public`, 42 tablas |
| Supabase | Hosting gestionado, pooler pgbouncer (puerto 6543) |
| Render | Deploy del backend API |
| Vercel | Deploy del frontend estÃ¡tico |

### Decisiones explÃ­citas del stack

- **Sin ORM** (no SQLAlchemy, no Prisma): SQL parametrizado con placeholders `$1, $2`.
- **Sin WebSocket**: polling cada 30 s en pantallas live (KDS, venta live) por limitaciones del plan gratuito de Render.
- **Sin TypeScript** en backend ni frontend.
- **Sin framer-motion** en `package.json` actual (no estÃ¡ instalado).
- **SendGrid** mencionado en la documentaciÃ³n de producto pero **no implementado** en el cÃ³digo backend actual.

---

## 3. Arquitectura

### PatrÃ³n general

Monorepo con **dos aplicaciones** desacopladas:

```
Navegador â†’ React SPA (Vercel) â†’ HTTPS + JWT Bearer â†’ FastAPI (Render) â†’ asyncpg pool â†’ PostgreSQL (Supabase)
```

No es MVC clÃ¡sico ni clean architecture estricta. El backend sigue un patrÃ³n **Router + Service**:

- **`routers/`**: endpoints HTTP, validaciÃ³n Pydantic, `Depends(require_roles)`, SQL con `get_db()`.
- **`services/`**: lÃ³gica reutilizable sin HTTP (Verifactu, generaciÃ³n PDF).
- **`auth/`**: JWT y dependencias de autorizaciÃ³n.
- **`database.py`**: pool de conexiones y transacciones.

El frontend es una **SPA** con guards por rol en `App.jsx`, estado de autenticaciÃ³n en `AuthContext`, y llamadas centralizadas en `services/api.js`.

### Multi-tenancy

Aislamiento **a nivel de fila** en PostgreSQL:

```
tenants (restaurante)
  â””â”€â”€ outlets (local fÃ­sico)
        â””â”€â”€ mesas, tickets, reservas, movimientos_stockâ€¦
  â””â”€â”€ usuarios, productos, articulos, empleados, clientesâ€¦
```

Cada query de negocio filtra por `tenant_id` (del JWT `negocio_id`) y, en operaciones de sala, por `outlet_id`.

### Dos planos de administraciÃ³n

| Plano | Rol | JWT | Rutas |
|-------|-----|-----|-------|
| **Plataforma** | `superadmin` | `tenant_id` y `negocio_id` = `null` | `/api/superadmin/*`, UI `/superadmin/*` |
| **Tenant** | `admin`, roles operativos | `negocio_id` = UUID del tenant | `/api/*` con filtro SQL |

### Seguridad transversal (`main.py`)

- CORS dinÃ¡mico desde `ALLOWED_ORIGINS`.
- `SecurityHeadersMiddleware` (X-Frame-Options, nosniff, etc.).
- SlowAPI rate limiting global.
- OpenAPI `/docs` y `/redoc` **desactivados** cuando `ENVIRONMENT=production`.
- Handler global de excepciones â†’ JSON 500 genÃ©rico (sin stack trace).
- `lifespan`: init/close del pool asyncpg al arrancar/apagar workers.

### Tiempo real

Polling cada **30 segundos** en KDS y Venta Live. Indicador Â«Actualizado hace X segundosÂ» en UI. MigraciÃ³n a WebSocket prevista al contratar Render Starter.

---

## 4. Estructura de carpetas

```
HorecaSO/
â”œâ”€â”€ backend/                          # API Python (FastAPI)
â”‚   â”œâ”€â”€ main.py                       # App factory: routers, middlewares, /api/health
â”‚   â”œâ”€â”€ config.py                     # Settings (pydantic-settings)
â”‚   â”œâ”€â”€ database.py                   # Pool asyncpg + get_db()
â”‚   â”œâ”€â”€ requirements.txt
â”‚   â”œâ”€â”€ auth/
â”‚   â”‚   â”œâ”€â”€ dependencies.py           # get_current_user, require_roles, require_superadmin
â”‚   â”‚   â”œâ”€â”€ jwt_handler.py            # create_access_token, verify_token
â”‚   â”‚   â””â”€â”€ schemas.py                # LoginRequest, TokenResponse
â”‚   â”œâ”€â”€ routers/                      # ~96 archivos .py â€” dominios HTTP
â”‚   â”‚   â”œâ”€â”€ auth.py, mesas*.py, carta.py, dashboard.py, verifactu.py, nominas.py, appcc.py
â”‚   â”‚   â”œâ”€â”€ admin_carta/              # CRUD categorÃ­as, productos, alÃ©rgenos
â”‚   â”‚   â”œâ”€â”€ admin_usuarios/           # GestiÃ³n usuarios del tenant (solo admin)
â”‚   â”‚   â”œâ”€â”€ superadmin/               # Panel plataforma (tenants, logs)
â”‚   â”‚   â”œâ”€â”€ tpv/                      # Tickets, lÃ­neas, pagos, cobro
â”‚   â”‚   â”œâ”€â”€ kds/                      # Comandas cocina/barra
â”‚   â”‚   â”œâ”€â”€ inventario/               # ArtÃ­culos, movimientos, alertas
â”‚   â”‚   â”œâ”€â”€ recetas/                  # Escandallos, ingredientes, semÃ¡foro
â”‚   â”‚   â”œâ”€â”€ costes/                   # Gastos operativos
â”‚   â”‚   â”œâ”€â”€ proveedores/              # Proveedores + facturas + escaneo IA
â”‚   â”‚   â”œâ”€â”€ empleados/                # RRHH: empleados, fichajes, cuadrantes, ausencias
â”‚   â”‚   â”œâ”€â”€ reservas/                 # Reservas + lista de espera
â”‚   â”‚   â”œâ”€â”€ clientes/                 # CRM + historial + puntos
â”‚   â”‚   â”œâ”€â”€ fifo/                     # Lotes, consumo FIFO, valoraciÃ³n
â”‚   â”‚   â”œâ”€â”€ analytics/                # Rentabilidad mesas, ingenierÃ­a menÃº, coste personal
â”‚   â”‚   â””â”€â”€ reportes/                 # PDFs (nÃ³mina, inventario, cierre, diferenciales)
â”‚   â”œâ”€â”€ services/                     # LÃ³gica no-HTTP
â”‚   â”‚   â”œâ”€â”€ verifactu_engine.py       # Huellas SHA-256, registro fiscal
â”‚   â”‚   â””â”€â”€ pdf_*.py                  # Generadores PDF (ReportLab)
â”‚   â”œâ”€â”€ sql/                          # Migraciones y seeds (aplicaciÃ³n manual en Supabase)
â”‚   â”‚   â”œâ”€â”€ migration_*.sql
â”‚   â”‚   â””â”€â”€ seed_*.sql
â”‚   â””â”€â”€ scripts/                      # Utilidades (hashes bcrypt, seeds, schema MD)
â”‚
â”œâ”€â”€ frontend/                         # SPA React
â”‚   â”œâ”€â”€ package.json
â”‚   â”œâ”€â”€ vite.config.js                # Proxy /api â†’ localhost:8000 en dev
â”‚   â”œâ”€â”€ .env.example
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ main.jsx                  # Punto de entrada
â”‚       â”œâ”€â”€ App.jsx                   # Rutas y guards por rol
â”‚       â”œâ”€â”€ index.css                 # Tailwind 4
â”‚       â”œâ”€â”€ context/                  # AuthContext, ThemeContext
â”‚       â”œâ”€â”€ components/
â”‚       â”‚   â”œâ”€â”€ layout/               # AppLayout, Sidebar, SidebarNav, navConfig.js
â”‚       â”‚   â””â”€â”€ shared/               # Loader, StatCard, EmptyState
â”‚       â”œâ”€â”€ pages/                    # Pantallas por dominio (sala, tpv, admin, â€¦)
â”‚       â”œâ”€â”€ services/api.js           # Axios + helpers por endpoint
â”‚       â”œâ”€â”€ constants/uiTokens.js
â”‚       â””â”€â”€ utils/
â”‚
â”œâ”€â”€ docs/                             # DocumentaciÃ³n archivada
â”œâ”€â”€ .cursorrules                      # Convenciones obligatorias del proyecto
â”œâ”€â”€ SCHEMA_BASE_DATOS.md              # Referencia de 42 tablas PostgreSQL
â”œâ”€â”€ ARQUITECTURA_HORECASO.md            # Mapa routers â†” frontend
â”œâ”€â”€ GUIA_PRODUCCION_COMPLETA.md       # Deploy, seguridad, tenants
â”œâ”€â”€ BITACORA_HORECASO.md              # Registro de trabajo por sesiÃ³n
â”œâ”€â”€ BUGS_Y_SOLUCIONES.md              # Bugs reproducibles documentados
â”œâ”€â”€ STEP_HORECASO.md                  # Estado global del proyecto por mÃ³dulo
â”œâ”€â”€ PRD_HorecaSO.md                   # EspecificaciÃ³n de producto
â””â”€â”€ CREDENCIALES_PRUEBA.MD            # Usuarios de desarrollo (no producciÃ³n)
```

---

## 5. Requisitos previos

| Requisito | VersiÃ³n / detalle |
|-----------|-------------------|
| **Python** | 3.12 |
| **Node.js** | 18+ recomendado (compatible con Vite 8) |
| **npm** | Incluido con Node.js |
| **PostgreSQL** | 15 â€” vÃ­a proyecto Supabase (local no obligatorio si usas Supabase remoto) |
| **Git** | Para clonar el repositorio |
| **Cuenta Supabase** | Base de datos y SQL Editor para migraciones |
| **Cuenta Groq** | Opcional â€” solo para escaneo IA de facturas (`GROQ_API_KEY`) |

**No requerido en el repositorio actual:**

- Docker / docker-compose (no incluidos).
- Alembic ni herramienta de migraciones automÃ¡tica (SQL manual en `backend/sql/`).

---

## 6. InstalaciÃ³n y configuraciÃ³n

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

Crear `backend/.env` (no estÃ¡ versionado; ver secciÃ³n 9):

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

Ejecutar en **Supabase â†’ SQL Editor** (en orden, segÃºn necesidad):

| Archivo | Obligatorio siâ€¦ |
|---------|-----------------|
| `backend/sql/migration_kds_barra_destino.sql` | Usas KDS/TPV con destino cocina/barra |
| `backend/sql/migration_fase_b.sql` | Panel superadmin y tenant de prueba |
| `backend/sql/migration_gastos_operativos.sql` | MÃ³dulo Costes |
| `backend/sql/migration_articulos_calibracion_merma.sql` | CalibraciÃ³n de merma en inventario |
| `backend/sql/migration_articulos_elaborados_receta.sql` | Elaboraciones (artÃ­culos elaborados) |

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

El proxy de Vite reenvÃ­a `/api` a `http://localhost:8000` en desarrollo; normalmente **no hace falta** `VITE_API_URL` en local.

### 6.5 VerificaciÃ³n de instalaciÃ³n

```bash
# Backend â€” debe importar sin errores
cd backend
python -c "from main import create_app; create_app()"

# Frontend â€” build limpio
cd frontend
npm run build
```

---

## 7. CÃ³mo ejecutar el proyecto

### Desarrollo local

**Terminal 1 â€” Backend** (desde `backend/` con venv activo):

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs` (solo si `ENVIRONMENT != production`)
- Health: `http://localhost:8000/api/health`

**Terminal 2 â€” Frontend** (desde `frontend/`):

```bash
npm run dev
```

- UI: `http://localhost:5173`
- Login de prueba: ver `CREDENCIALES_PRUEBA.MD` (tenant Restaurante Prueba o demo legacy `admin@test.com` si existe en tu BD).

### Preview de producciÃ³n (frontend)

```bash
cd frontend
npm run build
npm run preview
```

`vite.config.js` incluye proxy `/api` tambiÃ©n en `preview`.

### ProducciÃ³n

| Capa | Comando / plataforma |
|------|----------------------|
| Backend | Render â€” ver secciÃ³n 13 |
| Frontend | Vercel â€” `npm run build`, output `dist/` |

**No hay** `docker-compose.yml` ni imagen Docker en el repositorio.

---

## 8. Scripts disponibles

### Frontend (`frontend/package.json`)

| Script | Comando | DescripciÃ³n |
|--------|---------|-------------|
| `dev` | `vite` | Servidor de desarrollo con HMR en puerto 5173 |
| `build` | `vite build` | Compila la SPA a `frontend/dist/` |
| `preview` | `vite preview` | Sirve el build localmente (con proxy `/api`) |
| `lint` | `eslint .` | Analiza cÃ³digo JS/JSX con ESLint 9 flat config |

### Backend (scripts Python en `backend/scripts/`)

| Script | DescripciÃ³n |
|--------|-------------|
| `generate_test_hashes.py` | Genera hashes bcrypt para seeds SQL |
| `schema_mcp_json_to_markdown.py` | Regenera `SCHEMA_BASE_DATOS.md` desde volcado MCP |
| `apply_seed_shell_batches.py` | Aplica seeds por lotes (desarrollo) |
| `generate_seed_despensa_articulos.py` | Genera SQL de artÃ­culos de prueba |

### Comandos operativos habituales (no en package.json)

```bash
# Verificar app factory
cd backend && python -c "from main import create_app; create_app()"

# Arrancar API en desarrollo
cd backend && uvicorn main:app --reload

# ProducciÃ³n local (simular Render)
cd backend && gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120
```

---

## 9. Variables de entorno

### Backend (`backend/.env`)

| Variable | DescripciÃ³n | Obligatoria |
|----------|-------------|-------------|
| `DATABASE_URL` | Connection string PostgreSQL (Supabase pooler `:6543`) | **SÃ­** |
| `SECRET_KEY_AUTH` | Clave para firmar JWT (mÃ­n. 32 caracteres aleatorios en prod) | **SÃ­** |
| `ALGORITHM` | Algoritmo JWT | No (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | DuraciÃ³n del token en minutos | No (default: `1440`) |
| `ALLOWED_ORIGINS` | OrÃ­genes CORS separados por coma | No (default: `http://localhost:5173`) |
| `ENVIRONMENT` | `development` \| `production` â€” controla `/docs` | No (default: `development`) |
| `GROQ_API_KEY` | API key Groq para escaneo IA de facturas | No (vacÃ­o desactiva IA) |
| `APP_NAME` | Nombre mostrado en metadatos | No (default: `HorecaSO`) |
| `APP_VERSION` | VersiÃ³n de la app | No (default: `1.0.0`) |

### Frontend (`frontend/.env` / `.env.local`)

| Variable | DescripciÃ³n | Obligatoria |
|----------|-------------|-------------|
| `VITE_API_URL` | URL base del API. Debe terminar en `/api` o se aÃ±ade automÃ¡ticamente. Ej: `https://tu-backend.onrender.com/api` | No en dev (usa proxy `/api`). **SÃ­ en Vercel** |

Ejemplo (`frontend/.env.example`):

```env
# VITE_API_URL=http://127.0.0.1:8000/api
```

---

## 10. API / Endpoints

Base URL en desarrollo: `http://localhost:8000`. Todas las rutas de negocio bajo `/api/...` salvo `GET /` (metadatos) y `GET /api/health`.

**AutenticaciÃ³n:** `Authorization: Bearer <JWT>` en endpoints protegidos (excepto login y carta pÃºblica).

**AutorizaciÃ³n:** `require_roles([...])` por endpoint. Respuestas estÃ¡ndar: `401` sin token vÃ¡lido, `403` rol no permitido, `500` con `{"detail":"Error interno"}`.

### Auth â€” `/api/auth`

| MÃ©todo | Ruta | Roles | DescripciÃ³n |
|--------|------|-------|-------------|
| POST | `/login` | PÃºblico | Login email/password â†’ JWT |
| GET | `/perfil` | Autenticado | Perfil del usuario actual |
| GET | `/verify` | Autenticado | VerificaciÃ³n de token |

### Mesas â€” `/api/mesas`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/` | Listado de mesas del outlet |
| GET | `/{mesa_id}` | Detalle de mesa |
| POST | `/` | Crear mesa |
| PUT | `/{mesa_id}` | Actualizar mesa |
| PATCH | `/{mesa_id}/estado` | Cambiar estado (`libre`, `ocupada`, `reservada`) |
| DELETE | `/{mesa_id}` | Eliminar mesa |

### TPV â€” `/api/tpv`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/carta` | Productos agrupados por categorÃ­a |
| GET | `/carta/productos` | Lista plana de productos |
| POST | `/tickets` | Crear ticket (`mesa_id`, `outlet_id`) |
| GET | `/tickets/abiertos` | Tickets abiertos |
| GET | `/tickets/hoy` | Tickets del dÃ­a (venta live) |
| GET | `/tickets/{ticket_id}` | Ticket resumido |
| GET | `/tickets/{ticket_id}/detalle` | Ticket con lÃ­neas y pagos |
| POST | `/tickets/{ticket_id}/lineas` | AÃ±adir lÃ­nea (`producto_id`, `cantidad`) |
| DELETE | `/tickets/{ticket_id}/lineas/{linea_id}` | Eliminar lÃ­nea |
| POST | `/tickets/{ticket_id}/pagos` | Registrar pago parcial (`importe`, `metodo_pago`) |
| GET | `/tickets/{ticket_id}/pagos` | Listar pagos del ticket |
| DELETE | `/tickets/{ticket_id}/pagos/{pago_id}` | Anular pago |
| POST | `/tickets/{ticket_id}/cobrar` | Cobro (simple o cierre tras pagos) |

**MÃ©todos de pago vÃ¡lidos:** `efectivo`, `tarjeta_credito`, `tarjeta_debito`, `bizum`, `transferencia`, `invitacion`.

### Verifactu â€” `/api/verifactu`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/registros` | Listado de registros fiscales |
| GET | `/registros/{registro_id}` | Detalle de registro |
| GET | `/verificar-cadena` | VerificaciÃ³n de cadena de huellas |
| GET | `/exportar` | ExportaciÃ³n de registros |

> Regla inamovible: **nunca** UPDATE ni DELETE en `verifactu_registros`.

### Carta pÃºblica â€” `/api/carta`

| MÃ©todo | Ruta | Auth | DescripciÃ³n |
|--------|------|------|-------------|
| GET | `/publica/{outlet_slug}` | No | Carta pÃºblica para QR |

### Admin carta â€” `/api/admin`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET/POST | `/categorias` | CRUD categorÃ­as |
| PUT/DELETE | `/categorias/{id}` | |
| GET/POST | `/productos` | CRUD productos |
| PUT/DELETE | `/productos/{id}` | |
| POST | `/productos/{id}/alergenos` | Asignar alÃ©rgenos |
| GET | `/alergenos` | CatÃ¡logo de alÃ©rgenos (`/api/alergenos`) |

### Admin recetas â€” `/api/admin`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/recetas` | Listado de recetas |
| GET | `/recetas/semaforo` | SemÃ¡foro de margen |
| POST | `/recetas` | Crear receta |
| POST | `/elaboraciones` | ArtÃ­culo elaborado + receta |
| POST | `/recetas/plato-nuevo` | Producto carta + receta en un paso |
| PUT | `/recetas/{id}` | Actualizar receta |
| DELETE | `/recetas/{id}` | Eliminar receta |
| POST | `/recetas/{id}/ingredientes` | AÃ±adir ingrediente |
| DELETE | `/recetas/{id}/ingredientes/{ingrediente_id}` | Quitar ingrediente |
| GET | `/recetas/{id}/coste` | Coste calculado de la receta |

### Admin costes â€” `/api/admin`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/gastos-operativos` | Gastos fijos mensuales |
| POST | `/gastos-operativos` | Crear gasto |
| DELETE | `/gastos-operativos/{gasto_id}` | Eliminar gasto |

### Admin usuarios â€” `/api/admin` (solo `admin`)

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/usuarios` | Usuarios del tenant |
| POST | `/usuarios` | Alta de usuario operativo |
| PATCH | `/usuarios/{usuario_id}` | Modificar usuario |

### Superadmin â€” `/api/superadmin` (solo `superadmin`)

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/tenants` | Listado paginado de tenants |
| GET | `/tenants/{tenant_id}` | Detalle de tenant |
| PATCH | `/tenants/{tenant_id}/activo` | Activar/desactivar tenant |
| GET | `/platform-logs` | Logs de plataforma (filtros fecha) |

### Dashboard â€” `/api/dashboard`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/director` | KPIs del panel director |
| GET | `/cierre-dia` | Cierre del dÃ­a (`?fecha=YYYY-MM-DD`) |

### Analytics â€” `/api/dashboard`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/rentabilidad-mesas` | Rentabilidad por mesa |
| GET | `/ingenieria-menu` | AnÃ¡lisis BCG del menÃº |
| GET | `/coste-personal` | Coste de personal |

### Inventario â€” `/api/inventario`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/articulos` | Listado (`?buscar`, `?categoria`, `?alerta`) |
| POST | `/articulos` | Crear artÃ­culo |
| PUT | `/articulos/{articulo_id}` | Actualizar artÃ­culo |
| PUT | `/articulos/{articulo_id}/calibracion-merma` | CalibraciÃ³n merma (`comprado`, `util`) |
| GET | `/stock-alertas` | Alertas de stock bajo |
| POST | `/movimientos` | Movimiento (`entrada`, `salida`, `ajuste`, `merma`) |
| GET | `/movimientos` | Historial (`?articulo_id`, `?tipo`, `?desde`, `?hasta`) |
| POST | `/inventario-fisico` | Ajuste por inventario fÃ­sico |

### KDS â€” `/api/kds`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/comandas` | Comandas pendientes (filtro cocina/barra por rol) |
| PATCH | `/lineas/{linea_id}/estado` | Cambiar estado de lÃ­nea |
| GET | `/estadisticas` | EstadÃ­sticas KDS |

### FIFO â€” `/api/fifo`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/lotes` | Lotes de inventario |
| POST | `/lotes` | Crear lote |
| POST | `/consumir` | Consumo FIFO |
| GET | `/alertas-caducidad` | Alertas de caducidad |
| GET | `/valoracion-stock` | ValoraciÃ³n de stock |

### Proveedores â€” `/api`

| MÃ©todo | Ruta | DescripciÃ³n |
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

### Empleados / RRHH â€” `/api`

| MÃ©todo | Ruta | DescripciÃ³n |
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

### NÃ³minas â€” `/api/nominas`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| POST | `/calcular` | Calcular nÃ³mina (SS 6,35 % empleado / 29,9 % empresa) |
| GET | `/{empleado_id}` | NÃ³minas de un empleado |
| GET | `/{nomina_id}/detalle` | Detalle de nÃ³mina |

### Reservas â€” `/api`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/reservas` | Listado |
| GET | `/reservas/{reserva_id}` | Detalle |
| POST | `/reservas` | Crear reserva |
| PUT | `/reservas/{reserva_id}` | Actualizar |
| PATCH | `/reservas/{reserva_id}/estado` | Cambiar estado |
| GET | `/lista-espera` | Lista de espera |
| POST | `/lista-espera` | AÃ±adir a lista de espera |
| PATCH | `/lista-espera/{entrada_id}/estado` | Actualizar entrada |

### Clientes â€” `/api/clientes`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/` | Listado |
| POST | `/` | Crear cliente |
| GET | `/{cliente_id}` | Detalle |
| PUT | `/{cliente_id}` | Actualizar |
| GET | `/{cliente_id}/historial` | Historial de visitas/tickets |
| POST | `/{cliente_id}/puntos` | Ajustar puntos fidelidad |

### APPCC â€” `/api/appcc`

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/registros` | Registros de control |
| GET | `/registros/no-conformes` | No conformidades |
| POST | `/registros` | Nuevo registro (temperatura, etc.) |
| GET | `/resumen-dia` | Resumen del dÃ­a |

### Reportes PDF â€” `/api/reportes`

| MÃ©todo | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/nomina/{nomina_id}` | PDF nÃ³mina |
| GET | `/inventario` | PDF inventario |
| GET | `/cierre-caja/{fecha}` | PDF cierre de caja |
| GET | `/ventas` | PDF ventas por periodo |
| GET | `/cuadrante/{semana}` | PDF cuadrante semanal |
| GET | `/rentabilidad-platos` | PDF rentabilidad carta |
| GET | `/comparativa-proveedores/{articulo_id}` | PDF comparativa proveedores |
| GET | `/appcc` | PDF registros APPCC |

### Sistema

| MÃ©todo | Ruta | DescripciÃ³n |
|--------|------|-------------|
| GET | `/` | Metadatos (`app`, `version`) |
| GET | `/api/health` | Health check â€” `SELECT 1` en BD â†’ `{"status":"ok"}` o `503` |

---

## 11. Base de datos

### Motor y hosting

- **PostgreSQL 15** en **Supabase**.
- **42 tablas** en esquema `public` (documentadas en [`SCHEMA_BASE_DATOS.md`](SCHEMA_BASE_DATOS.md)).
- **RLS (Row Level Security):** desactivado en la instancia auditada; el aislamiento multi-tenant se aplica en la capa de aplicaciÃ³n (`WHERE tenant_id = $1`).
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
| `migration_kds_barra_destino.sql` | `destino_kds` en productos, columnas barra en lÃ­neas |
| `migration_fase_b.sql` | Superadmin, logs plataforma, seed tenant prueba |
| `migration_gastos_operativos.sql` | Tabla `gastos_operativos` |
| `migration_articulos_calibracion_merma.sql` | CalibraciÃ³n de merma en artÃ­culos |
| `migration_articulos_elaborados_receta.sql` | Elaboraciones vinculadas a recetas |

Las migraciones se aplican **manualmente** en Supabase SQL Editor. No hay runner automÃ¡tico al arrancar la app.

### Datos de prueba

| Entidad | UUID |
|---------|------|
| Tenant demo (legacy en docs) | `00000000-0000-0000-0000-000000000001` |
| Outlet demo | `00000000-0000-0000-0000-000000000002` |
| Tenant Restaurante Prueba (Fase B) | `11111111-1111-1111-1111-111111111111` |

Credenciales: [`CREDENCIALES_PRUEBA.MD`](CREDENCIALES_PRUEBA.MD).

---

## 12. Tests

**El repositorio no incluye actualmente una suite de tests automatizados** (no hay `pytest`, `jest`, `vitest` ni carpetas `tests/` / `__tests__/` configuradas).

### VerificaciÃ³n manual recomendada

```bash
# ImportaciÃ³n del backend
cd backend && python -c "from main import create_app; create_app()"

# Build frontend
cd frontend && npm run build

# Lint frontend
cd frontend && npm run lint

# Health check (con backend en marcha)
curl http://localhost:8000/api/health
```

### Smoke tests post-deploy

Documentados en [`GUIA_PRODUCCION_COMPLETA.md`](GUIA_PRODUCCION_COMPLETA.md) Â§1.2 y Â§2.3: login, mesas con JWT, aislamiento tenant, superadmin sin acceso a datos de negocio, KDS 200, `/docs` â†’ 404 en producciÃ³n.

### Registro de bugs

Fallos reproducibles en [`BUGS_Y_SOLUCIONES.md`](BUGS_Y_SOLUCIONES.md).

---

## 13. Despliegue

### Arquitectura de producciÃ³n

```
Usuario â†’ Vercel (React estÃ¡tico) â†’ HTTPS â†’ Render (Gunicorn + Uvicorn workers) â†’ Supabase PostgreSQL
```

### Backend â€” Render

| ParÃ¡metro | Valor |
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

### Frontend â€” Vercel

| ParÃ¡metro | Valor |
|-----------|-------|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Variable crÃ­tica | `VITE_API_URL=https://tu-backend.onrender.com/api` |

### Checklist pre-producciÃ³n

1. Migraciones SQL aplicadas en Supabase de producciÃ³n (KDS, Fase B, etc.).
2. `SECRET_KEY_AUTH` aleatoria (no la de desarrollo).
3. `ALLOWED_ORIGINS` solo con dominio Vercel (no `*`).
4. `ENVIRONMENT=production` â†’ `/docs` devuelve 404.
5. Credenciales de prueba rotadas o eliminadas.
6. Superadmin de producciÃ³n creado manualmente en SQL (no usar seed).
7. Smoke tests: health, login, TPV â†’ cobro â†’ fila en `verifactu_registros`.

GuÃ­a completa: [`GUIA_PRODUCCION_COMPLETA.md`](GUIA_PRODUCCION_COMPLETA.md).

---

## 14. ContribuciÃ³n

### Convenciones obligatorias

Leer y seguir [`.cursorrules`](../.cursorrules) antes de contribuir. Resumen:

**Backend:**
- SQL con placeholders `$1, $2` â€” nunca f-strings con valores de usuario.
- Dinero siempre con `Decimal` de Python.
- `async with get_db() as conn` en todos los endpoints.
- `Depends(require_roles([...]))` en endpoints protegidos.
- PatrÃ³n try/except: re-lanzar `HTTPException`, log + 500 genÃ©rico para el resto.
- Filtrar por `tenant_id` y `outlet_id` donde aplique.

**Frontend:**
- Mobile first (Tailwind responsive).
- Dark/light mode obligatorio en todos los componentes.
- Iconos: `lucide-react` con `strokeWidth={1.5}` â€” nunca emojis como iconos UI.
- Botones tÃ¡ctiles mÃ­nimo `h-12` (excepciÃ³n `h-9` en cards de producto TPV).
- Sin `<form submit>` â€” usar `onClick` handlers.
- Polling 30 s en pantallas live (no WebSocket).

### Flujo de trabajo

1. Crear rama desde `main` para tu cambio.
2. Implementar siguiendo patrones existentes en el router/pÃ¡gina mÃ¡s cercano.
3. Verificar `python -c "from main import create_app; create_app()"` y `npm run build`.
4. Documentar trabajo relevante en [`docs/BITACORA_HORECASO.md`](BITACORA_HORECASO.md).
5. Si aparece un bug reproducible, registrarlo en [`docs/BUGS_Y_SOLUCIONES.md`](BUGS_Y_SOLUCIONES.md).
6. Abrir pull request con descripciÃ³n del cambio y plan de prueba manual.

### DocumentaciÃ³n viva

| Documento | CuÃ¡ndo actualizar |
|-----------|-------------------|
| `BITACORA_HORECASO.md` | Tras cada bloque de trabajo relevante |
| `STEP_HORECASO.md` | Cambios de roadmap o estado de fase |
| `ARQUITECTURA_HORECASO.md` | Nuevo router, ruta React o migraciÃ³n crÃ­tica |
| `SCHEMA_BASE_DATOS.md` | Cambios de esquema en Supabase |

---

## 15. Licencia

**No existe archivo `LICENSE` en el repositorio.** El cÃ³digo no declara una licencia open source explÃ­cita. Contacta al autor (**Arin Romero**) para condiciones de uso, distribuciÃ³n o contribuciÃ³n externa.

---

## InformaciÃ³n adicional

### Roles del sistema y acceso UI

| Rol | Acceso principal |
|-----|------------------|
| `superadmin` | Panel plataforma `/superadmin/*` |
| `admin` | Todo el tenant + `/admin/usuarios` |
| `director` | Dashboard, analytics, configuraciÃ³n, reportes, nÃ³minas |
| `jefe_sala` | Mesas, reservas, TPV, venta live, KDS, gestiÃ³n sala |
| `camarero` | TPV, mesas |
| `cocina` | KDS cocina, recetas, inventario (lectura) |
| `barra` | KDS barra |
| `almacen` | Inventario, proveedores, mermas |

La navegaciÃ³n se define en [`frontend/src/components/layout/constants/navConfig.js`](../frontend/src/components/layout/constants/navConfig.js) y se filtra por `user.rol`.

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
| `/admin/carta` | GestiÃ³n de carta |
| `/admin/recetas` | Escandallos |
| `/admin/costes` | Gastos operativos |
| `/admin/sala` | GestiÃ³n de mesas |
| `/admin/usuarios` | Usuarios del tenant |
| `/inventario`, `/inventario/mermas` | Inventario y mermas |
| `/fifo`, `/appcc` | FIFO y APPCC |
| `/proveedores`, `/proveedores/facturas` | Compras |
| `/empleados`, `/fichajes`, `/cuadrante`, `/nominas` | RRHH |
| `/reservas`, `/clientes` | Clientes y reservas |
| `/reportes` | Descarga de informes |
| `/superadmin/tenants` | GestiÃ³n de tenants |

### Reglas de negocio crÃ­ticas

- **Verifactu:** cobro + registro en la misma transacciÃ³n; huella SHA-256 en mayÃºsculas; IVA hostelerÃ­a 10 % general, 21 % alcohol/tabaco.
- **DivisiÃ³n de cuenta:** tabla `ticket_pagos`; ticket cobrado cuando `suma(pagos) >= total`.
- **SemÃ¡foro recetas:** verde >65 % margen, amarillo 40â€“65 %, rojo <40 %.
- **Merma:** `cantidad_bruta = cantidad_neta / (1 - porcentaje_merma / 100)`.
- **NÃ³minas EspaÃ±a:** SS empleado 6,35 %, SS empresa 29,9 %.

### DocumentaciÃ³n de referencia

| Documento | Contenido |
|-----------|-----------|
| [docs/GUIA_PRODUCCION_COMPLETA.md](GUIA_PRODUCCION_COMPLETA.md) | Deploy, seguridad, tenants, smoke tests |
| [docs/SCHEMA_BASE_DATOS.md](SCHEMA_BASE_DATOS.md) | 42 tablas, columnas, FKs |
| [docs/ARQUITECTURA_HORECASO.md](ARQUITECTURA_HORECASO.md) | Mapa tÃ©cnico routers â†” frontend |
| [docs/STEP_HORECASO.md](STEP_HORECASO.md) | Estado del proyecto por mÃ³dulo |
| [docs/PRD_HorecaSO.md](PRD_HorecaSO.md) | EspecificaciÃ³n de producto |
| [docs/BITACORA_HORECASO.md](BITACORA_HORECASO.md) | Historial de implementaciÃ³n |
| [docs/BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md) | Bugs documentados |
| [docs/MANUAL_USUARIO_HORECASO.md](MANUAL_USUARIO_HORECASO.md) | Manual de usuario |
| [docs/CREDENCIALES_PRUEBA.MD](CREDENCIALES_PRUEBA.MD) | Usuarios de desarrollo |

---

**HorecaSO** â€” Desarrollado por Arin Romero  
*README generado a partir del anÃ¡lisis del cÃ³digo fuente, `package.json`, `requirements.txt`, routers FastAPI, rutas React y documentaciÃ³n del repositorio.*

