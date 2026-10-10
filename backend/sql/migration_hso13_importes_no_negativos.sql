-- =============================================================================
-- HorecaSO — Auditoría HSO-13 (Fase 1B): CHECK de importes no negativos
--
-- Requisito: ejecutar DESPUÉS de migration_hso_fase1_integridad.sql (que crea
-- los UNIQUE de cierres_caja y nominas y los CHECK de ticket_lineas.cantidad y
-- ticket_pagos.importe).
--
-- Decisiones (07/10/2026):
--   - tickets.total >= 0: las devoluciones irán por factura rectificativa, no
--     con tickets negativos.
--   - nominas.liquido SIN CHECK: puede ser negativo (anticipos, embargos).
--   - nominas.otros_devengos / otras_deducciones >= 0: una regularización a la
--     baja va en la columna contraria.
--
-- Idempotente. Los CHECK se crean NOT VALID (rigen para filas nuevas) y después
-- se intenta VALIDATE; si hay filas históricas que no cumplen, se avisa con
-- NOTICE (ver DIAGNÓSTICO) y el CHECK sigue aplicándose a lo nuevo.
-- Rollback al final del archivo.
-- =============================================================================

BEGIN;

DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT * FROM (VALUES
    ('tickets',       'ck_tickets_total_no_negativo',              'total >= 0'),
    ('tickets',       'ck_tickets_total_iva_no_negativo',          'total_iva >= 0'),
    ('ticket_lineas', 'ck_ticket_lineas_precio_no_negativo',       'precio_unitario >= 0'),
    ('ticket_lineas', 'ck_ticket_lineas_subtotal_no_negativo',     'subtotal >= 0'),
    ('cierres_caja',  'ck_cierres_caja_importes_no_negativos',
       'total_efectivo >= 0 AND total_tarjeta >= 0 AND total_bizum >= 0 '
       'AND total_transferencia >= 0 AND total_invitaciones >= 0 '
       'AND total_ventas >= 0 AND num_tickets >= 0 AND ticket_medio >= 0'),
    ('nominas',       'ck_nominas_importes_no_negativos',
       'salario_bruto >= 0 AND horas_extra_importe >= 0 AND plus_festivos >= 0 '
       'AND otros_devengos >= 0 AND total_devengos >= 0 AND ss_empleado >= 0 '
       'AND irpf >= 0 AND otras_deducciones >= 0 AND total_deducciones >= 0 '
       'AND ss_empresa >= 0 AND coste_total_empresa >= 0')
  ) AS v(tabla, nombre, expr)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = c.nombre AND conrelid = format('public.%I', c.tabla)::regclass
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID',
                     c.tabla, c.nombre, c.expr);
    END IF;

    BEGIN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', c.tabla, c.nombre);
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'HSO-13: % tiene filas históricas que no cumplen % (ver DIAGNÓSTICO). El CHECK aplica a filas nuevas.',
        c.tabla, c.nombre;
    END;
  END LOOP;
END $$;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT conrelid::regclass AS tabla, conname, convalidated
-- FROM pg_constraint
-- WHERE conname LIKE 'ck\_%no\_negativ%'
-- ORDER BY 1, 2;                                           -- 6 filas
-- convalidated = false → hay filas históricas inválidas (DIAGNÓSTICO).

-- =============================================================================
-- DIAGNÓSTICO (solo lectura) — filas que incumplirían los CHECK
-- =============================================================================
-- SELECT id, total, total_iva FROM public.tickets
--   WHERE total < 0 OR total_iva < 0;
-- SELECT id, ticket_id, precio_unitario, subtotal FROM public.ticket_lineas
--   WHERE precio_unitario < 0 OR subtotal < 0;
-- SELECT id, outlet_id, fecha FROM public.cierres_caja
--   WHERE total_efectivo < 0 OR total_tarjeta < 0 OR total_bizum < 0
--      OR total_transferencia < 0 OR total_invitaciones < 0 OR total_ventas < 0
--      OR num_tickets < 0 OR ticket_medio < 0;
-- SELECT id, empleado_id, mes, anio FROM public.nominas
--   WHERE salario_bruto < 0 OR horas_extra_importe < 0 OR plus_festivos < 0
--      OR otros_devengos < 0 OR total_devengos < 0 OR ss_empleado < 0 OR irpf < 0
--      OR otras_deducciones < 0 OR total_deducciones < 0 OR ss_empresa < 0
--      OR coste_total_empresa < 0;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- ALTER TABLE public.tickets       DROP CONSTRAINT IF EXISTS ck_tickets_total_no_negativo;
-- ALTER TABLE public.tickets       DROP CONSTRAINT IF EXISTS ck_tickets_total_iva_no_negativo;
-- ALTER TABLE public.ticket_lineas DROP CONSTRAINT IF EXISTS ck_ticket_lineas_precio_no_negativo;
-- ALTER TABLE public.ticket_lineas DROP CONSTRAINT IF EXISTS ck_ticket_lineas_subtotal_no_negativo;
-- ALTER TABLE public.cierres_caja  DROP CONSTRAINT IF EXISTS ck_cierres_caja_importes_no_negativos;
-- ALTER TABLE public.nominas       DROP CONSTRAINT IF EXISTS ck_nominas_importes_no_negativos;
-- COMMIT;
