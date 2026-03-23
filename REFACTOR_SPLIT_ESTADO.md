# Estado del refactor “split puro” (marzo 2026)

## Completado (backend)

| Cambio | Archivos |
|--------|----------|
| **Empleados RRHH** | `empleados_shared.py` (helpers + ROLES), `empleados.py` (solo CRUD `/empleados`), `fichajes.py` (`/turnos`), `cuadrantes.py` (`/cuadrantes`), `ausencias.py` (`/ausencias`). |
| **TPV** | `tpv_shared.py` (helpers + `METODOS_PAGO` + Verifactu auxiliar), `tpv.py` (tickets/líneas hasta `delete_linea`), `tpv_cobro.py` (`/cobrar`, `/pagos`). |
| **Proveedores** | `proveedores_shared.py`, `proveedores.py` (CRUD `/proveedores`), `facturas_proveedor.py` (`/facturas-proveedor`, escaneo IA). |
| **Inventario** | `inventario_shared.py`, `inventario.py` (artículos CRUD), `inventario_movimientos.py` (alertas, movimientos, inventario físico). |
| **Reservas** | `reservas_shared.py`, `reservas.py` (CRUD reservas), `lista_espera.py` (`lista_espera_router`). |
| **Admin recetas** | `admin_recetas_shared.py`, `admin_recetas.py` (CRUD recetas, listado), `admin_recetas_ingredientes.py` (semáforo, ingredientes, coste). |
| **Admin carta** | `admin_carta_shared.py` (tenant, sanitizers, dinero, `_normalize_destino_kds` alineado con `migration_kds_barra_destino.sql`), `admin_carta.py` (categorías + `router_alergenos`), `admin_productos.py` (productos + alérgenos por producto). |
| **KDS** | `kds_shared.py`, `kds.py` (`/comandas`), `kds_estados.py` (PATCH línea, `/estadisticas`). |
| **FIFO** | `fifo_shared.py`, `fifo.py` (`/lotes`), `fifo_consumo.py` (`/consumir`, alertas, valoración). |
| **Clientes** | `clientes_shared.py`, `clientes.py` (CRUD), `clientes_historial.py` (historial, puntos). |
| **Analytics** | `analytics_shared.py`, `analytics_mesas.py`, `analytics_menu.py`, `analytics_personal.py` (todos con `prefix="/dashboard"` → rutas finales `/api/dashboard/...` vía `main.py`). |
| **Reportes diferenciales** | `reportes_dif_shared.py`, `reportes_dif_ventas.py`, `reportes_dif_personal.py`, `reportes_dif_carta.py`, `reportes_dif_proveedores.py`, `reportes_dif_appcc.py`; `reportes.py` registra los cinco. Eliminado `reportes_diferenciales.py`. |
| **PDF diferenciales** | `services/pdf_diferenciales_shared.py` (`_q2`, `_m`), `services/pdf_diferenciales.py` (`pdf_cuadrante`), `services/pdf_diferenciales_bcg.py` (`pdf_rentabilidad_platos`). |
| **main.py** | `include_router` para todos los routers nuevos (mismos prefijos HTTP que antes). |

Verificación: en entorno con dependencias instaladas, desde `backend/`:

`python -c "from main import create_app; create_app()"`

En esta sesión el entorno de prueba no tenía `bcrypt` instalado (`ModuleNotFoundError`); **todos los módulos `routers/*.py` pasan `python -m py_compile`**.

## Pendiente

### Frontend (todos los pages + Sidebar + opcional api.js)

Orden indicado: Inventario, Facturas, FIFO, Carta, Reservas, TPV, Analytics, Clientes, Mermas, APPCC, Recetas, VentaLive, Nominas, Fichajes, Cuadrante, GestionSala, Empleados, Proveedores, KDS, Dashboard; `constants/navConfig.js` desde `Sidebar.jsx`.

## Notas

- Los módulos `*_shared.py` son **solo código movido** para evitar duplicar helpers entre routers del mismo dominio.
- `_normalize_destino_kds` faltaba en `admin_carta.py`; se añadió en `admin_carta_shared.py` con la misma lógica que el `CASE` comentado en `backend/sql/migration_kds_barra_destino.sql` (explícito en body → si no, receta→cocina, bebida→barra, si no→ninguno).
