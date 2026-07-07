-- =========================================================
--  PrimeHaul · Step 4 · add email to orders (for Paystack)
--  Run in Supabase → SQL Editor → New query → Run.
-- =========================================================

alter table public.orders add column if not exists email text;
