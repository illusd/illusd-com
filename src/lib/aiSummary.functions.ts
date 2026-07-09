import { createServerFn } from "@tanstack/react-start";

const CACHE_KEY = "home_featured_summary";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function generateSummary(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: articles } = await supabaseAdmin
    .from("articles")
    .select("raw_title, topic_title, episode_num, episode_title, created_at")
    .eq("is_featured" as any, true)
    .order("created_at", { ascending: false })
    .limit(6);
  const list = (articles ?? [])
    .map((a: any, i: number) => `${i + 1}. ${a.topic_title ?? a.raw_title ?? ""} - ${a.episode_title ?? ""}`)
    .join("\n");
  if (!list) return "目前尚無精選文章。";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://free.v36.cm/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "你是 illusd.com 的編輯助理，用繁體中文為讀者撰寫簡短親切的精選文章摘要（不超過 120 字），不要條列、以一段流暢文字呈現。" },
        { role: "user", content: `以下是本站目前的精選文章清單，請寫一段導讀：\n${list}` },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`AI API ${res.status}`);
  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("AI 未回傳摘要");
  return content;
}

export const getFeaturedAiSummary = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("ai_cache" as any)
    .select("content, updated_at")
    .eq("cache_key", CACHE_KEY)
    .maybeSingle();
  const cached = row as { content: string; updated_at: string } | null;
  const fresh = cached && Date.now() - new Date(cached.updated_at).getTime() < ONE_DAY_MS;
  if (fresh) return { content: cached!.content, updatedAt: cached!.updated_at };
  try {
    const content = await generateSummary();
    const updated_at = new Date().toISOString();
    await supabaseAdmin.from("ai_cache" as any).upsert({ cache_key: CACHE_KEY, content, updated_at } as any);
    return { content, updatedAt: updated_at };
  } catch (e) {
    if (cached) return { content: cached.content, updatedAt: cached.updated_at };
    return { content: "", updatedAt: null as string | null };
  }
});
