create or replace function public.gen_client_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'CL-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 12));
    exit when not exists (select 1 from public.clients where client_code = candidate);
  end loop;
  return candidate;
end;
$$;

alter table public.clients
  alter column client_code set default public.gen_client_code();

alter table public.clients
  drop constraint if exists client_code_format;

alter table public.clients
  add constraint client_code_format
  check (client_code ~ '^CL-([0-9]{6}|[A-F0-9]{12})$');

create or replace function public.gen_shipment_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  if new.code is null or new.code = '' then
    loop
      candidate := 'VC-' || to_char(now(), 'YYYY') || '-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 12));
      exit when not exists (select 1 from public.shipments where code = candidate);
    end loop;
    new.code := candidate;
  end if;
  return new;
end;
$$;

alter table public.shipments
  drop constraint if exists shipment_code_format;

alter table public.shipments
  add constraint shipment_code_format
  check (code ~ '^VC-[0-9]{4}-([0-9]{6}|[A-F0-9]{12})$');
