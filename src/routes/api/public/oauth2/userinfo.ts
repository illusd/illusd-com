import { createFileRoute } from "@tanstack/react-router";
import { sha256Hex } from "@/lib/oauth2.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
};

export const Route = createFileRoute("/api/public/oauth2/userinfo")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const header = request.headers.get("authorization") ?? "";
        if (!header.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ error: "invalid_token" }), {
            status: 401,
            headers: { "Content-Type": "application/json", "WWW-Authenticate": "Bearer", ...CORS },
          });
        }
        const token = header.slice(7).trim();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("oauth_access_tokens" as any)
          .select("user_id, scope, revoked, expires_at")
          .eq("access_token_hash", await sha256Hex(token))
          .maybeSingle();
        const rec = row as unknown as
          | { user_id: string; scope: string; revoked: boolean; expires_at: string }
          | null;
        if (!rec || rec.revoked || new Date(rec.expires_at).getTime() < Date.now()) {
          return new Response(JSON.stringify({ error: "invalid_token" }), {
            status: 401,
            headers: { "Content-Type": "application/json", "WWW-Authenticate": "Bearer", ...CORS },
          });
        }

        const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(rec.user_id);
        const { data: profileRow } = await supabaseAdmin
          .from("profiles" as any)
          .select("display_name, avatar_url")
          .eq("id", rec.user_id)
          .maybeSingle();
        const profile = profileRow as unknown as { display_name: string | null; avatar_url: string | null } | null;

        const scopes = rec.scope.split(/\s+/);
        const body: Record<string, unknown> = { sub: rec.user_id };
        if (scopes.includes("email")) {
          body["email"] = userRes?.user?.email ?? null;
          body["email_verified"] = Boolean(userRes?.user?.email_confirmed_at);
        }
        if (scopes.includes("profile")) {
          body["name"] = profile?.display_name ?? userRes?.user?.user_metadata?.["full_name"] ?? null;
          body["picture"] = profile?.avatar_url ?? userRes?.user?.user_metadata?.["avatar_url"] ?? null;
        }

        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
        });
      },
    },
  },
});
