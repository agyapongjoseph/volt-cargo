// Supabase Edge Functions run on Deno, not the app's browser/Node TypeScript runtime.
// @ts-expect-error Remote imports are resolved by the Supabase Edge runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const payload = await req.json().catch(() => null);
  if (!payload) return new Response("Invalid JSON", { status: 400 });

  const responseCode = payload.ResponseCode ?? payload.responseCode;
  const data = payload.Data ?? payload.data ?? {};
  const clientReference = data.ClientReference ?? data.clientReference;
  if (!clientReference) return new Response("Missing client reference", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const isPaid =
    responseCode === "0000" || data.Status === "Success" || payload.Status === "Success";
  const update: Record<string, unknown> = {
    hubtel_callback: payload,
    hubtel_transaction_id: data.TransactionId ?? data.transactionId ?? null,
  };

  if (isPaid) {
    update.paid = true;
    update.paid_at = data.PaymentDate ?? data.date ?? new Date().toISOString();
  }

  const { error } = await supabase
    .from("invoices")
    .update(update)
    .eq("hubtel_client_reference", clientReference);

  if (error) return new Response(error.message, { status: 500 });
  return new Response("ok", { status: 200 });
});
