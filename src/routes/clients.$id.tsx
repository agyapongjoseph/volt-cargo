import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PortalShell, StatCard } from "@/components/portal-shell";
import { getClientDetailData, STATUS_LABEL, statusColor } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/clients/$id")({
  head: ({ params }) => ({
    meta: [{ title: `${params.id} — Client · VoltCargo` }, { name: "robots", content: "noindex" }],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["client", id],
    queryFn: () => getClientDetailData(id),
  });

  if (isLoading) {
    return (
      <PortalShell role="admin" title="Loading client" subtitle={id}>
        <PanelMessage>Loading client profile...</PanelMessage>
      </PortalShell>
    );
  }

  if (error || !data) {
    return (
      <PortalShell role="admin" title="Client not found" subtitle={id}>
        <PanelMessage>
          {error instanceof Error ? error.message : "Client not found."}{" "}
          <Link to="/admin" className="font-semibold text-brand hover:underline">
            Back to admin
          </Link>
        </PanelMessage>
      </PortalShell>
    );
  }

  const { client, shipments, spend } = data;
  const active = shipments.filter((s) => s.status !== "delivered").length;

  return (
    <PortalShell role="admin" title={client.name} subtitle={client.clientId}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-lg font-bold text-brand">
              {client.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <p className="text-lg font-bold">{client.name}</p>
              <p className="font-mono text-xs text-brand">{client.clientId}</p>
            </div>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-navy/70">
              <Mail className="h-4 w-4 text-navy/40" /> {client.email}
            </div>
            <div className="flex items-center gap-2 text-navy/70">
              <Phone className="h-4 w-4 text-navy/40" /> {client.phone}
            </div>
            {/* <div className="flex items-center gap-2 text-navy/70">
              <MapPin className="h-4 w-4 text-navy/40" /> {client.city}
            </div> */}
            <div className="pt-3 text-xs text-navy/50">
              Joined {client.joined} · Permanent Client ID
            </div>
          </dl>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-3">
          <StatCard label="Shipments" value={shipments.length} accent="brand" />
          <StatCard label="Active" value={active} accent="orange" />
          <StatCard label="Lifetime spend" value={`$${spend.toLocaleString()}`} accent="green" />
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-navy/5 bg-white shadow-sm">
        <div className="border-b border-navy/5 p-5">
          <h2 className="text-base font-semibold">Shipments linked to {client.clientId}</h2>
          <p className="text-xs text-navy/50">One client → many shipments</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase text-navy/50">
            <tr>
              <th className="px-5 py-3 text-left">Consignment</th>
              <th className="px-5 py-3 text-left">Route</th>
              <th className="px-5 py-3 text-left">Mode</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/5">
            {shipments.map((s) => (
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
                <td className="px-5 py-3 text-xs text-navy/70">
                  {s.origin} → {s.destination}
                </td>
                <td className="px-5 py-3">{s.mode}</td>
                <td className="px-5 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs ring-1 ring-inset",
                      statusColor(s.status),
                    )}
                  >
                    {STATUS_LABEL[s.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-semibold">
                  ${s.invoiceTotal.toLocaleString()}
                </td>
              </tr>
            ))}
            {shipments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-xs text-navy/50">
                  No shipments yet for this client.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
