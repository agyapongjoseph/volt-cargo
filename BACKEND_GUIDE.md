# VoltCargo — Backend Build Guide (Supabase)

This document is written so you (or Claude / ChatGPT) can build the VoltCargo
backend on **Supabase** and wire it to the existing TanStack Start frontend
without guesswork.

The frontend already implements the full identifier system:

- **Client ID** — permanent, format `CL-000001`
- **Shipment Consignment Code** — permanent, format `VC-YYYY-000001`

Where these live in the frontend (all mock right now, ready to be replaced):

- `src/lib/mock-data.ts` — types, helpers (`formatClientId`, `formatShipmentCode`,
  `isClientId`, `isShipmentCode`, `globalSearch`), mock `clients`, `shipments`,
  `invoices`.
- `src/routes/search.tsx` — global search UI (`?q=CL-000001` or `?q=VC-2026-000001`).
- `src/routes/clients.$id.tsx` — client profile + all their shipments.
- `src/routes/shipments.$id.tsx` — one shipment (timeline, docs, invoice).
- `src/routes/dashboard.tsx` — client portal (shows Client ID).
- `src/routes/admin.tsx` — admin console (Clients tab links to `/clients/$id`).
- `src/routes/warehouse.tsx`, `src/routes/qc.tsx`, `src/routes/delivery.tsx` —
  operational portals.

---

## 1. High-level architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     TanStack Start (frontend)                 │
│  src/routes/*                                                 │
│  src/components/*                                             │
│  src/lib/mock-data.ts   ← REPLACE with Supabase queries       │
└───────────────────────────────────────────────────────────────┘
                │
                │  supabase-js (publishable key + user JWT)
                ▼
┌───────────────────────────────────────────────────────────────┐
│                         Supabase                              │
│                                                               │
│  Auth  →  auth.users (email/password, Google, Apple)          │
│                                                               │
│  Postgres schema `public`                                     │
│  ├── app_role (enum)                                          │
│  ├── shipment_status (enum)                                   │
│  ├── clients            (1 permanent Client ID per user)      │
│  ├── user_roles         (RBAC — never on profile)             │
│  ├── shipments          (VC-YYYY-000001, FK → clients)        │
│  ├── shipment_events    (timeline / audit trail)              │
│  ├── shipment_documents (files)                               │
│  ├── invoices           (Paystack)                            │
│  └── messages           (per-shipment chat)                   │
│                                                               │
│  Storage buckets:  shipment-photos, shipment-docs             │
│                                                               │
│  Edge Functions:                                              │
│  ├── paystack-init                                            │
│  ├── paystack-webhook                                         │
│  └── notify (email/SMS on status change)                      │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Identifier rules (must match the frontend exactly)

| Entity   | Format           | Generator                           | Immutable |
| -------- | ---------------- | ----------------------------------- | --------- |
| Client   | `CL-000001`      | Postgres sequence, zero-padded to 6 | Yes       |
| Shipment | `VC-2026-000001` | Per-year sequence, zero-padded to 6 | Yes       |

Rules:

- One client → many shipments (FK `shipments.client_id → clients.id`).
- Codes must be **unique across the whole table**, not just per client.
- Never reuse a Client ID or Shipment Code, even if the record is soft-deleted.
- Every shipment MUST have a `client_id` — no orphan shipments.

Regex used on the frontend (`src/lib/mock-data.ts`):

```ts
CLIENT_ID_REGEX = /^CL-\d{6}$/;
SHIPMENT_CODE_REGEX = /^VC-\d{4}-\d{6}$/;
```

Add matching CHECK constraints in Postgres (see schema below).

---

## 3. Database schema (SQL — run as a Supabase migration)

> Every `CREATE TABLE` in `public` must be followed by `GRANT` + RLS + policies.
> Roles live in a **separate** table (never on `clients`).

```sql
-- =====================================================================
-- ENUMS
-- =====================================================================
create type public.app_role as enum (
  'admin', 'staff_warehouse_cn', 'staff_qc', 'staff_customs',
  'staff_delivery', 'client'
);

create type public.shipment_status as enum (
  'created', 'received_cn', 'qc', 'consolidated',
  'in_transit', 'port_gh', 'cleared', 'out_for_delivery', 'delivered'
);

-- =====================================================================
-- CLIENTS  (one row per client user; permanent Client ID)
-- =====================================================================
create sequence if not exists public.client_seq start 1;

create table public.clients (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  client_code  text not null unique
                 default ('CL-' || lpad(nextval('public.client_seq')::text, 6, '0')),
  full_name    text not null,
  email        text not null,
  phone        text,
  city         text,
  created_at   timestamptz not null default now(),
  constraint client_code_format check (client_code ~ '^CL-[0-9]{6}$')
);
create index on public.clients (client_code);

grant select, insert, update on public.clients to authenticated;
grant all on public.clients to service_role;

alter table public.clients enable row level security;

-- =====================================================================
-- USER ROLES  (separate table — prevents privilege escalation)
-- =====================================================================
create table public.user_roles (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- =====================================================================
-- SHIPMENTS  (permanent VC-YYYY-000001)
-- =====================================================================
create sequence if not exists public.shipment_seq start 1;

create table public.shipments (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  client_id      uuid not null references public.clients(id) on delete restrict,
  origin         text not null,
  destination    text not null,
  mode           text not null check (mode in ('Air','Sea')),
  weight_kg      numeric(10,2),
  cbm            numeric(10,3),
  pieces         int,
  declared_value numeric(12,2),
  description    text,
  status         public.shipment_status not null default 'created',
  eta            date,
  created_at     timestamptz not null default now(),
  constraint shipment_code_format check (code ~ '^VC-[0-9]{4}-[0-9]{6}$')
);
create index on public.shipments (client_id);
create index on public.shipments (code);
create index on public.shipments (status);

-- Auto-generate code on insert if caller didn't supply one
create or replace function public.gen_shipment_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := 'VC-' || to_char(now(), 'YYYY') || '-' ||
                lpad(nextval('public.shipment_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;
create trigger shipments_gen_code
before insert on public.shipments
for each row execute function public.gen_shipment_code();

grant select, insert, update on public.shipments to authenticated;
grant all on public.shipments to service_role;
alter table public.shipments enable row level security;

-- =====================================================================
-- SHIPMENT EVENTS  (timeline / audit)
-- =====================================================================
create table public.shipment_events (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status      public.shipment_status not null,
  note        text,
  actor_id    uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index on public.shipment_events (shipment_id, created_at);
grant select, insert on public.shipment_events to authenticated;
grant all on public.shipment_events to service_role;
alter table public.shipment_events enable row level security;

-- =====================================================================
-- DOCUMENTS
-- =====================================================================
create table public.shipment_documents (
  id           uuid primary key default gen_random_uuid(),
  shipment_id  uuid not null references public.shipments(id) on delete cascade,
  storage_path text not null,           -- object key in `shipment-docs` bucket
  filename     text not null,
  size_bytes   int,
  uploaded_by  uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
grant select, insert, delete on public.shipment_documents to authenticated;
grant all on public.shipment_documents to service_role;
alter table public.shipment_documents enable row level security;

-- =====================================================================
-- INVOICES  (Paystack)
-- =====================================================================
create table public.invoices (
  id                uuid primary key default gen_random_uuid(),
  shipment_id       uuid not null unique references public.shipments(id) on delete cascade,
  amount_cents      int not null check (amount_cents > 0),
  currency          text not null default 'USD',
  paid              boolean not null default false,
  paystack_ref      text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);
grant select on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;

-- =====================================================================
-- MESSAGES  (per shipment chat)
-- =====================================================================
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  author_id   uuid not null references auth.users(id),
  body        text not null check (length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
```

---

## 4. RLS policies (copy verbatim)

```sql
-- CLIENTS ------------------------------------------------------------
create policy "client reads own row"
  on public.clients for select to authenticated
  using (user_id = auth.uid());

create policy "client updates own row"
  on public.clients for update to authenticated
  using (user_id = auth.uid());

create policy "staff reads all clients"
  on public.clients for select to authenticated
  using (public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'staff_warehouse_cn')
      or public.has_role(auth.uid(), 'staff_qc')
      or public.has_role(auth.uid(), 'staff_customs')
      or public.has_role(auth.uid(), 'staff_delivery'));

-- USER_ROLES --------------------------------------------------------
create policy "user reads own roles"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid());

create policy "admin manages roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- SHIPMENTS ---------------------------------------------------------
create policy "client reads own shipments"
  on public.shipments for select to authenticated
  using (client_id in (select id from public.clients where user_id = auth.uid()));

create policy "client inserts own shipments"
  on public.shipments for insert to authenticated
  with check (client_id in (select id from public.clients where user_id = auth.uid()));

create policy "staff reads all shipments"
  on public.shipments for select to authenticated
  using (public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'staff_warehouse_cn')
      or public.has_role(auth.uid(), 'staff_qc')
      or public.has_role(auth.uid(), 'staff_customs')
      or public.has_role(auth.uid(), 'staff_delivery'));

create policy "staff updates shipments"
  on public.shipments for update to authenticated
  using (public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'staff_warehouse_cn')
      or public.has_role(auth.uid(), 'staff_qc')
      or public.has_role(auth.uid(), 'staff_customs')
      or public.has_role(auth.uid(), 'staff_delivery'));

-- SHIPMENT_EVENTS / DOCUMENTS / MESSAGES -----------------------------
-- Pattern for all three: readable by owning client + any staff role,
-- writable by staff (and, for messages, by the owning client too).

create policy "read events for accessible shipments"
  on public.shipment_events for select to authenticated
  using (shipment_id in (select id from public.shipments));  -- shipments RLS already restricts this
create policy "staff writes events"
  on public.shipment_events for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin')
           or public.has_role(auth.uid(), 'staff_warehouse_cn')
           or public.has_role(auth.uid(), 'staff_qc')
           or public.has_role(auth.uid(), 'staff_customs')
           or public.has_role(auth.uid(), 'staff_delivery'));

-- (repeat similar policies for shipment_documents and messages)

-- INVOICES ----------------------------------------------------------
create policy "read invoices for accessible shipments"
  on public.invoices for select to authenticated
  using (shipment_id in (select id from public.shipments));
```

---

## 5. Auth signup → Client ID trigger

When a new user signs up, automatically create their `clients` row so their
permanent `CL-000001` code is issued immediately.

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.clients (user_id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    new.raw_user_meta_data->>'phone'
  );
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
```

---

## 6. Global search (matches frontend `globalSearch`)

Server-side equivalent used by the `/search` page. Frontend already knows
which regex a query matches; call the right query based on the result.

```ts
// Client ID search
supabase.from("clients").select("*, shipments(*)").eq("client_code", q.toUpperCase()).maybeSingle();

// Shipment Code search
supabase.from("shipments").select("*, clients(*)").eq("code", q.toUpperCase()).maybeSingle();
```

RLS ensures a client can only see their own results; staff/admin see everything.

---

## 7. Replacing the mock layer

`src/lib/mock-data.ts` is the ONLY file the UI reads data from. To go live:

1. Keep the helpers (`formatClientId`, `formatShipmentCode`, `isClientId`,
   `isShipmentCode`) — they are pure and used by the UI.
2. Replace `clients`, `shipments`, `invoices`, `currentClient`,
   `findClient`, `findShipment`, `shipmentsForClient`, `clientSpend`,
   `globalSearch` with functions that call Supabase.
3. Keep the return **shapes** identical to the current TypeScript types
   (`Client`, `Shipment`, `Invoice`, `SearchResult`). No UI code changes needed.

Suggested layout for the real data layer:

```
src/lib/
├── mock-data.ts              ← delete or keep helpers only
└── data/
    ├── clients.ts            ← Supabase queries returning Client / Client[]
    ├── shipments.ts          ← Supabase queries returning Shipment[]
    ├── invoices.ts
    └── search.ts             ← globalSearch()
```

For server-side queries in TanStack Start, use `createServerFn` with the
`requireSupabaseAuth` middleware (see `src/integrations/supabase/*` once
Lovable Cloud is enabled).

---

## 8. Paystack integration (edge functions)

Two edge functions:

- `paystack-init` — client calls it with `{ invoice_id }`, function creates a
  Paystack transaction and returns the authorization URL.
- `paystack-webhook` — Paystack POSTs here after payment. Verify signature
  (`x-paystack-signature`), then `update public.invoices set paid=true,
paid_at=now(), paystack_ref=...`.

Store `PAYSTACK_SECRET_KEY` as a Supabase secret. Never expose it client-side.

---

## 9. Checklist for Claude / ChatGPT

- [ ] Create migration with the SQL in §3.
- [ ] Add all RLS policies in §4.
- [ ] Add the `handle_new_user` trigger in §5.
- [ ] Create storage buckets `shipment-photos`, `shipment-docs` (private).
- [ ] Add Supabase publishable + service role keys to env.
- [ ] Replace `src/lib/mock-data.ts` per §7 without changing the exported types.
- [ ] Wire signup / login on `src/routes/auth.tsx`.
- [ ] Deploy `paystack-init` + `paystack-webhook` edge functions.
- [ ] Verify: sign up a user → they get a `CL-000001` code; create a shipment
      → it gets `VC-2026-000001`; search for either → correct result.

That's the whole backend. The frontend is already speaking this contract.
