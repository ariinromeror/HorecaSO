# PRD — HorecaSO v3.0
## Product Requirements Document — Edición Completa
### Última revisión: 20/03/2026

**Proyecto:** HorecaSO
**Autor:** Arin Romero
**Stack:** FastAPI · React 19 · PostgreSQL · Supabase · Render · Vercel
**Target:** Restaurantes medianos — 5 a 50 empleados — mercado español
**Posicionamiento:** ERP de hostelería premium — por encima de Revo, Agora e ICG

---

## 1. VISIÓN DEL PRODUCTO

### El problema real

Un restaurante mediano en España opera con información fragmentada. El dueño cierra el día sin saber si ganó o perdió dinero. Sabe cuánto vendió pero no cuánto le costó vender. Sus platos tienen precios basados en intuición, no en coste real. El inventario lo lleva en papel o en Excel. La facturación fiscal le consume tiempo que no tiene. No sabe qué camarero rinde más, qué mesa genera más dinero por hora, ni qué platos debería retirar de la carta. Y desde 2025, Verifactu es obligatorio.

**El dueño necesita una sola pantalla: vendí esto, me costó esto, me quedé con esto, esto es lo que tengo que hacer mañana.**

### La solución

HorecaSO es el ERP web más completo del mercado de hostelería español. Conecta ventas, costes, inventario, personal, cumplimiento fiscal y experiencia del cliente. Todo en un sistema, sin Excel, sin papel, sin sorpresas.

### Diferenciadores clave vs competencia

| Feature | HorecaSO | Revo | Agora | ICG |
|---------|----------|------|-------|-----|
| Verifactu nativo | ✅ | Parcial | ✅ | ✅ |
| Semáforo rentabilidad | ✅ | ❌ | ❌ | ❌ |
| IA escaneo facturas | ✅ | ❌ | ❌ | ❌ |
| Previsión demanda IA | ✅ | ❌ | ❌ | ❌ |
| División cuenta múltiple | ✅ | ✅ | ✅ | ✅ |
| Rentabilidad por mesa/hora | ✅ | ❌ | ❌ | ❌ |
| Control horario legal | ✅ | ❌ | Parcial | ✅ |
| Carta digital QR | ✅ | ✅ | ✅ | ❌ |
| KDS cocina | ✅ | ✅ | ✅ | ✅ |
| Alérgenos por ley | ✅ | ✅ | ✅ | ✅ |
| Multi-tenant SaaS | ✅ | ❌ | ❌ | ❌ |
| Gestión sala visual | ✅ | ✅ | ✅ | ✅ |

---

## 2. USUARIOS Y ROLES

| Rol | Qué hace en el sistema |
|-----|----------------------|
| **admin** | Todo — configuración global, usuarios, permisos |
| **director** | Dashboard financiero, analytics, reportes, Verifactu, nóminas |
| **jefe_sala** | Mesas, reservas, TPV, venta live, KDS, gestión sala |
| **camarero** | TPV, mesas — tomar pedidos, cobrar, división de cuenta |
| **cocina** | KDS, recetas (lectura), inventario (lectura), mermas |
| **barra** | KDS barra (bebidas / elaboración en barra), control horario |
| **almacen** | Inventario completo, proveedores, mermas, APPCC |

### Glosario operativo — merma (recetas / inventario)

En HorecaSO la **merma** de un ingrediente no es un porcentaje de “rentabilidad al pelar”, sino la **pérdida de peso o volumen usable** al manipular el producto (pelar, limpiar, deshilachar, etc.). Ejemplo: compras 1 kg de cebolla; al pelar y quitar la raíz pierdes 200 g → solo entran 800 g al plato; la merma es ese **20 %** de peso que no se aprovecha. El sistema usa ese % para calcular cuánto ingrediente bruto necesitas y el **coste por ración**. En pantalla se evita el término *escandallo*; se usa **receta y coste** o **desglose de ingredientes**.

---

## 3. ARQUITECTURA TÉCNICA

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Backend | FastAPI 0.115 · Python 3.12 | Sin ORM — raw asyncpg |
| Base de datos | PostgreSQL 15 vía Supabase | pgbouncer → statement_cache_size=0 |
| Frontend | React 19 · Vite 7 · Tailwind CSS 4 | Mobile first obligatorio |
| Auth | JWT · bcrypt 4.0.1 · passlib 1.7.4 · RBAC | require_roles en todos los endpoints |
| IA | Groq API (llama3 + vision) | Escaneo facturas + previsión demanda |
| PDF | ReportLab | Tickets, facturas, nóminas |
| Email | SendGrid | Reservas, alertas stock |
| Deploy | Render (backend) · Vercel (frontend) | WebSocket requiere plan pago |

---

## 4. SCHEMA COMPLETO DE BASE DE DATOS

```sql
-- ============================================================
-- CORE MULTI-TENANT
-- ============================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    nif VARCHAR(20) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    plan VARCHAR(20) DEFAULT 'basico',   -- basico, profesional, premium, enterprise
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    num_mesas INTEGER DEFAULT 0,
    capacidad_total INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    outlet_id UUID REFERENCES outlets(id),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol VARCHAR(50) NOT NULL,            -- admin, director, jefe_sala, camarero, cocina, almacen
    pin VARCHAR(6),                      -- PIN rápido para TPV táctil
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SALA Y MESAS
-- ============================================================

CREATE TABLE mesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    numero INTEGER NOT NULL,
    capacidad INTEGER DEFAULT 4,
    estado VARCHAR(20) DEFAULT 'libre',  -- libre, ocupada, reservada, bloqueada
    posicion_x NUMERIC,                  -- para mapa de sala futuro
    posicion_y NUMERIC,
    zona VARCHAR(100),                   -- interior, terraza, barra, privado, jardín
    forma VARCHAR(20) DEFAULT 'cuadrada' -- cuadrada, redonda, rectangular
);

-- ============================================================
-- CARTA Y MENÚ
-- ============================================================

CREATE TABLE categorias_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR(100) NOT NULL,
    icono VARCHAR(50),                   -- nombre de icono (texto, no emoji)
    color VARCHAR(7),                    -- hex para TPV
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE alergenos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,         -- gluten, lactosa, huevo, etc.
    icono VARCHAR(10)
);
-- 14 alérgenos reglamentarios: gluten, crustáceos, huevo, pescado, cacahuetes,
-- soja, lácteos, frutos de cáscara, apio, mostaza, sésamo, sulfitos, moluscos, altramuces

CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    categoria_id UUID REFERENCES categorias_menu(id),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL,
    precio_coste NUMERIC(10,2),          -- actualizado desde receta automáticamente
    iva_porcentaje NUMERIC(5,2) DEFAULT 10.00, -- 10% hostelería, 21% alcohol/tabaco
    tiene_receta BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    imagen_url TEXT,
    es_bebida BOOLEAN DEFAULT FALSE,
    es_menu BOOLEAN DEFAULT FALSE,       -- plato de menú del día
    disponible_delivery BOOLEAN DEFAULT TRUE,
    tiempo_preparacion INTEGER DEFAULT 0 -- minutos estimados para KDS
);

CREATE TABLE producto_alergenos (
    producto_id UUID REFERENCES productos(id),
    alergeno_id INTEGER REFERENCES alergenos(id),
    PRIMARY KEY (producto_id, alergeno_id)
);

CREATE TABLE menus_dia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    outlet_id UUID REFERENCES outlets(id),
    fecha DATE NOT NULL,
    precio NUMERIC(10,2) NOT NULL,
    descripcion TEXT
);

CREATE TABLE menu_dia_platos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID REFERENCES menus_dia(id),
    producto_id UUID REFERENCES productos(id),
    tipo VARCHAR(20) NOT NULL            -- primero, segundo, postre, bebida
);

-- ============================================================
-- TPV Y TICKETS
-- ============================================================

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    mesa_id UUID REFERENCES mesas(id),
    camarero_id UUID REFERENCES usuarios(id),
    estado VARCHAR(20) DEFAULT 'abierto', -- abierto, cobrado, anulado, dividido
    total NUMERIC(10,2) DEFAULT 0,
    total_iva NUMERIC(10,2) DEFAULT 0,
    descuento_porcentaje NUMERIC(5,2) DEFAULT 0,
    descuento_importe NUMERIC(10,2) DEFAULT 0,
    metodo_pago VARCHAR(20),             -- método principal (o 'mixto' si división)
    num_comensales INTEGER DEFAULT 1,
    notas TEXT,
    es_delivery BOOLEAN DEFAULT FALSE,
    plataforma_delivery VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cobrado_at TIMESTAMPTZ,
    tiempo_ocupacion INTEGER             -- minutos desde apertura a cobro
);

CREATE TABLE ticket_lineas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id),
    producto_id UUID REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    descuento_porcentaje NUMERIC(5,2) DEFAULT 0,
    nota TEXT,
    enviado_cocina BOOLEAN DEFAULT FALSE,
    enviado_cocina_at TIMESTAMPTZ,
    estado_cocina VARCHAR(20) DEFAULT 'pendiente' -- pendiente, preparando, listo
);

-- División de cuenta — múltiples métodos de pago por ticket
CREATE TABLE ticket_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    importe NUMERIC(10,2) NOT NULL,
    metodo_pago VARCHAR(20) NOT NULL,    -- efectivo|tarjeta_credito|tarjeta_debito|bizum|transferencia|invitacion
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Ticket se marca cobrado cuando SUM(ticket_pagos.importe) >= tickets.total
-- Verifactu se genera al completar el cobro total

CREATE TABLE cierres_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    usuario_id UUID REFERENCES usuarios(id),
    fecha DATE NOT NULL,
    total_efectivo NUMERIC(10,2) DEFAULT 0,
    total_tarjeta NUMERIC(10,2) DEFAULT 0,
    total_bizum NUMERIC(10,2) DEFAULT 0,
    total_transferencia NUMERIC(10,2) DEFAULT 0,
    total_invitaciones NUMERIC(10,2) DEFAULT 0,
    total_ventas NUMERIC(10,2) DEFAULT 0,
    num_tickets INTEGER DEFAULT 0,
    ticket_medio NUMERIC(10,2) DEFAULT 0,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VERIFACTU — REGLAS CRÍTICAS
-- ============================================================
-- NUNCA UPDATE ni DELETE en esta tabla
-- Cobro + Verifactu en la MISMA transacción (rollback si falla)
-- SHA-256 MAYÚSCULAS, campos con &, UTF-8 sin BOM

CREATE TABLE verifactu_registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    ticket_id UUID REFERENCES tickets(id),
    numero_serie VARCHAR(50) NOT NULL,
    fecha_expedicion DATE NOT NULL,
    fecha_hora_generacion TIMESTAMPTZ,   -- crítico para verificar-cadena
    tipo_factura VARCHAR(5) DEFAULT 'F1',
    base_imponible NUMERIC(10,2) NOT NULL,
    cuota_iva NUMERIC(10,2) NOT NULL,
    importe_total NUMERIC(10,2) NOT NULL,
    huella_anterior TEXT,
    huella_actual TEXT NOT NULL,
    xml_generado TEXT,
    enviado_aeat BOOLEAN DEFAULT FALSE,
    enviado_at TIMESTAMPTZ,
    error_envio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVENTARIO Y ALMACÉN
-- ============================================================

CREATE TABLE articulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    unidad_medida VARCHAR(20) NOT NULL,  -- kg, l, ud, g, ml
    stock_actual NUMERIC(15,4) DEFAULT 0,
    stock_minimo NUMERIC(15,4) DEFAULT 0,
    stock_maximo NUMERIC(15,4),
    coste_unitario NUMERIC(10,4) DEFAULT 0,
    categoria_almacen VARCHAR(100),      -- carnes, pescados, bebidas, lácteos, verduras, secos, limpieza
    proveedor_habitual_id UUID,          -- FK a proveedores (añadir cuando se implemente Fase 3)
    temperatura_almacen VARCHAR(20),     -- ambiente, refrigerado, congelado (añadir en Fase 3)
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- NOTA: proveedor_habitual_id y temperatura_almacen no están en Supabase todavía
-- Se añaden cuando se implemente el módulo de proveedores (Fase 3)

CREATE TABLE lotes_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    articulo_id UUID REFERENCES articulos(id),
    outlet_id UUID REFERENCES outlets(id),
    cantidad NUMERIC(15,4) NOT NULL,
    coste_unitario NUMERIC(10,4) NOT NULL,
    fecha_caducidad DATE,
    numero_lote VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- FIFO: el lote más antiguo se consume primero
-- Se implementa en backend/services/inventario_fifo.py (Fase 4)

CREATE TABLE movimientos_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    articulo_id UUID REFERENCES articulos(id),
    outlet_id UUID REFERENCES outlets(id),
    tipo VARCHAR(20) NOT NULL,           -- entrada, salida, ajuste, merma, traslado
    cantidad NUMERIC(15,4) NOT NULL,
    coste_unitario NUMERIC(10,4),
    motivo TEXT,
    usuario_id UUID REFERENCES usuarios(id),
    ticket_id UUID REFERENCES tickets(id), -- si la salida es por venta
    factura_id UUID,                     -- si la entrada es por factura proveedor
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE registros_appcc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    usuario_id UUID REFERENCES usuarios(id),
    tipo_control VARCHAR(50) NOT NULL,   -- nevera, congelador, freidora, etc.
    nombre_equipo VARCHAR(100) NOT NULL,
    temperatura NUMERIC(5,2) NOT NULL,
    temperatura_min NUMERIC(5,2),
    temperatura_max NUMERIC(5,2),
    conforme BOOLEAN,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECETAS Y ESCANDALLOS
-- ============================================================

CREATE TABLE recetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID REFERENCES productos(id),
    rendimiento NUMERIC(10,4) DEFAULT 1, -- nº de raciones
    tiempo_preparacion INTEGER,          -- minutos
    instrucciones TEXT,
    foto_url TEXT,
    coste_calculado NUMERIC(10,4),       -- actualizado automáticamente al cambiar ingredientes
    margen_porcentaje NUMERIC(5,2),      -- (precio_venta - coste) / precio_venta * 100
    semaforo VARCHAR(10),                -- verde (>65%), amarillo (40-65%), rojo (<40%)
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE receta_ingredientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id UUID REFERENCES recetas(id),
    articulo_id UUID REFERENCES articulos(id),
    cantidad_neta NUMERIC(15,4) NOT NULL,
    porcentaje_merma NUMERIC(5,2) DEFAULT 0,
    -- cantidad_bruta = cantidad_neta / (1 - porcentaje_merma/100)
    unidad VARCHAR(20) NOT NULL,
    orden INTEGER DEFAULT 0
);

CREATE TABLE mermas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    articulo_id UUID REFERENCES articulos(id),
    cantidad NUMERIC(15,4) NOT NULL,
    motivo VARCHAR(50) NOT NULL,         -- caducidad, rotura, error_cocina, sobrante, otro
    coste_imputado NUMERIC(10,4),
    usuario_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE control_real_teorico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    articulo_id UUID REFERENCES articulos(id),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    consumo_teorico NUMERIC(15,4),       -- según ventas y recetas
    consumo_real NUMERIC(15,4),          -- según movimientos de stock
    diferencia NUMERIC(15,4),            -- real - teorico (positivo = pérdida)
    coste_diferencia NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROVEEDORES Y COMPRAS
-- ============================================================

CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR(255) NOT NULL,
    nif VARCHAR(20),
    email VARCHAR(255),
    telefono VARCHAR(20),
    direccion TEXT,
    condiciones_pago TEXT,               -- ej: "30 días", "contado", "60 días"
    dias_entrega INTEGER DEFAULT 1,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE pedidos_proveedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    proveedor_id UUID REFERENCES proveedores(id),
    outlet_id UUID REFERENCES outlets(id),
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, enviado, recibido, cancelado
    fecha_pedido DATE NOT NULL,
    fecha_entrega_estimada DATE,
    total_estimado NUMERIC(10,2),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pedidos_proveedor_lineas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos_proveedor(id),
    articulo_id UUID REFERENCES articulos(id),
    cantidad NUMERIC(15,4) NOT NULL,
    precio_unitario_estimado NUMERIC(10,4)
);

CREATE TABLE facturas_proveedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    proveedor_id UUID REFERENCES proveedores(id),
    pedido_id UUID REFERENCES pedidos_proveedor(id),
    numero_factura VARCHAR(100),
    fecha DATE NOT NULL,
    fecha_vencimiento DATE,
    total NUMERIC(10,2) NOT NULL,
    pagada BOOLEAN DEFAULT FALSE,
    pagada_at TIMESTAMPTZ,
    procesada_ia BOOLEAN DEFAULT FALSE,  -- si fue escaneada con Groq
    imagen_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE facturas_proveedor_lineas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID REFERENCES facturas_proveedor(id),
    articulo_id UUID REFERENCES articulos(id),
    cantidad NUMERIC(15,4) NOT NULL,
    coste_unitario NUMERIC(10,4) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- EMPLEADOS Y RRHH
-- ============================================================

CREATE TABLE empleados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    usuario_id UUID REFERENCES usuarios(id), -- puede ser null si no tiene acceso al sistema
    dni VARCHAR(20),
    nss VARCHAR(20),                     -- Número Seguridad Social
    cargo VARCHAR(100),
    categoria_profesional VARCHAR(100),
    contrato VARCHAR(50),                -- indefinido, temporal, parcial
    jornada_horas NUMERIC(5,2) DEFAULT 40, -- horas semanales contrato
    salario_bruto_mensual NUMERIC(10,2),
    irpf_porcentaje NUMERIC(5,2),        -- % retención IRPF según tabla AEAT
    fecha_inicio DATE,
    fecha_fin DATE,
    iban VARCHAR(34),
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES empleados(id),
    outlet_id UUID REFERENCES outlets(id),
    fecha DATE NOT NULL,
    hora_inicio_planificada TIME,
    hora_fin_planificada TIME,
    hora_entrada TIME,                   -- fichaje real entrada
    hora_salida TIME,                    -- fichaje real salida
    horas_trabajadas NUMERIC(5,2),
    horas_extra NUMERIC(5,2) DEFAULT 0,
    tipo VARCHAR(20) DEFAULT 'normal',   -- normal, festivo, nocturno
    incidencia VARCHAR(50),              -- ausencia, retraso, etc.
    firmado_empleado BOOLEAN DEFAULT FALSE
);

CREATE TABLE cuadrantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    semana_inicio DATE NOT NULL,
    semana_fin DATE NOT NULL,
    publicado BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cuadrante_asignaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuadrante_id UUID REFERENCES cuadrantes(id),
    empleado_id UUID REFERENCES empleados(id),
    fecha DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    puesto VARCHAR(50)                   -- sala, barra, cocina, limpieza
);

CREATE TABLE solicitudes_ausencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES empleados(id),
    tipo VARCHAR(30) NOT NULL,           -- vacaciones, enfermedad, personal, maternidad
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobada, rechazada
    motivo TEXT,
    aprobada_por UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nominas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES empleados(id),
    mes INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    salario_bruto NUMERIC(10,2) NOT NULL,
    horas_extra_importe NUMERIC(10,2) DEFAULT 0,
    plus_festivos NUMERIC(10,2) DEFAULT 0,
    otros_devengos NUMERIC(10,2) DEFAULT 0,
    total_devengos NUMERIC(10,2) NOT NULL,
    ss_empleado NUMERIC(10,2) NOT NULL,  -- 6.35% de cotización SS
    irpf NUMERIC(10,2) NOT NULL,         -- según tabla AEAT
    otras_deducciones NUMERIC(10,2) DEFAULT 0,
    total_deducciones NUMERIC(10,2) NOT NULL,
    liquido NUMERIC(10,2) NOT NULL,      -- total_devengos - total_deducciones
    ss_empresa NUMERIC(10,2) NOT NULL,   -- 29.9% cuota patronal
    coste_total_empresa NUMERIC(10,2) NOT NULL, -- total_devengos + ss_empresa
    pagada BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESERVAS Y CLIENTES
-- ============================================================

CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    fecha_nacimiento DATE,
    alergenos TEXT[],                    -- array de IDs de alérgenos
    preferencias TEXT,
    total_visitas INTEGER DEFAULT 0,
    gasto_total NUMERIC(10,2) DEFAULT 0,
    gasto_medio NUMERIC(10,2) DEFAULT 0,
    ultima_visita DATE,
    puntos_fidelidad INTEGER DEFAULT 0,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    mesa_id UUID REFERENCES mesas(id),
    cliente_id UUID REFERENCES clientes(id),
    nombre_cliente VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(255),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    num_personas INTEGER NOT NULL,
    estado VARCHAR(20) DEFAULT 'confirmada', -- pendiente, confirmada, sentada, cancelada, no_show
    origen VARCHAR(20) DEFAULT 'telefono',   -- telefono, web, app, walk_in
    notas TEXT,
    recordatorio_enviado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lista_espera (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    nombre_cliente VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    num_personas INTEGER NOT NULL,
    hora_llegada TIMESTAMPTZ DEFAULT NOW(),
    estado VARCHAR(20) DEFAULT 'esperando', -- esperando, sentado, cancelado
    tiempo_estimado INTEGER              -- minutos estimados de espera
);

-- ============================================================
-- DELIVERY E INTEGRACIONES (Fase 5)
-- ============================================================

CREATE TABLE pedidos_delivery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    plataforma VARCHAR(30) NOT NULL,     -- glovo, ubereats, justeat, propio
    id_externo VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'recibido',
    nombre_cliente VARCHAR(255),
    telefono VARCHAR(20),
    direccion_entrega TEXT,
    total NUMERIC(10,2) NOT NULL,
    comision_plataforma NUMERIC(10,2),
    ticket_id UUID REFERENCES tickets(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS Y KPIs
-- ============================================================

CREATE TABLE rentabilidad_mesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mesa_id UUID REFERENCES mesas(id),
    outlet_id UUID REFERENCES outlets(id),
    ticket_id UUID REFERENCES tickets(id),
    fecha DATE NOT NULL,
    num_comensales INTEGER,
    tiempo_ocupacion_minutos INTEGER,
    ingreso_total NUMERIC(10,2),
    ingreso_por_hora NUMERIC(10,2),      -- ingreso_total / (tiempo_minutos/60)
    ingreso_por_comensal NUMERIC(10,2)
);
-- Se rellena automáticamente al cobrar un ticket

CREATE TABLE ingenieria_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID REFERENCES productos(id),
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    unidades_vendidas INTEGER DEFAULT 0,
    ingreso_total NUMERIC(10,2) DEFAULT 0,
    coste_total NUMERIC(10,2) DEFAULT 0,
    margen_total NUMERIC(10,2) DEFAULT 0,
    popularidad VARCHAR(10),             -- alta, baja
    rentabilidad VARCHAR(10),            -- alta, baja
    clasificacion VARCHAR(20),           -- estrella, caballo_trabajo, puzzle, perro
    -- estrella: popular + rentable → mantener y promocionar
    -- caballo_trabajo: popular + poco rentable → subir precio
    -- puzzle: poco popular + rentable → promocionar
    -- perro: poco popular + poco rentable → retirar
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE previsiones_demanda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    articulo_id UUID REFERENCES articulos(id),
    fecha DATE NOT NULL,
    cantidad_prevista NUMERIC(15,4),
    confianza NUMERIC(5,2),              -- % de confianza del modelo IA
    generada_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONFIGURACIÓN Y SISTEMA
-- ============================================================

CREATE TABLE configuracion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    clave VARCHAR(100) NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    UNIQUE(tenant_id, clave)
);
-- Claves ejemplo: iva_general, iva_reducido, moneda, zona_horaria,
-- email_reservas, whatsapp_activo, delivery_activo, kds_activo

CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    usuario_id UUID REFERENCES usuarios(id),
    tipo VARCHAR(50) NOT NULL,           -- stock_minimo, reserva_nueva, nomina_pendiente, pago_vencido
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT,
    leida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. MÓDULOS DEL PRODUCTO — ESPECIFICACIÓN COMPLETA

---

### MÓDULO 1 — TPV (Terminal Punto de Venta) ✅ IMPLEMENTADO

**Flujo principal:**
```
Sala (elegir mesa) → Abrir comanda → Añadir productos → Enviar cocina
→ Cobrar (simple o dividido) → Verifactu → Mesa libre
```

**División de cuenta:**
```
Cobro simple:    1 pago → 1 método → ticket cobrado
Cobro dividido:  N pagos → N métodos → ticket cobrado cuando suma >= total
Ejemplo: 90€ → 30€ efectivo + 30€ bizum + 30€ tarjeta = cobrado
```

**API Endpoints:**
```
POST   /api/tpv/tickets
GET    /api/tpv/tickets/{id}
POST   /api/tpv/tickets/{id}/lineas
DELETE /api/tpv/tickets/{id}/lineas/{linea_id}
POST   /api/tpv/tickets/{id}/cobrar          # cobro simple (un solo pago)
POST   /api/tpv/tickets/{id}/pagos           # añadir pago parcial (división)
GET    /api/tpv/tickets/{id}/pagos           # ver pagos registrados + pendiente
DELETE /api/tpv/tickets/{id}/pagos/{pago_id} # eliminar pago parcial
GET    /api/tpv/tickets/abiertos
GET    /api/tpv/carta
POST   /api/tpv/cierre-caja
GET    /api/tpv/cierre-caja/{fecha}
```

**Reglas Verifactu:**
- Cobro simple: generar Verifactu en el mismo POST /cobrar
- Cobro dividido: generar Verifactu cuando suma(pagos) >= total
- Siempre en la misma transacción — rollback si falla

---

### MÓDULO 2 — MESAS Y SALA ✅ IMPLEMENTADO

**Dos vistas distintas:**
- **MesasPage** (`/mesas`): vista operativa del camarero — estados en tiempo real, seleccionar mesa para abrir TPV
- **GestionSalaPage** (`/admin/sala`): configuración del local — crear, editar, eliminar mesas

**API Endpoints:**
```
GET    /api/mesas
POST   /api/mesas
GET    /api/mesas/{id}
PUT    /api/mesas/{id}
DELETE /api/mesas/{id}        # solo si estado='libre'
PATCH  /api/mesas/{id}/estado
GET    /api/mesas/{id}/rentabilidad   # Fase 4 — €/hora por mesa
```

**Futuro (Fase 4):**
- Mapa de calor de rentabilidad por mesa — qué mesa genera más €/hora
- Comparativa por zonas (terraza vs interior)

---

### MÓDULO 3 — VERIFACTU ✅ IMPLEMENTADO

**Reglas inamovibles:**
- NUNCA UPDATE ni DELETE en verifactu_registros
- Cobro + Verifactu en la misma transacción
- SHA-256 en MAYÚSCULAS, campos con &, UTF-8 sin BOM
- fecha_hora_generacion guardada en el registro

**API Endpoints:**
```
GET    /api/verifactu/registros
GET    /api/verifactu/registros/{id}
GET    /api/verifactu/verificar-cadena
GET    /api/verifactu/exportar
POST   /api/verifactu/enviar-aeat       # Fase 5 — requiere certificado digital
```

---

### MÓDULO 4 — CARTA Y MENÚ ✅ IMPLEMENTADO

**Funcionalidades:**
- Categorías con color e icono para TPV
- Productos con precio, IVA (10%/21%), alérgenos, descripción
- Toggle activo/inactivo por producto
- 14 alérgenos reglamentarios por producto

**API Endpoints:**
```
GET    /api/carta                       # pública para QR
GET    /api/alergenos
GET/POST/PUT/DELETE /api/admin/categorias
GET/POST/PUT/DELETE /api/admin/productos
POST   /api/admin/productos/{id}/alergenos
```

**Futuro:**
- Carta digital QR pública multi-idioma (Fase 5)
- Menú del día configurable

---

### MÓDULO 5 — KDS (Kitchen Display System) ✅ IMPLEMENTADO

**Pantalla de cocina en tiempo real:**
- Grid de comandas por mesa — colores por urgencia
- verde <5min | amarillo 5-10min | rojo >10min
- Botones "Preparando" y "Listo" por plato
- Polling 30 segundos
- Pantalla completa sin sidebar

**API Endpoints:**
```
GET    /api/kds/comandas                # pendientes, agrupadas por ticket
PATCH  /api/kds/lineas/{id}/estado     # pendiente → preparando → listo
GET    /api/kds/estadisticas           # platos completados/pendientes hoy
```

---

### MÓDULO 6 — RECETAS Y ESCANDALLOS ✅ IMPLEMENTADO

**El corazón del control de costes:**
- Ficha técnica: ingredientes, cantidades brutas y netas
- Fórmula merma: `cantidad_bruta = cantidad_neta / (1 - %merma/100)`
- Coste recalculado automáticamente al cambiar precios de compra
- Semáforo: verde >65% | amarillo 40-65% | rojo <40%

**API Endpoints:**
```
GET    /api/admin/recetas
POST   /api/admin/recetas
PUT    /api/admin/recetas/{id}
GET    /api/admin/recetas/semaforo
GET    /api/admin/recetas/{id}/coste
POST   /api/admin/recetas/{id}/ingredientes
DELETE /api/admin/recetas/{id}/ingredientes/{id}
GET    /api/admin/recetas/real-vs-teorico   # Fase 4
```

---

### MÓDULO 7 — INVENTARIO Y ALMACÉN ✅ IMPLEMENTADO

**Funcionalidades:**
- Maestro de artículos con stock actual vs mínimo
- Alertas de stock crítico
- Movimientos: entrada, salida, ajuste, merma
- Inventario físico: conteo real vs sistema
- Registro diario de mermas con causa
- FIFO (Fase 4): lote más antiguo se consume primero
- APPCC (Fase 4): registro digital de temperaturas

**API Endpoints:**
```
GET/POST       /api/inventario/articulos
PUT            /api/inventario/articulos/{id}
GET            /api/inventario/stock-alertas
POST           /api/inventario/movimientos
GET            /api/inventario/movimientos
POST           /api/inventario/inventario-fisico
GET/POST       /api/appcc/registros             # Fase 4
```

---

### MÓDULO 8 — DASHBOARD Y ANALYTICS ✅ BÁSICO | ⏳ AVANZADO FASE 4

**Básico (implementado):**
- KPIs del día: ventas, tickets, ticket medio, top productos
- Cierre por método de pago
- Venta Live: polling 30s, total acumulado, mesas activas

**Avanzado (Fase 4):**
- Rentabilidad por mesa/hora — ingreso_total / horas_ocupada
- Mapa de calor de mesas — qué zona genera más
- Ingeniería de menú (Matriz BCG):
  - Estrella: popular + rentable → potenciar
  - Caballo: popular + poco rentable → subir precio
  - Puzzle: poco popular + rentable → promocionar
  - Perro: poco popular + poco rentable → retirar
- Previsión de demanda con IA (Groq):
  "Este viernes necesitas X kg de merluza"
- Coste de personal por turno vs ingresos
- Comparativa semana/mes

**API Endpoints:**
```
GET    /api/dashboard/director
GET    /api/dashboard/cierre-dia
GET    /api/dashboard/rentabilidad-mesas    # Fase 4
GET    /api/dashboard/ingenieria-menu       # Fase 4
GET    /api/dashboard/coste-personal        # Fase 4
GET    /api/ia/prevision-demanda            # Fase 4 — Groq
GET    /api/ia/sugerencias-menu             # Fase 4 — Groq
```

---

### MÓDULO 9 — PROVEEDORES Y COMPRAS ⏳ PENDIENTE FASE 3

**Funcionalidades:**
- Maestro de proveedores con condiciones de pago y días de entrega
- Registro de facturas de compra
- **Escaneo de facturas con IA (Groq vision):**
  ```
  Foto factura → Base64 → Groq vision
  → JSON: [{articulo, cantidad, precio_unitario}]
  → Validación humana → Confirmar
  → Actualizar stock + crear lote FIFO + registrar factura
  ```
- Control de pagos pendientes y vencimientos
- Pedidos a proveedor: manual o sugerido por el sistema
- Comparativa de precios entre proveedores por artículo
- Evolución de costes: historial de precio por artículo

**API Endpoints:**
```
GET/POST       /api/proveedores
GET/PUT        /api/proveedores/{id}
POST/GET       /api/facturas-proveedor
POST           /api/facturas-proveedor/escanear-ia
GET            /api/facturas-proveedor/pendientes-pago
POST/GET       /api/pedidos-proveedor
GET            /api/proveedores/comparativa-precios/{articulo_id}
```

---

### MÓDULO 10 — EMPLEADOS Y RRHH ⏳ PENDIENTE FASE 3

**Funcionalidades:**
- Ficha de empleado: DNI, NSS, cargo, contrato, jornada, salario, IBAN
- Control horario con firma digital — obligatorio RDL 8/2019
- Cuadrante semanal visual
- Solicitud y aprobación de vacaciones y ausencias
- **Cálculo de nóminas automático:**
  - Devengos: salario bruto + horas extra + plus festivos/nocturnidad
  - Deducciones: SS empleado (6.35%) + IRPF (tabla AEAT)
  - Coste empresa: cuota patronal SS (29.9%)
  - Líquido = total devengos - total deducciones
  - Generación PDF nómina (ReportLab)

**API Endpoints:**
```
GET/POST       /api/empleados
GET/PUT        /api/empleados/{id}
POST           /api/turnos/fichaje-entrada
POST           /api/turnos/fichaje-salida
GET            /api/turnos
GET            /api/turnos/horas-extra/{empleado_id}
GET/POST       /api/cuadrantes
GET/POST       /api/ausencias
PATCH          /api/ausencias/{id}/estado
GET            /api/nominas/{empleado_id}
POST           /api/nominas/calcular
GET            /api/nominas/{id}/pdf
```

---

### MÓDULO 11 — RESERVAS Y CLIENTES ⏳ PENDIENTE FASE 3

**Funcionalidades reservas:**
- Calendario por día/semana/mes
- Estados: pendiente, confirmada, sentada, cancelada, no_show
- Orígenes: teléfono, web, app, walk-in
- Recordatorio automático 24h antes (SendGrid)
- Lista de espera digital con SMS cuando hay mesa

**Funcionalidades clientes:**
- Historial: visitas, gasto total, gasto medio, última visita
- Alérgenos y preferencias del cliente
- Programa de fidelización con puntos
- Detección de no-shows y cancelaciones

**API Endpoints:**
```
GET/POST       /api/reservas
PATCH          /api/reservas/{id}/estado
GET/POST       /api/clientes
GET            /api/clientes/{id}/historial
GET/POST       /api/lista-espera
PATCH          /api/lista-espera/{id}/estado
```

---

### MÓDULO 12 — REPORTES Y PDF ⏳ PENDIENTE FASE 4

**Funcionalidades:**
- Ticket de venta con QR Verifactu
- Cierre de caja diario en PDF
- Nóminas en PDF
- Informe de ventas por periodo
- Informe de coste de materia prima
- Resumen fiscal para gestor (datos modelo 303)
- Exportación CSV para inspección AEAT

**API Endpoints:**
```
GET    /api/reportes/ticket/{id}
GET    /api/reportes/cierre-caja/{fecha}
GET    /api/reportes/ventas
GET    /api/reportes/costes
GET    /api/reportes/nomina/{id}
GET    /api/reportes/fiscal-trimestre
```

---

### MÓDULO 13 — DELIVERY E INTEGRACIONES ⏳ PENDIENTE FASE 5

**Funcionalidades:**
- Glovo, Uber Eats, Just Eat: webhooks → pedidos entran al TPV automáticamente
- Carta propia de delivery configurable
- Control de comisiones por plataforma
- Comparativa rentabilidad: mesa vs delivery

**API Endpoints:**
```
POST   /api/delivery/webhook/{plataforma}
GET    /api/delivery/pedidos
GET    /api/delivery/estadisticas
GET    /api/delivery/comisiones
```

---

### MÓDULO 14 — ENTERPRISE ⏳ PENDIENTE FASE 5

- XML SOAP Verifactu + certificado digital + envío real AEAT
- Multi-idioma react-i18next (ES/EN/FR/DE)
- Declaraciones fiscales modelo 303 y 130
- Integración datáfono Ingenico/Verifone
- WhatsApp Business Twilio
- Integración contabilidad Holded/Contasol
- WebSocket (requiere Render Starter $7/mes)
- Carta digital QR pública multi-idioma
- Reservas online widget embebible
- Multi-outlet (varias tiendas en el mismo tenant)

---

## 6. PLAN DE FASES

### FASE 1 — Core operativo ✅ COMPLETADO
Auth · Mesas · TPV · Verifactu · Carta · KDS · Dashboard · Venta Live

### FASE 2 — Control de negocio ✅ COMPLETADO
Inventario · Mermas · Recetas + Semáforo · KDS · Gestión Sala
Auditoría cursorrules — require_roles, Decimal, SQL sin f-strings

### FASE 3 — Operaciones completas ⏳ EN CURSO
TPV cards compactas · División de cuenta ·
Proveedores + IA facturas · Empleados + Nóminas · Reservas + Clientes

### FASE 4 — Analytics y PDF ⏳ PENDIENTE
Dashboard avanzado · Rentabilidad mesas · Ingeniería menú BCG ·
Previsión demanda IA · ReportLab PDFs · FIFO inventario · APPCC

### FASE 5 — Enterprise ⏳ PENDIENTE
Delivery · Multi-idioma · Fiscal · Datáfono · WhatsApp · WebSocket

---

## 7. PRECIOS SUGERIDOS

| Plan | Precio/mes | Incluye |
|------|-----------|---------|
| **Básico** | 79€ | TPV + Mesas + Verifactu + Carta + KDS |
| **Profesional** | 149€ | Básico + Inventario + Recetas + Reservas + Proveedores |
| **Premium** | 249€ | Profesional + RRHH + Nóminas + Analytics + IA |
| **Enterprise** | 399€ | Todo + Delivery + Multi-outlet + API + Soporte prioritario |

---

## 8. NOTAS TÉCNICAS DE IMPLEMENTACIÓN

### Backend — patrones obligatorios
```python
# Conexión
async with get_db() as conn:
    rows = await conn.fetch("SELECT ...", params)

# SQL dinámico (valores SIEMPRE por placeholder)
where_clauses = ["tenant_id = $1"]
args = [tenant_id]
if buscar:
    args.append(f"%{buscar}%")
    where_clauses.append("nombre ILIKE $" + str(len(args)))
sql = "SELECT * FROM tabla WHERE " + " AND ".join(where_clauses)

# Dinero
from decimal import Decimal, ROUND_HALF_UP
precio = Decimal(str(valor)).quantize(Decimal("0.01"), ROUND_HALF_UP)
# float() solo en el dict de respuesta JSON final

# Error handling
try:
    async with get_db() as conn: ...
except HTTPException: raise
except Exception as e:
    logger.error("Error en endpoint: %s", e)
    raise HTTPException(500, "Error interno")
```

### Frontend — patrones obligatorios
```jsx
// Cards de productos — OBLIGATORIO en listas operativas
"grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2"
// Card: rounded-xl p-3, nombre line-clamp-2, precio text-base font-bold text-amber-500
// Botón: h-9 (excepción al h-12 porque la card es clickable)
// Área de productos: overflow-y-auto flex-1
// Tabs de categoría: sticky top-0

// División de cuenta
// ticket_pagos: múltiples pagos hasta suma >= total
// Verifactu se genera al completar el cobro total

// Dark mode — TODAS las clases con dark:
// Modales — SIEMPRE bg-black/60 en overlay
// Sidebar — SIEMPRE expandido, NUNCA colapsado a solo iconos
```

---

*PRD v3.0 — HorecaSO — Arin Romero — 20/03/2026*
*Próxima revisión: al completar Fase 3*