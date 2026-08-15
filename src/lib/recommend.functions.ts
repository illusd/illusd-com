import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

async function requireCreatorUserId(): Promise<string> {
  const auth = getRequest().headers.get("authorization");
  if (!auth || !/^Bearer\s+/i.test(auth)) throw new Error("請先登入創作者帳號");
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) throw new Error("請先登入創作者帳號");
  const email = (data.user.email ?? "").toLowerCase();
  const { data: isCreator } = await supabaseAdmin.rpc("is_creator_by_email" as any, { _email: email });
  if (!isCreator) throw new Error("只有創作者可以建立推薦");
  return data.user.id;
}

function normalizeUrl(raw: string): string {
  const value = (raw ?? "").trim();
  if (!value) throw new Error("請輸入平台網址");
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    throw new Error("網址格式無效");
  }
}

export const createRecommendationAsCreator = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; url: string; description: string }) => data)
  .handler(async ({ data }) => {
    const creatorId = await requireCreatorUserId();
    const name = (data.name ?? "").trim();
    const description = (data.description ?? "").trim();
    if (!name) throw new Error("請輸入平台名稱");
    const url = normalizeUrl(data.url);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("recommendations" as any)
      .insert({ creator_id: creatorId, name, url, description } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as unknown as { id: string }).id, url };
  });

export const deleteRecommendationAsCreator = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireCreatorUserId();
    if (!data.id) throw new Error("缺少推薦 ID");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("recommendations" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
