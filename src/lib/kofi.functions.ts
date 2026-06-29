import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

async function requireCreator(): Promise<void> {
  const auth = getRequest().headers.get("authorization");
  if (!auth || !/^Bearer\s+/i.test(auth)) throw new Error("請先登入創作者帳號");
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) throw new Error("請先登入創作者帳號");
  const email = (data.user.email ?? "").toLowerCase();
  const { data: isCreator } = await supabaseAdmin.rpc("is_creator_by_email" as any, { _email: email });
  if (!isCreator) throw new Error("只有創作者可以查詢");
}

export interface KofiOrder {
  message_id: string | null;
  type: string | null;
  amount: string | null;
  currency: string | null;
  tier_name: string | null;
  is_subscription: boolean;
  timestamp: string | null;
  from_name: string | null;
}

export const lookupKofiByEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    await requireCreator();
    const email = (data.email || "").trim().toLowerCase();
    if (!email) throw new Error("請輸入 Email");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: supporter } = await supabaseAdmin
      .from("kofi_supporters" as any)
      .select("email, kofi_transaction_id, tier_name, is_subscription, last_donation_at, total_amount, created_at, updated_at")
      .eq("email", email)
      .maybeSingle();

    const { data: events } = await supabaseAdmin
      .from("webhook_events" as any)
      .select("id, created_at, status, http_status, event_type, message_id, reason, raw")
      .eq("source", "ko-fi")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(50);

    const orders: KofiOrder[] = ((events ?? []) as any[])
      .filter((e) => e.status === "ok" && e.raw)
      .map((e) => {
        const r = e.raw as any;
        return {
          message_id: r.message_id ?? null,
          type: r.type ?? null,
          amount: r.amount ?? null,
          currency: r.currency ?? null,
          tier_name: r.tier_name ?? null,
          is_subscription: Boolean(r.is_subscription_payment),
          timestamp: r.timestamp ?? null,
          from_name: r.from_name ?? null,
        };
      });

    return {
      member: supporter ?? null,
      orders,
      events: (events ?? []) as any[],
    };
  });
