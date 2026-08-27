import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
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
import { Plus, Search, Download, X, CheckCircle2, MapPin, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const voltCargoLogo =
  "https://9q2eejtmhi.ufs.sh/f/d8EdUjADIce9Q1BoILwrQF0SXWVDEYMIpjnctyT1kBl8z3He";

const warehouseAddresses = {
  "Air Freight": [
    "2F12, 2nd Floor, Jiuzhilong Trade City",
    "No. 18 Guangyuan West Road",
    "Kuangquan Street, Yuexiu District",
    "Guangzhou City, Guangdong Province, China",
    "广东省广州市越秀区广州市矿泉街道广园西路18号九之龙商贸城2楼2F12",
  ],
  "Ocean Freight": [
    "North Area of Shanghua Industrial Zone",
    "Lecong Town, Shunde District",
    "Foshan City, Guangdong Province, China",
    "佛山市顺德区乐从镇上华工业北区1号",
  ],
} as const;

type FreightFamily = keyof typeof warehouseAddresses;

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
    name: "Batteries & Electronics",
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
    estimate: "$25/unit",
    rate: 25,
    unit: "unit",
    note: "For mobile phones charged per device unit.",
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
                        void exportShipments(filtered, format);
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
            <p className="text-xs text-navy/50">Pay securely with Hubtel</p>
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
                  {paymentMutation.isPending ? "Opening Hubtel..." : "Pay with Hubtel"}
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

async function exportShipments(shipments: Shipment[], format: "csv" | "excel" | "pdf") {
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

  await downloadPdfDocument(rows);
}

function parseShipmentDescription(value: string) {
  const match = value.match(/^\[(.*?)\]\s*(.*?):\s*(.*)$/);
  if (!match) return { path: "", service: "", item: value };
  return { path: match[1], service: match[2], item: match[3] };
}

function formatPdfDescription(value: string | number | undefined) {
  const parsed = parseShipmentDescription(String(value ?? ""));
  if (!parsed.path && !parsed.service) return parsed.item || "Shipment";

  const source = parsed.path === "I already have a supplier" ? "Own supplier" : parsed.path;
  return [parsed.item || "Shipment", parsed.service, source].filter(Boolean).join("\n");
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

type LoadedLogo = { dataUrl: string; width: number; height: number };

function loadLogoImage(url: string): Promise<LoadedLogo | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

type JsPDFWithGState = jsPDF & {
  GState: new (params: { opacity?: number }) => unknown;
};

function setPdfOpacity(doc: jsPDF, opacity: number) {
  doc.setGState(new (doc as JsPDFWithGState).GState({ opacity }));
}

async function downloadPdfDocument(rows: Record<string, string | number>[]) {
  const totalInvoices = rows.reduce((sum, row) => {
    const amount = Number(String(row.Invoice ?? "").replace(/[^0-9.]/g, ""));
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const pdfRows = rows.map((row) => ({
    ...row,
    Description: formatPdfDescription(row.Description),
  }));
  const logo = await loadLogoImage(voltCargoLogo);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 24;
  const contentWidth = pageWidth - margin * 2;
  const navy = [15, 23, 42] as const;
  const blue = [37, 99, 235] as const;
  const surface = [248, 250, 252] as const;
  const border = [226, 232, 240] as const;
  const slate = [100, 116, 139] as const;
  const green = [16, 185, 129] as const;
  const amber = [217, 119, 6] as const;
  const headers = [
    "Code",
    "Description",
    "Route",
    "Mode",
    "Pieces",
    "Weight",
    "ETA",
    "Status",
    "Invoice",
    "Payment",
  ];
  const widths = [88, 170, 100, 36, 40, 50, 56, 70, 54, 104];
  let y = margin;

  doc.setFillColor(...surface);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  const addFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(116, 132, 155);
    doc.text("VoltCargo Logistics Group", margin, pageHeight - 18);
    doc.text(
      "China to Ghana sourcing, shipping, QC and delivery",
      pageWidth - margin,
      pageHeight - 18,
      {
        align: "right",
      },
    );
  };

  const drawGradientPanel = (x: number, panelY: number, width: number, height: number) => {
    const radius = 18;
    const scale = 3;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d");

    if (ctx) {
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      const scaledRadius = radius * scale;
      ctx.beginPath();
      ctx.moveTo(scaledRadius, 0);
      ctx.lineTo(scaledWidth - scaledRadius, 0);
      ctx.quadraticCurveTo(scaledWidth, 0, scaledWidth, scaledRadius);
      ctx.lineTo(scaledWidth, scaledHeight - scaledRadius);
      ctx.quadraticCurveTo(scaledWidth, scaledHeight, scaledWidth - scaledRadius, scaledHeight);
      ctx.lineTo(scaledRadius, scaledHeight);
      ctx.quadraticCurveTo(0, scaledHeight, 0, scaledHeight - scaledRadius);
      ctx.lineTo(0, scaledRadius);
      ctx.quadraticCurveTo(0, 0, scaledRadius, 0);
      ctx.closePath();
      ctx.clip();

      const gradient = ctx.createLinearGradient(0, 0, scaledWidth, 0);
      gradient.addColorStop(0, `rgb(${navy.join(",")})`);
      gradient.addColorStop(1, `rgb(${blue.join(",")})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, scaledWidth, scaledHeight);
      doc.addImage(canvas.toDataURL("image/png"), "PNG", x, panelY, width, height);
    } else {
      doc.setFillColor(...navy);
      doc.roundedRect(x, panelY, width, height, radius, radius, "F");
    }
  };

  const headerHeight = 152;
  drawGradientPanel(margin, y, contentWidth, headerHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text("V O L T C A R G O   L O G I S T I C S", margin + 16, y + 34);
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("Shipment Export Report", margin + 16, y + 58);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin + 16, y + 78);

  const logoBoxWidth = 74;
  const logoBoxHeight = 24;
  const logoBoxX = pageWidth - margin - 16 - logoBoxWidth;
  const logoBoxY = y + 30;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(logoBoxX, logoBoxY, logoBoxWidth, logoBoxHeight, 7, 7, "F");
  if (logo) {
    const ratio = logo.width / logo.height;
    const drawHeight = logoBoxHeight - 8;
    const drawWidth = Math.min(logoBoxWidth - 12, drawHeight * ratio);
    doc.addImage(
      logo.dataUrl,
      "PNG",
      logoBoxX + (logoBoxWidth - drawWidth) / 2,
      logoBoxY + (logoBoxHeight - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...blue);
    doc.text("voltcargo", logoBoxX + logoBoxWidth / 2, logoBoxY + 15, { align: "center" });
  }

  const stats = [
    ["TOTAL SHIPMENTS", pdfRows.length.toString()],
    ["TOTAL INVOICE VALUE", `$${totalInvoices.toLocaleString()}`],
    ["EXPORT TYPE", "PDF"],
  ];
  stats.forEach(([label, value], index) => {
    const gap = 7;
    const statWidth = (contentWidth - 32 - gap * 2) / 3;
    const x = margin + 16 + index * (statWidth + gap);
    const statY = y + 92;
    doc.setFillColor(255, 255, 255);
    setPdfOpacity(doc, 0.13);
    doc.roundedRect(x, statY, statWidth, 48, 10, 10, "F");
    setPdfOpacity(doc, 1);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, statY, statWidth, 48, 10, 10, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(label, x + 8, statY + 16);
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(value, x + 8, statY + 34);
  });

  y += headerHeight + 22;
  const tableTop = y;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...border);
  doc.roundedRect(margin, tableTop, contentWidth, pageHeight - tableTop - 54, 14, 14, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text("My Shipments", margin + 12, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slate);
  doc.text("Track and manage every VoltCargo consignment", pageWidth - margin - 12, y + 18, {
    align: "right",
  });
  y += 32;

  const addTableHeader = () => {
    let x = margin;
    doc.setFillColor(...navy);
    doc.rect(margin, y, contentWidth, 24, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    headers.forEach((header, index) => {
      doc.text(header.toUpperCase(), x + 6, y + 15);
      x += widths[index];
    });
    y += 24;
  };

  addTableHeader();

  if (!pdfRows.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...slate);
    doc.text("No shipments", margin + 12, y + 18);
  }

  pdfRows.forEach((row, rowIndex) => {
    const cells = headers.map((header) => String((row as Record<string, unknown>)[header] ?? ""));
    const wrapped = cells.map((cell, index) => doc.splitTextToSize(cell, widths[index] - 10));
    const descriptionItem = String(row.Description ?? "").split("\n")[0] || "Shipment";
    const descriptionLines = doc.splitTextToSize(descriptionItem, widths[1] - 12);
    const rowHeight = Math.max(
      44,
      descriptionLines.length * 8 + 28,
      ...wrapped.map((lines) => lines.length * 8 + 12),
    );

    if (y + rowHeight > pageHeight - 36) {
      addFooter();
      doc.addPage();
      doc.setFillColor(...surface);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      y = margin;
      addTableHeader();
    }

    let x = margin;
    doc.setFillColor(
      rowIndex % 2 === 0 ? 255 : surface[0],
      rowIndex % 2 === 0 ? 255 : surface[1],
      rowIndex % 2 === 0 ? 255 : surface[2],
    );
    doc.rect(margin, y, contentWidth, rowHeight, "F");
    doc.setDrawColor(...border);
    doc.setLineWidth(0.4);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    wrapped.forEach((lines, index) => {
      const header = headers[index];
      const value = String((row as Record<string, unknown>)[header] ?? "");
      doc.setFont("helvetica", index === 0 ? "bold" : "normal");
      doc.setFontSize(7);

      if (header === "Description") {
        const [item, service, source] = value.split("\n");
        const itemLines = doc.splitTextToSize(item || "Shipment", widths[index] - 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.4);
        doc.setTextColor(...navy);
        doc.text(itemLines, x + 6, y + 12, { maxWidth: widths[index] - 12 });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...slate);
        doc.text(service || "General cargo", x + 6, y + 16 + itemLines.length * 8, {
          maxWidth: widths[index] - 12,
        });
        if (source) {
          doc.text(source, x + 6, y + 26 + itemLines.length * 8, {
            maxWidth: widths[index] - 12,
          });
        }
      } else if (header === "Status" || header === "Payment") {
        const isGood = value === "Delivered" || value === "Paid";
        const color = isGood ? green : value === "Pending" ? amber : blue;
        doc.setFillColor(color[0], color[1], color[2]);
        setPdfOpacity(doc, 0.1);
        doc.roundedRect(x + 5, y + 7, widths[index] - 10, 14, 4, 4, "F");
        setPdfOpacity(doc, 1);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.3);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(lines, x + 8, y + 17, { maxWidth: widths[index] - 16 });
      } else {
        doc.setTextColor(
          index === 0 ? blue[0] : navy[0],
          index === 0 ? blue[1] : navy[1],
          index === 0 ? blue[2] : navy[2],
        );
        doc.text(lines, x + 6, y + 12, { maxWidth: widths[index] - 10 });
      }
      x += widths[index];
    });
    y += rowHeight;
  });

  addFooter();
  doc.save("voltcargo-shipments.pdf");
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
  pieces: string,
  weightKg: string,
  cbm: string,
) {
  if (service.unit === "flat") return service.rate;
  const quantity =
    service.unit === "unit"
      ? Number(pieces || 0)
      : service.unit === "kg"
        ? Number(weightKg || 0)
        : Number(cbm || 0);
  return Math.max(0, Math.round(quantity * service.rate * 100) / 100);
}

function NewShipmentModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [path, setPath] = useState<(typeof shipmentPaths)[number]["id"]>("own-supplier");
  const [freightFamily, setFreightFamily] = useState<FreightFamily>("Air Freight");
  const [serviceId, setServiceId] = useState(shippingServices[0].id);
  const [origin, setOrigin] = useState("Guangzhou, CN");
  const [destination, setDestination] = useState("Accra, GH");
  const [description, setDescription] = useState("");
  const [pieces, setPieces] = useState("1");
  const [weightKg, setWeightKg] = useState("");
  const [cbm, setCbm] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const familyServices = shippingServices.filter((service) => service.family === freightFamily);
  const selectedService =
    shippingServices.find((service) => service.id === serviceId) ?? shippingServices[0];
  const selectedPath = shipmentPaths.find((item) => item.id === path) ?? shipmentPaths[0];
  const selectedWarehouseAddress = warehouseAddresses[freightFamily];
  const estimatedPrice = calculateEstimate(selectedService, pieces, weightKg, cbm);
  const selectFreightFamily = (family: FreightFamily) => {
    setFreightFamily(family);
    setServiceId(shippingServices.find((service) => service.family === family)?.id ?? serviceId);
    setWeightKg("");
    setCbm("");
  };
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

  const copyShipmentHandoff = async () => {
    if (!createdCode) return;
    const details = [
      "VoltCargo shipment handoff details",
      "",
      `Client ID: ${client.clientId}`,
      `Consignment code: ${createdCode}`,
      `Selected package: ${selectedService.family} - ${selectedService.name}`,
      `Rate: ${selectedService.estimate}`,
      "",
      `${freightFamily} China warehouse address:`,
      ...selectedWarehouseAddress,
      "",
      path === "own-supplier"
        ? "Give the consignment code and warehouse address to your supplier or sourcer. They must present both when delivering your goods."
        : "VoltCargo will use this code internally while sourcing, receiving, and shipping your goods.",
    ].join("\n");

    await navigator.clipboard.writeText(details);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
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
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["Air Freight", "Ocean Freight"] as FreightFamily[]).map((family) => (
                    <button
                      key={family}
                      type="button"
                      onClick={() => selectFreightFamily(family)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors hover:border-brand",
                        freightFamily === family
                          ? "border-brand bg-brand/5"
                          : "border-navy/10 bg-surface",
                      )}
                    >
                      <p className="font-semibold text-navy">{family}</p>
                      <p className="mt-1 text-xs text-navy/50">
                        {family === "Air Freight"
                          ? "Air Normal, Air Express, Batteries & Electronics, Phones"
                          : "LCL and FCL ocean shipping"}
                      </p>
                    </button>
                  ))}
                </div>
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-semibold text-navy/70">
                    Select {freightFamily} service
                  </span>
                  <select
                    value={serviceId}
                    onChange={(event) => setServiceId(event.target.value)}
                    className="w-full rounded-xl border border-navy/10 bg-white px-3 py-3 text-sm font-semibold text-navy focus:border-brand focus:outline-none"
                  >
                    {familyServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - {service.estimate}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-3 rounded-xl border border-brand/10 bg-brand/5 p-3">
                  <p className="text-sm font-bold text-navy">{selectedService.name}</p>
                  <p className="mt-1 text-xs text-navy/50">{selectedService.timeline}</p>
                  <p className="mt-1 text-xs text-navy/45">{selectedService.note}</p>
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
                  label={selectedService.unit === "unit" ? "Phone units" : "Pieces"}
                  value={pieces}
                  onChange={setPieces}
                  type="number"
                  placeholder="3"
                />
                {selectedService.unit === "kg" ? (
                  <Field
                    label="Weight (kg)"
                    value={weightKg}
                    onChange={setWeightKg}
                    type="number"
                    placeholder="42.5"
                  />
                ) : selectedService.unit === "cbm" ? (
                  <Field
                    label="CBM"
                    value={cbm}
                    onChange={setCbm}
                    type="number"
                    placeholder="0.18"
                  />
                ) : null}
              </div>
              <div className="rounded-xl border border-brand/10 bg-brand/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                  Estimated value
                </p>
                <p className="mt-2 text-3xl font-bold text-navy">
                  ${estimatedPrice.toLocaleString()}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-navy/55">
                  Calculated from {selectedService.estimate}. Phones are charged per unit, other air
                  freight uses KG, Ocean LCL uses CBM, and Ocean FCL uses a flat container estimate.
                  Final invoice may change after Ghana arrival when actual measurements, customs,
                  duties, and local handling are confirmed.
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
                  <MapPin className="h-3.5 w-3.5" /> {freightFamily} China warehouse address
                </div>
                <div className="space-y-1 text-sm font-semibold text-navy">
                  {selectedWarehouseAddress.map((line) => (
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
                  <button
                    type="button"
                    onClick={copyShipmentHandoff}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand/90"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy client ID, code and address"}
                  </button>
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
