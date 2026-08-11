import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { Search as SearchIcon, Package, User, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { globalSearch, STATUS_LABEL, statusColor } from "@/lib/data";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Search — VoltCargo" },
      {
        name: "description",
        content: "Search VoltCargo by Client ID or Shipment Consignment Code.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial ?? "");
  const {
    data: result,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["global-search", initial],
    queryFn: () => globalSearch(initial ?? ""),
    enabled: Boolean(initial),
  });

  return (
    <div className="min-h-screen bg-surface text-navy">
      <SiteHeader />
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-3 text-4xl font-bold tracking-tight">Global Search</h1>
          <p className="mb-8 text-navy/60">
            Search by <span className="font-mono font-semibold text-navy">Client ID</span> (
            <span className="font-mono">CL-7C2E9A4B1F80</span>) or{" "}
            <span className="font-mono font-semibold text-navy">Shipment Code</span> (
            <span className="font-mono">VC-2026-A9F3C8D2E1B4</span>).
          </p>

          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = q.trim();
              if (trimmed) window.location.href = `/search?q=${encodeURIComponent(trimmed)}`;
            }}
          >
            <SearchIcon className="absolute top-1/2 left-6 h-5 w-5 -translate-y-1/2 text-navy/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-2xl border border-navy/10 bg-white py-5 pr-40 pl-14 text-sm shadow-xl shadow-navy/5 focus:ring-2 focus:ring-brand/20 focus:outline-none"
              placeholder="CL-7C2E9A4B1F80  or  VC-2026-A9F3C8D2E1B4"
            />
            <button
              type="submit"
              className="absolute top-2 right-2 bottom-2 rounded-xl bg-brand px-6 font-semibold text-white hover:bg-brand/90"
            >
              Search
            </button>
          </form>

          <div className="mt-10">
            {isLoading && (
              <div className="rounded-3xl border border-navy/5 bg-white p-12 text-center text-navy/50">
                Searching Supabase...
              </div>
            )}

            {error && (
              <div className="rounded-3xl border border-navy/10 bg-white p-10 text-center text-navy/70">
                {error instanceof Error ? error.message : "Search failed."}
              </div>
            )}

            {!initial && (
              <div className="rounded-3xl border border-dashed border-navy/10 bg-white p-12 text-center text-navy/50">
                Enter a Client ID or Shipment Code to see results.
              </div>
            )}

            {!isLoading && !error && result?.kind === "none" && (
              <div className="rounded-3xl border border-navy/10 bg-white p-10 text-center">
                <p className="text-navy/70">
                  No matches for <span className="font-mono font-semibold">{result.query}</span>.
                </p>
                <p className="mt-2 text-xs text-navy/50">
                  Double-check the format: <span className="font-mono">CL-7C2E9A4B1F80</span> or{" "}
                  <span className="font-mono">VC-2026-A9F3C8D2E1B4</span>.
                </p>
              </div>
            )}

            {!isLoading && !error && result?.kind === "shipment" && (
              <div className="rounded-3xl border border-navy/5 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-navy/40">
                  <Package className="h-4 w-4" /> Shipment
                </div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link
                      to="/shipments/$id"
                      params={{ id: result.shipment.code }}
                      className="font-mono text-2xl font-bold text-brand hover:underline"
                    >
                      {result.shipment.code}
                    </Link>
                    <p className="mt-1 text-sm text-navy/60">{result.shipment.description}</p>
                    <p className="mt-1 text-xs text-navy/50">
                      {result.shipment.origin} → {result.shipment.destination} ·{" "}
                      {result.shipment.mode}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
                      statusColor(result.shipment.status),
                    )}
                  >
                    {STATUS_LABEL[result.shipment.status]}
                  </span>
                </div>
                {result.client && (
                  <div className="mt-6 flex items-center justify-between border-t border-navy/5 pt-4 text-sm">
                    <div>
                      <p className="text-xs text-navy/50">Owned by</p>
                      <p className="font-semibold">{result.client.name}</p>
                      <p className="font-mono text-xs text-navy/60">{result.client.clientId}</p>
                    </div>
                    <Link
                      to="/clients/$id"
                      params={{ id: result.client.clientId }}
                      className="inline-flex items-center gap-1 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy/90"
                    >
                      Client profile <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {!isLoading && !error && result?.kind === "client" && (
              <div className="rounded-3xl border border-navy/5 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-navy/40">
                  <User className="h-4 w-4" /> Client
                </div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold">{result.client.name}</p>
                    <p className="font-mono text-sm text-brand">{result.client.clientId}</p>
                    <p className="mt-1 text-xs text-navy/50">
                      {result.client.email} · {result.client.phone}
                    </p>
                  </div>
                  <Link
                    to="/clients/$id"
                    params={{ id: result.client.clientId }}
                    className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand/90"
                  >
                    Full profile <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="mt-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-navy/40">
                    Shipments ({result.shipments.length})
                  </p>
                  <ul className="divide-y divide-navy/5 rounded-xl border border-navy/5">
                    {result.shipments.map((s) => (
                      <li key={s.code} className="flex items-center justify-between p-3 text-sm">
                        <Link
                          to="/shipments/$id"
                          params={{ id: s.code }}
                          className="font-mono font-semibold text-brand hover:underline"
                        >
                          {s.code}
                        </Link>
                        <span className="text-xs text-navy/60">
                          {s.origin} → {s.destination}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs ring-1 ring-inset",
                            statusColor(s.status),
                          )}
                        >
                          {STATUS_LABEL[s.status]}
                        </span>
                      </li>
                    ))}
                    {result.shipments.length === 0 && (
                      <li className="p-6 text-center text-xs text-navy/50">
                        This client has no shipments yet.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
