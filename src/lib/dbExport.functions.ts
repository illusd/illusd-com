import { createServerFn } from "@tanstack/react-start";

/** Every public table we allow exporting, in a migration-friendly order. */
export const EXPORT_TABLES = [
  "profiles",
  "user_roles",
  "creator_allowlist",
  "articles",
  "comments",
  "comment_likes",
  "likes",
  "announcements",
  "poosts",
  "recommendations",
  "chat_messages",
  "feedback",
  "short_links",
  "short_files",
  "illurl_api_keys",
  "kofi_supporters",
  "webhook_events",
  "rednote_films",
  "rednote_open_codes",
  "push_subscriptions",
  "oauth_clients",
  "oauth_access_tokens",
  "oauth_authorization_codes",
  "email_send_log",
  "email_send_state",
  "email_unsubscribe_tokens",
  "suppressed_emails",
  "ai_cache",
] as const;

export type ExportTable = (typeof EXPORT_TABLES)[number];

const PAGE_SIZE = 1000;

export const getExportTableCounts = createServerFn({ method: "POST" }).handler(async () => {
  const { requireCreatorUserId } = await import("./creatorAuth.server");
  await requireCreatorUserId();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const out: { table: string; count: number; error: string | null }[] = [];
  for (const table of EXPORT_TABLES) {
    const { count, error } = await supabaseAdmin
      .from(table as any)
      .select("*", { count: "exact", head: true });
    out.push({ table, count: count ?? 0, error: error?.message ?? null });
  }
  return { tables: out };
});

export const exportTableChunk = createServerFn({ method: "POST" })
  .inputValidator((data: { table: string; offset?: number }) => data)
  .handler(async ({ data }) => {
    const { requireCreatorUserId } = await import("./creatorAuth.server");
    await requireCreatorUserId();

    if (!(EXPORT_TABLES as readonly string[]).includes(data.table)) {
      throw new Error("不支援匯出這個資料表");
    }
    const offset = Math.max(0, data.offset ?? 0);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from(data.table as any)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as unknown as Record<string, unknown>[];
    return {
      table: data.table,
      // Serialized as JSON text: row shapes are dynamic and not statically serializable.
      rowsJson: JSON.stringify(list),
      count: list.length,
      nextOffset: list.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
    };
  });
