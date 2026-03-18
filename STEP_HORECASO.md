## PRONT
Contexto del proyecto HorecaSO:

Soy Arin Romero, desarrollador autodidacta con 2 meses de experiencia.
Trabajo solo usando IA como herramienta principal (Cursor para código).

Te adjunto estos archivos que definen el proyecto completo:
- .cursorrules → stack, reglas de código, patrones obligatorios
- PRD_HorecaSO.md → arquitectura completa, schema DB, módulos
- GUIA_DESARROLLO_HorecaSO.md → pasos detallados de construcción
- STEP_HORECASO.md → estado actual — qué está hecho y qué falta

STACK: FastAPI + React 19 + PostgreSQL + Supabase + asyncpg (sin ORM)
Deploy: Render (backend) + Vercel (frontend)
NO usar: NestJS, SQLAlchemy, TypeScript en backend, Django

Lee los archivos adjuntos y dime:
1. ¿Entiendes el estado actual del proyecto?
2. El siguiente paso según STEP_HORECASO.md es [ESCRIBE AQUÍ EL PASO ACTUAL]
   Ayúdame a completarlo siguiendo las reglas del .cursorrules.




## DATA 18/03/2026

# HorecaSO — Estado del Proyecto

## ✅ Completado
- Estructura de carpetas creada
- .cursorrules configurado y activo
- Repositorio GitHub creado y conectado
- Supabase configurado — 19 tablas creadas
- backend/config.py creado
- backend/database.py creado
- backend/main.py creado
- backend/requirements.txt creado (incluye email-validator==2.2.0)
- Python 3.12 instalado y .venv activo
- Dependencias instaladas con pip install -r requirements.txt
- Conexión a Supabase funcionando via connection pooler (puerto 6543)
- Uvicorn arrancando correctamente — /api/health responde OK
- backend/auth/__init__.py creado
- backend/auth/schemas.py creado (LoginRequest, TokenResponse)
- backend/auth/jwt_handler.py creado (create_access_token, verify_token)
- backend/auth/dependencies.py creado (get_current_user, require_admin)
- backend/routers/__init__.py creado
- backend/routers/auth.py creado — POST /api/auth/login funcionando
- Usuario admin de prueba creado en Supabase (admin@test.com / admin123)
- Login testeado en /docs — devuelve JWT correcto ✅

## 🔄 En progreso
- Nada en progreso actualmente

## ⬜ Siguiente paso
- Crear routers/tenants.py — CRUD de tenants (solo superadmin)
- Crear routers/outlets.py — CRUD de outlets por tenant
- Crear routers/usuarios.py — CRUD de usuarios con roles
- Crear routers/mesas.py — gestión de mesas por outlet
- Crear routers/menu.py — categorías y productos
- Crear routers/tickets.py — apertura, líneas y cobro de tickets
- Testear cada router en /docs con el JWT obtenido en login

## 📁 Archivos de referencia
- PRD_HorecaSO.md — arquitectura completa y schema DB
- GUIA_DESARROLLO_HorecaSO.md — pasos detallados
- .cursorrules — contexto permanente del proyecto

## 🔧 Notas técnicas importantes
- DATABASE_URL usa el pooler de Supabase: aws-1-eu-west-1.pooler.supabase.com:6543
- statement_cache_size=0 obligatorio en asyncpg (pgbouncer)
- Patrón de conexión: async with get_db() as conn
- SECRET_KEY_AUTH en .env (no SECRET_KEY)
- bcrypt==4.0.1 requiere shim en main.py para compatibilidad con passlib