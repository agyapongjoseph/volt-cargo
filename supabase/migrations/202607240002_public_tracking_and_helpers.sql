-- VoltCargo follow-up backend helpers.
-- Run this after 202607240001_initial_schema.sql.

create or replace function public.track_shipment_public(shipment_code text)
returns table (
  code text,
  origin text,
  destination text,
  mode text,
  description text,
  status public.shipment_status,
  eta date,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.code,
    s.origin,
    s.destination,
    s.mode,
    s.description,
    s.status,
    s.eta,
    s.created_at
  from public.shipments s
  where s.code = upper(trim(shipment_code))
  limit 1;
$$;

revoke all on function public.track_shipment_public(text) from public;
grant execute on function public.track_shipment_public(text) to anon, authenticated;

create or replace function public.gen_invoice_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_code is null or new.invoice_code = '' then
    select 'INV-' || replace(s.code, 'VC-', '')
    into new.invoice_code
    from public.shipments s
    where s.id = new.shipment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_gen_code on public.invoices;
create trigger invoices_gen_code
before insert on public.invoices
for each row execute function public.gen_invoice_code();
