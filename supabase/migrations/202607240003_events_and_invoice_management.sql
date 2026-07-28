-- VoltCargo shipment event and invoice management fixes.
-- Run after 202607240002_public_tracking_and_helpers.sql.

grant insert, update on public.invoices to authenticated;

drop policy if exists "staff manages invoices" on public.invoices;
create policy "staff manages invoices"
on public.invoices
for all
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists "client writes events for own shipments" on public.shipment_events;
create policy "client writes events for own shipments"
on public.shipment_events
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and shipment_id in (
    select s.id
    from public.shipments s
    join public.clients c on c.id = s.client_id
    where c.user_id = auth.uid()
  )
);

create or replace function public.upsert_invoice_for_shipment(
  shipment_code text,
  amount_cents integer,
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
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if amount_cents is null or amount_cents <= 0 then
    raise exception 'amount_cents must be greater than 0';
  end if;

  select id, code
  into target_shipment_id, target_code
  from public.shipments
  where code = upper(trim(shipment_code))
  limit 1;

  if target_shipment_id is null then
    raise exception 'shipment not found';
  end if;

  insert into public.invoices (shipment_id, amount_cents, currency)
  values (target_shipment_id, amount_cents, coalesce(nullif(currency_code, ''), 'USD'))
  on conflict (shipment_id)
  do update set
    amount_cents = excluded.amount_cents,
    currency = excluded.currency
  returning public.invoices.invoice_code,
            target_code,
            public.invoices.amount_cents,
            public.invoices.currency,
            public.invoices.paid,
            public.invoices.created_at
  into invoice_code,
       shipment_code_out,
       amount_cents_out,
       currency,
       paid,
       created_at;

  return next;
end;
$$;

revoke all on function public.upsert_invoice_for_shipment(text, integer, text) from public;
grant execute on function public.upsert_invoice_for_shipment(text, integer, text) to authenticated;
