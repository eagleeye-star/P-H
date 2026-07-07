# PrimeHaul — Step 4: Paystack payments

This is the whole store rebuilt as a proper **Vite project** with a payment-verification function. Same design, same Supabase products and orders — the difference is that keys now live in **environment variables** (set once in Vercel, never re-pasted after code changes), and there's a small server function that securely confirms each payment.

## What you need before starting

- **Supabase:** your Project URL, `anon` public key, **and** the `service_role` secret key — all from Settings → API.
- **Paystack:** a free account. From Settings → API Keys & Webhooks, copy your **test** public key (`pk_test_…`) and **test** secret key (`sk_test_…`).

---

## A. Update the database

Run **`primehaul_step4.sql`** in Supabase → SQL Editor. It just adds an `email` column to the orders table (Paystack sends the receipt there).

## B. Put the project in a new repo

Easiest with **GitHub Desktop** (handles the `src/` and `api/` folders cleanly):

1. Unzip the `primehaul` folder.
2. Create a new repository, and move all these files into it.
3. Commit and push. (`.env` and `node_modules` are ignored on purpose — Vercel installs packages itself, and secrets go in Vercel, not the repo.)

## C. Deploy on Vercel

1. **Import** the new repo as a Vercel project — it auto-detects Vite (Build `npm run build`, Output `dist`).
2. In **Settings → Environment Variables**, add all **six** (from `.env.example`):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYSTACK_PUBLIC_KEY`
   - `PAYSTACK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. **Deploy.**

The three `VITE_` ones are safe in the browser. The other three are server-only secrets — the `service_role` and Paystack `secret` keys must **never** carry a `VITE_` prefix, or they'd be exposed.

## D. Test it

1. Open the site, add items, fill in name / phone / email, click **Pay with Paystack**.
2. Use Paystack's test card: **4084 0840 8408 4081**, CVV **408**, any future expiry, OTP **123456**.
3. On success, check Supabase → orders: the order flips to **`paid`**. The WhatsApp button still works exactly as before for anyone who prefers that.

## Going live

Once Paystack verifies your business, swap the test public/secret keys for the **live** ones in Vercel's environment variables and redeploy. Nothing else changes.

---

### Notes

- Online payment charges the **item subtotal**; delivery is arranged separately (as the cart note explains). Area-based delivery fees can be added later.
- Every order is saved before payment as `pending`, so you see abandoned attempts too. Verified payments become `paid`; a paid amount that doesn't match is set to `review`.
- Local dev: `npm install` then `npm run dev`. The `/api` function only runs on Vercel, so test payments on a Vercel deploy (or use `vercel dev`).
