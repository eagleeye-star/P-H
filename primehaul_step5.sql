-- =========================================================
--  PrimeHaul · Step 5 · admin access policies
--
--  BEFORE running:
--   1. Create your admin login: Supabase → Authentication → Users
--      → "Add user". Use your email + a password, and tick
--      "Auto Confirm User" so you can sign in immediately.
--   2. Replace BOTH occurrences of 'ADMIN_EMAIL_HERE' below with
--      that exact email, then run this whole script.
--
--  These rules let ONLY that email read orders and manage products
--  from the browser. Shoppers keep placing orders and viewing active
--  products, but can never read the orders table.
-- =========================================================

-- ---- ORDERS: admin can read & update ----
drop policy if exists "admin reads orders" on public.orders;
create policy "admin reads orders" on public.orders
  for select to authenticated
  using ( (auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE' );

drop policy if exists "admin updates orders" on public.orders;
create policy "admin updates orders" on public.orders
  for update to authenticated
  using ( (auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE' )
  with check ( (auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE' );

-- ---- PRODUCTS: admin full manage (public still reads active items) ----
drop policy if exists "admin reads all products" on public.products;
create policy "admin reads all products" on public.products
  for select to authenticated
  using ( (auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE' );

drop policy if exists "admin inserts products" on public.products;
create policy "admin inserts products" on public.products
  for insert to authenticated
  with check ( (auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE' );

drop policy if exists "admin updates products" on public.products;
create policy "admin updates products" on public.products
  for update to authenticated
  using ( (auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE' )
  with check ( (auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE' );

drop policy if exists "admin deletes products" on public.products;
create policy "admin deletes products" on public.products
  for delete to authenticated
  using ( (auth.jwt() ->> 'email') = 'ADMIN_EMAIL_HERE' );
