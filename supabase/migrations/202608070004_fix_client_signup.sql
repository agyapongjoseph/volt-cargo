create extension if not exists pgcrypto;

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

alter table public.shipments
  drop constraint if exists shipment_code_format;

alter table public.shipments
  add constraint shipment_code_format
  check (code ~ '^VC-[0-9]{4}-([0-9]{6}|[A-F0-9]{12})$');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clients (user_id, full_name, email, phone)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      new.email,
      'Client'
    ),
    coalesce(new.email, new.id::text),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (user_id) do update set
    full_name = coalesce(nullif(excluded.full_name, ''), public.clients.full_name),
    email = coalesce(nullif(excluded.email, ''), public.clients.email),
    phone = coalesce(excluded.phone, public.clients.phone);

  insert into public.user_roles (user_id, role)
  values (new.id, 'client')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.clients (user_id, full_name, email, phone)
select
  au.id,
  coalesce(
    nullif(au.raw_user_meta_data->>'full_name', ''),
    nullif(au.raw_user_meta_data->>'name', ''),
    au.email,
    'Client'
  ),
  coalesce(au.email, au.id::text),
  nullif(au.raw_user_meta_data->>'phone', '')
from auth.users au
where not exists (
  select 1 from public.clients c where c.user_id = au.id
);

insert into public.user_roles (user_id, role)
select au.id, 'client'::public.app_role
from auth.users au
where not exists (
  select 1
  from public.user_roles ur
  where ur.user_id = au.id and ur.role = 'client'
);
