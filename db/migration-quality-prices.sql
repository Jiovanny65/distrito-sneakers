-- ============================================
--   Migration: Precios por calidad por producto
--   Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================

-- Agregar columna jsonb para precios por calidad
-- Formato: { "PK": 89990, "G5": 119990, "OG": 199990 }
-- Si esta vacia o null, se usa el `price` base para todas las calidades.
alter table products
  add column if not exists quality_prices jsonb;

-- Indice opcional para busquedas
create index if not exists products_quality_prices_idx
  on products using gin (quality_prices);

-- Ejemplo: setear precios diferenciados a productos existentes (opcional)
-- update products set quality_prices = '{"PK": 89990, "G5": 119990, "OG": 199990}'::jsonb
-- where category = 'zapatillas';
