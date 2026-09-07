import { supabase } from "@/lib/supabase/client";

export type AppRole =
  "admin" | "staff_warehouse_cn" | "staff_qc" | "staff_customs" | "staff_delivery" | "client";

export type ShipmentStatus =
  | "created"
  | "received_cn"
  | "qc"
  | "consolidated"
  | "in_transit"
  | "port_gh"
  | "cleared"
  | "ghana_warehouse"
  | "out_for_delivery"
  | "delivered";

export const STATUS_LABEL: Record<ShipmentStatus, string> = {
  created: "Created",
  received_cn: "Received in China",
  qc: "Quality Check",
  consolidated: "Consolidated",
  in_transit: "In Transit",
  port_gh: "At Port (Ghana)",
  cleared: "Customs Cleared",
  ghana_warehouse: "Ghana Warehouse",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

export const STATUS_ORDER: ShipmentStatus[] = [
  "created",
  "received_cn",
  "qc",
  "consolidated",
  "in_transit",
  "port_gh",
  "cleared",
  "ghana_warehouse",
  "out_for_delivery",
  "delivered",
];

export const CLIENT_ID_REGEX = /^CL-(?:\d{6}|[A-F0-9]{12})$/;
export const SHIPMENT_CODE_REGEX = /^VC-\d{4}-(?:\d{6}|[A-F0-9]{12})$/;

export function formatClientId(seq: number): string {
  return `CL-${String(seq).padStart(12, "0")}`;
}

export function formatShipmentCode(year: number, seq: number): string {
  return `VC-${year}-${String(seq).padStart(12, "0")}`;
}

export function isClientId(q: string) {
  return CLIENT_ID_REGEX.test(q.trim().toUpperCase());
}

export function isShipmentCode(q: string) {
  return SHIPMENT_CODE_REGEX.test(q.trim().toUpperCase());
}

export type Client = {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  joined: string;
  city: string;
  country: string;
};

export type Shipment = {
  code: string;
  invoiceId: string;
  clientId: string;
  client: string;
  clientEmail: string;
  origin: string;
  destination: string;
  mode: "Air" | "Sea";
  weightKg: number;
  cbm: number;
  pieces: number;
  declaredValue: number;
  invoiceTotal: number;
  paid: boolean;
  status: ShipmentStatus;
  createdAt: string;
  eta: string;
  description: string;
};

export type Invoice = {
  id: string;
  code: string;
  clientId: string;
  client: string;
  amount: number;
  paid: boolean;
  issued: string;
};

export type TeamUser = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

export type ExchangeRate = {
  id: string;
  rate: number;
  effectiveDate: string;
  createdAt: string;
};

export type ShipmentEvent = {
  status: ShipmentStatus;
  note: string;
  createdAt: string;
};

export type ShipmentMessage = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

export type ShipmentUpload = {
  filename: string;
  storagePath: string;
  url?: string;
};

export type PortalNotification = {
  id: string;
  title: string;
  body: string;
  to: string;
  createdAt: string;
};

export type SessionProfile = {
  user: { id: string; email: string } | null;
  client: Client | null;
  roles: AppRole[];
};

export type SearchResult =
  | { kind: "client"; client: Client; shipments: Shipment[] }
  | { kind: "shipment"; shipment: Shipment; client: Client | undefined }
  | { kind: "none"; query: string };

type ClientRow = {
  user_id?: string;
  client_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  country?: string | null;
  created_at: string;
};

type InvoiceRow = {
  invoice_code: string | null;
  amount_cents: number | null;
  paid: boolean | null;
  created_at: string | null;
};

type ShipmentRow = {
  id?: string;
  code: string;
  origin: string;
  destination: string;
  mode: "Air" | "Sea";
  weight_kg: number | null;
  cbm: number | null;
  pieces: number | null;
  declared_value: number | null;
  description: string | null;
  status: ShipmentStatus;
  eta: string | null;
  created_at: string;
  clients: ClientRow | ClientRow[] | null;
  invoices: InvoiceRow | InvoiceRow[] | null;
};

type InvoiceWithShipmentRow = InvoiceRow & {
  shipments:
    | {
        code: string;
        clients: ClientRow | ClientRow[] | null;
      }
    | {
        code: string;
        clients: ClientRow | ClientRow[] | null;
      }[]
    | null;
};

type ShipmentEventRow = {
  id?: string;
  status: ShipmentStatus;
  note: string | null;
  created_at: string;
  shipments?:
    | {
        code: string;
        clients: ClientRow | ClientRow[] | null;
      }
    | {
        code: string;
        clients: ClientRow | ClientRow[] | null;
      }[]
    | null;
};

type MessageRow = {
  id: string;
  author_id: string;
  author_label?: string | null;
  body: string;
  created_at: string;
  shipments?:
    | {
        code: string;
        clients: ClientRow | ClientRow[] | null;
      }
    | {
        code: string;
        clients: ClientRow | ClientRow[] | null;
      }[]
    | null;
};

type TeamUserRow = {
  user_id: string;
  role: AppRole;
  full_name: string | null;
  email: string | null;
};

type ExchangeRateRow = {
  id: string;
  rate: number | string;
  effective_date: string;
  created_at: string;
};

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  staff_warehouse_cn: "Warehouse (CN)",
  staff_qc: "QC Inspector",
  staff_customs: "Customs Clearing",
  staff_delivery: "Delivery Agent",
  client: "Client",
};

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

function first<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

function dateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function estimateShipmentEta(row: Pick<ShipmentRow, "created_at" | "description" | "mode">) {
  const description = row.description ?? "";
  if (/air express/i.test(description)) return addDays(row.created_at, 5);
  if (/air normal/i.test(description)) return addDays(row.created_at, 14);
  if (/battery|special goods|phones?/i.test(description)) return addDays(row.created_at, 14);
  if (/ocean freight|\bLCL\b|\bFCL\b/i.test(description) || row.mode === "Sea") {
    return addDays(row.created_at, 45);
  }
  return addDays(row.created_at, row.mode === "Air" ? 14 : 45);
}

function mapClient(row: ClientRow): Client {
  return {
    clientId: row.client_code,
    name: row.full_name,
    email: row.email,
    phone: row.phone ?? "",
    joined: dateOnly(row.created_at),
    city: row.city ?? "",
    country: row.country ?? "",
  };
}

function mapShipment(row: ShipmentRow): Shipment {
  const client = first(row.clients);
  const invoice = first(row.invoices);

  return {
    code: row.code,
    invoiceId: invoice?.invoice_code ?? "",
    clientId: client?.client_code ?? "",
    client: client?.full_name ?? "Unknown client",
    clientEmail: client?.email ?? "",
    origin: row.origin,
    destination: row.destination,
    mode: row.mode,
    weightKg: Number(row.weight_kg ?? 0),
    cbm: Number(row.cbm ?? 0),
    pieces: Number(row.pieces ?? 0),
    declaredValue: Number(row.declared_value ?? 0),
    invoiceTotal: Number(invoice?.amount_cents ?? 0) / 100,
    paid: Boolean(invoice?.paid),
    status: row.status,
    createdAt: dateOnly(row.created_at),
    eta: dateOnly(row.eta) || estimateShipmentEta(row),
    description: row.description ?? "",
  };
}

function mapInvoice(row: InvoiceWithShipmentRow): Invoice {
  const shipment = first(row.shipments);
  const client = first(shipment?.clients);

  return {
    id: row.invoice_code ?? "Invoice",
    code: shipment?.code ?? "",
    clientId: client?.client_code ?? "",
    client: client?.full_name ?? "Unknown client",
    amount: Number(row.amount_cents ?? 0) / 100,
    paid: Boolean(row.paid),
    issued: dateOnly(row.created_at),
  };
}

const shipmentSelect = `
  code,
  origin,
  destination,
  mode,
  weight_kg,
  cbm,
  pieces,
  declared_value,
  description,
  status,
  eta,
  created_at,
  clients!inner(client_code, full_name, email, phone, city, country, created_at),
  invoices(invoice_code, amount_cents, paid, created_at)
`;

export async function getCurrentClient(): Promise<Client | null> {
  const db = requireSupabase();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return null;

  const { data, error } = await db
    .from("clients")
    .select("client_code, full_name, email, phone, city, country, created_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapClient(data as ClientRow) : null;
}

export async function updateCurrentClientProfile(input: {
  name: string;
  email: string;
  phone: string;
}) {
  const db = requireSupabase();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("Sign in before updating your profile.");

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (!name) throw new Error("Name is required.");
  if (!email) throw new Error("Email is required.");

  if (email !== (auth.user.email ?? "").toLowerCase()) {
    const { error: emailError } = await db.auth.updateUser({ email });
    if (emailError) throw emailError;
  }

  const { error } = await db
    .from("clients")
    .update({ full_name: name, email, phone: phone || null })
    .eq("user_id", auth.user.id);
  if (error) throw error;
}

export async function getSessionProfile(): Promise<SessionProfile> {
  const db = requireSupabase();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return { user: null, client: null, roles: [] };

  const [{ data: clientData, error: clientError }, { data: rolesData, error: rolesError }] =
    await Promise.all([
      db
        .from("clients")
        .select("client_code, full_name, email, phone, city, country, created_at")
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", auth.user.id),
    ]);

  if (clientError) throw clientError;
  if (rolesError) throw rolesError;

  return {
    user: { id: auth.user.id, email: auth.user.email ?? "" },
    client: clientData ? mapClient(clientData as ClientRow) : null,
    roles: ((rolesData ?? []) as { role: AppRole }[]).map((row) => row.role),
  };
}

export async function getClients(): Promise<Client[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("clients")
    .select("client_code, full_name, email, phone, city, country, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ClientRow[]).map(mapClient);
}

export async function findClient(idOrEmail: string): Promise<Client | undefined> {
  const q = idOrEmail.trim();
  if (!q) return undefined;

  const db = requireSupabase();
  const query = db
    .from("clients")
    .select("client_code, full_name, email, phone, city, country, created_at");
  const { data, error } = isClientId(q)
    ? await query.eq("client_code", q.toUpperCase()).maybeSingle()
    : await query.eq("email", q.toLowerCase()).maybeSingle();
  if (error) throw error;
  return data ? mapClient(data as ClientRow) : undefined;
}

export async function getShipments(): Promise<Shipment[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("shipments")
    .select(shipmentSelect)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as ShipmentRow[]).map(mapShipment);
}

export async function findShipment(code: string): Promise<Shipment | undefined> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("shipments")
    .select(shipmentSelect)
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data ? mapShipment(data as unknown as ShipmentRow) : undefined;
}

async function getShipmentUuid(code: string): Promise<string | undefined> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("shipments")
    .select("id")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data?.id;
}

export async function getShipmentEvents(code: string): Promise<ShipmentEvent[]> {
  const db = requireSupabase();
  const shipmentId = await getShipmentUuid(code);
  if (!shipmentId) return [];

  const { data, error } = await db
    .from("shipment_events")
    .select("status, note, created_at")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as ShipmentEventRow[]).map((event) => ({
    status: event.status,
    note: event.note ?? STATUS_LABEL[event.status],
    createdAt: event.created_at,
  }));
}

export async function getShipmentMessages(code: string): Promise<ShipmentMessage[]> {
  const db = requireSupabase();
  const [{ data: auth }, shipmentId] = await Promise.all([
    db.auth.getUser(),
    getShipmentUuid(code),
  ]);
  if (!shipmentId) return [];

  const { data: rpcData, error: rpcError } = await db.rpc("get_shipment_messages", {
    shipment_code: code.trim().toUpperCase(),
  });

  let rows = (rpcData ?? []) as MessageRow[];
  if (rpcError) {
    const { data, error } = await db
      .from("messages")
      .select("id, author_id, body, created_at")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    rows = (data ?? []) as MessageRow[];
  }

  return rows.map((message) => {
    const mine = message.author_id === auth.user?.id;
    return {
      id: message.id,
      author: mine ? "You" : (message.author_label ?? "VoltCargo Ops"),
      body: message.body,
      createdAt: message.created_at,
      mine,
    };
  });
}

export async function sendShipmentMessage(code: string, body: string) {
  const db = requireSupabase();
  const [{ data: auth, error: authError }, shipmentId] = await Promise.all([
    db.auth.getUser(),
    getShipmentUuid(code),
  ]);
  if (authError) throw authError;
  if (!auth.user) throw new Error("Sign in before sending a message.");
  if (!shipmentId) throw new Error("Shipment not found.");

  const { error } = await db.from("messages").insert({
    shipment_id: shipmentId,
    author_id: auth.user.id,
    body: body.trim(),
  });
  if (error) throw error;
}

export async function publicTrackShipment(code: string): Promise<Shipment | undefined> {
  const db = requireSupabase();
  const { data, error } = await db.rpc("track_shipment_public", {
    shipment_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return undefined;

  return {
    code: row.code,
    invoiceId: "",
    clientId: "",
    client: "",
    clientEmail: "",
    origin: row.origin,
    destination: row.destination,
    mode: row.mode,
    weightKg: 0,
    cbm: 0,
    pieces: 0,
    declaredValue: 0,
    invoiceTotal: 0,
    paid: false,
    status: row.status,
    createdAt: dateOnly(row.created_at),
    eta: dateOnly(row.eta),
    description: row.description ?? "",
  };
}

export async function shipmentsForClient(clientId: string): Promise<Shipment[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("shipments")
    .select(shipmentSelect)
    .eq("clients.client_code", clientId.trim().toUpperCase())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as ShipmentRow[]).map(mapShipment);
}

export async function getInvoices(): Promise<Invoice[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("invoices")
    .select(
      "invoice_code, amount_cents, paid, created_at, shipments(code, clients(client_code, full_name, email, phone, city, country, created_at))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as InvoiceWithShipmentRow[]).map(mapInvoice);
}

export async function getInvoicesForClient(clientId: string): Promise<Invoice[]> {
  const invoices = await getInvoices();
  return invoices.filter(
    (invoice) => invoice.clientId.toUpperCase() === clientId.trim().toUpperCase(),
  );
}

export async function getTeamUsers(): Promise<TeamUser[]> {
  const db = requireSupabase();
  const { data: teamData, error: teamError } = await db.rpc("get_team_users");
  if (!teamError) {
    return ((teamData ?? []) as TeamUserRow[]).map((row) => ({
      userId: row.user_id,
      name: row.full_name || row.email || row.user_id,
      email: row.email || row.user_id,
      role: ROLE_LABEL[row.role],
    }));
  }

  const { data: rolesData, error: rolesError } = await db
    .from("user_roles")
    .select("user_id, role")
    .order("created_at");
  if (rolesError) throw rolesError;

  const roles = (rolesData ?? []) as { user_id: string; role: AppRole }[];
  const userIds = [...new Set(roles.map((row) => row.user_id))];

  const { data: clientsData, error: clientsError } = userIds.length
    ? await db
        .from("clients")
        .select("user_id, client_code, full_name, email, phone, city, country, created_at")
        .in("user_id", userIds)
    : { data: [], error: null };
  if (clientsError) throw clientsError;

  const clientsByUserId = new Map(
    ((clientsData ?? []) as ClientRow[]).map((client) => [client.user_id, client]),
  );

  return roles.map((row) => {
    const client = clientsByUserId.get(row.user_id);
    return {
      userId: row.user_id,
      name: client?.full_name ?? "Invited user",
      email: client?.email ?? row.user_id,
      role: ROLE_LABEL[row.role],
    };
  });
}

export async function getClientDashboardData() {
  const profile = await getSessionProfile();
  if (!profile.client) {
    return { currentClient: null, shipments: [] as Shipment[], invoices: [] as Invoice[] };
  }

  const [shipments, invoices] = await Promise.all([
    shipmentsForClient(profile.client.clientId),
    getInvoicesForClient(profile.client.clientId),
  ]);

  return { currentClient: profile.client, shipments, invoices };
}

const NOTIFICATION_STATUSES: Record<"admin" | "warehouse" | "qc" | "delivery", ShipmentStatus[]> = {
  admin: [...STATUS_ORDER],
  warehouse: ["created", "qc", "consolidated"],
  qc: ["received_cn"],
  delivery: ["port_gh", "cleared", "ghana_warehouse", "out_for_delivery", "delivered"],
};

export async function getPortalNotifications(
  role: "client" | "admin" | "warehouse" | "qc" | "delivery",
) {
  const db = requireSupabase();
  const profile = await getSessionProfile();
  if (!profile.user) return [] as PortalNotification[];

  const invoiceItems =
    role === "client" && profile.client
      ? (await getInvoicesForClient(profile.client.clientId))
          .filter((invoice) => !invoice.paid)
          .slice(0, 3)
          .map((invoice) => ({
            id: `invoice-${invoice.id}`,
            title: "Invoice payment due",
            body: `${invoice.id} for ${invoice.code || "your shipment"} is $${invoice.amount.toLocaleString()}.`,
            to: "/dashboard#invoices",
            createdAt: invoice.issued,
          }))
      : [];

  const statuses = role === "client" ? STATUS_ORDER : NOTIFICATION_STATUSES[role];
  const { data, error } = await db
    .from("shipment_events")
    .select(
      `
      id,
      status,
      note,
      created_at,
      shipments!inner(code, clients!inner(client_code, full_name, email, phone, city, country, created_at))
    `,
    )
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(role === "client" ? 6 : 10);
  if (error) throw error;

  const eventItems = ((data ?? []) as unknown as ShipmentEventRow[]).map((event) => {
    const shipment = first(event.shipments);
    const client = first(shipment?.clients);
    return {
      id: `event-${event.id ?? `${shipment?.code}-${event.status}-${event.created_at}`}`,
      title: STATUS_LABEL[event.status],
      body: `${shipment?.code ?? "Shipment"}${client?.full_name ? ` for ${client.full_name}` : ""}: ${event.note ?? STATUS_LABEL[event.status]}.`,
      to: shipment?.code
        ? `/shipments/${shipment.code}`
        : role === "client"
          ? "/dashboard"
          : `/${role}`,
      createdAt: event.created_at,
    };
  });

  const { data: messageData, error: messageError } = await db
    .from("messages")
    .select(
      `
      id,
      author_id,
      body,
      created_at,
      shipments!inner(code, clients!inner(client_code, full_name, email, phone, city, country, created_at))
    `,
    )
    .neq("author_id", profile.user.id)
    .order("created_at", { ascending: false })
    .limit(8);
  if (messageError) throw messageError;

  const messageItems = ((messageData ?? []) as unknown as MessageRow[]).map((message) => {
    const shipment = first(message.shipments);
    const client = first(shipment?.clients);
    return {
      id: `message-${message.id}`,
      title: "New shipment message",
      body: `${shipment?.code ?? "Shipment"}${client?.full_name ? ` for ${client.full_name}` : ""}: ${truncate(message.body, 90)}`,
      to: shipment?.code
        ? `/shipments/${shipment.code}`
        : role === "client"
          ? "/dashboard"
          : `/${role}`,
      createdAt: message.created_at,
    };
  });

  return [...invoiceItems, ...eventItems, ...messageItems]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 8);
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

export async function createShipmentForCurrentClient(input: {
  origin: string;
  destination: string;
  mode: "Air" | "Sea";
  description: string;
  pieces: number;
  weightKg: number;
  cbm: number;
  declaredValue: number;
}) {
  const db = requireSupabase();
  const profile = await getSessionProfile();
  if (!profile.client) throw new Error("No client profile found for the signed-in user.");

  const { data: clientRow, error: clientError } = await db
    .from("clients")
    .select("id")
    .eq("client_code", profile.client.clientId)
    .maybeSingle();
  if (clientError) throw clientError;
  if (!clientRow) throw new Error("Client row not found.");

  const { data, error } = await db
    .from("shipments")
    .insert({
      client_id: clientRow.id,
      origin: input.origin,
      destination: input.destination,
      mode: input.mode,
      description: input.description,
      pieces: input.pieces,
      weight_kg: input.weightKg,
      cbm: input.cbm,
      declared_value: input.declaredValue,
      status: "created",
    })
    .select(`id, ${shipmentSelect}`)
    .single();
  if (error) throw error;
  const row = data as unknown as ShipmentRow;
  const { data: auth } = await db.auth.getUser();
  const { error: eventError } = await db.from("shipment_events").insert({
    shipment_id: row.id,
    status: "created",
    note: "Shipment created by client",
    actor_id: auth.user?.id,
  });
  if (eventError) throw eventError;
  return mapShipment(row);
}

export async function updateShipmentStatus(code: string, status: ShipmentStatus, note?: string) {
  const db = requireSupabase();
  const shipmentCode = code.trim().toUpperCase();
  const updateNote = note ?? STATUS_LABEL[status];
  const { data, error } = await db
    .from("shipments")
    .update({ status })
    .eq("code", shipmentCode)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Shipment code not found.");

  const { data: auth } = await db.auth.getUser();
  const { error: eventError } = await db.from("shipment_events").insert({
    shipment_id: data.id,
    status,
    note: updateNote,
    actor_id: auth.user?.id,
  });
  if (eventError) throw eventError;

  void db.functions
    .invoke("shipment-status-email", {
      body: { shipment_code: shipmentCode, status, note: updateNote },
    })
    .catch((error) => console.warn("Shipment email notification failed", error));
}

export async function uploadShipmentPhoto(code: string, file: File): Promise<ShipmentUpload> {
  const db = requireSupabase();
  const [{ data: auth, error: authError }, shipmentId] = await Promise.all([
    db.auth.getUser(),
    getShipmentUuid(code),
  ]);
  if (authError) throw authError;
  if (!auth.user) throw new Error("Sign in before uploading evidence.");
  if (!shipmentId) throw new Error("Shipment code not found.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${shipmentId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await db.storage
    .from("shipment-photos")
    .upload(storagePath, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { error: documentError } = await db.from("shipment_documents").insert({
    shipment_id: shipmentId,
    storage_path: storagePath,
    filename: file.name,
    size_bytes: file.size,
    uploaded_by: auth.user.id,
  });
  if (documentError) throw documentError;

  const { data: signedUrl } = await db.storage
    .from("shipment-photos")
    .createSignedUrl(storagePath, 60 * 10);

  return { filename: file.name, storagePath, url: signedUrl?.signedUrl };
}

export async function upsertInvoiceForShipment(code: string, amount: number) {
  const db = requireSupabase();
  const { error } = await db.rpc("upsert_invoice_for_shipment", {
    shipment_code: code.trim().toUpperCase(),
    amount_cents: Math.round(amount * 100),
    currency_code: "USD",
  });
  if (error) throw error;
}

export async function initiateInvoicePayment(invoiceCode: string) {
  const db = requireSupabase();
  const { data, error } = await db.functions.invoke("hubtel-init", {
    body: { invoice_code: invoiceCode },
  });
  if (error) throw error;
  if (!data?.checkout_url) throw new Error("Hubtel checkout URL was not returned.");
  window.location.href = data.checkout_url;
}

export async function getCurrentUsdGhsRate(): Promise<ExchangeRate | null> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("exchange_rates")
    .select("id, rate, effective_date, created_at")
    .eq("base_currency", "USD")
    .eq("quote_currency", "GHS")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as ExchangeRateRow;
  return {
    id: row.id,
    rate: Number(row.rate),
    effectiveDate: row.effective_date,
    createdAt: row.created_at,
  };
}

export async function setUsdGhsRate(rate: number) {
  const db = requireSupabase();
  const { error } = await db.rpc("set_usd_ghs_rate", { rate_value: rate });
  if (error) throw error;
}

export async function deleteCurrentClientAccount() {
  const db = requireSupabase();
  const { data, error } = await db.functions.invoke("delete-account");
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? "Could not delete account.");
  await db.auth.signOut();
}

export async function getAdminData() {
  const [shipments, clients, invoices, teamUsers, exchangeRate] = await Promise.all([
    getShipments(),
    getClients(),
    getInvoices(),
    getTeamUsers(),
    getCurrentUsdGhsRate(),
  ]);
  return { shipments, clients, invoices, teamUsers, exchangeRate };
}

export async function getClientDetailData(clientId: string) {
  const client = await findClient(clientId);
  if (!client) return null;
  const shipments = await shipmentsForClient(client.clientId);
  const spend = shipments.reduce((sum, shipment) => sum + shipment.invoiceTotal, 0);
  return { client, shipments, spend };
}

export async function globalSearch(query: string): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { kind: "none", query };
  const upper = q.toUpperCase();

  if (isShipmentCode(upper)) {
    const shipment = await findShipment(upper);
    if (shipment) {
      return { kind: "shipment", shipment, client: await findClient(shipment.clientId) };
    }
  }

  if (isClientId(upper)) {
    const client = await findClient(upper);
    if (client)
      return { kind: "client", client, shipments: await shipmentsForClient(client.clientId) };
  }

  const db = requireSupabase();
  const { data, error } = await db
    .from("clients")
    .select("client_code, full_name, email, phone, city, country, created_at")
    .or(`email.eq.${q.toLowerCase()},full_name.ilike.%${q}%`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    const client = mapClient(data as ClientRow);
    return { kind: "client", client, shipments: await shipmentsForClient(client.clientId) };
  }

  const shipment = await findShipment(upper);
  if (shipment) return { kind: "shipment", shipment, client: await findClient(shipment.clientId) };

  return { kind: "none", query };
}

export function clientSpend(shipments: Shipment[]): number {
  return shipments.reduce((sum, shipment) => sum + shipment.invoiceTotal, 0);
}

export function parseShipmentDescription(value: string) {
  const match = value.match(/^\[(.*?)\]\s*(.*?):\s*(.*)$/);
  if (!match) return { path: "", service: "", item: value };
  return { path: match[1], service: match[2], item: match[3] };
}

export function isLclShipment(shipment: Pick<Shipment, "description" | "mode">) {
  const parsed = parseShipmentDescription(shipment.description);
  return shipment.mode === "Sea" && /\bLCL\b/i.test(parsed.service);
}

export function statusColor(s: ShipmentStatus) {
  switch (s) {
    case "delivered":
    case "ghana_warehouse":
    case "cleared":
      return "bg-accent-green/10 text-accent-green ring-accent-green/20";
    case "in_transit":
    case "port_gh":
    case "out_for_delivery":
      return "bg-brand/10 text-brand ring-brand/20";
    case "qc":
    case "consolidated":
    case "received_cn":
      return "bg-accent-orange/10 text-accent-orange ring-accent-orange/20";
    default:
      return "bg-navy/5 text-navy/70 ring-navy/10";
  }
}
