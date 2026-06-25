import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard, type ArticleCardData } from "@/components/ArticleCard";

export const Route = createFileRoute("/topic/all")({
  head: () => {
    const title = "所有文章 — illusd";
    const description = "瀏覽 illusd 上所有 Vibe Coding 話題與集數，依主題或集數篩選你想看的文章。";
    const url = "https://illusd.com/topic/all";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: AllArticles,
});

function AllArticles() {
  const [articles, setArticles] = useState<ArticleCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<string>("all");
  const [ep, setEp] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("articles")
      .select("id, raw_title, topic_title, episode_num, episode_title, cover_url, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setArticles((data ?? []) as ArticleCardData[]);
        setLoading(false);
      });
  }, []);

  const topics = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => set.add(a.topic_title));
    return Array.from(set);
  }, [articles]);

  const episodes = useMemo(() => {
    const list = topic === "all" ? articles : articles.filter((a) => a.topic_title === topic);
    const set = new Set<number>();
    list.forEach((a) => a.episode_num != null && set.add(a.episode_num));
    return Array.from(set).sort((a, b) => a - b);
  }, [articles, topic]);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (topic !== "all" && a.topic_title !== topic) return false;
      if (ep !== "all" && String(a.episode_num) !== ep) return false;
      return true;
    });
  }, [articles, topic, ep]);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] mx-auto max-w-5xl px-5 pt-16 pb-24">
      <h1 className="font-serif text-3xl">所有文章</h1>
      <p className="text-sm text-muted-foreground mt-2">依話題與集數瀏覽</p>

      <div className="mt-8 flex flex-wrap gap-6 border-y hairline py-4 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-xs tracking-widest text-muted-foreground">話題</span>
          <select
            value={topic}
            onChange={(e) => { setTopic(e.target.value); setEp("all"); }}
            className="bg-transparent border-b hairline py-1 pr-6 focus:outline-none"
          >
            <option value="all">全部</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs tracking-widest text-muted-foreground">集數</span>
          <select
            value={ep}
            onChange={(e) => setEp(e.target.value)}
            className="bg-transparent border-b hairline py-1 pr-6 focus:outline-none"
          >
            <option value="all">全部</option>
            {episodes.map((n) => <option key={n} value={String(n)}>Ep.{n}</option>)}
          </select>
        </label>
        <div className="ml-auto text-xs text-muted-foreground self-center">
          共 {filtered.length} 篇
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground mt-10">載入中…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-10">尚無符合條件的文章。</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
          {filtered.map((a) => <ArticleCard key={a.id} a={a} />)}
        </div>
      )}
    </main>
  );
}
