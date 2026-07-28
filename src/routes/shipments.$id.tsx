import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal-shell";
import {
  findShipment,
  initiateInvoicePayment,
  STATUS_LABEL,
  STATUS_ORDER,
  statusColor,
} from "@/lib/data";
import { CheckCircle2, Circle, MapPin, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shipments/$id")({
  head: ({ params }) => ({
    meta: [{ title: `${params.id} — VoltCargo` }, { name: "robots", content: "noindex" }],
  }),
  component: ShipmentDetail,
});

function ShipmentDetail() {
  const { id } = Route.useParams();
  const {
    data: shipment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["shipment", id],
    queryFn: () => findShipment(id),
  });
  const paymentMutation = useMutation({ mutationFn: initiateInvoicePayment });

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
                        {done ? "Completed" : "Pending"}
                        {current && " • current"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">Documents</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Commercial Invoice.pdf",
                "Packing List.pdf",
                "Bill of Lading.pdf",
                "Customs Declaration.pdf",
              ].map((doc) => (
                <div
                  key={doc}
                  className="flex items-center gap-3 rounded-xl border border-navy/5 bg-surface p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{doc}</p>
                    <p className="text-xs text-navy/50">PDF • 240 KB</p>
                  </div>
                  <button className="text-xs font-semibold text-brand hover:underline">View</button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">Messages</h2>
            <div className="space-y-3">
              {[
                {
                  from: "VoltCargo Ops",
                  msg: "Your shipment cleared quality control this morning.",
                  time: "2h ago",
                },
                { from: "You", msg: "Please confirm consolidation timeline.", time: "1d ago" },
              ].map((m, i) => (
                <div key={i} className="flex gap-3">
                  <MessageSquare className="mt-1 h-4 w-4 text-navy/30" />
                  <div className="flex-1 rounded-xl bg-surface p-3">
                    <p className="text-xs font-semibold text-navy">
                      {m.from} <span className="ml-2 font-normal text-navy/40">{m.time}</span>
                    </p>
                    <p className="mt-1 text-sm text-navy/70">{m.msg}</p>
                  </div>
                </div>
              ))}
              <textarea
                placeholder="Send a message to ops team…"
                className="w-full rounded-xl border border-navy/10 bg-white p-3 text-sm focus:border-brand focus:outline-none"
                rows={2}
              />
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
              <Row label="Weight" value={`${shipment.weightKg} kg`} />
              <Row label="Volume" value={`${shipment.cbm} CBM`} />
              <Row label="Declared value" value={`$${shipment.declaredValue.toLocaleString()}`} />
              <Row label="Created" value={shipment.createdAt} />
              <Row label="ETA" value={shipment.eta} />
            </dl>
          </div>

          <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold">Invoice</h3>
            <p className="mt-2 text-3xl font-bold">${shipment.invoiceTotal}</p>
            <p className="text-xs text-navy/50">
              {shipment.paid ? "Paid in full" : "Payment due before release"}
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
                    ? "Opening Paystack..."
                    : "Pay with Paystack"}
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <MapPin className="h-4 w-4 text-brand" /> Route
            </h3>
            <div className="relative h-40 overflow-hidden rounded-xl bg-gradient-to-br from-brand/10 via-surface to-accent-green/10">
              <div className="absolute inset-0 flex items-center justify-center text-xs text-navy/40">
                Live map preview (activate with Lovable Cloud)
              </div>
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
