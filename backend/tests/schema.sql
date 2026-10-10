-- Esquema public de HorecaSO para la BD de TESTS.
-- Generado desde el cat?logo de Supabase (solo estructura, sin datos) el 07/10/2026.
-- Regenerar si cambia el esquema de producci?n: ver docs/TESTING.md.


-- Secuencias
CREATE SEQUENCE IF NOT EXISTS public.alergenos_id_seq;

-- Tablas
CREATE TABLE public.acuerdo_proveedor_defaults (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  razon_social character varying(200) DEFAULT ''::character varying NOT NULL,
  nif character varying(20),
  email character varying(200) DEFAULT ''::character varying NOT NULL,
  direccion text,
  soporte_canal character varying(200),
  soporte_horario character varying(200),
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT acuerdo_proveedor_defaults_pkey PRIMARY KEY (id)
);
CREATE TABLE public.acuerdos_piloto (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  fecha_acuerdo date,
  periodo_desde date,
  periodo_hasta date,
  precio_tipo character varying(40) DEFAULT 'gratuito'::character varying NOT NULL,
  precio_importe numeric(12,2),
  precio_otro_texto character varying(200),
  modulos jsonb DEFAULT '[]'::jsonb NOT NULL,
  modulos_otros character varying(200),
  cliente_nombre_comercial character varying(200) DEFAULT ''::character varying NOT NULL,
  cliente_razon_social character varying(200),
  cliente_nif character varying(20),
  cliente_direccion text,
  cliente_contacto character varying(200),
  cliente_email character varying(200),
  proveedor_razon_social character varying(200) DEFAULT ''::character varying NOT NULL,
  proveedor_nif character varying(20),
  proveedor_email character varying(200) DEFAULT ''::character varying NOT NULL,
  proveedor_direccion text,
  soporte_canal character varying(200),
  soporte_horario character varying(200),
  tenant_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT acuerdos_piloto_precio_importe_check CHECK (((precio_importe IS NULL) OR (precio_importe >= (0)::numeric))),
  CONSTRAINT acuerdos_piloto_precio_tipo_check CHECK (((precio_tipo)::text = ANY ((ARRAY['gratuito'::character varying, 'simbolico'::character varying, 'otro'::character varying, 'aportacion_voluntaria'::character varying])::text[]))),
  CONSTRAINT acuerdos_piloto_pkey PRIMARY KEY (id)
);
CREATE TABLE public.alergenos (
  id integer DEFAULT nextval('alergenos_id_seq'::regclass) NOT NULL,
  nombre character varying(50) NOT NULL,
  icono character varying(10),
  CONSTRAINT alergenos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.articulos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  nombre character varying(255) NOT NULL,
  sku character varying(100),
  unidad_medida character varying(20) NOT NULL,
  stock_actual numeric(15,4) DEFAULT 0,
  stock_minimo numeric(15,4) DEFAULT 0,
  coste_unitario numeric(10,4) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  categoria_almacen character varying(100),
  temperatura_almacen character varying(20),
  stock_maximo numeric(15,4),
  calibracion_comprado numeric(15,4),
  calibracion_util numeric(15,4),
  es_elaborado boolean DEFAULT false NOT NULL,
  CONSTRAINT articulos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ausencias (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empleado_id uuid,
  outlet_id uuid,
  tipo character varying(50) NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  dias integer,
  estado character varying(20) DEFAULT 'pendiente'::character varying,
  motivo text,
  aprobado_por uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ausencias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categorias_menu (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  nombre character varying(100) NOT NULL,
  orden integer DEFAULT 0,
  icono character varying(50),
  color character varying(7) DEFAULT '#6366f1'::character varying,
  activo boolean DEFAULT true,
  CONSTRAINT categorias_menu_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cierres_caja (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  outlet_id uuid,
  usuario_id uuid,
  fecha date NOT NULL,
  total_efectivo numeric(10,2) DEFAULT 0,
  total_tarjeta numeric(10,2) DEFAULT 0,
  total_bizum numeric(10,2) DEFAULT 0,
  total_transferencia numeric(10,2) DEFAULT 0,
  total_invitaciones numeric(10,2) DEFAULT 0,
  total_ventas numeric(10,2) DEFAULT 0,
  num_tickets integer DEFAULT 0,
  ticket_medio numeric(10,2) DEFAULT 0,
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cierres_caja_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clientes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  nombre character varying(255) NOT NULL,
  email character varying(255),
  telefono character varying(20),
  fecha_nacimiento date,
  alergenos text[],
  preferencias text,
  total_visitas integer DEFAULT 0,
  gasto_total numeric(10,2) DEFAULT 0,
  gasto_medio numeric(10,2) DEFAULT 0,
  ultima_visita date,
  puntos_fidelidad integer DEFAULT 0,
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clientes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.configuracion (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  clave character varying(100) NOT NULL,
  valor text NOT NULL,
  descripcion text,
  CONSTRAINT configuracion_pkey PRIMARY KEY (id),
  CONSTRAINT configuracion_tenant_id_clave_key UNIQUE (tenant_id, clave)
);
CREATE TABLE public.cuadrante_asignaciones (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cuadrante_id uuid,
  empleado_id uuid,
  fecha date NOT NULL,
  hora_inicio time without time zone,
  hora_fin time without time zone,
  puesto character varying(50),
  CONSTRAINT cuadrante_asignaciones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cuadrantes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  outlet_id uuid,
  semana_inicio date NOT NULL,
  semana_fin date NOT NULL,
  publicado boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cuadrantes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.empleados (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  usuario_id uuid,
  dni character varying(20),
  cargo character varying(100),
  fecha_inicio date,
  activo boolean DEFAULT true,
  nss character varying(20),
  contrato character varying(50),
  jornada_horas numeric(5,2) DEFAULT 40,
  irpf_porcentaje numeric(5,2),
  iban character varying(34),
  salario_bruto_mensual numeric(10,2),
  nombre_completo character varying(255),
  CONSTRAINT empleados_pkey PRIMARY KEY (id)
);
CREATE TABLE public.facturas_proveedor (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  proveedor_id uuid,
  numero_factura character varying(100),
  fecha date NOT NULL,
  total numeric(10,2) NOT NULL,
  procesada_ia boolean DEFAULT false,
  imagen_url text,
  created_at timestamp with time zone DEFAULT now(),
  fecha_vencimiento date,
  pagada boolean DEFAULT false,
  pagada_at timestamp with time zone,
  CONSTRAINT facturas_proveedor_pkey PRIMARY KEY (id)
);
CREATE TABLE public.facturas_proveedor_lineas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  factura_id uuid,
  articulo_id uuid,
  cantidad numeric(15,4) NOT NULL,
  coste_unitario numeric(10,4) NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  CONSTRAINT facturas_proveedor_lineas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.gastos_operativos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  concepto character varying(200) NOT NULL,
  categoria character varying(40) DEFAULT 'otros'::character varying NOT NULL,
  importe_mensual numeric(12,2) DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gastos_operativos_importe_mensual_check CHECK ((importe_mensual >= (0)::numeric)),
  CONSTRAINT gastos_operativos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ingenieria_menu (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  producto_id uuid,
  tenant_id uuid,
  periodo_inicio date NOT NULL,
  periodo_fin date NOT NULL,
  unidades_vendidas integer DEFAULT 0,
  ingreso_total numeric(10,2) DEFAULT 0,
  coste_total numeric(10,2) DEFAULT 0,
  margen_total numeric(10,2) DEFAULT 0,
  margen_porcentaje numeric(5,2) DEFAULT 0,
  clasificacion character varying(20),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ingenieria_menu_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lista_espera (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  outlet_id uuid,
  nombre_cliente character varying(255) NOT NULL,
  telefono character varying(20),
  num_personas integer NOT NULL,
  hora_llegada timestamp with time zone DEFAULT now(),
  estado character varying(20) DEFAULT 'esperando'::character varying,
  tiempo_estimado integer,
  CONSTRAINT lista_espera_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lotes_inventario (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  articulo_id uuid,
  outlet_id uuid,
  cantidad numeric(15,4) NOT NULL,
  coste_unitario numeric(10,4) NOT NULL,
  fecha_caducidad date,
  created_at timestamp with time zone DEFAULT now(),
  numero_lote character varying(50),
  CONSTRAINT lotes_inventario_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mermas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  outlet_id uuid,
  articulo_id uuid,
  cantidad numeric(15,4) NOT NULL,
  motivo character varying(50) NOT NULL,
  coste_imputado numeric(10,4),
  usuario_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mermas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mesas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  outlet_id uuid,
  numero integer NOT NULL,
  capacidad integer DEFAULT 4,
  estado character varying(20) DEFAULT 'libre'::character varying,
  posicion_x numeric,
  posicion_y numeric,
  zona character varying(100),
  CONSTRAINT mesas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.movimientos_stock (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  articulo_id uuid,
  outlet_id uuid,
  tipo character varying(20) NOT NULL,
  cantidad numeric(15,4) NOT NULL,
  coste_unitario numeric(10,4),
  motivo text,
  usuario_id uuid,
  ticket_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT movimientos_stock_pkey PRIMARY KEY (id)
);
CREATE TABLE public.nominas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empleado_id uuid,
  mes integer NOT NULL,
  anio integer NOT NULL,
  salario_bruto numeric(10,2) NOT NULL,
  horas_extra_importe numeric(10,2) DEFAULT 0,
  plus_festivos numeric(10,2) DEFAULT 0,
  otros_devengos numeric(10,2) DEFAULT 0,
  total_devengos numeric(10,2) NOT NULL,
  ss_empleado numeric(10,2) NOT NULL,
  irpf numeric(10,2) NOT NULL,
  otras_deducciones numeric(10,2) DEFAULT 0,
  total_deducciones numeric(10,2) NOT NULL,
  liquido numeric(10,2) NOT NULL,
  ss_empresa numeric(10,2) NOT NULL,
  coste_total_empresa numeric(10,2) NOT NULL,
  pagada boolean DEFAULT false,
  pdf_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT nominas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notificaciones (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  usuario_id uuid,
  tipo character varying(50) NOT NULL,
  titulo character varying(255) NOT NULL,
  mensaje text,
  leida boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notificaciones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.outlets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  nombre character varying(255) NOT NULL,
  num_mesas integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT outlets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pedidos_proveedor (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  proveedor_id uuid,
  outlet_id uuid,
  estado character varying(20) DEFAULT 'pendiente'::character varying,
  fecha_pedido date DEFAULT CURRENT_DATE NOT NULL,
  fecha_entrega_estimada date,
  total_estimado numeric(10,2),
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pedidos_proveedor_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pedidos_proveedor_lineas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pedido_id uuid,
  articulo_id uuid,
  cantidad numeric(15,4) NOT NULL,
  precio_unitario_estimado numeric(10,4),
  CONSTRAINT pedidos_proveedor_lineas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.platform_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nivel text NOT NULL,
  tenant_id uuid,
  usuario_id uuid,
  modulo text NOT NULL,
  accion text NOT NULL,
  detalle jsonb,
  ip text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT platform_logs_nivel_check CHECK ((nivel = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text]))),
  CONSTRAINT platform_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.producto_alergenos (
  producto_id uuid NOT NULL,
  alergeno_id integer NOT NULL,
  CONSTRAINT producto_alergenos_pkey PRIMARY KEY (producto_id, alergeno_id)
);
CREATE TABLE public.productos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  categoria_id uuid,
  nombre character varying(255) NOT NULL,
  precio numeric(10,2) NOT NULL,
  tiene_receta boolean DEFAULT false,
  activo boolean DEFAULT true,
  imagen_url text,
  descripcion text,
  iva_porcentaje numeric(5,2) DEFAULT 10.00,
  es_bebida boolean DEFAULT false,
  es_menu boolean DEFAULT false,
  disponible_delivery boolean DEFAULT true,
  tiempo_preparacion integer DEFAULT 0,
  precio_coste numeric(10,2),
  destino_kds character varying(10) DEFAULT 'cocina'::character varying,
  CONSTRAINT productos_destino_kds_check CHECK (((destino_kds)::text = ANY (ARRAY[('cocina'::character varying)::text, ('barra'::character varying)::text, ('ninguno'::character varying)::text]))),
  CONSTRAINT productos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.proveedores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  nombre character varying(255) NOT NULL,
  nif character varying(20),
  email character varying(255),
  telefono character varying(20),
  direccion text,
  condiciones_pago text,
  dias_entrega integer DEFAULT 1,
  activo boolean DEFAULT true,
  CONSTRAINT proveedores_pkey PRIMARY KEY (id)
);
CREATE TABLE public.receta_ingredientes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  receta_id uuid,
  articulo_id uuid,
  cantidad_neta numeric(15,4) NOT NULL,
  porcentaje_merma numeric(5,2) DEFAULT 0,
  unidad character varying(20) NOT NULL,
  orden integer DEFAULT 0,
  CONSTRAINT receta_ingredientes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recetas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  producto_id uuid,
  rendimiento numeric(10,4) DEFAULT 1,
  instrucciones text,
  tiempo_preparacion integer,
  foto_url text,
  coste_calculado numeric(10,4),
  margen_porcentaje numeric(5,2),
  semaforo character varying(10),
  updated_at timestamp with time zone DEFAULT now(),
  articulo_salida_id uuid,
  CONSTRAINT recetas_plato_o_elaboracion CHECK ((((producto_id IS NOT NULL) AND (articulo_salida_id IS NULL)) OR ((producto_id IS NULL) AND (articulo_salida_id IS NOT NULL)))),
  CONSTRAINT recetas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.registros_appcc (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  outlet_id uuid,
  usuario_id uuid,
  tipo_control character varying(50) NOT NULL,
  nombre_equipo character varying(100),
  temperatura numeric(5,2),
  conforme boolean DEFAULT true,
  observaciones text,
  accion_correctora text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT registros_appcc_pkey PRIMARY KEY (id)
);
CREATE TABLE public.rentabilidad_mesas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  mesa_id uuid,
  outlet_id uuid,
  ticket_id uuid,
  fecha date NOT NULL,
  num_comensales integer,
  tiempo_ocupacion_minutos integer,
  ingreso_total numeric(10,2),
  ingreso_por_hora numeric(10,2),
  ingreso_por_comensal numeric(10,2),
  CONSTRAINT rentabilidad_mesas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reservas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  outlet_id uuid,
  mesa_id uuid,
  nombre_cliente character varying(255) NOT NULL,
  telefono character varying(20),
  fecha date NOT NULL,
  hora time without time zone NOT NULL,
  num_personas integer NOT NULL,
  estado character varying(20) DEFAULT 'confirmada'::character varying,
  notas text,
  email character varying(255),
  origen character varying(20) DEFAULT 'telefono'::character varying,
  recordatorio_enviado boolean DEFAULT false,
  cliente_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reservas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.solicitudes_ausencia (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empleado_id uuid,
  tipo character varying(30) NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  estado character varying(20) DEFAULT 'pendiente'::character varying,
  motivo text,
  aprobada_por uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT solicitudes_ausencia_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tenant_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  usuario_id uuid,
  tabla text NOT NULL,
  operacion text NOT NULL,
  registro_id uuid,
  datos_antes jsonb,
  datos_despues jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tenant_audit_log_operacion_check CHECK ((operacion = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]))),
  CONSTRAINT tenant_audit_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tenants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre character varying(255) NOT NULL,
  nif character varying(20) NOT NULL,
  direccion text,
  created_at timestamp with time zone DEFAULT now(),
  telefono character varying(20),
  email character varying(255),
  logo_url text,
  plan character varying(20) DEFAULT 'basico'::character varying,
  activo boolean DEFAULT true,
  razon_social text,
  codigo_postal text,
  ciudad text,
  provincia text,
  serie_facturacion text DEFAULT 'A'::text,
  modulos jsonb DEFAULT '{}'::jsonb,
  email_slug text NOT NULL,
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ticket_lineas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ticket_id uuid,
  producto_id uuid,
  cantidad integer NOT NULL,
  precio_unitario numeric(10,2) NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  nota text,
  descuento_porcentaje numeric(5,2) DEFAULT 0,
  enviado_cocina boolean DEFAULT false,
  enviado_cocina_at timestamp with time zone,
  estado_cocina character varying(20) DEFAULT 'pendiente'::character varying,
  enviado_barra boolean DEFAULT false NOT NULL,
  enviado_barra_at timestamp with time zone,
  estado_barra character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
  CONSTRAINT ticket_lineas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ticket_pagos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ticket_id uuid,
  importe numeric(10,2) NOT NULL,
  metodo_pago character varying(20) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ticket_pagos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tickets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  outlet_id uuid,
  mesa_id uuid,
  camarero_id uuid,
  estado character varying(20) DEFAULT 'abierto'::character varying,
  total numeric(10,2) DEFAULT 0,
  metodo_pago character varying(20),
  created_at timestamp with time zone DEFAULT now(),
  cobrado_at timestamp with time zone,
  total_iva numeric(10,2) DEFAULT 0,
  descuento_porcentaje numeric(5,2) DEFAULT 0,
  descuento_importe numeric(10,2) DEFAULT 0,
  num_comensales integer DEFAULT 1,
  notas text,
  es_delivery boolean DEFAULT false,
  plataforma_delivery character varying(50),
  tiempo_ocupacion integer,
  CONSTRAINT tickets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.turnos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  empleado_id uuid,
  outlet_id uuid,
  fecha date NOT NULL,
  hora_entrada time without time zone,
  hora_salida time without time zone,
  horas_trabajadas numeric(5,2),
  hora_inicio_planificada time without time zone,
  hora_fin_planificada time without time zone,
  horas_extra numeric(5,2) DEFAULT 0,
  tipo character varying(20) DEFAULT 'normal'::character varying,
  incidencia character varying(50),
  firmado_empleado boolean DEFAULT false,
  CONSTRAINT turnos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.usuario_permisos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  usuario_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  clave character varying(80) NOT NULL,
  permitido boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT usuario_permisos_pkey PRIMARY KEY (id),
  CONSTRAINT usuario_permisos_usuario_id_clave_key UNIQUE (usuario_id, clave)
);
CREATE TABLE public.usuarios (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  outlet_id uuid,
  nombre character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  password_hash text NOT NULL,
  rol character varying(50) NOT NULL,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  pin character varying(6),
  CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['superadmin'::character varying, 'admin'::character varying, 'director'::character varying, 'jefe_sala'::character varying, 'camarero'::character varying, 'cocina'::character varying, 'barra'::character varying, 'almacen'::character varying])::text[]))),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_email_key UNIQUE (email)
);
CREATE TABLE public.verifactu_registros (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  ticket_id uuid,
  numero_serie character varying(50) NOT NULL,
  fecha_expedicion date NOT NULL,
  tipo_factura character varying(5) DEFAULT 'F1'::character varying,
  base_imponible numeric(10,2) NOT NULL,
  cuota_iva numeric(10,2) NOT NULL,
  importe_total numeric(10,2) NOT NULL,
  huella_anterior text,
  huella_actual text NOT NULL,
  xml_generado text,
  enviado_aeat boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  fecha_hora_generacion timestamp with time zone,
  CONSTRAINT verifactu_registros_pkey PRIMARY KEY (id)
);

-- Claves for?neas
ALTER TABLE acuerdos_piloto ADD CONSTRAINT acuerdos_piloto_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE articulos ADD CONSTRAINT articulos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE ausencias ADD CONSTRAINT ausencias_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES usuarios(id);
ALTER TABLE ausencias ADD CONSTRAINT ausencias_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES empleados(id);
ALTER TABLE ausencias ADD CONSTRAINT ausencias_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE categorias_menu ADD CONSTRAINT categorias_menu_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE cierres_caja ADD CONSTRAINT cierres_caja_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE cierres_caja ADD CONSTRAINT cierres_caja_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE clientes ADD CONSTRAINT clientes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE configuracion ADD CONSTRAINT configuracion_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE cuadrante_asignaciones ADD CONSTRAINT cuadrante_asignaciones_cuadrante_id_fkey FOREIGN KEY (cuadrante_id) REFERENCES cuadrantes(id);
ALTER TABLE cuadrante_asignaciones ADD CONSTRAINT cuadrante_asignaciones_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES empleados(id);
ALTER TABLE cuadrantes ADD CONSTRAINT cuadrantes_created_by_fkey FOREIGN KEY (created_by) REFERENCES usuarios(id);
ALTER TABLE cuadrantes ADD CONSTRAINT cuadrantes_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE empleados ADD CONSTRAINT empleados_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE empleados ADD CONSTRAINT empleados_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE facturas_proveedor ADD CONSTRAINT facturas_proveedor_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id);
ALTER TABLE facturas_proveedor ADD CONSTRAINT facturas_proveedor_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE facturas_proveedor_lineas ADD CONSTRAINT facturas_proveedor_lineas_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulos(id);
ALTER TABLE facturas_proveedor_lineas ADD CONSTRAINT facturas_proveedor_lineas_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES facturas_proveedor(id);
ALTER TABLE gastos_operativos ADD CONSTRAINT gastos_operativos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE ingenieria_menu ADD CONSTRAINT ingenieria_menu_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id);
ALTER TABLE ingenieria_menu ADD CONSTRAINT ingenieria_menu_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE lista_espera ADD CONSTRAINT lista_espera_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE lotes_inventario ADD CONSTRAINT lotes_inventario_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulos(id);
ALTER TABLE lotes_inventario ADD CONSTRAINT lotes_inventario_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE mermas ADD CONSTRAINT mermas_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulos(id);
ALTER TABLE mermas ADD CONSTRAINT mermas_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE mermas ADD CONSTRAINT mermas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE mesas ADD CONSTRAINT mesas_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE movimientos_stock ADD CONSTRAINT movimientos_stock_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulos(id);
ALTER TABLE movimientos_stock ADD CONSTRAINT movimientos_stock_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE movimientos_stock ADD CONSTRAINT movimientos_stock_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id);
ALTER TABLE movimientos_stock ADD CONSTRAINT movimientos_stock_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE nominas ADD CONSTRAINT nominas_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES empleados(id);
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE outlets ADD CONSTRAINT outlets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE pedidos_proveedor ADD CONSTRAINT pedidos_proveedor_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE pedidos_proveedor ADD CONSTRAINT pedidos_proveedor_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id);
ALTER TABLE pedidos_proveedor ADD CONSTRAINT pedidos_proveedor_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE pedidos_proveedor_lineas ADD CONSTRAINT pedidos_proveedor_lineas_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulos(id);
ALTER TABLE pedidos_proveedor_lineas ADD CONSTRAINT pedidos_proveedor_lineas_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos_proveedor(id);
ALTER TABLE platform_logs ADD CONSTRAINT platform_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE platform_logs ADD CONSTRAINT platform_logs_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE producto_alergenos ADD CONSTRAINT producto_alergenos_alergeno_id_fkey FOREIGN KEY (alergeno_id) REFERENCES alergenos(id);
ALTER TABLE producto_alergenos ADD CONSTRAINT producto_alergenos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;
ALTER TABLE productos ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias_menu(id);
ALTER TABLE productos ADD CONSTRAINT productos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE proveedores ADD CONSTRAINT proveedores_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE receta_ingredientes ADD CONSTRAINT receta_ingredientes_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulos(id);
ALTER TABLE receta_ingredientes ADD CONSTRAINT receta_ingredientes_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES recetas(id);
ALTER TABLE recetas ADD CONSTRAINT recetas_articulo_salida_id_fkey FOREIGN KEY (articulo_salida_id) REFERENCES articulos(id) ON DELETE RESTRICT;
ALTER TABLE recetas ADD CONSTRAINT recetas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id);
ALTER TABLE registros_appcc ADD CONSTRAINT registros_appcc_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE registros_appcc ADD CONSTRAINT registros_appcc_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE rentabilidad_mesas ADD CONSTRAINT rentabilidad_mesas_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES mesas(id);
ALTER TABLE rentabilidad_mesas ADD CONSTRAINT rentabilidad_mesas_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE rentabilidad_mesas ADD CONSTRAINT rentabilidad_mesas_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id);
ALTER TABLE reservas ADD CONSTRAINT reservas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id);
ALTER TABLE reservas ADD CONSTRAINT reservas_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES mesas(id);
ALTER TABLE reservas ADD CONSTRAINT reservas_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE solicitudes_ausencia ADD CONSTRAINT solicitudes_ausencia_aprobada_por_fkey FOREIGN KEY (aprobada_por) REFERENCES usuarios(id);
ALTER TABLE solicitudes_ausencia ADD CONSTRAINT solicitudes_ausencia_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES empleados(id);
ALTER TABLE tenant_audit_log ADD CONSTRAINT tenant_audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE tenant_audit_log ADD CONSTRAINT tenant_audit_log_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE ticket_lineas ADD CONSTRAINT ticket_lineas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id);
ALTER TABLE ticket_lineas ADD CONSTRAINT ticket_lineas_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id);
ALTER TABLE ticket_pagos ADD CONSTRAINT ticket_pagos_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
ALTER TABLE tickets ADD CONSTRAINT tickets_camarero_id_fkey FOREIGN KEY (camarero_id) REFERENCES usuarios(id);
ALTER TABLE tickets ADD CONSTRAINT tickets_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES mesas(id);
ALTER TABLE tickets ADD CONSTRAINT tickets_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE turnos ADD CONSTRAINT turnos_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES empleados(id);
ALTER TABLE turnos ADD CONSTRAINT turnos_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE usuario_permisos ADD CONSTRAINT usuario_permisos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE usuario_permisos ADD CONSTRAINT usuario_permisos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id);
ALTER TABLE usuarios ADD CONSTRAINT usuarios_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE verifactu_registros ADD CONSTRAINT verifactu_registros_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE verifactu_registros ADD CONSTRAINT verifactu_registros_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id);

-- ?ndices
CREATE INDEX idx_acuerdos_piloto_created ON public.acuerdos_piloto USING btree (created_at DESC);
CREATE INDEX idx_gastos_operativos_tenant ON public.gastos_operativos USING btree (tenant_id);
CREATE INDEX idx_platform_logs_nivel_created_at ON public.platform_logs USING btree (nivel, created_at DESC);
CREATE INDEX idx_platform_logs_tenant_created_at ON public.platform_logs USING btree (tenant_id, created_at DESC);
CREATE INDEX idx_tenant_audit_log_tenant_created_at ON public.tenant_audit_log USING btree (tenant_id, created_at DESC);
CREATE INDEX idx_ticket_pagos_ticket_id ON public.ticket_pagos USING btree (ticket_id);
CREATE INDEX idx_usuario_permisos_tenant ON public.usuario_permisos USING btree (tenant_id);
CREATE UNIQUE INDEX tenants_email_slug_uidx ON public.tenants USING btree (email_slug);
CREATE UNIQUE INDEX uq_recetas_articulo_salida_id ON public.recetas USING btree (articulo_salida_id) WHERE (articulo_salida_id IS NOT NULL);
