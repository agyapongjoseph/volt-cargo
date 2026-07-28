import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { PortalShell, StatCard } from "@/components/portal-shell";
import { RoleGuard } from "@/components/role-guard";
import {
  getAdminData,
  STATUS_LABEL,
  statusColor,
  clientSpend,
  upsertInvoiceForShipment,
} from "@/lib/data";
import { Search, Filter, MoreVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — VoltCargo" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

type Tab = "overview" | "shipments" | "clients" | "invoices" | "users";

function AdminPage() {
  return (
    <RoleGuard role="admin" allowed={["admin"]}>
      <AdminContent />
    </RoleGuard>
  );
}

function AdminContent() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [invoiceDrafts, setInvoiceDrafts] = useState<Record<string, string>>({});
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-data"], queryFn: getAdminData });
  const invoiceMutation = useMutation({
    mutationFn: ({ code, amount }: { code: string; amount: number }) =>
      upsertInvoiceForShipment(code, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-data"] }),
  });
  const shipments = data?.shipments ?? [];
  const clients = data?.clients ?? [];
  const invoices = data?.invoices ?? [];
  const teamUsers = data?.teamUsers ?? [];
  const revenue = invoices.reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);
  const inFlight = shipments.filter((s) => !["delivered"].includes(s.status)).length;

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace("#", "") as Tab;
      if (["overview", "shipments", "clients", "invoices", "users"].includes(hash)) {
        setTab(hash);
      }
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const changeTab = (nextTab: Tab) => {
    setTab(nextTab);
    window.history.replaceState(null, "", nextTab === "overview" ? "/admin" : `/admin#${nextTab}`);
  };

  if (isLoading) {
    return (
      <PortalShell role="admin" title="Loading admin" subtitle="Fetching operation data">
        <PanelMessage>Loading admin console...</PanelMessage>
      </PortalShell>
    );
  }

  if (error) {
    return (
      <PortalShell role="admin" title="Admin unavailable" subtitle="Supabase returned an error">
        <PanelMessage>
          {error instanceof Error ? error.message : "Could not load admin data."}
        </PanelMessage>
      </PortalShell>
    );
  }

  return (
    <PortalShell role="admin" title="Admin Console" subtitle="Operations control tower">
      <div className="mb-6 inline-flex rounded-full border border-navy/10 bg-white p-1 text-sm">
        {(["overview", "shipments", "clients", "invoices", "users"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => changeTab(t)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium capitalize transition-colors",
              tab === t ? "bg-brand text-white" : "text-navy/60 hover:text-navy",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Revenue (MTD)" value={`$${revenue.toLocaleString()}`} accent="brand" />
            <StatCard
              label="Outstanding"
              value={`$${outstanding.toLocaleString()}`}
              accent="orange"
            />
            <StatCard label="Active shipments" value={inFlight} accent="green" />
            <StatCard label="Clients" value={clients.length} accent="brand" />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm lg:col-span-2">
              <h3 className="mb-4 text-base font-semibold">Shipments by status</h3>
              <div className="space-y-3">
                {Object.entries(
                  shipments.reduce<Record<string, number>>((acc, s) => {
                    acc[s.status] = (acc[s.status] ?? 0) + 1;
                    return acc;
                  }, {}),
                ).map(([s, count]) => (
                  <div key={s} className="flex items-center gap-3">
                    <div className="w-40 text-xs text-navy/60">
                      {STATUS_LABEL[s as keyof typeof STATUS_LABEL]}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full bg-brand"
                          style={{ width: `${(count / shipments.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-8 text-right text-xs font-semibold">{count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold">Recent activity</h3>
              <ul className="space-y-3 text-sm">
                {shipments.slice(0, 5).map((s) => (
                  <li
                    key={s.code}
                    className="flex justify-between border-b border-navy/5 pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-mono text-xs text-brand">{s.code}</p>
                      <p className="text-xs text-navy/60">{s.client}</p>
                    </div>
                    <span
                      className={cn(
                        "h-fit rounded-full px-2 py-0.5 text-xs ring-1 ring-inset",
                        statusColor(s.status),
                      )}
                    >
                      {STATUS_LABEL[s.status as keyof typeof STATUS_LABEL]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {tab === "shipments" && (
        <div className="rounded-2xl border border-navy/5 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-navy/5 p-5">
            <h2 className="text-base font-semibold">All Shipments</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
                <input
                  placeholder="Search..."
                  className="w-64 rounded-full border border-navy/10 bg-surface py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <button className="inline-flex items-center gap-2 rounded-full border border-navy/10 px-3 py-2 text-xs font-semibold">
                <Filter className="h-3.5 w-3.5" /> Filter
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-navy/50">
              <tr>
                <th className="px-5 py-3 text-left">Code</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Route</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Invoice</th>
                <th className="px-5 py-3"></th>
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
                  <td className="px-5 py-3">{s.client}</td>
                  <td className="px-5 py-3 text-xs text-navy/70">
                    {s.origin} → {s.destination}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs ring-1 ring-inset",
                        statusColor(s.status),
                      )}
                    >
                      {STATUS_LABEL[s.status as keyof typeof STATUS_LABEL]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        value={
                          invoiceDrafts[s.code] ?? (s.invoiceTotal ? String(s.invoiceTotal) : "")
                        }
                        onChange={(event) =>
                          setInvoiceDrafts((drafts) => ({
                            ...drafts,
                            [s.code]: event.target.value,
                          }))
                        }
                        type="number"
                        min="1"
                        step="0.01"
                        className="w-24 rounded-lg border border-navy/10 bg-surface px-2 py-1 text-right text-xs focus:border-brand focus:outline-none"
                        aria-label={`Invoice amount for ${s.code}`}
                      />
                      <button
                        onClick={() =>
                          invoiceMutation.mutate({
                            code: s.code,
                            amount: Number(invoiceDrafts[s.code] ?? s.invoiceTotal),
                          })
                        }
                        className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand/90"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <MoreVertical className="h-4 w-4 text-navy/40" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "clients" && (
        <div className="rounded-2xl border border-navy/5 bg-white shadow-sm">
          <div className="border-b border-navy/5 p-5">
            <h2 className="text-base font-semibold">Clients</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-navy/50">
              <tr>
                <th className="px-5 py-3 text-left">Client ID</th>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Phone</th>
                <th className="px-5 py-3 text-right">Shipments</th>
                <th className="px-5 py-3 text-right">Total spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {clients.map((c) => (
                <tr key={c.clientId} className="hover:bg-surface/60">
                  <td className="px-5 py-3">
                    <Link
                      to="/clients/$id"
                      params={{ id: c.clientId }}
                      className="font-mono font-semibold text-brand hover:underline"
                    >
                      {c.clientId}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-semibold">{c.name}</td>
                  <td className="px-5 py-3 text-navy/70">{c.email}</td>
                  <td className="px-5 py-3 text-navy/70">{c.phone}</td>
                  <td className="px-5 py-3 text-right">
                    {shipments.filter((s) => s.clientId === c.clientId).length}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">
                    $
                    {clientSpend(
                      shipments.filter((s) => s.clientId === c.clientId),
                    ).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "invoices" && (
        <div className="rounded-2xl border border-navy/5 bg-white shadow-sm">
          <div className="border-b border-navy/5 p-5">
            <h2 className="text-base font-semibold">Invoices</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-navy/50">
              <tr>
                <th className="px-5 py-3 text-left">Invoice</th>
                <th className="px-5 py-3 text-left">Consignment</th>
                <th className="px-5 py-3 text-left">Client</th>
                <th className="px-5 py-3 text-left">Issued</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="px-5 py-3 font-mono text-xs">{i.id}</td>
                  <td className="px-5 py-3 font-mono text-xs text-brand">{i.code}</td>
                  <td className="px-5 py-3">{i.client}</td>
                  <td className="px-5 py-3 text-navy/70">{i.issued}</td>
                  <td className="px-5 py-3 text-right font-semibold">${i.amount}</td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs",
                        i.paid
                          ? "bg-accent-green/10 text-accent-green"
                          : "bg-accent-orange/10 text-accent-orange",
                      )}
                    >
                      {i.paid ? "Paid" : "Due"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "users" && (
        <div className="rounded-2xl border border-navy/5 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-navy/5 p-5">
            <h2 className="text-base font-semibold">Team & Roles</h2>
            <button className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90">
              <Plus className="h-4 w-4" /> Invite User
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-navy/50">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {teamUsers.map((u) => (
                <tr key={u.email}>
                  <td className="px-5 py-3 font-semibold">{u.name}</td>
                  <td className="px-5 py-3 text-navy/70">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-navy/5 px-2.5 py-1 text-xs font-medium text-navy/70">
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
