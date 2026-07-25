-- ============================================
--   Speed Style CL — Secciones del navbar
--   Agrega columna `section` a categories para agrupar en el navbar
--   en 3 dropdowns: Zapatillas / Ropa / Gorros.
--   Idempotente: se puede correr varias veces.
--   Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================

-- 0) SNAPSHOT PRE-MIGRACIÓN
do $$
declare
  total_cat int;
  cols_exist boolean;
begin
  select count(*) into total_cat from categories;
  select exists (
    select 1 from information_schema.columns
    where table_name = 'categories' and column_name = 'section'
  ) into cols_exist;
  raise notice 'ANTES — categorías: %, columna section ya existe: %',
    total_cat, cols_exist;
end $$;


-- 1) AGREGAR COLUMNA section --------------------------------------------------
alter table categories
  add column if not exists section text default 'zapatillas';


-- 2) BACKFILL: todas las categorías existentes → 'zapatillas' -----------------
-- (Si por alguna razón quedaron con section=null tras el ADD)
update categories
   set section = 'zapatillas'
 where section is null or trim(section) = '';


-- 3) CHECK CONSTRAINT: solo aceptar los 3 valores permitidos -----------------
-- Se agrega como NOT VALID (no verifica filas existentes al crearla),
-- y luego intentamos VALIDATE (fallará si hay filas inválidas, y lo notificamos).
alter table categories
  drop constraint if exists categories_section_check;

alter table categories
  add constraint categories_section_check
  check (section in ('zapatillas', 'ropa', 'gorros')) not valid;

do $$
begin
  alter table categories validate constraint categories_section_check;
  raise notice 'Check constraint validado OK ✓';
exception when others then
  raise notice 'Check constraint NO validado — revisar filas: %', sqlerrm;
end $$;


-- 4) DEFAULT explícito para inserts futuros ----------------------------------
alter table categories
  alter column section set default 'zapatillas';

alter table categories
  alter column section set not null;


-- 5) INDEX para queries por sección ------------------------------------------
create index if not exists categories_section_idx on categories(section);


-- 6) VERIFICACIÓN ------------------------------------------------------------
do $$
declare
  total_cat  int;
  s_zap      int;
  s_ropa     int;
  s_gorros   int;
  s_nulos    int;
begin
  select count(*) into total_cat from categories;
  select count(*) into s_zap    from categories where section = 'zapatillas';
  select count(*) into s_ropa   from categories where section = 'ropa';
  select count(*) into s_gorros from categories where section = 'gorros';
  select count(*) into s_nulos  from categories where section is null;
  raise notice 'DESPUÉS — total: %, zapatillas: %, ropa: %, gorros: %, sin sección: %',
    total_cat, s_zap, s_ropa, s_gorros, s_nulos;
end $$;

-- Detalle: categorías agrupadas por sección
select section,
       count(*) as total_categorias,
       array_agg(name order by display_order nulls last, name) as categorias
  from categories
 group by section
 order by section;
