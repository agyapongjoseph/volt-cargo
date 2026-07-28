import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY")!;
  const appUrl = Deno.env.get("APP_URL") ?? new URL(req.url).origin;

  if (!paystackSecret) return json({ error: "PAYSTACK_SECRET_KEY is not configured" }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { invoice_code } = await req.json().catch(() => ({ invoice_code: null }));
  if (!invoice_code || typeof invoice_code !== "string") {
    return json({ error: "invoice_code is required" }, 400);
  }

  const { data: invoice, error: invoiceError } = await userClient
    .from("invoices")
    .select(
      "invoice_code, amount_cents, currency, paid, shipments(code, clients(client_code, full_name, email))",
    )
    .eq("invoice_code", invoice_code.trim().toUpperCase())
    .maybeSingle();

  if (invoiceError) return json({ error: invoiceError.message }, 400);
  if (!invoice) return json({ error: "Invoice not found or not accessible" }, 404);
  if (invoice.paid) return json({ error: "Invoice is already paid" }, 400);

  const shipment = Array.isArray(invoice.shipments) ? invoice.shipments[0] : invoice.shipments;
  const client = Array.isArray(shipment?.clients) ? shipment?.clients[0] : shipment?.clients;
  const email = client?.email;
  if (!email) return json({ error: "Invoice client email is missing" }, 400);

  const reference = `${invoice.invoice_code}-${crypto.randomUUID()}`;
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: invoice.amount_cents,
      currency: invoice.currency,
      reference,
      callback_url: `${appUrl}/dashboard#invoices`,
      metadata: {
        invoice_code: invoice.invoice_code,
        shipment_code: shipment?.code,
        client_code: client?.client_code,
      },
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.status) {
    return json({ error: payload.message ?? "Paystack initialization failed" }, 400);
  }

  const { error: updateError } = await adminClient
    .from("invoices")
    .update({ paystack_ref: reference })
    .eq("invoice_code", invoice.invoice_code);
  if (updateError) return json({ error: updateError.message }, 500);

  return json({ authorization_url: payload.data.authorization_url, reference });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
