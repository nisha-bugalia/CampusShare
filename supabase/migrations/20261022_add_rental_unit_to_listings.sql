-- ============================================================
-- Migration: Add rental_unit column to public.listings
-- Supports hourly and daily rental pricing ('day' or 'hour')
-- ============================================================

-- 1. Add rental_unit column with check constraint, defaulting to 'day'
alter table public.listings
  add column if not exists rental_unit text default 'day'
  check (rental_unit is null or rental_unit in ('day', 'hour'));

-- 2. Backfill existing rent listings so any null values become 'day'
update public.listings
  set rental_unit = 'day'
  where listing_type = 'rent' and (rental_unit is null or rental_unit = '');

-- 3. Document the column
comment on column public.listings.rental_unit is 'Pricing unit for rental listings: day (default) or hour';
