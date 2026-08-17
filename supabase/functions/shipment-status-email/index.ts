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

const statusLabel: Record<string, string> = {
  created: "Shipment created",
  received_cn: "Received in China warehouse",
  qc: "Quality check completed",
  consolidated: "Consolidated for freight",
  in_transit: "In transit to Ghana",
  port_gh: "Arrived at Ghana port",
  cleared: "Customs cleared",
  ghana_warehouse: "Received at Ghana warehouse",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") ?? "VoltCargo <onboarding@resend.dev>";
  const appUrl = Deno.env.get("APP_URL") ?? new URL(req.url).origin;

  if (!resendKey) return json({ skipped: true, reason: "RESEND_API_KEY is not configured" });

  const { shipment_code, status, note } = await req.json().catch(() => ({}));
  if (!shipment_code || typeof shipment_code !== "string") {
    return json({ error: "shipment_code is required" }, 400);
  }
  if (!status || typeof status !== "string") return json({ error: "status is required" }, 400);

  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: shipment, error: shipmentError } = await adminClient
    .from("shipments")
    .select("code, origin, destination, clients(full_name, email)")
    .eq("code", shipment_code.trim().toUpperCase())
    .maybeSingle();

  if (shipmentError) return json({ error: shipmentError.message }, 500);
  if (!shipment) return json({ error: "Shipment not found" }, 404);

  const client = Array.isArray(shipment.clients) ? shipment.clients[0] : shipment.clients;
  const email = client?.email;
  if (!email) return json({ skipped: true, reason: "Shipment client has no email" });

  const stage = statusLabel[status] ?? status;
  const trackingUrl = `${appUrl}/track?q=${encodeURIComponent(shipment.code)}`;
  const safeName = escapeHtml(client?.full_name ?? "Client");
  const safeCode = escapeHtml(shipment.code);
  const safeStage = escapeHtml(stage);
  const safeNote = escapeHtml(typeof note === "string" && note ? note : stage);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: `VoltCargo update: ${safeCode} is ${safeStage}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">Shipment update from VoltCargo</h2>
          <p>Hello ${safeName},</p>
          <p>Your shipment <strong>${safeCode}</strong> has a new update.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Current stage:</strong> ${safeStage}</p>
            <p style="margin: 0;"><strong>Note:</strong> ${safeNote}</p>
          </div>
          <p>You can track the shipment here:</p>
          <p><a href="${trackingUrl}" style="background: #2563eb; color: white; padding: 10px 16px; border-radius: 999px; text-decoration: none; display: inline-block;">Track shipment</a></p>
          <p style="font-size: 12px; color: #64748b;">VoltCargo will continue to notify you as your shipment moves through the process.</p>
        </div>
      `,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: payload.message ?? "Email provider failed" }, 400);

  return json({ sent: true, id: payload.id });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
