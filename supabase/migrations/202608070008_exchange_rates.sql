create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null default 'USD',
  quote_currency text not null default 'GHS',
  rate numeric(12,4) not null check (rate > 0),
  effective_date date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists exchange_rates_pair_created_idx
  on public.exchange_rates (base_currency, quote_currency, created_at desc);

grant select on public.exchange_rates to authenticated;

alter table public.exchange_rates enable row level security;

drop policy if exists "authenticated reads exchange rates" on public.exchange_rates;
create policy "authenticated reads exchange rates"
on public.exchange_rates
for select
to authenticated
using (true);

drop policy if exists "admin manages exchange rates" on public.exchange_rates;
create policy "admin manages exchange rates"
on public.exchange_rates
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.set_usd_ghs_rate(rate_value numeric)
returns public.exchange_rates
language plpgsql
security definer
set search_path = public
as $$
declare
  new_rate public.exchange_rates;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  if rate_value is null or rate_value <= 0 then
    raise exception 'rate must be greater than 0';
  end if;

  insert into public.exchange_rates (base_currency, quote_currency, rate, effective_date, created_by)
  values ('USD', 'GHS', round(rate_value, 4), current_date, auth.uid())
  returning * into new_rate;

  return new_rate;
end;
$$;

revoke all on function public.set_usd_ghs_rate(numeric) from public;
grant execute on function public.set_usd_ghs_rate(numeric) to authenticated;
