MÓDULO PROVEEDORES — PENDIENTES:
1. Modal IA: flujo de confirmación incompleto
   - Seleccionar proveedor en el modal
   - Asignar artículo a cada línea detectada
   - Botón Confirmar → POST /api/facturas-proveedor
   - Actualizar stock automáticamente

2. Soporte PDF en escaneo IA
   - accept="image/*,application/pdf" en el input
   - Conversión PDF→imagen en backend antes de Groq

3. Cámara directa en móvil
   - capture="environment" en el input de imagen

4. PWA (al hacer deploy)
   - manifest.json + service worker
   - Ícono en pantalla de inicio

---

DEUDA TÉCNICA — ANTES DE FASE 4:

5. Auditoría y refactorización de componentes grandes
   - ReservasPage.jsx → partir en componentes de ~200 líneas
   - ClientesPage.jsx → partir en componentes de ~200 líneas
   - EmpleadosPage.jsx → partir en componentes de ~200 líneas
   - NominasPage.jsx → partir en componentes de ~200 líneas
   - CuadrantePage.jsx → partir en componentes de ~200 líneas
   - FichajesPage.jsx → partir en componentes de ~200 líneas
   - ProveedoresPage.jsx → partir en componentes de ~200 líneas
   - FacturasPage.jsx → partir en componentes de ~200 líneas
   Patrón: pages/modulo/components/ con subcomponentes
   autónomos (List, Modal, Panel, etc.)

6. Auditoría cursorrules en todos los archivos nuevos
   - Verificar require_roles en todos los endpoints
   - Verificar Decimal en todos los cálculos monetarios
   - Verificar dark: en todos los componentes frontend
   - Verificar mobile first en todos los layouts