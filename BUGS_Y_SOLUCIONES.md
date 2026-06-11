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
