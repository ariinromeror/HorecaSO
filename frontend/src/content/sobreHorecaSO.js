/**
 * Contenido bilingüe para ProjectInfoModal (Login).
 * Estructura alineada con InfoCampus ERP.
 * Copy público: sin rutas de código, tablas, modelos ni versiones.
 */

export const PROJECT_INFO = {
  es: {
    tabs: {
      sobre: 'Sobre el proyecto',
      readme: 'README',
    },
    sobre: {
      resumenTitulo: 'Resumen General',
      resumen:
        'ERP multitenant de alta complejidad para la hostelería española. Gestiona nóminas, stock real e IA en un entorno SaaS profesional. Incluye registro interno de ventas por cobro, con huella encadenada para trazabilidad. Envío a la AEAT: sin envío todavía.',
      puntosTitulo: 'Puntos Clave — Por qué destaca',
      puntosClave: [
        'Arquitectura multi-restaurante con control de acceso por rol y base de datos en la nube.',
        'Registro interno de ventas por cobro, con huella encadenada para trazabilidad. Envío a la AEAT: sin envío todavía.',
        'Lógica de Inventario: Gestión de stock por lotes FIFO, escandallos con cálculo automático de mermas y motor de nóminas español.',
        'IA en Producción: Escaneo de facturas y modelos de predicción de desperdicio.',
      ],
      modulosTitulo: 'Módulos por Rol',
      modulosPorRol: [
        {
          rol: 'SuperAdmin',
          features:
            'Gestión de sucursales, planes SaaS y auditoría global.',
        },
        {
          rol: 'Administrador',
          features:
            'Control de caja, empleados, nóminas y reportes de rentabilidad.',
        },
        {
          rol: 'Contable',
          features:
            'Exportación de ventas para la gestoría y validación de impuestos.',
        },
        {
          rol: 'Jefe de Cocina',
          features:
            'Control de inventario, escandallos, pedidos y analítica de mermas.',
        },
        {
          rol: 'Camarero',
          features:
            'TPV rápido, gestión de mesas, comandas electrónicas y cobros.',
        },
        {
          rol: 'Recepcionista',
          features:
            'Reservas (PMS), check-in/out y cargos directos a habitación.',
        },
        {
          rol: 'Almacenero',
          features:
            'Entradas FIFO, caducidades y escaneo de albaranes por IA.',
        },
        {
          rol: 'Personal',
          features:
            'Fichaje horario, planificación de jornada e histórico de nóminas.',
        },
      ],
      desarrolladorTitulo: 'Desarrollador',
    },
    readme: {
      arquitecturaTitulo: 'Arquitectura',
      arquitectura: [
        'Arquitectura multi-restaurante con control de acceso por rol y base de datos en la nube.',
        'Interfaz web moderna para sala, cocina y dirección.',
        'Datos aislados por establecimiento con permisos según el perfil de cada usuario.',
        'Asistencia por IA para tareas operativas como el escaneo de documentos.',
      ],
      estructuraTitulo: 'Capacidades del sistema',
      estructuraBackend: [
        'Registro interno de ventas con trazabilidad encadenada (sin envío a la AEAT).',
        'Stock por lotes FIFO, mermas y escandallos.',
        'TPV, mesas, KDS, inventario, proveedores, reservas y nóminas.',
        'Aislamiento entre restaurantes y control de acceso por rol.',
      ],
      tablasTitulo: 'Datos y seguridad',
      tablasBD: [
        'Información del negocio, carta, ventas, inventario y personal protegida por aislamiento multi-restaurante.',
      ],
    },
  },
  en: {
    tabs: {
      sobre: 'About the project',
      readme: 'README',
    },
    sobre: {
      resumenTitulo: 'General Summary',
      resumen:
        'High-complexity multitenant ERP for Spanish hospitality. Manages payroll, real stock and AI in a professional SaaS environment. Includes an internal sales ledger per payment, with chained records for traceability. AEAT submission: not available yet (no AEAT remittance).',
      puntosTitulo: 'Key Points — Why it stands out',
      puntosClave: [
        'Multi-restaurant architecture with role-based access control and cloud database.',
        'Internal sales ledger per payment, with chained records for traceability. AEAT submission: not available yet (no AEAT remittance).',
        'Inventory Logic: FIFO batch stock management, recipe costing with automatic waste calculation and Spanish payroll engine.',
        'AI in Production: Invoice scanning and waste prediction models.',
      ],
      modulosTitulo: 'Modules by Role',
      modulosPorRol: [
        {
          rol: 'SuperAdmin',
          features: 'Branch management, SaaS plans and global audit.',
        },
        {
          rol: 'Administrator',
          features:
            'Cash control, employees, payroll and profitability reports.',
        },
        {
          rol: 'Accountant',
          features:
            'Sales export for accounting and tax validation.',
        },
        {
          rol: 'Head Chef',
          features:
            'Inventory control, recipe costing, orders and waste analytics.',
        },
        {
          rol: 'Waiter',
          features:
            'Fast POS, table management, electronic orders and checkout.',
        },
        {
          rol: 'Receptionist',
          features:
            'Reservations (PMS), check-in/out and direct room charges.',
        },
        {
          rol: 'Warehouse Clerk',
          features:
            'FIFO entries, expiry dates and AI delivery note scanning.',
        },
        {
          rol: 'Staff',
          features: 'Time clock, shift planning and payroll history.',
        },
      ],
      desarrolladorTitulo: 'Developer',
    },
    readme: {
      arquitecturaTitulo: 'Architecture',
      arquitectura: [
        'Multi-restaurant architecture with role-based access control and cloud database.',
        'Modern web interface for front of house, kitchen and management.',
        'Data isolated per venue with permissions according to each user profile.',
        'AI assistance for operational tasks such as document scanning.',
      ],
      estructuraTitulo: 'System capabilities',
      estructuraBackend: [
        'Internal sales ledger with chained traceability (no AEAT remittance).',
        'FIFO lot stock, waste tracking and recipe costing.',
        'POS, tables, kitchen display, inventory, suppliers, reservations and payroll.',
        'Isolation between restaurants and role-based access control.',
      ],
      tablasTitulo: 'Data and security',
      tablasBD: [
        'Business, menu, sales, inventory, staff and work-schedule data protected by multi-restaurant isolation.',
      ],
    },
  },
}

export const DESARROLLADOR = {
  nombre: 'Arin Romero',
  rol: 'Desarrollador',
  rolEn: 'Developer',
  email: 'ariin.romeror@gmail.com',
  linkedin: 'https://www.linkedin.com/in/arin-romero-606661129',
  github: 'https://github.com/ariinromeror',
}
