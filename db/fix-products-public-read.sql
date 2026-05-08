-- ============================================
--   Fix: Permitir lectura pública de TODOS los productos
--   (incluyendo los marcados como inactive=false)
--   para que aparezcan al filtrar por categoría.
--   Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- Borrar policy antigua que filtraba por active=true
drop policy if exists "Public read active products" on products;
drop policy if exists "Public can read active products" on products;

-- Nueva policy: todos los productos visibles públicamente.
-- El admin sigue pudiendo marcar active=false como filtro lógico
-- pero ya no se aplica a nivel de RLS.
create policy "Public read all products"
  on products for select
  to public
  using (true);
