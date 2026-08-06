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
  AlertTriangle,
  Camera,
  Check,
  ClipboardCheck,
  PackageSearch,
  Ruler,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/qc")({
  head: () => ({
    meta: [{ title: "QC — VoltCargo" }, { name: "robots", content: "noindex" }],
  }),
  component: QCPage,
});

function QCPage() {
  return (
    <RoleGuard role="qc" allowed={["admin", "staff_qc"]}>
      <QCContent />
    </RoleGuard>
  );
}

function QCContent() {
  const queryClient = useQueryClient();
  const {
    data: shipments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["qc-shipments"],
    queryFn: getShipments,
  });
  const queue = shipments.filter((s) => s.status === "received_cn" || s.status === "qc");
  const flagged = shipments.filter((s) => s.status === "qc");
  const approved = shipments.filter((s) => s.status === "consolidated");
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const current = queue.find((s) => s.code === selected) ?? queue[0];
  const statusMutation = useMutation({
    mutationFn: ({
      code,
      note,
      status,
    }: {
      code: string;
      note: string;
      status: "qc" | "consolidated";
    }) => updateShipmentStatus(code, status, note),
    onSuccess: async () => {
      setNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["qc-shipments"] }),
        queryClient.invalidateQueries({ queryKey: ["warehouse-shipments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-data"] }),
      ]);
    },
  });

  const mutateCurrent = (status: "qc" | "consolidated", defaultNote: string) => {
    if (!current) return;
    statusMutation.mutate({
      code: current.code,
      status,
      note: note.trim() || defaultNote,
    });
  };

  return (
    <PortalShell
      role="qc"
      title="QC Inspection Studio"
      subtitle="Document condition, flag issues, and release cargo"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending inspection"
          value={isLoading ? "..." : queue.length}
          accent="orange"
        />
        <StatCard
          label="Flagged for review"
          value={isLoading ? "..." : flagged.length}
          accent="red"
        />
        <StatCard label="Approved" value={isLoading ? "..." : approved.length} accent="green" />
        <StatCard label="Avg check time" value="18m" accent="brand" />
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-navy/5 bg-white p-5 text-sm text-navy/60 shadow-sm">
          {error instanceof Error ? error.message : "Could not load QC queue."}
        </div>
      )}

      <section className="mt-8 grid gap-6 xl:grid-cols-[340px_1fr]">
        <aside className="rounded-3xl border border-navy/5 bg-white shadow-sm">
          <div className="border-b border-navy/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">Inspection Queue</h2>
                <p className="text-xs text-navy/45">Inbound cargo awaiting QC decision</p>
              </div>
              <ClipboardCheck className="h-5 w-5 text-brand" />
            </div>
          </div>
          <div className="max-h-[640px] space-y-2 overflow-y-auto p-3">
            {queue.map((s) => (
              <button
                key={s.code}
                onClick={() => setSelected(s.code)}
                className={cn(
                  "w-full rounded-2xl p-4 text-left transition-colors",
                  current?.code === s.code ? "bg-navy text-white" : "bg-surface hover:bg-brand/5",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={cn(
                        "font-mono text-xs font-bold",
                        current?.code === s.code ? "text-brand" : "text-brand",
                      )}
                    >
                      {s.code}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{s.client}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        current?.code === s.code ? "text-white/55" : "text-navy/45",
                      )}
                    >
                      {s.pieces} pcs · {s.weightKg}kg · {s.cbm} CBM
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[11px] font-semibold",
                      s.status === "qc"
                        ? "bg-accent-orange/10 text-accent-orange"
                        : "bg-brand/10 text-brand",
                    )}
                  >
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>
              </button>
            ))}
            {queue.length === 0 && <EmptyState text="No packages are waiting for inspection." />}
          </div>
        </aside>

        {current ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
            <div className="rounded-3xl border border-navy/5 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-4 border-b border-navy/5 p-6 md:flex-row md:items-center">
                <div>
                  <p className="font-mono text-sm font-bold text-brand">{current.code}</p>
                  <h2 className="mt-1 text-2xl font-bold">
                    {current.description || "Shipment inspection"}
                  </h2>
                  <p className="mt-1 text-sm text-navy/50">
                    {current.client} · {current.origin} to {current.destination}
                  </p>
                </div>
                <span
                  className={cn(
                    "h-fit rounded-full px-3 py-1 text-xs ring-1 ring-inset",
                    statusColor(current.status),
                  )}
                >
                  {STATUS_LABEL[current.status]}
                </span>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
                <Detail icon={PackageSearch} label="Pieces" value={current.pieces} />
                <Detail icon={Ruler} label="Weight" value={`${current.weightKg} kg`} />
                <Detail icon={ClipboardCheck} label="Volume" value={`${current.cbm} CBM`} />
                <Detail icon={AlertTriangle} label="Declared" value={`$${current.declaredValue}`} />
              </div>

              <div className="px-6 pb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Inspection evidence</h3>
                  <span className="text-xs text-navy/40">Photos, packaging, serials</span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {["Front", "Packaging", "Quantity", "Label"].map((label, index) => (
                    <div
                      key={label}
                      className="flex aspect-square flex-col justify-end rounded-2xl bg-gradient-to-br from-brand/10 via-surface to-navy/10 p-3 ring-1 ring-navy/5"
                    >
                      <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-navy/60">
                        {index < 2 ? label : "Pending"}
                      </span>
                    </div>
                  ))}
                  <button className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-navy/15 text-xs font-semibold text-navy/45 hover:border-brand hover:text-brand">
                    <Camera className="mb-2 h-7 w-7" /> Add photo
                  </button>
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-navy/5 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">QC decision</h3>
              <p className="mt-1 text-sm text-navy/50">
                Add notes before flagging or approving cargo.
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Condition, packaging, quantity, defects, missing items..."
                className="mt-5 min-h-36 w-full rounded-2xl border border-navy/10 bg-surface p-4 text-sm focus:border-brand focus:outline-none"
              />
              <div className="mt-5 grid gap-2">
                <button
                  onClick={() => mutateCurrent("qc", "QC flagged shipment for review")}
                  disabled={statusMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-orange/10 px-4 py-3 text-sm font-semibold text-accent-orange hover:bg-accent-orange/15 disabled:opacity-60"
                >
                  <AlertTriangle className="h-4 w-4" /> Flag issue
                </button>
                <button
                  onClick={() => mutateCurrent("qc", "QC rejected shipment")}
                  disabled={statusMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-navy/5 px-4 py-3 text-sm font-semibold text-navy/70 hover:bg-navy/10 disabled:opacity-60"
                >
                  <X className="h-4 w-4" /> Reject / hold
                </button>
                <button
                  onClick={() => mutateCurrent("consolidated", "QC approved shipment")}
                  disabled={statusMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-green px-4 py-3 text-sm font-semibold text-white hover:bg-accent-green/90 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" /> Approve for consolidation
                </button>
              </div>
            </aside>
          </div>
        ) : (
          <EmptyState text="Select a package from the queue to start inspection." />
        )}
      </section>
    </PortalShell>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PackageSearch;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <Icon className="mb-4 h-5 w-5 text-brand" />
      <p className="text-xs text-navy/45">{label}</p>
      <p className="mt-1 text-lg font-bold text-navy">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-navy/10 bg-surface p-8 text-center text-sm text-navy/50">
      {text}
    </div>
  );
}
