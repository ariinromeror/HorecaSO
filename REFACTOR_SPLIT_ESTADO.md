# Estado del refactor «split puro» (marzo 2026)

**Última actualización:** 24/03/2026 — **REFACTOR FINALIZADO** (Fase 2 frontend cerrada al 100%)

Objetivo: trocear routers y páginas grandes **sin cambiar comportamiento** (mover bloques, imports relativos, mismos prefijos HTTP). Inventario inicial: [INVENTARIO_ARCHIVOS_GRANDES.md](INVENTARIO_ARCHIVOS_GRANDES.md).

---

## Estado global

| Ámbito | Estado |
|--------|--------|
| **Fase 1 — Backend** | Completada (tabla de módulos troceados en sección siguiente) |
| **Fase 2 — Frontend** | **100% COMPLETADA** — `npm run build` en `frontend/` ✓ (24/03/2026) |

`App.jsx`: rutas sin cambios estructurales; orquestadores que cambiaron de ruta en refactor previo siguen correctos: `CartaPage` → `./pages/admin/carta/CartaPage`, `GestionSalaPage` → `./pages/admin/sala/GestionSalaPage`.

---

## Fase 1 — Backend

### Completado (módulos troceados + orquestadores)

| Dominio | Archivos nuevos / apoyo | Orquestador / notas |
|--------|-------------------------|---------------------|
| **TPV** | `tpv_schemas.py`, `tpv_tickets_create.py`, `tpv_tickets_list.py`, `tpv_tickets_detalle.py`, `tpv_lineas.py` | `tpv.py` |
| **TPV cobro** | `tpv_cobro_schemas.py`, `tpv_cobrar.py`, `tpv_pagos.py` | `tpv_cobro.py` |
| **Proveedores** | `proveedores_schemas.py`, `proveedores_list.py`, `proveedores_mutations.py` | `proveedores.py` |
| **Facturas** | `facturas_proveedor_list.py`, `facturas_proveedor_mutations.py`, `facturas_proveedor_escaneo.py` | `facturas_proveedor.py` |
| **Mesas** | `mesas_shared.py`, `mesas_list.py`, `mesas_mutations.py` | `mesas.py` (prefijo `/api/mesas`) |
| **Reservas** | `reservas_schemas.py`, `reservas_read.py`, `reservas_write.py` | `reservas.py` (prefijo `/reservas`) |
| **Inventario** | `inventario_schemas.py`, `inventario_articulos_list.py`, `inventario_articulos_mutations.py` | `inventario.py` |
| **Inventario mov.** | `inventario_movimientos_schemas.py`, `inventario_movimientos_alertas.py`, `inventario_movimientos_core.py` | `inventario_movimientos.py` |
| **Paquete** | `routers/__init__.py` | Facilita imports relativos entre módulos hermanos |

### Ya existía antes (dominios ya modularizados en carpetas)

Empleados (`empleados_shared`, `empleados`, `fichajes`, `cuadrantes`, `ausencias`), clientes + historial, KDS, FIFO, analytics, reportes diferenciales, admin_carta, recetas, etc. — ver árbol en [STEP_HORECASO.md](STEP_HORECASO.md) (sección estructura; rutas reales bajo `backend/routers/`).

### Ajustes post-split (routing / auth) — 24/03/2026

- **`main.py`:** `FastAPI(..., redirect_slashes=False)` — evita **307** en clientes que llaman `/api/mesas` vs `/api/mesas/`.
- **Rutas raíz sin barra:** En subrouters **sin** prefijo propio, `@router.get("")` provoca `FastAPIError` al hacer `include_router`. Patrón aplicado:
  - **Mesas:** `list_mesas_handler` en `mesas_list.py`; `GET ""` registrado en `mesas.py` (router con prefijo `/api/mesas`); subrouter mantiene `GET "/"`.
  - **Reservas:** `do_list_reservas` en `reservas_read.py`; `GET ""` en `reservas.py` (prefijo `/reservas`); subrouter mantiene `GET "/"`.
- **Listados operativos:** `list_mesas`, `list_reservas`, `list_turnos` usan `require_roles` con lista ampliada (`admin`, `director`, `jefe_sala`, `camarero`, `cocina`, `barra`, `almacen`) — ver [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md).
- **405 en colecciones:** Donde el subrouter **sí** tiene prefijo (`/empleados`, `/clientes`, `/cuadrantes`, `/turnos`), conviven `@…get("")` y `@…get("/")` en el mismo handler (`include_in_schema=False` en la variante sin barra).

### Pendiente (backend)

- Trocear archivos que sigan por encima de ~200 líneas si se desea alinear todo el inventario: p. ej. `appcc.py`, `nominas.py`, `verifactu.py`, `dashboard.py`, `kds_estados.py`, `fifo_consumo.py`, `admin_productos.py`, `admin_recetas_ingredientes.py`, etc. (prioridad según tamaño real tras contar líneas).
- `proveedores_shared.py` y similares pueden quedar monolíticos si el tamaño es razonable.

**Verificación** (desde `backend/` con venv):

```bash
python -c "from main import create_app; create_app()"
```

---

## Fase 2 — Frontend — COMPLETADA (100%)

Criterio: lógica en hooks, UI en `components/`, constantes en archivos dedicados donde aplica; imports relativos por dominio; ningún archivo nuevo > ~300 líneas; `api.js` sin cambios de contrato; **`npm run build`** sin errores.

### Inventario de archivos nuevos o sustituidos en Fase 2 (lista consolidada)

**Inventario / APPCC / FIFO / Mermas / Proveedores** — ver tablas históricas en commits previos; archivos típicos: `pages/inventario/` (`constants.js`, hooks `useInventarioData`, `useInventarioLoads`, `inventarioHandlers`, componentes tabla/modales, `InventarioPage.jsx`); `fifoConstants.js`, `hooks/useFIFO.js`, componentes Lotes/Alertas/Lote/Consumo/Valoracion, `FIFOPage.jsx`; `mermasConstants.js`, `useMermas.js`, `MermasList`, `MermaModal`, `MermasPage.jsx`; `appccConstants.js`, `useAPPCC.js`, componentes APPCC, `APPCCPage.jsx`; `pages/proveedores/` `constants.jsx`, `useFacturas`, `useProveedores`, modales y tablas, `FacturasPage` / `ProveedoresPage`.

**Admin carta + recetas** — `pages/admin/carta/` y `pages/admin/recetas/` (hooks, componentes, `CartaPage.jsx`, `RecetasPage.jsx`); `App.jsx` importa `./pages/admin/carta/CartaPage` y `./pages/admin/recetas/RecetasPage`.

**Reservas, Clientes, TPV** — `pages/reservas/`, `pages/clientes/`, `pages/tpv/` con `constants`, `utils`, hooks y componentes según bloques documentados en sesiones anteriores.

**Empleados (RRHH)** — `pages/empleados/`: `constants.js`, `utils/fichajesLocal.js`, `utils/cuadranteHelpers.js`, hooks (`useNominas`, `useFichajes`, `useCuadrante`, `useEmpleados`), componentes (nóminas, fichajes, cuadrante, empleados), páginas orquestadoras.

**Analytics + director + admin sala** — `pages/analytics/` (`constants`, `useAnalytics`, paneles, `AnalyticsPage.jsx`); `pages/director/` (`useVentaLivePolling`, `useDashboard`, `VentaLiveCards`, `ventaLiveFormat`, `VentaLiveTable`, `VentaLiveTicketPanel`, `VentaLivePage`, `DashboardKPIs`, `DashboardPage`); `pages/admin/sala/` (`constants`, `useMesasAdmin`, `MesasAdminTable`, `MesaAdminModal`, `GestionSalaPage`); `App.jsx` → `GestionSalaPage` desde `./pages/admin/sala/GestionSalaPage`.

**Cierre — KDS, Sala, Sidebar (24/03/2026)**

| Área | Archivos |
|------|----------|
| **KDS** (`pages/cocina/`) | `kdsHelpers.js` (helpers visuales y `tituloKdsPorRol`), `hooks/useKdsComandas.js`, `components/KdsColumnaEstado.jsx`, `components/KdsTicketCard.jsx`, `KDSPage.jsx` (orquestador; pantalla completa `h-screen`, sin AppLayout en la página) |
| **Sala — Mesas** (`pages/sala/`) | `hooks/useMesasSala.js`, `components/MesaCard.jsx`, `components/MesasLeyenda.jsx` (leyenda según `tokens.shared.mesa`), `MesasPage.jsx` |
| **Layout** | `components/layout/constants/navConfig.js` (`NAV_ITEMS`, `isNavActive`, `navScrollStyle`), `components/layout/SidebarNav.jsx`, `components/layout/Sidebar.jsx` (logo, `SidebarNav`, tema, cierre de sesión) |

### Pendiente (Fase 2)

*Ninguno — frontend split cerrado.*

---

## Notas

- Los `*_shared.py` son helpers compartidos del mismo dominio; no duplicar lógica de negocio al trocear.
- Tras añadir un **router nuevo** exportado por separado, actualizar `main.py` con `include_router` y el mismo `prefix` HTTP que antes.
- Migración KDS columnas `destino_kds` / barra en líneas: [backend/sql/migration_kds_barra_destino.sql](backend/sql/migration_kds_barra_destino.sql) — ejecutar en Supabase si la API devuelve «column does not exist».

---

*Documento de seguimiento del refactor: **FINALIZADO**. No hay más ítems obligatorios de split frontend planificados en este documento.*
