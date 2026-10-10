# HorecaSO — Bugs encontrados y soluciones aplicadas

Registro **dedicado** (fuera del STEP) para ir anotando cada bug, contexto y fix.  
El [STEP_HORECASO.md](STEP_HORECASO.md) mantiene un resumen histórico en *Problemas conocidos*; aquí el detalle vive por **fecha** y se puede enlazar a commit/PR. Índice de docs raíz sincronizado con [BITACORA_HORECASO.md](BITACORA_HORECASO.md) y [SCHEMA_BASE_DATOS.md](SCHEMA_BASE_DATOS.md) (27/03/2026 — incl. BUG-013 / MEJ-008 calibración inventario).

**Para avanzar con el agente:** pedir explícitamente que **lea** (o relea) esta hoja, la [BITACORA_HORECASO.md](BITACORA_HORECASO.md), [STEP_HORECASO.md](STEP_HORECASO.md) y [SCHEMA_BASE_DATOS.md](SCHEMA_BASE_DATOS.md) antes de implementar cambios amplios, para no duplicar fixes ni desalinear BD y código.

---

## Cómo añadir una entrada

1. Nueva fila en la tabla de la **sección activa** (mes actual), o nueva subsección `## AAAA-MM`.
2. Campos: **ID** (opcional, `BUG-001`), **Fecha**, **Módulo**, **Síntoma**, **Causa**, **Solución**, **Estado** (`✅` / `⏳` / `❌ wontfix`).
3. Si el bug está solo **planificado** (sin fix), marcarlo en el plan roadmap (`.cursor/plans/`) y aquí **Estado: ⏳ pendiente**.
4. Para **cambios grandes** (varios archivos), añadir o actualizar la **bitácora detallada** más abajo con lista de archivos y comportamiento.

---

## 2026-10 — Login móvil / Render cold start (05/10/2026)

| ID | Fecha | Módulo | Síntoma | Causa | Solución | Estado |
|----|-------|--------|---------|-------|----------|--------|
| BUG-014 | 05/10/2026 | Auth / Login (móvil) | Al iniciar sesión en móvil aparece error genérico / parece que “falla” | (1) Backend Render free dormido → **502/503** en `/api/health` y `/api/auth/login`. (2) Interceptor axios redirigía a `/login` en **cualquier** 401, incluido fallo de credenciales en `POST /auth/login`, borrando el mensaje de error con `window.location` | Mensajes claros en `LoginPage` para red/502/503; aviso cold start; interceptor **no** redirige en `/auth/login`. **Ops 05/10 tarde:** health **200** OK tras Supabase Healthy + wake Render Free | ✅ FE; ✅ health OK (Free cold start sigue) |
| — | 05/10/2026 | Deploy / Render | `GET …/api/health` 502/503 | Free waking / DB | Reinicio + DB Healthy; verificado **200** `{"status":"ok"}` | ✅ (cold start esperado en Free) |
| MEJ-009 | 05/10/2026 | Piloto | KDS lento / sin feedback envío / sin print Epson / tenants sin fiscal / IVA fijo 10% | Gaps plan piloto cafetería | Paso 3–7: poll 5s, toast, print térmico, tenants+modulos, IVA por línea, fiscal-trimestre, QR cobro | ✅ código; deploy FE/BE pendiente push |
| BUG-015 | 05/10/2026 | Auth / Login | “Entrando…” sin fin / timeout 45s sin entrar | (1) Fichaje auto `await` + axios sin timeout. (2) Uvicorn zombie en `:8000` (CLOSE_WAIT) + `pool.acquire()` sin timeout. (3) `SyntaxError` en `reportes.py` impedía reinicio limpio | FE: fichaje background, timeout axios, mensajes claros. BE: `acquire(timeout=10)`, health `wait_for` 8s, fix syntax PDF cierre, reinicio uvicorn | ✅ |
| BUG-016 | 05/10/2026 | Superadmin / Sidebar | Tenant con módulos desactivados (Kairos solo Sala) seguía viendo todo el menú como admin | (1) `isLoading=false` antes de `getPerfil` → `user.modulos` ausente y filtro “mostrar todo”. (2) Dashboard/Usuarios sin `modulo` | Esperar perfil; `tenantModulos.js`; mapear nav; `ModuloRoute`; parse JSON en `/auth/perfil` | ✅ |
| BUG-017 | 05/10/2026 | Carta / Modal | Nuevo producto no cabe en pantalla; botones Guardar/Cancelar fuera de vista | `CartaModal` sin max-height ni scroll | `max-h` + `overflow-y-auto` en panel; overlay scroll en móvil | ✅ |
| BUG-018 | 05/10/2026 | TPV / Print | Comanda y ticket mostraban UUID corto en vez de «Mesa 1» | `mesaId.slice(0,8)` en TPVPage | Usar `ticket.mesa_numero`; botones renombrados Comanda cocina / Ticket cliente | ✅ |
| BUG-019 | 05/10/2026 | TPV / Sala | «Mesa —» en TPV; mesa LIBRE con ticket abierto | GET ticket sin `mesa_numero`; estado mesa desync | mesa_numero+heal en get_ticket; estado efectivo en list mesas; bloquear PATCH libre con ticket abierto | ✅ |
| BUG-020 | 05/10/2026 | TPV / Cierre caja | `/cierre-caja` muestra EmptyState «Not Found» (luego 500) | (1) Uvicorn --reload no cargó `tpv_cierre_caja` tras WatchFiles. (2) `_hoy_madrid` usaba `fetchval` sin `SELECT` → PostgresSyntaxError | Reinicio uvicorn; `SELECT (CURRENT_TIMESTAMP AT TIME ZONE …)::date`; mensaje FE si preview 404 | ✅ |
| BUG-021 | 05/10/2026 | Reportes / PDF cierre | «TOTAL CAJA» e importe solapados / intercalados en el PDF | Celda ReportLab altura fija `1.35 cm` con etiqueta + texto 22 pt | Dos filas (label / importe) con alturas 0.55 + 1.15 cm en `pdf_cierre_caja` | ✅ |
| BUG-022 | 06/10/2026 | Recetas / Elaboraciones | `/admin/recetas/elaboraciones` pantalla blanca (root vacío) | `searchParams`/`setSearchParams` usados sin `useSearchParams()` → `ReferenceError` al montar | `const [searchParams, setSearchParams] = useSearchParams()` en `ElaboracionesPage.jsx` | ✅ |
| BUG-023 (HSO-01) | 06/10/2026 | Seguridad / Supabase | Tablas de `public` (usuarios, nóminas, verifactu…) legibles y modificables con la clave anon vía `/rest/v1` | RLS desactivado en 41 tablas + grants por defecto de Supabase a `anon`/`authenticated` | `backend/sql/migration_hso01_rls_revoke_anon.sql` (RLS + REVOKE + default privileges); verificar con `verify_hso01_rls.sql`. Tablas nuevas: no conceder a anon | ⏳ SQL listo, sin ejecutar |
| BUG-024 (HSO-03) | 06/10/2026 | Seguridad / Credenciales | Contraseñas de superadmin y demo publicadas en GitHub y cuentas activas | Contraseñas en claro en `generate_test_hashes.py`, docs y `.cursorrules` | Script sin contraseñas; `ops_hso03_cuentas_demo.sql` (desactivar demo, rotar superadmin); limpiar docs | ⏳ parcial |
| BUG-025 (HSO-02) | 07/10/2026 | TPV / Verifactu | Doble clic en Cobrar crea dos registros Verifactu; dos cobros simultáneos del mismo tenant reciben el mismo `numero_serie` y la cadena de huellas se bifurca | Lectura del ticket sin bloqueo y numeración/huella anterior calculadas con MAX+1 sin serializar; sin UNIQUE en BD | `FOR UPDATE` del ticket en cobro/pagos/líneas; `pg_advisory_xact_lock` por tenant + rechazo si el ticket ya tiene registro; huella anterior por `fecha_hora_generacion`; año de la serie en hora de Madrid (antes UTC: los cobros de 00:00–01:00 del 1 de enero iban a la serie del año anterior); UNIQUE(ticket_id), UNIQUE(tenant_id, numero_serie) y trigger que impide UPDATE/DELETE (`migration_hso_fase1_integridad.sql`). Test: `test_hso02_cobro_concurrente.py` | ✅ código / ⏳ SQL sin ejecutar |
| BUG-026 (HSO-05) | 07/10/2026 | TPV | Se podían añadir líneas con cantidad 0 o negativa (total reducido o negativo hacia Verifactu) | `cantidad: int` sin validación ni CHECK | `Field(gt=0, le=999)` + `CHECK (cantidad > 0)`. Test: `test_hso05_cantidad_lineas.py` | ✅ código / ⏳ SQL sin ejecutar |
| BUG-027 (HSO-08) | 07/10/2026 | TPV / Caja | Pago parcial mayor que el pendiente se guardaba entero → cierre de caja con más dinero del vendido | Sin comparación importe vs pendiente | Tarjeta/Bizum/etc.: 400. Efectivo: se guarda el pendiente y la respuesta incluye `cambio`. CHECK `importe > 0`. Test: `test_hso08_sobrepago.py` | ✅ código / ⏳ SQL sin ejecutar |
| BUG-028 (HSO-13) | 07/10/2026 | Caja / Nóminas | Dos cierres de caja del mismo día/outlet o dos nóminas del mismo periodo con peticiones simultáneas | Comprobación de existencia y INSERT sin UNIQUE (carrera) | UNIQUE(outlet_id, fecha) y UNIQUE(empleado_id, mes, anio); duplicado (previo o por carrera) → 409 en cierre y nómina. CHECK de importes no negativos en tickets, líneas, cierres y nóminas (`liquido` puede ser negativo) en `migration_hso13_importes_no_negativos.sql`; entradas de nómina `ge=0` (422). Test: `test_hso13_unicidad.py` | ✅ código / ⏳ SQL sin ejecutar |
| BUG-029 (HSO-04) | 07/10/2026 | TPV / Mesas | Cualquier rol (cocina, almacén) podía cobrar o modificar líneas; `GET /tpv/tickets/{id}` y `GET /mesas/{id}` devolvían datos de otro tenant (y el primero marcaba su mesa ocupada) | Endpoints con `get_current_user` y consulta solo por id | `require_roles` (admin, director, jefe_sala, camarero) + `_require_ticket_tpv_access`; `get_mesa` filtra por tenant/outlet (404). Test: `test_hso04_aislamiento_tpv.py` | ✅ |
| BUG-030 (HSO-16) | 07/10/2026 | Dashboard / Verifactu | Camarero/cocina veían ventas y márgenes del dashboard y exportaban los registros Verifactu | Solo `get_current_user` | `/dashboard/director`: admin, director, jefe_sala (Venta Live); `/dashboard/cierre-dia` y `/verifactu/*`: admin, director. Test: `test_hso16_roles_dashboard_verifactu.py` | ✅ |
| BUG-031 (HSO-06) | 07/10/2026 | Auth | Usuario desactivado, tenant suspendido o usuario con rol cambiado seguían operando con su token hasta 24 h (un camarero pasado a cocina podía seguir cobrando) | `get_current_user` solo decodificaba el JWT; TTL 1440 min | Revalidación en BD de activo, rol, tenant y tenant activo en cada petición (caché por proceso de 10 s, invalidada al editar usuario/tenant); 401 si no cuadra. TTL por defecto 720 min y tope de 12 h aunque el entorno diga más. Test: `test_hso06_revalidacion_sesion.py` | ✅ |
| BUG-032 (HSO-07) | 07/10/2026 | Auth | Login sin límite de intentos (fuerza bruta) | `Limiter` creado pero sin `@limiter.limit` | `rate_limit.py`: 5/min por IP + email y 30/min por IP; IP = última entrada de `X-Forwarded-For` (no falsificable tras el proxy; con `--forwarded-allow-ips="*"` uvicorn usa la primera, que escribe el cliente). 429 con mensaje en `detail`. Test: `test_hso07_rate_limit_login.py` | ✅ |
| BUG-033 (HSO-09) | 07/10/2026 | Dashboard / Informes / Analytics / APPCC / FIFO | Ventas de 00:00–02:00 (Madrid) contadas en el día anterior; dashboard, informe de ventas y cierre de caja daban cifras distintas para el mismo día; el cierre del dashboard no sumaba los cobros mixtos | BD en UTC: `DATE(cobrado_at)`, `::date`, `CURRENT_DATE` y `date.today()` usan el día UTC; cierre del dashboard agrupado por `tickets.metodo_pago` (ignora `'mixto'`) | `services/fechas.py` (`hoy_madrid()`, `fecha_madrid()`); en SQL siempre `(col AT TIME ZONE 'Europe/Madrid')::date`. Aplicado en dashboard, `reportes_dif_ventas`, `reportes_dif_appcc`, analytics (menú, personal, predicciones, rango por defecto), APPCC y `fifo_consumo`. Cierre del dashboard con `services/totales_cobro.py` (mismo cálculo por `ticket_pagos` que el cierre TPV). Test: `test_hso09_zona_horaria.py` (23:59/00:01 y cambios de hora de marzo y octubre) | ✅ |
| BUG-034 (HSO-17) | 07/10/2026 | TPV / Informe ventas | Columna IVA del informe de ventas siempre 0 | `tickets.total_iva` nunca se escribía al cobrar | Al cobrar (`/cobrar` y último pago de `/pagos`) `total_iva` = cuota del registro Verifactu, en la misma transacción. Históricos: `backend/sql/ops_hso17_recalcular_total_iva.sql` (con copia y rollback). Test: `test_hso17_21_cobro_iva_pagos.py` | ✅ código / ⏳ script sin ejecutar |
| BUG-035 (HSO-21) | 07/10/2026 | TPV / Caja | `/cobrar` no dejaba fila en `ticket_pagos`; si el ticket tenía un pago parcial previo, el cierre solo contaba ese parcial y descuadraba | Dos caminos de cobro; el cierre usaba `ticket_pagos` si existía alguna fila | `/cobrar` inserta el pendiente en `ticket_pagos`; con pagos previos el ticket queda `mixto`. Test de cierre con efectivo + tarjeta + bizum que cuadra con los tickets | ✅ |
| BUG-036 (HSO-15) | 07/10/2026 | Recetas / Escandallos | Listado de recetas y reporte de carta con coste/semáforo vacíos o antiguos; ingrediente sin precio o con unidad incompatible contaba 0 € sin aviso (semáforo verde falso) | No había `UPDATE recetas SET coste_calculado…`; `except: pass` en el cálculo | `_actualizar_coste_receta` guarda coste, margen (acotado a −999,99 por NUMERIC(5,2)) y semáforo en cada cambio de ingredientes/receta y al abrir el escandallo; respuestas con `ingredientes_no_costeados` (`sin_coste`, `unidad_incompatible`, `error_calculo`) y `coste_completo`. Test: `test_hso15_coste_recetas.py` | ✅ |
| BUG-037 | 07/10/2026 | Tests / Infra | Cualquier consulta con `AT TIME ZONE 'Europe/Madrid'` daba 500 en la BD local de tests (en Supabase funciona) | Los binarios de `pgserver` para Windows no traen `share/postgresql/timezone` | `tests/local_pg.py` copia las zonas del paquete `tzdata` al arrancar; `conftest` aborta con mensaje si falta la zona y fija la BD a UTC como Supabase | ✅ |
| BUG-038 (HSO-11) | 07/10/2026 | Inventario / FIFO | Dos fuentes de stock: entradas/mermas/ajustes de Inventario solo tocaban `stock_actual`; FIFO movía lotes. Consumir FIFO podía dejar `stock_actual` negativo; una entrada manual no era visible en FIFO | `crear_movimiento` no creaba lote; `ajuste` e inventario físico sobrescribían el recuento; `/fifo/consumir` restaba `stock_actual` sin `WHERE stock_actual >= $1` y sin `require_modulo` | `services/stock.py` único: entrada→lote, salida/merma→FIFO, ajuste por diferencia. Caché `stock_actual` en la misma transacción. 400 si no hay stock (pide recuento); 409 si lotes y caché no cuadran. CHECK no negativos. Script `reconciliar_stock.py` (informe; `--apply` explícito). Tests: `test_hso11_stock_fifo.py`, `test_hso11_migracion_reconciliacion.py` | ✅ código / ⏳ SQL sin ejecutar |
| BUG-039 (HSO-14) | 10/10/2026 | Rendimiento / SQL | KDS, Venta Live, dashboard, FIFO, reservas y fichajes harían seq scan al crecer `tickets`/`ticket_lineas` | Tablas de tráfico solo con PK | `migration_hso14_indices.sql`: 9 índices `CREATE INDEX CONCURRENTLY` (no transacción). Test: `test_hso14_indices.py` | ✅ código / ⏳ SQL sin ejecutar |
| BUG-040 (HSO-18) | 10/10/2026 | Proveedores / IA | Escaneo de factura aceptaba cualquier tamaño/tipo (memoria + coste Groq) y devolvía `str(e)` | Constantes de límite definidas pero no aplicadas | 8 MB, JPEG/PNG/PDF, 1 archivo; error Groq genérico. Test de archivo grande/MIME/varias imágenes: `test_hso18_escaneo_limites.py` | ✅ |
| BUG-041 (HSO-19) | 10/10/2026 | Dependencias | `xlsx` 0.18.5 (prototype pollution / ReDoS) y `python-jose` 3.3.0 (CVE JWT) | Versiones con CVE conocidas | `xlsx` SheetJS 0.20.3 CDN oficial; JWT con `PyJWT==2.10.1`. `npm audit` / `pip-audit` solo informe: no se actualizó nada más. Login + export xlsx OK. PyJWT 2.10.1 sigue con CVE (p. ej. PYSEC-2026-120, fix 2.12.0) | ✅ parcial; ⏳ no subir más deps sin decisión |
| BUG-042 (HSO-22) | 10/10/2026 | Seguridad | `UPDATE articulos` de elaboraciones sin `tenant_id`; CORS `*` si `ALLOWED_ORIGINS` vacío; `/docs` visible fuera de production | Defensa en profundidad incompleta | UPDATE con `tenant_id`; CORS vacío = ningún origen; docs solo en `development`. `/fifo/consumir` ya tenía módulo (HSO-11). Test: `test_hso22_23_defensa.py` | ✅ |
| BUG-043 (HSO-23) | 10/10/2026 | TPV / Dashboard / Verifactu | Endpoints sin try/except + log de contexto | Patrón de `.cursorrules` no aplicado | try/except + `logger.error` + 500 genérico en `tpv_lineas`, `tpv_cobrar`, `dashboard`, `verifactu` | ✅ |

---

## 2026-03 — Sesión 18/03 (tabla resumida)

| ID | Fecha | Módulo | Síntoma | Causa | Solución | Estado |
|----|-------|--------|---------|-------|----------|--------|
| — | 18/03/2026 | Docs / STEP | STEP desactualizado vs código (Fase 4 en 0%) | Documentación no sincronizada con implementación real | Auditoría repo → STEP v3.1; APIs y módulos marcados OK | ✅ |
| — | 18/03/2026 | Backend reportes | `pdf_comparativa_proveedores` llamada con args incorrectos | Router pasaba `(filas, tenant, nombre)` en vez de `(articulo, precios, tenant)` | Mapeo `precios_pdf` + `articulo_pdf` en `reportes_diferenciales.py` | ✅ |
| BUG-001 | 18/03/2026 | TPV / Mesas | Mesa queda **ocupada** sin ticket; no se podía corregir | `estado` en BD sin acción explícita en UI | `patchMesaEstado` en `frontend/src/services/api.js`; **TPV** (`TPVPage.jsx`) botón liberar mesa; **Sala** (`MesasPage.jsx`) acción “marcar libre” con confirmación vía mismo `PATCH` | ✅ |
| BUG-002 | 18/03/2026 | Carta / TPV | Emoji en categorías o tabs TPV tras “guardar bien” | Estado local / `icono` mezclado; sin saneo en servidor | `frontend/src/utils/textSanitize.js` (`stripEmojis`); **Carta** refetch y formulario limpio; saneo en **backend** `admin_carta.py`; **TPV** tabs con `stripEmojis` al mostrar | ✅ |
| BUG-003 | 18/03/2026 | KDS | Tras **cobrar**, comandas seguían en cocina/barra | Query no excluía tickets cerrados; líneas no pasaban a estado final | `backend/routers/kds.py`: `JOIN tickets` con `t.estado = 'abierto'`; estados **servido** + flujo **“Ya salió”**; en cobro, helper en `tpv.py` para marcar líneas enviadas como `servido` | ✅ |
| BUG-004 | 18/03/2026 | Frontend (varias páginas) | `<select>` y barras de filtros se **salen del viewport** en móvil | Flex/grid sin `min-w-0`; inputs sin tope de ancho | Patrón: contenedores `min-w-0 max-w-full` (+ `overflow-x-auto` donde aplica); constantes `INPUT` con `min-w-0 max-w-full` en Analytics, Inventario, FIFO, APPCC, Reservas, Mermas, Facturas, GestionSala; RRHH/Reportes/Carta en sesiones previas | ✅ |
| MEJ-001 | 18/03/2026 | KDS / Productos | Cocina ve bebidas sin elaborar; barra ve platos | Un solo destino “cocina” para todo | `destino_kds` en productos (`cocina` \| `barra` \| `ninguno`); migración `backend/sql/migration_kds_barra_destino.sql`; columnas línea `enviado_barra`, `estado_barra`; API KDS filtra por **rol** (`cocina`, `barra`, vista completa sala); **Carta** admin selector destino; **TPV** inserta/envío según destino | ✅ |
| MEJ-002 | 18/03/2026 | Auth / RRHH | Fichar entrada manual siempre | Sin enlace usuario–empleado en flujo login | `GET /auth/perfil` incluye `empleado_id`; **AuthContext**: tras login, opción `POST /turnos/fichaje-entrada` si no hay turno abierto; **FichajesPage**: toggle “fichar al entrar” (localStorage) | ✅ |
| MEJ-003 | 18/03/2026 | Analytics / PDF | Jerga BCG (estrella/vaca/perro) en pantalla | Copy heredado de matriz clásica | **Solo UI / PDF**: claves API sin cambio. `AnalyticsPage.jsx` → `BCG_META`: Interrogante + **Ganador**, **Motor de ventas**, **Bajo rendimiento**. `pdf_diferenciales.py` leyenda alineada | ✅ |
| MEJ-004 | 18/03/2026 | Recetas / costes | UX poco clara (ingredientes, merma, coste/ración) | Todo en una página larga | `recetas/recetasUtils.js`; `RecetaDetalleIngredientesSection.jsx`; `RecetasPage.jsx` con tabla almacén, tooltips merma en lenguaje claro, coste estimado por ración | ✅ |
| MEJ-005 | 18/03/2026 | Docs | “Merma” mal entendida | Falta glosario | Párrafos en STEP/PRD: merma = pérdida de peso al manipular, no % de rentabilidad al pelar | ✅ |
| MEJ-006 | 18/03/2026 | UI global | “Escandallo” y sidebar confuso | Terminología técnica | Sidebar **“Recetas y Costes”**; textos en recetas sin “escandallo” | ✅ |
| DEBT-001 | 18/03/2026 | Frontend | Páginas JSX muy largas | Crecimiento orgánico | Primera fase: extracción `RecetaDetalleIngredientesSection` + utils; pendiente más troceos (TPV, Carta, Analytics…) | ⏳ parcial |

---

## 2026-03 — Refactor routers + routing FastAPI (24/03/2026)

| ID | Fecha | Módulo | Síntoma | Causa | Solución | Estado |
|----|-------|--------|---------|-------|----------|--------|
| BUG-005 | 24/03/2026 | Backend / FastAPI | **307 Temporary Redirect** en `GET /api/mesas`, reservas, turnos, etc. | Comportamiento por defecto: redirige URL sin `/` final a la variante con barra | `redirect_slashes=False` en `create_app()` → `FastAPI(..., redirect_slashes=False, …)` | ✅ |
| BUG-006 | 24/03/2026 | Auth / listados | **403** en listados con rol `admin` (mesas, reservas, turnos) | `list_mesas` usaba solo `get_current_user`; otros listados con `ROLES_*` demasiado restrictivos | `require_roles` con lista operativa: `admin`, `director`, `jefe_sala`, `camarero`, `cocina`, `barra`, `almacen` en `mesas_list.list_mesas`, `reservas_read.list_reservas`, `fichajes.list_turnos` | ✅ |
| BUG-007 | 24/03/2026 | Backend / routers | **405 Method Not Allowed** en `GET /api/empleados`, `/api/clientes`, `/api/cuadrantes` (y similares) | Con `redirect_slashes=False`, la ruta solo registrada como `…/` no atiende `…` sin barra; en subrouters **sin** prefijo, `@get("")` rompe al incluir | Donde hay prefijo de recurso (`/empleados`, …): pareja `@get("")` + `@get("/")` en el mismo handler. **Mesas/reservas:** handler compartido (`list_mesas_handler`, `do_list_reservas`) + `GET ""` en el router padre con prefijo (`mesas.py`, `reservas.py`) | ✅ |
| BUG-008 | 24/03/2026 | KDS / Supabase | **500** en `/api/kds/comandas`: `column p.destino_kds does not exist` | Migración SQL no aplicada en la base del proyecto | Ejecutar en Supabase [backend/sql/migration_kds_barra_destino.sql](backend/sql/migration_kds_barra_destino.sql) (productos + ticket_lineas; revisar CHECK rol `barra` si aplica). **No es fix de código** | ✅ Resuelto: migración aplicada en proyecto Supabase; `GET /api/kds/comandas` 200 verificado (25/03/2026) |

### Bitácora rápida BUG-005 … BUG-008

| Archivo / zona | Detalle |
|----------------|---------|
| `backend/main.py` | `redirect_slashes=False` en la app FastAPI. |
| `backend/routers/mesas_list.py` | `list_mesas_handler` + `GET /`; roles `ROLES_LISTADO_OPERATIVO`. |
| `backend/routers/mesas.py` | `GET ""` → `list_mesas_handler` (misma auth que el listado). |
| `backend/routers/reservas/reservas_read.py` | `do_list_reservas` + `GET /`; roles ampliados; `ROLES_GESTION` sigue en `get_reserva`. |
| `backend/routers/reservas/reservas.py` | `GET ""` → `do_list_reservas` con mismos `Query`. |
| `backend/routers/empleados/fichajes.py` | `ROLES_LISTADO_OPERATIVO` + doble ruta en `list_turnos`. |
| `backend/routers/empleados/empleados.py`, `cuadrantes.py` | Doble ruta en listado / GET raíz del recurso. |
| `backend/routers/clientes/clientes.py` | Doble ruta en `list_clientes`. |
| `backend/routers/reservas/lista_espera.py` | Patrón `""` + `"/"` donde aplica (tras refactor previo). |

---

## 2026-03 — MCP Supabase / Cursor (27/03/2026)

| ID | Fecha | Módulo | Síntoma | Causa | Solución | Estado |
|----|-------|--------|---------|-------|----------|--------|
| BUG-009 | 27/03/2026 | DevOps / MCP | `execute_sql` no permite `ALTER`/`CREATE` (transacción solo lectura); `apply_migration` → *Cannot apply migration in read-only mode* | El servidor MCP arrancaba con **`--read-only`** en [`.cursor/mcp.json`](.cursor/mcp.json) (`mcp-server-supabase`) | Quitar **`--read-only`** de los `args` (dejar `--project-ref=…` y token `SUPABASE_ACCESS_TOKEN`). **Recargar** servidor MCP o Cursor para que el proceso tome la nueva config. Implicación de seguridad: el token podrá aplicar DDL; solo en entornos de confianza | ✅ Cerrado (config repo + doc; verificar en máquina tras reload) |

---

## 2026-03 — UI modo oscuro, seed demo SQL, recetas (unidades) y Costes (27/03/2026)

| ID | Fecha | Módulo | Síntoma | Causa | Solución | Estado |
|----|-------|--------|---------|-------|----------|--------|
| BUG-010 | 27/03/2026 | Frontend / tema | Texto **casi negro** en tablas y listas `<dl>` en **modo oscuro** (bajo contraste) | Celdas sin `dark:`; heredaban color oscuro sobre fondo oscuro | Clase global `.horeca-body-text` en `frontend/src/index.css` (`text-[#111827] dark:text-[#e8eaf0]`); aplicada a `<table>` y `<dl>` en inventario, director, clientes, reservas, empleados, analytics, admin (carta, recetas, usuarios, sala), proveedores, superadmin | ✅ |
| BUG-011 | 27/03/2026 | Seed / demo SQL | Error de sintaxis al ejecutar el **lote 1** de productos (seed) | **Coma final** ilegal tras la última fila del `VALUES` antes de `ON CONFLICT` | Corregido en [backend/sql/_seed_split_1_carta_y_prod_a.sql](backend/sql/_seed_split_1_carta_y_prod_a.sql) y JSON auxiliares [backend/sql/_mcp_oneline_1.json](backend/sql/_mcp_oneline_1.json), [backend/sql/_mcp_q1.json](backend/sql/_mcp_q1.json) | ✅ |
| BUG-012 | 27/03/2026 | Recetas / coste | **Coste por línea** incoherente (p. ej. ml frente a €/L) | Multiplicación directa `cantidad × coste_unitario` **sin** alinear unidad de la línea con `unidad_medida` del artículo | [backend/routers/recetas/recetas_unidades.py](backend/routers/recetas/recetas_unidades.py) (familias masa / volumen / ud); [backend/routers/recetas/admin_recetas_ingredientes.py](backend/routers/recetas/admin_recetas_ingredientes.py) — `_coste_linea_ingrediente`, semáforo y detalle con `coste_linea`; validación solo `kg`/`g` vs `l`/`ml` vs `ud`. Frontend: [frontend/src/pages/admin/recetas/recetasUtils.js](frontend/src/pages/admin/recetas/recetasUtils.js), [RecetaDetalleIngredientesSection.jsx](frontend/src/pages/admin/recetas/RecetaDetalleIngredientesSection.jsx) | ✅ |
| MEJ-007 | 27/03/2026 | Costes / admin | Sin **vista global** de costes de recetas + **gastos fijos** | Feature nueva | [frontend/src/pages/admin/costes/CostesPage.jsx](frontend/src/pages/admin/costes/CostesPage.jsx); [backend/routers/costes/admin_gastos_operativos.py](backend/routers/costes/admin_gastos_operativos.py) + `include_router` en `main.py`; [backend/sql/migration_gastos_operativos.sql](backend/sql/migration_gastos_operativos.sql); `getGastosOperativos` / `createGastoOperativo` / `deleteGastoOperativo` en `api.js`; [navConfig.js](frontend/src/components/layout/constants/navConfig.js) — entradas **Recetas** y **Costes**; [RecetasPage.jsx](frontend/src/pages/admin/RecetasPage.jsx) — enlace «Vista costes» | ✅ |

### Bitácora rápida BUG-010 … MEJ-007

| Archivo / zona | Detalle |
|----------------|---------|
| `frontend/src/index.css` | `.horeca-body-text` para texto legible en claro y oscuro. |
| Varios `*Page.jsx` / admin | `className` en `<table>` / `<dl>` con `horeca-body-text` donde aplica. |
| `backend/sql/_seed_split_1_carta_y_prod_a.sql` | Eliminada coma sobrante en `INSERT … VALUES … ON CONFLICT`. |
| `backend/sql/_mcp_oneline_1.json`, `_mcp_q1.json` | Misma corrección para ejecución vía MCP. |
| `backend/routers/recetas/recetas_unidades.py` | Conversión y compatibilidad de unidades para coste. |
| `backend/routers/recetas/admin_recetas_ingredientes.py` | Coste línea y validación al guardar ingredientes. |
| `frontend/src/pages/admin/costes/CostesPage.jsx` | Resumen costes receta, gastos operativos, enlace a nóminas. |
| `backend/routers/costes/admin_gastos_operativos.py` | CRUD/listado gastos fijos (roles admin/director en mutaciones). |
| `backend/sql/migration_gastos_operativos.sql` | Tabla `gastos_operativos` — ejecutar en Supabase si no está aplicada. |

---

## 2026-03 — Inventario: calibración merma y coste efectivo en recetas (27/03/2026)

| ID | Fecha | Módulo | Síntoma | Causa | Solución | Estado |
|----|-------|--------|---------|-------|----------|--------|
| BUG-013 | 27/03/2026 | Inventario / BD | **500** en `GET /api/inventario/articulos`; log: `column "calibracion_comprado" does not exist`; lista de artículos vacía / error | Código desplegado que **SELECT** incluye columnas nuevas; migración SQL **no** ejecutada en la instancia Supabase del entorno | Ejecutar en Supabase [backend/sql/migration_articulos_calibracion_merma.sql](backend/sql/migration_articulos_calibracion_merma.sql) (`ALTER TABLE articulos ADD …`). MCP `apply_migration` aplicado en proyecto enlazado (27/03/2026); otros entornos: SQL Editor manual | ✅ |
| MEJ-008 | 27/03/2026 | Inventario + Recetas | — | Feature: calibración útil sin pedir % en bruto | Pestañas tipo Carta en `InventarioPage.jsx`; `CalibracionMermaPanel.jsx`; `PUT …/calibracion-merma`; `coste_unitario_efectivo_calibracion` en `recetas_unidades.py`; costes receta con efectivo en `admin_recetas_ingredientes.py`; UI recetas con `coste_unitario_efectivo` | ✅ |

### Bitácora rápida BUG-013 … MEJ-008

| Archivo / zona | Detalle |
|----------------|---------|
| `backend/sql/migration_articulos_calibracion_merma.sql` | DDL columnas `calibracion_comprado`, `calibracion_util`. |
| `backend/routers/inventario/inventario_articulos_list.py` | `SELECT` incluye columnas de calibración. |
| `backend/routers/inventario/inventario_shared.py` | `_articulo_to_dict`: `coste_unitario_efectivo`, `merma_calibracion_porcentaje`. |
| `backend/routers/inventario/inventario_articulos_mutations.py` | `PUT /articulos/{id}/calibracion-merma`. |
| `backend/routers/recetas/recetas_unidades.py` | `coste_unitario_efectivo_calibracion`. |
| `backend/routers/recetas/admin_recetas_ingredientes.py` | Semáforo y detalle coste con `_effective_coste_articulo_row`. |
| `frontend/src/pages/inventario/InventarioPage.jsx` | Pestañas Artículos / Movimientos / Calibración útil. |
| `frontend/src/pages/inventario/components/CalibracionMermaPanel.jsx` | UI regla de tres. |
| `frontend/src/services/api.js` | `putArticuloCalibracionMerma`. |

---

## Bitácora detallada — plan «bugs críticos, KDS por rol, fichajes, naming y refactor»

*Orden lógico de implementación; referencia para auditorías y onboarding.*

### 1. Mesa libre (BUG-001)

| Qué | Detalle |
|-----|---------|
| **API cliente** | `frontend/src/services/api.js` — función `patchMesaEstado(id, body)` → `PATCH /mesas/{id}/estado`. |
| **TPV** | `frontend/src/pages/tpv/TPVPage.jsx` — liberar mesa cuando procede (mesa ocupada sin ticket coherente con negocio). |
| **Sala** | `frontend/src/pages/sala/MesasPage.jsx` — acción explícita para pasar mesa a `libre` con confirmación. |
| **Backend** | Ya existía endpoint en `backend/routers/mesas.py` (no duplicar lógica). |

### 2. Carta sin emoji + coherencia TPV (BUG-002)

| Qué | Detalle |
|-----|---------|
| **Utilidad** | `frontend/src/utils/textSanitize.js` — `stripEmojis()` para render y formularios. |
| **Admin carta** | `frontend/src/pages/admin/CartaPage.jsx` — saneo al editar/guardar, refetch categorías/productos, visualización sin emoji residual. |
| **Backend** | `backend/routers/admin_carta.py` — rechazar o limpiar emoji al persistir (defensa en profundidad). |
| **TPV** | `TPVPage.jsx` — nombres de pestañas de categoría con `stripEmojis`. |

### 3. Selects y filtros en móvil (BUG-004)

| Qué | Detalle |
|-----|---------|
| **Patrón** | Padre flex/grid: `min-w-0`; contenedor filtros: `max-w-full`, a veces `overflow-x-auto`; inputs/select: `w-full min-w-0 max-w-full`. |
| **Páginas tocadas (ejemplos)** | `AnalyticsPage.jsx`, `InventarioPage.jsx`, `FIFOPage.jsx`, `APPCCPage.jsx`, `ReservasPage.jsx`, `MermasPage.jsx`, `FacturasPage.jsx`, `GestionSalaPage.jsx`; envoltorios con `min-w-0 overflow-x-hidden` donde evitaba scroll horizontal global. |
| **TPV cobro** | Select método pago simple: clases con `min-w-0 max-w-full`. |
| **RRHH / reportes / carta** | Ajustes en sesiones del mismo roadmap (`NominasPage`, `FichajesPage`, componentes en `reportes/`, `CartaPage`). |

### 4. KDS: tickets cobrados, «Ya salió», cocina vs barra (BUG-003 + MEJ-001)

| Qué | Detalle |
|-----|---------|
| **Listados** | `backend/routers/kds.py` — solo tickets `estado = 'abierto'`; exclusión de líneas ya `servido` donde corresponde; contadores y PATCH de estado por columna cocina/barra. |
| **Estados** | Transiciones `preparando` → `listo` → `servido` (incl. acción tipo **Ya salió** en UI). |
| **Cobro** | `backend/routers/tpv.py` — al cerrar ticket, marcar líneas enviadas a cocina/barra como `servido` para no dejar cola fantasma. |
| **Producto** | Campo `destino_kds`: `cocina` \| `barra` \| `ninguno` — UI en admin carta/producto. |
| **Líneas ticket** | `enviado_barra`, `estado_barra`, timestamps espejo de cocina según migración. |
| **Migración SQL** | `backend/sql/migration_kds_barra_destino.sql` — ejecutar en Supabase si no está aplicada. |
| **Rol `barra`** | CHECK en `usuarios.rol`; rutas y `require_roles`; frontend `App.jsx` / `Sidebar.jsx` / `KDSPage` según diseño actual. |
| **`.cursorrules`** | Tabla de roles actualizada con fila **barra**. |

### 5. Analytics BCG y PDF (MEJ-003)

| Qué | Detalle |
|-----|---------|
| **Frontend** | `frontend/src/pages/analytics/AnalyticsPage.jsx` — objeto `BCG_META` (etiquetas visibles; claves API `estrella`, `vaca`, `perro`, `interrogante` sin cambio). |
| **PDF** | `backend/services/pdf_diferenciales.py` — mapeo y leyenda con **Ganador**, **Motor de ventas**, **Bajo rendimiento**, **Interrogante**. |

### 6. Recetas, ingredientes y coste (MEJ-004 + MEJ-006)

| Qué | Detalle |
|-----|---------|
| **Utils** | `frontend/src/pages/admin/recetas/recetasUtils.js` — formato €, cantidad bruta, coste línea, unidades. |
| **Componente** | `frontend/src/pages/admin/recetas/RecetaDetalleIngredientesSection.jsx` — bloque “Ingredientes y cantidades”, tabla, alta de ingrediente, tooltips merma. |
| **Página** | `frontend/src/pages/admin/RecetasPage.jsx` — integración sección + tabla precios almacén + `min-w-0` en layout modal. |
| **Sidebar** | `frontend/src/components/layout/Sidebar.jsx` — entrada “Recetas y Costes” (o equivalente según versión). |

### 7. Fichaje al login (MEJ-002)

| Qué | Detalle |
|-----|---------|
| **Perfil** | `backend/routers/auth.py` — subconsulta / campo `empleado_id` en respuesta de perfil. |
| **Cliente** | `frontend/src/context/AuthContext.jsx` — tras login exitoso, llamada condicionada a `POST /turnos/fichaje-entrada`. |
| **Preferencia** | `frontend/src/pages/empleados/FichajesPage.jsx` — toggle persistido (no fichar si el usuario lo desactiva). |
| **Biométrico / WebAuthn** | Planificado fase 2 — no implementado en este bloque. |

### 8. Documentación merma (MEJ-005)

| Qué | Detalle |
|-----|---------|
| **STEP / PRD** | Párrafo glosario: merma = pérdida de peso/volumen usable al manipular; fórmula bruto/neto en recetas. |

### 9. Deuda técnica JSX (DEBT-001)

| Qué | Detalle |
|-----|---------|
| **Hecho** | Extracción recetas (sección ingredientes). |
| **Pendiente** | Trocear `TPVPage.jsx`, `CartaPage.jsx`, `AnalyticsPage.jsx`, `DashboardPage.jsx`, etc., en `components/` + `hooks/` por feature sin cambiar comportamiento. |

### 10. Modo oscuro tablas/dl, seed lote 1, unidades receta, gastos operativos (BUG-010 … MEJ-007)

| Qué | Detalle |
|-----|---------|
| **BUG-010** | Patrón único `.horeca-body-text` para no duplicar `dark:` en cada `<td>`; cubre tablas ERP y bloques de definición. |
| **BUG-011** | El error aparecía al aplicar el primer bloque `INSERT` de productos; la coma extra rompía el parser antes de `ON CONFLICT`. |
| **BUG-012** | El detalle de receta expone `coste_linea` por ingrediente coherente con conversión; el usuario solo elige unidades permitidas para el artículo. |
| **MEJ-007** | Tras migración SQL, smoke: `GET/POST/DELETE` gastos operativos y carga de `CostesPage` con rol admin/director. |

### 11. Calibración inventario y recetas (BUG-013 + MEJ-008)

| Qué | Detalle |
|-----|---------|
| **BUG-013** | Mismo patrón que BUG-008: código asume columnas; la BD debe alinearse con `migration_*.sql` antes de probar. |
| **MEJ-008** | La merma % en línea de receta (manipulación al cocinar) sigue siendo independiente; la calibración ajusta el **€/ud útil** respecto al precio de factura. |

---

## Histórico (migrado desde STEP — resumen)

Estos ya estaban documentados en STEP *Problemas conocidos y soluciones aplicadas*:

| Problema | Solución aplicada |
|----------|-------------------|
| `proveedor_habitual_id` no existía | Eliminada del SELECT |
| Pantalla blanca tras login (`visibleItems`) | Navegación plana en Sidebar |
| float en modelos Pydantic | Sustituido por Decimal donde aplica |
| f-strings en SQL | Placeholders `$1,$2` + concatenación segura |
| Modales `bg-black/50` | Unificado a `bg-black/60` |
| `require_roles` faltante | Corregido en admin_carta / admin_recetas |
| `nombre_completo` / columnas empleados | Migración + COALESCE en JOINs |
| asyncpg TIME con string | Helper `_parse_hora_time()` (reservas) |
| Usuario sin `outlet_id` | UPDATE manual en Supabase (datos) |

---

## Checklist post-implementación (local / antes de Render)

- [ ] Migración `migration_kds_barra_destino.sql` aplicada en Supabase (columnas producto + líneas + rol `barra` si aplica).
- [ ] Migración `migration_gastos_operativos.sql` aplicada en Supabase (tabla `gastos_operativos`) para Costes / gastos fijos.
- [ ] Migración `migration_articulos_calibracion_merma.sql` aplicada en Supabase (columnas `calibracion_*` en `articulos`) para inventario y costes de receta con calibración útil.
- [ ] Smoke test: TPV cobro → KDS sin ticket cobrado; cocina solo `destino_kds=cocina`; barra solo `barra`.
- [ ] Deploy Render/Vercel: **último paso** tras validar todo en local (según STEP).

---

*Última actualización: 27/03/2026 — BUG-013, MEJ-008 (calibración útil inventario / regla de tres, coste efectivo en recetas; migración `articulos`); bitácora §1, §4, §8 y checklist.*
