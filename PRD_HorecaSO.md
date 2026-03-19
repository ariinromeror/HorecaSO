# PRD — HorecaSO v2.0
## Product Requirements Document — Edición Premium

**Proyecto:** HorecaSO  
**Autor:** Arin Romero  
**Versión:** 2.0 — Marzo 2026  
**Stack:** FastAPI · React 19 · PostgreSQL · Supabase · Render · Vercel  
**Target:** Restaurantes medianos — 5 a 50 empleados — mercado español  
**Posicionamiento:** ERP de hostelería premium — por encima de Revo, Agora e ICG

---

## 1. VISIÓN DEL PRODUCTO

### El problema real

Un restaurante mediano en España opera con información fragmentada. El dueño cierra el día sin saber si ganó o perdió dinero. Sabe cuánto vendió pero no cuánto le costó vender. Sus platos tienen precios basados en intuición, no en coste real. El inventario lo lleva en papel o en Excel. La facturación fiscal le consume tiempo que no tiene. No sabe qué camarero rinde más, qué mesa genera más dinero por hora, ni qué platos debería retirar de la carta. Y desde 2025, Verifactu es obligatorio.

**El dueño de un restaurante mediano necesita una sola pantalla que le diga: vendí esto, me costó esto, me quedé con esto, esto es lo que tengo que hacer mañana.**

### La solución

HorecaSO es el ERP web más completo del mercado de hostelería español. Conecta las ventas del día con el coste real de producirlas, el inventario que se consumió, el rendimiento del personal, el cumplimiento fiscal automático, y la experiencia del cliente. Todo en un sistema, sin Excel, sin papel, sin sorpresas.

### Diferenciadores clave vs competencia

| Feature | HorecaSO | Revo | Agora | ICG |
|---------|----------|------|-------|-----|
| Verifactu nativo | ✅ | Parcial | ✅ | ✅ |
| Semáforo rentabilidad | ✅ | ❌ | ❌ | ❌ |
| IA escaneo facturas | ✅ | ❌ | ❌ | ❌ |
| Previsión demanda IA | ✅ | ❌ | ❌ | ❌ |
| Rentabilidad por mesa/hora | ✅ | ❌ | ❌ | ❌ |
| Control horario legal | ✅ | ❌ | Parcial | ✅ |
| Carta digital QR | ✅ | ✅ | ✅ | ❌ |
| KDS cocina | ✅ | ✅ | ✅ | ✅ |
| Alérgenos por ley | ✅ | ✅ | ✅ | ✅ |
| Multi-tenant SaaS | ✅ | ❌ | ❌ | ❌ |

---

## 2. USUARIOS Y ROLES

| Rol | Qué hace en el sistema |
|-----|----------------------|
| **Director / Dueño** | Dashboard financiero completo, configuración, reportes, Verifactu, nóminas |
| **Jefe de Sala** | Gestión de mesas, reservas, asignación de pedidos, control de camareros |
| **Camarero** | TPV — tomar pedidos, cerrar mesas, cobrar, división de cuenta |
| **Cocinero / Jefe de Cocina** | KDS — pedidos en tiempo real, gestión de recetas, registro de mermas |
| **Encargado de Almacén** | Entrada de stock, inventario, pedidos a proveedores, APPCC |
| **RRHH / Encargado** | Personal, turnos, control horario, vacaciones |
| **Administrador** | Configuración del sistema, usuarios, permisos |

---

## 3. ARQUITECTURA TÉCNICA

### Stack

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI 0.115 · Python 3.12 |
| Base de datos | PostgreSQL 15 vía Supabase |
| Driver DB | asyncpg — raw async SQL, sin ORM |
| Frontend | React 19 · Vite 7 · Tailwind CSS 4 |
| Auth | JWT · bcrypt · RBAC |
| IA | Groq API — escaneo facturas + previsión demanda |
| PDF / Fiscal | ReportLab — tickets, facturas, QR Verifactu, nóminas |
| Criptografía | hashlib Python — SHA-256 para hash chaining Verifactu |
| Email/SMS | SendGrid — confirmaciones de reserva, alertas |
| Deploy | Render (backend) · Vercel (frontend) · Supabase (DB) |

---

## 4. SCHEMA DE BASE DE DATOS COMPLETO

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
    plan VARCHAR(20) DEFAULT 'basico', -- basico, profesional, premium
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
    rol VARCHAR(50) NOT NULL,
    pin VARCHAR(6),                     -- PIN rápido para TPV táctil
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESAS Y SALA
-- ============================================================

CREATE TABLE mesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    numero INTEGER NOT NULL,
    capacidad INTEGER DEFAULT 4,
    estado VARCHAR(20) DEFAULT 'libre', -- libre, ocupada, reservada, bloqueada
    posicion_x NUMERIC,
    posicion_y NUMERIC,
    zona VARCHAR(100),                  -- interior, terraza, barra, privado, jardín
    forma VARCHAR(20) DEFAULT 'cuadrada' -- cuadrada, redonda, rectangular
);

-- ============================================================
-- CARTA Y MENÚ
-- ============================================================

CREATE TABLE categorias_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR(100) NOT NULL,
    icono VARCHAR(50),                  -- emoji o nombre de icono
    color VARCHAR(7),                   -- hex color para TPV
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE alergenos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,        -- gluten, lactosa, huevo, etc.
    icono VARCHAR(10)                   -- emoji del alérgeno
);

CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    categoria_id UUID REFERENCES categorias_menu(id),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL,
    precio_coste NUMERIC(10,2),         -- calculado desde receta
    iva_porcentaje NUMERIC(5,2) DEFAULT 10.00, -- 10% hostelería, 21% alcohol
    tiene_receta BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    imagen_url TEXT,
    es_bebida BOOLEAN DEFAULT FALSE,
    es_menu BOOLEAN DEFAULT FALSE,      -- plato de menú del día
    disponible_delivery BOOLEAN DEFAULT TRUE,
    tiempo_preparacion INTEGER DEFAULT 0 -- minutos estimados
);

CREATE TABLE producto_alergenos (
    producto_id UUID REFERENCES productos(id),
    alergeno_id INTEGER REFERENCES alergenos(id),
    PRIMARY KEY (producto_id, alergeno_id)
);

-- Menú del día
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
    tipo VARCHAR(20) NOT NULL           -- primero, segundo, postre, bebida
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
    metodo_pago VARCHAR(20),
    num_comensales INTEGER DEFAULT 1,
    notas TEXT,
    es_delivery BOOLEAN DEFAULT FALSE,
    plataforma_delivery VARCHAR(50),    -- glovo, ubereats, justeat
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cobrado_at TIMESTAMPTZ,
    tiempo_ocupacion INTEGER            -- minutos desde apertura a cobro
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

-- Cierre de caja diario
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
-- VERIFACTU
-- ============================================================

CREATE TABLE verifactu_registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    ticket_id UUID REFERENCES tickets(id),
    numero_serie VARCHAR(50) NOT NULL,
    fecha_expedicion DATE NOT NULL,
    fecha_hora_generacion TIMESTAMPTZ,
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
-- INVENTARIO
-- ============================================================

CREATE TABLE articulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    unidad_medida VARCHAR(20) NOT NULL, -- kg, l, ud, g, ml
    stock_actual NUMERIC(15,4) DEFAULT 0,
    stock_minimo NUMERIC(15,4) DEFAULT 0,
    stock_maximo NUMERIC(15,4),
    coste_unitario NUMERIC(10,4) DEFAULT 0,
    categoria_almacen VARCHAR(100),     -- carnes, pescados, bebidas, lácteos
    proveedor_habitual_id UUID,
    temperatura_almacen VARCHAR(20),    -- ambiente, refrigerado, congelado
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Movimientos de stock — trazabilidad completa
CREATE TABLE movimientos_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    articulo_id UUID REFERENCES articulos(id),
    outlet_id UUID REFERENCES outlets(id),
    tipo VARCHAR(20) NOT NULL,          -- entrada, salida, ajuste, merma, traslado
    cantidad NUMERIC(15,4) NOT NULL,
    coste_unitario NUMERIC(10,4),
    motivo TEXT,
    usuario_id UUID REFERENCES usuarios(id),
    ticket_id UUID REFERENCES tickets(id),
    factura_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- APPCC — registro de temperaturas obligatorio por sanidad
CREATE TABLE registros_appcc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    usuario_id UUID REFERENCES usuarios(id),
    tipo_control VARCHAR(50) NOT NULL,  -- nevera, congelador, freidora, etc.
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
    rendimiento NUMERIC(10,4) DEFAULT 1,
    tiempo_preparacion INTEGER,         -- minutos
    instrucciones TEXT,
    foto_url TEXT,
    coste_calculado NUMERIC(10,4),      -- actualizado automáticamente
    margen_porcentaje NUMERIC(5,2),     -- calculado: (precio-coste)/precio*100
    semaforo VARCHAR(10),               -- verde, amarillo, rojo
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

-- Mermas registradas diariamente
CREATE TABLE mermas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    articulo_id UUID REFERENCES articulos(id),
    cantidad NUMERIC(15,4) NOT NULL,
    motivo VARCHAR(50) NOT NULL,        -- caducidad, rotura, error_cocina, sobrante
    coste_imputado NUMERIC(10,4),
    usuario_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Control real vs teórico por periodo
CREATE TABLE control_real_teorico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    articulo_id UUID REFERENCES articulos(id),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    consumo_teorico NUMERIC(15,4),      -- según ventas y recetas
    consumo_real NUMERIC(15,4),         -- según movimientos de stock
    diferencia NUMERIC(15,4),           -- real - teorico (positivo = pérdida)
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
    condiciones_pago TEXT,
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
    procesada_ia BOOLEAN DEFAULT FALSE,
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
    usuario_id UUID REFERENCES usuarios(id),
    dni VARCHAR(20),
    nss VARCHAR(20),                    -- Número Seguridad Social
    cargo VARCHAR(100),
    categoria_profesional VARCHAR(100),
    contrato VARCHAR(50),               -- indefinido, temporal, parcial
    jornada_horas NUMERIC(5,2) DEFAULT 40, -- horas semanales contrato
    salario_bruto_mensual NUMERIC(10,2),
    irpf_porcentaje NUMERIC(5,2),
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
    hora_entrada TIME,                  -- fichaje real
    hora_salida TIME,                   -- fichaje real
    horas_trabajadas NUMERIC(5,2),
    horas_extra NUMERIC(5,2) DEFAULT 0,
    tipo VARCHAR(20) DEFAULT 'normal',  -- normal, festivo, nocturno
    incidencia VARCHAR(50),             -- ausencia, retraso, etc.
    firmado_empleado BOOLEAN DEFAULT FALSE
);

-- Cuadrante semanal
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
    puesto VARCHAR(50)                  -- sala, barra, cocina, limpieza
);

-- Vacaciones y ausencias
CREATE TABLE solicitudes_ausencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES empleados(id),
    tipo VARCHAR(30) NOT NULL,          -- vacaciones, enfermedad, personal, maternidad
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobada, rechazada
    motivo TEXT,
    aprobada_por UUID REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nóminas
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
    ss_empleado NUMERIC(10,2) NOT NULL, -- ~6.35% cotización SS
    irpf NUMERIC(10,2) NOT NULL,
    otras_deducciones NUMERIC(10,2) DEFAULT 0,
    total_deducciones NUMERIC(10,2) NOT NULL,
    liquido NUMERIC(10,2) NOT NULL,
    ss_empresa NUMERIC(10,2) NOT NULL,  -- ~29.9% cuota patronal
    coste_total_empresa NUMERIC(10,2) NOT NULL,
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
    alergenos TEXT[],                   -- array de alérgenos del cliente
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

-- Lista de espera
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
-- DELIVERY E INTEGRACIONES
-- ============================================================

CREATE TABLE pedidos_delivery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    plataforma VARCHAR(30) NOT NULL,    -- glovo, ubereats, justeat, propio
    id_externo VARCHAR(100),            -- ID en la plataforma externa
    estado VARCHAR(20) DEFAULT 'recibido',
    nombre_cliente VARCHAR(255),
    telefono VARCHAR(20),
    direccion_entrega TEXT,
    total NUMERIC(10,2) NOT NULL,
    comision_plataforma NUMERIC(10,2),
    ticket_id UUID REFERENCES tickets(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Carta digital QR
CREATE TABLE carta_digital (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    activa BOOLEAN DEFAULT TRUE,
    url_slug VARCHAR(100) UNIQUE,       -- horecaso.com/carta/restaurante-demo
    idiomas TEXT[] DEFAULT '{es}',      -- es, en, fr, de
    mostrar_precios BOOLEAN DEFAULT TRUE,
    mostrar_alergenos BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS Y KPIs
-- ============================================================

-- Rentabilidad por mesa por servicio
CREATE TABLE rentabilidad_mesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mesa_id UUID REFERENCES mesas(id),
    outlet_id UUID REFERENCES outlets(id),
    ticket_id UUID REFERENCES tickets(id),
    fecha DATE NOT NULL,
    num_comensales INTEGER,
    tiempo_ocupacion_minutos INTEGER,
    ingreso_total NUMERIC(10,2),
    ingreso_por_hora NUMERIC(10,2),     -- ingreso_total / (tiempo/60)
    ingreso_por_comensal NUMERIC(10,2)
);

-- Ingeniería de menú (Matriz BCG para platos)
CREATE TABLE ingenieria_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID REFERENCES productos(id),
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    unidades_vendidas INTEGER DEFAULT 0,
    ingreso_total NUMERIC(10,2) DEFAULT 0,
    coste_total NUMERIC(10,2) DEFAULT 0,
    margen_total NUMERIC(10,2) DEFAULT 0,
    popularidad VARCHAR(10),            -- alta, baja
    rentabilidad VARCHAR(10),           -- alta, baja
    clasificacion VARCHAR(20),          -- estrella, caballo_trabajo, puzzle, perro
    -- estrella: popular + rentable → mantener
    -- caballo: popular + poco rentable → subir precio
    -- puzzle: poco popular + rentable → promocionar
    -- perro: poco popular + poco rentable → retirar
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Previsión de demanda (generada por IA)
CREATE TABLE previsiones_demanda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    articulo_id UUID REFERENCES articulos(id),
    fecha DATE NOT NULL,
    cantidad_prevista NUMERIC(15,4),
    confianza NUMERIC(5,2),             -- % de confianza del modelo
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
    tipo VARCHAR(50) NOT NULL,          -- stock_minimo, reserva_nueva, nomina_pendiente
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT,
    leida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. MÓDULOS DEL PRODUCTO

---

### MÓDULO 1 — TPV (Terminal Punto de Venta) ✅ IMPLEMENTADO

**Flujo principal:**
```
Camarero selecciona mesa → Abre comanda → Añade productos → Envía a cocina
→ Cliente pide cuenta → Cobro → Verifactu → Mesa libre
```

**API Endpoints:**
```
POST   /api/tpv/tickets
GET    /api/tpv/tickets/{id}
POST   /api/tpv/tickets/{id}/lineas
DELETE /api/tpv/tickets/{id}/lineas/{linea_id}
POST   /api/tpv/tickets/{id}/cobrar
GET    /api/tpv/tickets/abiertos
GET    /api/tpv/carta
GET    /api/tpv/carta/productos
POST   /api/tpv/cierre-caja
GET    /api/tpv/cierre-caja/{fecha}
```

---

### MÓDULO 2 — MESAS ✅ IMPLEMENTADO

**API Endpoints:**
```
GET    /api/mesas
POST   /api/mesas
GET    /api/mesas/{id}
PATCH  /api/mesas/{id}/estado
GET    /api/mesas/{id}/rentabilidad    # tiempo ocupado, ingreso/hora
```

---

### MÓDULO 3 — VERIFACTU ✅ IMPLEMENTADO

**API Endpoints:**
```
GET    /api/verifactu/registros
GET    /api/verifactu/registros/{id}
GET    /api/verifactu/verificar-cadena
GET    /api/verifactu/exportar
POST   /api/verifactu/enviar-aeat      # Fase 3
```

---

### MÓDULO 4 — CARTA Y MENÚ

**Funcionalidades:**
- Gestión de categorías con color e icono para TPV
- Productos con precio, IVA, alérgenos, foto
- Carta digital QR — cliente escanea desde la mesa
- Menú del día configurable
- Multi-idioma: español, inglés, francés, alemán
- Semáforo de rentabilidad por plato (verde/amarillo/rojo)

**API Endpoints:**
```
GET    /api/carta                      # Carta pública (sin auth) para QR
GET    /api/tpv/carta                  # Carta para TPV interno
GET    /api/productos
POST   /api/productos
PUT    /api/productos/{id}
DELETE /api/productos/{id}
GET    /api/categorias
POST   /api/categorias
PUT    /api/categorias/{id}
GET    /api/alergenos
POST   /api/menu-dia
GET    /api/menu-dia/{fecha}
```

---

### MÓDULO 5 — KDS (Kitchen Display System)

**Pantalla de cocina en tiempo real — sin papel.**

**Funcionalidades:**
- Pantalla en cocina muestra comandas al instante
- Colores por tiempo: verde (<5min), amarillo (5-10min), rojo (>10min)
- Marcar plato como "en preparación" y "listo"
- Agrupación por mesa y por producto
- Estadísticas de tiempo medio de preparación por plato
- Alertas de pedidos retrasados

**API Endpoints:**
```
GET    /api/kds/comandas               # Pedidos pendientes en cocina
PATCH  /api/kds/lineas/{id}/estado     # preparando | listo
GET    /api/kds/estadisticas           # tiempos medios de prep
```

---

### MÓDULO 6 — RESERVAS Y CLIENTES

**Funcionalidades:**
- Calendario de reservas con vista por día, semana, mes
- Reservas online con widget embebible
- Confirmación automática por SMS/email
- Recordatorio automático 24h antes
- Lista de espera digital con SMS cuando hay mesa
- Historial de cliente — visitas, gasto, alérgenos, preferencias
- Programa de fidelización con puntos
- Detección de no-shows y cancelaciones

**API Endpoints:**
```
GET    /api/reservas
POST   /api/reservas
GET    /api/reservas/{id}
PATCH  /api/reservas/{id}/estado
GET    /api/clientes
POST   /api/clientes
GET    /api/clientes/{id}
GET    /api/clientes/{id}/historial
GET    /api/lista-espera
POST   /api/lista-espera
```

---

### MÓDULO 7 — INVENTARIO Y ALMACÉN

**Funcionalidades:**
- Maestro de artículos con temperatura de almacenamiento
- Stock en tiempo real — se descuenta automáticamente al vender
- Lotes FIFO — el stock más antiguo se consume primero
- Alertas de stock mínimo y caducidad próxima
- Movimientos completos: entradas, salidas, ajustes, mermas, traslados
- APPCC — registro digital de temperaturas de equipos
- Pedidos a proveedor automáticos cuando baja del mínimo
- Inventario físico — conteo real vs sistema

**API Endpoints:**
```
GET    /api/inventario/articulos
POST   /api/inventario/articulos
GET    /api/inventario/articulos/{id}
PUT    /api/inventario/articulos/{id}
GET    /api/inventario/stock-alertas
GET    /api/inventario/caducidades
POST   /api/inventario/movimientos
GET    /api/inventario/movimientos
POST   /api/inventario/inventario-fisico
GET    /api/appcc/registros
POST   /api/appcc/registros
```

---

### MÓDULO 8 — RECETAS Y ESCANDALLOS

**El corazón del control de costes.**

**Funcionalidades:**
- Ficha técnica por producto — ingredientes, cantidades brutas y netas
- Fórmula de merma: `Cantidad Bruta = Cantidad Neta / (1 - % Merma)`
- Coste teórico calculado automáticamente al cambiar precios de compra
- **Semáforo de rentabilidad:**
  - 🟢 Verde — margen > 65% → mantener, promocionar
  - 🟡 Amarillo — margen 40-65% → monitorizar
  - 🔴 Rojo — margen < 40% → subir precio o revisar receta
- Bebidas incluidas — no solo comida (cócteles, cafés, etc.)
- Sub-recetas — elaboraciones base (ej: sofrito, bechamel)
- Registro diario de mermas con causa
- **Control Real vs Teórico por periodo:**
  - Teórico: lo que debería haberse consumido según ventas
  - Real: lo que realmente salió del almacén
  - Diferencia = merma no registrada + posibles pérdidas

**API Endpoints:**
```
GET    /api/recetas
POST   /api/recetas
GET    /api/recetas/{id}
PUT    /api/recetas/{id}
GET    /api/recetas/{id}/coste         # Coste calculado en tiempo real
GET    /api/recetas/semaforo           # Todos los platos con color
GET    /api/recetas/real-vs-teorico    # Comparativa consumo
POST   /api/mermas
GET    /api/mermas
GET    /api/mermas/resumen-periodo
```

---

### MÓDULO 9 — PROVEEDORES Y COMPRAS

**Funcionalidades:**
- Maestro de proveedores con condiciones de pago
- Registro de facturas de compra
- **Escaneo de facturas con IA (Groq)** — foto → JSON automático
- Control de pagos pendientes y vencimientos
- Pedidos a proveedor — manual o sugerido por sistema
- Comparativa de precios entre proveedores por artículo
- Evolución de costes — historial de precio de cada artículo

**Flujo escaneo IA:**
```
Foto factura proveedor → Base64 → Groq vision
→ JSON: [{articulo, cantidad, precio_unitario}]
→ Validación humana → Confirmar
→ Actualizar stock + crear lote FIFO + registrar factura
```

**API Endpoints:**
```
GET    /api/proveedores
POST   /api/proveedores
GET    /api/proveedores/{id}
POST   /api/facturas-proveedor
GET    /api/facturas-proveedor
POST   /api/facturas-proveedor/escanear-ia  # Groq vision
GET    /api/facturas-proveedor/pendientes-pago
POST   /api/pedidos-proveedor
GET    /api/pedidos-proveedor
GET    /api/proveedores/comparativa-precios/{articulo_id}
```

---

### MÓDULO 10 — EMPLEADOS Y RRHH

**Funcionalidades:**
- Ficha de empleado con datos laborales y SS
- Control horario con firma digital — obligatorio en España desde 2019
- Cuadrante semanal visual — quién trabaja qué día
- Solicitud y aprobación de vacaciones y ausencias
- Horas extra acumuladas y compensación
- **Cálculo de nóminas automático:**
  - Salario bruto + horas extra + plus festivos + plus nocturnidad
  - Deducciones: SS empleado (~6.35%) + IRPF
  - Coste empresa: cuota patronal SS (~29.9%)
  - Generación PDF nómina

**API Endpoints:**
```
GET    /api/empleados
POST   /api/empleados
GET    /api/empleados/{id}
POST   /api/turnos/fichaje-entrada
POST   /api/turnos/fichaje-salida
GET    /api/turnos
GET    /api/turnos/horas-extra/{empleado_id}
GET    /api/cuadrantes
POST   /api/cuadrantes
GET    /api/ausencias
POST   /api/ausencias
PATCH  /api/ausencias/{id}/estado
GET    /api/nominas/{empleado_id}
POST   /api/nominas/calcular
GET    /api/nominas/{id}/pdf
```

---

### MÓDULO 11 — DASHBOARD Y ANALYTICS

**Funcionalidades:**
- KPIs del día en tiempo real: ventas, coste, margen, tickets, ticket medio
- **Rentabilidad por mesa por hora:**
  - Ingreso total / horas ocupada = €/hora
  - Qué mesa genera más dinero
  - Comparativa entre zonas (terraza vs interior)
- **Ingeniería de menú (Matriz BCG):**
  - Estrella: popular + rentable → potenciar
  - Caballo de trabajo: popular + poco rentable → subir precio
  - Puzzle: poco popular + rentable → promocionar
  - Perro: poco popular + poco rentable → retirar
- **Previsión de demanda con IA:**
  - "Este viernes necesitas X kg de merluza"
  - Basado en histórico, clima, festivos
- Coste de personal por turno vs ingresos
- Comparativa semana a semana y mes a mes
- Resumen para gestor (modelo 303, 130)

**API Endpoints:**
```
GET    /api/dashboard/director         # KPIs completos
GET    /api/dashboard/cierre-dia       # Resumen del día
GET    /api/dashboard/rentabilidad-mesas
GET    /api/dashboard/ingenieria-menu
GET    /api/dashboard/coste-personal
GET    /api/ia/prevision-demanda       # Groq IA
GET    /api/ia/sugerencias-menu        # Recomendaciones IA
```

---

### MÓDULO 12 — DELIVERY E INTEGRACIONES

**Funcionalidades:**
- Integración Glovo, Uber Eats, Just Eat — pedidos entran al TPV automáticamente
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

### MÓDULO 13 — REPORTES Y PDF

**Funcionalidades:**
- Ticket de venta con QR Verifactu
- Cierre de caja diario en PDF
- Informe de ventas por periodo
- Informe de coste de materia prima
- Nóminas en PDF
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

## 6. PLAN DE FASES

### FASE 1 — Core operativo (Semana 1-2)
Backend: Auth ✅ · Mesas ✅ · TPV ✅ · Verifactu ✅ · Carta
Frontend: Login · Mesas visual · TPV táctil · Dashboard básico
Deploy: Render + Vercel

### FASE 2 — Control de negocio (Semana 3-4)
Inventario · Recetas + Semáforo · Proveedores + IA facturas · Cierre de caja · KDS cocina · Reservas básicas

### FASE 3 — RRHH y analytics (Mes 2)
Empleados · Control horario · Nóminas · Dashboard analytics · Rentabilidad mesas · Ingeniería menú

### FASE 4 — Premium y diferenciadores (Mes 3)
Reservas online widget · Clientes + fidelización · Carta digital QR · Delivery integración · Previsión demanda IA · APPCC

### FASE 5 — Enterprise (Mes 4+)
Multi-idioma · WhatsApp automático · Datáfono integrado · Declaraciones fiscales · Certificación Verifactu AEAT

---

## 7. PRECIOS SUGERIDOS

| Plan | Precio/mes | Incluye |
|------|-----------|---------|
| **Básico** | 79€ | TPV + Mesas + Verifactu + Carta |
| **Profesional** | 149€ | Todo Básico + Inventario + Recetas + Reservas + KDS |
| **Premium** | 249€ | Todo Profesional + RRHH + Nóminas + Analytics + IA |
| **Enterprise** | 399€ | Todo + Delivery + Multi-outlet + API + Soporte prioritario |

---

## 8. NOTAS TÉCNICAS

- DATABASE_URL usa pooler Supabase: aws-1-eu-west-1.pooler.supabase.com:6543
- statement_cache_size=0 obligatorio en asyncpg (pgbouncer)
- Patrón de conexión: async with get_db() as conn
- SECRET_KEY_AUTH en .env
- bcrypt==4.0.1 requiere shim en main.py
- email-validator==2.2.0 para EmailStr de pydantic
- IVA hostelería: 10% general, 21% alcohol
- Verifactu: SHA-256 MAYÚSCULAS, campos con &, UTF-8 sin BOM
- fecha_hora_generacion guardada en verifactu_registros — crítico para verificar-cadena
- Nóminas España: SS empleado 6.35%, SS empresa 29.9%, IRPF según tabla AEAT
- Control horario obligatorio desde RDL 8/2019

---

*PRD v2.0 — HorecaSO — Arin Romero — Marzo 2026*
*Próxima revisión: al iniciar Fase 2*