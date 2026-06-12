# 🍽️ HorecaSO ERP

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

**Full-stack multi-tenant ERP for the Spanish hospitality industry (restaurants & bars)**

**Live on Render · Vercel · Supabase — Installable as PWA**

[🌐 Live Demo](https://horeca-so.vercel.app/login) · [⚙️ API Health](https://horecaso.onrender.com/api/health) · [📚 Technical Reference](docs/REFERENCIA_TECNICA.md)

---

> **Personal project · Built from scratch as an autodidact using AI as a development tool.**
>
> A complete restaurant operating system: POS, kitchen displays, Spanish tax compliance (Verifactu), inventory with FIFO costing, recipes & food cost, HR with Spanish payroll, CRM, and a SaaS platform admin panel — all in one codebase.

</div>

---

## 📌 What is HorecaSO?

HorecaSO is a full-stack **SaaS ERP** built for mid-size Spanish restaurants (5–50 employees). It replaces the usual fragmented toolchain — a POS terminal, kitchen printers, Excel sheets for stock, paper-based HR, and disconnected tax software — with a single web application.

The core idea is connecting the entire operational chain:

```
ticket → product → recipe → ingredient → stock → cost → margin → tax record
```

so an owner can answer *"how much did it actually cost me to sell this dish?"* without ever exporting to Excel.

The system is **multi-tenant**: one application instance serves multiple restaurants with strict row-level isolation by `tenant_id` in PostgreSQL, enforced on every query. It supports **8 independent roles** — from platform superadmin down to kitchen staff — each with its own navigation, permissions, and workflows.

---

## ✨ Key Features

- **Table map & POS (TPV)** — visual floor plan, ticket management, **split billing** with multiple partial payments per ticket, 6 payment methods
- **Kitchen Display System (KDS)** — kitchen/bar station filtering by role, near-real-time polling, order state tracking per line
- **Verifactu tax engine** — SHA-256 chained, immutable fiscal records generated atomically with each payment (Spanish anti-fraud regulation)
- **Recipes & food cost (escandallos)** — ingredient-level costing with waste calibration, profitability traffic light per dish
- **Inventory** — stock movements, waste tracking, **FIFO lot valuation**, expiry alerts, APPCC food-safety logs
- **Purchasing** — suppliers, purchase invoices, **AI invoice scanning** with Groq vision
- **HR for Spain** — employees, time clock (fichajes), weekly schedules, absences, **payroll with Spanish SS/IRPF rules**
- **CRM & reservations** — customer history, loyalty points, bookings, waiting list
- **Analytics** — live sales, table profitability, **BCG menu engineering**, staff cost, **ML waste forecasting**
- **Platform admin (SaaS)** — superadmin panel to manage tenants and platform logs
- **PDF reporting** — payroll slips, inventory, cash closing, schedules, dish profitability via ReportLab
- **JWT + RBAC** — every endpoint protected with a `require_roles()` dependency factory
- **PWA** — installable on iOS and Android, with iOS safe-area support
- **Deployed to production** — Render (backend) + Vercel (frontend) + Supabase (PostgreSQL)

---

## 📸 Screenshots

### Login & Mobile
| Login (recruiter demo access) | Mobile | Table Map |
|-------------------------------|--------|-----------|
| ![Login — demo access for recruiters](docs/screenshots/01-login-demo.jpg) | ![Mobile view](docs/screenshots/02-mobile-mesas.jpg) | ![Table map](docs/screenshots/03-table-map.jpg) |

### Operations
| POS — split billing | Kitchen Display (KDS) |
|---------------------|------------------------|
| ![POS with split billing](docs/screenshots/04-tpv-split-billing.jpg) | ![Kitchen Display System](docs/screenshots/05-kds.jpg) |

### Management
| Director Dashboard | AI Predictions Panel |
|--------------------|----------------------|
| ![Director dashboard](docs/screenshots/06-dashboard.jpg) | ![AI waste predictions](docs/screenshots/07-predicciones-ia.jpg) |

---

## 🧪 Demo Access for Recruiters

The login page includes a **one-click demo access** section — no credentials needed. Pick a role and you're in:

| Button | Role | What you'll see |
|--------|------|-----------------|
| Entrar como Administrador | `admin` | Full ERP: dashboard, POS, inventory, HR, analytics |
| Entrar como Camarero | `camarero` | Table map and POS workflow |
| Entrar como Cocinero | `cocina` | Kitchen Display System |

> Render free tier sleeps after ~15 min of inactivity — the first request may take 30–60 seconds to wake the backend.

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Backend** | FastAPI 0.115 · Python 3.12 | Async, app-factory pattern |
| **Database driver** | asyncpg | Raw async SQL, no ORM |
| **Frontend** | React 19 · Vite | SPA with role-guarded routes |
| **Styling** | Tailwind CSS 4 · lucide-react | Design tokens, dark/light mode everywhere |
| **Database** | PostgreSQL 15 via Supabase | 42 tables, pgbouncer-compatible pool |
| **Auth** | JWT (python-jose) · bcrypt | RBAC with 8 roles, role factory dependency |
| **PDFs** | ReportLab | 8 server-side report generators |
| **AI** | Groq API (vision + llama3) | Invoice scanning · ML waste forecast service |
| **Rate limiting** | SlowAPI | Global limiter |
| **Deployment** | Render · Vercel · Supabase | Production config, PWA service worker |

### Project Structure

```
HorecaSO/
│
├── backend/
│   ├── auth/
│   │   ├── dependencies.py        # JWT validation, RBAC require_roles() factory
│   │   ├── jwt_handler.py         # Token creation & decoding (nullable tenant claims)
│   │   └── schemas.py             # Auth Pydantic models
│   │
│   ├── routers/                   # 39 registered routers · 97 files
│   │   ├── auth.py                # Login, profile, token verify
│   │   ├── mesas.py               # Table map CRUD & states
│   │   ├── tpv/                   # Tickets, lines, split payments, checkout
│   │   ├── kds/                   # Kitchen/bar order queues by role
│   │   ├── verifactu.py           # Fiscal records, chain verification, export
│   │   ├── admin_carta/           # Menu: categories, products, allergens
│   │   ├── recetas/               # Recipe costing, margin traffic light
│   │   ├── costes/                # Operating expenses
│   │   ├── inventario/            # Stock, movements, physical count, alerts
│   │   ├── fifo/                  # Lots, FIFO consumption, stock valuation
│   │   ├── proveedores/           # Suppliers, invoices, AI scanning
│   │   ├── empleados/             # HR: staff, time clock, schedules, absences
│   │   ├── nominas.py             # Spanish payroll engine
│   │   ├── reservas/              # Bookings + waiting list
│   │   ├── clientes/              # CRM, history, loyalty points
│   │   ├── analytics/             # Table profitability, menu BCG, ML forecast
│   │   ├── reportes/              # PDF generation endpoints
│   │   ├── superadmin/            # Platform panel: tenants, logs
│   │   └── appcc.py               # Food safety (HACCP) records
│   │
│   ├── services/
│   │   ├── verifactu_engine.py    # SHA-256 hash chaining, fiscal record builder
│   │   ├── ml_predicciones.py     # Waste forecasting (trend + seasonality)
│   │   └── pdf_*.py               # ReportLab document builders
│   │
│   ├── sql/                       # Versioned migrations & seeds (Supabase)
│   ├── config.py                  # pydantic-settings, env vars
│   ├── database.py                # asyncpg pool, pgbouncer fix
│   └── main.py                    # App factory, CORS, security middleware
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── layout/            # AppLayout, Sidebar (role-filtered nav)
│       │   └── shared/            # StatCard, Loader, EmptyState
│       ├── context/               # AuthContext, ThemeContext (dark/light)
│       ├── pages/
│       │   ├── sala/              # Table map
│       │   ├── tpv/               # POS with split billing
│       │   ├── cocina/            # KDS fullscreen
│       │   ├── director/          # Dashboard, live sales, AI predictions
│       │   ├── admin/             # Menu, recipes, costs, users, tables
│       │   ├── inventario/        # Stock, waste, FIFO, APPCC
│       │   ├── proveedores/       # Suppliers & invoices
│       │   ├── empleados/         # HR suite
│       │   ├── superadmin/        # Platform tenant management
│       │   └── ...                # Reservations, customers, reports
│       ├── services/api.js        # Axios + JWT interceptor, endpoint helpers
│       └── constants/uiTokens.js  # Design token system
│
├── docs/                          # Full technical docs (architecture, schema, guides)
├── render.yaml                    # Render deployment blueprint
└── README.md
```

---

## 👥 Modules by Role

| Role | Dashboards & Features |
|------|-----------------------|
| **Superadmin** | Platform panel: tenant management, activation/deactivation, platform logs |
| **Admin** | Everything in the tenant + user management |
| **Director** | KPI dashboard, live sales, analytics (table profitability, menu BCG, staff cost), AI predictions, reports, payroll, configuration |
| **Jefe de sala** | Table map, reservations, POS, live sales, KDS full view, floor configuration |
| **Camarero** | POS and table map |
| **Cocina** | Kitchen KDS, recipes, inventory (read) |
| **Barra** | Bar KDS (drinks & bar-prepared items only) |
| **Almacén** | Full inventory, suppliers, waste tracking |

---

## 🔐 Security Architecture

### Authentication flow

```
Client → POST /api/auth/login
       ← JWT (role + tenant claims)

Client → Any protected endpoint
       → Authorization: Bearer <token>
       → JWT decoded → role + negocio_id (tenant) extracted
       → Role check: require_roles(['director', 'admin'])
       → Every SQL query filtered: WHERE tenant_id = $1
       ← 200 OK or 401/403
```

### RBAC implementation

Roles are enforced via a `require_roles()` factory that returns a FastAPI dependency — authorization is declared at the router level, never buried in business logic:

```python
@router.get("/articulos")
async def get_articulos(
    current_user = Depends(require_roles(['admin', 'director', 'almacen']))
):
    ...
```

**Defined roles:** `superadmin` · `admin` · `director` · `jefe_sala` · `camarero` · `cocina` · `barra` · `almacen`

### Multi-tenant isolation

Two administration planes share one codebase:

| Plane | Role | JWT claims | Routes |
|-------|------|-----------|--------|
| **Platform** | `superadmin` | `tenant_id = null` | `/api/superadmin/*` |
| **Tenant** | `admin` + operational roles | `negocio_id` = tenant UUID | `/api/*` with SQL filter |

Every business query filters by `tenant_id` (and `outlet_id` for floor operations). A tenant can never read another tenant's rows.

### Additional security layers

- **Rate limiting** via SlowAPI
- **CORS** restricted by `ALLOWED_ORIGINS` env variable
- **Security headers middleware** — X-Frame-Options, nosniff, Referrer-Policy
- **OpenAPI docs disabled in production** (`ENVIRONMENT=production` → `/docs` returns 404)
- **Password hashing** with bcrypt via passlib
- **Global 500 handler** — no stack traces ever leave the server

---

## 🧾 Verifactu — Spanish Tax Compliance Engine

Verifactu is Spain's anti-fraud invoicing regulation: every sale must produce an **immutable, hash-chained fiscal record**. HorecaSO implements it natively:

- Each payment generates a record with a **SHA-256 fingerprint chained to the previous record** (`huella_anterior` → `huella_actual`)
- The fiscal record and the payment are written in the **same database transaction** — a ticket can never be paid without its tax record
- Records are **INSERT-only**: no UPDATE or DELETE is ever executed on `verifactu_registros`
- Chain integrity can be verified end-to-end via `GET /api/verifactu/verificar-cadena`
- Spanish hospitality VAT rules applied automatically: **10% general, 21% alcohol**

```
ticket paid → base + VAT computed (Decimal) → record built → SHA-256(prev_hash + fields)
            → INSERT verifactu_registros  ─┐
            → UPDATE tickets SET cobrado  ─┴── same transaction (atomic)
```

---

## 🤖 AI Features

### Invoice scanning (Groq Vision)

Suppliers' paper invoices are photographed and sent to `POST /api/facturas-proveedor/escanear-ia`. The backend forwards the image to **Groq's vision model**, extracts supplier, line items, quantities and prices, and pre-fills the purchase invoice — turning minutes of manual data entry into one tap.

### ML waste forecasting

`services/ml_predicciones.py` implements a forecasting model over historical `movimientos_stock` data — no external ML libraries, pure `Decimal` arithmetic:

- **Weighted moving average** over recent daily waste
- **Linear trend** estimation
- **Weekly seasonality** (restaurants live and die by the day of the week)

The Director dashboard includes a **"Predicciones IA" panel** showing the 7-day estimated waste cost, a daily forecast chart, and the top 5 ingredients at risk — so purchasing can react before the loss happens.

---

## 💰 Cost & Business Rules Engine

All money math uses Python's `Decimal` with `ROUND_HALF_UP` — never floats.

**Recipe profitability traffic light:**

| Margin | Status | Action |
|--------|--------|--------|
| > 65% | 🟢 Green | Keep |
| 40–65% | 🟡 Amber | Monitor |
| < 40% | 🔴 Red | Reprice or rework recipe |

**Waste-adjusted ingredient cost** — gross quantity derived from net quantity and calibrated waste:

```
gross_qty = net_qty / (1 - waste_pct / 100)
```

**Split billing** — a ticket holds multiple partial payments (`ticket_pagos`); it closes when `sum(payments) >= total`, and only then is the Verifactu record generated.

**Spanish payroll** — employee SS **6.35%**, employer SS **29.9%**, IRPF per AEAT brackets, mandatory time-clock records (RDL 8/2019).

---

## ⚙️ Key Technical Decisions

### asyncpg over an ORM

Raw async SQL with parameterized placeholders. Full control over every query, no N+1 surprises, and the SQL you read is the SQL PostgreSQL runs:

```python
async with get_db() as conn:
    rows = await conn.fetch(
        "SELECT * FROM tickets WHERE outlet_id = $1 AND estado = $2",
        outlet_id, 'abierto'
    )
```

### pgbouncer compatibility

Supabase pools connections through pgbouncer in transaction mode, which breaks PostgreSQL prepared statements. Without this fix the API throws `prepared statement does not exist` under load:

```python
_pool = await asyncpg.create_pool(
    dsn=settings.DATABASE_URL,
    statement_cache_size=0,  # Required for pgbouncer transaction mode
)
```

### Polling instead of WebSockets

Live screens (KDS, live sales) poll every 30 seconds with a visible "updated X seconds ago" indicator. Render's free tier doesn't keep WebSocket connections stable — a pragmatic constraint-driven decision, with a planned migration path once the service moves to a paid tier.

### Row-level multi-tenancy in the application layer

Instead of separate databases per client, every table carries a `tenant_id` and every query filters on it. One migration, one deployment, N restaurants — the standard SaaS trade-off, applied consistently across 39 routers.

### PWA with iOS safe-area support

The app installs to the home screen with a translucent status bar. All fixed headers use `env(safe-area-inset-top)` utilities so the UI never collides with the iPhone notch or Dynamic Island.

---

## 🚀 Local Setup

### Prerequisites

- Python 3.12
- Node.js 18+
- A Supabase project (or local PostgreSQL 15)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # Fill in your credentials
uvicorn main:app --reload
```

API available at: `http://127.0.0.1:8000`
Interactive docs: `http://127.0.0.1:8000/docs` (development only)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at: `http://localhost:5173` — the Vite dev proxy forwards `/api` to the backend automatically.

### Database

Run the SQL migrations from `backend/sql/` in the Supabase SQL Editor (see [docs/GUIA_PRODUCCION_COMPLETA.md](docs/GUIA_PRODUCCION_COMPLETA.md) for the exact order and seeds).

### Environment Variables

**Backend** (`backend/.env`):

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler `:6543`) | ✅ |
| `SECRET_KEY_AUTH` | JWT signing secret (32+ chars) | ✅ |
| `ALLOWED_ORIGINS` | CORS origins, comma-separated | ✅ prod |
| `ALGORITHM` | JWT algorithm (`HS256`) | Optional |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | Optional |
| `ENVIRONMENT` | `development` / `production` — controls `/docs` | Optional |
| `GROQ_API_KEY` | Groq API key for AI invoice scanning | Optional |

**Frontend** (`frontend/.env`):

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (only needed in production, e.g. `https://...onrender.com/api`) |

---

## 🌐 Deployment

### Backend — Render

| Field | Value |
|-------|-------|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120` |
| Health Check | `/api/health` |

A `render.yaml` blueprint is included. Python is pinned to 3.12 via `.python-version` / `runtime.txt`.

### Frontend — Vercel

| Field | Value |
|-------|-------|
| Root Directory | `frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Set `VITE_API_URL` to your Render backend URL. `vercel.json` handles SPA rewrites and service-worker cache headers.

> **Note:** Render free tier sleeps after ~15 min of inactivity. First request may take 30–60 seconds to wake the service.

---

## 📊 Project Scale

| Metric | Count |
|--------|-------|
| Backend Python files | 122 |
| Lines of Python (backend) | ~13,700 |
| API routers registered | 39 (97 router modules) |
| Frontend JSX components | 122 |
| Lines of JSX (frontend) | ~18,500 |
| PostgreSQL tables | 42 |
| User roles | 8 |
| PDF report generators | 8 |

---

## 📋 Production Status

| Criterion | Status |
|-----------|--------|
| Core operations — POS, split billing, KDS, table map | ✅ Complete |
| Verifactu — chained fiscal records, atomic with payment | ✅ Complete |
| Inventory — FIFO, waste, calibration, APPCC | ✅ Complete |
| Recipes & food cost with margin traffic light | ✅ Complete |
| HR — time clock, schedules, Spanish payroll | ✅ Complete |
| AI — invoice scanning (Groq) + ML waste forecast | ✅ Complete |
| Multi-tenant SaaS + superadmin platform panel | ✅ Complete |
| Security — JWT, RBAC, rate limiting, security headers | ✅ Complete |
| PWA — installable, iOS safe-area support | ✅ Complete |
| Deployment — Render + Vercel + Supabase | ✅ Live |
| Automated tests | ⚠️ Pending |

---

## 📚 Documentation

The exhaustive technical documentation lives in [`docs/`](docs/README.md):

| Document | Content |
|----------|---------|
| [REFERENCIA_TECNICA.md](docs/REFERENCIA_TECNICA.md) | **Full technical README** — every endpoint, table, env var and script |
| [ARQUITECTURA_HORECASO.md](docs/ARQUITECTURA_HORECASO.md) | Router ↔ frontend map |
| [SCHEMA_BASE_DATOS.md](docs/SCHEMA_BASE_DATOS.md) | All 42 PostgreSQL tables |
| [GUIA_PRODUCCION_COMPLETA.md](docs/GUIA_PRODUCCION_COMPLETA.md) | Deployment, security & tenant guide |
| [MANUAL_USUARIO_HORECASO.md](docs/MANUAL_USUARIO_HORECASO.md) | End-user manual |

---

## 👤 Developer

**Arin Romero**

Autodidact developer. HorecaSO is a production-deployed, multi-tenant ERP built independently from scratch using AI as a development tool.

📧 ariin.romeror@gmail.com
💼 [LinkedIn](https://www.linkedin.com/in/arin-romero-606661129)
🐙 [GitHub](https://github.com/ariinromeror)

---

<div align="center">

Built with FastAPI · React · PostgreSQL · deployed on Render + Vercel + Supabase

</div>
