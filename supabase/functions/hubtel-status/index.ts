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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const hubtelApiId = Deno.env.get("HUBTEL_API_ID");
  const hubtelApiKey = Deno.env.get("HUBTEL_API_KEY");
  const merchantAccountNumber = Deno.env.get("HUBTEL_COLLECTION_ACCOUNT_NUMBER") ?? "2040393";

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
    .select("invoice_code, paid, hubtel_client_reference")
    .eq("invoice_code", invoice_code.trim().toUpperCase())
    .maybeSingle<{ invoice_code: string; paid: boolean; hubtel_client_reference: string | null }>();

  if (invoiceError) return json({ error: invoiceError.message }, 400);
  if (!invoice) return json({ error: "Invoice not found or not accessible" }, 404);
  if (!invoice.hubtel_client_reference)
    return json({ error: "Invoice has no Hubtel payment reference" }, 400);

  const url = new URL(
    `https://api-txnstatus.hubtel.com/transactions/${merchantAccountNumber}/status`,
  );
  url.searchParams.set("clientReference", invoice.hubtel_client_reference);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${btoa(`${hubtelApiId}:${hubtelApiKey}`)}`,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) return json({ error: "Hubtel status check failed" }, 400);

  const isPaid = payload?.data?.status === "Paid";
  if (isPaid && !invoice.paid) {
    const { error: updateError } = await adminClient
      .from("invoices")
      .update({
        paid: true,
        paid_at: payload.data.date ?? new Date().toISOString(),
        hubtel_transaction_id: payload.data.transactionId ?? null,
        hubtel_callback: payload,
      })
      .eq("invoice_code", invoice.invoice_code);
    if (updateError) return json({ error: updateError.message }, 500);
  }

  return json({ paid: isPaid, status: payload?.data?.status, payload });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
