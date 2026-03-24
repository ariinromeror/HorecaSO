# AUDITORÍA HORECASO — resultado real
**Fecha:** 24 de marzo de 2026

## 1. SPLIT FRONTEND — estado real por dominio

Criterio usado: **✅** ningún `.jsx`/`.js` del dominio supera **300 líneas**; **⚠️** hay orquestador + hijos pero algún archivo >300; **❌** monolito grande sin troceo claro.

Conteo: `Get-Content | Measure-Object -Line` en PowerShell (líneas físicas, incl. vacías).

### inventario/ (incluye FIFO, mermas, APPCC en la misma carpeta `pages/inventario/`)
| Archivo | Líneas |
|---------|--------:|
| `frontend/src/pages/inventario/InventarioPage.jsx` | 175 |
| `frontend/src/pages/inventario/FIFOPage.jsx` | 127 |
| `frontend/src/pages/inventario/MermasPage.jsx` | 103 |
| `frontend/src/pages/inventario/APPCCPage.jsx` | 115 |
| `frontend/src/pages/inventario/components/ArticulosTable.jsx` | 329 |
| `frontend/src/pages/inventario/hooks/useMermas.js` | 270 |
| `frontend/src/pages/inventario/hooks/useFIFO.js` | 234 |
| `frontend/src/pages/inventario/hooks/useAPPCC.js` | 211 |
| (resto de la carpeta: 32 archivos `.js`/`.jsx`, **~4964 líneas** en total) | — |

**Estado: ⚠️ Split parcial** — orquestadores cortos y muchos hooks/componentes; **`ArticulosTable.jsx` tiene 329 líneas** (>300).

### fifo (dentro de inventario)
Mismo árbol que arriba; `FIFOPage.jsx` 127 líneas; piezas en `components/LotesTabPanel.jsx` (230), `hooks/useFIFO.js` (234). **⚠️** hereda el mismo criterio que inventario (tabla inventario >300).

### mermas
`MermasPage.jsx` 103; `MermasList.jsx` 238; `MermaModal.jsx` 228. **✅ Split completo** (ningún archivo >300).

### appcc
`APPCCPage.jsx` 115; hook 211. **✅ Split completo**.

### proveedores/
Máximos: `FacturasList.jsx` 251, `NuevaFacturaModal.jsx` 228, `ProveedoresTable.jsx` 224, `EscaneoIAModal.jsx` (~212 líneas en archivo completo), `FacturasPage.jsx` 136. **✅ Split completo** (>300 en ninguno de los top).

### tpv/
Máximos: `hooks/useTpvTicketHandlers.js` 276, `components/CobroDivisionForm.jsx` 223, `TPVPage.jsx` 199. **✅ Split completo**.

### reservas/
Máximos: `components/ListaEsperaPanel.jsx` 270, `hooks/useReservas.js` 249, `ReservasList.jsx` 196, `ReservasPage.jsx` 146. **✅ Split completo**.

### clientes/
Máximos: `ClientesTable.jsx` 204, `useClientes.js` 203, `ClienteModal.jsx` 163, `ClientesPage.jsx` 119. **✅ Split completo**.

### analytics/
Máximos: `RentabilidadMesasPanel.jsx` 248, `IngenieriaMenuPanel.jsx` 234, `AnalyticsPage.jsx` 111. **✅ Split completo**.

### director/
Máximos: `VentaLiveTicketPanel.jsx` 204, `VentaLiveCards.jsx` 164, `DashboardKPIs.jsx` 153, `VentaLivePage.jsx` 76, `DashboardPage.jsx` orquestador corto que delega en `DashboardKPIs` (<25 líneas en disco según conteo local). **✅ Split completo** (máx. comprobado 204).

### empleados/
Máximos: `hooks/useFichajes.js` 250, `EmpleadoModal.jsx` 221, `hooks/useCuadrante.js` 210, `NominaCalcularModal.jsx` 208, `EmpleadosTable.jsx` 199, `CuadranteGrid.jsx` 191, `FichajesList.jsx` 182, `hooks/useEmpleados.js` 179. **✅ Split completo**.

### admin/carta/
Máximos: `ProductosPanel.jsx` 256, `hooks/useCarta.js` 220, `ProductoModal.jsx` 161, `CartaPage.jsx` 110. **✅ Split completo**.

### admin/recetas/
Máximos: `hooks/useRecetas.js` 249, `RecetaDetalleIngredientesSection.jsx` 233, `RecetaDetalleModal.jsx` 165, `RecetasPage.jsx` 133. **✅ Split completo**.

### admin/sala/
Máximos: `MesasAdminTable.jsx` 263, `hooks/useMesasAdmin.js` 195, `MesaAdminModal.jsx` 142, `GestionSalaPage.jsx` 30. **✅ Split completo** (263 < 300).

### cocina/ (KDS)
`components/KdsTicketCard.jsx` 134, `KDSPage.jsx` 129, `hooks/useKdsComandas.js` 86. **✅ Split completo**.

### sala/ (Mesas)
`components/MesaCard.jsx` 106, `MesasPage.jsx` 50. **✅ Split completo**.

### components/layout/ (Sidebar)
`constants/navConfig.js` 195, `Sidebar.jsx` 100, `AppLayout.jsx` 44, `SidebarNav.jsx` 40. **✅ Split completo**.

---

## 2. SPLIT BACKEND — estado real

Conteo: solo `*.py` bajo cada ruta, excluyendo `__pycache__`. Totales de **módulo** = suma de `.py` del dominio; **máximo** = archivo más largo.

| Dominio | Archivos .py | Líneas totales (aprox.) | Archivo más largo | Líneas max | Estado |
|---------|-------------:|------------------------:|---------------------|-----------:|--------|
| **tpv/** | 12 | 1074 | `tpv_pagos.py` | 213 | ✅ |
| **tpv_cobro** | `tpv/tpv_cobro.py` | — | (orquestador) | 15 | ✅ |
| **proveedores/** (+ facturas en paquete) | 10 | 917 | `facturas_proveedor_mutations.py` | 184 | ✅ |
| **facturas_proveedor** | (mismo paquete `proveedores/`) | — | idem | 184 | ✅ |
| **mesas** | `mesas.py`, `mesas_list.py`, `mesas_mutations.py`, `mesas_shared.py` | 401 | `mesas_mutations.py` | 221 | ✅ |
| **reservas/** | 7 | 666 | `reservas_write.py` | 246 | ✅ |
| **inventario/** | 10 | 680 | `inventario_movimientos_core.py` | 280 | ✅ |
| **inventario_movimientos** | (submódulos bajo `inventario/`) | — | idem | 280 | ✅ |
| **empleados/** | 6 | 1231 | `fichajes.py` | 344 | ⚠️ Split parcial (`fichajes.py` >300) |
| **clientes/** | 4 | 486 | `clientes.py` | 257 | ✅ |
| **kds/** | 4 | 537 | `kds_estados.py` | 293 | ✅ |
| **fifo/** | 4 | 543 | `fifo_consumo.py` | 287 | ✅ |
| **analytics/** | 5 | 467 | `analytics_menu.py` | 175 | ✅ |
| **reportes/** | 8 | 629 | `reportes.py` | 162 | ✅ |
| **admin_carta/** | 4 | 551 | `admin_productos.py` | 290 | ✅ |
| **recetas/** | 4 | 558 | `admin_recetas_ingredientes.py` | 307 | ⚠️ Split parcial (un archivo =307, umbral estricto 300) |
| **appcc** | `appcc.py` | — | monolito | 340 | ⚠️ / ❌ Un solo archivo 340 líneas (sin carpeta split) |
| **nominas** | `nominas.py` | — | monolito | 291 | ✅ |
| **verifactu** | `verifactu.py` | — | monolito | 204 | ✅ |
| **dashboard** | `dashboard.py` | — | monolito | 194 | ✅ |

**Totales globales verificados**
- `backend/routers/`: **89** archivos `.py`, **10041** líneas (incluye `__init__.py` donde existan).
- `backend/services/`: **10** archivos `.py` (incl. `__init__.py` vacío), **1043** líneas.
- `backend/sql/`: **1** archivo, **39** líneas — solo `migration_kds_barra_destino.sql`.
- `backend/main.py`: **164** líneas.
- `backend/auth/`: **4** archivos `.py`, **97** líneas.

---

## 3. SUPERADMIN / TENANTS / PERMISOS — ¿existe en el código?

| Ítem | Resultado | Evidencia |
|------|-----------|-----------|
| Rol `superadmin` en CHECK de tabla usuarios | ❌ no existe | Búsqueda `superadmin` en el repo: **0 coincidencias**. En [PRD_HorecaSO.md](PRD_HorecaSO.md) el `CREATE TABLE usuarios` lista roles en comentario sin `superadmin`. |
| Tabla `platform_logs` | ❌ no existe | `platform_logs`: **0 coincidencias** en repo. |
| Tabla `tenant_audit_log` | ❌ no existe | `tenant_audit_log`: **0 coincidencias**. |
| Tabla `usuario_permisos` | ❌ no existe | `usuario_permisos`: **0 coincidencias**. |
| Router `/api/superadmin` | ❌ no existe | Sin coincidencias `superadmin` / `/superadmin` en `backend/`. |
| Router `/api/admin/usuarios` | ❌ no existe | Sin rutas obvias de gestión masiva de usuarios por tenant en grep; no hay carpeta dedicada en routers. |
| `frontend/src/pages/superadmin/` | ❌ no existe | Glob: **0 archivos**. |
| `frontend/src/pages/admin/usuarios/` | ❌ no existe | Glob: **0 archivos**. |
| `backend/sql/seed_restauranteprueba.sql` | ❌ no existe | Glob en repo: **0 archivos** con ese nombre. |
| Referencia tenant `11111111-1111-1111-1111-111111111111` | ❌ no existe | Búsqueda literal: **0 coincidencias**. (STEP usa demo `00000000-0000-0000-0000-000000000001`.) |

**Nota:** Multi-tenant a nivel de datos **sí** aparece en PRD (`tenants`, `usuarios.tenant_id`); lo anterior se refiere a **superadmin / auditoría / permisos granulares** como en la checklist.

---

## 4. MIGRACIÓN KDS — estado

| Pregunta | Respuesta |
|----------|-----------|
| ¿Existe `backend/sql/migration_kds_barra_destino.sql`? | ✅ Sí (único `.sql` en `backend/sql/`). |
| ¿El código usa `destino_kds`, `enviado_barra`, `estado_barra`? | ✅ Sí. Archivos donde aparecen (muestra verificada): `backend/sql/migration_kds_barra_destino.sql`, `backend/routers/kds/kds.py`, `backend/routers/kds/kds_estados.py`, `backend/routers/kds/kds_shared.py`, `backend/routers/tpv/tpv_lineas.py`, `backend/routers/tpv/tpv_shared.py`, `backend/routers/admin_carta/admin_productos.py`, `backend/routers/admin_carta/admin_carta_shared.py`, `frontend/src/pages/admin/carta/components/ProductosPanel.jsx`, `ProductoModal.jsx`, hooks `useCarta.js`, `useCartaModalOpeners.js`. |
| BUG-008 en [BUGS_Y_SOLUCIONES.md](BUGS_Y_SOLUCIONES.md) | ⏳ **Sigue pendiente** en documentación: *«hasta ejecutar SQL»* en Supabase; el fix es operativo en BD, no cambio de código. |

---

## 5. PENDIENTES DE [Penientes.md](./Penientes.md) — ¿hechos o no?

| Ítem | Estado | Evidencia |
|------|--------|-----------|
| Modal IA proveedores (flujo confirmación completo) | ⏳ parcial | [EscaneoIAModal.jsx](frontend/src/pages/proveedores/components/EscaneoIAModal.jsx): proveedor, líneas con artículo, `createFacturaProveedor` → `POST /facturas-proveedor` ✅. **No** hay en [facturas_proveedor_mutations.py](backend/routers/proveedores/facturas_proveedor_mutations.py) inserción en movimientos de stock al crear factura (solo `facturas_proveedor` + líneas). Penientes pide además *actualizar stock automáticamente* → pendiente. |
| Soporte PDF en escaneo IA | ❌ pendiente | [EscaneoIAModal.jsx](frontend/src/pages/proveedores/components/EscaneoIAModal.jsx) línea ~167: `accept="image/*"` solamente; no `application/pdf`. |
| Cámara directa móvil (`capture="environment"`) | ❌ pendiente | Mismo `<input type="file">`: sin atributo `capture`. |
| PWA (manifest + service worker) | ❌ pendiente | Búsqueda en `frontend/`: sin `manifest.json`, `serviceWorker` ni `service-worker` en rutas revisadas. |
| Refactor páginas grandes (Reservas, Clientes, etc.) | ⏳ parcial / ✅ según módulo | Conteos actuales: `ReservasPage.jsx` 146, `ClientesPage.jsx` 119, empleados/nóminas troceados en carpeta `empleados/`. [INVENTARIO_ARCHIVOS_GRANDES.md](./INVENTARIO_ARCHIVOS_GRANDES.md) **sigue describiendo** monolitos antiguos (desactualizado respecto al árbol real). Queda deuda en **inventario**: `ArticulosTable.jsx` 329 líneas. |
| Auditoría cursorrules (require_roles, Decimal, dark:, mobile first) | ⏳ parcial | No se ha hecho barrido automatizado en esta auditoría; convenciones están en [.cursorrules](.cursorrules) y STEP; cumplimiento archivo a archivo no verificado aquí. |

---

## 6. ESTADO REAL DE CADA ARCHIVO MD

| Archivo | Valoración | Motivo breve |
|---------|------------|--------------|
| **STEP_HORECASO.md** | **ACTUALIZADO** (mayormente) | v3.3 con split backend, `redirect_slashes`, rutas admin carta/sala; alineado con árbol actual. |
| **ARQUITECTURA_HORECASO.md** | **ACTUALIZADO** (mayormente) | Describe monorepo y enlaces útiles; conviene revisar detalle de tabla de routers si se añaden más prefijos. |
| **BUGS_Y_SOLUCIONES.md** | **ACTUALIZADO** | Incluye BUG-005…008 y fechas recientes. |
| **INVENTARIO_ARCHIVOS_GRANDES.md** | **DESACTUALIZADO** | Lista `backend/routers/empleados.py`, `tpv.py` planos, páginas >1000 líneas que **ya no coinciden** con el repo actual (split en carpetas y páginas orquestadoras cortas). |
| **REFACTOR_SPLIT_ESTADO.md** | **REDUNDANTE / parcialmente DESACTUALIZADO** | Afirma Fase 2 frontend «100%» y «ningún archivo nuevo >~300»; en código real **`ArticulosTable.jsx` = 329** líneas. Solapa con STEP e inventario. |
| **Penientes.md** | **ACTUALIZADO** como lista de intención | Varios puntos siguen válidos (PDF, PWA, stock IA); el modal IA está **más avanzado** de lo que el título sugiere, salvo stock. |
| **GUIA_DESARROLLO_HorecaSO.md** | **REDUNDANTE / posiblemente DESACTUALIZADO** en estructura | Guía larga tipo tutorial; no auditada línea a línea frente al árbol actual; solapa con STEP/PRD. |
| **PRD_HorecaSO.md** | **ACTUALIZADO** en visión; **parcialmente DESACTUALIZADO** en schema | Schema base no refleja en el fragmento revisado campos como `destino_kds` / columnas barra (existen en migración y código). |

**PRD_HorecaSO.md** no estaba en la lista corta del §6 del enunciado pero se leyó parcialmente para roles/schema.

---

## 7. DEUDA TÉCNICA REAL — ordenada por prioridad

### 🔴 Bloquea deploy o primer cliente
| Qué | Archivo / zona | Complejidad |
|-----|----------------|-------------|
| Aplicar migración KDS en Supabase o KDS falla con 500 (`destino_kds` inexistente) — BUG-008 | `backend/sql/migration_kds_barra_destino.sql` + BD | **Pequeño** (operativo) |
| Sin stock al registrar factura desde IA / alta factura | `backend/routers/proveedores/facturas_proveedor_mutations.py` + inventario | **Medio** |

### 🟡 Importante pero no bloquea
| Qué | Archivo / zona | Complejidad |
|-----|----------------|-------------|
| `fichajes.py` >300 líneas | `backend/routers/empleados/fichajes.py` | **Medio** |
| `admin_recetas_ingredientes.py` ~307 líneas | `backend/routers/recetas/admin_recetas_ingredientes.py` | **Pequeño** |
| `appcc.py` monolítico 340 líneas | `backend/routers/appcc.py` | **Medio** |
| `ArticulosTable.jsx` 329 líneas | `frontend/src/pages/inventario/components/ArticulosTable.jsx` | **Medio** |
| PDF + cámara en flujo proveedores | `EscaneoIAModal.jsx`, backend escaneo | **Medio** |
| Documentación de inventario de tamaños desincronizada | `INVENTARIO_ARCHIVOS_GRANDES.md` | **Pequeño** |

### 🟢 Nice to have / cosmético
| Qué | Archivo / zona | Complejidad |
|-----|----------------|-------------|
| PWA (manifest + SW) | `frontend/` raíz + registro en `main.jsx` | **Medio** |
| Superadmin / auditoría multi-tenant avanzada | Nuevo routers + SQL | **Grande** |
| Auditoría sistemática `.cursorrules` en todos los archivos | Repo completo | **Grande** |

---

*Auditoría generada inspeccionando el árbol real del repositorio y búsquedas en código; no se modificó código fuente para este informe.*
