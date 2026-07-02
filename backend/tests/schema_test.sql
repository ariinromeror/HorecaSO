-- Esquema mínimo para tests de integración (pytest).
-- NO es una migración de producción: solo cubre las tablas que ejercitan
-- los tests actuales. La fuente de verdad del esquema completo real está
-- documentada en docs/SCHEMA_BASE_DATOS.md (Supabase). Cuando la Fase 5
-- (migraciones versionadas) esté lista, este archivo debería derivarse de
-- la migración base en vez de mantenerse a mano por separado.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR NOT NULL,
    nif VARCHAR NOT NULL,
    direccion TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    telefono VARCHAR,
    email VARCHAR,
    logo_url TEXT,
    plan VARCHAR DEFAULT 'basico',
    activo BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR NOT NULL,
    num_mesas INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    outlet_id UUID REFERENCES outlets(id),
    nombre VARCHAR NOT NULL,
    email VARCHAR NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol VARCHAR NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    pin VARCHAR
);

CREATE TABLE IF NOT EXISTS mesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    numero INT NOT NULL,
    capacidad INT DEFAULT 4,
    estado VARCHAR DEFAULT 'libre',
    posicion_x NUMERIC,
    posicion_y NUMERIC,
    zona VARCHAR,
    forma VARCHAR
);

CREATE TABLE IF NOT EXISTS categorias_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR NOT NULL,
    orden INT DEFAULT 0,
    icono VARCHAR,
    color VARCHAR DEFAULT '#6366f1',
    activo BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    categoria_id UUID REFERENCES categorias_menu(id),
    nombre VARCHAR NOT NULL,
    precio NUMERIC NOT NULL,
    tiene_receta BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    imagen_url TEXT,
    descripcion TEXT,
    iva_porcentaje NUMERIC DEFAULT 10.00,
    es_bebida BOOLEAN DEFAULT false,
    es_menu BOOLEAN DEFAULT false,
    disponible_delivery BOOLEAN DEFAULT true,
    tiempo_preparacion INT DEFAULT 0,
    precio_coste NUMERIC,
    destino_kds VARCHAR DEFAULT 'cocina'
);

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    mesa_id UUID REFERENCES mesas(id),
    camarero_id UUID REFERENCES usuarios(id),
    estado VARCHAR DEFAULT 'abierto',
    total NUMERIC DEFAULT 0,
    metodo_pago VARCHAR,
    created_at TIMESTAMPTZ DEFAULT now(),
    cobrado_at TIMESTAMPTZ,
    total_iva NUMERIC DEFAULT 0,
    descuento_porcentaje NUMERIC DEFAULT 0,
    descuento_importe NUMERIC DEFAULT 0,
    num_comensales INT DEFAULT 1,
    notas TEXT,
    es_delivery BOOLEAN DEFAULT false,
    plataforma_delivery VARCHAR,
    tiempo_ocupacion INT
);

CREATE TABLE IF NOT EXISTS ticket_lineas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id),
    producto_id UUID REFERENCES productos(id),
    cantidad INT NOT NULL,
    precio_unitario NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL,
    nota TEXT,
    descuento_porcentaje NUMERIC DEFAULT 0,
    enviado_cocina BOOLEAN DEFAULT false,
    enviado_cocina_at TIMESTAMPTZ,
    estado_cocina VARCHAR DEFAULT 'pendiente',
    enviado_barra BOOLEAN DEFAULT false,
    enviado_barra_at TIMESTAMPTZ,
    estado_barra VARCHAR DEFAULT 'pendiente'
);

CREATE TABLE IF NOT EXISTS ticket_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id),
    importe NUMERIC NOT NULL,
    metodo_pago VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verifactu_registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    ticket_id UUID REFERENCES tickets(id),
    numero_serie VARCHAR NOT NULL,
    fecha_expedicion DATE NOT NULL,
    tipo_factura VARCHAR DEFAULT 'F1',
    base_imponible NUMERIC NOT NULL,
    cuota_iva NUMERIC NOT NULL,
    importe_total NUMERIC NOT NULL,
    huella_anterior TEXT,
    huella_actual TEXT NOT NULL,
    xml_generado TEXT,
    enviado_aeat BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    fecha_hora_generacion TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS articulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR NOT NULL,
    sku VARCHAR,
    unidad_medida VARCHAR DEFAULT 'unidad',
    stock_actual NUMERIC DEFAULT 0,
    stock_minimo NUMERIC DEFAULT 0,
    coste_unitario NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    categoria_almacen VARCHAR,
    temperatura_almacen VARCHAR,
    stock_maximo NUMERIC
);

CREATE TABLE IF NOT EXISTS empleados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    usuario_id UUID REFERENCES usuarios(id),
    dni VARCHAR,
    cargo VARCHAR,
    fecha_inicio DATE,
    activo BOOLEAN DEFAULT true,
    nss VARCHAR,
    contrato VARCHAR,
    jornada_horas NUMERIC DEFAULT 40,
    irpf_porcentaje NUMERIC,
    iban VARCHAR,
    salario_bruto_mensual NUMERIC,
    nombre_completo VARCHAR
);

CREATE TABLE IF NOT EXISTS turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES empleados(id),
    outlet_id UUID REFERENCES outlets(id),
    fecha DATE NOT NULL,
    hora_entrada TIME,
    hora_salida TIME,
    horas_trabajadas NUMERIC,
    hora_inicio_planificada TIME,
    hora_fin_planificada TIME,
    horas_extra NUMERIC DEFAULT 0,
    tipo VARCHAR DEFAULT 'normal',
    incidencia VARCHAR,
    firmado_empleado BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS nominas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES empleados(id),
    mes INT NOT NULL,
    anio INT NOT NULL,
    salario_bruto NUMERIC NOT NULL,
    horas_extra_importe NUMERIC DEFAULT 0,
    plus_festivos NUMERIC DEFAULT 0,
    otros_devengos NUMERIC DEFAULT 0,
    total_devengos NUMERIC NOT NULL,
    ss_empleado NUMERIC NOT NULL,
    irpf NUMERIC NOT NULL,
    otras_deducciones NUMERIC DEFAULT 0,
    total_deducciones NUMERIC NOT NULL,
    liquido NUMERIC NOT NULL,
    ss_empresa NUMERIC NOT NULL,
    coste_total_empresa NUMERIC NOT NULL,
    pagada BOOLEAN DEFAULT false,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
