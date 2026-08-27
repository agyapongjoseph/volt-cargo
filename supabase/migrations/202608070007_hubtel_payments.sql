alter table public.invoices
  add column if not exists hubtel_client_reference text unique,
  add column if not exists hubtel_checkout_id text,
  add column if not exists hubtel_transaction_id text,
  add column if not exists hubtel_amount_ghs_cents int,
  add column if not exists hubtel_exchange_rate numeric,
  add column if not exists hubtel_callback jsonb;

create index if not exists invoices_hubtel_client_reference_idx
  on public.invoices (hubtel_client_reference);
