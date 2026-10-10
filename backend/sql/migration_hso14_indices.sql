-- =============================================================================
-- HorecaSO — Auditoría HSO-14 (Fase 5): índices de las consultas con más tráfico
--
-- CREATE INDEX CONCURRENTLY no puede ir dentro de una transacción.
-- Ejecutar en Supabase > SQL Editor como sentencias sueltas (sin BEGIN/COMMIT).
-- Si el editor envuelve el script en una transacción, lánzalas una a una.
-- Idempotente (IF NOT EXISTS). Rollback al final.
--
-- En la BD de tests se aplica como CREATE INDEX (sin CONCURRENTLY).
--
-- Consultas reales que justifican cada índice:
--
-- idx_tickets_outlet_estado
--   KDS (polling 30 s): ticket_lineas JOIN tickets
--     WHERE t.outlet_id = $1 AND t.estado = 'abierto'
--   GET /tpv/tickets/abiertos: WHERE t.estado = 'abierto' AND t.outlet_id = $1
--   mesas_list: EXISTS (tickets WHERE mesa_id AND estado = 'abierto')
--
-- idx_tickets_outlet_cobrado_at
--   dashboard /director y /cierre-dia, reportes_dif_ventas, venta live:
--     WHERE outlet_id / tenant AND estado = 'cobrado'
--       AND (cobrado_at AT TIME ZONE 'Europe/Madrid')::date = $n
--
-- idx_tickets_outlet_created_at
--   GET /tpv/tickets/hoy: WHERE outlet_id AND created_at (día Madrid)
--
-- idx_ticket_lineas_ticket_id
--   KDS (join por ticket), get_ticket, SUM(subtotal) al añadir/borrar línea,
--   analytics_menu, verifactu_engine (líneas del ticket)
--
-- idx_verifactu_tenant_created
--   GET /verifactu/registros y /exportar: WHERE tenant_id ORDER BY created_at
--   (UNIQUE ticket_id y tenant+serie ya existen desde HSO-02)
--
-- idx_movimientos_articulo_created
--   GET /inventario/movimientos: WHERE articulo + tenant ORDER BY created_at DESC
--
-- idx_lotes_articulo_caducidad
--   GET /fifo/lotes (todos los lotes, también cantidad = 0)
--   El consumo FIFO ya usa idx_lotes_inventario_fifo (HSO-11, parcial cantidad > 0)
--
-- idx_reservas_outlet_fecha
--   GET /reservas: WHERE outlet_id AND fecha / BETWEEN
--   mesas_list: reservas del día por mesa (sale por outlet al listar la sala)
--
-- idx_turnos_empleado_fecha
--   fichajes entrada/salida: WHERE empleado_id AND fecha = hoy Madrid
--
-- No se añade índice en cierres_caja: uq_cierres_caja_outlet_fecha (HSO-13)
-- ya cubre WHERE outlet_id AND fecha.
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_outlet_estado
  ON public.tickets (outlet_id, estado);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_outlet_cobrado_at
  ON public.tickets (outlet_id, cobrado_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_outlet_created_at
  ON public.tickets (outlet_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_lineas_ticket_id
  ON public.ticket_lineas (ticket_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verifactu_tenant_created
  ON public.verifactu_registros (tenant_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movimientos_articulo_created
  ON public.movimientos_stock (articulo_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lotes_articulo_caducidad
  ON public.lotes_inventario (articulo_id, fecha_caducidad);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservas_outlet_fecha
  ON public.reservas (outlet_id, fecha);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_turnos_empleado_fecha
  ON public.turnos (empleado_id, fecha);


-- =============================================================================
-- VERIFICACIÓN (solo lectura)
-- =============================================================================
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_tickets%'
--    OR indexname LIKE 'idx_ticket_lineas%'
--    OR indexname LIKE 'idx_verifactu%'
--    OR indexname LIKE 'idx_movimientos%'
--    OR indexname LIKE 'idx_lotes_articulo%'
--    OR indexname LIKE 'idx_reservas%'
--    OR indexname LIKE 'idx_turnos%';

-- =============================================================================
-- ROLLBACK — también CONCURRENTLY, sin transacción
-- =============================================================================
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_turnos_empleado_fecha;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_reservas_outlet_fecha;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_lotes_articulo_caducidad;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_movimientos_articulo_created;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_verifactu_tenant_created;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_ticket_lineas_ticket_id;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_tickets_outlet_created_at;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_tickets_outlet_cobrado_at;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_tickets_outlet_estado;
