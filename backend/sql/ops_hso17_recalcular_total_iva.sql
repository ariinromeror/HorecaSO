-- =============================================================================
-- HSO-17 — Recalcular tickets.total_iva de los tickets ya cobrados
-- =============================================================================
-- Contexto: hasta la Fase 3 el TPV nunca escribía tickets.total_iva (queda en 0)
-- y el informe de ventas mostraba IVA 0. Desde la Fase 3 el cobro guarda en
-- total_iva la cuota del registro Verifactu, en la misma transacción.
--
-- Este script rellena los tickets históricos:
--   A) Tickets con registro Verifactu: total_iva = verifactu_registros.cuota_iva
--      (la cuota que ya se declaró; no se recalcula nada).
--   B) Tickets cobrados SIN registro Verifactu (anomalía; ver DIAGNÓSTICO):
--      misma fórmula que services/verifactu_engine.py — por línea
--      base = ROUND(subtotal / (1 + iva/100), 2), cuota = subtotal - base,
--      y el descuadre de céntimos contra tickets.total va a la cuota.
--
-- No toca verifactu_registros. Guarda el valor anterior en
-- public.ops_hso17_total_iva_backup para poder revertir (ROLLBACK al final).
-- Idempotente: volver a ejecutarlo no cambia nada ni pisa la copia original.
--
-- Requisito: migration_hso_fase1_integridad.sql ya ejecutada (UNIQUE ticket_id
-- en verifactu_registros). Ejecutar en Supabase > SQL Editor. No es parte del deploy.
-- =============================================================================


-- PASO 1 — Vista previa (solo lectura)
SELECT
  COUNT(*) FILTER (WHERE vr.ticket_id IS NOT NULL
                     AND t.total_iva IS DISTINCT FROM vr.cuota_iva) AS a_actualizar_desde_verifactu,
  COUNT(*) FILTER (WHERE vr.ticket_id IS NULL)                       AS cobrados_sin_verifactu,
  COUNT(*)                                                           AS cobrados_total
FROM public.tickets t
LEFT JOIN public.verifactu_registros vr ON vr.ticket_id = t.id
WHERE t.estado = 'cobrado';


BEGIN;

-- PASO 2 — Copia de seguridad del valor actual (solo la primera vez por ticket)
CREATE TABLE IF NOT EXISTS public.ops_hso17_total_iva_backup (
  ticket_id           uuid PRIMARY KEY,
  total_iva_anterior  numeric(10,2),
  copiado_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_hso17_total_iva_backup ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.ops_hso17_total_iva_backup FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.ops_hso17_total_iva_backup FROM authenticated;
  END IF;
END $$;

INSERT INTO public.ops_hso17_total_iva_backup (ticket_id, total_iva_anterior)
SELECT t.id, t.total_iva
FROM public.tickets t
WHERE t.estado = 'cobrado'
ON CONFLICT (ticket_id) DO NOTHING;

-- PASO 3A — Tickets con registro Verifactu
UPDATE public.tickets t
SET total_iva = vr.cuota_iva
FROM public.verifactu_registros vr
WHERE vr.ticket_id = t.id
  AND t.estado = 'cobrado'
  AND t.total_iva IS DISTINCT FROM vr.cuota_iva;

-- PASO 3B — Tickets cobrados sin registro Verifactu (recalculado desde líneas)
WITH lineas AS (
  SELECT tl.ticket_id,
         SUM(tl.subtotal)                                             AS suma_subtotal,
         SUM(tl.subtotal - ROUND(tl.subtotal / (1 + COALESCE(p.iva_porcentaje, 10) / 100), 2))
                                                                      AS cuota_lineas
  FROM public.ticket_lineas tl
  LEFT JOIN public.productos p ON p.id = tl.producto_id
  GROUP BY tl.ticket_id
),
calculo AS (
  SELECT t.id,
         CASE
           WHEN l.ticket_id IS NULL THEN t.total - ROUND(t.total / 1.10, 2)
           ELSE l.cuota_lineas + (t.total - l.suma_subtotal)
         END AS cuota
  FROM public.tickets t
  LEFT JOIN lineas l ON l.ticket_id = t.id
  WHERE t.estado = 'cobrado'
    AND NOT EXISTS (SELECT 1 FROM public.verifactu_registros vr WHERE vr.ticket_id = t.id)
)
UPDATE public.tickets t
SET total_iva = c.cuota
FROM calculo c
WHERE c.id = t.id
  AND c.cuota >= 0
  AND t.total_iva IS DISTINCT FROM c.cuota;

COMMIT;


-- =============================================================================
-- VERIFICACIÓN (solo lectura)
-- =============================================================================
-- Debe dar 0: tickets con Verifactu cuyo total_iva no coincide con la cuota.
-- SELECT COUNT(*) FROM public.tickets t
-- JOIN public.verifactu_registros vr ON vr.ticket_id = t.id
-- WHERE t.estado = 'cobrado' AND t.total_iva IS DISTINCT FROM vr.cuota_iva;
--
-- IVA por día (Madrid) tal como lo mostrará el informe de ventas:
-- SELECT (cobrado_at AT TIME ZONE 'Europe/Madrid')::date AS dia,
--        SUM(total) AS ventas, SUM(total_iva) AS iva
-- FROM public.tickets WHERE estado = 'cobrado'
-- GROUP BY 1 ORDER BY 1 DESC LIMIT 31;

-- =============================================================================
-- DIAGNÓSTICO (solo lectura)
-- =============================================================================
-- Tickets cobrados sin registro Verifactu (no deberían existir: revisar uno a uno).
-- SELECT t.id, t.outlet_id, t.total, t.total_iva, t.cobrado_at
-- FROM public.tickets t
-- WHERE t.estado = 'cobrado'
--   AND NOT EXISTS (SELECT 1 FROM public.verifactu_registros vr WHERE vr.ticket_id = t.id)
-- ORDER BY t.cobrado_at;
--
-- Tickets que el PASO 3B dejó sin tocar porque la cuota salía negativa
-- (total del ticket menor que la suma de sus líneas):
-- SELECT t.id, t.total, SUM(tl.subtotal) AS suma_lineas
-- FROM public.tickets t JOIN public.ticket_lineas tl ON tl.ticket_id = t.id
-- WHERE t.estado = 'cobrado'
--   AND NOT EXISTS (SELECT 1 FROM public.verifactu_registros vr WHERE vr.ticket_id = t.id)
-- GROUP BY t.id, t.total HAVING t.total < SUM(tl.subtotal);

-- =============================================================================
-- ROLLBACK — devuelve total_iva al valor anterior y borra la copia
-- =============================================================================
-- BEGIN;
-- UPDATE public.tickets t
-- SET total_iva = b.total_iva_anterior
-- FROM public.ops_hso17_total_iva_backup b
-- WHERE b.ticket_id = t.id;
-- DROP TABLE public.ops_hso17_total_iva_backup;
-- COMMIT;
--
-- Cuando el informe de ventas esté validado, la copia se puede borrar:
-- DROP TABLE IF EXISTS public.ops_hso17_total_iva_backup;
