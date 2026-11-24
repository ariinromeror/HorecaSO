-- HorecaSO: esquema completo para Neon (extraído de Supabase el 2026-11-24).
-- Solo estructura, sin datos. Idempotente en tablas (IF NOT EXISTS); las
-- restricciones se añaden dentro de un bloque que ignora las ya existentes.
CREATE SEQUENCE IF NOT EXISTS public.alergenos_id_seq;

CREATE TABLE IF NOT EXISTS public.acuerdo_proveedor_defaults (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  razon_social varchar(200) NOT NULL DEFAULT '',
  nif varchar(20), email varchar(200) NOT NULL DEFAULT '',
  direccion text, soporte_canal varchar(200), soporte_horario varchar(200),
  updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.acuerdos_piloto (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fecha_acuerdo date, periodo_desde date, periodo_hasta date,
  precio_tipo varchar(40) NOT NULL DEFAULT 'gratuito',
  precio_importe numeric(12,2), precio_otro_texto varchar(200),
  modulos jsonb NOT NULL DEFAULT '[]'::jsonb, modulos_otros varchar(200),
  cliente_nombre_comercial varchar(200) NOT NULL DEFAULT '',
  cliente_razon_social varchar(200), cliente_nif varchar(20), cliente_direccion text,
  cliente_contacto varchar(200), cliente_email varchar(200),
  proveedor_razon_social varchar(200) NOT NULL DEFAULT '',
  proveedor_nif varchar(20), proveedor_email varchar(200) NOT NULL DEFAULT '',
  proveedor_direccion text, soporte_canal varchar(200), soporte_horario varchar(200),
  tenant_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.alergenos (
  id integer NOT NULL DEFAULT nextval('public.alergenos_id_seq'),
  nombre varchar(50) NOT NULL, icono varchar(10));
ALTER SEQUENCE public.alergenos_id_seq OWNED BY public.alergenos.id;
CREATE TABLE IF NOT EXISTS public.articulos (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid,
  nombre varchar(255) NOT NULL, sku varchar(100), unidad_medida varchar(20) NOT NULL,
  stock_actual numeric(15,4) DEFAULT 0, stock_minimo numeric(15,4) DEFAULT 0,
  coste_unitario numeric(10,4) DEFAULT 0, created_at timestamptz DEFAULT now(),
  categoria_almacen varchar(100), temperatura_almacen varchar(20),
  stock_maximo numeric(15,4), calibracion_comprado numeric(15,4),
  calibracion_util numeric(15,4), es_elaborado boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS public.ausencias (
  id uuid NOT NULL DEFAULT gen_random_uuid(), empleado_id uuid, outlet_id uuid,
  tipo varchar(50) NOT NULL, fecha_inicio date NOT NULL, fecha_fin date NOT NULL,
  dias integer, estado varchar(20) DEFAULT 'pendiente', motivo text,
  aprobado_por uuid, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.categorias_menu (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid,
  nombre varchar(100) NOT NULL, orden integer DEFAULT 0, icono varchar(50),
  color varchar(7) DEFAULT '#6366f1', activo boolean DEFAULT true);
CREATE TABLE IF NOT EXISTS public.cierres_caja (
  id uuid NOT NULL DEFAULT gen_random_uuid(), outlet_id uuid, usuario_id uuid,
  fecha date NOT NULL, total_efectivo numeric(10,2) DEFAULT 0,
  total_tarjeta numeric(10,2) DEFAULT 0, total_bizum numeric(10,2) DEFAULT 0,
  total_transferencia numeric(10,2) DEFAULT 0, total_invitaciones numeric(10,2) DEFAULT 0,
  total_ventas numeric(10,2) DEFAULT 0, num_tickets integer DEFAULT 0,
  ticket_medio numeric(10,2) DEFAULT 0, notas text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid,
  nombre varchar(255) NOT NULL, email varchar(255), telefono varchar(20),
  fecha_nacimiento date, alergenos text[], preferencias text,
  total_visitas integer DEFAULT 0, gasto_total numeric(10,2) DEFAULT 0,
  gasto_medio numeric(10,2) DEFAULT 0, ultima_visita date,
  puntos_fidelidad integer DEFAULT 0, notas text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.configuracion (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid,
  clave varchar(100) NOT NULL, valor text NOT NULL, descripcion text);
CREATE TABLE IF NOT EXISTS public.cuadrante_asignaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(), cuadrante_id uuid, empleado_id uuid,
  fecha date NOT NULL, hora_inicio time, hora_fin time, puesto varchar(50));
CREATE TABLE IF NOT EXISTS public.cuadrantes (
  id uuid NOT NULL DEFAULT gen_random_uuid(), outlet_id uuid,
  semana_inicio date NOT NULL, semana_fin date NOT NULL,
  publicado boolean DEFAULT false, created_by uuid, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.empleados (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid, usuario_id uuid,
  dni varchar(20), cargo varchar(100), fecha_inicio date, activo boolean DEFAULT true,
  nss varchar(20), contrato varchar(50), jornada_horas numeric(5,2) DEFAULT 40,
  irpf_porcentaje numeric(5,2), iban varchar(34), salario_bruto_mensual numeric(10,2),
  nombre_completo varchar(255));
CREATE TABLE IF NOT EXISTS public.facturas_proveedor (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid, proveedor_id uuid,
  numero_factura varchar(100), fecha date NOT NULL, total numeric(10,2) NOT NULL,
  procesada_ia boolean DEFAULT false, imagen_url text, created_at timestamptz DEFAULT now(),
  fecha_vencimiento date, pagada boolean DEFAULT false, pagada_at timestamptz);
CREATE TABLE IF NOT EXISTS public.facturas_proveedor_lineas (
  id uuid NOT NULL DEFAULT gen_random_uuid(), factura_id uuid, articulo_id uuid,
  cantidad numeric(15,4) NOT NULL, coste_unitario numeric(10,4) NOT NULL,
  subtotal numeric(10,2) NOT NULL);
CREATE TABLE IF NOT EXISTS public.gastos_operativos (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
  concepto varchar(200) NOT NULL, categoria varchar(40) NOT NULL DEFAULT 'otros',
  importe_mensual numeric(12,2) NOT NULL DEFAULT 0, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.ingenieria_menu (
  id uuid NOT NULL DEFAULT gen_random_uuid(), producto_id uuid, tenant_id uuid,
  periodo_inicio date NOT NULL, periodo_fin date NOT NULL,
  unidades_vendidas integer DEFAULT 0, ingreso_total numeric(10,2) DEFAULT 0,
  coste_total numeric(10,2) DEFAULT 0, margen_total numeric(10,2) DEFAULT 0,
  margen_porcentaje numeric(5,2) DEFAULT 0, clasificacion varchar(20),
  created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.lista_espera (
  id uuid NOT NULL DEFAULT gen_random_uuid(), outlet_id uuid,
  nombre_cliente varchar(255) NOT NULL, telefono varchar(20), num_personas integer NOT NULL,
  hora_llegada timestamptz DEFAULT now(), estado varchar(20) DEFAULT 'esperando',
  tiempo_estimado integer);
CREATE TABLE IF NOT EXISTS public.lotes_inventario (
  id uuid NOT NULL DEFAULT gen_random_uuid(), articulo_id uuid, outlet_id uuid,
  cantidad numeric(15,4) NOT NULL, coste_unitario numeric(10,4) NOT NULL,
  fecha_caducidad date, created_at timestamptz DEFAULT now(), numero_lote varchar(50));
CREATE TABLE IF NOT EXISTS public.mermas (
  id uuid NOT NULL DEFAULT gen_random_uuid(), outlet_id uuid, articulo_id uuid,
  cantidad numeric(15,4) NOT NULL, motivo varchar(50) NOT NULL,
  coste_imputado numeric(10,4), usuario_id uuid, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.mesas (
  id uuid NOT NULL DEFAULT gen_random_uuid(), outlet_id uuid, numero integer NOT NULL,
  capacidad integer DEFAULT 4, estado varchar(20) DEFAULT 'libre',
  posicion_x numeric, posicion_y numeric, zona varchar(100));
CREATE TABLE IF NOT EXISTS public.movimientos_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid(), articulo_id uuid, outlet_id uuid,
  tipo varchar(20) NOT NULL, cantidad numeric(15,4) NOT NULL, coste_unitario numeric(10,4),
  motivo text, usuario_id uuid, ticket_id uuid, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.nominas (
  id uuid NOT NULL DEFAULT gen_random_uuid(), empleado_id uuid,
  mes integer NOT NULL, anio integer NOT NULL, salario_bruto numeric(10,2) NOT NULL,
  horas_extra_importe numeric(10,2) DEFAULT 0, plus_festivos numeric(10,2) DEFAULT 0,
  otros_devengos numeric(10,2) DEFAULT 0, total_devengos numeric(10,2) NOT NULL,
  ss_empleado numeric(10,2) NOT NULL, irpf numeric(10,2) NOT NULL,
  otras_deducciones numeric(10,2) DEFAULT 0, total_deducciones numeric(10,2) NOT NULL,
  liquido numeric(10,2) NOT NULL, ss_empresa numeric(10,2) NOT NULL,
  coste_total_empresa numeric(10,2) NOT NULL, pagada boolean DEFAULT false,
  pdf_url text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid, usuario_id uuid,
  tipo varchar(50) NOT NULL, titulo varchar(255) NOT NULL, mensaje text,
  leida boolean DEFAULT false, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.outlets (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid,
  nombre varchar(255) NOT NULL, num_mesas integer DEFAULT 0, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.pedidos_proveedor (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid, proveedor_id uuid, outlet_id uuid,
  estado varchar(20) DEFAULT 'pendiente', fecha_pedido date NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega_estimada date, total_estimado numeric(10,2), notas text,
  created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.pedidos_proveedor_lineas (
  id uuid NOT NULL DEFAULT gen_random_uuid(), pedido_id uuid, articulo_id uuid,
  cantidad numeric(15,4) NOT NULL, precio_unitario_estimado numeric(10,4));
CREATE TABLE IF NOT EXISTS public.platform_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(), nivel text NOT NULL, tenant_id uuid,
  usuario_id uuid, modulo text NOT NULL, accion text NOT NULL, detalle jsonb,
  ip text, user_agent text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.producto_alergenos (
  producto_id uuid NOT NULL, alergeno_id integer NOT NULL);
CREATE TABLE IF NOT EXISTS public.productos (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid, categoria_id uuid,
  nombre varchar(255) NOT NULL, precio numeric(10,2) NOT NULL,
  tiene_receta boolean DEFAULT false, activo boolean DEFAULT true, imagen_url text,
  descripcion text, iva_porcentaje numeric(5,2) DEFAULT 10.00,
  es_bebida boolean DEFAULT false, es_menu boolean DEFAULT false,
  disponible_delivery boolean DEFAULT true, tiempo_preparacion integer DEFAULT 0,
  precio_coste numeric(10,2), destino_kds varchar(10) DEFAULT 'cocina');
CREATE TABLE IF NOT EXISTS public.proveedores (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid,
  nombre varchar(255) NOT NULL, nif varchar(20), email varchar(255), telefono varchar(20),
  direccion text, condiciones_pago text, dias_entrega integer DEFAULT 1,
  activo boolean DEFAULT true);
CREATE TABLE IF NOT EXISTS public.receta_ingredientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(), receta_id uuid, articulo_id uuid,
  cantidad_neta numeric(15,4) NOT NULL, porcentaje_merma numeric(5,2) DEFAULT 0,
  unidad varchar(20) NOT NULL, orden integer DEFAULT 0);
CREATE TABLE IF NOT EXISTS public.recetas (
  id uuid NOT NULL DEFAULT gen_random_uuid(), producto_id uuid,
  rendimiento numeric(10,4) DEFAULT 1, instrucciones text, tiempo_preparacion integer,
  foto_url text, coste_calculado numeric(10,4), margen_porcentaje numeric(5,2),
  semaforo varchar(10), updated_at timestamptz DEFAULT now(), articulo_salida_id uuid);
CREATE TABLE IF NOT EXISTS public.registros_appcc (
  id uuid NOT NULL DEFAULT gen_random_uuid(), outlet_id uuid, usuario_id uuid,
  tipo_control varchar(50) NOT NULL, nombre_equipo varchar(100), temperatura numeric(5,2),
  conforme boolean DEFAULT true, observaciones text, accion_correctora text,
  created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.rentabilidad_mesas (
  id uuid NOT NULL DEFAULT gen_random_uuid(), mesa_id uuid, outlet_id uuid, ticket_id uuid,
  fecha date NOT NULL, num_comensales integer, tiempo_ocupacion_minutos integer,
  ingreso_total numeric(10,2), ingreso_por_hora numeric(10,2), ingreso_por_comensal numeric(10,2));
CREATE TABLE IF NOT EXISTS public.reservas (
  id uuid NOT NULL DEFAULT gen_random_uuid(), outlet_id uuid, mesa_id uuid,
  nombre_cliente varchar(255) NOT NULL, telefono varchar(20), fecha date NOT NULL,
  hora time NOT NULL, num_personas integer NOT NULL, estado varchar(20) DEFAULT 'confirmada',
  notas text, email varchar(255), origen varchar(20) DEFAULT 'telefono',
  recordatorio_enviado boolean DEFAULT false, cliente_id uuid, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.solicitudes_ausencia (
  id uuid NOT NULL DEFAULT gen_random_uuid(), empleado_id uuid, tipo varchar(30) NOT NULL,
  fecha_inicio date NOT NULL, fecha_fin date NOT NULL, estado varchar(20) DEFAULT 'pendiente',
  motivo text, aprobada_por uuid, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.tenant_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, usuario_id uuid,
  tabla text NOT NULL, operacion text NOT NULL, registro_id uuid, datos_antes jsonb,
  datos_despues jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(), nombre varchar(255) NOT NULL,
  nif varchar(20) NOT NULL, direccion text, created_at timestamptz DEFAULT now(),
  telefono varchar(20), email varchar(255), logo_url text, plan varchar(20) DEFAULT 'basico',
  activo boolean DEFAULT true, razon_social text, codigo_postal text, ciudad text,
  provincia text, serie_facturacion text DEFAULT 'A', modulos jsonb DEFAULT '{}'::jsonb,
  email_slug text);  -- migration_tenants_email_slug.sql lo rellena y pone NOT NULL
CREATE TABLE IF NOT EXISTS public.ticket_lineas (
  id uuid NOT NULL DEFAULT gen_random_uuid(), ticket_id uuid, producto_id uuid,
  cantidad integer NOT NULL, precio_unitario numeric(10,2) NOT NULL,
  subtotal numeric(10,2) NOT NULL, nota text, descuento_porcentaje numeric(5,2) DEFAULT 0,
  enviado_cocina boolean DEFAULT false, enviado_cocina_at timestamptz,
  estado_cocina varchar(20) DEFAULT 'pendiente', enviado_barra boolean NOT NULL DEFAULT false,
  enviado_barra_at timestamptz, estado_barra varchar(20) NOT NULL DEFAULT 'pendiente');
CREATE TABLE IF NOT EXISTS public.ticket_pagos (
  id uuid NOT NULL DEFAULT gen_random_uuid(), ticket_id uuid,
  importe numeric(10,2) NOT NULL, metodo_pago varchar(20) NOT NULL,
  created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(), outlet_id uuid, mesa_id uuid, camarero_id uuid,
  estado varchar(20) DEFAULT 'abierto', total numeric(10,2) DEFAULT 0, metodo_pago varchar(20),
  created_at timestamptz DEFAULT now(), cobrado_at timestamptz, total_iva numeric(10,2) DEFAULT 0,
  descuento_porcentaje numeric(5,2) DEFAULT 0, descuento_importe numeric(10,2) DEFAULT 0,
  num_comensales integer DEFAULT 1, notas text, es_delivery boolean DEFAULT false,
  plataforma_delivery varchar(50), tiempo_ocupacion integer);
CREATE TABLE IF NOT EXISTS public.turnos (
  id uuid NOT NULL DEFAULT gen_random_uuid(), empleado_id uuid, outlet_id uuid,
  fecha date NOT NULL, hora_entrada time, hora_salida time, horas_trabajadas numeric(5,2),
  hora_inicio_planificada time, hora_fin_planificada time, horas_extra numeric(5,2) DEFAULT 0,
  tipo varchar(20) DEFAULT 'normal', incidencia varchar(50), firmado_empleado boolean DEFAULT false);
CREATE TABLE IF NOT EXISTS public.usuario_permisos (
  id uuid NOT NULL DEFAULT gen_random_uuid(), usuario_id uuid NOT NULL, tenant_id uuid NOT NULL,
  clave varchar(80) NOT NULL, permitido boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid, outlet_id uuid,
  nombre varchar(255) NOT NULL, email varchar(255) NOT NULL, password_hash text NOT NULL,
  rol varchar(50) NOT NULL, activo boolean DEFAULT true, created_at timestamptz DEFAULT now(),
  pin varchar(6));
CREATE TABLE IF NOT EXISTS public.verifactu_registros (
  id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id uuid, ticket_id uuid,
  numero_serie varchar(50) NOT NULL, fecha_expedicion date NOT NULL,
  tipo_factura varchar(5) DEFAULT 'F1', base_imponible numeric(10,2) NOT NULL,
  cuota_iva numeric(10,2) NOT NULL, importe_total numeric(10,2) NOT NULL,
  huella_anterior text, huella_actual text NOT NULL, xml_generado text,
  enviado_aeat boolean DEFAULT false, created_at timestamptz DEFAULT now(),
  fecha_hora_generacion timestamptz);

-- Restricciones (PK, UNIQUE, CHECK, FK). Cada una ignora el error si ya existe.
DO $$
DECLARE s text;
DECLARE stmts text[] := ARRAY[
 'ALTER TABLE public.acuerdo_proveedor_defaults ADD PRIMARY KEY (id)',
 'ALTER TABLE public.acuerdos_piloto ADD PRIMARY KEY (id)',
 'ALTER TABLE public.acuerdos_piloto ADD CONSTRAINT acuerdos_piloto_precio_tipo_check CHECK (precio_tipo::text = ANY (ARRAY[''gratuito'',''simbolico'',''otro'',''aportacion_voluntaria'']))',
 'ALTER TABLE public.acuerdos_piloto ADD CONSTRAINT acuerdos_piloto_precio_importe_check CHECK (precio_importe IS NULL OR precio_importe >= 0)',
 'ALTER TABLE public.alergenos ADD PRIMARY KEY (id)',
 'ALTER TABLE public.articulos ADD PRIMARY KEY (id)',
 'ALTER TABLE public.ausencias ADD PRIMARY KEY (id)',
 'ALTER TABLE public.categorias_menu ADD PRIMARY KEY (id)',
 'ALTER TABLE public.cierres_caja ADD PRIMARY KEY (id)',
 'ALTER TABLE public.clientes ADD PRIMARY KEY (id)',
 'ALTER TABLE public.configuracion ADD PRIMARY KEY (id)',
 'ALTER TABLE public.configuracion ADD CONSTRAINT configuracion_tenant_id_clave_key UNIQUE (tenant_id, clave)',
 'ALTER TABLE public.cuadrante_asignaciones ADD PRIMARY KEY (id)',
 'ALTER TABLE public.cuadrantes ADD PRIMARY KEY (id)',
 'ALTER TABLE public.empleados ADD PRIMARY KEY (id)',
 'ALTER TABLE public.facturas_proveedor ADD PRIMARY KEY (id)',
 'ALTER TABLE public.facturas_proveedor_lineas ADD PRIMARY KEY (id)',
 'ALTER TABLE public.gastos_operativos ADD PRIMARY KEY (id)',
 'ALTER TABLE public.gastos_operativos ADD CONSTRAINT gastos_operativos_importe_mensual_check CHECK (importe_mensual >= 0)',
 'ALTER TABLE public.ingenieria_menu ADD PRIMARY KEY (id)',
 'ALTER TABLE public.lista_espera ADD PRIMARY KEY (id)',
 'ALTER TABLE public.lotes_inventario ADD PRIMARY KEY (id)',
 'ALTER TABLE public.mermas ADD PRIMARY KEY (id)',
 'ALTER TABLE public.mesas ADD PRIMARY KEY (id)',
 'ALTER TABLE public.movimientos_stock ADD PRIMARY KEY (id)',
 'ALTER TABLE public.nominas ADD PRIMARY KEY (id)',
 'ALTER TABLE public.notificaciones ADD PRIMARY KEY (id)',
 'ALTER TABLE public.outlets ADD PRIMARY KEY (id)',
 'ALTER TABLE public.pedidos_proveedor ADD PRIMARY KEY (id)',
 'ALTER TABLE public.pedidos_proveedor_lineas ADD PRIMARY KEY (id)',
 'ALTER TABLE public.platform_logs ADD PRIMARY KEY (id)',
 'ALTER TABLE public.platform_logs ADD CONSTRAINT platform_logs_nivel_check CHECK (nivel = ANY (ARRAY[''info'',''warning'',''error'',''critical'']))',
 'ALTER TABLE public.producto_alergenos ADD PRIMARY KEY (producto_id, alergeno_id)',
 'ALTER TABLE public.productos ADD PRIMARY KEY (id)',
 'ALTER TABLE public.productos ADD CONSTRAINT productos_destino_kds_check CHECK (destino_kds::text = ANY (ARRAY[''cocina'',''barra'',''ninguno'']))',
 'ALTER TABLE public.proveedores ADD PRIMARY KEY (id)',
 'ALTER TABLE public.receta_ingredientes ADD PRIMARY KEY (id)',
 'ALTER TABLE public.recetas ADD PRIMARY KEY (id)',
 'ALTER TABLE public.recetas ADD CONSTRAINT recetas_plato_o_elaboracion CHECK ((producto_id IS NOT NULL AND articulo_salida_id IS NULL) OR (producto_id IS NULL AND articulo_salida_id IS NOT NULL))',
 'ALTER TABLE public.registros_appcc ADD PRIMARY KEY (id)',
 'ALTER TABLE public.rentabilidad_mesas ADD PRIMARY KEY (id)',
 'ALTER TABLE public.reservas ADD PRIMARY KEY (id)',
 'ALTER TABLE public.solicitudes_ausencia ADD PRIMARY KEY (id)',
 'ALTER TABLE public.tenant_audit_log ADD PRIMARY KEY (id)',
 'ALTER TABLE public.tenant_audit_log ADD CONSTRAINT tenant_audit_log_operacion_check CHECK (operacion = ANY (ARRAY[''INSERT'',''UPDATE'',''DELETE'']))',
 'ALTER TABLE public.tenants ADD PRIMARY KEY (id)',
 'ALTER TABLE public.ticket_lineas ADD PRIMARY KEY (id)',
 'ALTER TABLE public.ticket_pagos ADD PRIMARY KEY (id)',
 'ALTER TABLE public.tickets ADD PRIMARY KEY (id)',
 'ALTER TABLE public.turnos ADD PRIMARY KEY (id)',
 'ALTER TABLE public.usuario_permisos ADD PRIMARY KEY (id)',
 'ALTER TABLE public.usuario_permisos ADD CONSTRAINT usuario_permisos_usuario_id_clave_key UNIQUE (usuario_id, clave)',
 'ALTER TABLE public.usuarios ADD PRIMARY KEY (id)',
 'ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_email_key UNIQUE (email)',
 'ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol::text = ANY (ARRAY[''superadmin'',''admin'',''director'',''jefe_sala'',''camarero'',''cocina'',''barra'',''almacen'']))',
 'ALTER TABLE public.verifactu_registros ADD PRIMARY KEY (id)',
 -- Claves foráneas
 'ALTER TABLE public.acuerdos_piloto ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL',
 'ALTER TABLE public.articulos ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.ausencias ADD FOREIGN KEY (aprobado_por) REFERENCES usuarios(id)',
 'ALTER TABLE public.ausencias ADD FOREIGN KEY (empleado_id) REFERENCES empleados(id)',
 'ALTER TABLE public.ausencias ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.categorias_menu ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.cierres_caja ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id)',
 'ALTER TABLE public.cierres_caja ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.clientes ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.configuracion ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.cuadrante_asignaciones ADD FOREIGN KEY (cuadrante_id) REFERENCES cuadrantes(id)',
 'ALTER TABLE public.cuadrante_asignaciones ADD FOREIGN KEY (empleado_id) REFERENCES empleados(id)',
 'ALTER TABLE public.cuadrantes ADD FOREIGN KEY (created_by) REFERENCES usuarios(id)',
 'ALTER TABLE public.cuadrantes ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.empleados ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.empleados ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id)',
 'ALTER TABLE public.facturas_proveedor ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.facturas_proveedor ADD FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)',
 'ALTER TABLE public.facturas_proveedor_lineas ADD FOREIGN KEY (articulo_id) REFERENCES articulos(id)',
 'ALTER TABLE public.facturas_proveedor_lineas ADD FOREIGN KEY (factura_id) REFERENCES facturas_proveedor(id)',
 'ALTER TABLE public.gastos_operativos ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE',
 'ALTER TABLE public.ingenieria_menu ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.ingenieria_menu ADD FOREIGN KEY (producto_id) REFERENCES productos(id)',
 'ALTER TABLE public.lista_espera ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.lotes_inventario ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.lotes_inventario ADD FOREIGN KEY (articulo_id) REFERENCES articulos(id)',
 'ALTER TABLE public.mermas ADD FOREIGN KEY (articulo_id) REFERENCES articulos(id)',
 'ALTER TABLE public.mermas ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.mermas ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id)',
 'ALTER TABLE public.mesas ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.movimientos_stock ADD FOREIGN KEY (articulo_id) REFERENCES articulos(id)',
 'ALTER TABLE public.movimientos_stock ADD FOREIGN KEY (ticket_id) REFERENCES tickets(id)',
 'ALTER TABLE public.movimientos_stock ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id)',
 'ALTER TABLE public.movimientos_stock ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.nominas ADD FOREIGN KEY (empleado_id) REFERENCES empleados(id)',
 'ALTER TABLE public.notificaciones ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.notificaciones ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id)',
 'ALTER TABLE public.outlets ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.pedidos_proveedor ADD FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)',
 'ALTER TABLE public.pedidos_proveedor ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.pedidos_proveedor ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.pedidos_proveedor_lineas ADD FOREIGN KEY (pedido_id) REFERENCES pedidos_proveedor(id)',
 'ALTER TABLE public.pedidos_proveedor_lineas ADD FOREIGN KEY (articulo_id) REFERENCES articulos(id)',
 'ALTER TABLE public.platform_logs ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL',
 'ALTER TABLE public.platform_logs ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL',
 'ALTER TABLE public.producto_alergenos ADD FOREIGN KEY (alergeno_id) REFERENCES alergenos(id)',
 'ALTER TABLE public.producto_alergenos ADD FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE',
 'ALTER TABLE public.productos ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.productos ADD FOREIGN KEY (categoria_id) REFERENCES categorias_menu(id)',
 'ALTER TABLE public.proveedores ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.receta_ingredientes ADD FOREIGN KEY (receta_id) REFERENCES recetas(id)',
 'ALTER TABLE public.receta_ingredientes ADD FOREIGN KEY (articulo_id) REFERENCES articulos(id)',
 'ALTER TABLE public.recetas ADD FOREIGN KEY (producto_id) REFERENCES productos(id)',
 'ALTER TABLE public.recetas ADD FOREIGN KEY (articulo_salida_id) REFERENCES articulos(id) ON DELETE RESTRICT',
 'ALTER TABLE public.registros_appcc ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id)',
 'ALTER TABLE public.registros_appcc ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.rentabilidad_mesas ADD FOREIGN KEY (ticket_id) REFERENCES tickets(id)',
 'ALTER TABLE public.rentabilidad_mesas ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.rentabilidad_mesas ADD FOREIGN KEY (mesa_id) REFERENCES mesas(id)',
 'ALTER TABLE public.reservas ADD FOREIGN KEY (cliente_id) REFERENCES clientes(id)',
 'ALTER TABLE public.reservas ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.reservas ADD FOREIGN KEY (mesa_id) REFERENCES mesas(id)',
 'ALTER TABLE public.solicitudes_ausencia ADD FOREIGN KEY (aprobada_por) REFERENCES usuarios(id)',
 'ALTER TABLE public.solicitudes_ausencia ADD FOREIGN KEY (empleado_id) REFERENCES empleados(id)',
 'ALTER TABLE public.tenant_audit_log ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL',
 'ALTER TABLE public.tenant_audit_log ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE',
 'ALTER TABLE public.ticket_lineas ADD FOREIGN KEY (producto_id) REFERENCES productos(id)',
 'ALTER TABLE public.ticket_lineas ADD FOREIGN KEY (ticket_id) REFERENCES tickets(id)',
 'ALTER TABLE public.ticket_pagos ADD FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE',
 'ALTER TABLE public.tickets ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.tickets ADD FOREIGN KEY (mesa_id) REFERENCES mesas(id)',
 'ALTER TABLE public.tickets ADD FOREIGN KEY (camarero_id) REFERENCES usuarios(id)',
 'ALTER TABLE public.turnos ADD FOREIGN KEY (empleado_id) REFERENCES empleados(id)',
 'ALTER TABLE public.turnos ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.usuario_permisos ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE',
 'ALTER TABLE public.usuario_permisos ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE',
 'ALTER TABLE public.usuarios ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.usuarios ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)',
 'ALTER TABLE public.verifactu_registros ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
 'ALTER TABLE public.verifactu_registros ADD FOREIGN KEY (ticket_id) REFERENCES tickets(id)'
];
BEGIN
  FOREACH s IN ARRAY stmts LOOP
    BEGIN EXECUTE s;
    EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
    END;
  END LOOP;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_acuerdos_piloto_created ON public.acuerdos_piloto (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_operativos_tenant ON public.gastos_operativos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_logs_nivel_created_at ON public.platform_logs (nivel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_logs_tenant_created_at ON public.platform_logs (tenant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_recetas_articulo_salida_id ON public.recetas (articulo_salida_id) WHERE articulo_salida_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_tenant_created_at ON public.tenant_audit_log (tenant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_email_slug_uidx ON public.tenants (email_slug);
CREATE INDEX IF NOT EXISTS idx_ticket_pagos_ticket_id ON public.ticket_pagos (ticket_id);
CREATE INDEX IF NOT EXISTS idx_usuario_permisos_tenant ON public.usuario_permisos (tenant_id);
