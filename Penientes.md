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