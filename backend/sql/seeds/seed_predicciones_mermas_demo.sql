-- Seed de mermas históricas para el tenant Restaurante Prueba (Predicciones IA).
-- Ejecutar en Supabase SQL Editor si el panel muestra "0 días de histórico".
-- Idempotente: borra movimientos previos con motivo SEED_PREDICCIONES_DEMO.

DELETE FROM movimientos_stock
WHERE motivo = 'SEED_PREDICCIONES_DEMO'
  AND outlet_id = '22222222-2222-2222-2222-222222222222';

-- 60 días de mermas con patrón semanal (más pérdida en fin de semana en fresco).
INSERT INTO movimientos_stock (
  id, articulo_id, outlet_id, tipo, cantidad, coste_unitario, motivo, usuario_id, created_at
)
SELECT
  gen_random_uuid(),
  art.id,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'merma',
  art.cant,
  art.coste,
  'SEED_PREDICCIONES_DEMO',
  '44000000-0000-4000-8000-000000000001'::uuid,
  (CURRENT_DATE - (60 - n))::timestamptz + interval '10 hours'
FROM generate_series(1, 60) AS n
CROSS JOIN LATERAL (
  VALUES
    (
      1,
      'c0000001-0000-4000-8000-000000000003'::uuid,
      CASE WHEN EXTRACT(ISODOW FROM CURRENT_DATE - (60 - n)) IN (6, 7)
        THEN 2.5 + (n % 3) * 0.3
        ELSE 0.8 + (n % 4) * 0.2
      END,
      1.20::numeric
    ),
    (
      2,
      'c0000001-0000-4000-8000-000000000002'::uuid,
      0.4 + (n % 5) * 0.1,
      9.50::numeric
    ),
    (
      3,
      'c0000001-0000-4000-8000-000000000001'::uuid,
      CASE WHEN n % 7 = 0 THEN 0.15 ELSE 0 END,
      28.00::numeric
    ),
    (
      4,
      'c0000001-0000-4000-8000-000000000004'::uuid,
      CASE WHEN n % 9 = 0 THEN 0.5 ELSE 0 END,
      4.80::numeric
    )
) AS art(ord, id, cant, coste)
WHERE art.cant > 0;
