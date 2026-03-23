# Inventario: archivos >200 líneas (refactor)

**Generado para planificar refactor.** Alcance: `backend/routers/`, `backend/services/`, `backend/auth/`, `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/context/`, `frontend/src/services/`.

**Conteo de líneas:** líneas físicas del archivo `(Get-Content).Count` en PowerShell (incluye líneas vacías).

**`backend/auth/`** y **`frontend/src/context/`:** ningún archivo supera 200 líneas.

---

## BACKEND (routers/, services/, auth/)

| Archivo | Líneas | Responsabilidad | Candidatos a extraer |
|---------|--------|-----------------|----------------------|
| backend/routers/empleados.py | 1202 | API de empleados, fichajes, turnos/cuadrantes y ausencias (RRHH operativo). | Helpers `_serialize_*`, `_tenant_id`; fichajes → `services/empleados_fichajes.py` o router `fichajes.py`; cuadrantes/ausencias → módulos o routers dedicados; SQL repetido → funciones en `services/`. |
| backend/routers/tpv.py | 1069 | TPV: tickets abiertos/hoy, líneas, cobro, pagos parciales y lógica relacionada con acceso mesa/outlet. | `_require_ticket_tpv_access`, `_marcar_lineas_kds_*`, cobro/Verifactu → `services/tpv_cobro.py` o `services/ticket_service.py`; pagos → submódulo; mantener router fino. |
| backend/routers/proveedores.py | 881 | CRUD proveedores, facturas proveedor (lista, detalle, pago) y escaneo IA. | Router `facturas_proveedor.py` separado; lógica IA y validaciones → `services/proveedores_facturas.py`; helpers `_tenant_id_usuario`. |
| backend/routers/inventario.py | 664 | Artículos, movimientos de stock, alertas e inventario físico. | `_insert_movimiento` y reglas de negocio → `services/inventario_movimientos.py`; listados con SQL largo → queries en `services/` o `repositories/`. |
| backend/routers/reservas.py | 617 | Reservas de mesa y lista de espera (segundo `APIRouter` embebido). | Dividir en `reservas.py` + `lista_espera.py`; compartir helpers de tenant/outlet en módulo común. |
| backend/routers/admin_recetas.py | 593 | Recetas, ingredientes, coste y endpoint tipo semáforo de rentabilidad. | Cálculo de coste y semáforo → `services/recetas_coste.py`; Pydantic/schemas en `schemas/`. |
| backend/routers/admin_carta.py | 590 | Categorías, productos y alérgenos de la carta (admin). | Handlers por recurso en subarchivos o clases; validaciones duplicadas → `schemas/admin_carta.py`. |
| backend/routers/kds.py | 553 | Comandas cocina, cambio de estado de línea y estadísticas KDS. | Lógica del PATCH largo y agregados → `services/kds_service.py`; queries como funciones puras. |
| backend/routers/fifo.py | 548 | Lotes FIFO: alta, consumo, alertas caducidad y valoración. | Motor consumo/valoración → `services/fifo_engine.py` (alineado con inventario); router solo HTTP. |
| backend/routers/clientes.py | 485 | CRM: clientes, historial y puntos de fidelización. | Historial/puntos → `services/clientes_fidelidad.py`; serialización en helpers. |
| backend/routers/analytics.py | 441 | Analytics: rentabilidad mesas, ingeniería de menú y coste personal. | Cada GET con SQL grande → `services/analytics_queries.py` (una función por informe). |
| backend/routers/reportes_diferenciales.py | 421 | Endpoints que generan PDFs (ventas, cuadrante, rentabilidad platos, proveedores, APPCC). | Ya delega en `services/pdf_*`; extraer `_tenant_id`/`_uid` compartidos con otros reportes; una función registradora por ruta en submódulo. |
| backend/routers/mesas.py | 399 | CRUD mesas y cambio de estado (libre/ocupada/reservada). | Reglas de negocio en transiciones de estado → `services/mesas_estado.py` si crece. |
| backend/routers/appcc.py | 377 | Registros APPCC y resumen diario. | Construcción de filtros/resúmenes → `services/appcc_service.py`. |
| backend/routers/nominas.py | 319 | Cálculo y consulta de nóminas y detalle. | Motor cálculo → `services/nominas_calculo.py`; respuestas serializadas. |
| backend/routers/verifactu.py | 240 | Consulta de registros Verifactu, verificación de cadena y exportación. | Parsing/export → `services/verifactu_read.py` (lectura; motor en `verifactu_engine.py`). |
| backend/routers/dashboard.py | 220 | Dashboard director y cierre de día (KPIs agregados). | Queries SQL → `services/dashboard_queries.py`. |
| backend/services/pdf_diferenciales.py | 203 | Generación ReportLab: PDF cuadrante semanal y matriz BCG de platos. | Tablas/estilos por informe en funciones o `pdf_styles.py`; helpers `_q2`, `_m` compartidos con otros PDFs. |

---

## FRONTEND (pages/, components/, context/, services/)

| Archivo | Líneas | Responsabilidad | Candidatos a extraer |
|---------|--------|-----------------|----------------------|
| frontend/src/pages/inventario/InventarioPage.jsx | 1497 | Pantalla principal de inventario: artículos, movimientos, filtros, modales e inventario físico. | Constantes/tokens (`INPUT`, categorías) → `constants/inventarioUi.js`; `formatEuro`/`formatStock` → `utils/format.js`; tablas y modales → `components/inventario/*`; hook `useInventarioData.js`. |
| frontend/src/pages/proveedores/FacturasPage.jsx | 1202 | Gestión de facturas de proveedor, escaneo IA, pagos y detalle. | Modales, lista y formularios → componentes por bloque; hook `useFacturasProveedor.js`; helpers de importes/fechas. |
| frontend/src/pages/inventario/FIFOPage.jsx | 1105 | Lotes FIFO, consumo, alertas y valoración en UI. | Tablas de lotes/consumo → componentes; lógica de formularios → hooks; constantes de UI. |
| frontend/src/pages/admin/CartaPage.jsx | 1090 | Admin de categorías, productos y alérgenos. | Secciones por pestaña o vista → `CartaCategorias.jsx`, `CartaProductos.jsx`; estado y API → hooks. |
| frontend/src/pages/reservas/ReservasPage.jsx | 1067 | Reservas y lista de espera / calendario según implementación. | Partir por dominio visual (lista/calendario/modal); hooks por flujo; utilidades de fecha. |
| frontend/src/pages/tpv/TPVPage.jsx | 936 | TPV: carta, líneas, cobro mixto, pagos y navegación por mesa. | Panel cobro, lista líneas, selector carta; `splitImporteEnNPartes` → `utils/pagos.js`; hook `useTicketTPV.js` (ya existe `TpvMesaOcupadaAlert`). |
| frontend/src/pages/analytics/AnalyticsPage.jsx | 876 | Vistas de analytics (rentabilidad mesas, menú, coste personal). | Un bloque por endpoint; hooks `useRentabilidadMesas`, etc.; gráficos en `components/analytics/`. |
| frontend/src/pages/clientes/ClientesPage.jsx | 868 | CRM clientes, historial y puntos. | Tabla + ficha + modales en componentes; hook `useClientes.js`. |
| frontend/src/pages/inventario/MermasPage.jsx | 858 | Registro y gestión de mermas vinculadas a inventario. | Formularios y listados en subcomponentes; hook de datos. |
| frontend/src/pages/inventario/APPCCPage.jsx | 835 | Registros y flujo APPCC en UI. | Formularios de registro, listas, filtros → componentes + hook. |
| frontend/src/pages/admin/RecetasPage.jsx | 789 | Listado/detalle de recetas, ingredientes y costes. | Editor ingredientes, panel coste, semáforo en subcomponentes. |
| frontend/src/pages/director/VentaLivePage.jsx | 753 | Vista “venta en vivo” con polling de actividad. | Hook `useVentaLivePolling.js`; tarjetas/tablas en componentes. |
| frontend/src/pages/empleados/NominasPage.jsx | 717 | Nóminas: cálculo, listado y detalle. | Tablas y modales por flujo; `useNominas.js`. |
| frontend/src/pages/empleados/FichajesPage.jsx | 672 | Fichajes entrada/salida e historial. | Lista del día + acciones → componentes; hook `useFichajes.js`. |
| frontend/src/pages/empleados/CuadrantePage.jsx | 669 | Cuadrante semanal y turnos. | Grid cuadrante → componente; lógica de semana → hook/utils. |
| frontend/src/pages/admin/GestionSalaPage.jsx | 665 | CRUD y disposición de mesas (gestión sala). | Canvas/plano vs lista → componentes; `useMesasAdmin.js`. |
| frontend/src/pages/empleados/EmpleadosPage.jsx | 625 | Alta/edición empleados y vínculo usuario. | Formularios y tabla en subcomponentes; hook de empleados. |
| frontend/src/pages/proveedores/ProveedoresPage.jsx | 616 | CRUD proveedores. | Tabla + modal en componentes; hook `useProveedores.js`. |
| frontend/src/pages/cocina/KDSPage.jsx | 438 | Pantalla cocina: comandas y cambio de estado. | Columnas por estado o ticket → componentes; hook `useKdsComandas.js`; polling aislado. |
| frontend/src/components/layout/Sidebar.jsx | 344 | Navegación lateral, tema y logout según rol. | `NAV_ITEMS` → `constants/navConfig.js`; enlaces → `SidebarNav.jsx`; theme toggle → subcomponente. |
| frontend/src/services/api.js | 307 | Cliente Axios central y funciones por recurso. | Partir por dominio: `api/auth.js`, `api/tpv.js`, `api/inventario.js`, … reexport desde `api/index.js`; instancia axios e interceptors en un solo módulo. |
| frontend/src/pages/sala/MesasPage.jsx | 240 | Vista sala: grid de mesas y navegación a TPV. | Tarjeta mesa / leyenda → componentes; hook `useMesasSala.js`. |
| frontend/src/pages/admin/recetas/RecetaDetalleIngredientesSection.jsx | 239 | Sección de ingredientes dentro del detalle de receta. | Tabla editable + totales → subcomponentes; validación numérica en utils. |
| frontend/src/pages/director/DashboardPage.jsx | 210 | Dashboard director (KPIs y cierre). | Tarjetas/gráficos en componentes; `useDashboardDirector.js`. |

---

## ARCHIVOS CRÍTICOS (>500 líneas)

Mayor urgencia para trocear y testear.

| Archivo | Líneas |
|---------|--------|
| frontend/src/pages/inventario/InventarioPage.jsx | 1497 |
| backend/routers/empleados.py | 1202 |
| frontend/src/pages/proveedores/FacturasPage.jsx | 1202 |
| frontend/src/pages/inventario/FIFOPage.jsx | 1105 |
| frontend/src/pages/admin/CartaPage.jsx | 1090 |
| backend/routers/tpv.py | 1069 |
| frontend/src/pages/reservas/ReservasPage.jsx | 1067 |
| frontend/src/pages/tpv/TPVPage.jsx | 936 |
| backend/routers/proveedores.py | 881 |
| frontend/src/pages/analytics/AnalyticsPage.jsx | 876 |
| frontend/src/pages/clientes/ClientesPage.jsx | 868 |
| frontend/src/pages/inventario/MermasPage.jsx | 858 |
| frontend/src/pages/inventario/APPCCPage.jsx | 835 |
| frontend/src/pages/admin/RecetasPage.jsx | 789 |
| frontend/src/pages/director/VentaLivePage.jsx | 753 |
| frontend/src/pages/empleados/NominasPage.jsx | 717 |
| frontend/src/pages/empleados/FichajesPage.jsx | 672 |
| frontend/src/pages/empleados/CuadrantePage.jsx | 669 |
| frontend/src/pages/admin/GestionSalaPage.jsx | 665 |
| backend/routers/inventario.py | 664 |
| frontend/src/pages/empleados/EmpleadosPage.jsx | 625 |
| backend/routers/reservas.py | 617 |
| frontend/src/pages/proveedores/ProveedoresPage.jsx | 616 |
| backend/routers/admin_recetas.py | 593 |
| backend/routers/admin_carta.py | 590 |
| backend/routers/kds.py | 553 |
| backend/routers/fifo.py | 548 |

---

## ARCHIVOS MODERADOS (200–500 líneas)

Conviene trocar; no bloquean tanto como los anteriores.

| Archivo | Líneas |
|---------|--------|
| backend/routers/clientes.py | 485 |
| backend/routers/analytics.py | 441 |
| frontend/src/pages/cocina/KDSPage.jsx | 438 |
| backend/routers/reportes_diferenciales.py | 421 |
| backend/routers/mesas.py | 399 |
| backend/routers/appcc.py | 377 |
| frontend/src/components/layout/Sidebar.jsx | 344 |
| backend/routers/nominas.py | 319 |
| frontend/src/services/api.js | 307 |
| backend/routers/verifactu.py | 240 |
| frontend/src/pages/sala/MesasPage.jsx | 240 |
| frontend/src/pages/admin/recetas/RecetaDetalleIngredientesSection.jsx | 239 |
| backend/routers/dashboard.py | 220 |
| frontend/src/pages/director/DashboardPage.jsx | 210 |
| backend/services/pdf_diferenciales.py | 203 |

---

## Notas

- Para ampliar el inventario a **todo** `backend/` o **todo** `frontend/src/` (`utils/`, `hooks/`, `App.jsx`, etc.), repetir el mismo criterio de conteo.
- Tras cambios grandes en el repo, conviene **volver a contar** líneas antes de priorizar el refactor.
