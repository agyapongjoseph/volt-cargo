import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { Search, Package, CheckCircle2, Circle, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { publicTrackShipment, STATUS_LABEL, STATUS_ORDER } from "@/lib/data";

const searchSchema = z.object({ code: z.string().optional() });

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
  const { code: initial } = Route.useSearch();
  const [code, setCode] = useState(initial ?? "");
  const submitted = initial && initial.length > 0;
  const {
    data: shipment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["track", initial],
    queryFn: () => publicTrackShipment(initial ?? ""),
    enabled: Boolean(submitted),
  });
  const currentIdx = shipment ? STATUS_ORDER.indexOf(shipment.status) : -1;

  return (
    <div className="min-h-screen bg-surface text-navy">
      <SiteHeader />
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-4 text-4xl font-bold tracking-tight lg:text-5xl">Track Shipment</h1>
          <p className="mb-10 text-navy/60">
            Enter your consignment code (format: VC-2026-000001) to view real-time status.
          </p>
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = code.trim();
              if (trimmed) window.location.href = `/track?code=${encodeURIComponent(trimmed)}`;
            }}
          >
            <Search className="absolute top-1/2 left-6 h-5 w-5 -translate-y-1/2 text-navy/40" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-2xl border border-navy/10 bg-white py-5 pr-40 pl-14 text-sm shadow-xl shadow-navy/5 focus:ring-2 focus:ring-brand/20 focus:outline-none"
              placeholder="VC-2026-000001"
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
                No shipment found for <span className="font-mono font-semibold">{initial}</span>.
              </p>
              <p className="mt-2 text-sm text-navy/40">
                Try a demo code like <span className="font-mono">VC-2026-000001</span>.
              </p>
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-dashed border-navy/10 bg-white p-12 text-center">
              <p className="text-navy/50">
                Enter a consignment code above to see live shipment status.
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
