// Ko-fi webhook receiver.
// Configure in Ko-fi: https://ko-fi.com/manage/webhooks
// URL: https://illusd.com/webhooks
// Verification token: same value as the `kofi_token` Cloud secret.
import { createFileRoute } from "@tanstack/react-router";

interface KofiPayload {
  verification_token?: string;
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

const ALLOWED_EVENT_TYPES = new Set([
  "Donation",
  "Subscription",
  "Shop Order",
  "Commission",
]);

async function logEvent(args: {
  status: string;
  httpStatus: number;
  eventType?: string | null;
  email?: string | null;
  messageId?: string | null;
  reason?: string | null;
  linksUpgraded?: number;
  filesUpgraded?: number;
  raw?: unknown;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("webhook_events" as any).insert({
      source: "ko-fi",
      status: args.status,
      http_status: args.httpStatus,
      event_type: args.eventType ?? null,
      email: args.email ?? null,
      message_id: args.messageId ?? null,
      reason: args.reason ?? null,
      links_upgraded: args.linksUpgraded ?? 0,
      files_upgraded: args.filesUpgraded ?? 0,
      raw: args.raw ?? null,
    } as any);
  } catch (e) {
    console.warn("webhook_events log failed", e);
  }
}

export const Route = createFileRoute("/webhooks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.kofi_token;
        if (!expected) {
          await logEvent({ status: "error", httpStatus: 500, reason: "kofi_token secret not configured" });
          return new Response("Server not configured", { status: 500 });
        }

        // --- Parse payload ---
        let payload: KofiPayload;
        let rawData: string | null = null;
        try {
          const ctype = request.headers.get("content-type") || "";
          if (ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data")) {
            const fd = await request.formData();
            rawData = (fd.get("data") as string | null) ?? null;
          } else {
            const text = await request.text();
            try {
              const j = JSON.parse(text);
              rawData = typeof j?.data === "string" ? j.data : text;
            } catch {
              rawData = text;
            }
          }
          if (!rawData) {
            await logEvent({ status: "invalid_payload", httpStatus: 400, reason: "Missing `data` field" });
            return new Response("Missing data", { status: 400 });
          }
          payload = JSON.parse(rawData) as KofiPayload;
        } catch (err) {
          await logEvent({ status: "invalid_payload", httpStatus: 400, reason: `Parse error: ${(err as Error).message}` });
          return new Response("Invalid payload", { status: 400 });
        }

        // --- Verify token (timing-safe-ish: constant-length compare) ---
        const got = payload.verification_token ?? "";
        if (got.length !== expected.length || got !== expected) {
          await logEvent({
            status: "invalid_token",
            httpStatus: 401,
            eventType: payload.type ?? null,
            email: payload.email?.toLowerCase() ?? null,
            messageId: payload.message_id ?? null,
            reason: "verification_token mismatch",
          });
          return new Response("Invalid token", { status: 401 });
        }

        // --- Validate event shape ---
        if (payload.type && !ALLOWED_EVENT_TYPES.has(payload.type)) {
          await logEvent({
            status: "invalid_payload",
            httpStatus: 422,
            eventType: payload.type,
            messageId: payload.message_id ?? null,
            reason: `Unsupported event type: ${payload.type}`,
            raw: payload,
          });
          return new Response("Unsupported event type", { status: 422 });
        }

        if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
          await logEvent({
            status: "invalid_payload",
            httpStatus: 422,
            eventType: payload.type ?? null,
            messageId: payload.message_id ?? null,
            reason: "Missing or invalid email",
            raw: payload,
          });
          return new Response("Missing or invalid email", { status: 422 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = payload.email.toLowerCase();
        const amount = Number(payload.amount ?? 0) || 0;

        const { data: existing } = await supabaseAdmin
          .from("kofi_supporters" as any)
          .select("total_amount")
          .eq("email", email)
          .maybeSingle();

        const prevTotal = Number(((existing as any)?.total_amount) ?? 0);

        const { error: upsertErr } = await supabaseAdmin.from("kofi_supporters" as any).upsert(
          {
            email,
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

        if (upsertErr) {
          await logEvent({
            status: "error",
            httpStatus: 500,
            eventType: payload.type ?? null,
            email,
            messageId: payload.message_id ?? null,
            reason: `kofi_supporters upsert failed: ${upsertErr.message}`,
            raw: payload,
          });
          return new Response("DB error", { status: 500 });
        }

        // --- Upgrade matched short links / files to permanent ---
        let linksUpgraded = 0;
        let filesUpgraded = 0;
        try {
          const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const match = users?.users?.find((u) => (u.email || "").toLowerCase() === email);
          if (match) {
            const { count: lc } = await supabaseAdmin
              .from("short_links")
              .update({ expires_at: null, expiry_reminder_sent_at: null } as any, { count: "exact" })
              .eq("created_by", match.id)
              .not("expires_at", "is", null);
            const { count: fc } = await supabaseAdmin
              .from("short_files")
              .update({ expires_at: null, expiry_reminder_sent_at: null } as any, { count: "exact" })
              .eq("created_by", match.id)
              .not("expires_at", "is", null);
            linksUpgraded = lc ?? 0;
            filesUpgraded = fc ?? 0;
          }
        } catch (e) {
          console.warn("kofi upgrade lookup failed", e);
        }

        await logEvent({
          status: "ok",
          httpStatus: 200,
          eventType: payload.type ?? null,
          email,
          messageId: payload.message_id ?? null,
          reason: `+${amount} ${payload.currency ?? ""}`.trim(),
          linksUpgraded,
          filesUpgraded,
          raw: payload,
        });

        return Response.json({ ok: true, linksUpgraded, filesUpgraded });
      },

      GET: async () => Response.json({ ok: true, hint: "POST endpoint for Ko-fi webhooks" }),
    },
  },
});
