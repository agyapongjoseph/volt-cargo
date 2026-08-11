import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PortalShell, StatCard } from "@/components/portal-shell";
import {
  getClientDashboardData,
  createShipmentForCurrentClient,
  initiateInvoicePayment,
  STATUS_LABEL,
  statusColor,
  type Client,
  type Shipment,
} from "@/lib/data";
import { Plus, Search, Download, X, CheckCircle2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const chinaWarehouseAddress = [
  "North Area of Shanghua Industrial Zone",
  "Lecong Town, Shunde District",
  "Foshan City, Guangdong Province, China",
  "佛山市顺德区乐从镇上华工业北区1号",
];

const shippingServices = [
  {
    id: "air-normal",
    family: "Air Freight",
    name: "Air Normal",
    mode: "Air" as const,
    timeline: "7-14 days after dispatch",
    estimate: "$15/kg",
    rate: 15,
    unit: "kg",
    note: "Best balance for regular stock that still needs air speed.",
  },
  {
    id: "air-express",
    family: "Air Freight",
    name: "Air Express",
    mode: "Air" as const,
    timeline: "2-5 days after dispatch",
    estimate: "$20/kg",
    rate: 20,
    unit: "kg",
    note: "Fastest option for urgent, lightweight, or high-value goods.",
  },
  {
    id: "air-battery",
    family: "Air Freight",
    name: "Battery ",
    mode: "Air" as const,
    timeline: "Special handling by air",
    estimate: "$25/kg",
    rate: 25,
    unit: "kg",
    note: "For batteries and regulated air cargo requiring special handling.",
  },
  {
    id: "air-phone",
    family: "Air Freight",
    name: "Phones",
    mode: "Air" as const,
    timeline: "Special handling by air",
    estimate: "$25/kg",
    rate: 25,
    unit: "kg",
    note: "For mobile phones and similar high-value electronics.",
  },
  {
    id: "ocean-lcl",
    family: "Ocean Freight",
    name: "LCL",
    mode: "Sea" as const,
    timeline: "30-45 days after sailing",
    estimate: "$250/CBM",
    rate: 250,
    unit: "cbm",
    note: "Shared container service for smaller sea shipments.",
  },
  {
    id: "ocean-fcl",
    family: "Ocean Freight",
    name: "FCL",
    mode: "Sea" as const,
    timeline: "30-45 days after sailing",
    estimate: "$5,900 flat estimate",
    rate: 5900,
    unit: "flat",
    note: "Dedicated full-container movement for larger cargo.",
  },
];

const shipmentPaths = [
  {
    id: "own-supplier",
    title: "I already have a supplier",
    desc: "Create a consignment code and give it with our China warehouse address to your supplier or sourcer.",
  },
  {
    id: "voltcargo-sourcing",
    title: "I want VoltCargo to source and ship",
    desc: "VoltCargo helps buy the goods, receives the consignment internally, and handles shipping for you.",
  },
] as const;

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — VoltCargo" },
      { name: "description", content: "Manage your shipments, invoices, and deliveries." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [showNew, setShowNew] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["client-dashboard"],
    queryFn: getClientDashboardData,
  });
  const paymentMutation = useMutation({ mutationFn: initiateInvoicePayment });
  const currentClient = data?.currentClient ?? null;
  const clientShipments = data?.shipments ?? [];
  const clientInvoices = data?.invoices ?? [];

  const filtered = clientShipments.filter(
    (s) =>
      s.code.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase()),
  );

  const active = clientShipments.filter((s) => s.status !== "delivered").length;
  const delivered = clientShipments.filter((s) => s.status === "delivered").length;
  const outstanding = clientInvoices.filter((i) => !i.paid).reduce((sum, i) => sum + i.amount, 0);
  const paidSpend = clientInvoices.filter((i) => i.paid).reduce((sum, i) => sum + i.amount, 0);

  useEffect(() => {
    if (!exportOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) {
        setExportOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [exportOpen]);

  if (isLoading) {
    return (
      <PortalShell role="client" title="Loading dashboard" subtitle="Fetching your shipments">
        <PanelMessage>Loading your VoltCargo account...</PanelMessage>
      </PortalShell>
    );
  }

  if (error) {
    return (
      <PortalShell
        role="client"
        title="Dashboard unavailable"
        subtitle="Supabase returned an error"
      >
        <PanelMessage>
          {error instanceof Error ? error.message : "Could not load dashboard."}
        </PanelMessage>
      </PortalShell>
    );
  }

  if (!currentClient) {
    return (
      <PortalShell role="client" title="Sign in required" subtitle="No client profile found">
        <PanelMessage>
          Sign in at{" "}
          <Link to="/auth" className="font-semibold text-brand hover:underline">
            /auth
          </Link>{" "}
          to view your client dashboard.
        </PanelMessage>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      role="client"
      title={`Welcome back, ${currentClient.name.split(" ")[0]}`}
      subtitle={`Client ID · ${currentClient.clientId}`}
      actions={
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" /> New Shipment
        </button>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-navy/5 bg-white p-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
          {currentClient.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div>
          <p className="text-sm font-semibold text-navy">{currentClient.name}</p>
          <p className="font-mono text-xs text-brand">{currentClient.clientId} · permanent</p>
        </div>
        <span className="ml-auto rounded-full bg-surface px-3 py-1 text-xs text-navy/60">
          {currentClient.email}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active shipments"
          value={active}
          hint="In transit or processing"
          accent="brand"
        />
        <StatCard
          label="Delivered (30d)"
          value={delivered}
          hint="On-time rate 96%"
          accent="green"
        />
        <StatCard
          label="Outstanding"
          value={`$${outstanding.toLocaleString()}`}
          hint={`${clientInvoices.filter((i) => !i.paid).length} invoices`}
          accent="orange"
        />
        <StatCard
          label="Paid spend YTD"
          value={`$${paidSpend.toLocaleString()}`}
          hint="Paid invoices only"
          accent="brand"
        />
      </div>

      <section id="shipments" className="mt-8 rounded-2xl border border-navy/5 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-navy/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">My Shipments</h2>
            <p className="text-xs text-navy/50">Track and manage every consignment</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search code or item"
                className="w-64 rounded-full border border-navy/10 bg-surface py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div ref={exportRef} className="relative">
              <button
                onClick={() => setExportOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-4 py-2 text-xs font-semibold text-navy/70 hover:bg-surface"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 z-10 mt-2 w-36 overflow-hidden rounded-xl border border-navy/10 bg-white py-1 shadow-xl">
                  {(["pdf", "excel", "csv"] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => {
                        exportShipments(filtered, format);
                        setExportOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-xs font-semibold text-navy/70 hover:bg-surface"
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* <div className="flex rounded-full border border-navy/10 bg-white p-1">
              {(["csv", "excel", "pdf"] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => exportShipments(filtered, format)}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-navy/70 hover:bg-surface"
                >
                  <Download className="h-3.5 w-3.5" /> {format.toUpperCase()}
                </button>
              ))}
            </div> */}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-navy/50">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Code</th>
                <th className="px-5 py-3 text-left font-medium">Route</th>
                <th className="px-5 py-3 text-left font-medium">Mode</th>
                <th className="px-5 py-3 text-left font-medium">Weight</th>
                <th className="px-5 py-3 text-left font-medium">ETA</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {filtered.map((s) => (
                <tr key={s.code} className="hover:bg-surface/60">
                  <td className="px-5 py-3">
                    <Link
                      to="/shipments/$id"
                      params={{ id: s.code }}
                      className="font-mono font-semibold text-brand hover:underline"
                    >
                      {s.code}
                    </Link>
                    <ShipmentDescription value={s.description} />
                  </td>
                  <td className="px-5 py-3 text-xs text-navy/70">
                    {s.origin} → {s.destination}
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-md bg-navy/5 px-2 py-1 text-xs font-medium text-navy/70">
                      {s.mode}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-navy/70">
                    {s.mode === "Air" ? `${s.weightKg || 0} kg` : `${s.cbm || 0} CBM`}
                  </td>
                  <td className="px-5 py-3 text-navy/70">{s.eta || "Pending"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                        statusColor(s.status),
                      )}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={cn(
                        "font-semibold",
                        s.paid ? "text-accent-green" : "text-accent-orange",
                      )}
                    >
                      {s.invoiceTotal ? `$${s.invoiceTotal.toLocaleString()}` : "Pending"}
                    </span>
                    <p className="text-xs text-navy/50">
                      {s.invoiceTotal ? (s.paid ? "Paid" : "Due in Ghana") : "Issued on arrival"}
                    </p>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-navy/50">
                    No shipments match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="invoices"
        className="mt-8 rounded-2xl border border-navy/5 bg-white p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Invoices</h2>
            <p className="text-xs text-navy/50">Pay securely with Paystack</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {clientInvoices.map((inv) => (
            <div key={inv.id} className="rounded-xl border border-navy/5 bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-navy/60">{inv.id}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    inv.paid
                      ? "bg-accent-green/10 text-accent-green"
                      : "bg-accent-orange/10 text-accent-orange",
                  )}
                >
                  {inv.paid ? "Paid" : "Due"}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">${inv.amount.toLocaleString()}</p>
              <p className="text-xs text-navy/50">
                {inv.code} • Issued {inv.issued}
              </p>
              {!inv.paid && (
                <button
                  onClick={() => paymentMutation.mutate(inv.id)}
                  disabled={paymentMutation.isPending}
                  className="mt-3 w-full rounded-full bg-brand py-2 text-xs font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {paymentMutation.isPending ? "Opening Paystack..." : "Pay with Paystack"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {showNew && <NewShipmentModal client={currentClient} onClose={() => setShowNew(false)} />}
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

function exportShipments(shipments: Shipment[], format: "csv" | "excel" | "pdf") {
  const rows = shipments.map((shipment) => ({
    Code: shipment.code,
    Description: shipment.description,
    Route: `${shipment.origin} -> ${shipment.destination}`,
    Mode: shipment.mode,
    Pieces: shipment.pieces,
    Weight: shipment.mode === "Air" ? `${shipment.weightKg || 0} kg` : `${shipment.cbm || 0} CBM`,
    ETA: shipment.eta || "Pending",
    Status: STATUS_LABEL[shipment.status],
    Invoice: shipment.invoiceTotal ? `$${shipment.invoiceTotal.toLocaleString()}` : "Pending",
    Payment: shipment.invoiceTotal
      ? shipment.paid
        ? "Paid"
        : "Due in Ghana"
      : "Issued on arrival",
  }));

  if (format === "csv") {
    downloadFile("voltcargo-shipments.csv", `\uFEFF${toCsv(rows)}`, "text/csv;charset=utf-8");
    return;
  }

  if (format === "excel") {
    downloadFile(
      "voltcargo-shipments.xls",
      toExcelDocument(rows),
      "application/vnd.ms-excel;charset=utf-8",
    );
    return;
  }

  downloadFile("voltcargo-shipments.pdf", toPdfDocument(rows), "application/pdf");
}

function parseShipmentDescription(value: string) {
  const match = value.match(/^\[(.*?)\]\s*(.*?):\s*(.*)$/);
  if (!match) return { path: "", service: "", item: value };
  return { path: match[1], service: match[2], item: match[3] };
}

function ShipmentDescription({ value }: { value: string }) {
  const parsed = parseShipmentDescription(value);
  if (!parsed.path && !parsed.service) {
    return <p className="text-xs text-navy/50">{value}</p>;
  }

  return (
    <div className="mt-1 space-y-1">
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
          {parsed.path}
        </span>
        <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[11px] font-semibold text-navy/60">
          {parsed.service}
        </span>
      </div>
      <p className="text-xs text-navy/55">{parsed.item}</p>
    </div>
  );
}

function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "No shipments\n";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");
}

function toExcelTable(rows: Record<string, string | number>[]) {
  if (!rows.length) return "<table><tr><td>No shipments</td></tr></table>";
  const headers = Object.keys(rows[0]);
  return `
    <table>
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function toExcelDocument(rows: Record<string, string | number>[]) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #f8fafc; font-weight: 700; }
        </style>
      </head>
      <body>${toExcelTable(rows)}</body>
    </html>
  `;
}

function toPdfDocument(rows: Record<string, string | number>[]) {
  const lines = [
    "VoltCargo Shipments",
    `Generated ${new Date().toLocaleString()}`,
    "",
    ...(rows.length
      ? rows.map(
          (row) =>
            `${row.Code} | ${row.Mode} | ${row.Route} | ${row.Weight} | ${row.Status} | ${row.Invoice}`,
        )
      : ["No shipments"]),
  ];
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 36) pages.push(lines.slice(index, index + 36));

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  objects.push(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );

  pages.forEach((page, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const content = [
      "BT",
      "/F1 10 Tf",
      "50 790 Td",
      ...page.flatMap((line, lineIndex) => [
        lineIndex === 0 && index === 0
          ? "/F1 16 Tf"
          : lineIndex === 1 && index === 0
            ? "/F1 10 Tf"
            : "",
        `(${escapePdfText(String(line).slice(0, 110))}) Tj`,
        "0 -20 Td",
      ]),
      "ET",
    ]
      .filter(Boolean)
      .join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${objects.length + 3} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  const fontObjectId = objects.length + 1;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  for (let index = 0; index < pages.length; index++) {
    const pageObjectIndex = 2 + index * 2;
    objects[pageObjectIndex] = objects[pageObjectIndex].replace(
      /\/F1 \d+ 0 R/,
      `/F1 ${fontObjectId} 0 R`,
    );
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toPrintablePdf(rows: Record<string, string | number>[]) {
  return `
    <!doctype html>
    <html>
      <head>
        <title>VoltCargo Shipments</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
          h1 { margin-bottom: 4px; }
          p { color: rgba(15, 23, 42, 0.6); }
          table { border-collapse: collapse; width: 100%; margin-top: 24px; font-size: 12px; }
          th, td { border: 1px solid rgba(15, 23, 42, 0.12); padding: 8px; text-align: left; }
          th { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>VoltCargo Shipments</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        ${toExcelTable(rows)}
      </body>
    </html>
  `;
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function calculateEstimate(
  service: (typeof shippingServices)[number],
  weightKg: string,
  cbm: string,
) {
  if (service.unit === "flat") return service.rate;
  const quantity = service.unit === "kg" ? Number(weightKg || 0) : Number(cbm || 0);
  return Math.max(0, Math.round(quantity * service.rate * 100) / 100);
}

function NewShipmentModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [path, setPath] = useState<(typeof shipmentPaths)[number]["id"]>("own-supplier");
  const [serviceId, setServiceId] = useState(shippingServices[0].id);
  const [origin, setOrigin] = useState("Guangzhou, CN");
  const [destination, setDestination] = useState("Accra, GH");
  const [description, setDescription] = useState("");
  const [pieces, setPieces] = useState("1");
  const [weightKg, setWeightKg] = useState("");
  const [cbm, setCbm] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const selectedService =
    shippingServices.find((service) => service.id === serviceId) ?? shippingServices[0];
  const selectedPath = shipmentPaths.find((item) => item.id === path) ?? shipmentPaths[0];
  const estimatedPrice = calculateEstimate(selectedService, weightKg, cbm);
  const createShipment = useMutation({
    mutationFn: () =>
      createShipmentForCurrentClient({
        origin,
        destination,
        mode: selectedService.mode,
        description: `[${selectedPath.title}] ${selectedService.family} - ${selectedService.name}: ${description}`,
        pieces: Number(pieces || 0),
        weightKg: Number(weightKg || 0),
        cbm: Number(cbm || 0),
        declaredValue: estimatedPrice,
      }),
    onSuccess: async (shipment) => {
      setCreatedCode(shipment.code);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["client-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["portal-notifications"] }),
      ]);
    },
  });

  const finish = async () => {
    if (createdCode) {
      onClose();
      return;
    }
    await createShipment.mutateAsync();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-3 sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="shrink-0 flex items-center justify-between border-b border-navy/5 p-4">
          <div>
            <h3 className="text-lg font-semibold">Create New Shipment</h3>
            <p className="text-xs text-navy/50">Step {step} of 3</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-navy/40 hover:text-navy">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-navy/70">
                  What do you need VoltCargo to do?
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  {shipmentPaths.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPath(item.id)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors hover:border-brand",
                        path === item.id ? "border-brand bg-brand/5" : "border-navy/10 bg-surface",
                      )}
                    >
                      <p className="font-semibold text-navy">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-navy/50">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-navy/70">
                  Shipping package
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  {shippingServices.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setServiceId(service.id)}
                      className={cn(
                        "rounded-xl border p-3 text-left hover:border-brand",
                        serviceId === service.id
                          ? "border-brand bg-brand/5"
                          : "border-navy/10 bg-surface",
                      )}
                    >
                      <p className="text-xs font-bold tracking-widest text-brand uppercase">
                        {service.family}
                      </p>
                      <p className="mt-1 font-semibold text-navy">{service.name}</p>
                      <p className="mt-1 text-xs text-navy/50">{service.timeline}</p>
                      <p className="mt-2 text-sm font-bold text-navy">{service.estimate}</p>
                      <p className="mt-1 text-[11px] text-navy/45">{service.note}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-3 rounded-xl bg-accent-orange/10 p-3 text-xs leading-relaxed text-navy/65">
                  Estimates are guidance only. Final charges can change after goods arrive in Ghana
                  because actual weight, volume, customs, duties, and local handling are confirmed
                  at arrival. Payment is made when goods arrive in Ghana before release/delivery.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Origin"
                  value={origin}
                  onChange={setOrigin}
                  placeholder="Guangzhou, CN"
                />
                <Field
                  label="Destination"
                  value={destination}
                  onChange={setDestination}
                  placeholder="Accra, GH"
                />
              </div>
              <Field
                label="Item description"
                value={description}
                onChange={setDescription}
                placeholder="Consumer electronics"
              />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Pieces"
                  value={pieces}
                  onChange={setPieces}
                  type="number"
                  placeholder="3"
                />
                {selectedService.mode === "Air" ? (
                  <Field
                    label="Weight (kg)"
                    value={weightKg}
                    onChange={setWeightKg}
                    type="number"
                    placeholder="42.5"
                  />
                ) : (
                  <Field
                    label="CBM"
                    value={cbm}
                    onChange={setCbm}
                    type="number"
                    placeholder="0.18"
                  />
                )}
              </div>
              <div className="rounded-xl border border-brand/10 bg-brand/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                  Estimated value
                </p>
                <p className="mt-2 text-3xl font-bold text-navy">
                  ${estimatedPrice.toLocaleString()}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-navy/55">
                  Calculated from {selectedService.estimate}. Air packages use KG, Ocean LCL uses
                  CBM, and Ocean FCL uses a flat container estimate. Final invoice may change after
                  Ghana arrival when actual measurements, customs, duties, and local handling are
                  confirmed.
                </p>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-navy/5 bg-surface p-4">
                <p className="text-xs font-semibold uppercase text-navy/50">Client ID</p>
                <p className="mt-1 font-mono text-lg font-bold text-navy">{client.clientId}</p>
                <p className="mt-1 text-xs text-navy/50">
                  This shipment will be permanently linked to your Client ID.
                </p>
              </div>
              <div className="rounded-xl border border-navy/5 bg-surface p-4">
                <p className="text-xs font-semibold uppercase text-navy/50">Consignment code</p>
                <p className="mt-1 font-mono text-2xl font-bold text-brand">
                  {createdCode ?? "Generated after submit"}
                </p>
                <p className="mt-1 text-xs text-navy/50">
                  {path === "own-supplier"
                    ? "Give this code to your supplier or sourcer when they deliver to our China warehouse."
                    : "VoltCargo will use this code internally while sourcing, receiving, and shipping your goods."}
                </p>
              </div>
              <div className="rounded-xl border border-navy/5 bg-surface p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-navy/50">
                  <MapPin className="h-3.5 w-3.5" /> VoltCargo China warehouse address -Copy Address
                </div>
                <div className="space-y-1 text-sm font-semibold text-navy">
                  {chinaWarehouseAddress.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-navy/5 bg-surface p-4">
                <p className="text-xs font-semibold uppercase text-navy/50">Selected package</p>
                <p className="mt-1 text-lg font-bold">
                  {selectedService.family} - {selectedService.name}
                </p>
                <p className="mt-1 text-xs text-navy/50">
                  {selectedService.estimate}. Final shipping invoice is confirmed when goods arrive
                  in Ghana and must be paid before release/delivery.
                </p>
              </div>
              {createdCode && (
                <div className="rounded-xl border border-accent-green/10 bg-accent-green/10 p-4 text-sm text-navy/70">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-accent-green">
                    <CheckCircle2 className="h-4 w-4" /> Shipment created successfully
                  </div>
                  {path === "own-supplier"
                    ? "Send the consignment code and warehouse address to your supplier. They must present both when delivering your goods."
                    : "Our sourcing team can now handle purchase, receiving, and shipping under this consignment code."}
                </div>
              )}
              {createShipment.error && (
                <p className="rounded-xl bg-accent-red/10 p-3 text-xs text-accent-red">
                  {createShipment.error instanceof Error
                    ? createShipment.error.message
                    : "Shipment could not be created."}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center justify-between border-t border-navy/5 p-4">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            className="rounded-full px-4 py-2 text-sm font-semibold text-navy/60 hover:bg-surface"
          >
            {step > 1 ? "Back" : "Cancel"}
          </button>
          <button
            onClick={() => (step < 3 ? setStep(step + 1) : finish())}
            disabled={createShipment.isPending || (step === 1 && !description.trim())}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand/90"
          >
            {step < 3
              ? "Continue"
              : createShipment.isPending
                ? "Creating..."
                : createdCode
                  ? "Close"
                  : "Create shipment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-navy/70">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
    </div>
  );
}
