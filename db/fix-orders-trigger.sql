-- ============================================
--   Fix: Orders trigger
--   El trigger original era BEFORE INSERT y fallaba al
--   intentar crear order_events antes de que orders existiera.
--   Lo separamos en dos triggers: BEFORE para updated_at,
--   AFTER para los eventos.
--
--   Pegar y ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

-- Eliminar trigger antiguo
drop trigger if exists order_change_trg on orders;

-- Trigger 1: BEFORE UPDATE → solo actualizar updated_at
create or replace function set_orders_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists orders_updated_at_trg on orders;
create trigger orders_updated_at_trg
  before update on orders
  for each row execute function set_orders_updated_at();

-- Trigger 2: AFTER INSERT or UPDATE → registrar eventos
create or replace function log_order_event()
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
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists log_order_event_trg on orders;
create trigger log_order_event_trg
  after insert or update on orders
  for each row execute function log_order_event();
