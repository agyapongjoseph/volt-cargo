import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { PortalShell, StatCard } from "@/components/portal-shell";
import {
  getClientDashboardData,
  createShipmentForCurrentClient,
  initiateInvoicePayment,
  STATUS_LABEL,
  statusColor,
  type Client,
} from "@/lib/data";
import { Plus, Search, Download, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — VoltCargo" },
      { name: "description", content: "Manage your shipments, invoices, and deliveries." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [showNew, setShowNew] = useState(false);
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["client-dashboard"],
    queryFn: getClientDashboardData,
  });
  const paymentMutation = useMutation({ mutationFn: initiateInvoicePayment });
  const currentClient = data?.currentClient ?? null;
  const clientShipments = data?.shipments ?? [];
  const clientInvoices = data?.invoices ?? [];

  const filtered = clientShipments.filter(
    (s) =>
      s.code.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase()),
  );

  const active = clientShipments.filter((s) => s.status !== "delivered").length;
  const delivered = clientShipments.filter((s) => s.status === "delivered").length;
  const outstanding = clientInvoices.filter((i) => !i.paid).reduce((sum, i) => sum + i.amount, 0);
  const spend = clientInvoices.reduce((sum, i) => sum + i.amount, 0);

  if (isLoading) {
    return (
      <PortalShell role="client" title="Loading dashboard" subtitle="Fetching your shipments">
        <PanelMessage>Loading your VoltCargo account...</PanelMessage>
      </PortalShell>
    );
  }

  if (error) {
    return (
      <PortalShell
        role="client"
        title="Dashboard unavailable"
        subtitle="Supabase returned an error"
      >
        <PanelMessage>
          {error instanceof Error ? error.message : "Could not load dashboard."}
        </PanelMessage>
      </PortalShell>
    );
  }

  if (!currentClient) {
    return (
      <PortalShell role="client" title="Sign in required" subtitle="No client profile found">
        <PanelMessage>
          Sign in at{" "}
          <Link to="/auth" className="font-semibold text-brand hover:underline">
            /auth
          </Link>{" "}
          to view your client dashboard.
        </PanelMessage>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      role="client"
      title={`Welcome back, ${currentClient.name.split(" ")[0]}`}
      subtitle={`Client ID · ${currentClient.clientId}`}
      actions={
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" /> New Shipment
        </button>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-navy/5 bg-white p-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
          {currentClient.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div>
          <p className="text-sm font-semibold text-navy">{currentClient.name}</p>
          <p className="font-mono text-xs text-brand">{currentClient.clientId} · permanent</p>
        </div>
        <span className="ml-auto rounded-full bg-surface px-3 py-1 text-xs text-navy/60">
          {currentClient.email}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active shipments"
          value={active}
          hint="In transit or processing"
          accent="brand"
        />
        <StatCard
          label="Delivered (30d)"
          value={delivered}
          hint="On-time rate 96%"
          accent="green"
        />
        <StatCard
          label="Outstanding"
          value={`$${outstanding.toLocaleString()}`}
          hint={`${clientInvoices.filter((i) => !i.paid).length} invoices`}
          accent="orange"
        />
        <StatCard
          label="Total spend YTD"
          value={`$${spend.toLocaleString()}`}
          hint="Across your shipments"
          accent="brand"
        />
      </div>

      <section id="shipments" className="mt-8 rounded-2xl border border-navy/5 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-navy/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">My Shipments</h2>
            <p className="text-xs text-navy/50">Track and manage every consignment</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search code or item"
                className="w-64 rounded-full border border-navy/10 bg-surface py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-3 py-2 text-xs font-semibold text-navy/70 hover:bg-surface">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-navy/50">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Code</th>
                <th className="px-5 py-3 text-left font-medium">Route</th>
                <th className="px-5 py-3 text-left font-medium">Mode</th>
                <th className="px-5 py-3 text-left font-medium">Weight</th>
                <th className="px-5 py-3 text-left font-medium">ETA</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {filtered.map((s) => (
                <tr key={s.code} className="hover:bg-surface/60">
                  <td className="px-5 py-3">
                    <Link
                      to="/shipments/$id"
                      params={{ id: s.code }}
                      className="font-mono font-semibold text-brand hover:underline"
                    >
                      {s.code}
                    </Link>
                    <p className="text-xs text-navy/50">{s.description}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-navy/70">
                    {s.origin} → {s.destination}
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-md bg-navy/5 px-2 py-1 text-xs font-medium text-navy/70">
                      {s.mode}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-navy/70">{s.weightKg} kg</td>
                  <td className="px-5 py-3 text-navy/70">{s.eta}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                        statusColor(s.status),
                      )}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={cn(
                        "font-semibold",
                        s.paid ? "text-accent-green" : "text-accent-orange",
                      )}
                    >
                      ${s.invoiceTotal}
                    </span>
                    <p className="text-xs text-navy/50">{s.paid ? "Paid" : "Due"}</p>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-navy/50">
                    No shipments match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="invoices"
        className="mt-8 rounded-2xl border border-navy/5 bg-white p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Invoices</h2>
            <p className="text-xs text-navy/50">Pay securely with Paystack</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {clientInvoices.map((inv) => (
            <div key={inv.id} className="rounded-xl border border-navy/5 bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-navy/60">{inv.id}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    inv.paid
                      ? "bg-accent-green/10 text-accent-green"
                      : "bg-accent-orange/10 text-accent-orange",
                  )}
                >
                  {inv.paid ? "Paid" : "Due"}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">${inv.amount.toLocaleString()}</p>
              <p className="text-xs text-navy/50">
                {inv.code} • Issued {inv.issued}
              </p>
              {!inv.paid && (
                <button
                  onClick={() => paymentMutation.mutate(inv.id)}
                  disabled={paymentMutation.isPending}
                  className="mt-3 w-full rounded-full bg-brand py-2 text-xs font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {paymentMutation.isPending ? "Opening Paystack..." : "Pay with Paystack"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {showNew && <NewShipmentModal client={currentClient} onClose={() => setShowNew(false)} />}
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

function NewShipmentModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"Air" | "Sea">("Air");
  const [origin, setOrigin] = useState("Guangzhou, CN");
  const [destination, setDestination] = useState("Accra, GH");
  const [description, setDescription] = useState("");
  const [pieces, setPieces] = useState("1");
  const [weightKg, setWeightKg] = useState("");
  const [cbm, setCbm] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const createShipment = useMutation({
    mutationFn: () =>
      createShipmentForCurrentClient({
        origin,
        destination,
        mode,
        description,
        pieces: Number(pieces || 0),
        weightKg: Number(weightKg || 0),
        cbm: Number(cbm || 0),
        declaredValue: Number(declaredValue || 0),
      }),
    onSuccess: async (shipment) => {
      setCreatedCode(shipment.code);
      await queryClient.invalidateQueries({ queryKey: ["client-dashboard"] });
    },
  });

  const finish = async () => {
    if (createdCode) {
      onClose();
      return;
    }
    await createShipment.mutateAsync();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy/5 p-5">
          <div>
            <h3 className="text-lg font-semibold">Create New Shipment</h3>
            <p className="text-xs text-navy/50">Step {step} of 3</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-navy/40 hover:text-navy">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy/70">
                  Shipping Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Air Freight", value: "Air" as const },
                    { label: "Sea Freight", value: "Sea" as const },
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMode(m.value)}
                      className={cn(
                        "rounded-xl border p-4 text-left hover:border-brand",
                        mode === m.value ? "border-brand bg-brand/5" : "border-navy/10 bg-surface",
                      )}
                    >
                      <p className="font-semibold text-navy">{m.label}</p>
                      <p className="text-xs text-navy/50">
                        {m.value === "Air" ? "5–7 days • from $8/kg" : "35–45 days • from $180/CBM"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Origin"
                  value={origin}
                  onChange={setOrigin}
                  placeholder="Guangzhou, CN"
                />
                <Field
                  label="Destination"
                  value={destination}
                  onChange={setDestination}
                  placeholder="Accra, GH"
                />
              </div>
              <Field
                label="Item description"
                value={description}
                onChange={setDescription}
                placeholder="Consumer electronics"
              />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Field
                  label="Pieces"
                  value={pieces}
                  onChange={setPieces}
                  type="number"
                  placeholder="3"
                />
                <Field
                  label="Weight (kg)"
                  value={weightKg}
                  onChange={setWeightKg}
                  type="number"
                  placeholder="42.5"
                />
                <Field label="CBM" value={cbm} onChange={setCbm} type="number" placeholder="0.18" />
              </div>
              <Field
                label="Declared value (USD)"
                value={declaredValue}
                onChange={setDeclaredValue}
                type="number"
                placeholder="2400"
              />
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy/70">
                  Upload invoice / photos
                </label>
                <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-navy/10 bg-surface p-8">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-navy/30" />
                    <p className="mt-2 text-sm text-navy/60">Drop files or click to upload</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-navy/5 bg-surface p-4">
                <p className="text-xs font-semibold uppercase text-navy/50">Client ID</p>
                <p className="mt-1 font-mono text-lg font-bold text-navy">{client.clientId}</p>
                <p className="mt-1 text-xs text-navy/50">
                  This shipment will be permanently linked to your Client ID.
                </p>
              </div>
              <div className="rounded-xl border border-navy/5 bg-surface p-4">
                <p className="text-xs font-semibold uppercase text-navy/50">Consignment code</p>
                <p className="mt-1 font-mono text-2xl font-bold text-brand">
                  {createdCode ?? "Generated after submit"}
                </p>
                <p className="mt-1 text-xs text-navy/50">
                  The database trigger creates the permanent code when the shipment is saved.
                </p>
              </div>
              <div className="rounded-xl border border-navy/5 bg-surface p-4">
                <p className="text-xs font-semibold uppercase text-navy/50">Estimated invoice</p>
                <p className="mt-1 text-2xl font-bold">$380.00</p>
                <p className="mt-1 text-xs text-navy/50">
                  Finalized after arrival & QC at China hub.
                </p>
              </div>
              {createShipment.error && (
                <p className="rounded-xl bg-accent-red/10 p-3 text-xs text-accent-red">
                  {createShipment.error instanceof Error
                    ? createShipment.error.message
                    : "Shipment could not be created."}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-navy/5 p-5">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="rounded-full px-4 py-2 text-sm font-semibold text-navy/60 hover:bg-surface"
          >
            {step > 1 ? "Back" : "Cancel"}
          </button>
          <button
            onClick={() => (step < 3 ? setStep(step + 1) : finish())}
            disabled={createShipment.isPending || (step === 1 && !description.trim())}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand/90"
          >
            {step < 3
              ? "Continue"
              : createShipment.isPending
                ? "Creating..."
                : createdCode
                  ? "Close"
                  : "Create shipment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-navy/70">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
    </div>
  );
}
