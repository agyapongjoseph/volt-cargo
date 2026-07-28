import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY")!;
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const body = await req.text();
  const expected = await hmacSha512(body, paystackSecret);

  if (signature !== expected) return new Response("Invalid signature", { status: 401 });

  const event = JSON.parse(body);
  if (event.event !== "charge.success") return new Response("ok", { status: 200 });

  const reference = event.data?.reference;
  if (!reference) return new Response("Missing reference", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabase
    .from("invoices")
    .update({ paid: true, paid_at: new Date().toISOString(), paystack_ref: reference })
    .eq("paystack_ref", reference);

  if (error) return new Response(error.message, { status: 500 });
  return new Response("ok", { status: 200 });
});

async function hmacSha512(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
