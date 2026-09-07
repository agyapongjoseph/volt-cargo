import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { PortalShell, StatCard } from "@/components/portal-shell";
import { RoleGuard } from "@/components/role-guard";
import {
  getAdminData,
  STATUS_ORDER,
  STATUS_LABEL,
  statusColor,
  clientSpend,
  upsertInvoiceForShipment,
  updateShipmentStatus,
  setUsdGhsRate,
  type Invoice,
  type Shipment,
  type ShipmentStatus,
} from "@/lib/data";
import { Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — VoltCargo" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

type Tab = "overview" | "shipments" | "clients" | "invoices" | "users";

function AdminPage() {
  return (
    <RoleGuard role="admin" allowed={["admin"]}>
      <AdminContent />
    </RoleGuard>
  );
}

function AdminContent() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [shipmentQuery, setShipmentQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Shipment["status"]>("all");
  const [invoiceDrafts, setInvoiceDrafts] = useState<Record<string, string>>({});
  const [rateDraft, setRateDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-data"], queryFn: getAdminData });
  const invoiceMutation = useMutation({
    mutationFn: ({ code, amount }: { code: string; amount: number }) =>
      upsertInvoiceForShipment(code, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      queryClient.invalidateQueries({ queryKey: ["portal-notifications"] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ code, status }: { code: string; status: ShipmentStatus }) =>
      updateShipmentStatus(code, status, `Admin updated shipment to ${STATUS_LABEL[status]}`),
    onSuccess: async (_, variables) => {
      setStatusError(null);
      setStatusMessage(`${variables.code} moved to ${STATUS_LABEL[variables.status]}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-data"] }),
        queryClient.invalidateQueries({ queryKey: ["warehouse-shipments"] }),
        queryClient.invalidateQueries({ queryKey: ["qc-shipments"] }),
        queryClient.invalidateQueries({ queryKey: ["delivery-shipments"] }),
        queryClient.invalidateQueries({ queryKey: ["portal-notifications"] }),
      ]);
    },
    onError: (err) => {
      setStatusMessage(null);
      setStatusError(err instanceof Error ? err.message : "Could not update shipment status.");
    },
  });
  const rateMutation = useMutation({
    mutationFn: (rate: number) => setUsdGhsRate(rate),
    onSuccess: async (_, rate) => {
      setStatusError(null);
      setStatusMessage(`USD to GHS rate updated to GHS ${rate.toFixed(4)}.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    },
    onError: (err) => {
      setStatusMessage(null);
      setStatusError(err instanceof Error ? err.message : "Could not update exchange rate.");
    },
  });
  const shipments = data?.shipments ?? [];
  const clients = data?.clients ?? [];
  const invoices = data?.invoices ?? [];
  const teamUsers = data?.teamUsers ?? [];
  const exchangeRate = data?.exchangeRate ?? null;
  const billedRevenue = invoices.reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);
  const inFlight = shipments.filter((s) => !["delivered"].includes(s.status)).length;
  const revenue = invoices.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
  const airShipments = shipments.filter((s) => s.mode === "Air").length;
  const seaShipments = shipments.filter((s) => s.mode === "Sea").length;
  const delivered = shipments.filter((s) => s.status === "delivered").length;
  const deliveryRate = shipments.length ? Math.round((delivered / shipments.length) * 100) : 0;
  const revenueTrend = buildRevenueTrend(invoices);
  const statusData = buildStatusData(shipments);
  const modeData = [
    { name: "Air", value: airShipments, color: "#f97316" },
    { name: "Sea", value: seaShipments, color: "#0f172a" },
  ].filter((item) => item.value > 0);
  const queueData = [
    {
      name: "China Hub",
      value: shipments.filter((s) => ["received_cn", "qc"].includes(s.status)).length,
    },
    { name: "In Transit", value: shipments.filter((s) => s.status === "in_transit").length },
    {
      name: "Ghana Port",
      value: shipments.filter((s) => ["port_gh", "cleared"].includes(s.status)).length,
    },
    {
      name: "GH Warehouse",
      value: shipments.filter((s) => s.status === "ghana_warehouse").length,
    },
    {
      name: "Delivery",
      value: shipments.filter((s) => ["out_for_delivery", "delivered"].includes(s.status)).length,
    },
  ];
  const filteredShipments = shipments.filter((shipment) => {
    const q = shipmentQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      shipment.code.toLowerCase().includes(q) ||
      shipment.client.toLowerCase().includes(q) ||
      shipment.origin.toLowerCase().includes(q) ||
      shipment.destination.toLowerCase().includes(q) ||
      shipment.description.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace("#", "") as Tab;
      if (["overview", "shipments", "clients", "invoices", "users"].includes(hash)) {
        setTab(hash);
      }
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    if (exchangeRate && !rateDraft) setRateDraft(String(exchangeRate.rate));
  }, [exchangeRate, rateDraft]);

  const changeTab = (nextTab: Tab) => {
    setTab(nextTab);
    window.history.replaceState(null, "", nextTab === "overview" ? "/admin" : `/admin#${nextTab}`);
  };

  if (isLoading) {
    return (
      <PortalShell role="admin" title="Loading admin" subtitle="Fetching operation data">
        <PanelMessage>Loading admin console...</PanelMessage>
      </PortalShell>
    );
  }

  if (error) {
    return (
      <PortalShell role="admin" title="Admin unavailable" subtitle="Supabase returned an error">
        <PanelMessage>
          {error instanceof Error ? error.message : "Could not load admin data."}
        </PanelMessage>
      </PortalShell>
    );
  }

  return (
    <PortalShell role="admin" title="Admin Console" subtitle="Operations control tower">
      <div className="mb-6 inline-flex rounded-full border border-navy/10 bg-white p-1 text-sm">
        {(["overview", "shipments", "clients", "invoices", "users"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => changeTab(t)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium capitalize transition-colors",
              tab === t ? "bg-brand text-white" : "text-navy/60 hover:text-navy",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {(statusMessage || statusError) && (
        <div
          className={cn(
            "mb-6 rounded-2xl border p-4 text-sm shadow-sm",
            statusError
              ? "border-accent-red/10 bg-accent-red/5 text-navy/70"
              : "border-accent-green/10 bg-accent-green/5 text-navy/70",
          )}
        >
          {statusError ?? statusMessage}
        </div>
      )}

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Revenue" value={`$${revenue.toLocaleString()}`} accent="green" />
            <StatCard
              label="Total billed"
              value={`$${billedRevenue.toLocaleString()}`}
              accent="brand"
            />
            <StatCard
              label="Outstanding"
              value={`$${outstanding.toLocaleString()}`}
              accent="orange"
            />
            <StatCard label="Active shipments" value={inFlight} accent="green" />
            <StatCard label="Delivery rate" value={`${deliveryRate}%`} accent="brand" />
          </div>

          <div className="mt-6 rounded-2xl border border-brand/10 bg-white p-6 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-xs font-bold tracking-widest text-brand uppercase">
                  VoltCargo exchange rate
                </p>
                <h3 className="mt-2 text-xl font-bold text-navy">Weekly USD to Ghana cedis rate</h3>
                <p className="mt-2 text-sm text-navy/55">
                  Hubtel checkout converts USD invoices using this internal rate. Current rate:{" "}
                  <span className="font-semibold text-navy">
                    {exchangeRate ? `1 USD = GHS ${exchangeRate.rate.toLocaleString()}` : "Not set"}
                  </span>
                  {exchangeRate?.effectiveDate ? `, effective ${exchangeRate.effectiveDate}` : ""}.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={rateDraft}
                  onChange={(event) => setRateDraft(event.target.value)}
                  type="number"
                  min="0.01"
                  step="0.0001"
                  placeholder="e.g. 16.2500"
                  className="w-full rounded-full border border-navy/10 bg-surface px-4 py-2 text-sm font-semibold text-navy focus:border-brand focus:outline-none sm:w-40"
                  aria-label="USD to GHS exchange rate"
                />
                <button
                  onClick={() => rateMutation.mutate(Number(rateDraft))}
                  disabled={rateMutation.isPending || !Number(rateDraft)}
                  className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {rateMutation.isPending ? "Saving..." : "Save rate"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm xl:col-span-2">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">Revenue performance</h3>
                  <p className="text-xs text-navy/45">Invoice volume and billing trend by month</p>
                </div>
                <div className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                  {invoices.length} invoices
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend} margin={{ left: 14, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#0f172a" strokeOpacity={0.06} vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#f97316"
                      strokeWidth={3}
                      fill="url(#revenueFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-navy/5 bg-navy/5 p-6 shadow-sm">
              <h3 className="text-base font-semibold">Freight mix</h3>
              <p className="mb-6 text-xs text-navy/45">Mode split across all shipments</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modeData}
                      dataKey="value"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={5}
                    >
                      {modeData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FreightMetric label="Air" value={airShipments} color="bg-accent-orange" />
                <FreightMetric label="Sea" value={seaShipments} color="bg-navy" />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm xl:col-span-2">
              <h3 className="text-base font-semibold">Operational pipeline</h3>
              <p className="mb-6 text-xs text-navy/45">
                Where shipments currently sit in the corridor
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={queueData} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid stroke="#0f172a" strokeOpacity={0.06} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold">Shipments by status</h3>
              <p className="mb-5 text-xs text-navy/45">Live count by milestone</p>
              <div className="space-y-4">
                {statusData.map((item) => (
                  <div key={item.status}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-navy/60">{item.label}</span>
                      <span className="font-bold text-navy">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface">
                      <div className="h-full bg-brand" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))}
                {statusData.length === 0 && (
                  <p className="rounded-2xl bg-surface p-6 text-center text-sm text-navy/50">
                    No shipment data yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold">Recent activity</h3>
              <ul className="space-y-3 text-sm">
                {shipments.slice(0, 5).map((s) => (
                  <li
                    key={s.code}
                    className="flex justify-between border-b border-navy/5 pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-mono text-xs text-brand">{s.code}</p>
                      <p className="text-xs text-navy/60">{s.client}</p>
                    </div>
                    <span
                      className={cn(
                        "h-fit rounded-full px-2 py-0.5 text-xs ring-1 ring-inset",
                        statusColor(s.status),
                      )}
                    >
                      {STATUS_LABEL[s.status as keyof typeof STATUS_LABEL]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <InsightCard
              label="Client base"
              value={clients.length}
              desc="Registered importers with a permanent VoltCargo client ID."
            />
            <InsightCard
              label="Average invoice"
              value={`$${(invoices.length ? billedRevenue / invoices.length : 0).toLocaleString(
                undefined,
                {
                  maximumFractionDigits: 0,
                },
              )}`}
              desc="Blended invoice value across all billed consignments."
            />
          </div>
        </>
      )}

      {tab === "shipments" && (
        <div className="rounded-2xl border border-navy/5 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-navy/5 p-5">
            <h2 className="text-base font-semibold">All Shipments</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
                <input
                  value={shipmentQuery}
                  onChange={(event) => setShipmentQuery(event.target.value)}
                  placeholder="Search code, client, route..."
                  className="w-64 rounded-full border border-navy/10 bg-surface py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-navy/40" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="rounded-full border border-navy/10 bg-white py-2 pl-8 pr-3 text-xs font-semibold text-navy/70 focus:border-brand focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  {Object.entries(STATUS_LABEL).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-navy/50">
              <tr>
                <th className="px-5 py-3 text-left">Code</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Route</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Invoice</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {filteredShipments.map((s) => (
                <tr key={s.code} className="hover:bg-surface/60">
                  <td className="px-5 py-3">
                    <Link
                      to="/shipments/$id"
                      params={{ id: s.code }}
                      className="font-mono font-semibold text-brand hover:underline"
                    >
                      {s.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{s.client}</td>
                  <td className="px-5 py-3 text-xs text-navy/70">
                    {s.origin} → {s.destination}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs ring-1 ring-inset",
                        statusColor(s.status),
                      )}
                    >
                      {STATUS_LABEL[s.status as keyof typeof STATUS_LABEL]}
                    </span>
                    <select
                      value={s.status}
                      onChange={(event) =>
                        statusMutation.mutate({
                          code: s.code,
                          status: event.target.value as ShipmentStatus,
                        })
                      }
                      disabled={statusMutation.isPending}
                      className="mt-2 block w-full rounded-lg border border-navy/10 bg-white px-2 py-1 text-xs font-semibold text-navy/60 focus:border-brand focus:outline-none disabled:opacity-60"
                      aria-label={`Update status for ${s.code}`}
                    >
                      {STATUS_ORDER.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        value={
                          invoiceDrafts[s.code] ?? (s.invoiceTotal ? String(s.invoiceTotal) : "")
                        }
                        onChange={(event) =>
                          setInvoiceDrafts((drafts) => ({
                            ...drafts,
                            [s.code]: event.target.value,
                          }))
                        }
                        type="number"
                        min="1"
                        step="0.01"
                        className="w-24 rounded-lg border border-navy/10 bg-surface px-2 py-1 text-right text-xs focus:border-brand focus:outline-none"
                        aria-label={`Invoice amount for ${s.code}`}
                      />
                      <button
                        onClick={() =>
                          invoiceMutation.mutate({
                            code: s.code,
                            amount: Number(invoiceDrafts[s.code] ?? s.invoiceTotal),
                          })
                        }
                        className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand/90"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to="/shipments/$id"
                      params={{ id: s.code }}
                      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredShipments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-navy/50">
                    No shipments match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "clients" && (
        <div className="rounded-2xl border border-navy/5 bg-white shadow-sm">
          <div className="border-b border-navy/5 p-5">
            <h2 className="text-base font-semibold">Clients</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-navy/50">
              <tr>
                <th className="px-5 py-3 text-left">Client ID</th>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Phone</th>
                <th className="px-5 py-3 text-right">Shipments</th>
                <th className="px-5 py-3 text-right">Total spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {clients.map((c) => (
                <tr key={c.clientId} className="hover:bg-surface/60">
                  <td className="px-5 py-3">
                    <Link
                      to="/clients/$id"
                      params={{ id: c.clientId }}
                      className="font-mono font-semibold text-brand hover:underline"
                    >
                      {c.clientId}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-semibold">{c.name}</td>
                  <td className="px-5 py-3 text-navy/70">{c.email}</td>
                  <td className="px-5 py-3 text-navy/70">{c.phone}</td>
                  <td className="px-5 py-3 text-right">
                    {shipments.filter((s) => s.clientId === c.clientId).length}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">
                    $
                    {clientSpend(
                      shipments.filter((s) => s.clientId === c.clientId),
                    ).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "invoices" && (
        <div className="rounded-2xl border border-navy/5 bg-white shadow-sm">
          <div className="border-b border-navy/5 p-5">
            <h2 className="text-base font-semibold">Invoices</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-navy/50">
              <tr>
                <th className="px-5 py-3 text-left">Invoice</th>
                <th className="px-5 py-3 text-left">Consignment</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Issued</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="px-5 py-3 font-mono text-xs">{i.id}</td>
                  <td className="px-5 py-3 font-mono text-xs text-brand">{i.code}</td>
                  <td className="px-5 py-3">{i.client}</td>
                  <td className="px-5 py-3 text-navy/70">{i.issued}</td>
                  <td className="px-5 py-3 text-right font-semibold">${i.amount}</td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs",
                        i.paid
                          ? "bg-accent-green/10 text-accent-green"
                          : "bg-accent-orange/10 text-accent-orange",
                      )}
                    >
                      {i.paid ? "Paid" : "Due"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "users" && (
        <div className="rounded-2xl border border-navy/5 bg-white shadow-sm">
          <div className="border-b border-navy/5 p-5">
            <h2 className="text-base font-semibold">Team & Roles</h2>
            {/* <p className="mt-1 text-xs text-navy/50">
              Users sign up normally. Roles appear here after admin assignment in Supabase.
            </p> */}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-navy/50">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {teamUsers.map((u) => (
                <tr key={`${u.userId}-${u.role}`}>
                  <td className="px-5 py-3 font-semibold">{u.name}</td>
                  <td className="px-5 py-3 text-navy/70">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-navy/5 px-2.5 py-1 text-xs font-medium text-navy/70">
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-navy/5 bg-white p-8 text-sm text-navy/60 shadow-sm">
      {children}
    </div>
  );
}

function buildRevenueTrend(invoices: Invoice[]) {
  const formatter = new Intl.DateTimeFormat("en", { month: "short" });
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { key, month: formatter.format(date), revenue: 0 };
  });

  invoices.forEach((invoice) => {
    if (!invoice.issued) return;
    const date = new Date(invoice.issued);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const month = months.find((item) => item.key === key);
    if (month) month.revenue += invoice.amount;
  });

  return months;
}

function buildStatusData(shipments: Shipment[]) {
  const counts = shipments.reduce<Record<string, number>>((acc, shipment) => {
    acc[shipment.status] = (acc[shipment.status] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([status, count]) => ({
    status,
    count,
    label: STATUS_LABEL[status as keyof typeof STATUS_LABEL],
    percent: shipments.length ? Math.round((count / shipments.length) * 100) : 0,
  }));
}

function FreightMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-navy/5 bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
        <span className="text-xs font-semibold text-navy/55">{label}</span>
      </div>
      <p className="text-2xl font-bold text-navy">{value}</p>
    </div>
  );
}

function InsightCard({ label, value, desc }: { label: string; value: ReactNode; desc: string }) {
  return (
    <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold tracking-widest text-navy/40 uppercase">{label}</p>
      <h3 className="mt-3 text-3xl font-bold text-navy">{value}</h3>
      <p className="mt-4 text-sm leading-relaxed text-navy/50">{desc}</p>
    </div>
  );
}

type TooltipPayload = {
  color?: string;
  name?: string;
  value?: number | string;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-navy/10 bg-white px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-semibold text-navy">{label}</p>}
      {payload.map((item) => (
        <div key={`${item.name}-${item.value}`} className="flex items-center gap-2 text-navy/65">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.name}: </span>
          <span className="font-semibold text-navy">
            {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
