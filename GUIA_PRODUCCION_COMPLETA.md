# HorecaSO — Guía Completa de Producción
## Deploy · Seguridad · Offline · Errores · Tenants
**Fecha:** 24/03/2026 | **Versión:** 1.0

---

## ÍNDICE

1. [Qué falta para desplegar](#1-qué-falta-para-desplegar)
2. [Cómo hackear tu propio sistema](#2-cómo-hackear-tu-propio-sistema)
3. [Funcionamiento sin internet](#3-funcionamiento-sin-internet)
4. [Lista extensa de errores y soluciones](#4-lista-extensa-de-errores-y-soluciones)
5. [Cómo crear y gestionar tenants](#5-cómo-crear-y-gestionar-tenants)

---

# 1. QUÉ FALTA PARA DESPLEGAR

## 1.1 Checklist técnico — lo que bloquea producción

### 🔴 CRÍTICO — sin esto no despliegues

| # | Qué | Dónde | Cómo verificar |
|---|-----|-------|----------------|
| 1 | Migración KDS aplicada en Supabase | `backend/sql/migration_kds_barra_destino.sql` | `GET /api/kds/comandas` responde 200 |
| 2 | Variables de entorno en Render | Dashboard Render | `GET /api/health` responde OK |
| 3 | `SECRET_KEY_AUTH` generada aleatoriamente (no la de dev) | `.env` de Render | Mínimo 32 chars aleatorios |
| 4 | `ALLOWED_ORIGINS` solo con URL de Vercel (no `*`) | `backend/config.py` | CORS rechaza otras origins |
| 5 | OpenAPI `/docs` desactivado en producción | `backend/main.py` | `GET /docs` devuelve 404 en prod |
| 6 | Ningún endpoint sin `require_roles` | grep en `backend/routers/` | Sin 200 sin token en ningún endpoint protegido |
| 7 | `npm run build` sin errores ni warnings | `frontend/` | Build limpio |
| 8 | `python -c "from main import create_app; create_app()"` sin errores | `backend/` | Sin ImportError |
| 9 | Flujo TPV completo funciona: abrir mesa → pedir → cobrar → Verifactu | Manual | Registro en `verifactu_registros` creado |
| 10 | Tenant demo no tiene password `admin123` en producción | Supabase | Cambiar o deshabilitar tenant demo |

### 🟡 IMPORTANTE — despliega pero arréglalo la primera semana

| # | Qué | Impacto |
|---|-----|---------|
| 11 | Panel superadmin no existe | No puedes crear clientes desde UI |
| 12 | Gestión de usuarios por manager no existe | Clientes crean usuarios desde Supabase (manual) |
| 13 | Tenant `restauranteprueba` no creado | Sin entorno de pruebas aislado |
| 14 | PWA (manifest.json) no configurado | No se puede instalar como app en móvil |
| 15 | Headers de seguridad HTTP no configurados | Vulnerabilidad menor pero evitable |
| 16 | Rate limiting sin ajustar para producción | Puede bloquear usuarios legítimos o ser demasiado permisivo |
| 17 | Logs de errores sin monitorización externa | No sabes cuándo falla algo en producción |
| 18 | Backup automático de Supabase no verificado | Riesgo de pérdida de datos |
| 19 | Modal IA proveedores incompleto | Flujo de escaneo facturas a medias |
| 20 | Email SendGrid no configurado | Sin confirmaciones de reservas |

### 🟢 NICE TO HAVE — para después del primer cliente

| # | Qué |
|---|-----|
| 21 | Ticket PDF con QR para el cliente final |
| 22 | Cámara directa móvil en escaneo IA (`capture="environment"`) |
| 23 | Soporte PDF en escaneo IA (ahora solo imágenes) |
| 24 | WebSocket en lugar de polling (necesita Render de pago) |
| 25 | Informes fiscales 303 |
| 26 | Verifactu envío real a AEAT (ahora solo genera el registro) |
| 27 | Multi-outlet por tenant (plan Enterprise) |

---

## 1.2 Pasos exactos de deploy

### Paso 1 — Preparar backend para producción

Añade esto en `backend/main.py` en la función `create_app()`:

```python
# Desactivar /docs en producción
import os
docs_url = None if os.getenv("ENVIRONMENT") == "production" else "/docs"
redoc_url = None if os.getenv("ENVIRONMENT") == "production" else "/redoc"

app = FastAPI(
    title="HorecaSO API",
    docs_url=docs_url,
    redoc_url=redoc_url,
    redirect_slashes=False,
    ...
)
```

Añade headers de seguridad en `main.py`:

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)
```

### Paso 2 — Variables de entorno en Render

```
DATABASE_URL        = postgresql://postgres:[PASS]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
SECRET_KEY_AUTH     = [genera con: python -c "import secrets; print(secrets.token_hex(32))"]
ALGORITHM           = HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 480
ALLOWED_ORIGINS     = https://tu-app.vercel.app
ENVIRONMENT         = production
GROQ_API_KEY        = [tu clave Groq]
SENDGRID_API_KEY    = [tu clave SendGrid cuando lo actives]
APP_NAME            = HorecaSO ERP
APP_VERSION         = 1.0.0
```

### Paso 3 — Configuración Render

```
Root Directory:   backend
Build Command:    pip install -r requirements.txt
Start Command:    gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120
Health Check:     /api/health
```

### Paso 4 — Variables de entorno en Vercel

```
VITE_API_URL = https://tu-backend.onrender.com/api
```

### Paso 5 — Smoke test post-deploy (en orden)

```bash
# 1. Health check
curl https://tu-backend.onrender.com/api/health

# 2. Login
curl -X POST https://tu-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# 3. Guardar el token y probar un endpoint protegido
TOKEN="el_token_del_login"
curl https://tu-backend.onrender.com/api/mesas \
  -H "Authorization: Bearer $TOKEN"

# 4. Verificar que /docs está desactivado
curl https://tu-backend.onrender.com/docs
# Debe devolver 404
```

---

# 2. CÓMO HACKEAR TU PROPIO SISTEMA

## 2.1 Herramientas que necesitas (todas gratuitas)

| Herramienta | Para qué | Instalar |
|-------------|----------|---------|
| **Burp Suite Community** | Interceptar y modificar peticiones HTTP | portswigger.net/burp |
| **OWASP ZAP** | Escáner automático de vulnerabilidades | zaproxy.org |
| **sqlmap** | Detectar inyección SQL automáticamente | sqlmap.org |
| **jwt.io** | Analizar y modificar tokens JWT | jwt.io (web) |
| **Postman** | Probar endpoints con distintos roles | postman.com |
| **curl** | Pruebas rápidas desde terminal | ya instalado |

---

## 2.2 Ataques a probar — listado completo

### ATAQUE 1 — Fuerza bruta en login

**Objetivo:** ver si el rate limiter funciona  
**Herramienta:** curl en bucle

```bash
# Lanza 20 intentos de login fallidos seguidos
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://tu-backend.onrender.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"wrongpassword"}'
done
```

**Resultado esperado:** Los primeros devuelven 401. A partir del 5-10 debe devolver 429 (Too Many Requests).  
**Si todos devuelven 401:** el rate limiter no está funcionando en `/api/auth/login`. Arreglarlo en SlowAPI.

---

### ATAQUE 2 — Acceso sin token

**Objetivo:** verificar que ningún endpoint protegido responde sin JWT

```bash
# Prueba estos endpoints SIN token — todos deben devolver 401
curl https://tu-backend.onrender.com/api/mesas
curl https://tu-backend.onrender.com/api/tpv/tickets
curl https://tu-backend.onrender.com/api/admin/categorias
curl https://tu-backend.onrender.com/api/empleados
curl https://tu-backend.onrender.com/api/nominas
curl https://tu-backend.onrender.com/api/inventario/articulos
curl https://tu-backend.onrender.com/api/verifactu/registros
curl https://tu-backend.onrender.com/api/dashboard/director
curl https://tu-backend.onrender.com/api/clientes
curl https://tu-backend.onrender.com/api/reservas
curl https://tu-backend.onrender.com/api/reportes/inventario
```

**Resultado esperado:** todos devuelven 401.  
**Si alguno devuelve 200:** ese endpoint le falta `require_roles`. Es una vulnerabilidad crítica.

---

### ATAQUE 3 — Escalada de privilegios (rol bajo intenta acceder a zona de rol alto)

**Objetivo:** un camarero no puede ver nóminas ni analytics

```bash
# Login como camarero
TOKEN_CAMARERO=$(curl -s -X POST .../api/auth/login \
  -d '{"email":"carlos@prueba.com","password":"Carlos1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Intentar acceder a zonas prohibidas — todos deben dar 403
curl -H "Authorization: Bearer $TOKEN_CAMARERO" \
  https://tu-backend.onrender.com/api/nominas

curl -H "Authorization: Bearer $TOKEN_CAMARERO" \
  https://tu-backend.onrender.com/api/dashboard/director

curl -H "Authorization: Bearer $TOKEN_CAMARERO" \
  https://tu-backend.onrender.com/api/admin/categorias

curl -H "Authorization: Bearer $TOKEN_CAMARERO" \
  https://tu-backend.onrender.com/api/empleados

curl -H "Authorization: Bearer $TOKEN_CAMARERO" \
  https://tu-backend.onrender.com/api/verifactu/registros
```

**Resultado esperado:** todos devuelven 403.

---

### ATAQUE 4 — Cruce de tenants (el más crítico)

**Objetivo:** un usuario del tenant A NO puede ver datos del tenant B

```bash
# Login con admin del tenant A (tu tenant demo)
TOKEN_A=$(curl -s -X POST .../api/auth/login \
  -d '{"email":"admin@test.com","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Login con admin del tenant B (restauranteprueba)
TOKEN_B=$(curl -s -X POST .../api/auth/login \
  -d '{"email":"admin@prueba.com","password":"Admin1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Con token del tenant A, intentar acceder a recursos con IDs del tenant B
# Sustituye MESA_ID_TENANT_B por una mesa real del tenant B
MESA_ID_TENANT_B="uuid-de-mesa-del-tenant-b"

curl -H "Authorization: Bearer $TOKEN_A" \
  https://tu-backend.onrender.com/api/mesas/$MESA_ID_TENANT_B

# También probar con tickets, empleados, clientes del otro tenant
```

**Resultado esperado:** 403 o 404 (no debe devolver el recurso del otro tenant).  
**Si devuelve 200 con datos:** VULNERABILIDAD CRÍTICA. El endpoint no filtra por `tenant_id`.

---

### ATAQUE 5 — Manipulación de JWT

**Objetivo:** modificar el token para cambiar el rol o el tenant_id

**Usando jwt.io:**
1. Ve a jwt.io
2. Pega tu token JWT
3. En el payload, cambia `"role": "camarero"` por `"role": "admin"`
4. Cambia `"tenant_id"` al de otro tenant
5. Copia el token modificado
6. Úsalo en una petición

```bash
TOKEN_MANIPULADO="el_token_que_modificaste_en_jwt.io"
curl -H "Authorization: Bearer $TOKEN_MANIPULADO" \
  https://tu-backend.onrender.com/api/nominas
```

**Resultado esperado:** 401 (firma inválida — el token fue modificado sin la `SECRET_KEY_AUTH`).  
**Si devuelve 200:** VULNERABILIDAD CRÍTICA. La verificación de firma JWT no funciona.

---

### ATAQUE 6 — Inyección SQL

**Objetivo:** ver si los campos de texto ejecutan SQL

```bash
# Intenta inyectar SQL en campos de búsqueda
TOKEN="tu_token_admin"

# En búsqueda de clientes
curl -H "Authorization: Bearer $TOKEN" \
  "https://tu-backend.onrender.com/api/clientes?buscar='; DROP TABLE clientes; --"

# En búsqueda de productos
curl -H "Authorization: Bearer $TOKEN" \
  "https://tu-backend.onrender.com/api/admin/productos?buscar=' OR '1'='1"

# En campos numéricos
curl -H "Authorization: Bearer $TOKEN" \
  "https://tu-backend.onrender.com/api/mesas/1' OR '1'='1/estado"
```

**Resultado esperado:** 422 (validación Pydantic) o resultados vacíos. Nunca debe ejecutar el SQL inyectado.  
**Si la tabla desaparece o devuelve todos los registros:** VULNERABILIDAD CRÍTICA. Revisar uso de f-strings en SQL.

---

### ATAQUE 7 — Inyección en campos JSON (payload)

```bash
TOKEN="tu_token_admin"

# Intentar inyectar en creación de producto
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Producto\"; DROP TABLE productos; --",
    "precio": "1 OR 1=1",
    "categoria_id": "00000000-0000-0000-0000-000000000000; SELECT * FROM usuarios"
  }' \
  https://tu-backend.onrender.com/api/admin/productos
```

**Resultado esperado:** 422 o 400. Los datos se guardan como texto literalmente o son rechazados por validación.

---

### ATAQUE 8 — Acceso a datos de otros usuarios del mismo tenant

**Objetivo:** un camarero no puede ver datos de otro camarero del mismo tenant

```bash
# Con token de camarero, intentar ver/editar el perfil de otro usuario
TOKEN_CAMARERO="token_del_camarero"
ID_OTRO_USUARIO="uuid-del-director"

curl -H "Authorization: Bearer $TOKEN_CAMARERO" \
  https://tu-backend.onrender.com/api/admin/usuarios/$ID_OTRO_USUARIO

# Intentar cambiar su propio rol
curl -X PUT -H "Authorization: Bearer $TOKEN_CAMARERO" \
  -H "Content-Type: application/json" \
  -d '{"rol": "admin"}' \
  https://tu-backend.onrender.com/api/admin/usuarios/$ID_OTRO_USUARIO
```

**Resultado esperado:** 403 en ambos.

---

### ATAQUE 9 — Payload enorme (DoS básico)

**Objetivo:** ver si el backend tiene límite de tamaño de request

```bash
# Genera un payload de 10MB
python3 -c "print('A' * 10000000)" > payload_grande.txt

curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "@payload_grande.txt" \
  https://tu-backend.onrender.com/api/admin/productos
```

**Resultado esperado:** 413 (Request Entity Too Large) o 422.  
**Si el servidor tarda mucho o da 500:** añadir límite en FastAPI:

```python
# En main.py
from fastapi import FastAPI
app = FastAPI()
# Añadir límite de 5MB
from starlette.middleware.base import BaseHTTPMiddleware
```

O configurar en el proxy de Render (límite por defecto suele ser suficiente).

---

### ATAQUE 10 — Path traversal

**Objetivo:** acceder a archivos del sistema a través de parámetros de ruta

```bash
TOKEN="tu_token"

# Intentar path traversal en endpoints que aceptan IDs
curl -H "Authorization: Bearer $TOKEN" \
  "https://tu-backend.onrender.com/api/reportes/../../../etc/passwd"

curl -H "Authorization: Bearer $TOKEN" \
  "https://tu-backend.onrender.com/api/mesas/../../../../etc/hosts"
```

**Resultado esperado:** 404 o 422. FastAPI con UUIDs como tipo de parámetro rechaza esto automáticamente.

---

### ATAQUE 11 — Enumeración de usuarios

**Objetivo:** ver si el mensaje de error del login revela si un email existe

```bash
# Email que existe
curl -X POST .../api/auth/login \
  -d '{"email":"admin@test.com","password":"wrongpass"}'

# Email que no existe  
curl -X POST .../api/auth/login \
  -d '{"email":"noexiste@fake.com","password":"wrongpass"}'
```

**Resultado esperado:** AMBOS deben devolver exactamente el mismo mensaje: `{"detail": "Credenciales incorrectas"}` y el mismo código 401.  
**Si uno dice "usuario no encontrado" y el otro "contraseña incorrecta":** estás revelando qué emails están registrados. Unificar el mensaje.

---

### ATAQUE 12 — Tokens después de logout

**Objetivo:** verificar que un token usado después de logout no funciona

```bash
# Login → guardar token → logout → usar token guardado
TOKEN=$(... login ...)

# Logout
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://tu-backend.onrender.com/api/auth/logout

# Intentar usar el token después del logout
curl -H "Authorization: Bearer $TOKEN" \
  https://tu-backend.onrender.com/api/mesas
```

**Resultado esperado:** 401 después del logout.  
**Importante:** JWT es stateless por naturaleza. Si no tienes una blacklist de tokens o no invalidas por sesión, el token seguirá siendo válido hasta expirar. Solución recomendada: tokens con expiración corta (8h) y refresh tokens, o blacklist en Redis/BD.

---

### ATAQUE 13 — CORS — peticiones desde origen no autorizado

**Objetivo:** verificar que CORS rechaza peticiones de dominios no autorizados

```bash
# Simula una petición desde un dominio malicioso
curl -H "Origin: https://sitio-malicioso.com" \
  -H "Authorization: Bearer $TOKEN" \
  https://tu-backend.onrender.com/api/mesas
```

**Resultado esperado:** la respuesta NO debe incluir `Access-Control-Allow-Origin: https://sitio-malicioso.com`.  
El navegador bloqueará la petición (aunque curl no lo haga, el navegador sí).

---

### ATAQUE 14 — Escaneo automático con OWASP ZAP

1. Instala OWASP ZAP
2. Ve a `Automated Scan`
3. URL objetivo: `https://tu-backend.onrender.com`
4. Selecciona `Standard Scan`
5. Lanza el escaneo
6. Revisa los resultados — categorías:
   - **High:** arreglar inmediatamente
   - **Medium:** arreglar antes del primer cliente de pago
   - **Low:** arreglar en la primera semana

---

### ATAQUE 15 — Verificar que Verifactu no se puede manipular

```bash
TOKEN_ADMIN="tu_token_admin"

# Intentar hacer UPDATE en verifactu_registros (debe fallar en BD)
# No hay endpoint para esto, pero verifica que no exista accidentalmente
curl -X PUT -H "Authorization: Bearer $TOKEN_ADMIN" \
  "https://tu-backend.onrender.com/api/verifactu/registros/ALGUN-UUID" \
  -d '{"huella_actual": "000000000000"}'

curl -X DELETE -H "Authorization: Bearer $TOKEN_ADMIN" \
  "https://tu-backend.onrender.com/api/verifactu/registros/ALGUN-UUID"
```

**Resultado esperado:** 404 o 405. No debe existir ningún endpoint PUT/DELETE en verifactu.

---

## 2.3 Script de pruebas de seguridad automatizado

Guarda esto como `tests/security_test.sh` y ejecútalo contra tu entorno de pruebas:

```bash
#!/bin/bash
# HorecaSO Security Test Script
# Uso: ./security_test.sh https://tu-backend.onrender.com

BASE_URL=$1
PASS=0
FAIL=0

check() {
  local desc=$1
  local expected=$2
  local actual=$3
  
  if [ "$actual" = "$expected" ]; then
    echo "✅ PASS: $desc"
    ((PASS++))
  else
    echo "❌ FAIL: $desc (esperado: $expected, obtenido: $actual)"
    ((FAIL++))
  fi
}

echo "=== HorecaSO Security Tests ==="
echo "Target: $BASE_URL"
echo ""

# Test 1: Health check
CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)
check "Health check responde" "200" "$CODE"

# Test 2: /docs desactivado
CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/docs)
check "/docs desactivado en producción" "404" "$CODE"

# Test 3: Endpoints sin token devuelven 401
for endpoint in /api/mesas /api/empleados /api/nominas /api/clientes /api/reservas; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL$endpoint)
  check "Sin token: $endpoint devuelve 401" "401" "$CODE"
done

# Test 4: Login incorrecto devuelve 401
CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"noexiste@fake.com","password":"wrong"}')
check "Login con credenciales incorrectas devuelve 401" "401" "$CODE"

echo ""
echo "=== Resultado: $PASS passed, $FAIL failed ==="
```

---

# 3. FUNCIONAMIENTO SIN INTERNET

## 3.1 La realidad del problema

Tu sistema actual es 100% online. Si el restaurante pierde internet:
- El frontend carga (si ya estaba abierto en el navegador)
- El backend NO responde (está en Render, en la nube)
- **Resultado: el TPV no funciona**

Para un restaurante, esto es catastrófico en hora punta.

## 3.2 Opciones disponibles — de más simple a más compleja

### OPCIÓN A — PWA con modo offline básico (recomendada para empezar)

**Qué cubre:** la app se instala en el dispositivo y carga aunque no haya internet. Los datos quedan en caché.

**Qué NO cubre:** no puedes cobrar tickets nuevos ni sincronizar con la BD.

**Implementación:**

#### 1. Crear `frontend/public/manifest.json`

```json
{
  "name": "HorecaSO",
  "short_name": "HorecaSO",
  "description": "ERP para hostelería",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f1117",
  "theme_color": "#f59e0b",
  "orientation": "landscape",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### 2. Registrar Service Worker en `frontend/src/main.jsx`

```jsx
// Al final del archivo, después de createRoot
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registrado'))
      .catch(err => console.log('SW error:', err))
  })
}
```

#### 3. Crear `frontend/public/sw.js`

```javascript
const CACHE_NAME = 'horecaso-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// Instalar: cachear assets estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  )
})

// Activar: limpiar caché vieja
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  )
})

// Fetch: responder con caché si no hay red
self.addEventListener('fetch', event => {
  // Solo cachear GET
  if (event.request.method !== 'GET') return

  // No cachear peticiones al API (son datos en tiempo real)
  if (event.request.url.includes('/api/')) {
    return // Deja pasar al network — si falla, falla
  }

  // Para assets estáticos: cache first
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  )
})
```

#### 4. Añadir link al manifest en `frontend/index.html`

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#f59e0b">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

---

### OPCIÓN B — Cola de operaciones offline (modo intermedio)

**Qué cubre:** el camarero puede seguir añadiendo líneas a un ticket aunque se corte internet. Cuando vuelve la conexión, sincroniza automáticamente.

**Cómo funciona:**

```javascript
// frontend/src/utils/offlineQueue.js

const QUEUE_KEY = 'horecaso_offline_queue'

export const offlineQueue = {
  // Añadir operación a la cola
  push(operation) {
    const queue = this.getAll()
    queue.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...operation
    })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  },

  // Obtener toda la cola
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    } catch {
      return []
    }
  },

  // Limpiar operaciones procesadas
  remove(id) {
    const queue = this.getAll().filter(op => op.id !== id)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  },

  // Tamaño de la cola
  size() {
    return this.getAll().length
  }
}

// Detector de conectividad
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineQueue() // Sincronizar cuando vuelva la conexión
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// Sincronizar cola cuando vuelve la conexión
export const syncOfflineQueue = async () => {
  const queue = offlineQueue.getAll()
  if (queue.length === 0) return

  console.log(`Sincronizando ${queue.length} operaciones offline...`)
  
  for (const operation of queue) {
    try {
      await executeOperation(operation)
      offlineQueue.remove(operation.id)
    } catch (error) {
      console.error('Error sincronizando operación:', operation.id, error)
      // No eliminar de la cola si falla — reintentar después
    }
  }
}

const executeOperation = async (operation) => {
  const { type, endpoint, method, data } = operation
  const api = (await import('../services/api')).default
  
  switch (method) {
    case 'POST': return api.post(endpoint, data)
    case 'PUT': return api.put(endpoint, data)
    case 'PATCH': return api.patch(endpoint, data)
    default: throw new Error(`Método no soportado en cola offline: ${method}`)
  }
}
```

**Uso en TPVPage:**

```jsx
import { useOnlineStatus, offlineQueue } from '../../utils/offlineQueue'

// En el componente
const isOnline = useOnlineStatus()

// Mostrar indicador de conexión
{!isOnline && (
  <div className="bg-red-500 text-white text-center py-2 text-sm">
    Sin conexión — las operaciones se sincronizarán cuando vuelva internet
    ({offlineQueue.size()} en cola)
  </div>
)}

// Al añadir línea al ticket
const addLineaToTicket = async (producto) => {
  if (!isOnline) {
    // Guardar en cola y mostrar en UI optimistamente
    offlineQueue.push({
      type: 'add_linea',
      endpoint: `/tpv/tickets/${ticketId}/lineas`,
      method: 'POST',
      data: { producto_id: producto.id, cantidad: 1 }
    })
    // Actualizar estado local optimistamente
    setLineas(prev => [...prev, { ...producto, cantidad: 1, _offline: true }])
    return
  }
  // Flujo normal online...
}
```

---

### OPCIÓN C — Backend local con Electron (modo avanzado, para más adelante)

**Qué cubre:** el restaurante instala una app de escritorio que tiene su propio backend local. Funciona 100% sin internet y sincroniza con la nube cuando hay conexión.

**Tecnología:** Electron + SQLite local + sincronización diferencial con Supabase.

**Complejidad:** Alta. No recomendado hasta tener 5+ clientes y flujo de caja estable para dedicarle 2-3 semanas.

---

## 3.3 Recomendación práctica

Para la v1 de producción implementa **Opción A + Opción B**:

1. PWA para que la app se instale y cargue sin internet
2. Cola offline para TPV (añadir líneas) y KDS (cambiar estado de comandas)
3. **Nunca permitir cobro offline** — el cobro y Verifactu requieren servidor
4. Mostrar siempre el indicador de conectividad en la UI
5. Al volver la conexión, sincronizar automáticamente y notificar al usuario

---

# 4. LISTA EXTENSA DE ERRORES Y SOLUCIONES

## 4.1 Errores de base de datos (asyncpg / Supabase)

---

**E-DB-001 — `prepared statement "..." does not exist`**
```
asyncpg.exceptions.InvalidSQLStatementNameError: 
prepared statement "__asyncpg_xxx" does not exist
```
**Causa:** pgbouncer (el proxy de Supabase) en modo transaction no mantiene prepared statements entre conexiones del pool.  
**Solución:**
```python
# En database.py, al crear el pool
pool = await asyncpg.create_pool(
    DATABASE_URL,
    statement_cache_size=0,  ← ESTA LÍNEA
    min_size=2,
    max_size=10
)
```

---

**E-DB-002 — `SSL connection has been closed unexpectedly`**
```
asyncpg.exceptions.ConnectionDoesNotExistError: 
connection was closed in the middle of operation
```
**Causa:** conexión idle cerrada por Supabase después de inactividad.  
**Solución:**
```python
pool = await asyncpg.create_pool(
    DATABASE_URL,
    statement_cache_size=0,
    max_inactive_connection_lifetime=300,  # 5 minutos
    min_size=1,
    max_size=10
)
```

---

**E-DB-003 — `column "xxx" does not exist`**
```
asyncpg.exceptions.UndefinedColumnError: column "destino_kds" does not exist
```
**Causa:** migración SQL no aplicada en Supabase.  
**Solución:** ejecutar la migración correspondiente en Supabase → SQL Editor. Para KDS: `migration_kds_barra_destino.sql`.

---

**E-DB-004 — `relation "xxx" does not exist`**
```
asyncpg.exceptions.UndefinedTableError: relation "platform_logs" does not exist
```
**Causa:** tabla nueva no creada en la BD.  
**Solución:** ejecutar el CREATE TABLE correspondiente en Supabase → SQL Editor.

---

**E-DB-005 — `duplicate key value violates unique constraint`**
```
asyncpg.exceptions.UniqueViolationError: 
duplicate key value violates unique constraint "usuarios_email_key"
```
**Causa:** intentar crear un registro con un valor único que ya existe (email, NIF, etc.).  
**Solución en backend:**
```python
try:
    await conn.execute("INSERT INTO usuarios ...", ...)
except asyncpg.UniqueViolationError:
    raise HTTPException(status_code=409, detail="El email ya está registrado")
```

---

**E-DB-006 — `violates foreign key constraint`**
```
asyncpg.exceptions.ForeignKeyViolationError: 
insert or update on table "tickets" violates foreign key constraint
```
**Causa:** intentar insertar un registro con un ID referenciado que no existe (p.ej. outlet_id inválido).  
**Solución:** verificar que los UUIDs existen antes del INSERT, o capturar la excepción específica.

---

**E-DB-007 — `value too long for type character varying`**
```
asyncpg.exceptions.StringDataRightTruncationError
```
**Causa:** campo de texto más largo que el máximo definido en el schema.  
**Solución:** añadir validación Pydantic con `max_length` antes de llegar a la BD:
```python
class ProductoCreate(BaseModel):
    nombre: str = Field(..., max_length=200)
```

---

**E-DB-008 — Pool agotado (timeout esperando conexión)**
```
asyncpg.exceptions.TooManyConnectionsError
asyncio.TimeoutError: wait_for timeout after 10s
```
**Causa:** demasiadas conexiones simultáneas; el pool se agotó.  
**Solución:** aumentar `max_size` del pool o reducir el tiempo de cada consulta:
```python
pool = await asyncpg.create_pool(
    DATABASE_URL,
    statement_cache_size=0,
    max_size=20,        # Aumentar según plan Supabase
    command_timeout=30  # Timeout por query
)
```

---

**E-DB-009 — `invalid input syntax for type uuid`**
```
asyncpg.exceptions.InvalidTextRepresentationError: 
invalid input syntax for type uuid: "abc123"
```
**Causa:** se pasa un string que no es UUID válido donde se espera UUID.  
**Solución:** usar `uuid.UUID` en los parámetros de ruta FastAPI:
```python
@router.get("/{mesa_id}")
async def get_mesa(mesa_id: uuid.UUID):  # FastAPI valida automáticamente
```

---

**E-DB-010 — `cannot convert between timedelta and time`**
```
asyncpg.exceptions.DataError: 
invalid value for parameter "time_column"
```
**Causa:** asyncpg espera `datetime.time` para columnas TIME, no string `'14:00:00'`.  
**Solución:**
```python
from datetime import time

def _parse_hora_time(hora_str: str) -> time:
    """Convierte '14:00' o '14:00:00' a datetime.time"""
    if hora_str is None:
        return None
    parts = hora_str.split(':')
    return time(int(parts[0]), int(parts[1]))
```

---

## 4.2 Errores de autenticación y autorización

---

**E-AUTH-001 — 307 Temporary Redirect en GET /api/mesas**
```
HTTP 307 Temporary Redirect
Location: /api/mesas/
```
**Causa:** FastAPI por defecto redirige URLs sin `/` final.  
**Solución:**
```python
app = FastAPI(redirect_slashes=False, ...)
```

---

**E-AUTH-002 — 403 con rol admin en endpoints de listado**
```
HTTP 403 Forbidden
{"detail": "No tienes permiso para acceder a este recurso"}
```
**Causa:** `require_roles` con lista incompleta que no incluye `admin`.  
**Solución:** revisar cada `require_roles([...])` y asegurarse de incluir todos los roles que deben tener acceso. En listados operativos incluir siempre `admin`.

---

**E-AUTH-003 — Token expirado (401 después de muchas horas)**
```
HTTP 401 Unauthorized
{"detail": "Token expirado"}
```
**Causa:** el JWT expiró según `ACCESS_TOKEN_EXPIRE_MINUTES`.  
**Solución en frontend:** el interceptor de Axios ya lo maneja (borra token y redirige a login). Si quieres evitar que el usuario pierda trabajo, implementar refresh token automático:
```javascript
// En api.js, en el interceptor de respuesta
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Borrar token y redirigir
      localStorage.removeItem('horecaso_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

---

**E-AUTH-004 — 405 Method Not Allowed en GET /api/empleados**
```
HTTP 405 Method Not Allowed
```
**Causa:** con `redirect_slashes=False`, si el router solo tiene `@get("/")` y no `@get("")`, la URL sin barra final no es atendida.  
**Solución:** patrón de doble ruta:
```python
@router.get("")
@router.get("/", include_in_schema=False)
async def list_empleados(...):
    ...
```

---

**E-AUTH-005 — bcrypt error con passlib 1.7.4**
```
AttributeError: module 'bcrypt' has no attribute '__about__'
```
**Causa:** bcrypt 4.x no es compatible directamente con passlib 1.7.4.  
**Solución:** shim en `main.py`:
```python
import bcrypt
if not hasattr(bcrypt, '__about__'):
    bcrypt.__about__ = type('about', (), {'__version__': bcrypt.__version__})()
```

---

**E-AUTH-006 — CORS error en el navegador**
```
Access to XMLHttpRequest at 'https://backend.onrender.com/api/...' 
from origin 'https://frontend.vercel.app' has been blocked by CORS policy
```
**Causa:** `ALLOWED_ORIGINS` no incluye la URL exacta del frontend.  
**Solución:** en Render → Environment:
```
ALLOWED_ORIGINS=https://tu-app.vercel.app
```
Y verificar que en `main.py`:
```python
origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 4.3 Errores de lógica de negocio

---

**E-BIZ-001 — Mesa queda ocupada sin ticket activo**
**Causa:** cobro fallido o error antes de liberar la mesa.  
**Solución:** desde `MesasPage.jsx` → botón "Marcar como libre" con confirmación → `PATCH /api/mesas/{id}/estado`.

---

**E-BIZ-002 — Comandas siguen en KDS tras cobrar**
**Causa:** al cobrar, las líneas no se marcan como `servido`.  
**Solución:** en `tpv_cobrar.py`, al completar el cobro:
```python
await conn.execute("""
    UPDATE ticket_lineas 
    SET estado_cocina = 'servido', estado_barra = 'servido'
    WHERE ticket_id = $1 
    AND (enviado_cocina = true OR enviado_barra = true)
""", ticket_id)
```

---

**E-BIZ-003 — Verifactu: huella anterior incorrecta**
**Causa:** el servicio no está tomando el último registro del mismo tenant para encadenar.  
**Solución:** la query de `verifactu_engine.py` debe ordenar por `created_at DESC` y filtrar por `tenant_id`:
```python
ultimo = await conn.fetchrow("""
    SELECT huella_actual FROM verifactu_registros
    WHERE tenant_id = $1
    ORDER BY created_at DESC
    LIMIT 1
""", tenant_id)
```

---

**E-BIZ-004 — Total del ticket no coincide con suma de líneas**
**Causa:** descuento o IVA calculado con float.  
**Solución:** SIEMPRE usar `Decimal`:
```python
from decimal import Decimal, ROUND_HALF_UP
total = sum(
    Decimal(str(linea['precio_unitario'])) * linea['cantidad']
    for linea in lineas
).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
```

---

**E-BIZ-005 — Ticket cobrado cuando sum(pagos) < total**
**Causa:** lógica de cobro que no verifica la suma de pagos parciales.  
**Solución:**
```python
suma_pagos = await conn.fetchval("""
    SELECT COALESCE(SUM(importe), 0) 
    FROM ticket_pagos WHERE ticket_id = $1
""", ticket_id)

if Decimal(str(suma_pagos)) < ticket['total']:
    raise HTTPException(400, "Pagos insuficientes para cubrir el total")
```

---

**E-BIZ-006 — Nómina con SS/IRPF incorrectos**
**Causa:** cálculo con float o porcentajes incorrectos.  
**Solución:** verificar en `nominas_calcular.py`:
```python
SS_EMPLEADO = Decimal('0.0635')    # 6.35%
SS_EMPRESA = Decimal('0.299')      # 29.9%
# IRPF: según tabla AEAT, variable por tramo
```

---

**E-BIZ-007 — Inventario negativo**
**Causa:** movimiento de salida sin verificar stock disponible.  
**Solución:**
```python
stock_actual = await conn.fetchval(
    "SELECT stock_actual FROM articulos WHERE id = $1", articulo_id
)
if cantidad_salida > stock_actual:
    raise HTTPException(400, f"Stock insuficiente. Disponible: {stock_actual}")
```

---

## 4.4 Errores de frontend (React)

---

**E-FE-001 — Pantalla en blanco tras login**
**Causa:** error en el Sidebar (p.ej. `visibleItems` no definido).  
**Síntoma:** la consola del navegador muestra un TypeError.  
**Solución:** siempre añadir fallbacks en el Sidebar:
```jsx
const visibleItems = navItems?.filter(item => 
  item.roles?.includes(user?.role)
) ?? []
```

---

**E-FE-002 — Cannot read properties of null (reading 'map')**
**Causa:** el componente intenta renderizar datos antes de que carguen.  
**Solución:** siempre verificar antes de renderizar:
```jsx
if (loading) return <Loader />
if (!data) return <EmptyState mensaje="No hay datos" />
return data.map(item => ...)
```

---

**E-FE-003 — El modal no cierra tras guardar**
**Causa:** estado del modal no se resetea al hacer submit exitoso.  
**Solución:**
```jsx
const handleSave = async () => {
  try {
    await saveData()
    setShowModal(false)     // ← cerrar modal
    setFormData({})         // ← limpiar formulario
    await refetch()         // ← recargar datos
  } catch (error) {
    setError(error.message) // ← no cerrar si hay error
  }
}
```

---

**E-FE-004 — Selects y filtros se salen del viewport en móvil**
**Causa:** contenedores flex/grid sin `min-w-0`.  
**Solución:**
```jsx
// Contenedor padre
<div className="flex gap-2 min-w-0 max-w-full overflow-x-auto">
  // Cada input/select
  <select className="w-full min-w-0 max-w-full ...">
```

---

**E-FE-005 — Emoji en tabs del TPV o categorías**
**Causa:** emoji guardado en BD en el campo `icono` del nombre.  
**Solución:**
```javascript
// utils/textSanitize.js
export const stripEmojis = (str) => {
  if (!str) return ''
  return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()
}
```

---

**E-FE-006 — Polling KDS/VentaLive sigue corriendo tras salir de la página**
**Causa:** `setInterval` sin cleanup en `useEffect`.  
**Solución:**
```jsx
useEffect(() => {
  const fetchData = async () => { ... }
  fetchData()
  const interval = setInterval(fetchData, 30000)
  return () => clearInterval(interval)  // ← SIEMPRE cleanup
}, [])
```

---

**E-FE-007 — 401 en todas las peticiones aunque el usuario está logueado**
**Causa:** el token no se está incluyendo en el header.  
**Solución:** verificar el interceptor de Axios en `api.js`:
```javascript
api.interceptors.request.use(config => {
  const token = localStorage.getItem('horecaso_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

---

**E-FE-008 — El tema claro/oscuro no persiste al recargar**
**Causa:** `ThemeContext` no lee el valor guardado en localStorage.  
**Solución:**
```jsx
const [theme, setTheme] = useState(() => 
  localStorage.getItem('horecaso_theme') || 'dark'
)
useEffect(() => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem('horecaso_theme', theme)
}, [theme])
```

---

**E-FE-009 — Build de Vite falla con `Cannot find module`**
**Causa:** import con ruta incorrecta tras el split de archivos.  
**Solución:** verificar imports relativos. En subcarpetas:
```javascript
// Desde pages/admin/carta/CartaPage.jsx
import { useCarta } from './hooks/useCarta'           // mismo nivel
import api from '../../../services/api'               // 3 niveles arriba
import { stripEmojis } from '../../../utils/textSanitize'
```

---

**E-FE-010 — Infinite re-render / Too many re-renders**
**Causa:** `useEffect` con dependencia que cambia en cada render (objeto/array).  
**Solución:**
```jsx
// MAL — crea objeto nuevo en cada render
useEffect(() => { fetchData(filters) }, [filters])

// BIEN — usar valores primitivos como dependencias
useEffect(() => { fetchData() }, [filtroFecha, filtroEstado, page])
```

---

## 4.5 Errores de deploy (Render / Vercel)

---

**E-DEPLOY-001 — Build falla en Render: `ModuleNotFoundError`**
**Causa:** dependencia no está en `requirements.txt`.  
**Solución:**
```bash
# En local con el venv activado
pip freeze > requirements.txt
# Verificar que el archivo tiene todas las dependencias
```

---

**E-DEPLOY-002 — Backend en Render se duerme (cold start 30-60s)**
**Causa:** plan gratuito de Render duerme instancias sin tráfico.  
**Solución A (gratis):** usar UptimeRobot para hacer ping cada 14 minutos a `/api/health`.  
**Solución B (de pago):** actualizar a Render Starter ($7/mes) que no tiene sleep.

---

**E-DEPLOY-003 — `ALLOWED_ORIGINS` no funciona después de actualizar**
**Causa:** Render no redesplegó después de cambiar la variable de entorno.  
**Solución:** en Render → Settings → "Manual Deploy" → "Deploy latest commit".

---

**E-DEPLOY-004 — Frontend en Vercel muestra pantalla en blanco**
**Causa:** `VITE_API_URL` no configurada o apunta a URL incorrecta.  
**Solución:** en Vercel → Settings → Environment Variables:
```
VITE_API_URL = https://tu-backend.onrender.com/api
```
Luego: Vercel → Deployments → Redeploy.

---

**E-DEPLOY-005 — 502 Bad Gateway en Render**
**Causa:** el proceso uvicorn crasheó o tardó demasiado en arrancar.  
**Solución:** revisar logs en Render → Logs. Causas comunes:
- Error de importación en `main.py`
- Variable de entorno faltante (`DATABASE_URL`, `SECRET_KEY_AUTH`)
- Timeout en el pool de BD al arrancar

---

**E-DEPLOY-006 — Vercel: rutas React dan 404 al recargar**
**Causa:** Vercel no sabe que es una SPA y busca el archivo físico.  
**Solución:** crear `frontend/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

---

**E-DEPLOY-007 — Render: timeout en requests largos**
```
Error: upstream request timeout
```
**Causa:** generación de PDFs o consultas SQL complejas tardan más de 30s.  
**Solución:** en el Start Command aumentar timeout:
```
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120
```

---

## 4.6 Errores de Verifactu

---

**E-VF-001 — Hash SHA-256 cambia entre ejecuciones con los mismos datos**
**Causa:** el campo de timestamp usa `datetime.now()` en lugar del `created_at` guardado.  
**Solución:** usar SIEMPRE el `created_at` del registro, no la hora actual:
```python
fecha_hora = registro['created_at'].strftime('%Y-%m-%dT%H:%M:%S')
```

---

**E-VF-002 — La cadena de huellas se rompe**
```
{"cadena_integra": false, "primer_error": "registro_id: xxx"}
```
**Causa:** `huella_anterior` de un registro no coincide con `huella_actual` del anterior.  
**Posibles causas:**
- Registro insertado fuera de la transacción normal
- UPDATE en `verifactu_registros` (NUNCA hacer esto)
- Race condition si dos tickets se cobran simultáneamente

**Solución:** el cobro y la inserción en Verifactu deben estar en la misma transacción `get_db()`. El lock en la query del último registro:
```python
ultimo = await conn.fetchrow("""
    SELECT huella_actual FROM verifactu_registros
    WHERE tenant_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE
""", tenant_id)
```

---

**E-VF-003 — Campos con caracteres especiales en el hash**
**Causa:** encoding incorrecto al construir la cadena para el hash.  
**Solución:** la cadena debe ser UTF-8 sin BOM, con `&` entre campos:
```python
cadena = (
    f"NIF={nif}&"
    f"NUMSERIE={num_serie}&"
    f"FECHA={fecha}&"
    f"IMPORTE={importe}&"
    f"HUELLA_ANTERIOR={huella_anterior}"
)
hash_bytes = cadena.encode('utf-8')
huella = hashlib.sha256(hash_bytes).hexdigest().upper()
```

---

## 4.7 Errores de PDF (ReportLab)

---

**E-PDF-001 — `UnicodeEncodeError` en caracteres especiales**
```
UnicodeEncodeError: 'latin-1' codec can't encode character
```
**Causa:** ReportLab con fuente por defecto no soporta caracteres españoles (ñ, á, é...).  
**Solución:** usar fuente con soporte UTF-8:
```python
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
# O usar Helvetica con encoding correcto
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph
# Los Paragraph de ReportLab sí soportan UTF-8
```

---

**E-PDF-002 — PDF vacío o con datos incorrectos**
**Causa:** los datos se pasan en orden incorrecto a la función generadora.  
**Solución:** verificar la firma de la función en `services/pdf_*.py` y el orden de argumentos en el router.

---

## 4.8 Errores de IA (Groq)

---

**E-IA-001 — `429 Too Many Requests` en Groq**
**Causa:** límite de la API gratuita de Groq alcanzado.  
**Solución:** implementar retry con backoff:
```python
import asyncio

async def llamar_groq_con_retry(cliente, payload, max_intentos=3):
    for intento in range(max_intentos):
        try:
            return await cliente.chat.completions.create(**payload)
        except Exception as e:
            if '429' in str(e) and intento < max_intentos - 1:
                await asyncio.sleep(2 ** intento)  # 1s, 2s, 4s
                continue
            raise
```

---

**E-IA-002 — Groq no extrae los datos correctamente de la factura**
**Causa:** imagen de baja calidad o prompt insuficiente.  
**Solución:** mejorar el prompt a Groq y añadir validación del JSON devuelto:
```python
prompt = """
Extrae los datos de esta factura de proveedor.
Devuelve SOLO un JSON válido con esta estructura exacta:
{
  "proveedor": "nombre del proveedor",
  "numero_factura": "número",
  "fecha": "YYYY-MM-DD",
  "total": 0.00,
  "lineas": [
    {"descripcion": "...", "cantidad": 0, "precio_unitario": 0.00, "subtotal": 0.00}
  ]
}
Si no puedes leer algún campo, usa null. NO incluyas texto fuera del JSON.
"""
```

---

# 5. CÓMO CREAR Y GESTIONAR TENANTS

## 5.1 Flujos disponibles ahora (manual via Supabase)

Hasta que implementes el panel superadmin, así es como creas un nuevo cliente:

### Script completo — crear tenant nuevo

Ejecuta esto en **Supabase → SQL Editor** (sustituye los valores en mayúsculas):

```sql
DO $$
DECLARE
  v_tenant_id   UUID := gen_random_uuid();
  v_outlet_id   UUID := gen_random_uuid();
  v_admin_id    UUID := gen_random_uuid();
  
  -- CAMBIA ESTOS VALORES POR LOS DEL CLIENTE
  v_nombre_restaurante TEXT := 'Restaurante El Ejemplo';
  v_nif               TEXT := 'B12345678';
  v_direccion         TEXT := 'Calle Mayor 1, Madrid';
  v_telefono          TEXT := '600000001';
  v_email_negocio     TEXT := 'info@ejemplo.com';
  v_plan              TEXT := 'profesional'; -- basico/profesional/premium/enterprise
  
  v_nombre_outlet     TEXT := 'Sala Principal';
  
  v_nombre_admin      TEXT := 'Manager Ejemplo';
  v_email_admin       TEXT := 'manager@ejemplo.com';
  -- Hash de la password temporal (genera con el script Python de abajo)
  v_password_hash     TEXT := '$2b$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
BEGIN

  -- 1. Crear tenant
  INSERT INTO tenants (id, nombre, nif, direccion, telefono, email, plan, activo, created_at)
  VALUES (v_tenant_id, v_nombre_restaurante, v_nif, v_direccion, 
          v_telefono, v_email_negocio, v_plan, true, NOW());

  -- 2. Crear outlet principal
  INSERT INTO outlets (id, tenant_id, nombre, direccion, num_mesas, capacidad_total, created_at)
  VALUES (v_outlet_id, v_tenant_id, v_nombre_outlet, v_direccion, 10, 40, NOW());

  -- 3. Crear usuario admin del tenant
  INSERT INTO usuarios (id, tenant_id, outlet_id, nombre, email, password_hash, rol, activo, created_at)
  VALUES (v_admin_id, v_tenant_id, v_outlet_id, v_nombre_admin, 
          v_email_admin, v_password_hash, 'admin', true, NOW());

  -- 4. Crear mesas iniciales (10 mesas básicas)
  INSERT INTO mesas (id, outlet_id, numero, capacidad, estado, zona)
  SELECT gen_random_uuid(), v_outlet_id, num, 4, 'libre', 'interior'
  FROM generate_series(1, 10) AS num;

  -- Mostrar los IDs creados
  RAISE NOTICE 'Tenant creado: %', v_tenant_id;
  RAISE NOTICE 'Outlet creado: %', v_outlet_id;
  RAISE NOTICE 'Admin creado: %', v_admin_id;
  RAISE NOTICE 'Email admin: %', v_email_admin;

END $$;
```

---

### Generar el hash de password (Python)

Ejecuta esto en local antes de correr el SQL:

```python
# Guarda como: backend/scripts/hash_password.py
# Uso: python hash_password.py "LaPasswordDelCliente"
import sys
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

if len(sys.argv) < 2:
    print("Uso: python hash_password.py 'password'")
    sys.exit(1)

password = sys.argv[1]
hashed = pwd_context.hash(password)
print(f"\nPassword: {password}")
print(f"Hash:     {hashed}")
print(f"\nCopia este hash en el SQL:")
print(f"v_password_hash TEXT := '{hashed}';")
```

```bash
# Ejecutar
cd backend
python scripts/hash_password.py "TempPass2024!"
```

---

## 5.2 Gestión de usuarios dentro de un tenant (manual por ahora)

Una vez creado el tenant, el admin puede necesitar más usuarios. Hasta que tengas la UI de gestión de usuarios:

```sql
-- Crear usuario adicional en un tenant existente
-- CAMBIA tenant_id, outlet_id y datos del usuario
INSERT INTO usuarios (id, tenant_id, outlet_id, nombre, email, password_hash, rol, activo)
VALUES (
  gen_random_uuid(),
  'UUID-DEL-TENANT',     -- tenant_id del restaurante
  'UUID-DEL-OUTLET',     -- outlet_id del local
  'Carlos García',
  'carlos@restaurante.com',
  '$2b$12$HASH_GENERADO_CON_SCRIPT',
  'camarero',            -- admin/director/jefe_sala/camarero/cocina/barra/almacen
  true
);
```

---

## 5.3 Roles disponibles y qué puede hacer cada uno

| Rol | Módulos accesibles | Cuándo usarlo |
|-----|-------------------|---------------|
| `admin` | Todo del tenant | Dueño del restaurante |
| `director` | Dashboard, analytics, reportes, nóminas, carta, configuración | Director de operaciones |
| `jefe_sala` | Mesas, TPV, reservas, KDS, venta live | Jefe de sala |
| `camarero` | TPV, mesas | Camarero de sala |
| `cocina` | KDS cocina, inventario (lectura), recetas | Cocinero |
| `barra` | KDS barra (bebidas) | Barman |
| `almacen` | Inventario completo, proveedores, mermas, FIFO, APPCC | Encargado de almacén |

---

## 5.4 Activar/desactivar un tenant (manual)

```sql
-- Desactivar tenant (bloquear acceso a todos sus usuarios)
UPDATE tenants SET activo = false WHERE id = 'UUID-DEL-TENANT';

-- También desactivar sus usuarios para que el JWT no funcione
UPDATE usuarios SET activo = false WHERE tenant_id = 'UUID-DEL-TENANT';

-- Reactivar
UPDATE tenants SET activo = true WHERE id = 'UUID-DEL-TENANT';
UPDATE usuarios SET activo = true WHERE tenant_id = 'UUID-DEL-TENANT';
```

**Nota:** para que el desactivado sea inmediato en el backend, el endpoint de login y el de verificación de token deben comprobar `activo = true` tanto en `tenants` como en `usuarios`:

```python
# En auth/dependencies.py, al verificar el token
user = await conn.fetchrow("""
    SELECT u.*, t.activo as tenant_activo
    FROM usuarios u
    JOIN tenants t ON t.id = u.tenant_id
    WHERE u.id = $1 AND u.activo = true AND t.activo = true
""", user_id)

if not user:
    raise HTTPException(status_code=401, detail="Usuario o tenant inactivo")
```

---

## 5.5 Cambiar plan de un tenant

```sql
-- Cambiar plan
UPDATE tenants 
SET plan = 'premium'  -- basico/profesional/premium/enterprise
WHERE id = 'UUID-DEL-TENANT';
```

La lógica de qué módulos están disponibles según el plan la controlas en el frontend (Sidebar muestra u oculta módulos según el plan del tenant). El backend no necesita cambiarse — los módulos existen igualmente, solo se ocultan en la UI.

Alternativamente, añadir validación en el backend por plan:

```python
# Verificar plan antes de acceder a módulos premium
if current_user.get('plan') not in ['premium', 'enterprise']:
    raise HTTPException(403, "Este módulo requiere plan Premium o superior")
```

---

## 5.6 Datos de prueba — tenant restauranteprueba

IDs fijos para que tus tests sean reproducibles:

```sql
-- Tenant restauranteprueba
-- tenant_id: 11111111-1111-1111-1111-111111111111
-- outlet_id: 22222222-2222-2222-2222-222222222222

-- Usuarios de prueba (password: Test1234! para todos)
-- admin@prueba.com    → rol admin
-- director@prueba.com → rol director
-- carlos@prueba.com   → rol camarero
-- luis@prueba.com     → rol cocina
-- ana@prueba.com      → rol barra
-- pedro@prueba.com    → rol almacen
```

Ver script completo en `backend/sql/seed_restauranteprueba.sql`.

---

## 5.7 Workflow recomendado para onboarding de un cliente nuevo

```
1. Cliente firma contrato y paga primer mes
2. Tú ejecutas el SQL de creación de tenant (sección 5.1)
3. Generas la password temporal con el script Python
4. Envías al cliente:
   - URL: https://tu-app.vercel.app
   - Email: manager@surestaurante.com  
   - Password temporal: TempPass2024!
   - Instrucciones: cambiar password en primer login
5. El cliente crea sus usuarios (camareros, cocineros...)
   → Hasta tener UI: tú los creas con el SQL de sección 5.2
   → Cuando tengas panel superadmin: el cliente lo hace solo
6. El cliente configura su carta, mesas y empleados
7. Seguimiento la primera semana
```

---

## 5.8 Monitorización de tenants (sin panel superadmin)

Hasta tener el panel, usa estas queries en Supabase para monitorizar:

```sql
-- Ver todos los tenants activos con su actividad
SELECT 
  t.nombre,
  t.plan,
  t.activo,
  t.created_at,
  COUNT(DISTINCT u.id) as num_usuarios,
  COUNT(DISTINCT tk.id) FILTER (WHERE tk.created_at > NOW() - INTERVAL '30 days') as tickets_ultimo_mes
FROM tenants t
LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.activo = true
LEFT JOIN outlets o ON o.tenant_id = t.id
LEFT JOIN tickets tk ON tk.outlet_id = o.id
GROUP BY t.id, t.nombre, t.plan, t.activo, t.created_at
ORDER BY t.created_at DESC;

-- Ver errores recientes por tenant (cuando tengas platform_logs)
-- Por ahora, usar los logs de Render

-- Ver tenants sin actividad en los últimos 7 días
SELECT t.nombre, t.email, MAX(tk.created_at) as ultimo_ticket
FROM tenants t
JOIN outlets o ON o.tenant_id = t.id
LEFT JOIN tickets tk ON tk.outlet_id = o.id
WHERE t.activo = true
GROUP BY t.id, t.nombre, t.email
HAVING MAX(tk.created_at) < NOW() - INTERVAL '7 days' 
    OR MAX(tk.created_at) IS NULL
ORDER BY ultimo_ticket ASC NULLS FIRST;
```

---

*GUIA_PRODUCCION_COMPLETA.md — HorecaSO — Arin Romero — 24/03/2026*  
*Próxima revisión: tras deploy inicial y primer cliente real*
