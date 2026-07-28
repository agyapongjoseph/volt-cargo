import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PortalShell, StatCard } from "@/components/portal-shell";
import { RoleGuard } from "@/components/role-guard";
import { getShipments, updateShipmentStatus } from "@/lib/data";
import { Camera, Check, X, AlertTriangle } from "lucide-react";
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
  const queue = shipments.filter((s) => s.status === "qc" || s.status === "received_cn");
  const [selected, setSelected] = useState(queue[0]?.code ?? "");
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["qc-shipments"] }),
  });

  return (
    <PortalShell
      role="qc"
      title="Quality Control"
      subtitle="Inspect, photograph, and approve shipments"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending inspection"
          value={isLoading ? "..." : queue.length}
          accent="orange"
        />
        <StatCard label="Approved today" value={18} accent="green" />
        <StatCard label="Flagged" value={2} accent="red" />
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-navy/5 bg-white p-5 text-sm text-navy/60 shadow-sm">
          {error instanceof Error ? error.message : "Could not load QC queue."}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-navy/5 bg-white p-3 shadow-sm">
          <p className="px-2 py-1 text-xs font-semibold uppercase text-navy/50">Queue</p>
          <ul className="mt-1 space-y-1">
            {queue.map((s) => (
              <li key={s.code}>
                <button
                  onClick={() => setSelected(s.code)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm",
                    selected === s.code ? "bg-brand text-white" : "hover:bg-surface",
                  )}
                >
                  <p className="font-mono text-xs font-semibold">{s.code}</p>
                  <p
                    className={cn(
                      "text-xs",
                      selected === s.code ? "text-white/80" : "text-navy/60",
                    )}
                  >
                    {s.pieces} pcs • {s.weightKg}kg
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {current && (
          <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-lg font-bold text-brand">{current.code}</p>
                <p className="text-xs text-navy/60">
                  {current.client} • {current.description}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    statusMutation.mutate({
                      code: current.code,
                      status: "qc",
                      note: "QC flagged shipment",
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-accent-red/10 px-3 py-1.5 text-xs font-semibold text-accent-red"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Flag
                </button>
                <button
                  onClick={() =>
                    statusMutation.mutate({
                      code: current.code,
                      status: "qc",
                      note: "QC rejected shipment",
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-navy/5 px-3 py-1.5 text-xs font-semibold text-navy/70"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  onClick={() =>
                    statusMutation.mutate({
                      code: current.code,
                      status: "consolidated",
                      note: "QC approved shipment",
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-accent-green px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Detail label="Pieces" value={current.pieces} />
              <Detail label="Weight" value={`${current.weightKg} kg`} />
              <Detail label="Volume" value={`${current.cbm} CBM`} />
              <Detail label="Declared value" value={`$${current.declaredValue}`} />
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold text-navy/70">Inspection photos</p>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="aspect-square rounded-lg bg-gradient-to-br from-surface to-navy/5 ring-1 ring-navy/5"
                  />
                ))}
                <button className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-navy/15 text-xs text-navy/50 hover:border-brand hover:text-brand">
                  <Camera className="mb-1 h-6 w-6" />
                  Add
                </button>
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold text-navy/70">Notes</p>
              <textarea
                placeholder="Notes about condition, packaging, or discrepancies…"
                className="w-full rounded-lg border border-navy/10 bg-surface p-3 text-sm focus:border-brand focus:outline-none"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <p className="text-xs text-navy/50">{label}</p>
      <p className="text-lg font-semibold text-navy">{value}</p>
    </div>
  );
}
