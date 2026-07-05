-- ============================================
--   Speed Style CL — Migración de rebranding
--   Idempotente: se puede correr varias veces sin duplicar.
--   Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

-- 0) Snapshot rápido del estado ANTES de migrar
-- (útil para comparar el conteo final; no hace cambios)
do $$
declare
  total_prod   int;
  total_null   int;
  total_og     int;
begin
  select count(*) into total_prod from products;
  select count(*) into total_null from products where category_id is null;
  select count(*) into total_og
    from products
    where (quality_prices ? 'OG')
       or (coalesce(quality_prices ->> 'OG','') <> '');
  raise notice 'ANTES DE MIGRAR — total productos: %, sin categoria: %, con precio OG: %',
    total_prod, total_null, total_og;
end $$;


-- 1) CATEGORÍA "Zapatillas" ---------------------------------------------------
-- Insertar la categoría inicial (idempotente por slug).
insert into categories (name, slug, display_order)
values ('Zapatillas', 'zapatillas', 10)
on conflict (slug) do nothing;


-- 2) ASIGNAR PRODUCTOS EXISTENTES SIN CATEGORÍA -> "Zapatillas" ---------------
-- El catálogo actual son todas zapatillas: cualquier producto sin category_id
-- cae a "Zapatillas" para que ningún producto quede huérfano.
-- Esta operación NO toca los ya asignados (Jordan 1/3/4/6/11 del seed anterior).
update products
   set category_id = (select id from categories where slug = 'zapatillas')
 where category_id is null;


-- 3) MIGRAR CALIDAD "OG" -> "G5" ---------------------------------------------
-- Regla:
--   - Si el producto tiene precio OG y NO tiene G5 -> mover el valor OG a G5.
--   - Si tiene ambos -> conservar G5 (el mayor precio) y quitar OG.
-- Luego eliminar la clave "OG" del jsonb en todos los productos.
update products
   set quality_prices = jsonb_set(
         coalesce(quality_prices, '{}'::jsonb),
         '{G5}',
         to_jsonb((quality_prices ->> 'OG')::int)
       )
 where quality_prices ? 'OG'
   and not (quality_prices ? 'G5');

-- Ahora sí, purgar la clave OG en todos los productos.
update products
   set quality_prices = (quality_prices - 'OG')
 where quality_prices ? 'OG';

-- Si algún pedido/registro histórico tenía quality='OG', lo reasignamos a G5.
-- (No borra el pedido — sólo reetiqueta la calidad.)
update orders set quality = 'G5' where quality = 'OG';


-- 4) SETTINGS DE ROTACIÓN AUTOMÁTICA DE DESTACADOS ---------------------------
-- Guardamos configuración global en una tabla key/value.
create table if not exists app_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

alter table app_settings enable row level security;

drop policy if exists "Public read app_settings" on app_settings;
drop policy if exists "Auth write app_settings"  on app_settings;
drop policy if exists "Auth insert app_settings" on app_settings;
drop policy if exists "Auth update app_settings" on app_settings;

create policy "Public read app_settings"
  on app_settings for select to public using (true);
create policy "Auth insert app_settings"
  on app_settings for insert to authenticated with check (true);
create policy "Auth update app_settings"
  on app_settings for update to authenticated using (true);

grant select on app_settings to anon, authenticated;
grant insert, update on app_settings to authenticated;

-- Fila por defecto para la rotación de destacados.
-- Estructura del value:
-- {
--   "enabled": false,                        -- switch de rotación auto
--   "last_rotation_at": null,                -- ISO timestamp de la última rotación
--   "interval_hours": 3,                     -- cada cuántas horas rotar
--   "max_featured": 5,                       -- tope simultáneo
--   "manual_snapshot": []                    -- ids destacados manualmente antes de encender auto
-- }
insert into app_settings (key, value)
values (
  'featured_rotation',
  '{"enabled":false,"last_rotation_at":null,"interval_hours":3,"max_featured":5,"manual_snapshot":[]}'::jsonb
)
on conflict (key) do nothing;


-- 5) VERIFICACIÓN ------------------------------------------------------------
-- Conteos DESPUÉS de la migración.
do $$
declare
  total_prod       int;
  total_null       int;
  total_zapatillas int;
  total_og_left    int;
begin
  select count(*) into total_prod from products;
  select count(*) into total_null from products where category_id is null;
  select count(*)
    into total_zapatillas
    from products p
    join categories c on c.id = p.category_id
    where c.slug = 'zapatillas';
  select count(*)
    into total_og_left
    from products
    where (quality_prices ? 'OG')
       or (coalesce(quality_prices ->> 'OG','') <> '');

  raise notice 'DESPUES DE MIGRAR — total productos: %, sin categoria: %, en Zapatillas: %, con precio OG remanente: %',
    total_prod, total_null, total_zapatillas, total_og_left;
end $$;

-- Detalle por categoría para verificación visual:
select c.name as categoria,
       c.slug,
       c.display_order,
       count(p.id) as productos
  from categories c
  left join products p on p.category_id = c.id
 group by c.id, c.name, c.slug, c.display_order
 order by c.display_order nulls last, c.name;
