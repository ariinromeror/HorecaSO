# HorecaSO — Schema completo de la base de datos

Documento de referencia alineado con **PostgreSQL / Supabase** (esquema `public`).

**Fuente:** volcado `list_tables` (verbose) vía MCP Supabase, 27/03/2026.

**Total de tablas en `public`:** 42

**RLS:** en la instancia auditada, Row Level Security estaba **desactivado** en todas las tablas listadas; antes de producción con clientes reales conviene políticas por `tenant_id` donde aplique.

**`tenants.activo`:** presente en esta instancia (migración Fase B aplicada).

---

## Índice de tablas

| Tabla | Descripción |
|-------|-------------|
| [alergenos](#alergenos) | Catálogo de alérgenos alimentarios |
| [articulos](#articulos) | Artículos de almacén e inventario |
| [ausencias](#ausencias) | Ausencias registradas de empleados |
| [categorias_menu](#categorias_menu) | Categorías de la carta del restaurante |
| [cierres_caja](#cierres_caja) | Cierres de caja diarios por outlet |
| [clientes](#clientes) | Clientes con historial y fidelización |
| [configuracion](#configuracion) | Configuración clave-valor por tenant |
| [cuadrante_asignaciones](#cuadrante_asignaciones) | Asignaciones de empleados a cuadrantes |
| [cuadrantes](#cuadrantes) | Cuadrantes semanales de turnos |
| [empleados](#empleados) | Datos laborales de empleados |
| [facturas_proveedor](#facturas_proveedor) | Facturas recibidas de proveedores |
| [facturas_proveedor_lineas](#facturas_proveedor_lineas) | Líneas de cada factura de proveedor |
| [ingenieria_menu](#ingenieria_menu) | Análisis de rentabilidad por producto (BCG) |
| [lista_espera](#lista_espera) | Lista de espera de clientes sin reserva |
| [lotes_inventario](#lotes_inventario) | Lotes de stock con fecha de caducidad (FIFO) |
| [mermas](#mermas) | Registro de pérdidas y mermas de stock |
| [mesas](#mesas) | Mesas físicas del restaurante |
| [movimientos_stock](#movimientos_stock) | Historial de entradas y salidas de stock |
| [nominas](#nominas) | Nóminas mensuales de empleados |
| [notificaciones](#notificaciones) | Notificaciones internas del sistema |
| [outlets](#outlets) | Locales o puntos de venta de un tenant |
| [pedidos_proveedor](#pedidos_proveedor) | Pedidos realizados a proveedores |
| [pedidos_proveedor_lineas](#pedidos_proveedor_lineas) | Líneas de cada pedido a proveedor |
| [platform_logs](#platform_logs) | Registro de actividad de plataforma (superadmin) |
| [producto_alergenos](#producto_alergenos) | Relación muchos-a-muchos producto / alérgeno |
| [productos](#productos) | Productos de la carta |
| [proveedores](#proveedores) | Proveedores del restaurante |
| [receta_ingredientes](#receta_ingredientes) | Ingredientes de cada receta |
| [recetas](#recetas) | Recetas vinculadas a productos |
| [registros_appcc](#registros_appcc) | Controles de seguridad alimentaria (APPCC) |
| [rentabilidad_mesas](#rentabilidad_mesas) | Métricas de rentabilidad por mesa y ticket |
| [reservas](#reservas) | Reservas de clientes |
| [solicitudes_ausencia](#solicitudes_ausencia) | Solicitudes de ausencia de empleados |
| [tenant_audit_log](#tenant_audit_log) | Auditoría de cambios por tenant |
| [tenants](#tenants) | Restaurantes / empresas en la plataforma |
| [ticket_lineas](#ticket_lineas) | Líneas de productos dentro de un ticket |
| [ticket_pagos](#ticket_pagos) | Pagos registrados por ticket |
| [tickets](#tickets) | Tickets / comandas de venta |
| [turnos](#turnos) | Fichajes y turnos de empleados |
| [usuario_permisos](#usuario_permisos) | Permisos granulares por usuario y tenant |
| [usuarios](#usuarios) | Usuarios del sistema con rol y acceso |
| [verifactu_registros](#verifactu_registros) | Registros fiscales Verifactu (AEAT) |

---

## Tablas Fase B (plataforma)

Incluidas en este volcado: `platform_logs`, `tenant_audit_log`, `usuario_permisos` (DDL en [backend/sql/migration_fase_b.sql](backend/sql/migration_fase_b.sql)).

---

## Notas generales

- Claves primarias: mayoría `id UUID` con `gen_random_uuid()`; `alergenos.id` es `serial`/`integer`.
- `producto_alergenos`: PK compuesta (`producto_id`, `alergeno_id`).
- Dinero y cantidades sensibles: tipos `numeric`.
- `usuarios.rol`: CHECK incluye `superadmin`, `admin`, `director`, `jefe_sala`, `camarero`, `cocina`, `barra`, `almacen`.
- `productos.destino_kds`: CHECK `cocina` | `barra` | `ninguno`.

---

## Tablas (detalle)

### alergenos

**Filas (snapshot MCP):** 14 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | int4 | updatable; default: `nextval('alergenos_id_seq'::regclass)` |
| nombre | varchar | updatable; — |
| icono | varchar | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `producto_alergenos_alergeno_id_fkey`: `public.producto_alergenos.alergeno_id` → `public.alergenos.id`

---

### articulos

**Filas (snapshot MCP):** 1 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| nombre | varchar | updatable; — |
| sku | varchar | nullable, updatable; — |
| unidad_medida | varchar | updatable; — |
| stock_actual | numeric | nullable, updatable; default: `0` |
| stock_minimo | numeric | nullable, updatable; default: `0` |
| coste_unitario | numeric | nullable, updatable; default: `0` |
| created_at | timestamptz | nullable, updatable; default: `now()` |
| categoria_almacen | varchar | nullable, updatable; — |
| temperatura_almacen | varchar | nullable, updatable; — |
| stock_maximo | numeric | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `movimientos_stock_articulo_id_fkey`: `public.movimientos_stock.articulo_id` → `public.articulos.id`
- `articulos_tenant_id_fkey`: `public.articulos.tenant_id` → `public.tenants.id`
- `lotes_inventario_articulo_id_fkey`: `public.lotes_inventario.articulo_id` → `public.articulos.id`
- `facturas_proveedor_lineas_articulo_id_fkey`: `public.facturas_proveedor_lineas.articulo_id` → `public.articulos.id`
- `receta_ingredientes_articulo_id_fkey`: `public.receta_ingredientes.articulo_id` → `public.articulos.id`
- `pedidos_proveedor_lineas_articulo_id_fkey`: `public.pedidos_proveedor_lineas.articulo_id` → `public.articulos.id`
- `mermas_articulo_id_fkey`: `public.mermas.articulo_id` → `public.articulos.id`

---

### ausencias

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| empleado_id | uuid | nullable, updatable; — |
| outlet_id | uuid | nullable, updatable; — |
| tipo | varchar | updatable; — |
| fecha_inicio | date | updatable; — |
| fecha_fin | date | updatable; — |
| dias | int4 | nullable, updatable; — |
| estado | varchar | nullable, updatable; default: `'pendiente'::character varying` |
| motivo | text | nullable, updatable; — |
| aprobado_por | uuid | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `ausencias_aprobado_por_fkey`: `public.ausencias.aprobado_por` → `public.usuarios.id`
- `ausencias_empleado_id_fkey`: `public.ausencias.empleado_id` → `public.empleados.id`
- `ausencias_outlet_id_fkey`: `public.ausencias.outlet_id` → `public.outlets.id`

---

### categorias_menu

**Filas (snapshot MCP):** 2 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| nombre | varchar | updatable; — |
| orden | int4 | nullable, updatable; default: `0` |
| icono | varchar | nullable, updatable; — |
| color | varchar | nullable, updatable; default: `'#6366f1'::character varying` |
| activo | bool | nullable, updatable; default: `true` |

**PK:** id

**FKs (restricciones):**
- `productos_categoria_id_fkey`: `public.productos.categoria_id` → `public.categorias_menu.id`
- `categorias_menu_tenant_id_fkey`: `public.categorias_menu.tenant_id` → `public.tenants.id`

---

### cierres_caja

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| outlet_id | uuid | nullable, updatable; — |
| usuario_id | uuid | nullable, updatable; — |
| fecha | date | updatable; — |
| total_efectivo | numeric | nullable, updatable; default: `0` |
| total_tarjeta | numeric | nullable, updatable; default: `0` |
| total_bizum | numeric | nullable, updatable; default: `0` |
| total_transferencia | numeric | nullable, updatable; default: `0` |
| total_invitaciones | numeric | nullable, updatable; default: `0` |
| total_ventas | numeric | nullable, updatable; default: `0` |
| num_tickets | int4 | nullable, updatable; default: `0` |
| ticket_medio | numeric | nullable, updatable; default: `0` |
| notas | text | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `cierres_caja_usuario_id_fkey`: `public.cierres_caja.usuario_id` → `public.usuarios.id`
- `cierres_caja_outlet_id_fkey`: `public.cierres_caja.outlet_id` → `public.outlets.id`

---

### clientes

**Filas (snapshot MCP):** 1 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| nombre | varchar | updatable; — |
| email | varchar | nullable, updatable; — |
| telefono | varchar | nullable, updatable; — |
| fecha_nacimiento | date | nullable, updatable; — |
| alergenos | _text | nullable, updatable; — |
| preferencias | text | nullable, updatable; — |
| total_visitas | int4 | nullable, updatable; default: `0` |
| gasto_total | numeric | nullable, updatable; default: `0` |
| gasto_medio | numeric | nullable, updatable; default: `0` |
| ultima_visita | date | nullable, updatable; — |
| puntos_fidelidad | int4 | nullable, updatable; default: `0` |
| notas | text | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `reservas_cliente_id_fkey`: `public.reservas.cliente_id` → `public.clientes.id`
- `clientes_tenant_id_fkey`: `public.clientes.tenant_id` → `public.tenants.id`

---

### configuracion

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| clave | varchar | updatable; — |
| valor | text | updatable; — |
| descripcion | text | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `configuracion_tenant_id_fkey`: `public.configuracion.tenant_id` → `public.tenants.id`

---

### cuadrante_asignaciones

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| cuadrante_id | uuid | nullable, updatable; — |
| empleado_id | uuid | nullable, updatable; — |
| fecha | date | updatable; — |
| hora_inicio | time | nullable, updatable; — |
| hora_fin | time | nullable, updatable; — |
| puesto | varchar | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `cuadrante_asignaciones_empleado_id_fkey`: `public.cuadrante_asignaciones.empleado_id` → `public.empleados.id`
- `cuadrante_asignaciones_cuadrante_id_fkey`: `public.cuadrante_asignaciones.cuadrante_id` → `public.cuadrantes.id`

---

### cuadrantes

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| outlet_id | uuid | nullable, updatable; — |
| semana_inicio | date | updatable; — |
| semana_fin | date | updatable; — |
| publicado | bool | nullable, updatable; default: `false` |
| created_by | uuid | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `cuadrantes_created_by_fkey`: `public.cuadrantes.created_by` → `public.usuarios.id`
- `cuadrantes_outlet_id_fkey`: `public.cuadrantes.outlet_id` → `public.outlets.id`
- `cuadrante_asignaciones_cuadrante_id_fkey`: `public.cuadrante_asignaciones.cuadrante_id` → `public.cuadrantes.id`

---

### empleados

**Filas (snapshot MCP):** 1 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| usuario_id | uuid | nullable, updatable; — |
| dni | varchar | nullable, updatable; — |
| cargo | varchar | nullable, updatable; — |
| fecha_inicio | date | nullable, updatable; — |
| activo | bool | nullable, updatable; default: `true` |
| nss | varchar | nullable, updatable; — |
| contrato | varchar | nullable, updatable; — |
| jornada_horas | numeric | nullable, updatable; default: `40` |
| irpf_porcentaje | numeric | nullable, updatable; — |
| iban | varchar | nullable, updatable; — |
| salario_bruto_mensual | numeric | nullable, updatable; — |
| nombre_completo | varchar | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `empleados_tenant_id_fkey`: `public.empleados.tenant_id` → `public.tenants.id`
- `cuadrante_asignaciones_empleado_id_fkey`: `public.cuadrante_asignaciones.empleado_id` → `public.empleados.id`
- `nominas_empleado_id_fkey`: `public.nominas.empleado_id` → `public.empleados.id`
- `turnos_empleado_id_fkey`: `public.turnos.empleado_id` → `public.empleados.id`
- `empleados_usuario_id_fkey`: `public.empleados.usuario_id` → `public.usuarios.id`
- `ausencias_empleado_id_fkey`: `public.ausencias.empleado_id` → `public.empleados.id`
- `solicitudes_ausencia_empleado_id_fkey`: `public.solicitudes_ausencia.empleado_id` → `public.empleados.id`

---

### facturas_proveedor

**Filas (snapshot MCP):** 1 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| proveedor_id | uuid | nullable, updatable; — |
| numero_factura | varchar | nullable, updatable; — |
| fecha | date | updatable; — |
| total | numeric | updatable; — |
| procesada_ia | bool | nullable, updatable; default: `false` |
| imagen_url | text | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |
| fecha_vencimiento | date | nullable, updatable; — |
| pagada | bool | nullable, updatable; default: `false` |
| pagada_at | timestamptz | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `facturas_proveedor_tenant_id_fkey`: `public.facturas_proveedor.tenant_id` → `public.tenants.id`
- `facturas_proveedor_lineas_factura_id_fkey`: `public.facturas_proveedor_lineas.factura_id` → `public.facturas_proveedor.id`
- `facturas_proveedor_proveedor_id_fkey`: `public.facturas_proveedor.proveedor_id` → `public.proveedores.id`

---

### facturas_proveedor_lineas

**Filas (snapshot MCP):** 1 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| factura_id | uuid | nullable, updatable; — |
| articulo_id | uuid | nullable, updatable; — |
| cantidad | numeric | updatable; — |
| coste_unitario | numeric | updatable; — |
| subtotal | numeric | updatable; — |

**PK:** id

**FKs (restricciones):**
- `facturas_proveedor_lineas_articulo_id_fkey`: `public.facturas_proveedor_lineas.articulo_id` → `public.articulos.id`
- `facturas_proveedor_lineas_factura_id_fkey`: `public.facturas_proveedor_lineas.factura_id` → `public.facturas_proveedor.id`

---

### ingenieria_menu

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| producto_id | uuid | nullable, updatable; — |
| tenant_id | uuid | nullable, updatable; — |
| periodo_inicio | date | updatable; — |
| periodo_fin | date | updatable; — |
| unidades_vendidas | int4 | nullable, updatable; default: `0` |
| ingreso_total | numeric | nullable, updatable; default: `0` |
| coste_total | numeric | nullable, updatable; default: `0` |
| margen_total | numeric | nullable, updatable; default: `0` |
| margen_porcentaje | numeric | nullable, updatable; default: `0` |
| clasificacion | varchar | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `ingenieria_menu_tenant_id_fkey`: `public.ingenieria_menu.tenant_id` → `public.tenants.id`
- `ingenieria_menu_producto_id_fkey`: `public.ingenieria_menu.producto_id` → `public.productos.id`

---

### lista_espera

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| outlet_id | uuid | nullable, updatable; — |
| nombre_cliente | varchar | updatable; — |
| telefono | varchar | nullable, updatable; — |
| num_personas | int4 | updatable; — |
| hora_llegada | timestamptz | nullable, updatable; default: `now()` |
| estado | varchar | nullable, updatable; default: `'esperando'::character varying` |
| tiempo_estimado | int4 | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `lista_espera_outlet_id_fkey`: `public.lista_espera.outlet_id` → `public.outlets.id`

---

### lotes_inventario

**Filas (snapshot MCP):** 1 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| articulo_id | uuid | nullable, updatable; — |
| outlet_id | uuid | nullable, updatable; — |
| cantidad | numeric | updatable; — |
| coste_unitario | numeric | updatable; — |
| fecha_caducidad | date | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |
| numero_lote | varchar | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `lotes_inventario_outlet_id_fkey`: `public.lotes_inventario.outlet_id` → `public.outlets.id`
- `lotes_inventario_articulo_id_fkey`: `public.lotes_inventario.articulo_id` → `public.articulos.id`

---

### mermas

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| outlet_id | uuid | nullable, updatable; — |
| articulo_id | uuid | nullable, updatable; — |
| cantidad | numeric | updatable; — |
| motivo | varchar | updatable; — |
| coste_imputado | numeric | nullable, updatable; — |
| usuario_id | uuid | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `mermas_outlet_id_fkey`: `public.mermas.outlet_id` → `public.outlets.id`
- `mermas_articulo_id_fkey`: `public.mermas.articulo_id` → `public.articulos.id`
- `mermas_usuario_id_fkey`: `public.mermas.usuario_id` → `public.usuarios.id`

---

### mesas

**Filas (snapshot MCP):** 17 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| outlet_id | uuid | nullable, updatable; — |
| numero | int4 | updatable; — |
| capacidad | int4 | nullable, updatable; default: `4` |
| estado | varchar | nullable, updatable; default: `'libre'::character varying` |
| posicion_x | numeric | nullable, updatable; — |
| posicion_y | numeric | nullable, updatable; — |
| zona | varchar | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `rentabilidad_mesas_mesa_id_fkey`: `public.rentabilidad_mesas.mesa_id` → `public.mesas.id`
- `reservas_mesa_id_fkey`: `public.reservas.mesa_id` → `public.mesas.id`
- `tickets_mesa_id_fkey`: `public.tickets.mesa_id` → `public.mesas.id`
- `mesas_outlet_id_fkey`: `public.mesas.outlet_id` → `public.outlets.id`

---

### movimientos_stock

**Filas (snapshot MCP):** 2 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| articulo_id | uuid | nullable, updatable; — |
| outlet_id | uuid | nullable, updatable; — |
| tipo | varchar | updatable; — |
| cantidad | numeric | updatable; — |
| coste_unitario | numeric | nullable, updatable; — |
| motivo | text | nullable, updatable; — |
| usuario_id | uuid | nullable, updatable; — |
| ticket_id | uuid | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `movimientos_stock_usuario_id_fkey`: `public.movimientos_stock.usuario_id` → `public.usuarios.id`
- `movimientos_stock_articulo_id_fkey`: `public.movimientos_stock.articulo_id` → `public.articulos.id`
- `movimientos_stock_outlet_id_fkey`: `public.movimientos_stock.outlet_id` → `public.outlets.id`
- `movimientos_stock_ticket_id_fkey`: `public.movimientos_stock.ticket_id` → `public.tickets.id`

---

### nominas

**Filas (snapshot MCP):** 1 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| empleado_id | uuid | nullable, updatable; — |
| mes | int4 | updatable; — |
| anio | int4 | updatable; — |
| salario_bruto | numeric | updatable; — |
| horas_extra_importe | numeric | nullable, updatable; default: `0` |
| plus_festivos | numeric | nullable, updatable; default: `0` |
| otros_devengos | numeric | nullable, updatable; default: `0` |
| total_devengos | numeric | updatable; — |
| ss_empleado | numeric | updatable; — |
| irpf | numeric | updatable; — |
| otras_deducciones | numeric | nullable, updatable; default: `0` |
| total_deducciones | numeric | updatable; — |
| liquido | numeric | updatable; — |
| ss_empresa | numeric | updatable; — |
| coste_total_empresa | numeric | updatable; — |
| pagada | bool | nullable, updatable; default: `false` |
| pdf_url | text | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `nominas_empleado_id_fkey`: `public.nominas.empleado_id` → `public.empleados.id`

---

### notificaciones

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| usuario_id | uuid | nullable, updatable; — |
| tipo | varchar | updatable; — |
| titulo | varchar | updatable; — |
| mensaje | text | nullable, updatable; — |
| leida | bool | nullable, updatable; default: `false` |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `notificaciones_usuario_id_fkey`: `public.notificaciones.usuario_id` → `public.usuarios.id`
- `notificaciones_tenant_id_fkey`: `public.notificaciones.tenant_id` → `public.tenants.id`

---

### outlets

**Filas (snapshot MCP):** 2 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| nombre | varchar | updatable; — |
| num_mesas | int4 | nullable, updatable; default: `0` |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `ausencias_outlet_id_fkey`: `public.ausencias.outlet_id` → `public.outlets.id`
- `registros_appcc_outlet_id_fkey`: `public.registros_appcc.outlet_id` → `public.outlets.id`
- `lotes_inventario_outlet_id_fkey`: `public.lotes_inventario.outlet_id` → `public.outlets.id`
- `rentabilidad_mesas_outlet_id_fkey`: `public.rentabilidad_mesas.outlet_id` → `public.outlets.id`
- `cuadrantes_outlet_id_fkey`: `public.cuadrantes.outlet_id` → `public.outlets.id`
- `lista_espera_outlet_id_fkey`: `public.lista_espera.outlet_id` → `public.outlets.id`
- `mermas_outlet_id_fkey`: `public.mermas.outlet_id` → `public.outlets.id`
- `outlets_tenant_id_fkey`: `public.outlets.tenant_id` → `public.tenants.id`
- `usuarios_outlet_id_fkey`: `public.usuarios.outlet_id` → `public.outlets.id`
- `mesas_outlet_id_fkey`: `public.mesas.outlet_id` → `public.outlets.id`
- `tickets_outlet_id_fkey`: `public.tickets.outlet_id` → `public.outlets.id`
- `turnos_outlet_id_fkey`: `public.turnos.outlet_id` → `public.outlets.id`
- `reservas_outlet_id_fkey`: `public.reservas.outlet_id` → `public.outlets.id`
- `cierres_caja_outlet_id_fkey`: `public.cierres_caja.outlet_id` → `public.outlets.id`
- `movimientos_stock_outlet_id_fkey`: `public.movimientos_stock.outlet_id` → `public.outlets.id`
- `pedidos_proveedor_outlet_id_fkey`: `public.pedidos_proveedor.outlet_id` → `public.outlets.id`

---

### pedidos_proveedor

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| proveedor_id | uuid | nullable, updatable; — |
| outlet_id | uuid | nullable, updatable; — |
| estado | varchar | nullable, updatable; default: `'pendiente'::character varying` |
| fecha_pedido | date | updatable; default: `CURRENT_DATE` |
| fecha_entrega_estimada | date | nullable, updatable; — |
| total_estimado | numeric | nullable, updatable; — |
| notas | text | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `pedidos_proveedor_tenant_id_fkey`: `public.pedidos_proveedor.tenant_id` → `public.tenants.id`
- `pedidos_proveedor_lineas_pedido_id_fkey`: `public.pedidos_proveedor_lineas.pedido_id` → `public.pedidos_proveedor.id`
- `pedidos_proveedor_outlet_id_fkey`: `public.pedidos_proveedor.outlet_id` → `public.outlets.id`
- `pedidos_proveedor_proveedor_id_fkey`: `public.pedidos_proveedor.proveedor_id` → `public.proveedores.id`

---

### pedidos_proveedor_lineas

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| pedido_id | uuid | nullable, updatable; — |
| articulo_id | uuid | nullable, updatable; — |
| cantidad | numeric | updatable; — |
| precio_unitario_estimado | numeric | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `pedidos_proveedor_lineas_pedido_id_fkey`: `public.pedidos_proveedor_lineas.pedido_id` → `public.pedidos_proveedor.id`
- `pedidos_proveedor_lineas_articulo_id_fkey`: `public.pedidos_proveedor_lineas.articulo_id` → `public.articulos.id`

---

### platform_logs

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| nivel | text | updatable; check: `nivel = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text])` |
| tenant_id | uuid | nullable, updatable; — |
| usuario_id | uuid | nullable, updatable; — |
| modulo | text | updatable; — |
| accion | text | updatable; — |
| detalle | jsonb | nullable, updatable; — |
| ip | text | nullable, updatable; — |
| user_agent | text | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `platform_logs_usuario_id_fkey`: `public.platform_logs.usuario_id` → `public.usuarios.id`
- `platform_logs_tenant_id_fkey`: `public.platform_logs.tenant_id` → `public.tenants.id`

---

### producto_alergenos

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| producto_id | uuid | updatable; — |
| alergeno_id | int4 | updatable; — |

**PK:** producto_id, alergeno_id

**FKs (restricciones):**
- `producto_alergenos_alergeno_id_fkey`: `public.producto_alergenos.alergeno_id` → `public.alergenos.id`
- `producto_alergenos_producto_id_fkey`: `public.producto_alergenos.producto_id` → `public.productos.id`

---

### productos

**Filas (snapshot MCP):** 3 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| categoria_id | uuid | nullable, updatable; — |
| nombre | varchar | updatable; — |
| precio | numeric | updatable; — |
| tiene_receta | bool | nullable, updatable; default: `false` |
| activo | bool | nullable, updatable; default: `true` |
| imagen_url | text | nullable, updatable; — |
| descripcion | text | nullable, updatable; — |
| iva_porcentaje | numeric | nullable, updatable; default: `10.00` |
| es_bebida | bool | nullable, updatable; default: `false` |
| es_menu | bool | nullable, updatable; default: `false` |
| disponible_delivery | bool | nullable, updatable; default: `true` |
| tiempo_preparacion | int4 | nullable, updatable; default: `0` |
| precio_coste | numeric | nullable, updatable; — |
| destino_kds | varchar | nullable, updatable; default: `'cocina'::character varying` · check: `destino_kds::text = ANY (ARRAY['cocina'::character varying::text, 'barra'::character varying::text, 'ninguno'::character…` |

**PK:** id

**FKs (restricciones):**
- `productos_tenant_id_fkey`: `public.productos.tenant_id` → `public.tenants.id`
- `producto_alergenos_producto_id_fkey`: `public.producto_alergenos.producto_id` → `public.productos.id`
- `ingenieria_menu_producto_id_fkey`: `public.ingenieria_menu.producto_id` → `public.productos.id`
- `productos_categoria_id_fkey`: `public.productos.categoria_id` → `public.categorias_menu.id`
- `ticket_lineas_producto_id_fkey`: `public.ticket_lineas.producto_id` → `public.productos.id`
- `recetas_producto_id_fkey`: `public.recetas.producto_id` → `public.productos.id`

---

### proveedores

**Filas (snapshot MCP):** 1 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| nombre | varchar | updatable; — |
| nif | varchar | nullable, updatable; — |
| email | varchar | nullable, updatable; — |
| telefono | varchar | nullable, updatable; — |
| direccion | text | nullable, updatable; — |
| condiciones_pago | text | nullable, updatable; — |
| dias_entrega | int4 | nullable, updatable; default: `1` |
| activo | bool | nullable, updatable; default: `true` |

**PK:** id

**FKs (restricciones):**
- `proveedores_tenant_id_fkey`: `public.proveedores.tenant_id` → `public.tenants.id`
- `pedidos_proveedor_proveedor_id_fkey`: `public.pedidos_proveedor.proveedor_id` → `public.proveedores.id`
- `facturas_proveedor_proveedor_id_fkey`: `public.facturas_proveedor.proveedor_id` → `public.proveedores.id`

---

### receta_ingredientes

**Filas (snapshot MCP):** 1 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| receta_id | uuid | nullable, updatable; — |
| articulo_id | uuid | nullable, updatable; — |
| cantidad_neta | numeric | updatable; — |
| porcentaje_merma | numeric | nullable, updatable; default: `0` |
| unidad | varchar | updatable; — |
| orden | int4 | nullable, updatable; default: `0` |

**PK:** id

**FKs (restricciones):**
- `receta_ingredientes_receta_id_fkey`: `public.receta_ingredientes.receta_id` → `public.recetas.id`
- `receta_ingredientes_articulo_id_fkey`: `public.receta_ingredientes.articulo_id` → `public.articulos.id`

---

### recetas

**Filas (snapshot MCP):** 2 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| producto_id | uuid | nullable, updatable; — |
| rendimiento | numeric | nullable, updatable; default: `1` |
| instrucciones | text | nullable, updatable; — |
| tiempo_preparacion | int4 | nullable, updatable; — |
| foto_url | text | nullable, updatable; — |
| coste_calculado | numeric | nullable, updatable; — |
| margen_porcentaje | numeric | nullable, updatable; — |
| semaforo | varchar | nullable, updatable; — |
| updated_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `receta_ingredientes_receta_id_fkey`: `public.receta_ingredientes.receta_id` → `public.recetas.id`
- `recetas_producto_id_fkey`: `public.recetas.producto_id` → `public.productos.id`

---

### registros_appcc

**Filas (snapshot MCP):** 1 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| outlet_id | uuid | nullable, updatable; — |
| usuario_id | uuid | nullable, updatable; — |
| tipo_control | varchar | updatable; — |
| nombre_equipo | varchar | nullable, updatable; — |
| temperatura | numeric | nullable, updatable; — |
| conforme | bool | nullable, updatable; default: `true` |
| observaciones | text | nullable, updatable; — |
| accion_correctora | text | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `registros_appcc_outlet_id_fkey`: `public.registros_appcc.outlet_id` → `public.outlets.id`
- `registros_appcc_usuario_id_fkey`: `public.registros_appcc.usuario_id` → `public.usuarios.id`

---

### rentabilidad_mesas

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| mesa_id | uuid | nullable, updatable; — |
| outlet_id | uuid | nullable, updatable; — |
| ticket_id | uuid | nullable, updatable; — |
| fecha | date | updatable; — |
| num_comensales | int4 | nullable, updatable; — |
| tiempo_ocupacion_minutos | int4 | nullable, updatable; — |
| ingreso_total | numeric | nullable, updatable; — |
| ingreso_por_hora | numeric | nullable, updatable; — |
| ingreso_por_comensal | numeric | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `rentabilidad_mesas_outlet_id_fkey`: `public.rentabilidad_mesas.outlet_id` → `public.outlets.id`
- `rentabilidad_mesas_mesa_id_fkey`: `public.rentabilidad_mesas.mesa_id` → `public.mesas.id`
- `rentabilidad_mesas_ticket_id_fkey`: `public.rentabilidad_mesas.ticket_id` → `public.tickets.id`

---

### reservas

**Filas (snapshot MCP):** 1 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| outlet_id | uuid | nullable, updatable; — |
| mesa_id | uuid | nullable, updatable; — |
| nombre_cliente | varchar | updatable; — |
| telefono | varchar | nullable, updatable; — |
| fecha | date | updatable; — |
| hora | time | updatable; — |
| num_personas | int4 | updatable; — |
| estado | varchar | nullable, updatable; default: `'confirmada'::character varying` |
| notas | text | nullable, updatable; — |
| email | varchar | nullable, updatable; — |
| origen | varchar | nullable, updatable; default: `'telefono'::character varying` |
| recordatorio_enviado | bool | nullable, updatable; default: `false` |
| cliente_id | uuid | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `reservas_mesa_id_fkey`: `public.reservas.mesa_id` → `public.mesas.id`
- `reservas_outlet_id_fkey`: `public.reservas.outlet_id` → `public.outlets.id`
- `reservas_cliente_id_fkey`: `public.reservas.cliente_id` → `public.clientes.id`

---

### solicitudes_ausencia

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| empleado_id | uuid | nullable, updatable; — |
| tipo | varchar | updatable; — |
| fecha_inicio | date | updatable; — |
| fecha_fin | date | updatable; — |
| estado | varchar | nullable, updatable; default: `'pendiente'::character varying` |
| motivo | text | nullable, updatable; — |
| aprobada_por | uuid | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `solicitudes_ausencia_aprobada_por_fkey`: `public.solicitudes_ausencia.aprobada_por` → `public.usuarios.id`
- `solicitudes_ausencia_empleado_id_fkey`: `public.solicitudes_ausencia.empleado_id` → `public.empleados.id`

---

### tenant_audit_log

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | updatable; — |
| usuario_id | uuid | nullable, updatable; — |
| tabla | text | updatable; — |
| operacion | text | updatable; check: `operacion = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])` |
| registro_id | uuid | nullable, updatable; — |
| datos_antes | jsonb | nullable, updatable; — |
| datos_despues | jsonb | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `tenant_audit_log_usuario_id_fkey`: `public.tenant_audit_log.usuario_id` → `public.usuarios.id`
- `tenant_audit_log_tenant_id_fkey`: `public.tenant_audit_log.tenant_id` → `public.tenants.id`

---

### tenants

**Filas (snapshot MCP):** 2 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| nombre | varchar | updatable; — |
| nif | varchar | updatable; — |
| direccion | text | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |
| telefono | varchar | nullable, updatable; — |
| email | varchar | nullable, updatable; — |
| logo_url | text | nullable, updatable; — |
| plan | varchar | nullable, updatable; default: `'basico'::character varying` |
| activo | bool | nullable, updatable; default: `true` |

**PK:** id

**FKs (restricciones):**
- `ingenieria_menu_tenant_id_fkey`: `public.ingenieria_menu.tenant_id` → `public.tenants.id`
- `platform_logs_tenant_id_fkey`: `public.platform_logs.tenant_id` → `public.tenants.id`
- `usuario_permisos_tenant_id_fkey`: `public.usuario_permisos.tenant_id` → `public.tenants.id`
- `tenant_audit_log_tenant_id_fkey`: `public.tenant_audit_log.tenant_id` → `public.tenants.id`
- `pedidos_proveedor_tenant_id_fkey`: `public.pedidos_proveedor.tenant_id` → `public.tenants.id`
- `notificaciones_tenant_id_fkey`: `public.notificaciones.tenant_id` → `public.tenants.id`
- `configuracion_tenant_id_fkey`: `public.configuracion.tenant_id` → `public.tenants.id`
- `clientes_tenant_id_fkey`: `public.clientes.tenant_id` → `public.tenants.id`
- `empleados_tenant_id_fkey`: `public.empleados.tenant_id` → `public.tenants.id`
- `facturas_proveedor_tenant_id_fkey`: `public.facturas_proveedor.tenant_id` → `public.tenants.id`
- `proveedores_tenant_id_fkey`: `public.proveedores.tenant_id` → `public.tenants.id`
- `productos_tenant_id_fkey`: `public.productos.tenant_id` → `public.tenants.id`
- `categorias_menu_tenant_id_fkey`: `public.categorias_menu.tenant_id` → `public.tenants.id`
- `usuarios_tenant_id_fkey`: `public.usuarios.tenant_id` → `public.tenants.id`
- `outlets_tenant_id_fkey`: `public.outlets.tenant_id` → `public.tenants.id`
- `articulos_tenant_id_fkey`: `public.articulos.tenant_id` → `public.tenants.id`
- `verifactu_registros_tenant_id_fkey`: `public.verifactu_registros.tenant_id` → `public.tenants.id`

---

### ticket_lineas

**Filas (snapshot MCP):** 56 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| ticket_id | uuid | nullable, updatable; — |
| producto_id | uuid | nullable, updatable; — |
| cantidad | int4 | updatable; — |
| precio_unitario | numeric | updatable; — |
| subtotal | numeric | updatable; — |
| nota | text | nullable, updatable; — |
| descuento_porcentaje | numeric | nullable, updatable; default: `0` |
| enviado_cocina | bool | nullable, updatable; default: `false` |
| enviado_cocina_at | timestamptz | nullable, updatable; — |
| estado_cocina | varchar | nullable, updatable; default: `'pendiente'::character varying` |
| enviado_barra | bool | updatable; default: `false` |
| enviado_barra_at | timestamptz | nullable, updatable; — |
| estado_barra | varchar | updatable; default: `'pendiente'::character varying` |

**PK:** id

**FKs (restricciones):**
- `ticket_lineas_ticket_id_fkey`: `public.ticket_lineas.ticket_id` → `public.tickets.id`
- `ticket_lineas_producto_id_fkey`: `public.ticket_lineas.producto_id` → `public.productos.id`

---

### ticket_pagos

**Filas (snapshot MCP):** 19 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| ticket_id | uuid | nullable, updatable; — |
| importe | numeric | updatable; — |
| metodo_pago | varchar | updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `ticket_pagos_ticket_id_fkey`: `public.ticket_pagos.ticket_id` → `public.tickets.id`

---

### tickets

**Filas (snapshot MCP):** 13 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| outlet_id | uuid | nullable, updatable; — |
| mesa_id | uuid | nullable, updatable; — |
| camarero_id | uuid | nullable, updatable; — |
| estado | varchar | nullable, updatable; default: `'abierto'::character varying` |
| total | numeric | nullable, updatable; default: `0` |
| metodo_pago | varchar | nullable, updatable; — |
| created_at | timestamptz | nullable, updatable; default: `now()` |
| cobrado_at | timestamptz | nullable, updatable; — |
| total_iva | numeric | nullable, updatable; default: `0` |
| descuento_porcentaje | numeric | nullable, updatable; default: `0` |
| descuento_importe | numeric | nullable, updatable; default: `0` |
| num_comensales | int4 | nullable, updatable; default: `1` |
| notas | text | nullable, updatable; — |
| es_delivery | bool | nullable, updatable; default: `false` |
| plataforma_delivery | varchar | nullable, updatable; — |
| tiempo_ocupacion | int4 | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `movimientos_stock_ticket_id_fkey`: `public.movimientos_stock.ticket_id` → `public.tickets.id`
- `ticket_lineas_ticket_id_fkey`: `public.ticket_lineas.ticket_id` → `public.tickets.id`
- `verifactu_registros_ticket_id_fkey`: `public.verifactu_registros.ticket_id` → `public.tickets.id`
- `tickets_outlet_id_fkey`: `public.tickets.outlet_id` → `public.outlets.id`
- `tickets_mesa_id_fkey`: `public.tickets.mesa_id` → `public.mesas.id`
- `tickets_camarero_id_fkey`: `public.tickets.camarero_id` → `public.usuarios.id`
- `rentabilidad_mesas_ticket_id_fkey`: `public.rentabilidad_mesas.ticket_id` → `public.tickets.id`
- `ticket_pagos_ticket_id_fkey`: `public.ticket_pagos.ticket_id` → `public.tickets.id`

---

### turnos

**Filas (snapshot MCP):** 2 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| empleado_id | uuid | nullable, updatable; — |
| outlet_id | uuid | nullable, updatable; — |
| fecha | date | updatable; — |
| hora_entrada | time | nullable, updatable; — |
| hora_salida | time | nullable, updatable; — |
| horas_trabajadas | numeric | nullable, updatable; — |
| hora_inicio_planificada | time | nullable, updatable; — |
| hora_fin_planificada | time | nullable, updatable; — |
| horas_extra | numeric | nullable, updatable; default: `0` |
| tipo | varchar | nullable, updatable; default: `'normal'::character varying` |
| incidencia | varchar | nullable, updatable; — |
| firmado_empleado | bool | nullable, updatable; default: `false` |

**PK:** id

**FKs (restricciones):**
- `turnos_empleado_id_fkey`: `public.turnos.empleado_id` → `public.empleados.id`
- `turnos_outlet_id_fkey`: `public.turnos.outlet_id` → `public.outlets.id`

---

### usuario_permisos

**Filas (snapshot MCP):** 0 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| usuario_id | uuid | updatable; — |
| tenant_id | uuid | updatable; — |
| clave | varchar | updatable; — |
| permitido | bool | updatable; default: `true` |
| created_at | timestamptz | nullable, updatable; default: `now()` |

**PK:** id

**FKs (restricciones):**
- `usuario_permisos_usuario_id_fkey`: `public.usuario_permisos.usuario_id` → `public.usuarios.id`
- `usuario_permisos_tenant_id_fkey`: `public.usuario_permisos.tenant_id` → `public.tenants.id`

---

### usuarios

**Filas (snapshot MCP):** 8 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| outlet_id | uuid | nullable, updatable; — |
| nombre | varchar | updatable; — |
| email | varchar | updatable, unique; — |
| password_hash | text | updatable; — |
| rol | varchar | updatable; check: `rol::text = ANY (ARRAY['superadmin'::character varying, 'admin'::character varying, 'director'::character varying, 'jefe…` |
| activo | bool | nullable, updatable; default: `true` |
| created_at | timestamptz | nullable, updatable; default: `now()` |
| pin | varchar | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `cuadrantes_created_by_fkey`: `public.cuadrantes.created_by` → `public.usuarios.id`
- `platform_logs_usuario_id_fkey`: `public.platform_logs.usuario_id` → `public.usuarios.id`
- `usuario_permisos_usuario_id_fkey`: `public.usuario_permisos.usuario_id` → `public.usuarios.id`
- `tenant_audit_log_usuario_id_fkey`: `public.tenant_audit_log.usuario_id` → `public.usuarios.id`
- `registros_appcc_usuario_id_fkey`: `public.registros_appcc.usuario_id` → `public.usuarios.id`
- `ausencias_aprobado_por_fkey`: `public.ausencias.aprobado_por` → `public.usuarios.id`
- `notificaciones_usuario_id_fkey`: `public.notificaciones.usuario_id` → `public.usuarios.id`
- `solicitudes_ausencia_aprobada_por_fkey`: `public.solicitudes_ausencia.aprobada_por` → `public.usuarios.id`
- `mermas_usuario_id_fkey`: `public.mermas.usuario_id` → `public.usuarios.id`
- `movimientos_stock_usuario_id_fkey`: `public.movimientos_stock.usuario_id` → `public.usuarios.id`
- `cierres_caja_usuario_id_fkey`: `public.cierres_caja.usuario_id` → `public.usuarios.id`
- `empleados_usuario_id_fkey`: `public.empleados.usuario_id` → `public.usuarios.id`
- `tickets_camarero_id_fkey`: `public.tickets.camarero_id` → `public.usuarios.id`
- `usuarios_outlet_id_fkey`: `public.usuarios.outlet_id` → `public.outlets.id`
- `usuarios_tenant_id_fkey`: `public.usuarios.tenant_id` → `public.tenants.id`

---

### verifactu_registros

**Filas (snapshot MCP):** 8 · **RLS:** no

| Columna | Tipo (formato) | Opciones / default |
|---------|------------------|---------------------|
| id | uuid | updatable; default: `gen_random_uuid()` |
| tenant_id | uuid | nullable, updatable; — |
| ticket_id | uuid | nullable, updatable; — |
| numero_serie | varchar | updatable; — |
| fecha_expedicion | date | updatable; — |
| tipo_factura | varchar | nullable, updatable; default: `'F1'::character varying` |
| base_imponible | numeric | updatable; — |
| cuota_iva | numeric | updatable; — |
| importe_total | numeric | updatable; — |
| huella_anterior | text | nullable, updatable; — |
| huella_actual | text | updatable; — |
| xml_generado | text | nullable, updatable; — |
| enviado_aeat | bool | nullable, updatable; default: `false` |
| created_at | timestamptz | nullable, updatable; default: `now()` |
| fecha_hora_generacion | timestamptz | nullable, updatable; — |

**PK:** id

**FKs (restricciones):**
- `verifactu_registros_tenant_id_fkey`: `public.verifactu_registros.tenant_id` → `public.tenants.id`
- `verifactu_registros_ticket_id_fkey`: `public.verifactu_registros.ticket_id` → `public.tickets.id`

---


*Generado con `backend/scripts/schema_mcp_json_to_markdown.py`. Volver a ejecutar tras migraciones o nuevo volcado MCP.*
