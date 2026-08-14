alter table public.clients
  add column if not exists country text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clients (user_id, full_name, email, phone, country)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      new.email,
      'Client'
    ),
    coalesce(new.email, new.id::text),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'country', '')
  )
  on conflict (user_id) do update set
    full_name = coalesce(nullif(excluded.full_name, ''), public.clients.full_name),
    email = coalesce(nullif(excluded.email, ''), public.clients.email),
    phone = coalesce(excluded.phone, public.clients.phone),
    country = coalesce(excluded.country, public.clients.country);

  insert into public.user_roles (user_id, role)
  values (new.id, 'client')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

update public.clients c
set country = nullif(au.raw_user_meta_data->>'country', '')
from auth.users au
where au.id = c.user_id
  and c.country is null
  and nullif(au.raw_user_meta_data->>'country', '') is not null;
