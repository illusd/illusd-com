import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

const DIGITS = "0123456789";
const ALPHANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function randomCode(charset: string, len = 5): string {
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += charset[arr[i] % charset.length];
  return out;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/illurl/shorten")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () =>
        json(200, {
          endpoint: "POST /api/public/illurl/shorten",
          auth: "Header: X-API-Key: <your-key>  (or Authorization: Bearer <your-key>)",
          body: { url: "https://example.com/long-path" },
          response: { url: "https://illusd.com/AB12C", code: "AB12C", permanent: true, expires_at: null },
        }),
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("x-api-key") ||
          (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
        if (!apiKey) return json(401, { error: "Missing API key. Send X-API-Key header." });

        let body: { url?: string };
        try {
          body = await request.json();
        } catch {
          return json(400, { error: "Invalid JSON body" });
        }
        const target = (body?.url ?? "").trim();
        if (!target) return json(400, { error: "Missing 'url' in body" });

        let u: URL;
        try {
          u = new URL(target);
        } catch {
          return json(400, { error: "Invalid URL" });
        }
        if (u.protocol !== "http:" && u.protocol !== "https:")
          return json(400, { error: "Only http/https URLs are supported" });
        if (/illusd\.com$/i.test(u.hostname))
          return json(400, { error: "Cannot shorten illusd.com URLs" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: keyRow } = await supabaseAdmin
          .from("illurl_api_keys" as any)
          .select("id, user_id")
          .eq("key", apiKey)
          .maybeSingle();
        if (!keyRow) return json(401, { error: "Invalid API key" });

        // owner permanent-eligibility check (creator or ko-fi supporter → permanent)
        const userId = (keyRow as any).user_id as string;
        let isPermanent = false;
        const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(userId);
        const email = (userInfo?.user?.email ?? "").toLowerCase();
        if (email) {
          const { data: isCreator } = await supabaseAdmin.rpc("is_creator_by_email" as any, { _email: email });
          if (isCreator) isPermanent = true;
          else {
            const { data: kofi } = await supabaseAdmin
              .from("kofi_supporters" as any)
              .select("email")
              .eq("email", email)
              .maybeSingle();
            if (kofi) isPermanent = true;
          }
        }
        const expiresAt = isPermanent ? null : new Date(Date.now() + ONE_YEAR_MS).toISOString();

        let code = "";
        for (let i = 0; i < 32; i++) {
          const c = i < 8 ? randomCode(DIGITS) : randomCode(ALPHANUM);
          const { data: row } = await supabaseAdmin
            .from("short_links")
            .select("code")
            .eq("code", c)
            .maybeSingle();
          if (!row) {
            code = c;
            break;
          }
        }
        if (!code) return json(500, { error: "Could not generate code" });

        const { error } = await supabaseAdmin
          .from("short_links")
          .insert({ code, target_url: u.toString(), created_by: userId, expires_at: expiresAt } as any);
        if (error) return json(500, { error: error.message });

        await supabaseAdmin
          .from("illurl_api_keys" as any)
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", (keyRow as any).id);

        return json(200, {
          url: `https://illusd.com/${code}`,
          code,
          permanent: isPermanent,
          expires_at: expiresAt,
        });
      },
    },
  },
});
