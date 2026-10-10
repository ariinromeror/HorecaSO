-- =============================================================================
-- HorecaSO — Auditoría Fase 1: integridad de dinero y registros fiscales
-- Hallazgos: HSO-02 (Verifactu), HSO-05 (cantidad líneas), HSO-08/13 (importes,
--            unicidad de cierres de caja y nóminas).
--
-- Idempotente: se puede ejecutar varias veces.
-- Ejecutar en Supabase SQL Editor (rol postgres). Rollback al final del archivo.
--
-- Paso 0 (pre-check): si existen datos que violan las nuevas reglas, la
-- migración ABORTA sin cambiar nada y dice qué limpiar. Las consultas de
-- diagnóstico están en la sección "DIAGNÓSTICO" del final.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Pre-check de duplicados (los UNIQUE fallarían con datos existentes)
-- -----------------------------------------------------------------------------
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM (
    SELECT ticket_id FROM public.verifactu_registros
    WHERE ticket_id IS NOT NULL GROUP BY ticket_id HAVING count(*) > 1
  ) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'HSO-02: % tickets con más de un registro Verifactu. Ver DIAGNÓSTICO D1.', n;
  END IF;

  SELECT count(*) INTO n FROM (
    SELECT tenant_id, numero_serie FROM public.verifactu_registros
    GROUP BY tenant_id, numero_serie HAVING count(*) > 1
  ) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'HSO-02: % numero_serie duplicados por tenant. Ver DIAGNÓSTICO D2.', n;
  END IF;

  SELECT count(*) INTO n FROM (
    SELECT outlet_id, fecha FROM public.cierres_caja
    GROUP BY outlet_id, fecha HAVING count(*) > 1
  ) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'HSO-13: % cierres de caja duplicados (outlet, fecha). Ver DIAGNÓSTICO D3.', n;
  END IF;

  SELECT count(*) INTO n FROM (
    SELECT empleado_id, mes, anio FROM public.nominas
    GROUP BY empleado_id, mes, anio HAVING count(*) > 1
  ) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'HSO-13: % nóminas duplicadas (empleado, mes, año). Ver DIAGNÓSTICO D4.', n;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. HSO-02 — Unicidad Verifactu
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_verifactu_registros_ticket
  ON public.verifactu_registros (ticket_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_verifactu_registros_tenant_serie
  ON public.verifactu_registros (tenant_id, numero_serie);

-- -----------------------------------------------------------------------------
-- 2. HSO-02 — verifactu_registros inmutable (sin UPDATE ni DELETE)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verifactu_registros_inmutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'verifactu_registros es inmutable: % no permitido', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_verifactu_registros_inmutable ON public.verifactu_registros;
CREATE TRIGGER trg_verifactu_registros_inmutable
  BEFORE UPDATE OR DELETE ON public.verifactu_registros
  FOR EACH ROW EXECUTE FUNCTION public.verifactu_registros_inmutable();

-- -----------------------------------------------------------------------------
-- 3. HSO-13 — Unicidad cierres de caja y nóminas
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_cierres_caja_outlet_fecha
  ON public.cierres_caja (outlet_id, fecha);

CREATE UNIQUE INDEX IF NOT EXISTS uq_nominas_empleado_periodo
  ON public.nominas (empleado_id, mes, anio);

-- -----------------------------------------------------------------------------
-- 4. HSO-05 / HSO-08 — CHECK de cantidades e importes positivos
--    NOT VALID: rige para filas nuevas sin bloquear por datos históricos.
--    Después se intenta VALIDATE; si hay filas antiguas inválidas, se avisa
--    (NOTICE) y el CHECK sigue aplicándose a todo lo nuevo.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_ticket_lineas_cantidad_positiva'
      AND conrelid = 'public.ticket_lineas'::regclass
  ) THEN
    ALTER TABLE public.ticket_lineas
      ADD CONSTRAINT ck_ticket_lineas_cantidad_positiva CHECK (cantidad > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_ticket_pagos_importe_positivo'
      AND conrelid = 'public.ticket_pagos'::regclass
  ) THEN
    ALTER TABLE public.ticket_pagos
      ADD CONSTRAINT ck_ticket_pagos_importe_positivo CHECK (importe > 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.ticket_lineas VALIDATE CONSTRAINT ck_ticket_lineas_cantidad_positiva;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'HSO-05: hay líneas históricas con cantidad <= 0 (DIAGNÓSTICO D5). El CHECK aplica a filas nuevas.';
  END;
  BEGIN
    ALTER TABLE public.ticket_pagos VALIDATE CONSTRAINT ck_ticket_pagos_importe_positivo;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'HSO-08: hay pagos históricos con importe <= 0 (DIAGNÓSTICO D6). El CHECK aplica a filas nuevas.';
  END;
END $$;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN (tras ejecutar)
-- =============================================================================
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
--   'uq_verifactu_registros_ticket', 'uq_verifactu_registros_tenant_serie',
--   'uq_cierres_caja_outlet_fecha', 'uq_nominas_empleado_periodo');          -- 4 filas
-- SELECT conname, convalidated FROM pg_constraint WHERE conname IN (
--   'ck_ticket_lineas_cantidad_positiva', 'ck_ticket_pagos_importe_positivo'); -- 2 filas
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_verifactu_registros_inmutable'; -- 1 fila
-- Prueba del trigger (debe FALLAR con "verifactu_registros es inmutable"):
--   BEGIN; UPDATE public.verifactu_registros SET enviado_aeat = enviado_aeat
--          WHERE id = (SELECT id FROM public.verifactu_registros LIMIT 1); ROLLBACK;

-- =============================================================================
-- DIAGNÓSTICO (si el pre-check aborta)
-- =============================================================================
-- D1: SELECT ticket_id, count(*), array_agg(numero_serie ORDER BY created_at)
--       FROM public.verifactu_registros GROUP BY ticket_id HAVING count(*) > 1;
-- D2: SELECT tenant_id, numero_serie, count(*) FROM public.verifactu_registros
--       GROUP BY 1, 2 HAVING count(*) > 1;
--     D1/D2 son registros fiscales: NO borrarlos. Consultar con la gestoría
--     (anulación/rectificación) antes de seguir; la migración no continúa
--     hasta resolverlos.
-- D3: SELECT outlet_id, fecha, array_agg(id ORDER BY created_at) FROM public.cierres_caja
--       GROUP BY 1, 2 HAVING count(*) > 1;
-- D4: SELECT empleado_id, mes, anio, array_agg(id ORDER BY created_at) FROM public.nominas
--       GROUP BY 1, 2, 3 HAVING count(*) > 1;
-- D5: SELECT id, ticket_id, cantidad FROM public.ticket_lineas WHERE cantidad <= 0;
-- D6: SELECT id, ticket_id, importe FROM public.ticket_pagos WHERE importe <= 0;

-- =============================================================================
-- ROLLBACK (ejecutar a mano si hay que revertir)
-- =============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_verifactu_registros_inmutable ON public.verifactu_registros;
-- DROP FUNCTION IF EXISTS public.verifactu_registros_inmutable();
-- DROP INDEX IF EXISTS public.uq_verifactu_registros_ticket;
-- DROP INDEX IF EXISTS public.uq_verifactu_registros_tenant_serie;
-- DROP INDEX IF EXISTS public.uq_cierres_caja_outlet_fecha;
-- DROP INDEX IF EXISTS public.uq_nominas_empleado_periodo;
-- ALTER TABLE public.ticket_lineas DROP CONSTRAINT IF EXISTS ck_ticket_lineas_cantidad_positiva;
-- ALTER TABLE public.ticket_pagos  DROP CONSTRAINT IF EXISTS ck_ticket_pagos_importe_positivo;
-- COMMIT;
