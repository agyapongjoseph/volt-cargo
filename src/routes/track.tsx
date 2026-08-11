import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { Search, Package, CheckCircle2, Circle, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  findClient,
  isClientId,
  publicTrackShipment,
  shipmentsForClient,
  STATUS_LABEL,
  STATUS_ORDER,
  type Client,
  type Shipment,
} from "@/lib/data";

const searchSchema = z.object({ code: z.string().optional(), client: z.string().optional() });

type TrackingResult =
  | { kind: "shipment"; shipment: Shipment }
  | { kind: "client"; client: Client; shipments: Shipment[] }
  | undefined;

export const Route = createFileRoute("/track")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Track Shipment — VoltCargo" },
      {
        name: "description",
        content: "Track your VoltCargo shipment in real time by consignment code.",
      },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { code: initialCode, client: initialClient } = Route.useSearch();
  const initial = initialClient ?? initialCode ?? "";
  const [code, setCode] = useState(initial);
  const submitted = initial.length > 0;
  const {
    data: result,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["track", initial],
    queryFn: async (): Promise<TrackingResult> => {
      if (isClientId(initial)) {
        const client = await findClient(initial);
        if (!client) return undefined;
        return { kind: "client", client, shipments: await shipmentsForClient(client.clientId) };
      }

      const shipment = await publicTrackShipment(initial);
      return shipment ? { kind: "shipment", shipment } : undefined;
    },
    enabled: Boolean(submitted),
  });
  const shipment = result?.kind === "shipment" ? result.shipment : undefined;
  const currentIdx = shipment ? STATUS_ORDER.indexOf(shipment.status) : -1;

  return (
    <div className="min-h-screen bg-surface text-navy">
      <SiteHeader />
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-4 text-4xl font-bold tracking-tight lg:text-5xl">Track Shipment</h1>
          <p className="mb-10 text-navy/60">
            Enter your consignment code or client ID to view shipment status.
          </p>
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = code.trim();
              if (trimmed) {
                const param = isClientId(trimmed) ? "client" : "code";
                window.location.href = `/track?${param}=${encodeURIComponent(trimmed)}`;
              }
            }}
          >
            <Search className="absolute top-1/2 left-6 h-5 w-5 -translate-y-1/2 text-navy/40" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-2xl border border-navy/10 bg-white py-5 pr-40 pl-14 text-sm shadow-xl shadow-navy/5 focus:ring-2 focus:ring-brand/20 focus:outline-none"
              placeholder="VC-2026-A9F3C8D2E1B4 or CL-7C2E9A4B1F80"
            />
            <button
              type="submit"
              className="absolute top-2 right-2 bottom-2 rounded-xl bg-brand px-6 font-semibold text-white hover:bg-brand/90"
            >
              Track
            </button>
          </form>

          {submitted && isLoading ? (
            <div className="mt-10 rounded-3xl border border-navy/5 bg-white p-12 text-center text-navy/50">
              Loading tracking details...
            </div>
          ) : submitted && error ? (
            <div className="mt-10 rounded-3xl border border-navy/10 bg-white p-12 text-center text-navy/70">
              {error instanceof Error ? error.message : "Could not load tracking details."}
            </div>
          ) : submitted && result?.kind === "client" ? (
            <div className="mt-10 overflow-hidden rounded-3xl border border-navy/5 bg-white shadow-sm">
              <div className="border-b border-navy/5 bg-surface p-6">
                <p className="text-xs font-bold tracking-widest text-navy/40 uppercase">
                  Client ID
                </p>
                <h2 className="mt-1 font-mono text-2xl font-bold text-brand">
                  {result.client.clientId}
                </h2>
                <p className="mt-1 text-sm text-navy/50">
                  {result.client.name} · {result.shipments.length} shipment
                  {result.shipments.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="divide-y divide-navy/5">
                {result.shipments.map((s) => (
                  <div
                    key={s.code}
                    className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <p className="font-mono font-bold text-brand">{s.code}</p>
                      <p className="mt-1 text-sm font-semibold">
                        {s.origin} to {s.destination}
                      </p>
                      <p className="text-xs text-navy/45">{s.description}</p>
                    </div>
                    <div className="md:text-right">
                      <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                        {STATUS_LABEL[s.status]}
                      </span>
                      <p className="mt-2 text-xs text-navy/45">ETA: {s.eta || "Pending"}</p>
                    </div>
                  </div>
                ))}
                {result.shipments.length === 0 && (
                  <div className="p-10 text-center text-navy/50">
                    No shipments are currently linked to this client ID.
                  </div>
                )}
              </div>
            </div>
          ) : submitted && shipment ? (
            <div className="mt-10 overflow-hidden rounded-3xl border border-navy/5 bg-white shadow-sm">
              <div className="flex flex-col items-start justify-between gap-4 border-b border-navy/5 bg-surface p-6 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest text-navy/40 uppercase">
                      Consignment
                    </p>
                    <p className="font-mono text-lg font-bold">{shipment.code}</p>
                    <p className="text-xs text-navy/50">{shipment.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold tracking-widest text-navy/40 uppercase">
                    Estimated Arrival
                  </p>
                  <p className="text-lg font-bold">{shipment.eta}</p>
                </div>
              </div>
              <div className="p-8">
                <ol className="relative border-l border-navy/10">
                  {STATUS_ORDER.map((status, i) => {
                    const done = i <= currentIdx;
                    const active = i === currentIdx;
                    return (
                      <li key={status} className="mb-8 ml-6 last:mb-0">
                        <span
                          className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ${
                            done
                              ? "bg-accent-green text-white"
                              : active
                                ? "bg-brand text-white"
                                : "bg-white ring-2 ring-navy/10 text-navy/30"
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : active ? (
                            <Clock className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <h4
                          className={`font-semibold ${active ? "text-brand" : done ? "text-navy" : "text-navy/40"}`}
                        >
                          {STATUS_LABEL[status]}
                        </h4>
                        <p className="text-xs text-navy/50">
                          {done ? (active ? "Current milestone" : "Completed") : "Pending"}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          ) : submitted ? (
            <div className="mt-10 rounded-3xl border border-navy/10 bg-white p-12 text-center">
              <p className="text-navy/70">
                No tracking record found for{" "}
                <span className="font-mono font-semibold">{initial}</span>.
              </p>
              <p className="mt-2 text-sm text-navy/40">
                Try a consignment code like <span className="font-mono">VC-2026-A9F3C8D2E1B4</span>{" "}
                or a client ID like <span className="font-mono">CL-7C2E9A4B1F80</span>.
              </p>
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-dashed border-navy/10 bg-white p-12 text-center">
              <p className="text-navy/50">
                Enter a consignment code or client ID above to see live shipment status.
              </p>
              <p className="mt-4 text-sm text-navy/40">
                Don't have one yet?{" "}
                <Link to="/auth" className="font-semibold text-brand hover:underline">
                  Create your first shipment
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
