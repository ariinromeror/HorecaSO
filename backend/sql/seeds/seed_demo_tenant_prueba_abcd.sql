-- =============================================================================
-- SEED DEMO — Restaurante Prueba (Fases A→D en orden alfabético del plan)
-- Prerequisito: migration_fase_b.sql ejecutado (tenant 1111…, outlet 2222…, usuarios @prueba.com, mesas).
-- Ejecutar en Supabase → SQL Editor (o psql). Re-ejecutable: ON CONFLICT DO NOTHING.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FASE A — Carta (categorías + productos), almacén (artículos + lotes FIFO)
-- Carta amplia tipo restaurante español / mediterráneo (demo). IDs b001–b006 fijos para tickets Fase C.
-- -----------------------------------------------------------------------------
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
   'Bacalao confitado con pil-pil', 17.50, true, true, 'Lomo de bacalao, emulsión pil-pil', 10.00, false, false, true, 18, 7.80, 'cocina'),
  ('b0000001-0000-4000-8000-00000000001c', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000007',
   'Mejillones a la marinera', 11.50, false, true, 'Tomate, vino blanco, perejil', 10.00, false, false, true, 14, 4.50, 'cocina'),
  ('b0000001-0000-4000-8000-00000000001d', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000007',
   'Fritura variada (ración)', 16.50, false, true, 'Boquerón, calamar, cazón — limón', 10.00, false, false, true, 12, 6.50, 'cocina'),
  ('b0000001-0000-4000-8000-00000000001e', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000007',
   'Paella de marisco (min. 2 pax)', 18.00, true, true, 'Por persona — encargar con antelación', 10.00, false, false, true, 40, 7.50, 'cocina'),
  -- Arroces y pastas
  ('b0000001-0000-4000-8000-00000000001f', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000008',
   'Spaghetti carbonara', 11.00, true, true, 'Guanciale, huevo, pecorino', 10.00, false, false, true, 14, 3.80, 'cocina'),
  ('b0000001-0000-4000-8000-000000000020', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000008',
   'Risotto de setas porcini', 13.50, true, true, 'Arroz carnaroli, parmesano, trufa opcional (+3€)', 10.00, false, false, true, 22, 5.20, 'cocina'),
  ('b0000001-0000-4000-8000-000000000021', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000008',
   'Canelones de carne gratinados', 10.50, true, true, 'Bechamel, queso gratinado', 10.00, false, false, true, 20, 3.90, 'cocina'),
  ('b0000001-0000-4000-8000-000000000022', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000008',
   'Arroz negro con alioli', 14.00, true, true, 'Sepia, tinta — para mínimo 2', 10.00, false, false, true, 35, 5.80, 'cocina'),
  -- Principales extra (categoría 2)
  ('b0000001-0000-4000-8000-000000000023', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000002',
   'Cordero asado al horno', 19.00, true, true, 'Paletilla, hierbas aromáticas, patatas asadas', 10.00, false, false, true, 40, 8.50, 'cocina'),
  ('b0000001-0000-4000-8000-000000000024', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000002',
   'Lasaña de la casa', 11.50, true, true, 'Carne, bechamel, gratinada', 10.00, false, false, true, 25, 4.20, 'cocina'),
  -- Postres
  ('b0000001-0000-4000-8000-000000000025', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000009',
   'Tarta de queso casera', 6.50, false, true, 'Base galleta, coulis de frutos rojos', 10.00, false, false, true, 5, 2.10, 'cocina'),
  ('b0000001-0000-4000-8000-000000000026', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000009',
   'Brownie con helado de vainilla', 6.00, false, true, 'Chocolate intenso, helado artesanal', 10.00, false, false, true, 5, 1.90, 'cocina'),
  ('b0000001-0000-4000-8000-000000000027', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000009',
   'Flan de huevo casero', 4.50, false, true, 'Caramelo líquido', 10.00, false, false, true, 2, 1.20, 'cocina'),
  ('b0000001-0000-4000-8000-000000000028', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000009',
   'Fruta de temporada', 4.00, false, true, 'Consultar al equipo', 10.00, false, false, true, 3, 1.00, 'cocina'),
  ('b0000001-0000-4000-8000-000000000029', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000009',
   'Crema catalana', 5.00, false, true, 'Canela y limón — quemada al momento', 10.00, false, false, true, 8, 1.50, 'cocina'),
  -- Refrescos y aguas (003)
  ('b0000001-0000-4000-8000-00000000002a', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000003',
   'Refresco lata', 2.80, false, true, 'Cola, naranja, limón — consultar', 10.00, true, false, true, 0, 0.55, 'barra'),
  ('b0000001-0000-4000-8000-00000000002b', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000003',
   'Zumo natural de naranja', 3.50, false, true, 'Exprimido al momento', 10.00, true, false, true, 3, 1.20, 'barra'),
  ('b0000001-0000-4000-8000-00000000002c', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000003',
   'Tónica premium 20 cl', 3.00, false, true, 'Para combinados', 10.00, true, false, true, 1, 0.70, 'barra'),
  ('b0000001-0000-4000-8000-00000000002d', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000003',
   'Limonada casera (jarra 1 L)', 7.00, false, true, 'Limón, menta, hielo', 10.00, true, false, true, 5, 1.80, 'barra'),
  -- Vinos y cavas
  ('b0000001-0000-4000-8000-00000000002e', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-00000000000a',
   'Rioja crianza (copa)', 4.00, false, true, 'D.O. Rioja — 15 cl', 10.00, true, false, true, 1, 1.40, 'barra'),
  ('b0000001-0000-4000-8000-00000000002f', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-00000000000a',
   'Verdejo Rueda (copa)', 3.80, false, true, 'Blanco fresco — 15 cl', 10.00, true, false, true, 1, 1.30, 'barra'),
  ('b0000001-0000-4000-8000-000000000030', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-00000000000a',
   'Cava brut (copa)', 4.50, false, true, 'D.O. Cava — 12 cl', 10.00, true, false, true, 1, 1.60, 'barra'),
  ('b0000001-0000-4000-8000-000000000031', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-00000000000a',
   'Botella Rioja reserva', 22.00, false, true, '75 cl — consultar añada', 10.00, true, false, true, 1, 9.50, 'barra'),
  -- Cafés y licores
  ('b0000001-0000-4000-8000-000000000032', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-00000000000b',
   'Café solo', 1.80, false, true, 'Arábica mezcla casa', 10.00, true, false, true, 2, 0.35, 'barra'),
  ('b0000001-0000-4000-8000-000000000033', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-00000000000b',
   'Café con leche', 2.20, false, true, 'Leche entera / avena (+0,30€)', 10.00, true, false, true, 3, 0.50, 'barra'),
  ('b0000001-0000-4000-8000-000000000034', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-00000000000b',
   'Cortado', 2.00, false, true, 'Espresso con poco leche', 10.00, true, false, true, 2, 0.42, 'barra'),
  ('b0000001-0000-4000-8000-000000000035', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-00000000000b',
   'Carajillo', 3.50, false, true, 'Café, brandy, cáscara de limón', 10.00, true, false, true, 3, 1.10, 'barra'),
  ('b0000001-0000-4000-8000-000000000036', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-00000000000b',
   'Infusiones', 2.00, false, true, 'Manzanilla, menta, rooibos', 10.00, true, false, true, 3, 0.40, 'barra'),
  ('b0000001-0000-4000-8000-000000000037', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-00000000000b',
   'Copa de Orujo o Pacharán', 4.00, false, true, 'Digestivo — 4 cl', 10.00, true, false, true, 1, 1.20, 'barra'),
  -- Menú del día (marcado es_menu)
  ('b0000001-0000-4000-8000-000000000038', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-4000-8000-000000000002',
   'Menú del día (L–V)', 14.50, false, true, 'Primeros, segundo, postre, pan y bebida — consultar carta del día', 10.00, false, true, true, 2, 6.00, 'cocina')
ON CONFLICT (id) DO NOTHING;

INSERT INTO articulos (
  id, tenant_id, nombre, sku, unidad_medida, stock_actual, stock_minimo,
  coste_unitario, categoria_almacen, temperatura_almacen, stock_maximo
)
VALUES
  ('c0000001-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Aceite oliva virgen extra 5L', 'ALM-AOV-5L', 'L', 12, 3, 28.00, 'Seco', 'ambiente', 40),
  ('c0000001-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Queso curado lonchas', 'ALM-QUE-001', 'kg', 8, 2, 9.50, 'Refrigerado', '4C', 20),
  ('c0000001-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Tomate pera', 'ALM-TOM-001', 'kg', 1, 5, 1.20, 'Fresco', '12C', 30),
  ('c0000001-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111',
   'Vino tinto crianza', 'ALM-VIN-001', 'bot', 20, 4, 4.80, 'Bebidas', '15C', 60)
ON CONFLICT (id) DO NOTHING;

-- Lotes FIFO (outlet demo)
INSERT INTO lotes_inventario (id, articulo_id, outlet_id, cantidad, coste_unitario, fecha_caducidad, numero_lote)
VALUES
  ('d0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', 6, 28.00, CURRENT_DATE + 180, 'LOTE-AOV-2026-A'),
  ('d0000001-0000-4000-8000-000000000002', 'c0000001-0000-4000-8000-000000000002', '22222222-2222-2222-2222-222222222222', 4, 9.50, CURRENT_DATE + 45, 'LOTE-QUE-2026-01'),
  ('d0000001-0000-4000-8000-000000000003', 'c0000001-0000-4000-8000-000000000003', '22222222-2222-2222-2222-222222222222', 15, 1.20, CURRENT_DATE + 7, 'LOTE-TOM-2026-B'),
  ('d0000001-0000-4000-8000-000000000004', 'c0000001-0000-4000-8000-000000000004', '22222222-2222-2222-2222-222222222222', 24, 4.80, NULL, 'LOTE-VIN-001')
ON CONFLICT (id) DO NOTHING;

UPDATE articulos SET stock_actual = 12, stock_minimo = 3 WHERE id = 'c0000001-0000-4000-8000-000000000001';
UPDATE articulos SET stock_actual = 8, stock_minimo = 2 WHERE id = 'c0000001-0000-4000-8000-000000000002';
UPDATE articulos SET stock_actual = 1, stock_minimo = 5 WHERE id = 'c0000001-0000-4000-8000-000000000003';
UPDATE articulos SET stock_actual = 20, stock_minimo = 4 WHERE id = 'c0000001-0000-4000-8000-000000000004';

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

-- Fin seed demo (A→D)
