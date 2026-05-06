import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller is auksys_admin
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: profile } = await admin.from("user_profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "auksys_admin") {
      return new Response(JSON.stringify({ error: "forbidden — apenas admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, password, full_name, client_id } = await req.json();
    if (!email || !password || !client_id) {
      return new Response(JSON.stringify({ error: "campos obrigatórios faltando" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, client_id, role: "client_analyst" },
    });
    if (createErr) throw createErr;

    // Ensure profile is set correctly (overrides default trigger)
    await admin.from("user_profiles").upsert({
      id: created.user!.id,
      role: "client_analyst",
      client_id,
      full_name: full_name || email,
    });

    // Also create entry in analysts table
    await admin.from("analysts").insert({
      name: full_name || email,
      client_id,
      user_id: created.user!.id,
    });

    return new Response(JSON.stringify({ ok: true, user_id: created.user!.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
