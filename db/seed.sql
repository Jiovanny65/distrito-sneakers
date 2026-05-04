-- ============================================
--   Distrito Sneakers — Seed inicial de productos
--   Ejecutar DESPUÉS de schema.sql
-- ============================================

insert into products (name, category, price, description, image_url, tag, featured, sizes, colors) values

-- ====== TOP BESTSELLERS ======
('Air Jordan 4 Retro ''Black Cat''', 'zapatillas', 89990,
 'Modelo retro clásico en colorway Black Cat. Diseño totalmente negro con detalles plateados y suela traslúcida.',
 'https://dripping.cl/cdn/shop/files/main-square_540x_41acee71-d690-449b-818a-2af59ba605e2.jpg?v=1747037163&width=533',
 'Top Ventas', true,
 array['38','39','40','41','42','43','44','45'], array['Black Cat']),

('Air Jordan 5 Retro OG ''Black Metallic Reimagined''', 'zapatillas', 89990,
 'Versión reimaginada del icónico Jordan 5 con acabados metálicos plateados y suela traslúcida.',
 'https://dripping.cl/cdn/shop/files/main-square_540x_d1230ff0-6a25-4e3a-9535-9a7fa196a5b5.jpg?v=1747812194&width=533',
 'Reimagined', true,
 array['38','39','40','41','42','43','44','45'], array['Black Metallic']),

('Nike Shox TL Black Metallic Hematite', 'zapatillas', 89990,
 'Sistema de amortiguación Shox icónico con acabados metálicos hematite. Tecnología y estilo retro-futurista.',
 'https://dripping.cl/cdn/shop/files/Capturadepantalla_894.png?v=1744159265&width=533',
 'Top', true,
 array['38','39','40','41','42','43','44','45'], array['Black Metallic Hematite']),

('Nike Air VaporMax Plus ''Triple Black''', 'zapatillas', 89990,
 'VaporMax Plus en monocromático negro total. Tecnología Air visible y silueta agresiva.',
 'https://dripping.cl/cdn/shop/files/main-square_1920x_ada37780-97ea-40aa-9c4b-89739dd275ca.jpg?v=1759598372&width=533',
 null, false,
 array['38','39','40','41','42','43','44','45'], array['Triple Black']),

('Nike Air Max Plus Black Silver White', 'zapatillas', 89990,
 'El icónico TN en combinación negro, plata y blanco. Tubular Air visible y diseño inconfundible.',
 'https://dripping.cl/cdn/shop/files/Capturadepantalla_384_9947e6df-9454-4ff8-80d9-601f648eca5e.png?v=1744159938&width=533',
 'Clásico', true,
 array['38','39','40','41','42','43','44','45'], array['Black/Silver/White']),

('Nike Air More Uptempo Black White', 'zapatillas', 89990,
 'El clásico AIR gigante en blanco y negro. Comodidad de los 90s con presencia callejera total.',
 'https://dripping.cl/cdn/shop/files/Capturadepantalla_964.png?v=1744159519&width=533',
 null, false,
 array['38','39','40','41','42','43','44','45'], array['Black/White']),

('Nike Air Force 1 Low ''07 ''Triple White''', 'zapatillas', 89990,
 'El AF1 más versátil de todos los tiempos. Cuero blanco premium, suela acolchada Air-Sole.',
 'https://dripping.cl/cdn/shop/files/main-square_540x_5097dcea-eeef-49ef-81d0-d984a6859583.jpg?v=1747865232&width=533',
 'Atemporal', true,
 array['38','39','40','41','42','43','44','45'], array['Triple White']),

('Nike x CPFM Air Force 1 Low Premium ''White''', 'zapatillas', 89990,
 'Colaboración exclusiva Nike x Cactus Plant Flea Market. AF1 con detalles únicos.',
 'https://dripping.cl/cdn/shop/files/main-square_1200x_a3bf7583-b7cf-46d2-aba7-aa42bd40712b.jpg?v=1759764202&width=533',
 'Colaboración', false,
 array['38','39','40','41','42','43','44','45'], array['White']),

('Nike x Travis Scott CPFM AF1 Low Premium ''Black''', 'zapatillas', 89990,
 'Triple colaboración Nike x Travis Scott x Cactus Plant Flea Market en negro.',
 'https://dripping.cl/cdn/shop/files/main-square_640x_bbea7146-2afe-4c33-9256-4b29ffba1383.jpg?v=1756132109&width=533',
 'Edición Limitada', false,
 array['38','39','40','41','42','43','44','45'], array['Black']),

-- ====== TRAVIS SCOTT ======
('Air Jordan 1 Low OG SP x Travis Scott ''Black Phantom''', 'zapatillas', 89990,
 'Jordan 1 Low x Travis Scott en colorway Black Phantom. Swoosh invertido y detalles Cactus Jack.',
 'https://dripping.cl/cdn/shop/files/main-square_640x_014b4cd2-a23c-40b8-b8f5-ccff1bae0d36.jpg?v=1756132104&width=533',
 'Travis Scott', true,
 array['38','39','40','41','42','43','44','45'], array['Black Phantom']),

('Air Jordan 1 Retro Low OG SP x Travis Scott ''Medium Olive''', 'zapatillas', 89990,
 'Jordan 1 Low x Travis Scott en tonos Medium Olive. Calidad premium con la firma Cactus Jack.',
 'https://dripping.cl/cdn/shop/files/main-square_1920x_7ac81d55-cc14-4ee5-882b-d7752d859dd4.jpg?v=1756037147&width=533',
 'Travis Scott', false,
 array['38','39','40','41','42','43','44','45'], array['Medium Olive']),

('Air Jordan x Travis Scott Jumpman Jack TR ''Dark Mocha''', 'zapatillas', 94990,
 'Jumpman Jack TR diseñado por Travis Scott en Dark Mocha.',
 'https://dripping.cl/cdn/shop/files/main-square_640x_a5b7c1dd-f0bc-4bc1-9b15-3b3af3f97a58.jpg?v=1756132098&width=533',
 'Travis Scott', false,
 array['38','39','40','41','42','43','44','45'], array['Dark Mocha']),

('Air Jordan 1 Retro Low OG SP x Travis Scott ''Velvet Brown''', 'zapatillas', 89990,
 'Edición Velvet Brown del AJ1 Low Travis Scott. Cuero terciopelo con swoosh invertido.',
 'https://dripping.cl/cdn/shop/files/main-square_1920x_a09f103c-cf49-41bc-91b0-79d9a4c6d437.jpg?v=1756037131&width=533',
 'Travis Scott', false,
 array['38','39','40','41','42','43','44','45'], array['Velvet Brown']),

('Air Jordan 1 Retro High OG x Travis Scott ''Mocha''', 'zapatillas', 89990,
 'El grial. AJ1 High Travis Scott en Mocha, una de las colaboraciones más buscadas.',
 'https://dripping.cl/cdn/shop/files/main-square_640x_b0649ed5-3d63-4c55-8f67-20e4c87ad5bc.jpg?v=1756132117&width=533',
 'Grail', true,
 array['38','39','40','41','42','43','44','45'], array['Mocha']),

('Nike x Travis Scott Air Force 1 ''White''', 'zapatillas', 89990,
 'AF1 Travis Scott en blanco con bolsillos laterales y branding Cactus Jack.',
 'https://dripping.cl/cdn/shop/files/main-square_640x_8898c28e-dbe9-48db-918a-b2c2998f527d.jpg?v=1756132122&width=533',
 'Travis Scott', false,
 array['38','39','40','41','42','43','44','45'], array['White']),

('Air Jordan 1 Retro High x Fragment x Travis Scott ''Sail''', 'zapatillas', 89990,
 'Triple colaboración: Jordan x Fragment Design x Travis Scott. Sail, Black y Military Blue.',
 'https://dripping.cl/cdn/shop/files/main-square_1920x_8e42281f-aa10-4a13-924f-39cc8a29d440.jpg?v=1756030886&width=533',
 'Triple Colab', false,
 array['38','39','40','41','42','43','44','45'], array['Sail/Black/Military Blue']),

('Air Jordan 6 Retro x Travis Scott ''British Khaki''', 'zapatillas', 89990,
 'AJ6 Travis Scott en British Khaki. Bolsillo lateral característico.',
 'https://dripping.cl/cdn/shop/files/main-square_640x_5489f885-43e2-4b1a-b79b-dd7d0b395572.jpg?v=1756132107&width=533',
 'Travis Scott', false,
 array['38','39','40','41','42','43','44','45'], array['British Khaki']),

('Nike x Travis Scott Air Force 1 Low ''Cactus Jack''', 'zapatillas', 89990,
 'AF1 Cactus Jack original. Bolsillos laterales, cordones intercambiables.',
 'https://dripping.cl/cdn/shop/files/main-square_640x_ce96aaae-1035-49e8-9878-bfb677d1d489.jpg?v=1756132112&width=533',
 'Cactus Jack', false,
 array['38','39','40','41','42','43','44','45'], array['Cactus Jack']),

('Air Jordan x Travis Scott Jumpman Jack TR ''Sail''', 'zapatillas', 94990,
 'Jumpman Jack TR en Sail por Travis Scott.',
 'https://dripping.cl/cdn/shop/files/main-square_640x_2a1156d4-3b2f-4eb2-9e46-588769627b0d.jpg?v=1756132101&width=533',
 'Travis Scott', false,
 array['38','39','40','41','42','43','44','45'], array['Sail']),

('Air Jordan 6 Retro x Travis Scott ''Olive''', 'zapatillas', 89990,
 'AJ6 Travis Scott en colorway Olive.',
 'https://dripping.cl/cdn/shop/files/main-square_540x_dd07aca5-4748-4bda-b9ac-27b92c9f537e.jpg?v=1747814471&width=533',
 'Travis Scott', false,
 array['38','39','40','41','42','43','44','45'], array['Olive']),

('Air Jordan 4 Retro x Travis Scott ''Cactus Jack''', 'zapatillas', 89990,
 'El AJ4 Cactus Jack. Una de las colaboraciones más buscadas en la cultura sneaker.',
 'https://dripping.cl/cdn/shop/files/main-square_540x_dec38f3e-160d-49e9-9bb2-af60ab6aa157.jpg?v=1747037181&width=533',
 'Holy Grail', true,
 array['38','39','40','41','42','43','44','45'], array['Cactus Jack']),

-- ====== GS (GRADE SCHOOL) ======
('(GS) Air Jordan 11 Retro ''Bred'' 2019', 'zapatillas', 89990,
 'Versión Grade School del icónico AJ11 Bred 2019. Charol negro, base roja y suela traslúcida.',
 'https://dripping.cl/cdn/shop/files/main-square_540x_eaae6549-5c84-40a6-be49-c25f8fc956d4.jpg?v=1754617178&width=533',
 'GS', false,
 array['35','36','37','38','39','40'], array['Black/Red']),

('(GS) Air Jordan 11 Retro ''Concord'' 2018', 'zapatillas', 89990,
 'AJ11 Concord 2018 en talles GS.',
 'https://dripping.cl/cdn/shop/files/main-square_540x_27ab7b4b-1fff-4a41-bb23-bfa63c179eb9.jpg?v=1754617184&width=533',
 'GS', false,
 array['35','36','37','38','39','40'], array['White/Concord']),

('(GS) Air Jordan 11 Retro ''DMP Gratitude'' 2023', 'zapatillas', 89990,
 'AJ11 Defining Moments Pack Gratitude 2023 en GS. Charol negro con detalles dorados.',
 'https://dripping.cl/cdn/shop/files/main-square_540x_6a28fbeb-5038-471c-bfa4-b4bff0a2d1db.jpg?v=1754617172&width=533',
 'GS', false,
 array['35','36','37','38','39','40'], array['Black/Metallic Gold']),

('(GS) Air Jordan 13 Retro ''Atmosphere Grey''', 'zapatillas', 89990,
 'AJ13 Atmosphere Grey en talles Grade School.',
 'https://dripping.cl/cdn/shop/files/main-square_540x_ec114513-3120-441d-9970-7312bf49ea51.jpg?v=1747806556&width=533',
 'GS', false,
 array['35','36','37','38','39','40'], array['Atmosphere Grey']),

('(GS) Air Jordan 3 Retro ''Fire Red'' 2022', 'zapatillas', 89990,
 'AJ3 Fire Red 2022 en GS. Cuero elephant print con acentos rojos. Clásico de Tinker Hatfield.',
 'https://dripping.cl/cdn/shop/files/main-square_540x_e3103d39-4c8e-4de0-96f2-4348a73b5f8e.jpg?v=1747119444&width=533',
 'GS', false,
 array['35','36','37','38','39','40'], array['White/Fire Red']);
