// Ko-fi webhook receiver.
// Configure in Ko-fi: https://ko-fi.com/manage/webhooks
// URL: https://illusd.com/webhooks
// Verification token: same value as the `kofi_token` Cloud secret.
import { createFileRoute } from "@tanstack/react-router";

interface KofiPayload {
  verification_token: string;
  message_id?: string;
  type?: string; // Donation | Subscription | Shop Order | Commission
  is_subscription_payment?: boolean;
  from_name?: string;
  email?: string;
  amount?: string;
  currency?: string;
  tier_name?: string | null;
  timestamp?: string;
}

export const Route = createFileRoute("/webhooks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.kofi_token;
        if (!expected) {
          console.error("kofi_token secret not configured");
          return new Response("Server not configured", { status: 500 });
        }

        let payload: KofiPayload;
        try {
          const ctype = request.headers.get("content-type") || "";
          let raw: string | null = null;
          if (ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data")) {
            const fd = await request.formData();
            raw = (fd.get("data") as string | null) ?? null;
          } else {
            const text = await request.text();
            try {
              const j = JSON.parse(text);
              raw = typeof j?.data === "string" ? j.data : text;
            } catch {
              raw = text;
            }
          }
          if (!raw) return new Response("Missing data", { status: 400 });
          payload = JSON.parse(raw) as KofiPayload;
        } catch (err) {
          console.error("Bad ko-fi payload", err);
          return new Response("Invalid payload", { status: 400 });
        }

        if (payload.verification_token !== expected) {
          return new Response("Invalid token", { status: 401 });
        }

        if (!payload.email) {
          return new Response("ok", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const amount = Number(payload.amount ?? 0) || 0;

        const { data: existing } = await supabaseAdmin
          .from("kofi_supporters" as any)
          .select("total_amount")
          .eq("email", payload.email.toLowerCase())
          .maybeSingle();

        const prevTotal = Number(((existing as any)?.total_amount) ?? 0);

        const { error } = await supabaseAdmin.from("kofi_supporters" as any).upsert(
          {
            email: payload.email.toLowerCase(),
            kofi_transaction_id: payload.message_id ?? null,
            tier_name: payload.tier_name ?? null,
            is_subscription: Boolean(payload.is_subscription_payment),
            last_donation_at: payload.timestamp ?? new Date().toISOString(),
            total_amount: prevTotal + amount,
            raw: payload as unknown as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" },
        );

        if (error) {
          console.error("kofi upsert failed", error);
          return new Response("DB error", { status: 500 });
        }

        // Upgrade matched short links / files to permanent (NULL expiry)
        await supabaseAdmin.rpc("noop" as any).then(() => {}, () => {});
        // Best-effort: clear expiry for any rows whose owner email matches
        try {
          const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const match = users?.users?.find((u) => (u.email || "").toLowerCase() === payload.email!.toLowerCase());
          if (match) {
            await supabaseAdmin.from("short_links").update({ expires_at: null }).eq("created_by", match.id);
            await supabaseAdmin.from("short_files").update({ expires_at: null }).eq("created_by", match.id);
          }
        } catch (e) {
          console.warn("kofi upgrade lookup failed", e);
        }

        return Response.json({ ok: true });
      },

      GET: async () => Response.json({ ok: true, hint: "POST endpoint for Ko-fi webhooks" }),
    },
  },
});
