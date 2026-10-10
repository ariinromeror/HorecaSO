# Tests backend — HorecaSO

Tests de integración con **pytest + pytest-asyncio + httpx.AsyncClient** contra la app
FastAPI real (`main.app`) y una **BD PostgreSQL de PRUEBA local**.

> Los tests **borran y recrean el esquema `public`** al empezar. Por eso solo pueden
> ejecutarse contra una BD local cuyo nombre contenga `test`. Si `TEST_DATABASE_URL`
> falta o apunta a Supabase / un pooler / un host remoto, la sesión **aborta** antes de
> importar la app (`backend/tests/db_guard.py`). `DATABASE_URL` de `backend/.env`
> nunca se usa en tests.

---

## 1. Instalar dependencias de desarrollo

```powershell
cd backend
pip install -r requirements-dev.txt
```

## 2. Levantar la BD de prueba (elige una)

### Opción A — Docker (recomendada si tienes Docker Desktop)

Desde la raíz del repo:

```powershell
docker compose -f docker-compose.test.yml up -d
$env:TEST_DATABASE_URL = "postgresql://postgres@localhost:54329/horecaso_test"
```

Postgres 15 (misma versión mayor que Supabase), datos en memoria (`tmpfs`): al parar
el contenedor se pierde todo. Parar: `docker compose -f docker-compose.test.yml down`.

### Opción B — Sin Docker (`pgserver`, binarios de Postgres por pip)

```powershell
cd backend
python tests/local_pg.py start          # arranca y crea horecaso_test (1ª vez ~1 min)
$env:TEST_DATABASE_URL = (python tests/local_pg.py url)
```

- Datos en `backend/.pgtest/` (ignorado por git). Borrar la carpeta = BD nueva.
- El puerto cambia en cada arranque: usa siempre `local_pg.py url`.
- Parar: `python tests/local_pg.py stop`.
- `start` copia las zonas horarias del paquete `tzdata` a pgserver (sus binarios de Windows
  no las traen y `AT TIME ZONE 'Europe/Madrid'` fallaría). La BD de tests queda en UTC, como
  Supabase; si falta la zona, la sesión de pytest aborta con un mensaje.

## 3. Ejecutar

```powershell
cd backend
python -m pytest                    # todo
python -m pytest tests/test_smoke.py -v
python -m pytest -k token -v        # por nombre
```

Resultado esperado hoy: **167 passed**.

---

## Estructura

| Archivo | Qué es |
|---|---|
| `backend/pytest.ini` | `asyncio_mode = auto`, `pythonpath = .` |
| `backend/tests/conftest.py` | Guarda de BD, recreación de esquema, pool de la app, limpieza, fixtures |
| `backend/tests/db_guard.py` | Reglas que impiden usar producción |
| `backend/tests/schema.sql` | Esquema `public` (45 tablas, FK, índices) copiado de Supabase, sin datos |
| `backend/tests/factories.py` | Creación de datos de prueba |
| `backend/tests/auth_helpers.py` | Tokens JWT por usuario/rol |
| `backend/tests/local_pg.py` | Postgres local sin Docker |
| `backend/tests/test_infra.py` | Tests de la propia infraestructura |
| `backend/tests/test_smoke.py` | Humo: login → abrir mesa → línea → cobrar |
| `backend/tests/test_hso11_stock_fifo.py` | HSO-11: coherencia FIFO/`stock_actual` (entrada, salida, merma, ajuste, concurrencia) |
| `backend/tests/test_hso11_migracion_reconciliacion.py` | HSO-11: migración de lotes reversible y `reconciliar_stock.py` |
| `backend/tests/test_hso14_indices.py` | HSO-14: los 9 índices de tráfico existen en `pg_indexes` |
| `backend/tests/test_hso18_escaneo_limites.py` | HSO-18: escaneo IA rechaza >8 MB, GIF y varias imágenes |
| `backend/tests/test_hso19_jwt.py` | HSO-19: login emite JWT verificable con PyJWT |
| `backend/tests/test_hso22_23_defensa.py` | HSO-22/23: docs solo en development, CORS vacío ≠ `*`, elaboraciones no cruzan tenant |
| `frontend/scripts/verify_sheetjs.mjs` | HSO-19: SheetJS 0.20.3 CDN; escribir/leer xlsx |

## Aislamiento

- Inicio de sesión: `DROP SCHEMA public CASCADE` + `schema.sql` + las migraciones de
  `backend/sql/` listadas en `MIGRATIONS` de `conftest.py` (las pendientes de ejecutar en
  producción). Si regeneras `schema.sql` después de ejecutarlas, quítalas de la lista.
- Tras **cada** test: `TRUNCATE` de todas las tablas (`RESTART IDENTITY CASCADE`).
- Se limpia en vez de usar una transacción envolvente porque la app abre sus propias
  conexiones del pool y los tests de concurrencia (HSO-02) necesitan commits reales.
- El pool de la app se crea por test (`database.init_connection_pool`), porque
  `ASGITransport` no ejecuta el `lifespan`.

## Fixtures

| Fixture | Devuelve |
|---|---|
| `client` | `httpx.AsyncClient` contra la app (`base_url="http://test"`) |
| `db` | Conexión `asyncpg` directa (autocommit) para preparar y verificar datos |
| `seed` | `SeedWorld` con `a`, `b` (tenants), `superadmin` y `password` |
| `test_password` / `test_password_hash` | Contraseña aleatoria por sesión y su hash bcrypt |

Cada tenant de `seed` (`seed.a`, `seed.b`) trae:

- `outlet_id`; mesas `mesa_libre_id`, `mesa_libre_2_id` (libres) y `mesa_ocupada_id`.
- `usuarios["admin" | "camarero" | "cocina" | "camarero_inactivo"]` (`SeedUser`).
- `productos["menu"]` 12,50 € IVA 10 % (cocina), `productos["cana"]` 2,50 € IVA 21 % (barra).
- `ticket_abierto_id` en la mesa ocupada: 2 × Menú + 2 × Caña = `ticket_abierto_total` 30,00 €,
  con `ticket_abierto_lineas`.

`seed.superadmin` no tiene tenant. Todos los usuarios comparten `seed.password`
(aleatoria, no hay contraseñas en el repo).

## Tokens

```python
from tests.auth_helpers import auth_headers, token_for, expired_token_for

r = await client.get("/api/tpv/tickets", headers=auth_headers(seed.a.usuarios["cocina"]))
# Claims falsos para probar permisos:
h = auth_headers(seed.a.usuarios["camarero"], role="admin")
# Token caducado:
h = auth_headers(expired_token_for(seed.a.usuarios["admin"]))
```

Los claims son los mismos que emite `POST /api/auth/login` (comprobado en
`test_token_helper_igual_que_login`).

## Regenerar `schema.sql` cuando cambie producción

`schema.sql` es una foto del esquema de Supabase (solo estructura). Si se aplica una
migración nueva en producción, aplica también el mismo SQL al final de
`tests/schema.sql`, o regenera completo con `pg_dump` (lectura, versión ≥ servidor):

```powershell
pg_dump "<DATABASE_URL de Supabase>" --schema-only --schema=public --no-owner --no-privileges `
  | Select-String -NotMatch "^(SET|SELECT pg_catalog|CREATE SCHEMA|COMMENT ON SCHEMA)" `
  | Set-Content backend/tests/schema.sql
```

## Escribir un test de bug (auditoría)

1. Usa `seed` + `auth_headers(...)` para preparar el escenario.
2. Si el test reproduce un bug **aún sin arreglar**, márcalo
   `@pytest.mark.xfail(strict=True, reason="HSO-0X ...")`: al arreglarlo pasará a
   XPASS y fallará la suite, recordando quitar el `xfail`.
3. Verifica efectos en la BD con `db.fetchval(...)`, no solo la respuesta HTTP.
