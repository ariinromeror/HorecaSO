# Checklist Railway Hobby — API 24/7 (Paso 4)

Objetivo: backend siempre despierto (~$5/mes), sin cold start de Render Free.
Frontend sigue en **Vercel**. DB sigue en **Supabase**.

## Preparado en el repo

- [backend/Dockerfile](../backend/Dockerfile)
- [railway.toml](../railway.toml) (raíz)
- Health: `GET /api/health`

## Pasos en Railway (tú + IA)

1. Cuenta en [railway.app](https://railway.app) → plan **Hobby**.
2. **New Project** → **Deploy from GitHub** → repo HorecaSO.
3. Root / Dockerfile: usar `backend/Dockerfile` (o rootDir `backend` si usas Nixpacks).
4. Variables (mismas que Render):
   - `DATABASE_URL` (Supabase pooler)
   - `SECRET_KEY_AUTH`
   - `ALLOWED_ORIGINS` (URL Vercel + localhost si hace falta)
   - `ALGORITHM=HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES=480`
   - `ENVIRONMENT=production`
   - `GROQ_API_KEY` (opcional)
5. Generar dominio público (`*.up.railway.app`).
6. En Vercel: `VITE_API_URL=https://TU-DOMINIO.up.railway.app/api` → redeploy.
7. Smoke:
   - [ ] `GET /api/health` → 200
   - [ ] Login
   - [ ] TPV / KDS
   - [ ] Impresión (PC local + Epson)

## Notas

- No hace falta un Railway por local: **una API** sirve todos los tenants.
- RAM: empieza con lo mínimo (512 MB–1 GB).
- Render Free puede quedar como backup o apagarse cuando Railway esté OK.
