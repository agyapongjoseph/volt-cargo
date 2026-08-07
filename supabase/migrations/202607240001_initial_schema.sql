-- VoltCargo initial Supabase backend schema.
-- Run this in Supabase SQL Editor on a new project.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum (
    'admin', 'staff_warehouse_cn', 'staff_qc', 'staff_customs', 'staff_delivery', 'client'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.shipment_status as enum (
    'created', 'received_cn', 'qc', 'consolidated', 'in_transit',
    'port_gh', 'cleared', 'ghana_warehouse', 'out_for_delivery', 'delivered'
  );
exception when duplicate_object then null;
end $$;

create sequence if not exists public.client_seq start 1;
create sequence if not exists public.shipment_seq start 1;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  client_code text not null unique default ('CL-' || lpad(nextval('public.client_seq')::text, 6, '0')),
  full_name text not null,
  email text not null,
  phone text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_code_format check (client_code ~ '^CL-[0-9]{6}$')
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  origin text not null,
  destination text not null,
  mode text not null check (mode in ('Air', 'Sea')),
  weight_kg numeric(10,2),
  cbm numeric(10,3),
  pieces int,
  declared_value numeric(12,2),
  description text,
  status public.shipment_status not null default 'created',
  eta date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipment_code_format check (code ~ '^VC-[0-9]{4}-[0-9]{6}$')
);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status public.shipment_status not null,
  note text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.shipment_documents (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  size_bytes int,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_code text not null unique,
  shipment_id uuid not null unique references public.shipments(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'USD',
  paid boolean not null default false,
  paystack_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists clients_client_code_idx on public.clients (client_code);
create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
create index if not exists shipments_client_id_idx on public.shipments (client_id);
create index if not exists shipments_code_idx on public.shipments (code);
create index if not exists shipments_status_idx on public.shipments (status);
create index if not exists shipment_events_shipment_created_idx on public.shipment_events (shipment_id, created_at);
create index if not exists shipment_documents_shipment_idx on public.shipment_documents (shipment_id);
create index if not exists messages_shipment_created_idx on public.messages (shipment_id, created_at);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_touch_updated_at on public.clients;
create trigger clients_touch_updated_at
before update on public.clients
for each row execute function public.touch_updated_at();

drop trigger if exists shipments_touch_updated_at on public.shipments;
create trigger shipments_touch_updated_at
before update on public.shipments
for each row execute function public.touch_updated_at();

create or replace function public.gen_shipment_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.code is null or new.code = '' then
    new.code := 'VC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.shipment_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists shipments_gen_code on public.shipments;
create trigger shipments_gen_code
before insert on public.shipments
for each row execute function public.gen_shipment_code();

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in ('admin', 'staff_warehouse_cn', 'staff_qc', 'staff_customs', 'staff_delivery')
  );
$$;

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
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.email),
    new.email,
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (user_id) do nothing;

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

grant usage on schema public to authenticated;
grant select, update on public.clients to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update on public.shipments to authenticated;
grant select, insert on public.shipment_events to authenticated;
grant select, insert, delete on public.shipment_documents to authenticated;
grant select on public.invoices to authenticated;
grant select, insert on public.messages to authenticated;
grant usage, select on sequence public.client_seq to authenticated;
grant usage, select on sequence public.shipment_seq to authenticated;

alter table public.clients enable row level security;
alter table public.user_roles enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.shipment_documents enable row level security;
alter table public.invoices enable row level security;
alter table public.messages enable row level security;

drop policy if exists "client reads own row" on public.clients;
create policy "client reads own row" on public.clients
for select to authenticated using (user_id = auth.uid());

drop policy if exists "client updates own row" on public.clients;
create policy "client updates own row" on public.clients
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "staff reads all clients" on public.clients;
create policy "staff reads all clients" on public.clients
for select to authenticated using (public.is_staff(auth.uid()));

drop policy if exists "user reads own roles" on public.user_roles;
create policy "user reads own roles" on public.user_roles
for select to authenticated using (user_id = auth.uid());

drop policy if exists "admin manages roles" on public.user_roles;
create policy "admin manages roles" on public.user_roles
for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "client reads own shipments" on public.shipments;
create policy "client reads own shipments" on public.shipments
for select to authenticated using (client_id in (select id from public.clients where user_id = auth.uid()));

drop policy if exists "client creates own shipments" on public.shipments;
create policy "client creates own shipments" on public.shipments
for insert to authenticated with check (client_id in (select id from public.clients where user_id = auth.uid()));

drop policy if exists "staff reads all shipments" on public.shipments;
create policy "staff reads all shipments" on public.shipments
for select to authenticated using (public.is_staff(auth.uid()));

drop policy if exists "staff creates shipments" on public.shipments;
create policy "staff creates shipments" on public.shipments
for insert to authenticated with check (public.is_staff(auth.uid()));

drop policy if exists "staff updates shipments" on public.shipments;
create policy "staff updates shipments" on public.shipments
for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "read events for accessible shipments" on public.shipment_events;
create policy "read events for accessible shipments" on public.shipment_events
for select to authenticated using (shipment_id in (select id from public.shipments));

drop policy if exists "staff writes events" on public.shipment_events;
create policy "staff writes events" on public.shipment_events
for insert to authenticated with check (public.is_staff(auth.uid()));

drop policy if exists "read documents for accessible shipments" on public.shipment_documents;
create policy "read documents for accessible shipments" on public.shipment_documents
for select to authenticated using (shipment_id in (select id from public.shipments));

drop policy if exists "staff writes documents" on public.shipment_documents;
create policy "staff writes documents" on public.shipment_documents
for insert to authenticated with check (public.is_staff(auth.uid()));

drop policy if exists "staff deletes documents" on public.shipment_documents;
create policy "staff deletes documents" on public.shipment_documents
for delete to authenticated using (public.is_staff(auth.uid()));

drop policy if exists "read invoices for accessible shipments" on public.invoices;
create policy "read invoices for accessible shipments" on public.invoices
for select to authenticated using (shipment_id in (select id from public.shipments));

drop policy if exists "read messages for accessible shipments" on public.messages;
create policy "read messages for accessible shipments" on public.messages
for select to authenticated using (shipment_id in (select id from public.shipments));

drop policy if exists "write messages for accessible shipments" on public.messages;
create policy "write messages for accessible shipments" on public.messages
for insert to authenticated with check (
  author_id = auth.uid()
  and shipment_id in (select id from public.shipments)
);

insert into storage.buckets (id, name, public)
values ('shipment-photos', 'shipment-photos', false), ('shipment-docs', 'shipment-docs', false)
on conflict (id) do nothing;

drop policy if exists "read shipment storage for authenticated users" on storage.objects;
create policy "read shipment storage for authenticated users" on storage.objects
for select to authenticated using (bucket_id in ('shipment-photos', 'shipment-docs'));

drop policy if exists "staff uploads shipment storage" on storage.objects;
create policy "staff uploads shipment storage" on storage.objects
for insert to authenticated with check (
  bucket_id in ('shipment-photos', 'shipment-docs') and public.is_staff(auth.uid())
);

drop policy if exists "staff updates shipment storage" on storage.objects;
create policy "staff updates shipment storage" on storage.objects
for update to authenticated using (
  bucket_id in ('shipment-photos', 'shipment-docs') and public.is_staff(auth.uid())
) with check (
  bucket_id in ('shipment-photos', 'shipment-docs') and public.is_staff(auth.uid())
);

drop policy if exists "staff deletes shipment storage" on storage.objects;
create policy "staff deletes shipment storage" on storage.objects
for delete to authenticated using (
  bucket_id in ('shipment-photos', 'shipment-docs') and public.is_staff(auth.uid())
);
