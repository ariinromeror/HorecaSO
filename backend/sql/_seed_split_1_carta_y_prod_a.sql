INSERT INTO categorias_menu (id, tenant_id, nombre, orden, icono, color, activo)
VALUES
  ('a0000001-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'Entrantes', 1, 'utensils', '#f59e0b', true),
  ('a0000001-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'Principales', 2, 'chef-hat', '#10b981', true),
  ('a0000001-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'Refrescos y aguas', 3, 'glass-water', '#6366f1', true),
  ('a0000001-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'Tapas y raciones', 4, 'flame', '#ea580c', true),
  ('a0000001-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'Ensaladas', 5, 'leaf', '#22c55e', true),
  ('a0000001-0000-4000-8000-000000000006', '11111111-1111-1111-1111-111111111111', 'Carnes', 6, 'beef', '#b91c1c', true),
  ('a0000001-0000-4000-8000-000000000007', '11111111-1111-1111-1111-111111111111', 'Pescados y mariscos', 7, 'fish', '#0ea5e9', true),
  ('a0000001-0000-4000-8000-000000000008', '11111111-1111-1111-1111-111111111111', 'Arroces y pastas', 8, 'wheat', '#d97706', true),
  ('a0000001-0000-4000-8000-000000000009', '11111111-1111-1111-1111-111111111111', 'Postres caseros', 9, 'cake', '#ec4899', true),
  ('a0000001-0000-4000-8000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Vinos y cavas', 10, 'wine', '#7c3aed', true),
  ('a0000001-0000-4000-8000-00000000000b', '11111111-1111-1111-1111-111111111111', 'Cafés y licores', 11, 'coffee', '#57534e', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO productos (
  id, tenant_id, categoria_id, nombre, precio, tiene_receta, activo,
  descripcion, iva_porcentaje, es_bebida, es_menu, disponible_delivery,
  tiempo_preparacion, precio_coste, destino_kds
)
VALUES
  -- Originales (no cambiar IDs: usados en ticket_lineas demo)
  ('b0000001-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000001',
   'Croquetas de jamón (4 uds)', 4.50, false, true, 'Cremosas, bechamel y jamón ibérico', 10.00, false, false, true, 8, 1.80, 'cocina'),
  ('b0000001-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000001',
   'Ensalada César', 6.00, false, true, 'Lechuga romana, pollo, parmesano, salsa César', 10.00, false, false, true, 5, 2.20, 'cocina'),
  ('b0000001-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000002',
   'Solomillo a la pimienta', 18.00, true, true, 'Solomillo de ternera, salsa a la pimienta verde, patatas', 10.00, false, false, true, 18, 7.50, 'cocina'),
  ('b0000001-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000002',
   'Merluza al horno', 14.00, true, true, 'Lomos de merluza, patatas panadera, cebolla confitada', 10.00, false, false, true, 15, 5.80, 'cocina'),
  ('b0000001-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000003',
   'Cerveza caña', 2.50, false, true, 'Rubia / lager 33 cl', 10.00, true, false, true, 1, 0.60, 'barra'),
  ('b0000001-0000-4000-8000-000000000006', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000003',
   'Agua mineral', 2.00, false, true, 'Con / sin gas 50 cl', 10.00, true, false, true, 0, 0.35, 'barra'),
  -- Entrantes extra
  ('b0000001-0000-4000-8000-000000000007', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000001',
   'Gazpacho andaluz (jarra)', 5.50, false, true, 'Tomate, pepino, pimiento — temporada', 10.00, false, false, true, 5, 1.40, 'cocina'),
  ('b0000001-0000-4000-8000-000000000008', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000001',
   'Huevos rotos con jamón', 8.50, false, true, 'Patatas paja, huevos fritos, jamón ibérico', 10.00, false, false, true, 12, 3.20, 'cocina'),
  ('b0000001-0000-4000-8000-000000000009', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000001',
   'Tabla de quesos nacionales', 12.00, false, true, 'Selección 4 quesos, mermelada de higo, frutos secos', 10.00, false, false, true, 5, 4.50, 'cocina'),
  ('b0000001-0000-4000-8000-00000000000a', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000001',
   'Anchoas del Cantábrico (6 uds)', 9.00, false, true, 'Sobre tomate rallado casero', 10.00, false, false, true, 5, 3.80, 'cocina'),
  -- Tapas y raciones
  ('b0000001-0000-4000-8000-00000000000b', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000004',
   'Patatas bravas', 5.50, false, true, 'Salsa brava picante y alioli', 10.00, false, false, true, 10, 1.50, 'cocina'),
  ('b0000001-0000-4000-8000-00000000000c', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000004',
   'Pimientos de Padrón', 6.50, false, true, 'Sal en escamas', 10.00, false, false, true, 8, 2.10, 'cocina'),
  ('b0000001-0000-4000-8000-00000000000d', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000004',
   'Pulpo a la gallega (ración)', 14.50, true, true, 'Pulpo, patata cachelos, pimentón y aceite', 10.00, false, false, true, 14, 6.20, 'cocina'),
  ('b0000001-0000-4000-8000-00000000000e', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000004',
   'Gambas al ajillo', 13.00, false, true, 'Gambón, ajo, guindilla — cazuela caliente', 10.00, false, false, true, 10, 5.50, 'cocina'),
  ('b0000001-0000-4000-8000-00000000000f', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000004',
   'Tortilla española (porción)', 4.00, false, true, 'Cebolla confitada opcional', 10.00, false, false, true, 15, 1.20, 'cocina'),
  ('b0000001-0000-4000-8000-000000000010', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000004',
   'Pan con tomate y jamón', 7.50, false, true, 'Jamón serrano, tomate rallado, aceite AOVE', 10.00, false, false, true, 6, 2.80, 'cocina'),
  ('b0000001-0000-4000-8000-000000000011', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000004',
   'Calamares a la romana', 11.00, false, true, 'Aros con limón y mayonesa ligera', 10.00, false, false, true, 12, 4.20, 'cocina'),
  -- Ensaladas
  ('b0000001-0000-4000-8000-000000000012', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000005',
   'Ensalada mixta', 7.00, false, true, 'Lechuga, tomate, cebolla, atún, huevo, aceitunas', 10.00, false, false, true, 6, 2.40, 'cocina'),
  ('b0000001-0000-4000-8000-000000000013', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000005',
   'Ensalada burrata con tomate', 10.50, false, true, 'Burrata, tomate heirloom, pesto, rúcula', 10.00, false, false, true, 7, 4.10, 'cocina'),
  ('b0000001-0000-4000-8000-000000000014', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000005',
   'Ensalada de quinoa y aguacate', 9.50, false, true, 'Quinoa, aguacate, granada, vinagreta de miel', 10.00, false, false, true, 8, 3.20, 'cocina'),
  -- Carnes
  ('b0000001-0000-4000-8000-000000000015', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000006',
   'Chuletón de ternera (1 kg aprox.)', 48.00, true, true, 'Maduración mínima 28 días, guarnición', 10.00, false, false, true, 25, 22.00, 'cocina'),
  ('b0000001-0000-4000-8000-000000000016', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000006',
   'Entrecot de vaca rubia', 22.00, true, true, 'Punto de la carne a elegir, chimichurri', 10.00, false, false, true, 20, 9.50, 'cocina'),
  ('b0000001-0000-4000-8000-000000000017', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000006',
   'Costillas BBQ (ración)', 16.00, true, true, 'Salsa barbacoa casera, ensalada coleslaw', 10.00, false, false, true, 22, 6.80, 'cocina'),
  ('b0000001-0000-4000-8000-000000000018', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000006',
   'Carrillada ibérica al vino tinto', 15.50, true, true, 'Lenta cocción, puré de patata', 10.00, false, false, true, 30, 6.20, 'cocina'),
  ('b0000001-0000-4000-8000-000000000019', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000006',
   'Pollo al ajillo', 12.50, true, true, 'Muslos confitados, ajos tiernos', 10.00, false, false, true, 25, 4.90, 'cocina'),
  -- Pescados
  ('b0000001-0000-4000-8000-00000000001a', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000007',
   'Lubina a la sal (2 pax)', 38.00, true, true, 'Lubina entera, guarnición de patatas', 10.00, false, false, true, 35, 16.00, 'cocina'),
  ('b0000001-0000-4000-8000-00000000001b', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000007',
   'Bacalao confitado con pil-pil', 17.50, true, true, 'Lomo de bacalao, emulsión pil-pil', 10.00, false, false, true, 18, 7.80, 'cocina')
ON CONFLICT (id) DO NOTHING;