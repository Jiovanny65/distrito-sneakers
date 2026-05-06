-- ============================================
--   Fix DEFINITIVO: RLS publico para crear pedidos
--   Ejecutar en Supabase Dashboard → SQL Editor → Run
-- ============================================

-- 1) Asegurar que RLS este activo
alter table orders       enable row level security;
alter table order_events enable row level security;

-- 2) Borrar policies de INSERT existentes (cualquier nombre)
drop policy if exists "Public create orders"        on orders;
drop policy if exists "Public can create orders"    on orders;
drop policy if exists "Anyone can insert orders"    on orders;

drop policy if exists "Insert events from trigger"  on order_events;
drop policy if exists "Public can create order events" on order_events;

-- 3) Recrear con sintaxis explicita y simple (compatible con todas las versiones)
create policy orders_insert_anyone
  on orders for insert
  to public
  with check (true);

create policy events_insert_anyone
  on order_events for insert
  to public
  with check (true);

-- 4) Asegurar que el rol anon tenga GRANT en las tablas (a veces se pierde)
grant insert on orders to anon, authenticated;
grant insert on order_events to anon, authenticated;
grant usage, select on sequence orders_id_seq to anon, authenticated;
grant usage, select on sequence order_events_id_seq to anon, authenticated;

-- 5) Verificar resultados
select 'orders policies' as info, policyname, cmd, roles, qual, with_check
from pg_policies where tablename = 'orders';
