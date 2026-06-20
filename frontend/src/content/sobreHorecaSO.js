/**
 * Contenido bilingüe para ProjectInfoModal (Login).
 * Estructura alineada con InfoCampus ERP.
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
        'ERP multitenant de alta complejidad para la hostelería española. Gestiona nóminas, stock real, facturación Verifactu e IA en un entorno SaaS profesional.',
      puntosTitulo: 'Puntos Clave — Por qué destaca',
      puntosClave: [
        'Multitenancy Estricto: Aislamiento total de datos por tenant_id mediante PostgreSQL RLS (Supabase) y RBAC con JWT (8 roles).',
        'Cumplimiento Fiscal: Motor Verifactu con encadenamiento SHA-256 criptográfico atómico para registros inmutables.',
        'Lógica de Inventario: Gestión de stock por lotes FIFO, escandallos con cálculo automático de mermas y motor de nóminas español.',
        'IA en Producción: Escaneo de facturas con Groq Vision y modelos de predicción de desperdicio.',
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
            'Fiscalidad Verifactu, exportación de libros y validación de impuestos.',
        },
        {
          rol: 'Jefe de Cocina',
          features:
            'Control de inventario, escandallos, pedidos y analítica de mermas.',
        },
        {
          rol: 'Camarero',
          features:
            'TPV rápido, gestión de mesas, comandas electrónicas y tickets.',
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
          features: 'Fichaje horario, turnos e histórico de nóminas.',
        },
      ],
      desarrolladorTitulo: 'Desarrollador',
    },
    readme: {
      arquitecturaTitulo: 'Arquitectura',
      arquitectura: [
        'Backend: FastAPI (Python 3.11+) asíncrono.',
        'Frontend: React 19 + Vite + Tailwind CSS 4.',
        'Base de Datos: PostgreSQL 15 con seguridad RLS a nivel de fila.',
        'IA: Groq API (llama-3.3-70b-versatile).',
      ],
      estructuraTitulo: 'Estructura de Archivos Backend',
      estructuraBackend: [
        'fiscal/verifactu.py: Motor de firmas SHA-256.',
        'services/ia_vision.py: Integración con Groq Vision.',
        'services/stock_engine.py: Lógica FIFO y mermas.',
        'auth/dependencies.py: Aislamiento de tenants y RBAC.',
      ],
      tablasTitulo: 'Tablas de Base de Datos',
      tablasBD: [
        'tenants, usuarios, productos_ingredientes, escandallos, lotes_stock, comandas, facturas_emitidas (con hash Verifactu), turnos_fichajes.',
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
        'High-complexity multitenant ERP for Spanish hospitality. Manages payroll, real stock, Verifactu invoicing and AI in a professional SaaS environment.',
      puntosTitulo: 'Key Points — Why it stands out',
      puntosClave: [
        'Strict Multitenancy: Total data isolation per tenant_id via PostgreSQL RLS (Supabase) and RBAC with JWT (8 roles).',
        'Tax Compliance: Verifactu engine with atomic cryptographic SHA-256 chaining for immutable records.',
        'Inventory Logic: FIFO batch stock management, recipe costing with automatic waste calculation and Spanish payroll engine.',
        'AI in Production: Invoice scanning with Groq Vision and waste prediction models.',
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
            'Verifactu tax compliance, ledger exports and tax validation.',
        },
        {
          rol: 'Head Chef',
          features:
            'Inventory control, recipe costing, orders and waste analytics.',
        },
        {
          rol: 'Waiter',
          features:
            'Fast POS, table management, electronic orders and tickets.',
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
          features: 'Time clock, shifts and payroll history.',
        },
      ],
      desarrolladorTitulo: 'Developer',
    },
    readme: {
      arquitecturaTitulo: 'Architecture',
      arquitectura: [
        'Backend: Async FastAPI (Python 3.11+).',
        'Frontend: React 19 + Vite + Tailwind CSS 4.',
        'Database: PostgreSQL 15 with row-level RLS security.',
        'AI: Groq API (llama-3.3-70b-versatile).',
      ],
      estructuraTitulo: 'Backend File Structure',
      estructuraBackend: [
        'fiscal/verifactu.py: SHA-256 signature engine.',
        'services/ia_vision.py: Groq Vision integration.',
        'services/stock_engine.py: FIFO and waste logic.',
        'auth/dependencies.py: Tenant isolation and RBAC.',
      ],
      tablasTitulo: 'Database Tables',
      tablasBD: [
        'tenants, usuarios, productos_ingredientes, escandallos, lotes_stock, comandas, facturas_emitidas (with Verifactu hash), turnos_fichajes.',
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
