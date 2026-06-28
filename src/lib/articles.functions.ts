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
  if (!isCreator) throw new Error("只有創作者可以編輯文章");
  return data.user.id;
}

export interface ArticleFormPayload {
  id?: string;
  rawTitle: string;
  topicTitle: string;
  episodeNum: number | null;
  episodeTitle: string | null;
  coverUrl: string | null;
  content: string;
  isFeatured?: boolean;
}

export const getArticleForEdit = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireCreatorUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("articles")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("找不到文章");
    return row;
  });

export const updateArticleAsCreator = createServerFn({ method: "POST" })
  .inputValidator((data: ArticleFormPayload) => data)
  .handler(async ({ data }) => {
    if (!data.id) throw new Error("缺少文章 ID");
    await requireCreatorUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("articles")
      .update({
        raw_title: data.rawTitle,
        topic_title: data.topicTitle,
        episode_num: data.episodeNum,
        episode_title: data.episodeTitle,
        cover_url: data.coverUrl,
        content: data.content,
        is_featured: Boolean(data.isFeatured),
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createArticleAsCreator = createServerFn({ method: "POST" })
  .inputValidator((data: ArticleFormPayload) => data)
  .handler(async ({ data }) => {
    const authorId = await requireCreatorUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("articles")
      .insert({
        author_id: authorId,
        raw_title: data.rawTitle,
        topic_title: data.topicTitle,
        episode_num: data.episodeNum,
        episode_title: data.episodeTitle,
        cover_url: data.coverUrl,
        content: data.content,
        is_featured: Boolean(data.isFeatured),
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });