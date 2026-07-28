# VoltCargo Supabase Setup

Follow these steps in your Supabase project dashboard.

## 1. Create Project

1. Go to https://supabase.com/dashboard.
2. Create a new project.
3. Wait for the database to finish provisioning.

## 2. Run Database SQL

1. Open **SQL Editor**.
2. Create a new query.
3. Paste all SQL from `supabase/migrations/202607240001_initial_schema.sql`.
4. Click **Run**.
5. Create another query and run `supabase/migrations/202607240002_public_tracking_and_helpers.sql`.
6. Create another query and run `supabase/migrations/202607240003_events_and_invoice_management.sql`.

This creates auth-linked clients, roles, shipments, shipment events, documents, invoices, messages, storage buckets, and RLS policies.

The second migration adds safe public consignment tracking and invoice-code generation.

The third migration lets clients record shipment-created events and lets staff/admin manage invoices.

## 3. Add Frontend Environment Variables

In Supabase, open **Project Settings > API** and copy:

1. Project URL
2. Anon public key

Add them to `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

Restart the dev server after editing `.env`.

## 4. Test Signup

1. Run `npm run dev`.
2. Open `/auth`.
3. Create a new account.
4. Supabase automatically creates a row in `public.clients` with a permanent Client ID like `CL-000001`.
5. Supabase automatically gives the user the `client` role in `public.user_roles`.

## 5. Make Yourself Admin

After signing up, open **Authentication > Users**, copy your user UUID, then run this in SQL Editor:

```sql
insert into public.user_roles (user_id, role)
values ('YOUR_AUTH_USER_UUID', 'admin')
on conflict (user_id, role) do nothing;
```

## 6. Create A Real Shipment For Testing

Run this after you have at least one client row:

```sql
insert into public.shipments (
  client_id,
  origin,
  destination,
  mode,
  weight_kg,
  cbm,
  pieces,
  declared_value,
  description,
  status,
  eta
)
select
  id,
  'Guangzhou, CN',
  'Accra, GH',
  'Air',
  42.5,
  0.18,
  3,
  2400,
  'Consumer electronics - phone cases, accessories',
  'created',
  current_date + interval '14 days'
from public.clients
order by created_at
limit 1;
```

The database trigger generates the consignment code automatically, for example `VC-2026-000001`.

## 7. Next Coding Step

The frontend now reads data from `src/lib/data.ts` and calls Supabase directly.

## 8. Paystack Setup

Install and log in to the Supabase CLI if you have not already:

```bash
npm install -g supabase
supabase login
```

Link your local project to your Supabase project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Set function secrets:

```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_YOUR_PAYSTACK_SECRET_KEY
supabase secrets set APP_URL=http://localhost:5173
```

For production, set `APP_URL` to your deployed app URL.

Deploy the Edge Functions:

```bash
supabase functions deploy paystack-init
supabase functions deploy paystack-webhook --no-verify-jwt
```

In your Paystack dashboard, set the webhook URL to:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook
```

Important: invoices currently use the currency stored in `public.invoices.currency`. Confirm your Paystack account supports that currency. For Ghana, use `GHS` when creating invoices.
