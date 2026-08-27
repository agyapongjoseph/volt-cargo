import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { PortalShell } from "@/components/portal-shell";
import {
  findShipment,
  getShipmentEvents,
  getShipmentMessages,
  initiateInvoicePayment,
  sendShipmentMessage,
  STATUS_LABEL,
  STATUS_ORDER,
  statusColor,
} from "@/lib/data";
import { CheckCircle2, Circle, MapPin, MessageSquare, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shipments/$id")({
  head: ({ params }) => ({
    meta: [{ title: `${params.id} — VoltCargo` }, { name: "robots", content: "noindex" }],
  }),
  component: ShipmentDetail,
});

function ShipmentDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const {
    data: shipment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["shipment", id],
    queryFn: () => findShipment(id),
  });
  const { data: events = [] } = useQuery({
    queryKey: ["shipment-events", id],
    queryFn: () => getShipmentEvents(id),
  });
  const { data: messages = [] } = useQuery({
    queryKey: ["shipment-messages", id],
    queryFn: () => getShipmentMessages(id),
  });
  const paymentMutation = useMutation({ mutationFn: initiateInvoicePayment });
  const messageMutation = useMutation({
    mutationFn: () => sendShipmentMessage(id, message),
    onSuccess: async () => {
      setMessage("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["shipment-messages", id] }),
        queryClient.invalidateQueries({ queryKey: ["portal-notifications"] }),
      ]);
    },
  });

  if (isLoading) {
    return (
      <PortalShell role="client" title="Loading shipment" subtitle={id}>
        <PanelMessage>Loading shipment details...</PanelMessage>
      </PortalShell>
    );
  }

  if (error || !shipment) {
    return (
      <PortalShell role="client" title="Shipment not found" subtitle={id}>
        <PanelMessage>
          {error instanceof Error ? error.message : "Shipment not found."}{" "}
          <Link to="/dashboard" className="font-semibold text-brand hover:underline">
            Back to dashboard
          </Link>
        </PanelMessage>
      </PortalShell>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(shipment.status);
  const eventByStatus = new Map(events.map((event) => [event.status, event]));

  return (
    <PortalShell
      role="client"
      title={shipment.code}
      subtitle={`${shipment.origin} → ${shipment.destination}`}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Shipment timeline</h2>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
                  statusColor(shipment.status),
                )}
              >
                {STATUS_LABEL[shipment.status as keyof typeof STATUS_LABEL]}
              </span>
            </div>
            <ol className="relative space-y-4 border-l-2 border-navy/10 pl-6">
              {STATUS_ORDER.map((s, i) => {
                const done = i <= currentIdx;
                const current = i === currentIdx;
                return (
                  <li key={s} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white",
                        done ? "border-brand" : "border-navy/20",
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-brand" />
                      ) : (
                        <Circle className="h-3 w-3 text-navy/30" />
                      )}
                    </span>
                    <div className={cn("pb-2", !done && "opacity-50")}>
                      <p className="text-sm font-semibold">{STATUS_LABEL[s]}</p>
                      <p className="text-xs text-navy/50">
                        {eventByStatus.get(s)?.note ?? (done ? "Completed" : "Pending")}
                        {current && " • current"}
                      </p>
                      {eventByStatus.get(s)?.createdAt && (
                        <p className="text-[11px] text-navy/35">
                          {new Date(eventByStatus.get(s)!.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {events.length > 0 && (
            <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold">Operational notes</h2>
              <div className="space-y-3">
                {[...events].reverse().map((event) => (
                  <div
                    key={`${event.status}-${event.createdAt}`}
                    className="rounded-xl bg-surface p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-navy">
                        {STATUS_LABEL[event.status]}
                      </p>
                      <p className="text-xs text-navy/40">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-navy/65">{event.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">Messages</h2>
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="flex gap-3">
                  <MessageSquare className="mt-1 h-4 w-4 text-navy/30" />
                  <div
                    className={cn("flex-1 rounded-xl p-3", m.mine ? "bg-brand/10" : "bg-surface")}
                  >
                    <p className="text-xs font-semibold text-navy">
                      {m.author}{" "}
                      <span className="ml-2 font-normal text-navy/40">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-navy/70">{m.body}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="rounded-xl bg-surface p-4 text-sm text-navy/50">
                  No messages yet. Send a note to VoltCargo operations.
                </p>
              )}
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Send a message to ops team…"
                className="w-full rounded-xl border border-navy/10 bg-white p-3 text-sm focus:border-brand focus:outline-none"
                rows={2}
              />
              <button
                onClick={() => message.trim() && messageMutation.mutate()}
                disabled={!message.trim() || messageMutation.isPending}
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
              >
                {messageMutation.isPending ? "Sending..." : "Send message"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold">Details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Client" value={shipment.client} />
              <Row label="Client ID" value={shipment.clientId} />
              <Row label="Consignment" value={shipment.code} />
              <Row label="Mode" value={shipment.mode} />
              <Row label="Pieces" value={shipment.pieces} />
              {shipment.mode === "Air" ? (
                <Row label="Weight" value={`${shipment.weightKg} kg`} />
              ) : (
                <Row label="Volume" value={`${shipment.cbm} CBM`} />
              )}
              <Row label="Estimated value" value={`$${shipment.declaredValue.toLocaleString()}`} />
              <Row label="Created" value={shipment.createdAt} />
              <Row label="ETA" value={shipment.eta || "Pending"} />
            </dl>
          </div>

          <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold">Invoice</h3>
            <p className="mt-2 text-3xl font-bold">
              {shipment.invoiceTotal ? `$${shipment.invoiceTotal.toLocaleString()}` : "Pending"}
            </p>
            <p className="text-xs text-navy/50">
              {shipment.invoiceTotal
                ? shipment.paid
                  ? "Paid in full"
                  : "Payment due in Ghana before release"
                : "Invoice is issued when goods arrive in Ghana"}
            </p>
            {!shipment.paid && (
              <button
                onClick={() => shipment.invoiceId && paymentMutation.mutate(shipment.invoiceId)}
                disabled={!shipment.invoiceId || paymentMutation.isPending}
                className="mt-4 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {!shipment.invoiceId
                  ? "Invoice not issued"
                  : paymentMutation.isPending
                    ? "Opening Hubtel..."
                    : "Pay with Hubtel"}
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <MapPin className="h-4 w-4 text-brand" /> Route
            </h3>
            <div className="space-y-3">
              {[
                shipment.origin,
                shipment.mode === "Air" ? "Air freight corridor" : "Ocean freight corridor",
                shipment.destination,
              ].map((point, index) => (
                <div
                  key={`${point}-${index}`}
                  className="flex items-center gap-3 rounded-xl bg-surface p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium text-navy">{point}</p>
                </div>
              ))}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shipment.destination)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90"
              >
                <Navigation className="h-4 w-4" /> Open destination map
              </a>
            </div>
          </div>
        </div>
      </div>
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

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-navy/50">{label}</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </div>
  );
}
