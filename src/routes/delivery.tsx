import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PortalShell, StatCard } from "@/components/portal-shell";
import { RoleGuard } from "@/components/role-guard";
import { getShipments, updateShipmentStatus } from "@/lib/data";
import { MapPin, Phone, CheckCircle2, Navigation } from "lucide-react";

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
  const {
    data: shipments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["delivery-shipments"],
    queryFn: getShipments,
  });
  const routes = shipments.filter((s) => ["cleared", "out_for_delivery"].includes(s.status));
  const deliveredCount = shipments.filter((s) => s.status === "delivered").length;
  const statusMutation = useMutation({
    mutationFn: (code: string) => updateShipmentStatus(code, "delivered", "Marked delivered"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delivery-shipments"] }),
  });

  return (
    <PortalShell role="delivery" title="My Deliveries" subtitle="Accra & Kumasi routes • Today">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Stops today" value={isLoading ? "..." : routes.length} accent="brand" />
        <StatCard label="Completed" value={isLoading ? "..." : deliveredCount} accent="green" />
        <StatCard label="Distance" value="86 km" accent="brand" />
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-navy/5 bg-white p-5 text-sm text-navy/60 shadow-sm">
          {error instanceof Error ? error.message : "Could not load delivery routes."}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {routes.map((s, i) => (
            <div key={s.code} className="rounded-2xl border border-navy/5 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold text-brand">{s.code}</p>
                    <p className="text-sm font-semibold text-navy">{s.client}</p>
                    <p className="text-xs text-navy/60">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {s.destination} • {s.pieces} pieces • {s.weightKg}kg
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                  ETA 14:{20 + i * 15}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90">
                  <Navigation className="h-3.5 w-3.5" /> Navigate
                </button>
                <button className="inline-flex items-center gap-1 rounded-full border border-navy/10 px-3 py-1.5 text-xs font-semibold text-navy/70 hover:bg-surface">
                  <Phone className="h-3.5 w-3.5" /> Call
                </button>
                <button
                  onClick={() => statusMutation.mutate(s.code)}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-green/90"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark delivered
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-navy/5 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Route map</h3>
          <div className="mt-3 h-64 rounded-xl bg-gradient-to-br from-brand/10 via-surface to-accent-green/10 ring-1 ring-navy/5" />
          <p className="mt-3 text-xs text-navy/50">
            Live tracking activates once Lovable Cloud is enabled and a mapping key is added.
          </p>
          <div className="mt-4 rounded-xl border border-navy/5 bg-surface p-3">
            <p className="text-xs font-semibold text-navy/70">Proof of delivery</p>
            <p className="mt-1 text-xs text-navy/50">
              Capture signature & photo at each stop. Client is auto-notified.
            </p>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
