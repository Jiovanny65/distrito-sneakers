-- ============================================
--   Distrito Sneakers — Categorías por modelo
--   Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- 1) TABLA DE CATEGORÍAS -----------------------------------------------------
create table if not exists categories (
  id         bigint primary key generated always as identity,
  name       text not null,
  slug       text unique not null,
  image_url  text,
  created_at timestamptz default now()
);

create index if not exists categories_slug_idx on categories(slug);

-- 2) AGREGAR category_id A PRODUCTOS -----------------------------------------
alter table products
  add column if not exists category_id bigint references categories(id) on delete set null;

create index if not exists products_category_id_idx on products(category_id);

-- 3) RLS PARA CATEGORIES -----------------------------------------------------
alter table categories enable row level security;

drop policy if exists "Public read categories"  on categories;
drop policy if exists "Auth insert categories"  on categories;
drop policy if exists "Auth update categories"  on categories;
drop policy if exists "Auth delete categories"  on categories;

create policy "Public read categories"
  on categories for select
  to public using (true);

create policy "Auth insert categories"
  on categories for insert
  to authenticated with check (true);

create policy "Auth update categories"
  on categories for update
  to authenticated using (true);

create policy "Auth delete categories"
  on categories for delete
  to authenticated using (true);

grant select on categories to anon, authenticated;
grant insert, update, delete on categories to authenticated;
grant usage, select on sequence categories_id_seq to authenticated;

-- 4) STORAGE BUCKET PARA IMÁGENES DE CATEGORÍAS ------------------------------
insert into storage.buckets (id, name, public)
values ('categories', 'categories', true)
on conflict (id) do nothing;

drop policy if exists "Public view category images"  on storage.objects;
drop policy if exists "Auth upload category images"  on storage.objects;
drop policy if exists "Auth update category images"  on storage.objects;
drop policy if exists "Auth delete category images"  on storage.objects;

create policy "Public view category images"
  on storage.objects for select
  using (bucket_id = 'categories');

create policy "Auth upload category images"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'categories');

create policy "Auth update category images"
  on storage.objects for update
  to authenticated using (bucket_id = 'categories');

create policy "Auth delete category images"
  on storage.objects for delete
  to authenticated using (bucket_id = 'categories');

-- 5) SEED: 5 CATEGORÍAS JORDAN RETRO ----------------------------------------
insert into categories (name, slug) values
  ('Jordan Retro 1',  'jordan-retro-1'),
  ('Jordan Retro 3',  'jordan-retro-3'),
  ('Jordan Retro 4',  'jordan-retro-4'),
  ('Jordan Retro 6',  'jordan-retro-6'),
  ('Jordan Retro 11', 'jordan-retro-11')
on conflict (slug) do nothing;

-- 6) AUTO-ASIGNAR PRODUCTOS EXISTENTES A SU CATEGORÍA ------------------------
-- Jordan 1
update products set category_id = (select id from categories where slug = 'jordan-retro-1')
where category_id is null and (
  name ilike '%air jordan 1 %' or name ilike '%aj1 %' or
  name ilike '%(gs) air jordan 1 %' or name ~* 'jordan 1 (low|retro|high)'
);

-- Jordan 3
update products set category_id = (select id from categories where slug = 'jordan-retro-3')
where category_id is null and (
  name ilike '%air jordan 3 %' or name ilike '%aj3 %' or name ilike '%(gs) air jordan 3 %'
);

-- Jordan 4
update products set category_id = (select id from categories where slug = 'jordan-retro-4')
where category_id is null and (
  name ilike '%air jordan 4 %' or name ilike '%aj4 %'
);

-- Jordan 5 (no es categoría inicial pero por si acaso queda sin asignar)
-- (no asignar)

-- Jordan 6
update products set category_id = (select id from categories where slug = 'jordan-retro-6')
where category_id is null and (
  name ilike '%air jordan 6 %' or name ilike '%aj6 %'
);

-- Jordan 11
update products set category_id = (select id from categories where slug = 'jordan-retro-11')
where category_id is null and (
  name ilike '%air jordan 11 %' or name ilike '%aj11 %' or name ilike '%(gs) air jordan 11 %'
);

-- 7) VERIFICAR ASIGNACIONES --------------------------------------------------
select c.name as categoria, count(p.id) as productos
from categories c
left join products p on p.category_id = c.id
group by c.id, c.name
order by c.name;
