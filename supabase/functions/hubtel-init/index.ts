// Supabase Edge Functions run on Deno, not the app's browser/Node TypeScript runtime.
// @ts-expect-error Remote imports are resolved by the Supabase Edge runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InvoiceRecord = {
  invoice_code: string;
  amount_cents: number;
  currency: string;
  paid: boolean;
  shipments?:
    | {
        code?: string;
        clients?: {
          client_code?: string;
          full_name?: string;
          email?: string;
          phone?: string;
        } | null;
      }
    | Array<{
        code?: string;
        clients?: {
          client_code?: string;
          full_name?: string;
          email?: string;
          phone?: string;
        } | null;
      }>;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const hubtelApiId = Deno.env.get("HUBTEL_API_ID");
  const hubtelApiKey = Deno.env.get("HUBTEL_API_KEY");
  const merchantAccountNumber = Deno.env.get("HUBTEL_COLLECTION_ACCOUNT_NUMBER") ?? "2040393";
  const appUrl = trimTrailingSlash(Deno.env.get("APP_URL") ?? "https://www.voltcargoafrica.com");
  const functionBaseUrl = `${supabaseUrl}/functions/v1`;

  if (!hubtelApiId || !hubtelApiKey)
    return json({ error: "Hubtel API credentials are not configured" }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { invoice_code } = await req.json().catch(() => ({ invoice_code: null }));
  if (!invoice_code || typeof invoice_code !== "string")
    return json({ error: "invoice_code is required" }, 400);

  const { data: invoice, error: invoiceError } = await userClient
    .from("invoices")
    .select(
      "invoice_code, amount_cents, currency, paid, shipments(code, clients(client_code, full_name, email, phone))",
    )
    .eq("invoice_code", invoice_code.trim().toUpperCase())
    .maybeSingle<InvoiceRecord>();

  if (invoiceError) return json({ error: invoiceError.message }, 400);
  if (!invoice) return json({ error: "Invoice not found or not accessible" }, 404);
  if (invoice.paid) return json({ error: "Invoice is already paid" }, 400);
  if (invoice.currency !== "USD")
    return json({ error: "Only USD invoices can be converted to Hubtel GHS checkout" }, 400);

  const shipment = Array.isArray(invoice.shipments) ? invoice.shipments[0] : invoice.shipments;
  const client = Array.isArray(shipment?.clients) ? shipment?.clients[0] : shipment?.clients;
  const exchangeRate = await getUsdToGhsRate();
  const usdAmount = invoice.amount_cents / 100;
  const ghsAmount = roundMoney(usdAmount * exchangeRate);
  const clientReference = buildClientReference(invoice.invoice_code);
  const description = sanitizeHubtelDescription(
    `VoltCargo invoice ${invoice.invoice_code} for shipment ${shipment?.code ?? "cargo"}`,
  );
  const authorization = btoa(`${hubtelApiId}:${hubtelApiKey}`);

  const response = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      totalAmount: ghsAmount,
      description,
      callbackUrl: `${functionBaseUrl}/hubtel-callback`,
      returnUrl: `${appUrl}/dashboard#invoices`,
      merchantAccountNumber,
      cancellationUrl: `${appUrl}/dashboard#invoices`,
      clientReference,
      payeeName: client?.full_name,
      payeeEmail: client?.email,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.responseCode !== "0000" || !payload?.data?.checkoutUrl) {
    return json(
      { error: payload?.message ?? payload?.status ?? "Hubtel checkout initialization failed" },
      400,
    );
  }

  const { error: updateError } = await adminClient
    .from("invoices")
    .update({
      hubtel_client_reference: clientReference,
      hubtel_checkout_id: payload.data.checkoutId,
      hubtel_amount_ghs_cents: Math.round(ghsAmount * 100),
      hubtel_exchange_rate: exchangeRate,
    })
    .eq("invoice_code", invoice.invoice_code);

  if (updateError) return json({ error: updateError.message }, 500);

  return json({
    checkout_url: payload.data.checkoutUrl,
    checkout_direct_url: payload.data.checkoutDirectUrl,
    checkout_id: payload.data.checkoutId,
    client_reference: clientReference,
    amount_ghs: ghsAmount,
    exchange_rate: exchangeRate,
  });
});

async function getUsdToGhsRate() {
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  const payload = await response.json().catch(() => null);
  const rate = Number(payload?.rates?.GHS);
  if (!response.ok || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Could not fetch USD to GHS exchange rate");
  }
  return rate;
}

function buildClientReference(invoiceCode: string) {
  const cleanInvoiceCode = invoiceCode.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 22);
  return `${cleanInvoiceCode}-${Date.now().toString(36).slice(-8)}`.slice(0, 32);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function sanitizeHubtelDescription(value: string) {
  return value
    .replace(/[^a-zA-Z0-9 ._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
