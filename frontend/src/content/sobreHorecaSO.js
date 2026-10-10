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
        'ERP multitenant de alta complejidad para la hostelería española. Gestiona nóminas, stock real e IA en un entorno SaaS profesional. Incluye registro interno de ventas por cobro, con huella encadenada para trazabilidad. Envío a la AEAT: no disponible todavía.',
      puntosTitulo: 'Puntos Clave — Por qué destaca',
      puntosClave: [
        'Multitenancy Estricto: Aislamiento total de datos por tenant_id mediante PostgreSQL RLS (Supabase) y RBAC con JWT (8 roles).',
        'Registro interno de ventas por cobro, con huella encadenada para trazabilidad. Envío a la AEAT: no disponible todavía.',
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
        'routers/verifactu.py: listado y exportación de registros internos.',
        'services/verifactu_engine.py: huella SHA-256 encadenada al cobro.',
        'services/stock.py: stock por lotes FIFO y mermas.',
        'auth/dependencies.py: aislamiento de tenants y RBAC.',
      ],
      tablasTitulo: 'Tablas de Base de Datos',
      tablasBD: [
        'tenants, usuarios, productos, tickets, ticket_lineas, ticket_pagos, verifactu_registros, lotes_inventario, recetas, turnos.',
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
        'High-complexity multitenant ERP for Spanish hospitality. Manages payroll, real stock and AI in a professional SaaS environment. Includes an internal sales ledger per payment, with SHA-256 chained records for traceability. AEAT submission: not available yet.',
      puntosTitulo: 'Key Points — Why it stands out',
      puntosClave: [
        'Strict Multitenancy: Total data isolation per tenant_id via PostgreSQL RLS (Supabase) and RBAC with JWT (8 roles).',
        'Internal sales ledger per payment, with SHA-256 chained records for traceability. AEAT submission: not available yet.',
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
        'routers/verifactu.py: list and export of internal fiscal records.',
        'services/verifactu_engine.py: SHA-256 chained hash at payment.',
        'services/stock.py: FIFO lot stock and waste.',
        'auth/dependencies.py: tenant isolation and RBAC.',
      ],
      tablasTitulo: 'Database Tables',
      tablasBD: [
        'tenants, usuarios, productos, tickets, ticket_lineas, ticket_pagos, verifactu_registros, lotes_inventario, recetas, turnos.',
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
