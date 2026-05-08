-- ============================================
--   Agregar orden manual a categorías y productos
--   Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- 1) Columna display_order en ambas tablas
alter table categories add column if not exists display_order integer default 0;
alter table products   add column if not exists display_order integer default 0;

create index if not exists categories_order_idx on categories(display_order);
create index if not exists products_order_idx   on products(display_order);

-- 2) Inicializar orden actual basado en el orden alfabético
-- (sólo donde aún no se haya seteado un orden manual)
update categories
set display_order = sub.row_num
from (
  select id, (row_number() over (order by name)) * 10 as row_num
  from categories
) sub
where categories.id = sub.id and (categories.display_order is null or categories.display_order = 0);

update products
set display_order = sub.row_num
from (
  select id, (row_number() over (partition by category_id order by name)) * 10 as row_num
  from products
) sub
where products.id = sub.id and (products.display_order is null or products.display_order = 0);
