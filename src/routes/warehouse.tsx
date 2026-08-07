import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PortalShell, StatCard } from "@/components/portal-shell";
import { RoleGuard } from "@/components/role-guard";
import {
  getShipments,
  isLclShipment,
  STATUS_LABEL,
  statusColor,
  updateShipmentStatus,
  type Shipment,
} from "@/lib/data";
import { AlertCircle, Boxes, CheckCircle2, PackageCheck, Scan, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/warehouse")({
  head: () => ({
    meta: [{ title: "Warehouse — VoltCargo" }, { name: "robots", content: "noindex" }],
  }),
  component: WarehousePage,
});

function WarehousePage() {
  return (
    <RoleGuard role="warehouse" allowed={["admin", "staff_warehouse_cn"]}>
      <WarehouseContent />
    </RoleGuard>
  );
}

function WarehouseContent() {
  const queryClient = useQueryClient();
  const {
    data: shipments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["warehouse-shipments"],
    queryFn: getShipments,
  });
  const [scan, setScan] = useState("");
  const [feed, setFeed] = useState<{ code: string; action: string; time: string }[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const statusMutation = useMutation({
    mutationFn: ({
      code,
      status,
      note,
    }: {
      code: string;
      status: "received_cn" | "consolidated" | "in_transit";
      note: string;
    }) => updateShipmentStatus(code, status, note),
    onSuccess: async (_, variables) => {
      setActionError(null);
      setActionMessage(`${variables.code.toUpperCase()} updated successfully.`);
      setFeed((items) => [
        {
          code: variables.code.toUpperCase(),
          action: variables.note,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...items,
      ]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["warehouse-shipments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-data"] }),
        queryClient.invalidateQueries({ queryKey: ["delivery-shipments"] }),
      ]);
    },
    onError: (err) => {
      setActionMessage(null);
      setActionError(err instanceof Error ? err.message : "Could not update shipment status.");
    },
  });

  const awaitingArrival = shipments.filter((s) => s.status === "created");
  const readyForQc = shipments.filter((s) => s.status === "received_cn");
  const readyToConsolidate = shipments.filter((s) => s.status === "qc" && isLclShipment(s));
  const readyForFreight = shipments.filter(
    (s) => (s.status === "qc" && !isLclShipment(s)) || s.status === "consolidated",
  );
  const consolidated = shipments.filter((s) => s.status === "consolidated");
  const inHub = shipments.filter((s) => ["received_cn", "qc", "consolidated"].includes(s.status));

  const receiveShipment = () => {
    const code = scan.trim().toUpperCase();
    if (!code) return;
    receiveCode(code);
  };

  const receiveCode = (code: string) => {
    const shipment = shipments.find((s) => s.code.toUpperCase() === code.toUpperCase());
    if (!shipment) {
      setActionMessage(null);
      setActionError("Shipment code not found in the warehouse queue.");
      return;
    }
    if (shipment.status !== "created") {
      setActionMessage(null);
      setActionError(
        `${shipment.code} is already ${STATUS_LABEL[shipment.status].toLowerCase()} and cannot be received again.`,
      );
      return;
    }
    setActionError(null);
    statusMutation.mutate({
      code,
      status: "received_cn",
      note: "Received at China warehouse",
    });
    setScan("");
  };

  const consolidateShipment = (shipment: Shipment) => {
    if (shipment.status !== "qc") {
      setActionMessage(null);
      setActionError(`${shipment.code} must pass QC before consolidation.`);
      return;
    }
    if (!isLclShipment(shipment)) {
      setActionMessage(null);
      setActionError(`${shipment.code} is not LCL. Release it directly to international freight.`);
      return;
    }
    setActionError(null);
    statusMutation.mutate({
      code: shipment.code,
      status: "consolidated",
      note: "Consolidated and assigned for outbound freight",
    });
  };

  const releaseToFreight = (shipment: Shipment) => {
    const ready =
      (shipment.status === "qc" && !isLclShipment(shipment)) || shipment.status === "consolidated";
    if (!ready) {
      setActionMessage(null);
      setActionError(`${shipment.code} is not ready for international freight.`);
      return;
    }
    setActionError(null);
    statusMutation.mutate({
      code: shipment.code,
      status: "in_transit",
      note:
        shipment.status === "consolidated"
          ? "LCL consolidation released to international freight"
          : "Released to international freight",
    });
  };

  return (
    <PortalShell
      role="warehouse"
      title="China Warehouse Control"
      subtitle="Receiving, staging, QC handoff, and consolidation"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting arrival"
          value={isLoading ? "..." : awaitingArrival.length}
          accent="orange"
        />
        <StatCard
          label="Ready for QC"
          value={isLoading ? "..." : readyForQc.length}
          accent="brand"
        />
        <StatCard
          label="LCL consolidation"
          value={isLoading ? "..." : readyToConsolidate.length}
          accent="green"
        />
        <StatCard
          label="Ready for freight"
          value={isLoading ? "..." : readyForFreight.length}
          accent="brand"
        />
      </div>

      {(error || actionError) && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-accent-red/10 bg-accent-red/5 p-5 text-sm text-navy/70">
          <AlertCircle className="mt-0.5 h-4 w-4 text-accent-red" />
          <p>
            {actionError ??
              (error instanceof Error ? error.message : "Could not load warehouse queue.")}
          </p>
        </div>
      )}

      {actionMessage && !actionError && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-accent-green/10 bg-accent-green/5 p-5 text-sm text-navy/70">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent-green" />
          <p>{actionMessage}</p>
        </div>
      )}

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div
          id="receive"
          className="overflow-hidden rounded-3xl border border-navy/5 bg-white shadow-sm"
        >
          <div className="bg-navy p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-widest text-white/40 uppercase">
                  Inbound Desk
                </p>
                <h2 className="mt-2 text-2xl font-bold">Scan and receive packages</h2>
                <p className="mt-2 max-w-xl text-sm text-white/55">
                  Confirm arrivals into the China hub and move consignments into QC visibility.
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-brand">
                <Scan className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && receiveShipment()}
                placeholder="VC-2026-000001"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-mono text-sm text-white placeholder:text-white/35 focus:border-brand focus:outline-none"
              />
              <button
                onClick={receiveShipment}
                disabled={statusMutation.isPending || !scan.trim()}
                className="rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {statusMutation.isPending ? "Updating..." : "Receive"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-3">
            <HubMetric label="Created" value={awaitingArrival.length} desc="Not yet scanned" />
            <HubMetric label="QC handoff" value={readyForQc.length} desc="Waiting inspection" />
            <HubMetric label="Consolidated" value={consolidated.length} desc="LCL grouped" />
          </div>

          <div className="border-t border-navy/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Awaiting supplier delivery</h3>
                <p className="text-xs text-navy/45">
                  Receive consignments without scanning manually.
                </p>
              </div>
              <span className="rounded-full bg-accent-orange/10 px-3 py-1 text-xs font-semibold text-accent-orange">
                {awaitingArrival.length} pending
              </span>
            </div>
            <div className="space-y-3">
              {awaitingArrival.slice(0, 5).map((shipment) => (
                <div
                  key={shipment.code}
                  className="flex flex-col justify-between gap-3 rounded-2xl bg-surface p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-mono text-sm font-bold text-brand">{shipment.code}</p>
                    <p className="text-sm font-semibold text-navy">{shipment.client}</p>
                    <p className="text-xs text-navy/45">
                      {shipment.description || "No description"}
                    </p>
                  </div>
                  <button
                    onClick={() => receiveCode(shipment.code)}
                    disabled={statusMutation.isPending}
                    className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
                  >
                    Receive
                  </button>
                </div>
              ))}
              {awaitingArrival.length === 0 && (
                <EmptyState text="No consignments are awaiting arrival." />
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-navy/5 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Warehouse activity</h2>
              <p className="text-xs text-navy/45">Latest successful scans and status updates</p>
            </div>
            <Warehouse className="h-5 w-5 text-brand" />
          </div>
          <div className="space-y-3">
            {(feed.length
              ? feed
              : inHub
                  .slice(0, 4)
                  .map((s) => ({ code: s.code, action: STATUS_LABEL[s.status], time: s.createdAt }))
            ).map((f) => (
              <div
                key={`${f.code}-${f.action}-${f.time}`}
                className="flex items-center justify-between rounded-2xl bg-surface p-4"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-brand">{f.code}</p>
                  <p className="text-xs text-navy/55">{f.action}</p>
                </div>
                <span className="text-xs font-semibold text-navy/35">{f.time}</span>
              </div>
            ))}
            {!feed.length && !inHub.length && <EmptyState text="No warehouse activity yet." />}
          </div>
        </div>
      </section>

      <section
        id="consolidate"
        className="mt-8 rounded-3xl border border-navy/5 bg-white shadow-sm"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-navy/5 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold">LCL Consolidation Workbench</h2>
            <p className="text-sm text-navy/50">
              Only LCL shipments appear here for container grouping. Air and FCL go straight to
              freight release after QC.
            </p>
          </div>
          <div className="rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">
            {readyToConsolidate.length} ready
          </div>
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-2">
          {readyToConsolidate.map((s) => (
            <WarehouseCard
              key={s.code}
              shipment={s}
              loading={statusMutation.isPending}
              onConsolidate={() => consolidateShipment(s)}
            />
          ))}
          {readyToConsolidate.length === 0 && (
            <EmptyState text="No QC-approved LCL shipments are ready for consolidation." />
          )}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-navy/5 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-navy/5 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold">International Freight Release</h2>
            <p className="text-sm text-navy/50">
              Release air/FCL shipments after QC, or LCL shipments after consolidation.
            </p>
          </div>
          <div className="rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">
            {readyForFreight.length} ready
          </div>
        </div>
        <div className="grid gap-4 p-6 lg:grid-cols-2">
          {readyForFreight.map((shipment) => (
            <WarehouseCard
              key={shipment.code}
              shipment={shipment}
              loading={statusMutation.isPending}
              actionLabel="Release to freight"
              onConsolidate={() => releaseToFreight(shipment)}
            />
          ))}
          {readyForFreight.length === 0 && (
            <EmptyState text="No shipments are ready for international freight release." />
          )}
        </div>
      </section>
    </PortalShell>
  );
}

function HubMetric({ label, value, desc }: { label: string; value: number; desc: string }) {
  return (
    <div className="rounded-2xl bg-surface p-5">
      <p className="text-xs font-bold tracking-widest text-navy/40 uppercase">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-navy/45">{desc}</p>
    </div>
  );
}

function WarehouseCard({
  shipment,
  loading,
  actionLabel = "Consolidate",
  onConsolidate,
}: {
  shipment: Shipment;
  loading: boolean;
  actionLabel?: string;
  onConsolidate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-navy/5 bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm font-bold text-brand">{shipment.code}</p>
          <h3 className="mt-1 font-semibold">{shipment.client}</h3>
          <p className="mt-1 text-xs text-navy/50">{shipment.description}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs ring-1 ring-inset",
            statusColor(shipment.status),
          )}
        >
          {STATUS_LABEL[shipment.status]}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <MiniDetail label="Pieces" value={shipment.pieces} />
        <MiniDetail label="Weight" value={`${shipment.weightKg}kg`} />
        <MiniDetail label="CBM" value={shipment.cbm} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={onConsolidate}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
        >
          <PackageCheck className="h-3.5 w-3.5" /> {actionLabel}
        </button>
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/10 px-4 py-2 text-xs font-semibold text-accent-green">
          <CheckCircle2 className="h-3.5 w-3.5" /> QC approved
        </span>
      </div>
    </div>
  );
}

function MiniDetail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-[11px] font-semibold text-navy/40">{label}</p>
      <p className="mt-1 font-bold text-navy">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-navy/10 bg-surface p-8 text-center text-sm text-navy/50">
      {text}
    </div>
  );
}
