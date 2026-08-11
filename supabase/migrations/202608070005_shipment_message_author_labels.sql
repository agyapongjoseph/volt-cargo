create or replace function public.get_shipment_messages(shipment_code text)
returns table (
  id uuid,
  author_id uuid,
  author_label text,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    m.id,
    m.author_id,
    case
      when public.has_role(m.author_id, 'admin') then 'VoltCargo Admin'
      when public.has_role(m.author_id, 'staff_warehouse_cn') then 'VoltCargo Warehouse'
      when public.has_role(m.author_id, 'staff_qc') then 'VoltCargo QC'
      when public.has_role(m.author_id, 'staff_customs') then 'VoltCargo Customs'
      when public.has_role(m.author_id, 'staff_delivery') then 'VoltCargo Delivery'
      when public.has_role(m.author_id, 'client') then coalesce(nullif(author_client.full_name, ''), author_user.email, 'Client')
      else coalesce(author_user.email, 'VoltCargo User')
    end as author_label,
    m.body,
    m.created_at
  from public.shipments s
  join public.clients shipment_client on shipment_client.id = s.client_id
  join public.messages m on m.shipment_id = s.id
  left join public.clients author_client on author_client.user_id = m.author_id
  left join auth.users author_user on author_user.id = m.author_id
  where s.code = upper(trim(shipment_code))
    and (public.is_staff(auth.uid()) or shipment_client.user_id = auth.uid())
  order by m.created_at;
$$;

revoke all on function public.get_shipment_messages(text) from public;
grant execute on function public.get_shipment_messages(text) to authenticated;
