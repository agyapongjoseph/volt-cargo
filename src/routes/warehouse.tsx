import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PortalShell, StatCard } from "@/components/portal-shell";
import { RoleGuard } from "@/components/role-guard";
import { getShipments, STATUS_LABEL, statusColor, updateShipmentStatus } from "@/lib/data";
import { Scan, PackageCheck, Boxes } from "lucide-react";
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
  const [feed, setFeed] = useState<{ code: string; action: string; time: string }[]>([
    { code: "VC-2026-000002", action: "Received at Guangzhou hub", time: "10:32" },
    { code: "VC-2026-000001", action: "Consolidated into container GH-4421", time: "09:15" },
  ]);
  const statusMutation = useMutation({
    mutationFn: ({ code, status }: { code: string; status: "received_cn" | "consolidated" }) =>
      updateShipmentStatus(code, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warehouse-shipments"] }),
  });

  const handleScan = () => {
    if (!scan.trim()) return;
    setFeed([
      {
        code: scan.trim().toUpperCase(),
        action: "Scan received",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      ...feed,
    ]);
    setScan("");
  };

  const inHub = shipments.filter((s) => ["received_cn", "qc", "consolidated"].includes(s.status));

  return (
    <PortalShell
      role="warehouse"
      title="Guangzhou Hub"
      subtitle="Receive, inspect, and consolidate cargo"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting arrival" value={4} accent="orange" />
        <StatCard label="In hub" value={isLoading ? "..." : inHub.length} accent="brand" />
        <StatCard label="Consolidated today" value={12} accent="green" />
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-navy/5 bg-white p-5 text-sm text-navy/60 shadow-sm">
          {error instanceof Error ? error.message : "Could not load warehouse queue."}
        </div>
      )}

      <div id="receive" className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Scan className="h-5 w-5 text-brand" />
            <h2 className="text-base font-semibold">Scan / Receive Package</h2>
          </div>
          <div className="flex gap-2">
            <input
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              placeholder="VC-2026-000001 or barcode"
              className="flex-1 rounded-lg border border-navy/10 bg-surface px-3 py-2 text-sm font-mono focus:border-brand focus:outline-none"
            />
            <button
              onClick={() => {
                handleScan();
                if (scan.trim())
                  statusMutation.mutate({ code: scan.trim(), status: "received_cn" });
              }}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
            >
              Log Scan
            </button>
          </div>
          <p className="mt-3 text-xs text-navy/50">
            Scan the consignment barcode or type the code manually. Client is notified instantly.
          </p>

          <ul className="mt-6 space-y-2">
            {feed.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-navy/5 bg-surface px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-mono font-semibold text-brand">{f.code}</p>
                  <p className="text-xs text-navy/60">{f.action}</p>
                </div>
                <span className="text-xs text-navy/40">{f.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div id="consolidate" className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Boxes className="h-5 w-5 text-brand" />
            <h2 className="text-base font-semibold">Consolidation Queue</h2>
          </div>
          <div className="space-y-3">
            {inHub.map((s) => (
              <div key={s.code} className="rounded-xl border border-navy/5 bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-brand">{s.code}</p>
                    <p className="text-xs text-navy/60">
                      {s.pieces} pcs • {s.weightKg}kg • {s.cbm} CBM
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs ring-1 ring-inset",
                      statusColor(s.status),
                    )}
                  >
                    {STATUS_LABEL[s.status as keyof typeof STATUS_LABEL]}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => statusMutation.mutate({ code: s.code, status: "consolidated" })}
                    className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand/90"
                  >
                    <PackageCheck className="mr-1 inline h-3 w-3" /> Consolidate
                  </button>
                  <button className="rounded-full border border-navy/10 px-3 py-1 text-xs font-semibold text-navy/70 hover:bg-white">
                    Assign container
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
