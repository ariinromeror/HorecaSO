# PRD — HorecaSO
## Product Requirements Document v1.0

**Proyecto:** HorecaSO  
**Autor:** Arin Romero  
**Fecha:** Marzo 2026  
**Stack:** FastAPI · React 19 · PostgreSQL · Supabase · Render · Vercel  
**Target:** Restaurantes medianos — 5 a 15 empleados — mercado español

---

## 1. VISIÓN DEL PRODUCTO

### El problema real

Un restaurante mediano en España opera con información fragmentada. El dueño cierra el día sin saber si ganó o perdió dinero. Sabe cuánto vendió pero no cuánto le costó vender. Sus platos tienen precios basados en intuición, no en coste real. El inventario lo lleva en papel o en Excel. La facturación fiscal le consume tiempo que no tiene. Y desde 2025, Verifactu es obligatorio — y la mayoría de software barato no lo implementa correctamente.

**El dueño de un restaurante mediano necesita una sola pantalla que le diga: vendí esto, me costó esto, me quedé con esto.**

### La solución

HorecaSO es un ERP web para hostelería que conecta las ventas del día con el coste real de producirlas, el inventario que se consumió, y el cumplimiento fiscal automático. Todo en un sistema, sin Excel, sin papel, sin sorpresas al final del mes.

### Diferenciadores clave

1. **Verifactu nativo** — no es un add-on, es parte del core desde el primer ticket
2. **Semáforo de rentabilidad** — cada plato tiene un color según su margen real
3. **Real vs Teórico** — lo que debería haberse consumido vs lo que realmente salió del almacén
4. **Escaneo de facturas con IA** — fotografía la factura del proveedor, el sistema actualiza el stock automáticamente

---

## 2. USUARIOS Y ROLES

### Usuario primario

**Dueño / Gerente** — toma decisiones, quiere visibilidad financiera, no es técnico, accede desde móvil y desktop.

### Usuarios operativos

| Rol | Qué hace en el sistema |
|-----|----------------------|
| **Dueño / Director** | Dashboard financiero, configuración, reportes, Verifactu, proveedores |
| **Jefe de Sala** | Gestión de mesas, reservas, asignación de pedidos |
| **Camarero** | TPV — tomar pedidos, cerrar mesas, cobrar |
| **Cocinero / Jefe de Cocina** | Consulta de pedidos, gestión de recetas, registro de mermas |
| **Encargado de Almacén** | Entrada de stock, inventario, pedidos a proveedores |
| **Administrador** | Configuración del sistema, usuarios, permisos |

### Roles técnicos en el sistema

```
director → acceso total
jefe_sala → mesas, reservas, pedidos
camarero → tpv, cobros
cocina → recetas, mermas, pedidos entrantes
almacen → inventario, proveedores, compras
admin → configuración, usuarios
```

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
| IA | Groq API — escaneo y extracción de facturas |
| PDF / Fiscal | ReportLab — tickets, facturas, QR Verifactu |
| Criptografía | hashlib Python — SHA-256 para hash chaining |
| Deploy | Render (backend) · Vercel (frontend) · Supabase (DB) |

### Estructura del proyecto

```
horecaso/
├── backend/
│   ├── auth/
│   │   ├── dependencies.py       # JWT, RBAC require_roles()
│   │   └── jwt_handler.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── tpv.py                # Ventas, tickets, cobros
│   │   ├── mesas.py              # Plano, estados, asignaciones
│   │   ├── reservas.py           # Calendario de reservas
│   │   ├── inventario.py         # Stock, movimientos, alertas
│   │   ├── recetas.py            # Escandallos, ingredientes, mermas
│   │   ├── proveedores.py        # Compras, facturas, entrada de stock
│   │   ├── empleados.py          # Personal, turnos, horas
│   │   ├── verifactu.py          # Hash chaining, XML AEAT, QR
│   │   ├── reportes.py           # PDF, cierres, financiero
│   │   └── dashboard.py          # KPIs agregados por rol
│   ├── services/
│   │   ├── verifactu_engine.py   # SHA-256, encadenamiento, XML SOAP
│   │   ├── food_cost.py          # Cálculo coste teórico vs real
│   │   ├── inventario_fifo.py    # Lógica FIFO de lotes
│   │   ├── pdf_generator.py      # Tickets, facturas, QR
│   │   └── ia_facturas.py        # Extracción IA de facturas proveedor
│   ├── config.py
│   ├── database.py               # asyncpg pool, pgbouncer fix
│   └── main.py
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── shared/           # StatCard, EmptyState, Loader, Toast
│       │   ├── tpv/              # Teclado numérico, carrito, cobro
│       │   └── mesas/            # Plano visual interactivo
│       ├── constants/            # uiTokens, colores semáforo
│       ├── context/              # AuthContext
│       ├── pages/
│       │   ├── director/         # Dashboard, reportes, config
│       │   ├── sala/             # Mesas, reservas
│       │   ├── tpv/              # Terminal de venta
│       │   ├── cocina/           # Pedidos, recetas, mermas
│       │   ├── almacen/          # Inventario, proveedores
│       │   └── empleados/        # Personal, turnos
│       └── services/             # api.js, domainServices
│
└── docs/
    ├── PRD.md
    └── DEPLOY.md
```

### Esquema de base de datos principal

```sql
-- Multi-tenant base
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    nif VARCHAR(20) NOT NULL,           -- Para Verifactu
    direccion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locales / establecimientos
CREATE TABLE outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR(255) NOT NULL,
    num_mesas INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios del sistema
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    outlet_id UUID REFERENCES outlets(id),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol VARCHAR(50) NOT NULL,           -- director, camarero, cocina, etc.
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mesas
CREATE TABLE mesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    numero INTEGER NOT NULL,
    capacidad INTEGER DEFAULT 4,
    estado VARCHAR(20) DEFAULT 'libre', -- libre, ocupada, reservada
    posicion_x NUMERIC,                 -- Para plano visual
    posicion_y NUMERIC,
    zona VARCHAR(100)                   -- terraza, interior, barra
);

-- Carta / Menú
CREATE TABLE categorias_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR(100) NOT NULL,
    orden INTEGER DEFAULT 0
);

CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    categoria_id UUID REFERENCES categorias_menu(id),
    nombre VARCHAR(255) NOT NULL,
    precio NUMERIC(10,2) NOT NULL,
    tiene_receta BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    imagen_url TEXT
);

-- Tickets / Comandas
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    mesa_id UUID REFERENCES mesas(id),
    camarero_id UUID REFERENCES usuarios(id),
    estado VARCHAR(20) DEFAULT 'abierto', -- abierto, cobrado, anulado
    total NUMERIC(10,2) DEFAULT 0,
    metodo_pago VARCHAR(20),              -- efectivo, tarjeta, bizum
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cobrado_at TIMESTAMPTZ
);

CREATE TABLE ticket_lineas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id),
    producto_id UUID REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    nota TEXT
);

-- Verifactu — registros fiscales inmutables
CREATE TABLE verifactu_registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    ticket_id UUID REFERENCES tickets(id),
    numero_serie VARCHAR(50) NOT NULL,   -- SERIE-2025-000001
    fecha_expedicion DATE NOT NULL,
    tipo_factura VARCHAR(5) DEFAULT 'F1',
    base_imponible NUMERIC(10,2) NOT NULL,
    cuota_iva NUMERIC(10,2) NOT NULL,
    importe_total NUMERIC(10,2) NOT NULL,
    huella_anterior TEXT,               -- Hash del registro N-1
    huella_actual TEXT NOT NULL,        -- SHA-256 de este registro
    xml_generado TEXT,                  -- XML SOAP completo
    enviado_aeat BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventario — artículos maestros
CREATE TABLE articulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    unidad_medida VARCHAR(20) NOT NULL,  -- kg, l, ud, g
    stock_actual NUMERIC(15,4) DEFAULT 0,
    stock_minimo NUMERIC(15,4) DEFAULT 0,
    coste_unitario NUMERIC(10,4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lotes FIFO
CREATE TABLE lotes_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    articulo_id UUID REFERENCES articulos(id),
    outlet_id UUID REFERENCES outlets(id),
    cantidad NUMERIC(15,4) NOT NULL,
    coste_unitario NUMERIC(10,4) NOT NULL,
    fecha_caducidad DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recetas / Escandallos
CREATE TABLE recetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID REFERENCES productos(id),
    rendimiento NUMERIC(10,4) DEFAULT 1,  -- Porciones que produce
    instrucciones TEXT
);

CREATE TABLE receta_ingredientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id UUID REFERENCES recetas(id),
    articulo_id UUID REFERENCES articulos(id),
    cantidad_neta NUMERIC(15,4) NOT NULL,  -- Cantidad servida
    porcentaje_merma NUMERIC(5,2) DEFAULT 0, -- % de pérdida
    -- cantidad_bruta = cantidad_neta / (1 - porcentaje_merma/100)
    unidad VARCHAR(20) NOT NULL
);

-- Proveedores y compras
CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    nombre VARCHAR(255) NOT NULL,
    nif VARCHAR(20),
    email VARCHAR(255),
    telefono VARCHAR(20)
);

CREATE TABLE facturas_proveedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    proveedor_id UUID REFERENCES proveedores(id),
    numero_factura VARCHAR(100),
    fecha DATE NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    procesada_ia BOOLEAN DEFAULT FALSE,  -- Si fue escaneada con IA
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

-- Empleados y turnos
CREATE TABLE empleados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    usuario_id UUID REFERENCES usuarios(id),
    dni VARCHAR(20),
    cargo VARCHAR(100),
    salario_mensual NUMERIC(10,2),
    fecha_inicio DATE,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID REFERENCES empleados(id),
    outlet_id UUID REFERENCES outlets(id),
    fecha DATE NOT NULL,
    hora_entrada TIME,
    hora_salida TIME,
    horas_trabajadas NUMERIC(5,2)
);

-- Reservas
CREATE TABLE reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id),
    mesa_id UUID REFERENCES mesas(id),
    nombre_cliente VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    num_personas INTEGER NOT NULL,
    estado VARCHAR(20) DEFAULT 'confirmada', -- confirmada, cancelada, sentada
    notas TEXT
);
```

---

## 4. MÓDULOS DEL PRODUCTO

---

### MÓDULO 1 — TPV (Terminal Punto de Venta)

**El corazón operativo. Sin esto no hay nada.**

#### Funcionalidades

- Pantalla de venta táctil — optimizada para tablet y móvil
- Selección de mesa → apertura de comanda
- Carta organizada por categorías con búsqueda
- Añadir, modificar, eliminar líneas de pedido
- Notas por línea (sin gluten, sin sal, etc.)
- División de cuenta — pagar por personas o por productos
- Métodos de pago: efectivo, tarjeta, Bizum, invitación
- Cierre de ticket → generación automática de registro Verifactu
- Impresión de ticket con QR Verifactu
- Cierre de caja al final del día con resumen

#### Flujo principal

```
Camarero selecciona mesa
→ Abre comanda nueva
→ Añade productos de la carta
→ Envía a cocina (opcional — pantalla de cocina)
→ Cliente pide la cuenta
→ Sistema calcula total + IVA
→ Cobro (efectivo / tarjeta / Bizum)
→ Genera registro Verifactu con hash SHA-256
→ Imprime ticket con QR
→ Mesa vuelve a estado libre
```

#### API Endpoints

```
POST   /api/tpv/tickets              # Abrir ticket
GET    /api/tpv/tickets/{id}         # Ver ticket
POST   /api/tpv/tickets/{id}/lineas  # Añadir línea
DELETE /api/tpv/tickets/{id}/lineas/{linea_id}
POST   /api/tpv/tickets/{id}/cobrar  # Cobrar → dispara Verifactu
GET    /api/tpv/cierre-caja          # Resumen del día
```

---

### MÓDULO 2 — MESAS

**Visión en tiempo real de la sala.**

#### Funcionalidades

- Plano visual interactivo del local — drag & drop para configurar
- Zonas: interior, terraza, barra, privado
- Estado por colores: libre (verde), ocupada (rojo), reservada (amarillo)
- Ver qué tiene pedida cada mesa sin abrir el ticket
- Tiempo que lleva ocupada cada mesa
- Combinar mesas para grupos grandes
- Transferir mesa a otro camarero

#### Estados de mesa

```
libre → ocupada (al abrir ticket)
libre → reservada (al confirmar reserva)
reservada → ocupada (al sentar al cliente)
ocupada → libre (al cobrar y cerrar ticket)
```

---

### MÓDULO 3 — VERIFACTU

**El diferenciador legal del producto.**

#### Contexto

Desde julio 2025 todo software de facturación en España debe implementar Verifactu según la Orden HAC/1177/2024. Cada ticket genera un registro fiscal encadenado criptográficamente con el anterior. La AEAT puede verificar en tiempo real que ningún registro ha sido alterado o eliminado.

#### Funcionalidades

- Generación automática de hash SHA-256 al cobrar cada ticket
- Encadenamiento — cada registro incluye la huella del anterior
- Numeración de serie automática y correlativa
- Generación de XML SOAP según esquema XSD oficial de la AEAT
- QR en cada ticket impreso con URL de cotejo AEAT
- Registro de anulaciones y rectificaciones sin borrar datos
- Log de envíos a AEAT con estado (enviado, pendiente, error)
- Endpoint de consulta para inspecciones

#### Algoritmo SHA-256 — campos en orden exacto

```python
# services/verifactu_engine.py

import hashlib
from datetime import datetime

def generar_huella(registro: dict, huella_anterior: str) -> str:
    """
    Genera SHA-256 según Orden HAC/1177/2024.
    Concatenación obligatoria en este orden exacto.
    """
    campos = [
        registro["nif_emisor"],           # 1. NIF del emisor
        registro["numero_serie"],          # 2. Número y serie
        registro["fecha_expedicion"],      # 3. Fecha expedición (YYYY-MM-DD)
        registro["tipo_factura"],          # 4. Tipo (F1, F2, R1...)
        str(registro["cuota_iva"]),        # 5. Cuota total IVA
        str(registro["importe_total"]),    # 6. Importe total
        huella_anterior or "",             # 7. Huella registro N-1
        registro["fecha_hora_generacion"], # 8. Timestamp generación
    ]
    
    cadena = "&".join(campos)
    # CRÍTICO: UTF-8 sin BOM antes del hash
    return hashlib.sha256(cadena.encode("utf-8")).hexdigest().upper()
```

#### URL QR de cotejo

```
https://www.aeat.es/wlpl/TIKE-CONT/ValidarQR?
  nif=B12345678
  &numserie=SERIE-2025-000001
  &fecha=2025-07-15
  &importe=121.00
```

#### API Endpoints

```
GET    /api/verifactu/registros          # Listado de registros fiscales
GET    /api/verifactu/registros/{id}     # Detalle con XML
POST   /api/verifactu/anular/{id}        # Anulación (genera nuevo registro)
GET    /api/verifactu/exportar           # Export CSV para inspección
POST   /api/verifactu/enviar-aeat        # Envío batch a AEAT
GET    /api/verifactu/verificar-cadena   # Auditoría de integridad del chain
```

---

### MÓDULO 4 — INVENTARIO

**Saber en todo momento qué hay y qué vale.**

#### Funcionalidades

- Maestro de artículos con unidad de medida (kg, l, ud, g)
- Stock actual en tiempo real por outlet
- Movimientos de stock — entradas, salidas, ajustes manuales
- Lotes FIFO — el stock más antiguo se consume primero
- Alertas de stock mínimo — notificación cuando baja del umbral
- Alertas de caducidad — productos próximos a vencer
- Inventario físico — comparativa sistema vs conteo real
- Historial completo de movimientos con trazabilidad

#### Lógica FIFO

```python
# services/inventario_fifo.py

async def descontar_stock_fifo(articulo_id, cantidad_necesaria, outlet_id, conn):
    """
    Descuenta stock consumiendo los lotes más antiguos primero.
    Usado al vender un producto que tiene receta.
    """
    lotes = await conn.fetch("""
        SELECT id, cantidad, coste_unitario 
        FROM lotes_inventario 
        WHERE articulo_id = $1 AND outlet_id = $2 AND cantidad > 0
        ORDER BY created_at ASC
    """, articulo_id, outlet_id)
    
    restante = cantidad_necesaria
    coste_total = Decimal("0")
    
    for lote in lotes:
        if restante <= 0:
            break
        consumir = min(lote["cantidad"], restante)
        coste_total += consumir * lote["coste_unitario"]
        restante -= consumir
        # Actualizar lote...
    
    return coste_total
```

---

### MÓDULO 5 — RECETAS Y ESCANDALLOS

**Saber exactamente cuánto cuesta cada plato.**

#### Funcionalidades

- Ficha técnica por producto — ingredientes, cantidades, mermas
- Cálculo automático de coste teórico del plato
- Fórmula de merma aplicada por ingrediente:
  `Peso Bruto = Peso Neto / (1 - % Merma)`
- Margen de contribución por plato — precio venta vs coste real
- **Semáforo de rentabilidad:**
  - 🟢 Verde — margen > 65%
  - 🟡 Amarillo — margen 40-65%
  - 🔴 Rojo — margen < 40%
- Recetas con sub-recetas (ingrediente que es a su vez una elaboración)
- Control Real vs Teórico — lo consumido teóricamente según ventas vs lo que realmente bajó del almacén. La diferencia = merma real + posibles pérdidas

#### API Endpoints

```
GET    /api/recetas                      # Listado con semáforo
POST   /api/recetas                      # Crear escandallo
PUT    /api/recetas/{id}                 # Actualizar
GET    /api/recetas/{id}/coste           # Coste calculado en tiempo real
GET    /api/recetas/real-vs-teorico      # Comparativa consumo
```

---

### MÓDULO 6 — PROVEEDORES Y COMPRAS

**Controlar todo lo que entra y cuánto costó.**

#### Funcionalidades

- Maestro de proveedores con NIF y contacto
- Registro de facturas de compra
- **Escaneo de facturas con IA** — foto → extracción automática de líneas → entrada de stock
- Entrada de mercancía — actualiza stock y crea lote FIFO con coste real
- Comparativa precios — evolución del coste de cada artículo por proveedor
- Gastos por proveedor en el período

#### Flujo escaneo IA

```
Encargado fotografía factura del proveedor
→ Frontend envía imagen en base64
→ Backend llama a Groq con prompt de extracción
→ IA devuelve JSON: [{articulo, cantidad, precio_unitario}]
→ Sistema muestra resultado para validación
→ Usuario confirma o corrige
→ Se registra factura y se actualiza stock
```

---

### MÓDULO 7 — DASHBOARD FINANCIERO

**Una sola pantalla que dice si el negocio va bien.**

#### KPIs principales

| KPI | Descripción |
|-----|-------------|
| **Ventas del día** | Total cobrado hoy |
| **Coste del día** | Coste teórico de lo vendido |
| **Margen bruto del día** | Ventas - Coste en € y % |
| **Food cost %** | Coste ingredientes / Ventas |
| **Ticket medio** | Venta media por mesa |
| **Mesas atendidas** | Número de servicios |
| **Plato más vendido** | Top 5 del día |
| **Plato más rentable** | Mejor margen del día |
| **Stock en alerta** | Artículos bajo mínimo |
| **Gastos del mes** | Proveedores + nóminas acumulado |

#### Vistas temporales

- Hoy / Esta semana / Este mes / Rango personalizado

#### Vista móvil del dueño

Una pantalla simplificada con los 4 números que importan:
- Ventas hoy
- Coste hoy
- Margen hoy
- Alertas activas

---

### MÓDULO 8 — RESERVAS

**Gestión del salón antes de que lleguen los clientes.**

#### Funcionalidades

- Calendario visual de reservas por día
- Creación de reserva — nombre, teléfono, personas, mesa, hora, notas
- Estados — confirmada, cancelada, llegó, no show
- Vista de ocupación por franjas horarias
- Bloqueo de mesas para eventos
- Lista de espera

---

### MÓDULO 9 — EMPLEADOS Y TURNOS

**Control del equipo y sus costes.**

#### Funcionalidades

- Ficha de empleado — datos personales, cargo, salario, fecha inicio
- Planificación de turnos semanal — quién trabaja cada día
- Fichaje — registro de entrada y salida
- Cálculo de horas trabajadas vs contratadas
- Coste de personal por día / semana / mes
- Visualización del coste de personal como % de ventas

---

## 5. FASES DE DESARROLLO

### Fase 1 — Core operativo (MVP real)
**Objetivo: Un restaurante puede usarlo para operar el día a día.**

- [ ] Autenticación JWT + RBAC (6 roles)
- [ ] Gestión de mesas — plano visual, estados
- [ ] TPV completo — comanda, cobro, cierre de caja
- [ ] Carta — categorías, productos, precios
- [ ] Verifactu — hash chaining, QR, registro fiscal
- [ ] Dashboard básico del director

**Criterio de éxito:** Un camarero puede abrir una mesa, tomar un pedido, cobrar y generar el registro Verifactu correcto.

---

### Fase 2 — Control de costes
**Objetivo: El dueño sabe cuánto le cuesta cada venta.**

- [ ] Maestro de artículos e inventario
- [ ] Lotes FIFO con descuento automático al vender
- [ ] Recetas y escandallos con fórmula de merma
- [ ] Semáforo de rentabilidad por plato
- [ ] Alertas de stock mínimo

**Criterio de éxito:** Al vender un plato, el sistema descuenta automáticamente los ingredientes del stock y calcula el margen.

---

### Fase 3 — Proveedores e IA
**Objetivo: Las entradas de mercancía son automáticas.**

- [ ] Gestión de proveedores
- [ ] Registro manual de facturas de compra
- [ ] Escaneo de facturas con IA (Groq)
- [ ] Comparativa Real vs Teórico
- [ ] Reporte de gastos por proveedor

**Criterio de éxito:** El encargado fotografía una factura y el stock se actualiza sin escribir nada.

---

### Fase 4 — Dashboard financiero completo
**Objetivo: El dueño tiene visibilidad total del negocio.**

- [ ] Dashboard con todos los KPIs
- [ ] Vista móvil simplificada
- [ ] Cierre mensual — P&L básico
- [ ] Exportación de reportes PDF
- [ ] Comparativa períodos (este mes vs mes anterior)

---

### Fase 5 — Reservas y RRHH
**Objetivo: Gestión completa del establecimiento.**

- [ ] Calendario de reservas
- [ ] Planificación de turnos
- [ ] Fichaje de empleados
- [ ] Coste de personal como % de ventas

---

### Fase 6 — SaaS y escala
**Objetivo: Múltiples restaurantes en el mismo sistema.**

- [ ] Multi-tenant con RLS en PostgreSQL
- [ ] Panel de administración del sistema
- [ ] Onboarding de nuevos tenants
- [ ] Facturación de suscripciones
- [ ] Gestión de múltiples outlets por tenant

---

## 6. FUERA DEL MVP

Lo siguiente está identificado y documentado pero no entra en las primeras fases:

- Integración con TPV físico / hardware (impresoras fiscales)
- App móvil nativa (iOS / Android)
- Integración con plataformas de delivery (Glovo, Uber Eats)
- Predicción de demanda con IA para compras automáticas
- RevPash analytics (Revenue Per Available Seat Hour)
- Módulo de fidelización de clientes
- Integración con software de contabilidad (A3, Sage)
- Facturación B2B (Facturae 3.2.2)

---

## 7. LO QUE HACE A HORECASO TÉCNICAMENTE IMPRESIONANTE

Para portfolio, este proyecto demuestra capacidades que InfoCampus no tiene:

| Capacidad | Descripción |
|-----------|-------------|
| **Criptografía aplicada** | SHA-256 hash chaining para cumplimiento fiscal real |
| **Integración con organismo público** | XML SOAP a AEAT según esquema XSD oficial |
| **IA aplicada a proceso real** | Extracción de datos de facturas — no es un chatbot |
| **Lógica FIFO** | Gestión de lotes de inventario con valoración por coste real |
| **Regulación legal** | Implementación de normativa fiscal vigente en España |
| **Multi-tenant** | Aislamiento de datos entre clientes en base de datos |
| **Dominio complejo** | Hostelería — mermas, escandallos, food cost, RevPash |

---

## 8. DECISIONES TÉCNICAS CLAVE

### ¿Por qué FastAPI y no NestJS?
El stack de InfoCampus ya está dominado. FastAPI puede implementar todo lo que requiere HorecaSO — Verifactu, FIFO, multi-tenant, IA. Cambiar a NestJS/TypeScript no agrega capacidades técnicas, solo agrega semanas de curva de aprendizaje.

### ¿Por qué raw SQL y no ORM?
Mismo criterio que InfoCampus. Las queries de food cost, FIFO, y Real vs Teórico son complejas — un ORM las haría más difíciles de optimizar y depurar, no más fáciles.

### ¿Por qué Decimal y no float?
Toda operación financiera usa Python's `Decimal` con precisión fija. Un error de redondeo en IVA puede invalidar un registro Verifactu ante la AEAT.

### ¿Por qué Verifactu en Fase 1 y no después?
Porque el TPV sin Verifactu no es legalmente usable en España desde julio 2025. No tiene sentido construir el TPV y añadir el cumplimiento fiscal después — van juntos desde el primer ticket.

---

## 9. MÉTRICAS DE ÉXITO DEL MVP

| Métrica | Criterio |
|---------|---------|
| Velocidad del TPV | Cobrar una mesa en menos de 30 segundos |
| Verifactu | 100% de tickets con hash válido y verificable en AEAT |
| Inventario | Stock actualizado en tiempo real tras cada venta |
| Dashboard | Carga en menos de 2 segundos |
| Disponibilidad | 99% uptime en horario de servicio |

---

## 10. NOTAS PARA EL DESARROLLO

- Usar el mismo patrón de `database.py` de InfoCampus — asyncpg pool con `statement_cache_size=0` para Supabase
- El `verifactu_engine.py` debe tener tests desde el principio — un hash incorrecto es un problema legal
- El plano de mesas usa coordenadas X/Y en la DB — el frontend renderiza con posicionamiento absoluto
- Las mermas se calculan en el backend, nunca en el frontend — el frontend solo muestra resultados
- El semáforo de rentabilidad se recalcula al cambiar el coste de cualquier ingrediente

---

*PRD v1.0 — HorecaSO — Arin Romero — Marzo 2026*
