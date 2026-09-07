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
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json({ error: "Sign in before deleting your account." }, 401);

  const { data: roles, error: rolesError } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id);
  if (rolesError) return json({ error: rolesError.message }, 400);
  if (!(roles ?? []).some((row: { role: string }) => row.role === "client")) {
    return json({ error: "Only client accounts can be deleted from the client portal." }, 403);
  }

  const { data: client, error: clientError } = await adminClient
    .from("clients")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (clientError) return json({ error: clientError.message }, 500);

  if (client?.id) {
    const { data: shipments, error: shipmentError } = await adminClient
      .from("shipments")
      .select("id")
      .eq("client_id", client.id);
    if (shipmentError) return json({ error: shipmentError.message }, 500);

    const shipmentIds = (shipments ?? []).map((shipment: { id: string }) => shipment.id);
    if (shipmentIds.length) {
      const { data: documents } = await adminClient
        .from("shipment_documents")
        .select("storage_path")
        .in("shipment_id", shipmentIds);
      const paths = (documents ?? [])
        .map((document: { storage_path: string | null }) => document.storage_path)
        .filter(Boolean) as string[];
      if (paths.length) {
        await adminClient.storage.from("shipment-photos").remove(paths);
        await adminClient.storage.from("shipment-docs").remove(paths);
      }

      const { error: shipmentDeleteError } = await adminClient
        .from("shipments")
        .delete()
        .eq("client_id", client.id);
      if (shipmentDeleteError) return json({ error: shipmentDeleteError.message }, 500);
    }
  }

  const { error: messageDeleteError } = await adminClient
    .from("messages")
    .delete()
    .eq("author_id", auth.user.id);
  if (messageDeleteError) return json({ error: messageDeleteError.message }, 500);

  const { error: clientDeleteError } = await adminClient
    .from("clients")
    .delete()
    .eq("user_id", auth.user.id);
  if (clientDeleteError) return json({ error: clientDeleteError.message }, 500);

  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(auth.user.id);
  if (deleteUserError) return json({ error: deleteUserError.message }, 500);

  return json({ ok: true });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
