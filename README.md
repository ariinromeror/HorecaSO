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
  <img src="https://img.shields.io/badge/asyncpg-0.29-336791" alt="asyncpg"/>
  <img src="https://img.shields.io/badge/Pydantic-2.9-E92063" alt="Pydantic 2"/>
  <img src="https://img.shields.io/badge/JWT-HS256-000000" alt="JWT"/>
  <img src="https://img.shields.io/badge/Deploy-Render_%7C_Vercel-000000" alt="Render + Vercel"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Gunicorn-22.0-499848" alt="Gunicorn"/>
  <img src="https://img.shields.io/badge/Uvicorn-0.30-000000" alt="Uvicorn"/>
  <img src="https://img.shields.io/badge/SlowAPI-rate_limit-CB3837" alt="SlowAPI"/>
  <img src="https://img.shields.io/badge/Groq-vision_%7C_LLM-412991" alt="Groq API"/>
  <img src="https://img.shields.io/badge/ReportLab-4.0-PDF-red" alt="ReportLab"/>
  <img src="https://img.shields.io/badge/Axios-1.13-5A29E4?logo=axios&logoColor=white" alt="Axios"/>
  <img src="https://img.shields.io/badge/React_Router-7.13-CA4245?logo=reactrouter&logoColor=white" alt="React Router 7"/>
  <img src="https://img.shields.io/badge/lucide--react-0.577-000000" alt="lucide-react"/>
</p>

> **Documento:** README de producción **completo** (Parte 1: visión, stack, estructura · Parte 2: seguridad, bugs, deploy, escala).  
> Generado a partir del código fuente en disco y `GUIA_PRODUCCION_COMPLETA.md`, `BUGS_Y_SOLUCIONES.md`, `BITACORA_HORECASO.md`.  
> **Nota:** este repositorio no incluye `framer-motion` ni ORM (SQLAlchemy/Django); el stack real es el indicado en los badges.

---

## 📌 ¿Qué es HorecaSO? (Visión de producto SaaS)

HorecaSO es un **sistema operativo web** para restaurantes medianos en España: unifica en una sola aplicación lo que habitualmente está repartido entre TPV de sala, pantallas de cocina, Excel de almacén, hojas de escandallo, RRHH en papel y herramientas fiscales desconectadas. El producto está construido como **SaaS multi-tenant**: una única instancia de aplicación (un backend FastAPI, un frontend React, una base PostgreSQL en Supabase) da servicio a **múltiples restaurantes (tenants)** con datos lógicamente aislados, más un **operador de plataforma (superadmin)** que administra el parque de clientes sin pertenecer a ningún local.

### Problemas que resuelve en hostelería

| Área operativa | Dolor en el sector | Cómo lo aborda HorecaSO en código |
|----------------|-------------------|-----------------------------------|
| **Cierre económico** | El dueño sabe ventas pero no coste real por plato | Recetas (`recetas`, `receta_ingredientes`), semáforo de margen, módulo Costes (`admin_gastos_operativos`), analytics BCG (`analytics_menu.py`) |
| **Sala y cobro** | Mesas bloqueadas, divisiones de cuenta, cola en cocina | `tickets`, `ticket_lineas`, `ticket_pagos`, TPV (`tpv/`), KDS filtrado por `destino_kds` (`kds_shared.py`) |
| **Fiscal** | Verifactu obligatorio; errores en cadena de huellas | `verifactu_engine.py` + `verifactu_registros`; cobro atómico en `tpv_cobro` / `tpv_cobrar.py` |
| **Almacén** | Stock en hoja; merma mal entendida | `articulos`, `movimientos_stock`, calibración útil (`calibracion_comprado` / `calibracion_util`), FIFO (`fifo/`) |
| **Compras** | Facturas a mano | `facturas_proveedor` + `POST /facturas-proveedor/escanear-ia` vía Groq (`proveedores_shared._groq_escanear_sync`) |
| **Personal** | Fichajes y nóminas fuera del TPV | `turnos`, `fichajes.py`, `nominas.py` (SS 6,35 % / 29,9 % en lógica de nómina) |
| **Plataforma SaaS** | Onboarding de nuevos locales | `tenants`, panel `/superadmin/*`, alta de usuarios por tenant en `/admin/usuarios` |

La propuesta de valor no es “un módulo más”, sino **trazabilidad entre capas**: un `ticket_lineas` enlaza a `productos` → `recetas` → `articulos` → `movimientos_stock` y, al cobrar, a `verifactu_registros`. Esa cadena es lo que permite responder “cuánto me costó vender X hoy” sin exportar a Excel.

### Modelo de negocio multi-tenant (cómo está implementado)

El aislamiento no es microservicios por cliente ni bases de datos separadas por restaurante en el código actual: es **multi-tenancy a nivel de fila** en PostgreSQL, reforzado por **claims JWT** y **filtros SQL obligatorios** en cada router de negocio.

#### Entidades de tenancy (esquema real)

```
tenants                    -- Restaurante / empresa (NIF, plan, activo)
    └── outlets            -- Local físico (Sala Principal, terraza, etc.)
            └── mesas, tickets, reservas, movimientos_stock, …
    └── usuarios           -- Login; tenant_id NULL solo para superadmin
    └── productos, articulos, empleados, clientes, proveedores, …
```

- **`tenants`**: unidad de facturación SaaS (`plan`: basico / profesional / premium / enterprise). La columna `activo` (Fase B) permite bloquear un cliente desde el panel de plataforma.
- **`outlets`**: acota la operación diaria; `tickets.outlet_id`, `mesas.outlet_id` y la mayoría de movimientos de stock cuelgan del local, no solo del tenant.
- **`usuarios`**: credenciales y `rol` con CHECK que incluye `superadmin`, `admin`, `director`, `jefe_sala`, `camarero`, `cocina`, `barra`, `almacen`.

#### Dos planos de administración (separación en código)

| Plano | Actor | JWT | Rutas API | UI |
|-------|--------|-----|-----------|-----|
| **Plataforma** | `superadmin` | `tenant_id: null`, `negocio_id: null` (explícito en login) | `/api/superadmin/tenants`, `…/platform-logs` | `/superadmin/tenants`, `/superadmin/logs` — layout `SuperadminLayout`, menú `SUPERADMIN_NAV_ITEMS` |
| **Tenant (restaurante)** | `admin`, roles operativos | `negocio_id` = UUID de `usuarios.tenant_id` | Casi todo bajo `/api/*` con `WHERE tenant_id = $1` | `AppLayout` + `navConfig.js` filtrado por `user.rol` |

**Login superadmin** (`backend/routers/auth.py`, líneas 59–67): tras validar bcrypt, si `rol == 'superadmin'` el payload del token es:

```python
token_data = {
    "sub": str(row["id"]),
    "user_id": str(row["id"]),
    "role": "superadmin",
    "negocio_id": None,
    "tenant_id": None,
}
```

**Login tenant**: mismo endpoint, pero `negocio_id` se rellena con `str(row["tenant_id"])`. El frontend guarda token y perfil en `localStorage` (`horecaso_token`, `horecaso_user`) y Axios inyecta `Authorization: Bearer` en cada petición (`frontend/src/services/api.js`).

**Admin de tenant** (`admin_usuarios_router.py`): función `_tenant_uuid_from_jwt` exige `negocio_id` o `tenant_id` en el JWT; si faltan → **403** `"Sin tenant asignado en el token"`. Todas las consultas de usuarios llevan `WHERE tenant_id = $1 AND rol <> 'superadmin'`. No se puede crear un `superadmin` desde este router (`ROLES_OPERATIVOS_ADMIN`).

**Superadmin** (`superadmin_router.py`): `Depends(require_superadmin)` en cada handler; listados como `SELECT … FROM tenants` **sin** filtro por tenant del JWT (por diseño: visión global). Un superadmin que llame a `/api/mesas` no tiene `negocio_id` en el token: los routers de negocio deben responder **403** (comportamiento esperado y probado en `GUIA_PRODUCCION_COMPLETA.md` §2.3).

#### Auditoría de plataforma

Al activar/desactivar un tenant, `PATCH /api/superadmin/tenants/{id}/activo` persiste en `platform_logs` (`nivel`, `modulo='superadmin'`, `accion='set_tenant_activo'`, `detalle` JSONB). La UI `PlatformLogsPage.jsx` consume `GET /api/superadmin/platform-logs` con paginación y filtros de fecha.

#### Aislamiento de datos: capas de defensa

1. **Aplicación (principal hoy):** cada query de negocio incluye `tenant_id` derivado del JWT (`negocio_id`), p. ej. listados de productos, clientes, empleados.
2. **RBAC:** `require_roles([...])` en `auth/dependencies.py` impide que un `camarero` invoque `/api/nominas` aunque adivine la URL.
3. **RLS en Supabase:** en la instancia documentada en `SCHEMA_BASE_DATOS.md`, Row Level Security está **desactivado** en las 42 tablas; la guía de producción recomienda activar políticas por `tenant_id` antes de clientes reales (defensa en profundidad, no sustituto del filtrado en Python).

#### Alta de un nuevo restaurante (estado actual del código)

- **No existe** `POST /api/superadmin/tenants` en `superadmin_router.py`: el alta de tenant nuevo se hace con **SQL** (`GUIA_PRODUCCION_COMPLETA.md` §5.1: bloque `DO $$` que inserta `tenants`, `outlets`, usuario `admin` y mesas iniciales).
- El **seed reproducible** para desarrollo está en `backend/sql/migration_fase_b.sql` (tenant `Restaurante Prueba`, usuarios `@prueba.com`).
- Tras el alta SQL, el **admin del tenant** gestiona el resto de usuarios en `UsuariosPage.jsx` → `GET/POST/PATCH /api/admin/usuarios`.

---

## 🏗️ Arquitectura de software y stack tecnológico

### Patrón arquitectónico global

HorecaSO sigue una **arquitectura en capas monolítica modular**:

- **Cliente:** SPA React (CSR) desplegada en Vercel; comunicación REST JSON con el API.
- **API:** monolito FastAPI con **routers por dominio** (paquetes bajo `backend/routers/`), sin capa ORM: SQL explícito con **asyncpg**.
- **Datos:** PostgreSQL 15 administrado en Supabase; conexión vía **pooler** (`statement_cache_size=0` obligatorio por pgbouncer).
- **Servicios transversales:** `backend/services/` para Verifactu y generación PDF (ReportLab), invocados desde routers.

No hay cola de mensajes ni WebSocket en el código de producción actual: KDS y Venta Live usan **polling** (`setInterval` ~30 s en hooks como `useKdsComandas.js`, `useVentaLivePolling.js`).

```mermaid
flowchart TB
  subgraph vercel [Vercel - frontend]
    React[React 19 + Vite 8]
    Axios[Axios api.js]
    Router[react-router-dom 7]
  end
  subgraph render [Render - backend]
    Gunicorn[gunicorn + uvicorn workers]
    FastAPI[FastAPI create_app]
    SlowAPI[SlowAPIMiddleware]
    Routers[routers/* 38 include_router]
    Services[services/ verifactu + pdf]
  end
  subgraph supabase [Supabase]
    PG[(PostgreSQL 15)]
    Pooler[pgbouncer :6543]
  end
  React --> Axios
  Axios -->|HTTPS JWT| Gunicorn
  Gunicorn --> FastAPI
  FastAPI --> Routers
  Routers --> Services
  Routers -->|asyncpg pool| Pooler
  Pooler --> PG
```

### Tabla de stack por capa (dependencias reales del repo)

#### Backend — runtime y API

| Componente | Versión en repo | Ubicación / uso | Justificación en producción |
|------------|-----------------|-----------------|------------------------------|
| **Python** | 3.12 | Entorno Render/local | Versión objetivo del proyecto; tipado y asyncio maduros |
| **FastAPI** | 0.115.0 | `main.py` → `create_app()` | OpenAPI automático en dev, `Depends` para RBAC, validación Pydantic en bodies, `lifespan` para pool BD |
| **Uvicorn** | 0.30.6 | Dev local | Servidor ASGI para desarrollo |
| **Gunicorn** | 22.0.0 | Start command Render | Proceso maestro + workers Uvicorn; concurrencia en producción sin bloquear el event loop |
| **asyncpg** | 0.29.0 | `database.py` | Driver nativo async; consultas SQL directas, rendimiento y control de transacciones sin overhead ORM |
| **pydantic** | 2.9.0 | Routers (modelos request/response) | Validación estricta de entrada (EmailStr, UUID, límites numéricos) antes de tocar la BD |
| **pydantic-settings** | 2.5.2 | `config.py` | Configuración tipada desde `.env` (`DATABASE_URL`, `SECRET_KEY_AUTH`, `ALLOWED_ORIGINS`, `ENVIRONMENT`) |
| **python-jose** | 3.3.0 | `auth/jwt_handler.py` | JWT HS256; `jwt.encode` / `jwt.decode` con `SECRET_KEY_AUTH` |
| **passlib + bcrypt** | 1.7.4 / 4.0.1 | `auth.py`, `admin_usuarios` | Hash de contraseñas; shim `bcrypt.__about__ = bcrypt` en `main.py` **antes** de importar passlib (compatibilidad 4.x) |
| **slowapi** | 0.1.9 | `main.py` | Rate limiting por IP (`get_remote_address`); mitigación fuerza bruta en login |
| **python-multipart** | 0.0.9 | Uploads si aplica | Soporte formularios multipart en FastAPI |
| **email-validator** | 2.2.0 | Pydantic `EmailStr` | Validación de emails en alta de usuarios |
| **reportlab** | 4.0.8 | `services/pdf_*.py` | PDFs server-side (nóminas, inventario, cierre, BCG) sin depender del navegador |
| **groq** | ≥0.11.0 | `proveedores_shared.py` | Cliente oficial API Groq; visión para OCR de facturas (`asyncio.to_thread` en escaneo) |
| **qrcode + Pillow** | 7.4.2 / 10.3.0 | Generación QR en reportes si aplica | Tickets / códigos en PDF |
| **starlette** | (transitivo FastAPI) | `SecurityHeadersMiddleware`, CORS | Middleware estándar ASGI |

**Decisiones backend explícitas en código:**

- **`redirect_slashes=False`** en `FastAPI(...)`: evita HTTP 307 cuando Axios llama `/api/mesas` sin barra final (BUG-005 histórico).
- **`get_db()`** con `async with conn.transaction()`: commit/rollback automático por request lógico.
- **`statement_cache_size=0`** en `create_pool`: requisito documentado en `database.py` para Supabase pooler.
- **`Decimal`** en cálculos de dinero (Verifactu, recetas, TPV); prohibición de `float` en lógica de negocio (`.cursorrules`).
- **OpenAPI desactivado en prod:** `docs_url=None`, `redoc_url=None` si `ENVIRONMENT=production`.

#### Frontend — SPA operativa

| Componente | Versión en repo | Ubicación / uso | Justificación en producción |
|------------|-----------------|-----------------|------------------------------|
| **React** | 19.2.4 | `main.jsx`, páginas | UI por componentes; StrictMode en arranque |
| **Vite** | 8.0.1 | `vite.config.js` | Build rápido, HMR en dev, proxy `/api` → `localhost:8000` |
| **@vitejs/plugin-react** | 6.0.1 | Vite plugins | Fast Refresh |
| **Tailwind CSS** | 4.2.2 | `index.css`, `@tailwindcss/vite` | Utility-first; tema `dark:` coherente; clase `.horeca-body-text` para tablas en modo oscuro |
| **react-router-dom** | 7.13.1 | `App.jsx` | Rutas anidadas, guards (`PrivateRoute`, `AdminDirectorRoute`, …), layouts separados superadmin/TPV/KDS |
| **Axios** | 1.13.6 | `services/api.js` | Cliente HTTP único; interceptores token y 401 → `/login`; `resolveApiBaseUrl()` para `VITE_API_URL` en Vercel |
| **lucide-react** | 0.577.0 | `navConfig.js`, páginas | Iconografía SVG consistente (`strokeWidth={1.5}`); sin emojis como iconos de UI |

**No presentes en `package.json` (no asumir en documentación):** framer-motion, Redux, TanStack Query, Next.js, TypeScript en frontend.

#### Base de datos

| Componente | Detalle | Justificación |
|------------|---------|---------------|
| **PostgreSQL 15** | Esquema `public`, 42 tablas | JSONB en `platform_logs.detalle`, `numeric` para dinero, UUID PKs |
| **Supabase** | Hosting gestionado + SQL Editor | Backups, pooler, migraciones manuales desde `backend/sql/` |
| **Migraciones** | Archivos `.sql` versionados, no Alembic | El equipo aplica DDL explícito; trazabilidad en git (`migration_fase_b.sql`, `migration_kds_barra_destino.sql`, etc.) |

#### Infraestructura y despliegue

| Componente | Rol | Configuración real |
|------------|-----|-------------------|
| **Render** | Backend API | `Root Directory: backend`, `gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker`, health `GET /api/health` |
| **Vercel** | Frontend estático | `VITE_API_URL=https://<backend>.onrender.com/api` |
| **Variables críticas** | Seguridad | `SECRET_KEY_AUTH`, `ALLOWED_ORIGINS` (lista, no `*` con credentials), `DATABASE_URL` pooler, `GROQ_API_KEY`, `ENVIRONMENT=production` |

### Registro de aplicación (`main.py`) — piezas transversales

El fichero `backend/main.py` es el **único punto de ensamblaje** de la API:

1. Shim bcrypt → imports de ~30 routers.
2. `Limiter` + `SlowAPIMiddleware` + handler `RateLimitExceeded`.
3. `create_app()`: CORS desde `settings.allowed_origins_list`, `SecurityHeadersMiddleware` (X-Frame-Options DENY, nosniff, etc.).
4. Handler global `Exception` → JSON 500 genérico; re-lanza `HTTPException`.
5. `lifespan` → `init_connection_pool` / `close_connection_pool`.
6. **38 llamadas** `app.include_router(...)` — algunas con `prefix="/api"` adicional porque el sub-router ya define `/inventario`, `/kds`, etc.
7. `GET /api/health` → `SELECT 1` vía `get_db()`.

### Contrato API — prefijos efectivos (muestra representativa)

| Módulo | Prefijo router | Prefijo en `main` | URL efectiva ejemplo |
|--------|----------------|-------------------|----------------------|
| Auth | `/api/auth` | — | `POST /api/auth/login` |
| Mesas | `/api/mesas` | — | `GET /api/mesas` |
| TPV | `/api/tpv` | — | `POST /api/tpv/tickets` |
| Cobro / pagos | `/api/tpv` | — | `POST /api/tpv/tickets/{id}/pagos` |
| Verifactu | `/api/verifactu` | — | `GET /api/verifactu/registros` |
| Inventario | `/inventario` | `/api` | `GET /api/inventario/articulos` |
| KDS | `/kds` | `/api` | `GET /api/kds/comandas` |
| Dashboard | `/api/dashboard` | — | `GET /api/dashboard/director` |
| Analytics | `/dashboard` (interno) | `/api` | `GET /api/dashboard/rentabilidad-mesas` |
| Superadmin | `/api/superadmin` | — | `GET /api/superadmin/tenants` |
| Admin usuarios | `/api/admin` | — | `GET /api/admin/usuarios` |

---

## 📂 Estructura real del proyecto

Árbol generado del repositorio en disco (excluye `node_modules`, `__pycache__`, `.git`, `.venv`). Las carpetas con muchos artefactos de seed/MCP en `backend/sql/` se listan agrupadas.

```
HorecaSO/
├── backend/
│   ├── auth/
│   ├── routers/
│   │   ├── admin_carta/
│   │   ├── admin_usuarios/
│   │   ├── analytics/
│   │   ├── clientes/
│   │   ├── costes/
│   │   ├── empleados/
│   │   ├── fifo/
│   │   ├── inventario/
│   │   ├── kds/
│   │   ├── proveedores/
│   │   ├── recetas/
│   │   ├── reportes/
│   │   ├── reservas/
│   │   ├── superadmin/
│   │   └── tpv/
│   ├── scripts/
│   ├── services/
│   ├── sql/
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
├── docs/
└── [documentación raíz: PRD, SCHEMA, GUIA, BITACORA, …]
```

### Raíz del monorepo

| Elemento | Responsabilidad |
|----------|-----------------|
| `.cursorrules` | Convenciones obligatorias del equipo (Decimal, SQL, Tailwind, roles, Verifactu) |
| `PRD_HorecaSO.md` | Especificación de producto y schema SQL de referencia |
| `SCHEMA_BASE_DATOS.md` | Volcado de 42 tablas Supabase (columnas, FKs) |
| `ARQUITECTURA_HORECASO.md` | Mapa routers ↔ frontend |
| `GUIA_PRODUCCION_COMPLETA.md` | Deploy Render/Vercel, seguridad, tenants, Anexo A Fase B |
| `BITACORA_HORECASO.md` / `BUGS_Y_SOLUCIONES.md` | Estado real del código e historial de fixes |
| `STEP_HORECASO.md` | State of the project por módulo |

---

### `backend/` — API y persistencia

#### `backend/main.py`

Factory de aplicación FastAPI: ensambla middlewares, registra todos los routers, expone `/` (metadatos app) y `/api/health`. Es el artefacto que importa Gunicorn (`main:app`).

#### `backend/config.py`

Clase `Settings` (pydantic-settings): lee `.env`. Campos obligatorios `DATABASE_URL`, `SECRET_KEY_AUTH`; opcionales `ALLOWED_ORIGINS` (CSV), `ENVIRONMENT`, `GROQ_API_KEY` (con fallback `os.getenv`), `ACCESS_TOKEN_EXPIRE_MINUTES` (default 1440). Propiedad `allowed_origins_list` alimenta CORS.

#### `backend/database.py`

Pool global asyncpg (`min_size=2`, `max_size=10`, `command_timeout=60`, `statement_cache_size=0`). Context manager `get_db()` adquiere conexión, abre transacción, hace yield, commit o rollback.

#### `backend/auth/`

| Archivo | Responsabilidad exacta |
|---------|------------------------|
| `jwt_handler.py` | `create_access_token`, `verify_token`; normalización `tenant_id`/`negocio_id` null para `role==superadmin` |
| `dependencies.py` | `HTTPBearer` → `get_current_user`; factories `require_roles`, alias `require_superadmin` |
| `schemas.py` | `LoginRequest`, `TokenResponse` (contratos Pydantic del login) |

#### `backend/routers/` — dominios HTTP (84 ficheros `.py`)

Patrón recurrente: **orquestador** (`*.py` en raíz o paquete) define `APIRouter` con `prefix`, importa submódulos `*_list`, `*_mutations`, `*_shared` y hace `include_router` interno.

| Ruta / paquete | Archivos clave | Qué hace en código |
|----------------|----------------|-------------------|
| **`auth.py`** | Único | `POST /api/auth/login` (bcrypt + JWT), `GET /api/auth/perfil` (incluye subquery `empleado_id` para fichaje automático) |
| **`mesas.py`** + `mesas_list.py` + `mesas_mutations.py` + `mesas_shared.py` | Orquestador monta listado (`list_mesas_handler` con `ROLES_LISTADO_OPERATIVO`), CRUD, `PATCH …/estado` |
| **`tpv/`** | `tpv.py` orquesta `tpv_tickets_create`, `tpv_tickets_list`, `tpv_tickets_detalle`, `tpv_lineas` | Ciclo de vida del ticket y líneas bajo `/api/tpv` |
| | `tpv_pagos.py` | División de cuenta: `ticket_pagos` |
| | `tpv_cobro.py`, `tpv_cobrar.py` | Cobro simple y cierre; invoca `verifactu_engine.crear_registro_verifactu` en transacción |
| | `tpv_shared.py` | Helpers compartidos (totales, estados mesa, KDS al cobrar) |
| **`verifactu.py`** | | Listado registros, verificar cadena, export CSV; delega huella a `services/verifactu_engine.py` |
| **`carta.py`** | `router_tpv` + `router_publica` | Carta agrupada para TPV (`/api/tpv/...`) y carta pública (`/api/carta`) |
| **`admin_carta/`** | `admin_carta.py`, `admin_productos.py`, `admin_carta_shared.py` | CRUD categorías/productos, alérgenos, campo `destino_kds`, saneo emoji |
| **`recetas/`** | `admin_recetas.py`, `admin_recetas_ingredientes.py`, `admin_recetas_shared.py`, **`recetas_unidades.py`** | CRUD recetas, ingredientes, semáforo margen, conversión kg/g/l/ml, coste con calibración |
| **`costes/`** | `admin_gastos_operativos.py` | `GET/POST/DELETE /api/admin/gastos-operativos` — tabla `gastos_operativos` |
| **`inventario/`** | `inventario.py` → `inventario_articulos_list`, `inventario_articulos_mutations` | Artículos, stock, `PUT …/calibracion-merma` |
| | `inventario_movimientos.py` + `*_core`, `*_alertas`, `*_schemas` | Movimientos, alertas caducidad, inventario físico |
| | `inventario_shared.py` | `_articulo_to_dict` con `coste_unitario_efectivo`, `merma_calibracion_porcentaje` |
| **`kds/`** | `kds.py`, `kds_estados.py`, `kds_shared.py` | `GET /api/kds/comandas` filtrado por rol y `destino_kds`; PATCH estados cocina/barra; parámetro `incluir_servidos` |
| **`dashboard.py`** | | KPIs director, cierre día — alimenta `DashboardPage` y venta live |
| **`analytics/`** | `analytics_mesas.py`, `analytics_menu.py`, `analytics_personal.py`, `analytics_shared.py` | Endpoints bajo `/api/dashboard/…` (rentabilidad mesas, ingeniería menú BCG, coste personal) |
| **`proveedores/`** | `proveedores.py` → list/mutations | CRUD proveedores |
| | `facturas_proveedor*.py`, **`facturas_proveedor_escaneo.py`** | Facturas compra; `POST /facturas-proveedor/escanear-ia` → Groq |
| **`empleados/`** | `empleados.py`, `fichajes.py`, `cuadrantes.py`, `ausencias.py` | RRHH; prefijos `/empleados`, `/turnos`, `/cuadrantes`, `/ausencias` montados con `prefix="/api"` en main |
| **`nominas.py`** | | Cálculo nómina SS/IRPF, rutas bajo `/api/nominas` |
| **`reservas/`** | `reservas.py` → `reservas_read`, `reservas_write`, `lista_espera.py` | Reservas + lista de espera |
| **`clientes/`** | `clientes.py`, `clientes_historial.py` | CRM, historial tickets, puntos fidelidad |
| **`appcc.py`** | | Registros APPCC temperaturas |
| **`fifo/`** | `fifo.py`, `fifo_consumo.py`, `fifo_shared.py` | Lotes FIFO, consumos, valoración |
| **`reportes/`** | `reportes.py`, `reportes_dif_*.py` | Endpoints PDF; registran handlers que llaman `services/pdf_*` |
| **`admin_usuarios/`** | `admin_usuarios_router.py` | Gestión usuarios del tenant; `require_roles(['admin'])` |
| **`superadmin/`** | `superadmin_router.py` | Tenants paginados, detalle, `PATCH …/activo`, `platform_logs` |

#### `backend/services/` — lógica no HTTP reutilizable

| Archivo | Invocado desde | Función |
|---------|----------------|---------|
| `verifactu_engine.py` | `tpv_cobro`, `verifactu.py` | `generar_huella` (SHA-256 HAC), `generar_numero_serie`, `crear_registro_verifactu` |
| `pdf_nomina.py` | `reportes.py` | PDF nómina |
| `pdf_inventario.py` | reportes | PDF inventario |
| `pdf_reportes.py` | reportes | Cierre caja, ventas periodo |
| `pdf_diferenciales.py`, `pdf_diferenciales_2.py`, `pdf_diferenciales_bcg.py`, `pdf_diferenciales_shared.py` | `reportes_dif_*` | Cuadrante, rentabilidad platos, APPCC, comparativa proveedores |
| `pdf_generator.py` | Utilidades base PDF | |

#### `backend/sql/`

Migraciones y seeds **manuales** (no hay runner automático en el arranque de la app):

| Archivo | Propósito |
|---------|-----------|
| `migration_kds_barra_destino.sql` | `productos.destino_kds`, columnas barra en `ticket_lineas`, rol `barra` |
| `migration_fase_b.sql` | Superadmin, `platform_logs`, `tenant_audit_log`, `usuario_permisos`, seed tenant prueba |
| `migration_gastos_operativos.sql` | Tabla gastos fijos mensuales |
| `migration_articulos_calibracion_merma.sql` | Columnas calibración en `articulos` |
| `migration_articulos_elaborados_receta.sql` | Elaboraciones |
| `seed_demo_tenant_prueba_abcd.sql`, `seed_despensa_articulos_prueba.sql` | Datos demo |
| `_seed_split_*.sql`, `_mcp_*.json` | Artefactos de ejecución batch vía MCP/shell (desarrollo) |

#### `backend/scripts/`

| Script | Función |
|--------|---------|
| `generate_test_hashes.py` | Genera hashes bcrypt para pegar en `migration_fase_b.sql` |
| `schema_mcp_json_to_markdown.py` | Regenera `SCHEMA_BASE_DATOS.md` desde volcado MCP |
| `apply_seed_shell_batches.py`, `generate_seed_despensa_articulos.py` | Automatización de seeds |

---

### `frontend/` — SPA React

#### `frontend/vite.config.js`

Plugins `@vitejs/plugin-react` y `@tailwindcss/vite`. **Proxy dev y preview:** `/api` → `http://localhost:8000` (evita CORS en local; en Vercel se usa `VITE_API_URL` absoluta).

#### `frontend/src/main.jsx`

Monta `<App />` en `#root` con `StrictMode`; import global `index.css` (Tailwind 4 + tokens tema).

#### `frontend/src/App.jsx`

**Árbol de rutas completo** (~290 líneas): envuelve con `ThemeProvider` → `AuthProvider` → `BrowserRouter`.

| Grupo de rutas | Guard | Páginas |
|----------------|-------|---------|
| `/login` | Público | `LoginPage` |
| `/superadmin/*` | `PrivateRoute` + `allowedRoles: ['superadmin']` | `SuperadminLayout` → `TenantsListPage`, `TenantDetailPage`, `PlatformLogsPage` |
| `/kds` | Roles cocina, barra, sala, admin, director, camarero, jefe_sala | `KDSPage` — **sin** `AppLayout` |
| `/tpv/:mesaId` | Autenticado | `TPVPage` — pantalla completa |
| Grupo `AppLayout` | `PrivateRoute` (+ guards por módulo) | Mesas, dashboard, inventario, admin, RRHH, etc. |

Guards definidos en el mismo archivo: `AdminDirectorRoute`, `AdminDirectorJefeSalaRoute`, `AdminDirectorCocinaRoute`, `InventarioRoute`, `ProveedoresRoute`, `AdminOnlyRoute` (solo `/admin/usuarios`).

#### `frontend/src/context/`

| Archivo | Responsabilidad |
|---------|-----------------|
| `AuthContext.jsx` | Estado `user`, `token`, `isAuthenticated`; `login()` → API + `getPerfil()`; opcional `POST /turnos/fichaje-entrada` si `empleado_id` y rol en `ROLES_FICHAJE_AUTO`; persistencia `localStorage` |
| `ThemeContext.jsx` | Tema claro/oscuro (`horecaso_theme` en `localStorage`), clase `dark` en `<html>` |

#### `frontend/src/services/api.js`

Cliente Axios único (~400 líneas): `resolveApiBaseUrl()`, interceptores, funciones nombradas por dominio (`getMesas`, `createTicket`, `getSuperadminTenants`, `getAdminUsuarios`, `putArticuloCalibracionMerma`, `getKDSComandas`, etc.). **Contrato:** todas las rutas son relativas a base `/api` (p. ej. `api.get('/mesas')` → `/api/mesas`).

#### `frontend/src/components/`

| Ruta | Responsabilidad |
|------|-----------------|
| `layout/AppLayout.jsx` | Shell con sidebar fijo `ml-64`, outlet hijas |
| `layout/Sidebar.jsx` + `SidebarNav.jsx` | Si `user.rol === 'superadmin'` renderiza solo `SUPERADMIN_NAV_ITEMS`; si no, `NAV_ITEMS` filtrados por rol |
| `layout/constants/navConfig.js` | Fuente de verdad de menú: rutas, iconos lucide, array `roles` permitidos |
| `shared/Loader.jsx`, `EmptyState.jsx`, `StatCard.jsx` | UI transversal |

#### `frontend/src/pages/` — pantallas por dominio (111 ficheros `.jsx`)

| Carpeta | Página raíz | Hooks / componentes notables |
|---------|-------------|------------------------------|
| `sala/` | `MesasPage.jsx` | `MesaCard`, `useMesasSala`, `patchMesaEstado` |
| `tpv/` | `TPVPage.jsx` | `useTicketTPV`, `CobroModal`, `CobroDivisionForm`, `CartaPanel`, `TpvMesaOcupadaAlert` |
| `cocina/` | `KDSPage.jsx` | `useKdsComandas`, `KdsTicketCard`, `KdsColumnaEstado`, `kdsHelpers.js` |
| `director/` | `DashboardPage.jsx`, `VentaLivePage.jsx` | `useDashboard`, `useVentaLivePolling` (30 s) |
| `admin/carta/` | `CartaPage.jsx` | `useCarta`, `ProductosPanel`, `CategoriasPanel`, modales alérgenos |
| `admin/recetas/` | `RecetasPage.jsx`, `ElaboracionesPage.jsx` | `useRecetas`, `RecetaDetalleIngredientesSection`, `CosteSemaforo`, `recetasUtils.js` |
| `admin/costes/` | `CostesPage.jsx` | Resumen semáforo + gastos operativos API |
| `admin/sala/` | `GestionSalaPage.jsx` | CRUD mesas admin, `useMesasAdmin` |
| `admin/usuarios/` | `UsuariosPage.jsx` | Tabla + modales crear/editar → `/api/admin/usuarios` |
| `inventario/` | `InventarioPage.jsx`, `MermasPage.jsx`, `APPCCPage.jsx`, `FIFOPage.jsx` | `useInventarioData`, `CalibracionMermaPanel`, `useFIFO`, `useAPPCC` |
| `proveedores/` | `ProveedoresPage.jsx`, `FacturasPage.jsx` | `EscaneoIAModal`, `useFacturas`, Groq |
| `empleados/` | `EmpleadosPage`, `FichajesPage`, `CuadrantePage`, `NominasPage` | `useFichajes`, toggle fichar al login, `NominasList` |
| `reservas/` | `ReservasPage.jsx` | Tabs reservas / lista espera |
| `clientes/` | `ClientesPage.jsx` | `HistorialPanel`, `PuntosPanel` |
| `analytics/` | `AnalyticsPage.jsx` | `RentabilidadMesasPanel`, `IngenieriaMenuPanel`, `CostPersonalPanel` |
| `reportes/` | `ReportesPage.jsx` | Tabs PDF, `utilsPdf.js` (blob download) |
| `superadmin/` | `TenantsListPage`, `TenantDetailPage`, `PlatformLogsPage` | `SuperadminLayout`, PATCH activo tenant |

#### `frontend/src/utils/`

| Archivo | Uso |
|---------|-----|
| `textSanitize.js` | `stripEmojis` — carta y tabs TPV |
| `pagos.js` | Helpers métodos de pago en cobro |

---

### `docs/`

Índice de documentación (`docs/README.md`); histórico en `docs/archivo/` si existe.

---

# PARTE 2 — Seguridad, ingeniería de producción y escala

Documento anexo a la Parte 1. Fuentes: código en disco, `GUIA_PRODUCCION_COMPLETA.md` v1.2.0, `BUGS_Y_SOLUCIONES.md`, `BITACORA_HORECASO.md`, `PRD_SUPERADMIN_TENANTS_PRUEBAS.md` (redirección a Anexo A de la guía).

---

## 🔐 Seguridad Operativa y Aislamiento Multi-tenant

HorecaSO no implementa bases de datos por cliente ni esquemas PostgreSQL separados. El aislamiento es **lógico**: una sola instancia de aplicación, un pool asyncpg compartido, y **cada consulta de negocio acota el alcance** mediante el identificador de tenant (y, cuando aplica, de outlet) derivado del JWT o re-leído desde `usuarios` en la misma transacción.

### Flujo del contexto de seguridad en una petición

```
Cliente (Axios + Bearer)
    → FastAPI: SlowAPIMiddleware (rate limit global)
    → CORS (ALLOWED_ORIGINS)
    → SecurityHeadersMiddleware (cabeceras en respuesta)
    → HTTPBearer → verify_token (jose) → dict current_user
    → require_roles([...]) o require_superadmin
    → get_db() → asyncpg con placeholders $1, $2, …
    → SQL filtrado por tenant_id / outlet_id
```

El JWT **no sustituye** la validación en base de datos en operaciones sensibles (p. ej. comprobar que un `usuario_id` del path pertenece al mismo `tenant_id` que el token), pero sí define el **ámbito por defecto** de todos los listados y mutaciones.

### Aislamiento por `tenant_id` y `outlet_id` en SQL (asyncpg)

#### Origen del tenant en el token

Tras `POST /api/auth/login`, el claim operativo para restaurantes es **`negocio_id`** (UUID del `usuarios.tenant_id`). El rol `superadmin` recibe además `tenant_id: null` y `negocio_id: null` en el payload (`backend/routers/auth.py`).

Los routers no confían en que el cliente envíe `tenant_id` en el body para filtrar: lo extraen de `current_user`.

#### Patrón A — Tenant directo en tablas con `tenant_id`

Entidades maestras del restaurante llevan columna `tenant_id`: `productos`, `articulos`, `clientes`, `empleados`, `proveedores`, `categorias_menu`, etc.

Ejemplo real en `backend/routers/clientes/clientes.py` (listado con búsqueda dinámica):

```python
conds = ["tenant_id = $1"]
args = [tenant_id]
if buscar:
    args.append(f"%{buscar}%")
    conds.append(f"nombre ILIKE ${len(args)}")
sql = "SELECT * FROM clientes WHERE " + " AND ".join(conds)
rows = await conn.fetch(sql, *args)
```

Las cláusulas `WHERE` se **concatenan**; los valores van **siempre** en `args` con numeración `$n`. Esto es la convención obligatoria del proyecto (prohibidos f-strings con datos de usuario).

En **`admin_usuarios_router.py`**, el listado de usuarios del tenant es explícito:

```sql
SELECT id, nombre, email, rol, outlet_id, activo, created_at
FROM usuarios
WHERE tenant_id = $1
  AND rol <> 'superadmin'
ORDER BY nombre ASC
```

El parámetro `$1` es `tenant_id` obtenido de `_tenant_uuid_from_jwt(current_user)`, que lee `negocio_id` o `tenant_id` del JWT y devuelve **403** si ambos faltan (caso incompatible con admin de restaurante).

#### Patrón B — Tenant vía JOIN con `outlets`

Operación diaria (mesas, tickets abiertos, KDS) cuelga de `outlet_id`, pero el acotado al restaurante pasa por `outlets.tenant_id`.

**Mesas** (`mesas_list.py` → `_get_user_tenant_outlet` en `mesas_shared.py`):

1. Se lee `tenant_id` y `outlet_id` de `usuarios` con el `sub` del JWT.
2. Si el usuario tiene **`outlet_id`** (camarero, cocina acotada al local): solo mesas de ese outlet.
3. Si **no** tiene outlet (típico admin/director): todas las mesas del tenant:

```sql
SELECT m.* FROM mesas m
JOIN outlets o ON m.outlet_id = o.id
WHERE o.tenant_id = $1
ORDER BY m.numero
```

**Tickets abiertos** (`tpv_tickets_list.py`): misma bifurcación — por `outlet_id` del usuario o, si es null, `JOIN outlets` con `o.tenant_id = $1`.

**KDS** (`kds.py`): el outlet se resuelve en `kds_shared._get_user_outlet`; la query base incluye `WHERE t.outlet_id = $1 AND t.estado = 'abierto'`, de modo que un ticket cobrado **desaparece** del listado de cocina (ver BUG-003 en sección de bugs).

#### Patrón C — Tenant vía empleado / nómina

**Nóminas** (`nominas.py`): helper `_tenant_id(current_user)` exige `negocio_id` en el JWT; cada operación valida que el `empleado_id` pertenece al tenant:

```sql
SELECT 1 FROM empleados WHERE id = $1 AND tenant_id = $2
```

Y al leer una nómina:

```sql
WHERE n.id = $1 AND e.tenant_id = $2
```

Un token de otro restaurante no puede leer nóminas ajenas aunque conozca el UUID de la fila.

#### Patrón D — Re-lectura de tenant desde BD (analytics)

En `analytics_shared.py`, `_tenant_id_usuario(conn, user_id)` hace `SELECT tenant_id FROM usuarios WHERE id = $1` en lugar de confiar solo en el claim del JWT. Esto alinea analytics con el estado actual del usuario en BD (útil si hubiera cambios de asignación; también falla con **400** si el usuario no tiene tenant — coherente con superadmin que no debe usar rutas de restaurante).

`_outlet_id_usuario` exige outlet asignado para métricas que dependen del local.

#### Patrón E — Plataforma sin filtro tenant (superadmin)

`superadmin_router.py` ejecuta `SELECT … FROM tenants` **sin** `WHERE tenant_id = $jwt`, porque el actor es operador de plataforma. Los endpoints de negocio (`/api/mesas`, `/api/inventario/...`) deben seguir fallando para ese rol por falta de `negocio_id` o por `require_roles` que no incluye `superadmin`.

#### Anti-IDOR en recursos por UUID

Algunos `GET /{id}` históricos (p. ej. detalle de mesa en `mesas_list.get_mesa`) consultan solo por `id`. La guía de producción (ATAQUE 4) exige que, en auditoría, **toda** lectura/mutación por UUID valide pertenencia al tenant del JWT. El patrón correcto — ya usado en nóminas, clientes PATCH, admin usuarios — es:

```sql
WHERE id = $1 AND tenant_id = $2
```

### Transacciones y concurrencia (`get_db`)

`database.py` envuelve cada uso del pool en:

```python
async with conn.transaction():
    yield conn
```

Cobro TPV + Verifactu + actualización de mesa comparten la misma transacción cuando el handler usa un único `async with get_db()`. Si `crear_registro_verifactu` falla, el rollback revierte el cobro — requisito fiscal del producto.

El pool usa `min_size=2`, `max_size=10`, `command_timeout=60`. En Supabase producción la URL apunta al **pooler** (`:6543`).

### RBAC: factoría `require_roles` y rutas críticas

Implementación en `backend/auth/dependencies.py`:

```python
def require_roles(allowed_roles: list[str]):
    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        role = current_user.get("role")
        if role not in allowed_roles:
            raise HTTPException(status_code=403, detail="No autorizado para esta operación")
        return current_user
    return _check

require_superadmin = require_roles(["superadmin"])
```

`get_current_user` usa `HTTPBearer`: sin header → 401; token inválido o expirado → 401 con log `"Token inválido o expirado"`.

#### Matriz: rol vs rutas sensibles (comportamiento real del código)

| Ruta / dominio | Roles permitidos (backend) | Roles **sin** acceso (ejemplos) |
|----------------|----------------------------|----------------------------------|
| `/api/superadmin/*` | Solo `superadmin` (`require_superadmin`) | `admin`, `director`, `camarero`, `cocina`, `barra`, `almacen` → **403** |
| `/api/admin/usuarios` | Solo `admin` (`require_roles(['admin'])`) | `director`, `camarero`, … → **403** |
| `/api/nominas/*` | `ROLES_RRHH = ["admin", "director"]` | `camarero`, `jefe_sala`, `cocina`, `barra`, `almacen` → **403** |
| `/api/dashboard/rentabilidad-mesas`, ingeniería menú, coste personal | `ROLES_ANALYTICS = ["admin", "director"]` | Resto de roles operativos → **403** |
| `/api/mesas` (listado) | `ROLES_LISTADO_OPERATIVO` (8 roles incl. camarero, cocina, barra, almacen) | `superadmin` (sin tenant en práctica) → fallo de contexto o lista vacía/403 en otros endpoints |
| `/api/kds/comandas` | `ROLES_KDS_LECTURA` en `kds_shared` | Roles no incluidos → **403** |
| Facturas escaneo IA | `ROLES_ADMIN_ALMACEN` en proveedores | Camarero → **403** |

**Ejemplo explícito — camarero y nóminas:**

Un usuario con `role: "camarero"` obtiene JWT válido. Cualquier `GET` o `POST` a `/api/nominas/...` monta `Depends(require_roles(ROLES_RRHH))` con `ROLES_RRHH = ["admin", "director"]` → respuesta **403** `"No autorizado para esta operación"`. El frontend puede ocultar el menú (`navConfig.js`), pero la autoridad es el backend.

**Ejemplo explícito — admin de tenant y superadmin:**

`GET /api/superadmin/tenants` con token de `admin@prueba.com` → `require_superadmin` → **403**. Inversamente, token `superadmin` en `GET /api/mesas`: el listado intenta resolver tenant/outlet desde `usuarios` para ese `sub`; sin tenant asignado → **403** `"Usuario sin tenant asignado"` (comportamiento documentado en guía §2.3 PRUEBA 4).

#### Frontend: guards complementarios (no sustitutivos)

`App.jsx` define `PrivateRoute`, `AdminOnlyRoute`, `AdminDirectorRoute`, etc. Un usuario sin rol adecuado es redirigido a `/mesas`. Esto **no** reemplaza el RBAC del API: un cliente malicioso puede llamar al backend directamente.

`SidebarNav.jsx`: si `user.rol === 'superadmin'`, solo renderiza `SUPERADMIN_NAV_ITEMS` (Tenants, Logs) — no ve Sala, TPV ni Inventario del restaurante.

### SlowAPI y fuerza bruta en login

En `main.py`:

```python
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
```

- **Clave de límite:** IP remota (`get_remote_address`).
- **Alcance actual:** middleware global SlowAPI; en el código del repo **no** hay decoradores `@limiter.limit("5/minute")` en `auth.py` todavía.
- **Implicación operativa:** la infraestructura está montada; la guía de producción (§2.3 PRUEBA 5) espera respuestas **429** tras intentos repetidos de login fallido. Si todos los intentos devuelven solo **401**, conviene añadir rate limit explícito en `POST /api/auth/login` (ítem checklist §1.1 ítem 18).

### Cabeceras de seguridad (Starlette)

`SecurityHeadersMiddleware` en `main.py` añade en **cada respuesta**:

| Cabecera | Valor | Efecto |
|----------|-------|--------|
| `X-Content-Type-Options` | `nosniff` | Reduce MIME sniffing |
| `X-Frame-Options` | `DENY` | Impide embedding en iframes (clickjacking) |
| `X-XSS-Protection` | `1; mode=block` | Filtro XSS legacy en navegadores |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita fuga de URL en Referer |
| `Permissions-Policy` | `geolocation=(), microphone=()` | Deshabilita APIs de sensor por defecto |

### CORS y superficie de documentación

`CORSMiddleware` usa `settings.allowed_origins_list` desde `ALLOWED_ORIGINS` (CSV en `.env`). Si la lista está vacía, el código cae a `origins = ["*"]` con `allow_credentials=False` — en producción debe configurarse la URL exacta de Vercel.

Con `ENVIRONMENT=production`, `create_app()` fija `docs_url=None` y `redoc_url=None` → **404** en `/docs` y `/redoc`.

### Row Level Security (estado y recomendación)

`SCHEMA_BASE_DATOS.md` (volcado MCP 27/03/2026): **RLS desactivado** en las 42 tablas de `public`. El aislamiento depende del código Python. Antes de clientes reales, la guía recomienda políticas RLS por `tenant_id` como segunda línea de defensa si un endpoint regresara sin filtro por error humano.

### Referencia Fase B (superadmin / admin usuarios)

El contenido técnico unificado está en `GUIA_PRODUCCION_COMPLETA.md` **Anexo A** (sustituye a `PRD_SUPERADMIN_TENANTS_PRUEBAS.md`, que solo redirige). Checklist Anexo A.5: ningún endpoint superadmin sin `require_superadmin`; ningún `/api/admin/usuarios` sin filtro `tenant_id` del JWT; nunca devolver `password_hash`.

---

## 🛠️ Desafíos Técnicos y Solución de Errores Complejos

Registro autoritativo: `BUGS_Y_SOLUCIONES.md` (BUG-001 … BUG-013, MEJ-*) y `BITACORA_HORECASO.md` (verificaciones MCP 27/03/2026). A continuación, **tres incidentes críticos** de producción o pre-producción, cada uno con desglose obligatorio en tres apartados.

---

### Desafío 1 — Supabase pgbouncer y caché de sentencias preparadas en asyncpg

**Referencia:** Infraestructura documentada en `database.py`, `.cursorrules`, `STEP_HORECASO.md` (pooler `:6543`).

**1. El Síntoma**

- En entornos enlazados a Supabase vía **connection pooler** (`aws-1-eu-west-1.pooler.supabase.com:6543`), las peticiones a la API fallaban de forma **intermitente** bajo carga o tras despliegues en Render.
- Los logs de asyncpg/PostgreSQL podían mostrar errores relacionados con sentencias preparadas inválidas o desincronización entre la conexión lógica del cliente y la conexión física reasignada por pgbouncer.
- El fallo no era reproducible en un único `SELECT` local contra Postgres directo (puerto 5432), solo tras pasar por el pooler en modo transaction pooling.

**2. La Causa Raíz**

- Supabase expone PostgreSQL 15 a aplicaciones serverless/contenedores mediante **PgBouncer** en modo *transaction pooling*: una misma conexión TCP del pooler atiende transacciones de distintos clientes de forma secuencial.
- **asyncpg**, por defecto, habilita un **caché de sentencias preparadas** por conexión (`statement_cache_size` > 0) para reutilizar planes de ejecución.
- Cuando pgbouncer devuelve al pool una conexión de backend y la reasigna a otro cliente, el caché de prepared statements del lado asyncpg deja de corresponder con el estado real del servidor → errores impredecibles.
- Este comportamiento es independiente del multi-tenant: afecta a **todas** las consultas del pool compartido de HorecaSO.

**3. La Solución Implementada**

En `backend/database.py`, la creación del pool fija explícitamente `statement_cache_size=0`:

```python
_pool = await asyncpg.create_pool(
    settings.DATABASE_URL,
    min_size=2,
    max_size=10,
    command_timeout=60,
    statement_cache_size=0,  # Obligatorio para Supabase pgbouncer
)
```

**Variables de entorno asociadas:** `DATABASE_URL` en Render debe usar el host del **pooler** (puerto **6543**), no la conexión directa de sesión, coherente con `GUIA_PRODUCCION_COMPLETA.md` §1.2.

**Estado:** Condición obligatoria de producción; sin este parámetro el ERP no cumple el contrato de despliegue documentado en la bitácora.

---

### Desafío 2 — BUG-005 y BUG-007: HTTP 307 y 405 por trailing slash (FastAPI + Axios)

**Referencia:** `BUGS_Y_SOLUCIONES.md` sesión 24/03/2026; bitácora rápida en `mesas.py`, `empleados.py`, `reservas.py`, `clientes.py`, `fichajes.py`.

**1. El Síntoma**

- El frontend (`frontend/src/services/api.js`) invoca rutas **sin barra final**: `api.get('/mesas')`, `api.get('/empleados')`, equivalente a `GET /api/mesas` y `GET /api/empleados` con base URL `/api`.
- En la primera fase del incidente, el navegador/Axios recibía **307 Temporary Redirect** hacia la variante con barra (`/api/mesas/`). Las pantallas de Sala, RRHH o Reservas quedaban vacías o con errores de red según cómo el cliente seguía el redirect.
- Tras desactivar redirects en FastAPI, el síntoma mutó a **405 Method Not Allowed** en listados como `GET /api/empleados`, `GET /api/clientes`, `GET /api/cuadrantes`: la ruta existía solo como `GET /api/empleados/` en el registro interno de Starlette.

**2. La Causa Raíz**

- **Starlette/FastAPI** con `redirect_slashes=True` (valor por defecto histórico) normaliza paths añadiendo `/` final mediante redirect 307. Los clientes HTTP pueden cambiar el tratamiento del método en redirects (especialmente en combinación con CORS y preflight).
- Al fijar `redirect_slashes=False` (fix BUG-005), la coincidencia de ruta pasa a ser **literal**: solo el path registrado exactamente es válido.
- El refactor de routers en subpaquetes (`empleados/`, `clientes/`, `reservas/`) registraba handlers únicamente con `@router.get("/")` en sub-routers incluidos bajo prefijo `/empleados`. Esa ruta interna se monta como `/api/empleados/` pero **no** como `/api/empleados` sin barra → 405 (BUG-007).

**3. La Solución Implementada**

**Paso A — Desactivar redirects automáticos** en `backend/main.py`, función `create_app()`:

```python
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    redirect_slashes=False,
    docs_url=None if is_prod else "/docs",
    redoc_url=None if is_prod else "/redoc",
)
```

**Paso B — Registrar rutas duplicadas `""` y `"/"`** en handlers de listado. Ejemplo real en `backend/routers/empleados/empleados.py`:

```python
r_empleados = APIRouter(prefix="/empleados")

@r_empleados.get("", include_in_schema=False)
@r_empleados.get("/")
async def list_empleados(
    buscar: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    cargo: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(ROLES_RRHH)),
):
```

**Paso C — Orquestadores con prefijo en el router padre** (`mesas.py`, `reservas.py`): ruta `GET ""` que delega al mismo handler que `GET "/"`:

```python
@router.get("")
async def list_mesas_root(
    current_user: dict = Depends(require_roles(ROLES_LISTADO_OPERATIVO)),
):
    return await list_mesas_handler(current_user)
```

**Archivos corregidos (según bitácora):** `main.py`, `mesas.py`, `mesas_list.py`, `reservas.py`, `reservas_read.py`, `empleados.py`, `cuadrantes.py`, `clientes.py`, `fichajes.py`, `lista_espera.py`.

**Estado:** ✅ Cerrado en repo; el contrato HTTP queda alineado con Axios sin depender de redirects.

---

### Desafío 3 — BUG-003: cola KDS fantasma y coordinación transaccional en el cobro (TPV + cocina concurrente)

**Referencia:** BUG-003, MEJ-001 en `BUGS_Y_SOLUCIONES.md`; migración `backend/sql/migration_kds_barra_destino.sql`; `BITACORA_HORECASO.md` §8 (25/03/2026).

#### 1. El Síntoma

- Tras **cobrar** un ticket en TPV, las líneas seguían apareciendo en `KDSPage` (polling a `GET /api/kds/comandas`) como si el servicio de cocina o barra siguiera activo.
- Cocina mostraba **bebidas** sin elaborar en cocina; barra mostraba **platos** de cocina — un solo flujo KDS para todo el menú.
- En horas punta, cocina y TPV operan **concurrentemente** sobre las mismas filas (`ticket_lineas`, `tickets`): el usuario percibía desincronización entre “ya cobrado en caja” y “sigue en pantalla de cocina”.

**2. La Causa Raíz**

- **Query KDS incompleta:** el listado no restringía `tickets.estado = 'abierto'`, por lo que tickets ya cobrados seguían alimentando la query si las líneas no tenían estado terminal.
- **Sin partición cocina/barra:** todos los productos se trataban como envío a cocina; no existía `productos.destino_kds` ni columnas `estado_barra` / `enviado_barra` en `ticket_lineas` hasta aplicar la migración SQL.
- **Cobro sin cierre de línea KDS:** el handler de cobro actualizaba `tickets` y `mesas`, pero no forzaba `estado_cocina` / `estado_barra` a `servido` en líneas ya enviadas.
- **Concurrencia:** el cobro y el polling KDS son transacciones independientes en el pool asyncpg; sin actualización atómica en el mismo `async with get_db()` del cobro, el KDS podía leer estado intermedio entre commits.

**3. La Solución Implementada**

**A. Migración SQL** (`migration_kds_barra_destino.sql`): columna `productos.destino_kds` (`cocina` | `barra` | `ninguno`), columnas de línea para barra, rol `barra` en `usuarios.rol`.

**B. Filtro en lectura KDS** — fragmento de `_SQL_COMANDAS_BASE` en `backend/routers/kds/kds.py`:

```sql
FROM ticket_lineas tl
JOIN tickets t ON tl.ticket_id = t.id
JOIN productos p ON tl.producto_id = p.id
WHERE t.outlet_id = $1
  AND t.estado = 'abierto'
  AND COALESCE(p.destino_kds, 'cocina') <> 'ninguno'
```

Filtrado adicional por **rol** en `kds_shared._resolve_vista`: cocina solo ve `destino_kds = 'cocina'`; barra solo `barra`; sala/admin/director ven vista `completa`.

**C. Cierre de líneas en la misma transacción del cobro** — `backend/routers/tpv/tpv_cobrar.py` documenta: *“Todo en la misma transacción.”* Dentro del único `async with get_db() as conn:`:

```python
await conn.execute(
    """
    UPDATE tickets
    SET estado = 'cobrado', metodo_pago = $1, cobrado_at = NOW()
    WHERE id = $2
    """,
    body.metodo_pago,
    ticket_id,
)
await _marcar_lineas_kds_servido(conn, ticket_id)
await conn.execute(
    "UPDATE mesas SET estado = 'libre' WHERE id = $1",
    ticket_row["mesa_id"],
)
```

Implementación de `_marcar_lineas_kds_servido` en `backend/routers/tpv/tpv_shared.py`:

```python
async def _marcar_lineas_kds_servido(conn, ticket_id: UUID) -> None:
    await conn.execute(
        """
        UPDATE ticket_lineas
        SET estado_cocina = CASE
                WHEN enviado_cocina = true THEN 'servido'
                ELSE estado_cocina
            END,
            estado_barra = CASE
                WHEN COALESCE(enviado_barra, false) = true THEN 'servido'
                ELSE estado_barra
            END
        WHERE ticket_id = $1
        """,
        ticket_id,
    )
```

El context manager `get_db()` en `database.py` envuelve todo en `async with conn.transaction():`, de modo que cobro, líneas KDS y mesa libre **commitan o hacen rollback juntos**.

**Estado:** ✅ BUG-008 (columna `destino_kds` inexistente) resuelto tras migración en Supabase; `GET /api/kds/comandas` verificado 200 (25/03/2026, bitácora).

---

## 🚀 Despliegue e Infraestructura Cloud

Orden operativo alineado con `GUIA_PRODUCCION_COMPLETA.md` §0 (Fases A → B → C) y `BITACORA_HORECASO.md`.

### Diagrama de infraestructura objetivo

```
[Usuario navegador]
       │
       ▼
[Vercel CDN] ── VITE_API_URL ──► [Render: Gunicorn + 2× UvicornWorker]
                                        │
                                        ▼
                              [Supabase Pooler :6543]
                                        │
                                        ▼
                              [PostgreSQL 15]
```

### Fase previa al deploy (SQL en Supabase — por instancia)

| Fase | Archivo | Bloqueante si |
|------|---------|----------------|
| **A** | `migration_kds_barra_destino.sql` | Usas KDS/TPV con barra y `destino_kds` |
| **B1** | `migration_fase_b.sql` (+ hashes de `generate_test_hashes.py`) | Panel superadmin y tenant prueba |
| Opcional | `migration_gastos_operativos.sql` | Módulo Costes |
| Opcional | `migration_articulos_calibracion_merma.sql` | Inventario + coste efectivo en recetas |

Repetir **las mismas migraciones** en el proyecto Supabase de **producción** aunque ya estén en desarrollo.

### Backend — Render (Gunicorn + Uvicorn workers)

| Parámetro | Valor |
|-----------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120` |
| **Health Check Path** | `/api/health` |

**Arquitectura del proceso en producción:**

1. **Gunicorn** (`gunicorn==22.0.0` en `requirements.txt`) actúa como **proceso maestro (arbiter)**. Escucha en `0.0.0.0:$PORT` (puerto inyectado por Render). No ejecuta la lógica ASGI directamente: supervisa workers hijos y los reinicia si caen.
2. **`-w 2`** levanta **dos workers** independientes. Cada worker es un proceso OS con su propio event loop asyncio. Bajo carga concurrente (TPV + KDS + listados), dos workers reparten peticiones HTTP sin bloquear el event loop con trabajo CPU-bound prolongado (p. ej. generación PDF).
3. **`-k uvicorn.workers.UvicornWorker`** selecciona el worker class de **Uvicorn** compatible con ASGI. Cada worker importa `main:app` (instancia `app = create_app()` al final de `main.py`) y atiende el ciclo request/response de FastAPI de forma **asíncrona** (`async def` + asyncpg).
4. **`--timeout 120`**: si un worker no responde en 120 s, Gunicorn lo termina y lo sustituye — relevante para operaciones pesadas (informes, IA Groq en facturas).
5. **`lifespan` de FastAPI** (`main.py`): al arrancar cada worker se ejecuta `init_connection_pool()` (pool asyncpg `min_size=2`, `max_size=10`); al apagarse, `close_connection_pool()`. Cada worker mantiene su propio pool hacia Supabase pooler `:6543`.

**Health check operativo de Render:** `GET /api/health` — no es un ping TCP vacío; valida la cadena completa aplicación → pool → PostgreSQL.

**Variables de entorno (producción):**

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
SECRET_KEY_AUTH=[python -c "import secrets; print(secrets.token_hex(32))"]
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
ALLOWED_ORIGINS=https://tu-app.vercel.app
ENVIRONMENT=production
GROQ_API_KEY=[clave Groq]
APP_NAME=HorecaSO ERP
APP_VERSION=1.0.0
```

**Comportamiento de `/api/health`:** definido en `main.py`; ejecuta `SELECT 1` dentro de `get_db()`. Si el pool falla → **503** `{"status":"error","detail":"DB no disponible"}`.

**Verificación local antes de push:**

```bash
cd backend
python -c "from main import create_app; create_app()"
```

### Frontend — Vercel

| Parámetro | Valor |
|-----------|-------|
| **Framework Preset** | Vite |
| **Build** | `npm run build` (directorio `frontend`) |
| **Variable crítica** | `VITE_API_URL=https://tu-backend.onrender.com/api` |

`frontend/src/services/api.js` — `resolveApiBaseUrl()`:

- Si `VITE_API_URL` está vacío → base `/api` (dev con proxy en `vite.config.js`).
- Si es URL absoluta sin sufijo → añade `/api` automáticamente.

**Proxy local** (`vite.config.js`):

```javascript
server: {
  proxy: { '/api': 'http://localhost:8000' },
},
preview: {
  proxy: { '/api': 'http://localhost:8000' },
},
```

En Vercel **no** hay proxy: la URL del API debe ser absoluta y pública (HTTPS).

### Smoke tests post-deploy (orden de la guía §1.2)

```bash
curl https://tu-backend.onrender.com/api/health

curl -X POST https://tu-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tudominio.com","password":"***"}'

curl https://tu-backend.onrender.com/api/mesas \
  -H "Authorization: Bearer TOKEN"

curl -o /dev/null -w "%{http_code}" https://tu-backend.onrender.com/docs
# Esperado: 404 en production
```

Batería de aislamiento tenant y superadmin: `GUIA_PRODUCCION_COMPLETA.md` §2.3 (6 pruebas curl).

### Superadmin de producción (sin seed)

No usar `superadmin@horecaso.com` ni contraseñas de `CREDENCIALES_PRUEBA.MD` en clientes reales.

1. `python backend/scripts/generate_test_hashes.py` (o script `hash_password.py` de §5.1).
2. SQL en Supabase:

```sql
INSERT INTO usuarios (id, tenant_id, outlet_id, nombre, email, password_hash, rol, activo)
VALUES (
  gen_random_uuid(), NULL, NULL,
  'Superadmin HorecaSO',
  'superadmin@tudominio.com',
  'HASH_BCRYPT_AQUI',
  'superadmin',
  true
);
```

3. Verificar login y panel `https://tu-app.vercel.app/superadmin/tenants`.

### Aprovisionamiento manual de un nuevo restaurante (Tenant)

**Decisión de diseño deliberada:** HorecaSO es un ERP B2B con onboarding controlado por el operador de plataforma. **No existe** endpoint público de auto-registro, ni `POST /api/superadmin/tenants` en `superadmin_router.py` (solo `GET` listado/detalle y `PATCH` de `activo`). Esto evita:

- Creación masiva de tenants sin contrato ni verificación fiscal (NIF).
- Fuga de datos si un atacante obtuviera un token superadmin (superficie mínima: lectura y activación).
- Inconsistencias en catálogo inicial (mesas, outlet por defecto, admin raíz) sin transacción atómica.

El alta de un restaurante cliente se ejecuta en **Supabase SQL Editor** (o MCP con permisos de escritura) mediante un bloque **`DO $$`** transaccional (guía §5.1, espejo de `migration_fase_b.sql` para tenant de prueba).

Script `DO $$` documentado (valores a sustituir):

```sql
DO $$
DECLARE
  v_tenant_id   UUID := gen_random_uuid();
  v_outlet_id   UUID := gen_random_uuid();
  v_admin_id    UUID := gen_random_uuid();
  v_nombre_restaurante TEXT := 'Restaurante El Ejemplo';
  v_nif               TEXT := 'B12345678';
  v_plan              TEXT := 'profesional';
  v_email_admin       TEXT := 'manager@ejemplo.com';
  v_password_hash     TEXT := '$2b$12$...';  -- generate_test_hashes.py
BEGIN
  INSERT INTO tenants (id, nombre, nif, plan, activo, created_at)
  VALUES (v_tenant_id, v_nombre_restaurante, v_nif, v_plan, true, NOW());

  INSERT INTO outlets (id, tenant_id, nombre, num_mesas, created_at)
  VALUES (v_outlet_id, v_tenant_id, 'Sala Principal', 10, NOW());

  INSERT INTO usuarios (id, tenant_id, outlet_id, nombre, email, password_hash, rol, activo)
  VALUES (v_admin_id, v_tenant_id, v_outlet_id, 'Manager', v_email_admin, v_password_hash, 'admin', true);

  INSERT INTO mesas (id, outlet_id, numero, capacidad, estado, zona)
  SELECT gen_random_uuid(), v_outlet_id, num, 4, 'libre', 'interior'
  FROM generate_series(1, 10) AS num;
END $$;
```

**Workflow post-alta (guía §5.7):**

1. Cliente recibe URL Vercel + credenciales del admin inicial.
2. Admin entra en `/admin/usuarios` y crea camareros, cocina, barra, etc. (`POST /api/admin/usuarios` — contraseña ≥ 8 caracteres, roles en `ROLES_OPERATIVOS_ADMIN`).
3. Superadmin monitoriza en `/superadmin/tenants` y activa/desactiva locales.
4. Configuración operativa: carta, mesas, empleados en la UI del tenant.

**Tenant de prueba reproducible:** `migration_fase_b.sql` inserta tenant `11111111-1111-1111-1111-111111111111` (Restaurante Prueba) y usuarios `@prueba.com` — solo dev/staging; rotar contraseñas antes de producción (checklist §1.1 ítems 10, 14, 15).

### Onboarding checklist crítico pre-cliente

| # | Verificación |
|---|--------------|
| 1 | Migración KDS aplicada — `GET /api/kds/comandas` → 200 |
| 2 | `SECRET_KEY_AUTH` y CORS producción |
| 3 | `/docs` → 404 |
| 4 | Flujo TPV → cobro → fila en `verifactu_registros` |
| 5 | §2.3 aislamiento tenant / superadmin |
| 6 | Credenciales demo eliminadas o rotadas |

---

## 📊 Escala del Proyecto

Medición física del repositorio en disco (mayo 2026), excluyendo `node_modules`, `__pycache__`, `.venv` y artefactos SQL auxiliares `_seed_*` / `_mcp_*`.

### Tabla de métricas por capa

| Capa | Métrica | Valor medido | Detalle técnico |
|------|---------|--------------|-----------------|
| **Backend Python** | Líneas de código | **~13.438** | Todos los `.py` bajo `backend/` |
| **Backend Python** | Ficheros `.py` totales | **~120** | Incluye `main.py`, `auth/`, `services/`, scripts |
| **Backend routers** | Ficheros `.py` en `routers/` | **96** | Inventario completo del árbol `backend/routers/` |
| **Backend routers** | Módulos de dominio (sin `__init__.py`) | **80** | Handlers HTTP por dominio (TPV, KDS, inventario, …) |
| **Backend routers** | Montajes en `main.py` | **38** | Llamadas `app.include_router(...)` — superficie REST efectiva |
| **Backend routers** | Referencia documental Parte 1 | **~84** | Conteo agregado en árbol de routers (paquetes + orquestadores); en disco hay 80 módulos de lógica + 16 `__init__.py` |
| **Frontend React** | Líneas en `frontend/src/` | **~24.867** | `.jsx`, `.js`, `.css` |
| **Frontend React** | Ficheros JSX en `pages/` | **111** | Pantallas y componentes colocados bajo `src/pages/**` |
| **Frontend React** | Rutas protegidas en `App.jsx` | **30+** | `PrivateRoute`, `AdminOnlyRoute`, guards por rol |
| **PostgreSQL** | Tablas en esquema `public` | **42** | Volcado `SCHEMA_BASE_DATOS.md` (MCP 27/03/2026) |
| **PostgreSQL** | RLS activo | **0 tablas** | Aislamiento tenant vía aplicación (ver sección Seguridad) |
| **Dominio** | Roles `usuarios.rol` | **9** | `superadmin` + 8 operativos de restaurante |
| **Dominio** | Alérgenos precargados | **14** | Seed de catálogo regulatorio |
| **SQL versionado** | Migraciones `migration_*.sql` | **6+** | KDS, Fase B, gastos, calibración merma, elaborados, … |
| **Servicios backend** | Módulos en `services/` | **9** | Verifactu, PDF (carta, cuadrante, inventario, …) |
| **Aplicación** | Líneas totales (backend + frontend `src/`) | **~38.305** | Sin documentación `.md` |

### Base de datos y dominio

| Métrica | Valor |
|---------|-------|
| **Tablas PostgreSQL (`public`)** | **42** |
| **Alérgenos precargados** | **14** |
| **Roles en CHECK `usuarios.rol`** | **9** (`superadmin` + 8 operativos) |
| **Módulos funcionales con UI + API** | **15+** (TPV, KDS, inventario, RRHH, analytics, superadmin, …) |
| **Endpoints REST bajo `/api/*`** | **Centenar** (listados, CRUD, PDF, IA, fiscal) |

### Complejidad arquitectónica (indicadores cualitativos)

| Dimensión | Envergadura |
|-----------|-------------|
| **Transaccionalidad fiscal** | Cobro + Verifactu en misma transacción `get_db()` |
| **Tiempo real operativo** | Polling 30 s (KDS, venta live), sin WebSocket |
| **Multi-tenant** | Dos planos admin (plataforma + tenant) + filtrado SQL sistemático |
| **Integraciones** | Groq (visión facturas), Supabase, Render, Vercel |
| **Documentación viva** | PRD, SCHEMA, GUIA v1.2, BITACORA, BUGS, STEP, ARQUITECTURA |

### Fases de producto (estado bitácora 27/03/2026)

| Fase | Alcance | Estado repo |
|------|---------|-------------|
| **1** | TPV, mesas, Verifactu, carta, KDS, dashboard | ✅ |
| **2** | Inventario, recetas, semáforo, mermas | ✅ |
| **3** | Proveedores, RRHH, reservas, clientes | ✅ |
| **4** | Analytics, PDF, FIFO, APPCC | ✅ parcial / avanzado |
| **B** | Superadmin, admin usuarios, SQL Fase B | ✅ código + SQL |
| **C** | Deploy producción Render/Vercel | ⏳ operativo pendiente |
| **5** | Delivery, AEAT real, WebSocket, enterprise | ⏳ roadmap |

---

## Documentación de referencia

| Documento | Contenido |
|-----------|-----------|
| [GUIA_PRODUCCION_COMPLETA.md](GUIA_PRODUCCION_COMPLETA.md) | Deploy, seguridad §2, tenants §5, Anexo A Fase B |
| [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md) | Registro BUG-001 … BUG-013, MEJ-*, bitácora detallada |
| [BITACORA_HORECASO.md](BITACORA_HORECASO.md) | Estado real routers, rutas, migraciones |
| [SCHEMA_BASE_DATOS.md](SCHEMA_BASE_DATOS.md) | 42 tablas, columnas, FKs |
| [STEP_HORECASO.md](STEP_HORECASO.md) | State of the project por módulo |
| [ARQUITECTURA_HORECASO.md](ARQUITECTURA_HORECASO.md) | Mapa técnico routers ↔ frontend |
| [PRD_HorecaSO.md](PRD_HorecaSO.md) | Especificación de producto |
| [PRD_SUPERADMIN_TENANTS_PRUEBAS.md](PRD_SUPERADMIN_TENANTS_PRUEBAS.md) | Redirección → Guía Anexo A |

---

**HorecaSO** — README de producción (Parte 1 + Parte 2) — Arin Romero  
*Generado a partir del código fuente y documentación del repositorio (PRD, GUIA v1.2.0, BUGS, BITACORA, SCHEMA).*
