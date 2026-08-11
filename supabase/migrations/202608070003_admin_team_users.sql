create or replace function public.get_team_users()
returns table (
  user_id uuid,
  role public.app_role,
  full_name text,
  email text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    ur.user_id,
    ur.role,
    coalesce(
      nullif(c.full_name, ''),
      nullif(au.raw_user_meta_data->>'full_name', ''),
      au.email,
      ur.user_id::text
    ) as full_name,
    coalesce(nullif(c.email, ''), au.email, ur.user_id::text) as email
  from public.user_roles ur
  left join public.clients c on c.user_id = ur.user_id
  left join auth.users au on au.id = ur.user_id
  where public.has_role(auth.uid(), 'admin')
  order by ur.created_at;
$$;

revoke all on function public.get_team_users() from public;
grant execute on function public.get_team_users() to authenticated;
