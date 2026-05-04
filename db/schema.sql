-- ============================================
--   Distrito Sneakers — Schema Supabase
--   Pegar y ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

-- 1) TABLA DE PRODUCTOS ------------------------------------------------------
create table if not exists products (
  id           bigint primary key generated always as identity,
  name         text   not null,
  category     text   not null default 'zapatillas',
  price        integer not null,
  description  text,
  image_url    text,
  tag          text,
  featured     boolean default false,
  sizes        text[] default array['38','39','40','41','42','43','44','45'],
  colors       text[] default array['Negro'],
  active       boolean default true,
  created_at   timestamptz default now()
);

create index if not exists products_active_idx   on products(active);
create index if not exists products_featured_idx on products(featured);
create index if not exists products_category_idx on products(category);

-- 2) ROW LEVEL SECURITY ------------------------------------------------------
alter table products enable row level security;

-- Lectura pública SOLO de productos activos
drop policy if exists "Public read active products" on products;
create policy "Public read active products"
  on products for select
  using (active = true);

-- Lectura completa para admins logueados
drop policy if exists "Auth read all products" on products;
create policy "Auth read all products"
  on products for select
  to authenticated
  using (true);

-- Escritura solo para admins logueados
drop policy if exists "Auth insert products" on products;
create policy "Auth insert products"
  on products for insert
  to authenticated
  with check (true);

drop policy if exists "Auth update products" on products;
create policy "Auth update products"
  on products for update
  to authenticated
  using (true);

drop policy if exists "Auth delete products" on products;
create policy "Auth delete products"
  on products for delete
  to authenticated
  using (true);

-- 3) STORAGE BUCKET PARA IMÁGENES -------------------------------------------
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists "Public view product images" on storage.objects;
create policy "Public view product images"
  on storage.objects for select
  using (bucket_id = 'products');

drop policy if exists "Auth upload product images" on storage.objects;
create policy "Auth upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'products');

drop policy if exists "Auth update product images" on storage.objects;
create policy "Auth update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'products');

drop policy if exists "Auth delete product images" on storage.objects;
create policy "Auth delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'products');
