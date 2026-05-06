-- ============================================
--   Fix: RLS para INSERT publico de orders
--   La policy original no se aplico al rol anon.
--   Tambien limpia ordenes de prueba.
--
--   Pegar y ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

-- 1) Borrar pedidos de prueba que cree con curl
delete from orders where customer_name in ('TEST AUTH', 'TEST POST-FIX', 'TEST DIAG');

-- 2) Recrear la policy de INSERT publico, esta vez explicita
drop policy if exists "Public create orders" on orders;
create policy "Public create orders"
  on orders for insert
  to anon, authenticated
  with check (true);

-- 3) Lo mismo para order_events (el trigger inserta como el usuario que dispara)
drop policy if exists "Insert events from trigger" on order_events;
create policy "Insert events from trigger"
  on order_events for insert
  to anon, authenticated
  with check (true);
