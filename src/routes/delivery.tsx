import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PortalShell, StatCard } from "@/components/portal-shell";
import { RoleGuard } from "@/components/role-guard";
import {
  getShipments,
  STATUS_LABEL,
  statusColor,
  updateShipmentStatus,
  type Shipment,
} from "@/lib/data";
import {
  CheckCircle2,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  Route as RouteIcon,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [{ title: "Delivery — VoltCargo" }, { name: "robots", content: "noindex" }],
  }),
  component: DeliveryPage,
});

function DeliveryPage() {
  return (
    <RoleGuard role="delivery" allowed={["admin", "staff_delivery"]}>
      <DeliveryContent />
    </RoleGuard>
  );
}

function DeliveryContent() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const {
    data: shipments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["delivery-shipments"],
    queryFn: getShipments,
  });
  const routeShipments = shipments.filter((s) =>
    ["port_gh", "cleared", "ghana_warehouse", "out_for_delivery"].includes(s.status),
  );
  const atPort = shipments.filter((s) => s.status === "port_gh");
  const atGhanaWarehouse = shipments.filter((s) => s.status === "ghana_warehouse");
  const outForDelivery = shipments.filter((s) => s.status === "out_for_delivery");
  const deliveredCount = shipments.filter((s) => s.status === "delivered").length;
  const totalWeight = routeShipments.reduce((sum, shipment) => sum + shipment.weightKg, 0);
  const statusMutation = useMutation({
    mutationFn: ({ code, status, note }: { code: string; status: DeliveryStatus; note: string }) =>
      updateShipmentStatus(code, status, note),
    onSuccess: async (_, variables) => {
      setActionError(null);
      setActionMessage(`${variables.code} updated: ${variables.note}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["delivery-shipments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-data"] }),
      ]);
    },
    onError: (err) => {
      setActionMessage(null);
      setActionError(err instanceof Error ? err.message : "Could not update delivery status.");
    },
  });

  const updateDeliveryStatus = (shipment: Shipment, status: DeliveryStatus) => {
    const allowed =
      (status === "cleared" && shipment.status === "port_gh") ||
      (status === "ghana_warehouse" && shipment.status === "cleared") ||
      (status === "out_for_delivery" && shipment.status === "ghana_warehouse") ||
      (status === "delivered" && shipment.status === "out_for_delivery");
    if (!allowed) {
      setActionMessage(null);
      setActionError(
        `${shipment.code} cannot be moved from ${STATUS_LABEL[shipment.status]} to ${STATUS_LABEL[status]}.`,
      );
      return;
    }

    statusMutation.mutate({
      code: shipment.code,
      status,
      note: deliveryNote[status],
    });
  };

  return (
    <PortalShell
      role="delivery"
      title="Delivery Command Center"
      subtitle="Route planning, dispatch, and proof of delivery"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="At Ghana port" value={isLoading ? "..." : atPort.length} accent="brand" />
        <StatCard
          label="Ghana warehouse"
          value={isLoading ? "..." : atGhanaWarehouse.length}
          accent="orange"
        />
        <StatCard
          label="On the road"
          value={isLoading ? "..." : outForDelivery.length}
          accent="green"
        />
        <StatCard label="Delivered" value={isLoading ? "..." : deliveredCount} accent="green" />
      </div>

      {(error || actionError) && (
        <div className="mt-6 rounded-2xl border border-accent-red/10 bg-accent-red/5 p-5 text-sm text-navy/70 shadow-sm">
          {actionError ??
            (error instanceof Error ? error.message : "Could not load delivery routes.")}
        </div>
      )}

      {actionMessage && !actionError && (
        <div className="mt-6 rounded-2xl border border-accent-green/10 bg-accent-green/5 p-5 text-sm text-navy/70 shadow-sm">
          {actionMessage}
        </div>
      )}

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-navy/5 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-navy/5 p-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold">Today&apos;s delivery manifest</h2>
              <p className="text-sm text-navy/50">Prioritized stops ready for customer handover.</p>
            </div>
            <div className="flex gap-2">
              <Badge label={`${Math.round(totalWeight)}kg`} />
              <Badge label={`${routeShipments.reduce((sum, s) => sum + s.pieces, 0)} pcs`} />
            </div>
          </div>

          <div className="divide-y divide-navy/5">
            {routeShipments.map((shipment, index) => (
              <DeliveryStop
                key={shipment.code}
                shipment={shipment}
                index={index}
                loading={statusMutation.isPending}
                onClear={() => updateDeliveryStatus(shipment, "cleared")}
                onReceiveWarehouse={() => updateDeliveryStatus(shipment, "ghana_warehouse")}
                onDispatch={() => updateDeliveryStatus(shipment, "out_for_delivery")}
                onDelivered={() => updateDeliveryStatus(shipment, "delivered")}
              />
            ))}
            {routeShipments.length === 0 && (
              <EmptyState text="No deliveries are ready right now." />
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-navy/5 bg-navy text-white shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-widest text-white/35 uppercase">
                    Route Health
                  </p>
                  <h3 className="mt-2 text-2xl font-bold">Accra corridor</h3>
                </div>
                <RouteIcon className="h-7 w-7 text-brand" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <RouteMetric label="ETA window" value="2.5h" />
                <RouteMetric label="Priority" value="High" />
              </div>
            </div>
            <div className="relative h-64 bg-gradient-to-br from-brand/20 via-white/5 to-accent-green/20">
              <span className="absolute left-10 top-10 h-4 w-4 rounded-full bg-brand shadow-lg shadow-brand/40" />
              <span className="absolute right-16 top-24 h-4 w-4 rounded-full bg-white shadow-lg shadow-white/30" />
              <span className="absolute bottom-12 left-24 h-4 w-4 rounded-full bg-accent-green shadow-lg shadow-accent-green/30" />
              <div className="absolute inset-x-12 top-16 h-32 rotate-6 rounded-full border border-dashed border-white/25" />
            </div>
          </div>

          <div className="rounded-3xl border border-navy/5 bg-white p-6 shadow-sm">
            <h3 className="font-bold">Proof of delivery checklist</h3>
            <div className="mt-4 space-y-3">
              {[
                "Confirm receiver name",
                "Capture signature or stamp",
                "Upload delivery photo",
                "Mark shipment delivered",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-navy/65">
                  <CheckCircle2 className="h-4 w-4 text-accent-green" /> {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </PortalShell>
  );
}

function DeliveryStop({
  shipment,
  index,
  loading,
  onClear,
  onReceiveWarehouse,
  onDispatch,
  onDelivered,
}: {
  shipment: Shipment;
  index: number;
  loading: boolean;
  onClear: () => void;
  onReceiveWarehouse: () => void;
  onDispatch: () => void;
  onDelivered: () => void;
}) {
  const description = parseShipmentDescription(shipment.description);
  return (
    <div className="grid gap-4 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-sm font-bold text-white">
          {index + 1}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-bold text-brand">{shipment.code}</p>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs ring-1 ring-inset",
                statusColor(shipment.status),
              )}
            >
              {STATUS_LABEL[shipment.status]}
            </span>
          </div>
          <h3 className="mt-1 font-semibold">{shipment.client}</h3>
          <p className="mt-1 text-sm text-navy/50">
            <MapPin className="mr-1 inline h-3.5 w-3.5" /> {shipment.destination} ·{" "}
            {shipment.pieces} pcs · {shipment.weightKg}kg
          </p>
          <ShipmentDescription description={description} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {shipment.clientEmail && (
          <a
            href={`mailto:${shipment.clientEmail}`}
            className="inline-flex items-center gap-1 rounded-full border border-navy/10 px-3 py-2 text-xs font-semibold text-navy/70 hover:bg-surface"
          >
            <Phone className="h-3.5 w-3.5" /> Contact
          </a>
        )}
        <button
          onClick={onClear}
          disabled={loading || shipment.status !== "port_gh"}
          className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Clear
        </button>
        <button
          onClick={onReceiveWarehouse}
          disabled={loading || shipment.status !== "cleared"}
          className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
        >
          <PackageCheck className="h-3.5 w-3.5" /> Receive GH
        </button>
        <button
          onClick={onDispatch}
          disabled={loading || shipment.status !== "ghana_warehouse"}
          className="inline-flex items-center gap-1 rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy/90 disabled:opacity-50"
        >
          <Navigation className="h-3.5 w-3.5" /> Dispatch
        </button>
        <button
          onClick={onDelivered}
          disabled={loading || shipment.status !== "out_for_delivery"}
          className="inline-flex items-center gap-1 rounded-full bg-accent-green px-3 py-2 text-xs font-semibold text-white hover:bg-accent-green/90 disabled:opacity-50"
        >
          <PackageCheck className="h-3.5 w-3.5" /> Delivered
        </button>
      </div>
    </div>
  );
}

type DeliveryStatus = "cleared" | "ghana_warehouse" | "out_for_delivery" | "delivered";

const deliveryNote: Record<DeliveryStatus, string> = {
  cleared: "Customs cleared at Ghana port",
  ghana_warehouse: "Received at Ghana warehouse for delivery planning",
  out_for_delivery: "Dispatched for delivery",
  delivered: "Marked delivered with proof pending",
};

function parseShipmentDescription(value: string) {
  const match = value.match(/^\[(.*?)\]\s*(.*?):\s*(.*)$/);
  if (!match) return { path: "", service: "", item: value };
  return { path: match[1], service: match[2], item: match[3] };
}

function ShipmentDescription({
  description,
}: {
  description: { path: string; service: string; item: string };
}) {
  if (!description.path && !description.service) {
    return description.item ? (
      <p className="mt-1 text-xs text-navy/40">{description.item}</p>
    ) : null;
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
          {description.path}
        </span>
        {description.service && (
          <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[11px] font-semibold text-navy/60">
            {description.service}
          </span>
        )}
      </div>
      <p className="text-xs text-navy/50">{description.item}</p>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
      {label}
    </span>
  );
}

function RouteMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-10 text-center text-sm text-navy/50">{text}</div>;
}
