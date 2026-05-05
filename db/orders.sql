-- ============================================
--   Distrito Sneakers — Schema de Pedidos
--   Pegar y ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

-- 1) TABLA DE PEDIDOS --------------------------------------------------------
create table if not exists orders (
  id bigint primary key generated always as identity,

  -- Cliente
  customer_name  text not null,
  customer_phone text not null,
  customer_email text,

  -- Producto
  product_id        bigint references products(id) on delete set null,
  product_name      text not null,
  product_image_url text,
  size              text,
  color             text,
  quality           text,
  quantity          integer not null default 1,
  unit_price        integer not null,
  total             integer not null,

  -- Entrega
  delivery_method text,
  region          text,
  comuna          text,
  street          text,
  apartment       text,
  zip_code        text,
  full_address    text,
  comments        text,

  -- Pago
  payment_method        text not null default 'whatsapp',   -- whatsapp | mercadopago
  mp_payment_id         text,
  mp_status             text,                                -- approved | pending | rejected
  mp_external_reference text unique,

  -- Estado del pedido
  status      text not null default 'pending',
                            -- pending | confirmed | preparing | shipped | delivered | cancelled
  admin_notes text,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists orders_status_idx       on orders(status);
create index if not exists orders_created_idx      on orders(created_at desc);
create index if not exists orders_payment_idx      on orders(payment_method);
create index if not exists orders_mp_extref_idx    on orders(mp_external_reference);

-- 2) TABLA DE EVENTOS / HISTORIAL --------------------------------------------
create table if not exists order_events (
  id bigint primary key generated always as identity,
  order_id    bigint references orders(id) on delete cascade,
  event_type  text not null,    -- created | status_changed | payment_received | note_added
  from_status text,
  to_status   text,
  description text,
  actor       text,             -- whatsapp | mercadopago | admin | system
  created_at  timestamptz default now()
);

create index if not exists order_events_order_idx on order_events(order_id, created_at);

-- 3) TRIGGER PARA AUTO-LOG DE CAMBIOS ----------------------------------------
create or replace function log_order_change()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    insert into order_events (order_id, event_type, to_status, description, actor)
    values (NEW.id, 'created', NEW.status,
            'Pedido creado vía ' || NEW.payment_method,
            NEW.payment_method);
  elsif (TG_OP = 'UPDATE') then
    if NEW.status is distinct from OLD.status then
      insert into order_events (order_id, event_type, from_status, to_status, description, actor)
      values (NEW.id, 'status_changed', OLD.status, NEW.status,
              'Estado cambiado: ' || OLD.status || ' → ' || NEW.status,
              'admin');
    end if;
    if NEW.mp_status is distinct from OLD.mp_status and NEW.mp_status is not null then
      insert into order_events (order_id, event_type, description, actor)
      values (NEW.id, 'payment_received',
              'Estado de pago MP: ' || NEW.mp_status,
              'mercadopago');
    end if;
    NEW.updated_at = now();
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists order_change_trg on orders;
create trigger order_change_trg
  before insert or update on orders
  for each row execute function log_order_change();

-- 4) RPC PARA WEBHOOK DE MP (sin necesidad de service key) ------------------
create or replace function mark_order_paid(
  p_external_ref text,
  p_payment_id   text,
  p_status       text
) returns json
language plpgsql
security definer
as $$
declare
  v_order orders%rowtype;
begin
  update orders
     set mp_payment_id = p_payment_id,
         mp_status     = p_status,
         status        = case
                            when p_status = 'approved' and status = 'pending' then 'confirmed'
                            else status
                          end
   where mp_external_reference = p_external_ref
   returning * into v_order;

  if v_order.id is null then
    return json_build_object('ok', false, 'message', 'Order not found');
  end if;
  return json_build_object('ok', true, 'order_id', v_order.id, 'status', v_order.status);
end;
$$;

grant execute on function mark_order_paid(text, text, text) to anon;
grant execute on function mark_order_paid(text, text, text) to authenticated;

-- 5) ROW LEVEL SECURITY ------------------------------------------------------
alter table orders       enable row level security;
alter table order_events enable row level security;

-- Pedidos: cualquiera puede CREAR (un cliente registrando su pedido)
drop policy if exists "Public create orders" on orders;
create policy "Public create orders"
  on orders for insert
  with check (true);

-- Pedidos: solo admin puede leer/modificar
drop policy if exists "Auth read orders" on orders;
create policy "Auth read orders"
  on orders for select
  to authenticated
  using (true);

drop policy if exists "Auth update orders" on orders;
create policy "Auth update orders"
  on orders for update
  to authenticated
  using (true);

drop policy if exists "Auth delete orders" on orders;
create policy "Auth delete orders"
  on orders for delete
  to authenticated
  using (true);

-- Eventos: trigger los crea, admin los lee
drop policy if exists "Auth read events" on order_events;
create policy "Auth read events"
  on order_events for select
  to authenticated
  using (true);

drop policy if exists "Insert events from trigger" on order_events;
create policy "Insert events from trigger"
  on order_events for insert
  with check (true);
