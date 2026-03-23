# Estado del refactor “split puro” (marzo 2026)

## Completado (backend)

| Cambio | Archivos |
|--------|----------|
| **Empleados RRHH** | `empleados_shared.py` (helpers + ROLES), `empleados.py` (solo CRUD `/empleados`), `fichajes.py` (`/turnos`), `cuadrantes.py` (`/cuadrantes`), `ausencias.py` (`/ausencias`). |
| **TPV** | `tpv_shared.py` (helpers + `METODOS_PAGO` + Verifactu auxiliar), `tpv.py` (tickets/líneas hasta `delete_linea`), `tpv_cobro.py` (`/cobrar`, `/pagos`). |
| **main.py** | `include_router` para `tpv_cobro_router`, `fichajes_router`, `cuadrantes_router`, `ausencias_router`, `facturas_proveedor_router` (además de los existentes). |
| **Proveedores** | `proveedores_shared.py`, `proveedores.py` (CRUD `/proveedores`), `facturas_proveedor.py` (`/facturas-proveedor`, escaneo IA). Scripts auxiliares: `backend/scripts/_gen_proveedores_split.py` y `_gen_proveedores_split2.py` (regenerar si hace falta). |

Verificación: `python -c "from main import create_app; create_app()"` en `backend/` → **OK**.

## Pendiente (mismo criterio: solo mover bloques, mismas rutas)

### Backend routers / services (según tu lista)
- `inventario.py` → `inventario.py` + `inventario_movimientos.py`
- `reservas.py` → `reservas.py` + `lista_espera.py` (quitar `lista_espera_router` de `reservas.py` y exportarlo desde el nuevo archivo; actualizar import en `main.py`).
- `admin_recetas.py` → `admin_recetas.py` + `admin_recetas_ingredientes.py`
- `admin_carta.py` → `admin_carta.py` + `admin_productos.py` (+ mantener `router_alergenos` según exports actuales).
- `kds.py` → `kds.py` + `kds_estados.py`
- `fifo.py` → `fifo.py` + `fifo_consumo.py`
- `clientes.py` → `clientes.py` + `clientes_historial.py`
- `analytics.py` → `analytics_mesas.py`, `analytics_menu.py`, `analytics_personal.py` (prefijo `/api/dashboard` como ahora).
- `reportes_diferenciales.py` → 5 módulos + `main.py`.
- `services/pdf_diferenciales.py` → `pdf_diferenciales.py` + `pdf_diferenciales_bcg.py` y ajustar imports en routers que usen `pdf_rentabilidad_platos` / `pdf_cuadrante`.

### Frontend (todos los pages + Sidebar + opcional api.js)

Orden indicado: Inventario, Facturas, FIFO, Carta, Reservas, TPV, Analytics, Clientes, Mermas, APPCC, Recetas, VentaLive, Nominas, Fichajes, Cuadrante, GestionSala, Empleados, Proveedores, KDS, Dashboard; `constants/navConfig.js` desde `Sidebar.jsx`.

## Notas

- Los módulos `*_shared.py` no estaban en la lista original del usuario; son **solo código movido** para evitar duplicar helpers entre routers del mismo dominio (misma regla que en muchos codebases tras un split mecánico).
- Tras cada grupo de cambios conviene volver a ejecutar el import de `main` y, si aplica, `npm run build` en `frontend/`.
