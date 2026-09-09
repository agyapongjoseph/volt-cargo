create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  label text not null,
  amount_cents integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists invoice_line_items_invoice_idx
  on public.invoice_line_items (invoice_id, sort_order);

create table if not exists public.sourcing_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  product_name text not null,
  quantity text,
  target_price text,
  product_link text,
  notes text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'quoted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sourcing_requests_client_idx on public.sourcing_requests (client_id);
create index if not exists sourcing_requests_status_created_idx on public.sourcing_requests (status, created_at desc);

drop trigger if exists sourcing_requests_touch_updated_at on public.sourcing_requests;
create trigger sourcing_requests_touch_updated_at
before update on public.sourcing_requests
for each row execute function public.touch_updated_at();

grant select, insert, update on public.invoice_line_items to authenticated;
grant select, insert, update on public.sourcing_requests to authenticated;

alter table public.invoice_line_items enable row level security;
alter table public.sourcing_requests enable row level security;

drop policy if exists "read line items for accessible invoices" on public.invoice_line_items;
create policy "read line items for accessible invoices"
on public.invoice_line_items
for select
to authenticated
using (invoice_id in (select id from public.invoices));

drop policy if exists "staff manages invoice line items" on public.invoice_line_items;
create policy "staff manages invoice line items"
on public.invoice_line_items
for all
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists "client creates own sourcing requests" on public.sourcing_requests;
create policy "client creates own sourcing requests"
on public.sourcing_requests
for insert
to authenticated
with check (client_id in (select id from public.clients where user_id = auth.uid()));

drop policy if exists "client reads own sourcing requests" on public.sourcing_requests;
create policy "client reads own sourcing requests"
on public.sourcing_requests
for select
to authenticated
using (client_id in (select id from public.clients where user_id = auth.uid()));

drop policy if exists "staff manages sourcing requests" on public.sourcing_requests;
create policy "staff manages sourcing requests"
on public.sourcing_requests
for all
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

create or replace function public.upsert_invoice_quote_for_shipment(
  shipment_code text,
  quote_items jsonb,
  currency_code text default 'USD'
)
returns table (
  invoice_code text,
  shipment_code_out text,
  amount_cents_out integer,
  currency text,
  paid boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_shipment_id uuid;
  target_code text;
  target_invoice_id uuid;
  total_cents integer;
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if quote_items is null or jsonb_typeof(quote_items) <> 'array' then
    raise exception 'quote_items must be an array';
  end if;

  select coalesce(sum(round(((item->>'amount')::numeric) * 100)), 0)::integer
  into total_cents
  from jsonb_array_elements(quote_items) item
  where coalesce(nullif(trim(item->>'label'), ''), '') <> '';

  if total_cents <= 0 then
    raise exception 'quote total must be greater than 0';
  end if;

  select id, code into target_shipment_id, target_code
  from public.shipments
  where code = upper(trim(shipment_code))
  limit 1;

  if target_shipment_id is null then
    raise exception 'shipment not found';
  end if;

  insert into public.invoices (shipment_id, amount_cents, currency)
  values (target_shipment_id, total_cents, coalesce(nullif(currency_code, ''), 'USD'))
  on conflict (shipment_id)
  do update set amount_cents = excluded.amount_cents, currency = excluded.currency
  returning id into target_invoice_id;

  delete from public.invoice_line_items where invoice_id = target_invoice_id;

  insert into public.invoice_line_items (invoice_id, label, amount_cents, sort_order)
  select
    target_invoice_id,
    trim(item->>'label'),
    round(((item->>'amount')::numeric) * 100)::integer,
    row_number() over ()
  from jsonb_array_elements(quote_items) item
  where coalesce(nullif(trim(item->>'label'), ''), '') <> ''
    and ((item->>'amount')::numeric) <> 0;

  select public.invoices.invoice_code,
         target_code,
         public.invoices.amount_cents,
         public.invoices.currency,
         public.invoices.paid,
         public.invoices.created_at
  into invoice_code, shipment_code_out, amount_cents_out, currency, paid, created_at
  from public.invoices
  where public.invoices.id = target_invoice_id;

  return next;
end;
$$;

revoke all on function public.upsert_invoice_quote_for_shipment(text, jsonb, text) from public;
grant execute on function public.upsert_invoice_quote_for_shipment(text, jsonb, text) to authenticated;
