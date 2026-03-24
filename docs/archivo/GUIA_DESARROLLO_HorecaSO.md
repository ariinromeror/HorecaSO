# 🚀 HorecaSO — Guía de Inicio y Desarrollo
## Cómo construir este proyecto desde cero, paso a paso

**Para:** Arin Romero  
**Stack:** FastAPI · React 19 · PostgreSQL · Supabase · Render · Vercel  
**Herramientas:** Cursor · Claude  
**Metodología:** Una cosa a la vez. Nada funciona hasta que todo funciona en esa fase.

---

## ⚠️ REGLAS ANTES DE EMPEZAR

Estas reglas te van a ahorrar semanas de dolor. Vienen de los errores de InfoCampus.

**Regla 1 — Una fase a la vez.**
No empieces el inventario hasta que el TPV funcione. No empieces el TPV hasta que la auth funcione. El orden importa.

**Regla 2 — Nunca construyas sin probar.**
Cada endpoint que crees, pruébalo en `/docs` antes de pasar al siguiente. Un error que no ves hoy se convierte en 3 horas de debugging mañana.

**Regla 3 — El schema de DB es sagrado.**
El PRD tiene el schema completo. No improvises tablas. Si necesitas cambiar algo, piénsalo dos veces — cambiar una tabla con datos cuesta mucho más que pensarlo bien antes.

**Regla 4 — Commits frecuentes.**
Cada vez que algo funciona → commit. Mensaje claro: `feat: TPV cobro de ticket`, `feat: Verifactu hash chaining`. Si algo se rompe, puedes volver atrás.

**Regla 5 — Cursor no sabe qué quieres hasta que se lo explicas.**
Antes de cada prompt a Cursor, abre el PRD y copia el contexto relevante. Cursor con contexto = 10x más útil.

---

## 📋 ÍNDICE

1. [Preparación del entorno](#1-preparación-del-entorno)
2. [Crear la estructura del proyecto](#2-crear-la-estructura-del-proyecto)
3. [Configurar Supabase](#3-configurar-supabase)
4. [Backend — Fase 0: Base](#4-backend--fase-0-base)
5. [Backend — Autenticación y RBAC](#5-backend--autenticación-y-rbac)
6. [Backend — Mesas y TPV](#6-backend--mesas-y-tpv)
7. [Backend — Verifactu](#7-backend--verifactu)
8. [Frontend — Setup](#8-frontend--setup)
9. [Frontend — Auth y Layout](#9-frontend--auth-y-layout)
10. [Frontend — TPV y Mesas](#10-frontend--tpv-y-mesas)
11. [Cómo usar Cursor en cada paso](#11-cómo-usar-cursor-en-cada-paso)
12. [Checklist de la Fase 1](#12-checklist-de-la-fase-1)
13. [Errores comunes y cómo evitarlos](#13-errores-comunes-y-cómo-evitarlos)
14. [Deploy de la Fase 1](#14-deploy-de-la-fase-1)

---

## 1. PREPARACIÓN DEL ENTORNO

### Lo que necesitas instalado

Antes de escribir una línea de código, verifica que tienes esto:

```bash
# Verificar Python
python --version
# Debe mostrar: Python 3.11.x o 3.12.x

# Verificar Node
node --version
# Debe mostrar: v18.x o v20.x o v22.x

# Verificar npm
npm --version
# Debe mostrar: 9.x o 10.x

# Verificar Git
git --version
```

Si falta alguno:
- Python: https://www.python.org/downloads/
- Node: https://nodejs.org/ (descarga LTS)
- Git: https://git-scm.com/

### Cursor

Asegúrate de tener Cursor actualizado. En Cursor → Help → Check for Updates.

Activa en Cursor:
- Settings → Features → Codebase indexing: ON
- Settings → Models → Claude Sonnet (el más capaz para código)

---

## 2. CREAR LA ESTRUCTURA DEL PROYECTO

### Paso 1 — Crear el repositorio en GitHub

1. Ve a github.com → New repository
2. Nombre: `horecaso`
3. Descripción: `ERP for hospitality — FastAPI · React · PostgreSQL · Verifactu`
4. Privado por ahora (lo haces público cuando esté presentable)
5. Inicializa con README
6. Clona en tu máquina:

```bash
git clone https://github.com/ariinromeror/horecaso.git
cd horecaso
```

### Paso 2 — Crear la estructura de carpetas

Ejecuta esto en la raíz del proyecto:

```bash
# Backend
mkdir -p backend/auth
mkdir -p backend/routers
mkdir -p backend/services
mkdir -p backend/migrations
mkdir -p backend/models
mkdir -p backend/tests

# Frontend
mkdir -p frontend/src/components/shared
mkdir -p frontend/src/components/tpv
mkdir -p frontend/src/components/mesas
mkdir -p frontend/src/pages/director
mkdir -p frontend/src/pages/sala
mkdir -p frontend/src/pages/tpv
mkdir -p frontend/src/pages/cocina
mkdir -p frontend/src/pages/almacen
mkdir -p frontend/src/context
mkdir -p frontend/src/services
mkdir -p frontend/src/constants
mkdir -p frontend/src/layouts

# Docs
mkdir -p docs

# Crear archivos vacíos necesarios
touch backend/__init__.py
touch backend/auth/__init__.py
touch backend/routers/__init__.py
touch backend/services/__init__.py
touch backend/models/__init__.py
```

### Paso 3 — Crear el .gitignore

Crea el archivo `.gitignore` en la raíz:

```
# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/
*.egg-info/
.env

# Node
node_modules/
dist/
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Supabase
.supabase/
```

---

## 3. CONFIGURAR SUPABASE

### Paso 1 — Crear proyecto en Supabase

1. Ve a supabase.com → New project
2. Nombre: `horecaso`
3. Password: genera uno fuerte y guárdalo
4. Región: West EU (Ireland) — más cercana a España
5. Espera 2 minutos a que se cree

### Paso 2 — Obtener las credenciales

En Supabase → Settings → Database:

```
Host: db.xxxxxxxxxxxx.supabase.co
Port: 5432  ← IMPORTANTE: usa 5432, NO 6543
Database: postgres
User: postgres
Password: (la que pusiste)
```

Construye tu DATABASE_URL:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

Guárdala — la usarás en el `.env` del backend.

### Paso 3 — Ejecutar el schema

En Supabase → SQL Editor → New query.

Copia y ejecuta el schema completo del PRD (todas las tablas en orden).

**Orden de ejecución obligatorio** (por las foreign keys):
1. `tenants`
2. `outlets`
3. `usuarios`
4. `mesas`
5. `categorias_menu`
6. `productos`
7. `tickets`
8. `ticket_lineas`
9. `verifactu_registros`
10. `articulos`
11. `lotes_inventario`
12. `recetas`
13. `receta_ingredientes`
14. `proveedores`
15. `facturas_proveedor`
16. `facturas_proveedor_lineas`
17. `empleados`
18. `turnos`
19. `reservas`

Si hay errores de FK, es por el orden. Ejecuta tabla por tabla si es necesario.

### Paso 4 — Verificar

En Supabase → Table Editor deberías ver todas las tablas creadas. Si las ves, continúa.

---

## 4. BACKEND — FASE 0: BASE

Este paso crea el esqueleto del backend. Sin features todavía — solo la estructura que va a sostener todo.

### Paso 1 — Entorno virtual Python

```bash
cd backend
python -m venv .venv

# Activar (Mac/Linux):
source .venv/bin/activate

# Activar (Windows):
.venv\Scripts\activate

# Verificar que está activado — debe mostrar (.venv) en el prompt
```

### Paso 2 — Crear requirements.txt

```bash
# backend/requirements.txt
```

Contenido:

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
gunicorn==22.0.0
asyncpg==0.29.0
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
python-multipart==0.0.9
python-dotenv==1.0.1
pydantic==2.9.0
pydantic-settings==2.5.2
slowapi==0.1.9
reportlab==4.0.8
groq
Faker==18.0.0
```

Instalar:
```bash
pip install -r requirements.txt
```

### Paso 3 — Crear .env

```bash
# backend/.env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
SECRET_KEY_AUTH=genera-uno-con-python-secrets
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:5173
GROQ_API_KEY=tu-groq-api-key
APP_NAME=HorecaSO
APP_VERSION=1.0.0
```

Para generar SECRET_KEY_AUTH:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Paso 4 — Crear .env.example

```bash
# backend/.env.example
DATABASE_URL=postgresql://usuario:password@host:5432/dbname
SECRET_KEY_AUTH=cambia-esto-por-valor-seguro
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:5173
GROQ_API_KEY=opcional-para-escaneo-facturas
APP_NAME=HorecaSO
APP_VERSION=1.0.0
```

### Paso 5 — Prompt para Cursor: config.py y database.py

Abre Cursor en la carpeta `backend/`. Usa este prompt:

```
Crea dos archivos para un backend FastAPI con asyncpg y Supabase:

1. config.py — usando pydantic-settings, lee estas variables de .env:
   DATABASE_URL, SECRET_KEY_AUTH, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
   ALLOWED_ORIGINS (string CSV), GROQ_API_KEY, APP_NAME, APP_VERSION

2. database.py — pool asyncpg con estas características:
   - statement_cache_size=0 (obligatorio para Supabase pgbouncer)
   - init_connection_pool() async
   - get_db() async context manager con transacción automática
   - get_db_direct() síncrono con psycopg2 para scripts externos
   - Logging en cada operación importante
   - Manejo de errores claro

Basate en este patrón que ya funciona en producción: [pega aquí el database.py de InfoCampus]
```

### Paso 6 — Prompt para Cursor: main.py

```
Crea main.py para FastAPI con:
- Lifespan: inicializar pool de DB al arrancar
- CORS dinámico desde ALLOWED_ORIGINS (CSV), wildcard si no está definido
- SlowAPI middleware para rate limiting
- Global exception handler que devuelve 500 sin stack trace
- bcrypt compatibility shim para passlib 1.7.4 con bcrypt 4.x
- Health check en GET /api/health que verifica conexión a DB
- Root endpoint GET / con info básica
- Logging configurado
- Routers: solo auth por ahora, el resto se agregan después

El APP_NAME es "HorecaSO ERP" versión 1.0.0
```

### Paso 7 — Verificar que arranca

```bash
cd backend
uvicorn main:app --reload
```

Abre http://127.0.0.1:8000 — debe devolver JSON con el nombre del app.
Abre http://127.0.0.1:8000/api/health — debe devolver `{"status": "ok"}`.

**Si falla aquí, no avances. Arregla antes de continuar.**

---

## 5. BACKEND — AUTENTICACIÓN Y RBAC

Este es el mismo sistema que InfoCampus. Ya lo conoces.

### Paso 1 — Prompt para Cursor: auth completo

```
Crea el sistema de autenticación para HorecaSO en backend/auth/:

ROLES del sistema: director, jefe_sala, camarero, cocina, almacen, admin

Archivos a crear:

1. auth/schemas.py — modelos Pydantic:
   - LoginRequest: email, password
   - TokenResponse: access_token, token_type, user (con rol, nombre, outlet_id, tenant_id)

2. auth/jwt_handler.py:
   - create_access_token(data: dict) → str
   - decode_access_token(token: str) → dict | None
   - Verificar token en tabla revoked_tokens

3. auth/dependencies.py:
   - get_current_user() — busca usuario en DB por id del token
   - require_roles(allowed_roles: list) → factory de dependency
   - Shorthands: require_director, require_sala, require_tpv, require_cocina, require_almacen
   - get_optional_user() — no lanza excepción si no hay token

4. routers/auth.py:
   - POST /api/auth/login — rate limit 5/min, verifica email+password, devuelve JWT
   - POST /api/auth/logout — agrega token a revoked_tokens
   - GET /api/auth/perfil — datos del usuario actual
   - GET /api/auth/verify — verifica si el token es válido

La tabla de usuarios tiene: id (UUID), tenant_id, outlet_id, nombre, email, 
password_hash, rol, activo

Incluye logging en operaciones importantes.
```

### Paso 2 — Crear migración para revoked_tokens

```sql
-- backend/migrations/001_revoked_tokens.sql
CREATE TABLE IF NOT EXISTS revoked_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    revoked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_token ON revoked_tokens(token);
```

### Paso 3 — Actualizar main.py para correr migración al arrancar

Mismo patrón que InfoCampus — advisory lock para que no fallen los workers en paralelo.

### Paso 4 — Crear usuario de prueba

En Supabase SQL Editor:

```sql
-- Primero crear un tenant de prueba
INSERT INTO tenants (id, nombre, nif) 
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Restaurante Demo',
    'B12345678'
);

-- Crear un outlet
INSERT INTO outlets (id, tenant_id, nombre, num_mesas)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Local Principal',
    20
);
```

Para crear el usuario con password hasheado, usa Python:

```python
from passlib.context import CryptContext
pwd = CryptContext(schemes=["bcrypt"])
print(pwd.hash("admin123"))
# Copia el hash resultante
```

```sql
INSERT INTO usuarios (tenant_id, outlet_id, nombre, email, password_hash, rol)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Admin Demo',
    'admin@horecaso.com',
    '[HASH_GENERADO]',
    'director'
);
```

### Paso 5 — Probar en /docs

1. Abre http://127.0.0.1:8000/docs
2. Prueba POST /api/auth/login con las credenciales
3. Debe devolver un JWT
4. Copia el token, úsalo en Authorize (botón arriba a la derecha)
5. Prueba GET /api/auth/perfil — debe devolver los datos del usuario

**Si esto funciona, la auth está lista. Commit.**

```bash
git add .
git commit -m "feat: auth JWT + RBAC completo"
```

---

## 6. BACKEND — MESAS Y TPV

### Paso 1 — Router de mesas

Prompt para Cursor:

```
Crea backend/routers/mesas.py para HorecaSO.

La tabla mesas tiene: id (UUID), outlet_id, numero (int), capacidad (int),
estado (libre/ocupada/reservada), posicion_x, posicion_y, zona (terraza/interior/barra)

Endpoints necesarios:
- GET /api/mesas — todas las mesas del outlet del usuario autenticado
- GET /api/mesas/{id} — detalle de una mesa
- POST /api/mesas — crear mesa (solo director/admin)
- PUT /api/mesas/{id} — actualizar posición, capacidad, zona (solo director/admin)
- DELETE /api/mesas/{id} — eliminar si no tiene tickets abiertos (solo director/admin)
- PATCH /api/mesas/{id}/estado — cambiar estado (libre/ocupada/reservada)
- GET /api/mesas/disponibles — mesas libres ahora mismo

Reglas de negocio:
- Solo se pueden ver mesas del propio outlet (filtrar por outlet_id del usuario)
- No se puede eliminar una mesa con tickets en estado 'abierto'
- Solo director y admin pueden crear/editar/eliminar mesas

Usa require_roles de auth/dependencies.py para proteger endpoints.
Usa get_db() de database.py con queries asyncpg ($1, $2 placeholders).
```

### Paso 2 — Router del TPV

Este es el más importante. Prompt para Cursor:

```
Crea backend/routers/tpv.py para HorecaSO.

Tablas involucradas:
- tickets: id, outlet_id, mesa_id, camarero_id, estado (abierto/cobrado/anulado),
  total, metodo_pago, created_at, cobrado_at
- ticket_lineas: id, ticket_id, producto_id, cantidad, precio_unitario, subtotal, nota
- productos: id, tenant_id, categoria_id, nombre, precio, activo
- categorias_menu: id, tenant_id, nombre, orden

Endpoints:

1. GET /api/tpv/carta — productos agrupados por categoría del tenant del usuario
2. POST /api/tpv/tickets — abrir ticket (requiere mesa_id, opcional)
3. GET /api/tpv/tickets/abiertos — tickets abiertos del outlet actual
4. GET /api/tpv/tickets/{id} — detalle del ticket con sus líneas
5. POST /api/tpv/tickets/{id}/lineas — añadir producto al ticket
   Body: {producto_id, cantidad, nota?}
   Valida que el producto existe y pertenece al tenant
6. PUT /api/tpv/tickets/{id}/lineas/{linea_id} — actualizar cantidad
7. DELETE /api/tpv/tickets/{id}/lineas/{linea_id} — eliminar línea
8. POST /api/tpv/tickets/{id}/cobrar — cobrar ticket
   Body: {metodo_pago: "efectivo"|"tarjeta"|"bizum"|"invitacion"}
   - Calcula total final
   - Cambia estado ticket a 'cobrado'
   - Cambia estado mesa a 'libre'
   - Devuelve datos completos para generar Verifactu (lo llama verifactu router)
9. GET /api/tpv/cierre-caja — resumen del día actual
   Devuelve: total_ventas, num_tickets, ticket_medio, desglose_por_metodo_pago
10. POST /api/tpv/tickets/{id}/anular — anular ticket abierto (solo director)

Reglas:
- Un camarero solo puede ver sus propios tickets (excepto director/jefe_sala que ven todos)
- No se puede modificar un ticket cobrado o anulado
- Al cobrar: actualizar mesa a 'libre' en la misma transacción
- Usar Decimal para todos los cálculos de dinero, nunca float

Incluye logging en las operaciones de cobro y anulación.
```

### Paso 3 — Router de carta/productos

Prompt para Cursor:

```
Crea backend/routers/carta.py para HorecaSO.

Gestión de la carta del restaurante (solo director/admin pueden modificarla).

Tablas: productos, categorias_menu

Endpoints:
- GET /api/carta/categorias — categorías ordenadas por campo 'orden'
- POST /api/carta/categorias — crear categoría
- PUT /api/carta/categorias/{id} — editar nombre/orden
- DELETE /api/carta/categorias/{id} — solo si no tiene productos activos

- GET /api/carta/productos — todos los productos con su categoría
- GET /api/carta/productos/{id} — detalle
- POST /api/carta/productos — crear producto
- PUT /api/carta/productos/{id} — editar precio, nombre, categoría
- PATCH /api/carta/productos/{id}/toggle — activar/desactivar producto

Todos filtrados por tenant_id del usuario autenticado.
```

### Paso 4 — Probar el flujo completo

En `/docs` simula esto en orden:
1. Login → obtén token
2. GET /api/mesas → ver mesas
3. POST /api/tpv/tickets → abrir ticket en mesa 1
4. GET /api/tpv/carta → ver productos
5. POST /api/tpv/tickets/{id}/lineas → añadir 2 productos
6. GET /api/tpv/tickets/{id} → verificar que tiene las líneas
7. POST /api/tpv/tickets/{id}/cobrar → cobrar con tarjeta
8. GET /api/mesas → verificar que la mesa está libre

**Si el flujo completo funciona → commit.**

```bash
git add .
git commit -m "feat: TPV completo — mesas, carta, tickets, cobro"
```

---

## 7. BACKEND — VERIFACTU

**Este es el módulo más crítico técnicamente. Hazlo con calma.**

### Paso 1 — Servicio de hash chaining

Prompt para Cursor:

```
Crea backend/services/verifactu_engine.py

Este servicio implementa el protocolo Verifactu según Orden HAC/1177/2024 (España).

Función 1: generar_huella(registro: dict, huella_anterior: str | None) -> str
- Concatena exactamente estos 8 campos en este orden con separador "&":
  1. nif_emisor
  2. numero_serie  
  3. fecha_expedicion (formato YYYY-MM-DD)
  4. tipo_factura (F1 por defecto)
  5. cuota_iva (string con 2 decimales, ej: "21.00")
  6. importe_total (string con 2 decimales, ej: "121.00")
  7. huella_anterior (o string vacío "" si es el primero)
  8. fecha_hora_generacion (formato YYYY-MM-DDTHH:MM:SS±HH:MM)
- Codifica en UTF-8 SIN BOM antes de aplicar SHA-256
- Devuelve el hash en MAYÚSCULAS
- CRÍTICO: el orden y formato exactos son legalmente obligatorios

Función 2: generar_numero_serie(tenant_id: str, conn) -> str
- Obtiene el último número de serie del tenant
- Devuelve formato: "HRCSO-{YYYY}-{NNNNNN}" ej: "HRCSO-2026-000001"
- Es atómica — usa SELECT FOR UPDATE para evitar duplicados

Función 3: generar_xml_soap(registro: dict) -> str
- Genera el XML SOAP según esquema XSD oficial AEAT
- Incluye todos los namespaces obligatorios
- Codificación UTF-8 sin BOM
- Incluye EncadenamientoRegistroAnterior con la huella anterior

Función 4: generar_url_qr(nif: str, numero_serie: str, fecha: str, importe: str) -> str
- Construye URL: https://www.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=...&numserie=...&fecha=...&importe=...
- Todos los parámetros URL-encoded

Función 5: generar_qr_bytes(url: str) -> bytes
- Genera imagen QR en bytes PNG
- Nivel de corrección M (Medium) según ISO/IEC 18004
- Tamaño mínimo equivalente a 30x30mm a 72dpi

Usa: hashlib para SHA-256, qrcode para el QR (agrégalo a requirements.txt)
Usa Decimal para todos los importes, nunca float.
Incluye tests inline en un bloque if __name__ == "__main__" para verificar el hash.
```

### Paso 2 — Router de Verifactu

Prompt para Cursor:

```
Crea backend/routers/verifactu.py

Este router se llama automáticamente al cobrar un ticket desde tpv.py
y también tiene endpoints de consulta para el director.

Tabla verifactu_registros:
id, tenant_id, ticket_id, numero_serie, fecha_expedicion, tipo_factura,
base_imponible, cuota_iva, importe_total, huella_anterior, huella_actual,
xml_generado, enviado_aeat, created_at

Función principal (interna, llamada desde tpv al cobrar):
async def registrar_ticket_verifactu(ticket_id, tenant_id, conn) -> dict
- Obtiene datos del ticket y del tenant (NIF)
- Obtiene la huella del último registro del tenant
- Genera número de serie con generar_numero_serie()
- Calcula IVA (10% hostelería por defecto, configurable)
- Genera huella SHA-256 con verifactu_engine.generar_huella()
- Genera XML SOAP con verifactu_engine.generar_xml_soap()
- Inserta en verifactu_registros
- Devuelve el registro completo con QR URL

Endpoints públicos (requieren rol director o admin):
- GET /api/verifactu/registros — listado paginado, filtro por fecha
- GET /api/verifactu/registros/{id} — detalle con XML completo
- GET /api/verifactu/verificar-cadena — audita integridad de toda la cadena
  (recalcula todos los hashes y verifica que coinciden)
- POST /api/verifactu/anular/{registro_id} — genera registro de anulación
  (no borra el original — crea nuevo con tipo R1 y importes en negativo)
- GET /api/verifactu/exportar — CSV con todos los registros para inspección

IMPORTANTE: los registros Verifactu son INMUTABLES. 
Nunca hacer UPDATE ni DELETE en verifactu_registros.
Solo INSERTs.
```

### Paso 3 — Instalar qrcode

```bash
pip install qrcode[pil]
```

Agrega a requirements.txt:
```
qrcode[pil]==7.4.2
Pillow==10.3.0
```

### Paso 4 — Test del hash

Antes de continuar, verifica que el hash es correcto:

```bash
cd backend
python services/verifactu_engine.py
```

El bloque `if __name__ == "__main__"` debe ejecutar un hash de prueba. Verifica que:
- El resultado es una cadena de 64 caracteres hexadecimales en mayúsculas
- Dos ejecuciones con los mismos datos dan exactamente el mismo hash
- Cambiar cualquier carácter de los datos cambia el hash completamente

**Esto es lo más importante de todo el proyecto técnicamente. Si el hash está mal, los registros fiscales son inválidos.**

### Paso 5 — Integrar Verifactu en el cobro

En `routers/tpv.py`, en el endpoint `POST /api/tpv/tickets/{id}/cobrar`, después de cambiar el estado del ticket a 'cobrado', añade:

```python
# Generar registro Verifactu en la misma transacción
from routers.verifactu import registrar_ticket_verifactu
verifactu_registro = await registrar_ticket_verifactu(ticket_id, user["tenant_id"], conn)
```

Si Verifactu falla → el cobro hace rollback. El ticket no se marca como cobrado si el registro fiscal no se generó correctamente.

### Paso 6 — Commit

```bash
git add .
git commit -m "feat: Verifactu — SHA-256 hash chaining, XML SOAP, QR"
```

---

## 8. FRONTEND — SETUP

### Paso 1 — Crear proyecto React con Vite

```bash
cd horecaso
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

### Paso 2 — Instalar dependencias

```bash
npm install axios
npm install lucide-react
npm install framer-motion
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install react-router-dom
```

### Paso 3 — Instalar y configurar Tailwind CSS 4

```bash
npm install tailwindcss @tailwindcss/vite
```

En `vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

En `src/index.css`, reemplaza todo el contenido con:
```css
@import "tailwindcss";
```

### Paso 4 — Crear .env

```bash
# frontend/.env
VITE_API_URL=http://127.0.0.1:8000/api
```

### Paso 5 — Crear .env.example

```bash
# frontend/.env.example
VITE_API_URL=http://127.0.0.1:8000/api
```

### Paso 6 — Crear vercel.json

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 9. FRONTEND — AUTH Y LAYOUT

### Paso 1 — API client con interceptor JWT

Prompt para Cursor:

```
Crea frontend/src/services/api.js

Cliente Axios para HorecaSO con estas características:
- baseURL desde import.meta.env.VITE_API_URL
- timeout 60000ms (Supabase free tier puede tardar)
- Interceptor de request: añade Authorization: Bearer token desde localStorage
  La clave en localStorage es 'horecaso_user', contiene objeto con campo 'token'
- Interceptor de response:
  - 401 en /auth/login, /auth/verify, /auth/perfil → limpiar localStorage y redirigir a /login
  - 401 en otros endpoints → solo console.warn, NO expulsar usuario
  - 403 → mostrar mensaje del servidor (error o detail)
  - Timeout → console.warn sin expulsar

Esta lógica del 401 es crítica — un interceptor mal hecho expulsa usuarios con token válido.
```

### Paso 2 — AuthContext

Prompt para Cursor:

```
Crea frontend/src/context/AuthContext.jsx

Context de autenticación global para HorecaSO:

Estado: { user, loading, isAuthenticated }

user contiene: { id, nombre, email, rol, tenant_id, outlet_id, token }

Funciones:
- login(email, password) → llama POST /auth/login, guarda en localStorage como 'horecaso_user'
- logout() → llama POST /auth/logout, limpia localStorage, redirige a /login
- verificarToken() → al montar, llama GET /auth/verify, si falla limpia y redirige

Roles del sistema: director, jefe_sala, camarero, cocina, almacen, admin

Hook: useAuth() → devuelve el context
```

### Paso 3 — Estructura de rutas y layout

Prompt para Cursor:

```
Crea la estructura de rutas para HorecaSO en frontend/src/App.jsx

Rutas públicas:
- /login → LoginPage

Rutas protegidas (requieren autenticación):
- /director/* → DirectorApp (rol: director, admin)
- /sala/* → SalaApp (rol: director, jefe_sala, admin)
- /tpv → TPVPage (rol: director, jefe_sala, camarero, admin)
- /cocina → CocinaPage (rol: director, cocina, admin)
- /almacen/* → AlmacenApp (rol: director, almacen, admin)

ProtectedRoute component que:
- Si no autenticado → redirige a /login
- Si autenticado pero rol no permitido → redirige a su página por defecto
- Página por defecto según rol:
  - director → /director/dashboard
  - jefe_sala → /sala/mesas
  - camarero → /tpv
  - cocina → /cocina
  - almacen → /almacen/inventario

Redirigir / automáticamente según el rol del usuario autenticado.
```

### Paso 4 — Página de login

Prompt para Cursor:

```
Crea frontend/src/pages/auth/LoginPage.jsx

Diseño para un ERP de hostelería — oscuro, profesional, limpio.
Colores: fondo muy oscuro (#0a0a0a o similar), acentos en ámbar/naranja (#f59e0b)
para transmitir calor de hostelería pero con seriedad de software de gestión.

Formulario:
- Campo email
- Campo password con toggle ver/ocultar
- Botón "Acceder"
- Estado de carga mientras hace login
- Mensaje de error si credenciales incorrectas

Usa useAuth() para la función login.
Al hacer login exitoso, redirige automáticamente según el rol (lógica en App.jsx).

En la parte inferior: pequeño texto "HorecaSO v1.0 — Sistema de Gestión Hostelería"
Sin logos ni imágenes por ahora.
```

---

## 10. FRONTEND — TPV Y MESAS

### Paso 1 — Vista de mesas

Prompt para Cursor:

```
Crea frontend/src/pages/sala/MesasPage.jsx

Vista del plano de sala para jefe de sala y director.

Datos que carga:
- GET /api/mesas — todas las mesas con estado actual

Visualización:
- Grid de tarjetas, una por mesa
- Color por estado:
  - libre: verde (#10b981)
  - ocupada: rojo (#ef4444)  
  - reservada: amarillo (#f59e0b)
- Cada tarjeta muestra: número de mesa, capacidad, zona, estado
- Si está ocupada: muestra cuánto tiempo lleva (basado en created_at del ticket abierto)
- Click en mesa libre → abre modal para confirmar apertura de ticket
- Click en mesa ocupada → navega al TPV con esa mesa cargada

Filtro por zona arriba: Todas / Interior / Terraza / Barra

Actualización automática cada 30 segundos (para que el estado sea en tiempo real).
```

### Paso 2 — TPV (la pantalla más importante)

Prompt para Cursor:

```
Crea frontend/src/pages/tpv/TPVPage.jsx

Terminal punto de venta táctil para camareros. 
Diseño optimizado para tablet — dos columnas:
- Izquierda (60%): carta de productos
- Derecha (40%): resumen del ticket actual

COLUMNA IZQUIERDA — Carta:
- Tabs de categorías arriba (una por categoría del menú)
- Grid de botones de productos (3 columnas)
- Cada botón: nombre del producto + precio
- Click en producto → añade al ticket

COLUMNA DERECHA — Ticket:
- Nombre de la mesa actual arriba
- Lista de líneas del ticket: producto, cantidad, subtotal
- Controles + y - por línea
- Botón eliminar línea (icono papelera)
- Subtotal, IVA (10%), Total en la parte de abajo
- Botón "COBRAR" grande y destacado en verde

Al pulsar COBRAR:
- Modal de cobro: seleccionar método de pago (Efectivo/Tarjeta/Bizum/Invitación)
- Si efectivo: campo para introducir importe recibido → calcula cambio
- Botón "Confirmar cobro"
- Al confirmar: llamar POST /api/tpv/tickets/{id}/cobrar
- Si éxito: mostrar ticket generado con QR Verifactu, opción de imprimir
- Mesa vuelve a libre

Estado local con useState para el ticket actual.
Carga inicial: GET /api/tpv/carta para productos, 
              GET /api/tpv/tickets/abiertos para ver si hay ticket en esa mesa.
```

### Paso 3 — Dashboard del director

Prompt para Cursor:

```
Crea frontend/src/pages/director/DashboardPage.jsx

Dashboard principal para el director del restaurante.

Datos que carga desde GET /api/dashboard/director:
- ventas_hoy, coste_hoy, margen_hoy, margen_porcentaje
- num_tickets_hoy, ticket_medio
- mesas_ocupadas_ahora, total_mesas
- stock_alertas (productos bajo mínimo)
- top_productos_hoy (array con nombre y cantidad vendida)

Layout:
- Fila superior: 4 KPI cards grandes
  [Ventas hoy] [Coste hoy] [Margen hoy €] [Margen %]
- Segunda fila: 3 cards medianas
  [Tickets hoy] [Ticket medio] [Mesas ocupadas X/Y]
- Tercera fila: dos columnas
  - Izquierda: Top 5 productos del día (lista simple)
  - Derecha: Alertas de stock (lista con nombre + stock actual)

Si margen_porcentaje < 40% → card de margen en rojo
Si entre 40-65% → amarillo  
Si > 65% → verde (semáforo de rentabilidad)

Colores consistentes con el login: oscuro con acentos ámbar.
```

---

## 11. CÓMO USAR CURSOR EN CADA PASO

### La estructura del prompt perfecto

Cada prompt a Cursor debe tener estas partes:

```
1. QUÉ crear (nombre del archivo y su propósito)
2. CONTEXTO (tablas de DB involucradas, con sus columnas)
3. FUNCIONALIDADES (lista concreta de lo que hace)
4. REGLAS DE NEGOCIO (restricciones, validaciones)
5. DEPENDENCIAS (qué otros archivos usa — database.py, auth/dependencies.py)
6. REFERENCIA (si tienes código similar de InfoCampus, pégalo)
```

### Lo que nunca debes hacer con Cursor

- ❌ "Crea el backend completo de HorecaSO"
- ❌ "Crea el módulo de inventario" (demasiado vago)
- ❌ Pedirle que cree 5 archivos en un solo prompt
- ❌ Continuar si el archivo anterior tiene errores

### Lo que siempre debes hacer

- ✅ Un archivo por prompt
- ✅ Probar en /docs antes de pedir el siguiente
- ✅ Pegar el schema de la tabla relevante del PRD en cada prompt
- ✅ Decirle a Cursor "usa el mismo patrón que [pega código de InfoCampus]" cuando sea aplicable
- ✅ Si hay un error: pega el error completo en Cursor, no solo la descripción

### Workflow diario recomendado

```
1. Abre el PRD — identifica qué endpoint o componente toca hoy
2. Abre Cursor
3. Escribe el prompt con el contexto del PRD
4. Revisa el código generado antes de ejecutarlo
5. Prueba en /docs (backend) o en el navegador (frontend)
6. Si funciona → commit
7. Siguiente
```

---

## 12. CHECKLIST DE LA FASE 1

Antes de considerar la Fase 1 completa, verifica cada punto:

### Backend
- [ ] `uvicorn main:app --reload` arranca sin errores
- [ ] GET /api/health devuelve `{"status": "ok", "database": "connected"}`
- [ ] POST /api/auth/login devuelve JWT con credenciales correctas
- [ ] POST /api/auth/login devuelve 401 con credenciales incorrectas
- [ ] GET /api/auth/perfil devuelve datos del usuario con token válido
- [ ] GET /api/auth/perfil devuelve 401 sin token
- [ ] GET /api/mesas devuelve mesas del outlet del usuario
- [ ] POST /api/tpv/tickets crea ticket y asocia mesa
- [ ] POST /api/tpv/tickets/{id}/lineas añade líneas correctamente
- [ ] POST /api/tpv/tickets/{id}/cobrar:
  - [ ] Cambia estado ticket a 'cobrado'
  - [ ] Cambia estado mesa a 'libre'
  - [ ] Genera registro en verifactu_registros
  - [ ] El hash SHA-256 es válido (64 caracteres hex mayúsculas)
  - [ ] El hash_anterior apunta al hash del registro anterior del mismo tenant
- [ ] GET /api/verifactu/verificar-cadena devuelve cadena íntegra

### Frontend
- [ ] `npm run dev` arranca sin errores
- [ ] Login con credenciales correctas → redirige al dashboard correcto por rol
- [ ] Login con credenciales incorrectas → muestra error, no crash
- [ ] Logout → limpia sesión y redirige a /login
- [ ] Mesas se cargan con estado correcto (colores por estado)
- [ ] TPV carga la carta por categorías
- [ ] Añadir producto al ticket → aparece en la lista derecha
- [ ] Cobrar ticket → genera registro y libera mesa
- [ ] Director puede ver el dashboard con KPIs del día

### Integración end-to-end
- [ ] Flujo completo funciona: Login → Mesa → Añadir productos → Cobrar → Mesa libre → Registro Verifactu generado

---

## 13. ERRORES COMUNES Y CÓMO EVITARLOS

### Error 1 — "prepared statement does not exist" en Supabase

**Causa:** asyncpg sin `statement_cache_size=0`  
**Solución:** Verificar que en `database.py` el pool se crea con `statement_cache_size=0`

### Error 2 — CORS error en el frontend

**Causa:** `ALLOWED_ORIGINS` no incluye `http://localhost:5173`  
**Solución:** En `backend/.env` → `ALLOWED_ORIGINS=http://localhost:5173`

### Error 3 — 401 en todos los endpoints aunque el token sea válido

**Causa:** El token tiene `user_id` pero la query busca por `id` (o viceversa)  
**Solución:** Verificar en `auth/dependencies.py` que el campo del payload coincide con la columna de la tabla

### Error 4 — El hash Verifactu cambia entre ejecuciones con los mismos datos

**Causa:** Encoding inconsistente o campo de timestamp no es determinista  
**Solución:** El timestamp debe ser el `created_at` del registro, no `datetime.now()` en el momento del hash

### Error 5 — React: "Cannot read properties of null"

**Causa:** El componente intenta renderizar datos antes de que carguen  
**Solución:** Siempre verificar `if (!data) return <Loader />` antes de renderizar

### Error 6 — TypeError: float object is not subscriptable (en cálculos financieros)

**Causa:** Mezclar `float` con `Decimal`  
**Solución:** Nunca usar `float` para dinero. Siempre `Decimal("valor")` desde el inicio

### Error 7 — Mesa no se libera al cobrar

**Causa:** La actualización de mesa y el cobro no están en la misma transacción  
**Solución:** Todo debe ocurrir dentro del mismo `async with get_db() as conn:` usando `conn.transaction()`

---

## 14. DEPLOY DE LA FASE 1

Solo haz deploy cuando el checklist de la Fase 1 esté 100% completo en local.

### Backend en Render

1. Crea cuenta en render.com
2. New → Web Service → conecta repo GitHub
3. Configuración:

| Campo | Valor |
|-------|-------|
| Root Directory | `horecaso` |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `cd backend && gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120` |
| Health Check Path | `/api/health` |

4. Variables de entorno en Render Dashboard:

```
DATABASE_URL     → tu Supabase URL (puerto 5432, NO 6543)
SECRET_KEY_AUTH  → python -c "import secrets; print(secrets.token_hex(32))"
ALGORITHM        → HS256
ACCESS_TOKEN_EXPIRE_MINUTES → 1440
ALLOWED_ORIGINS  → (lo agregas después con la URL de Vercel)
APP_NAME         → HorecaSO ERP
APP_VERSION      → 1.0.0
```

5. Deploy → espera 3-5 minutos
6. Verifica: `https://tu-app.onrender.com/api/health`

### Frontend en Vercel

1. Crea cuenta en vercel.com
2. New Project → importa repo GitHub
3. Configuración:

| Campo | Valor |
|-------|-------|
| Root Directory | `frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

4. Variable de entorno:
```
VITE_API_URL → https://tu-app.onrender.com/api
```

5. Deploy → copia la URL de Vercel
6. Vuelve a Render → agrega `ALLOWED_ORIGINS` con la URL de Vercel
7. Redeploy el backend

### Verificación final post-deploy

- [ ] `https://tu-api.onrender.com/api/health` → OK
- [ ] `https://tu-app.vercel.app/login` → carga la página
- [ ] Login funciona en producción
- [ ] Cobrar un ticket en producción genera registro Verifactu

---

## APÉNDICE — Comandos útiles

```bash
# Arrancar backend en desarrollo
cd backend && uvicorn main:app --reload

# Arrancar frontend en desarrollo
cd frontend && npm run dev

# Commit rápido
git add . && git commit -m "feat: descripción de lo que hiciste"

# Ver logs de Supabase
# Supabase Dashboard → Logs → Postgres

# Verificar hash SHA-256 manualmente
python -c "import hashlib; print(hashlib.sha256('texto'.encode('utf-8')).hexdigest().upper())"

# Generar secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Instalar nueva dependencia y actualizar requirements
pip install nombre-paquete && pip freeze | grep nombre-paquete >> requirements.txt
```

---

*Guía v1.0 — HorecaSO — Arin Romero — Marzo 2026*  
*Actualizar esta guía al iniciar cada nueva fase.*
