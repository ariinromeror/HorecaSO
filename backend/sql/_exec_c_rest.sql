-- -----------------------------------------------------------------------------
-- FASE B — Empleados (vinculados a usuarios @prueba.com), clientes, reservas
-- -----------------------------------------------------------------------------
INSERT INTO empleados (
  id, tenant_id, usuario_id, dni, cargo, fecha_inicio, activo, nss, contrato,
  jornada_horas, irpf_porcentaje, iban, salario_bruto_mensual, nombre_completo
)
VALUES
  ('e0000001-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '44000000-0000-4000-8000-000000000001',
   '12345678A', 'Administración', CURRENT_DATE - 400, true, '2812345678901', 'indefinido', 40, 15.0, 'ES9121000418450200051332', 3200.00, 'Admin Prueba'),
  ('e0000001-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', '44000000-0000-4000-8000-000000000002',
   '23456789B', 'Dirección', CURRENT_DATE - 380, true, '2812345678902', 'indefinido', 40, 18.0, 'ES9121000418450200051333', 2800.00, 'Director Prueba'),
  ('e0000001-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', '44000000-0000-4000-8000-000000000003',
   '34567890C', 'Jefe de sala', CURRENT_DATE - 200, true, '2812345678903', 'indefinido', 40, 12.0, 'ES9121000418450200051334', 1650.00, 'Jefe Sala Prueba'),
  ('e0000001-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', '44000000-0000-4000-8000-000000000004',
   '45678901D', 'Camarero', CURRENT_DATE - 150, true, '2812345678904', 'indefinido', 40, 10.0, 'ES9121000418450200051335', 1400.00, 'Camarero Prueba'),
  ('e0000001-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', '44000000-0000-4000-8000-000000000005',
   '56789012E', 'Cocinero', CURRENT_DATE - 120, true, '2812345678905', 'indefinido', 40, 10.0, 'ES9121000418450200051336', 1550.00, 'Cocina Prueba'),
  ('e0000001-0000-4000-8000-000000000006', '11111111-1111-1111-1111-111111111111', '44000000-0000-4000-8000-000000000006',
   '67890123F', 'Barman', CURRENT_DATE - 100, true, '2812345678906', 'indefinido', 40, 10.0, 'ES9121000418450200051337', 1450.00, 'Barra Prueba')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clientes (
  id, tenant_id, nombre, email, telefono, total_visitas, gasto_total, gasto_medio,
  ultima_visita, puntos_fidelidad, notas
)
VALUES
  ('f0000001-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Laura Gómez', 'laura.gomez@example.com', '600111222', 12, 480.00, 40.00, CURRENT_DATE - 3, 120, 'Prefiere mesa interior'),
  ('f0000001-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Miguel Ruiz', 'miguel.ruiz@example.com', '600333444', 5, 210.00, 42.00, CURRENT_DATE - 10, 45, NULL),
  ('f0000001-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Empresa Demo SL', 'compras@empresademo.es', '911222333', 3, 890.00, 296.67, CURRENT_DATE - 1, 0, 'Comidas de negocios')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservas (
  id, outlet_id, mesa_id, nombre_cliente, telefono, fecha, hora, num_personas,
  estado, notas, email, origen, cliente_id
)
VALUES
  ('f1000001-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', '33000000-0000-4000-8000-00000000000c',
   'Laura Gómez', '600111222', CURRENT_DATE + 2, '21:30:00', 4, 'confirmada', 'Sin gluten', 'laura.gomez@example.com', 'web',
   'f0000001-0000-4000-8000-000000000001'),
  ('f1000001-0000-4000-8000-000000000002', '22222222-2222-2222-2222-222222222222', '33000000-0000-4000-8000-00000000000d',
   'Miguel Ruiz', '600333444', CURRENT_DATE + 5, '14:00:00', 2, 'confirmada', NULL, 'miguel.ruiz@example.com', 'telefono',
   'f0000001-0000-4000-8000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- FASE C — Tickets cobrados + líneas (ventas para dashboard / analytics)
-- metodo_pago coherente con dashboard/cierre (efectivo, tarjeta_credito, bizum…)
-- -----------------------------------------------------------------------------
-- Totales = suma de subtotales de líneas (mismo día para los dos primeros → dashboard “hoy”)
INSERT INTO tickets (
  id, outlet_id, mesa_id, camarero_id, estado, total, metodo_pago, cobrado_at,
  total_iva, descuento_porcentaje, descuento_importe, num_comensales, notas
)
VALUES
  ('f2000001-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', '33000000-0000-4000-8000-000000000006',
   '44000000-0000-4000-8000-000000000004', 'cobrado', 32.00, 'tarjeta_credito',
   date_trunc('day', NOW()) + interval '13 hours', 0, 0, 0, 2, 'Demo seed A'),
  ('f2000001-0000-4000-8000-000000000002', '22222222-2222-2222-2222-222222222222', '33000000-0000-4000-8000-000000000007',
   '44000000-0000-4000-8000-000000000004', 'cobrado', 32.50, 'efectivo',
   date_trunc('day', NOW()) + interval '14 hours 30 minutes', 0, 0, 0, 3, 'Demo seed B'),
  ('f2000001-0000-4000-8000-000000000003', '22222222-2222-2222-2222-222222222222', '33000000-0000-4000-8000-000000000008',
   '44000000-0000-4000-8000-000000000004', 'cobrado', 43.00, 'bizum',
   date_trunc('day', NOW()) - interval '1 day' + interval '21 hours', 0, 0, 0, 4, 'Ayer'),
  ('f2000001-0000-4000-8000-000000000004', '22222222-2222-2222-2222-222222222222', '33000000-0000-4000-8000-000000000009',
   '44000000-0000-4000-8000-000000000004', 'cobrado', 17.50, 'tarjeta_debito',
   date_trunc('day', NOW()) - interval '2 days' + interval '20 hours', 0, 0, 0, 2, 'Hace 2 días'),
  ('f2000001-0000-4000-8000-000000000005', '22222222-2222-2222-2222-222222222222', '33000000-0000-4000-8000-00000000000a',
   '44000000-0000-4000-8000-000000000004', 'cobrado', 56.50, 'efectivo',
   date_trunc('day', NOW()) - interval '3 days' + interval '15 hours', 0, 0, 0, 6, 'Grupo')
ON CONFLICT (id) DO NOTHING;

-- Líneas: subtotales coherentes con precios producto
INSERT INTO ticket_lineas (
  id, ticket_id, producto_id, cantidad, precio_unitario, subtotal, nota,
  descuento_porcentaje, enviado_cocina, estado_cocina, enviado_barra, estado_barra
)
VALUES
  ('f3000001-0000-4000-8000-000000000001', 'f2000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000001', 2, 4.50, 9.00, NULL, 0, true, 'servido', false, 'pendiente'),
  ('f3000001-0000-4000-8000-000000000002', 'f2000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000003', 1, 18.00, 18.00, 'Poco hecho', 0, true, 'servido', false, 'pendiente'),
  ('f3000001-0000-4000-8000-000000000003', 'f2000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000005', 2, 2.50, 5.00, NULL, 0, false, 'pendiente', true, 'servido'),

  ('f3000001-0000-4000-8000-000000000004', 'f2000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000002', 2, 6.00, 12.00, NULL, 0, true, 'servido', false, 'pendiente'),
  ('f3000001-0000-4000-8000-000000000005', 'f2000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000004', 1, 14.00, 14.00, NULL, 0, true, 'servido', false, 'pendiente'),
  ('f3000001-0000-4000-8000-000000000006', 'f2000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000006', 2, 2.00, 4.00, NULL, 0, false, 'pendiente', true, 'servido'),
  ('f3000001-0000-4000-8000-000000000007', 'f2000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000005', 1, 2.50, 2.50, NULL, 0, false, 'pendiente', true, 'servido'),

  ('f3000001-0000-4000-8000-000000000008', 'f2000001-0000-4000-8000-000000000003', 'b0000001-0000-4000-8000-000000000003', 2, 18.00, 36.00, NULL, 0, true, 'servido', false, 'pendiente'),
  ('f3000001-0000-4000-8000-000000000009', 'f2000001-0000-4000-8000-000000000003', 'b0000001-0000-4000-8000-000000000005', 2, 2.50, 5.00, NULL, 0, false, 'pendiente', true, 'servido'),
  ('f3000001-0000-4000-8000-00000000000a', 'f2000001-0000-4000-8000-000000000003', 'b0000001-0000-4000-8000-000000000006', 1, 2.00, 2.00, NULL, 0, false, 'pendiente', true, 'servido'),

  ('f3000001-0000-4000-8000-00000000000b', 'f2000001-0000-4000-8000-000000000004', 'b0000001-0000-4000-8000-000000000001', 2, 4.50, 9.00, NULL, 0, true, 'servido', false, 'pendiente'),
  ('f3000001-0000-4000-8000-00000000000c', 'f2000001-0000-4000-8000-000000000004', 'b0000001-0000-4000-8000-000000000002', 1, 6.00, 6.00, NULL, 0, true, 'servido', false, 'pendiente'),
  ('f3000001-0000-4000-8000-00000000000d', 'f2000001-0000-4000-8000-000000000004', 'b0000001-0000-4000-8000-000000000005', 1, 2.50, 2.50, NULL, 0, false, 'pendiente', true, 'servido'),

  ('f3000001-0000-4000-8000-00000000000e', 'f2000001-0000-4000-8000-000000000005', 'b0000001-0000-4000-8000-000000000003', 3, 18.00, 54.00, NULL, 0, true, 'servido', false, 'pendiente'),
  ('f3000001-0000-4000-8000-00000000000f', 'f2000001-0000-4000-8000-000000000005', 'b0000001-0000-4000-8000-000000000005', 1, 2.50, 2.50, NULL, 0, false, 'pendiente', true, 'servido')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- FASE D — Nóminas (mes en curso, importes redondos para listados / PDFs)
-- -----------------------------------------------------------------------------
INSERT INTO nominas (
  id, empleado_id, mes, anio, salario_bruto, horas_extra_importe, plus_festivos,
  otros_devengos, total_devengos, ss_empleado, irpf, otras_deducciones,
  total_deducciones, liquido, ss_empresa, coste_total_empresa, pagada
)
VALUES
  ('f4000001-0000-4000-8000-000000000001', 'e0000001-0000-4000-8000-000000000001',
   EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int,
   3200.00, 0, 0, 0, 3200.00, 210.00, 480.00, 0, 690.00, 2510.00, 680.00, 3880.00, true),
  ('f4000001-0000-4000-8000-000000000002', 'e0000001-0000-4000-8000-000000000002',
   EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int,
   2800.00, 0, 0, 0, 2800.00, 185.00, 420.00, 0, 605.00, 2195.00, 595.00, 3395.00, true),
  ('f4000001-0000-4000-8000-000000000003', 'e0000001-0000-4000-8000-000000000003',
   EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int,
   1650.00, 50.00, 0, 0, 1700.00, 112.00, 180.00, 0, 292.00, 1408.00, 350.00, 2050.00, true),
  ('f4000001-0000-4000-8000-000000000004', 'e0000001-0000-4000-8000-000000000004',
   EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int,
   1400.00, 0, 0, 0, 1400.00, 95.00, 140.00, 0, 235.00, 1165.00, 298.00, 1698.00, false),
  ('f4000001-0000-4000-8000-000000000005', 'e0000001-0000-4000-8000-000000000005',
   EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int,
   1550.00, 0, 0, 0, 1550.00, 102.00, 155.00, 0, 257.00, 1293.00, 328.00, 1878.00, false),
  ('f4000001-0000-4000-8000-000000000006', 'e0000001-0000-4000-8000-000000000006',
   EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int,
   1450.00, 0, 0, 0, 1450.00, 96.00, 145.00, 0, 241.00, 1209.00, 307.00, 1757.00, false)
ON CONFLICT (id) DO NOTHING;