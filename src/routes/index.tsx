import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard, type ArticleCardData } from "@/components/ArticleCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "illusd — 從10歲開始做起" },
      { name: "description", content: "從0開始 Vibe Coding——10歲也能寫出屬於自己的作品。" },
    ],
  }),
  component: Index,
});

function Index() {
  const [articles, setArticles] = useState<ArticleCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("articles")
      .select("id, raw_title, topic_title, episode_num, episode_title, cover_url, created_at")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setArticles((data ?? []) as ArticleCardData[]);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-20 pb-24 md:pt-28 md:pb-32">
        <p className="text-xs tracking-[0.4em] text-muted-foreground mb-6">ILLUSD · ESTD 2025</p>
        <h1 className="font-serif text-3xl md:text-5xl leading-[1.35] tracking-wide">
          從10歲開始做起，<br className="hidden md:block" />
          我可以你也可以。
        </h1>
        <p className="mt-6 text-sm text-muted-foreground">
          ——從0開始 Vibe Coding！
        </p>
        <div className="mt-10 h-px w-16 bg-foreground/40" />
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="flex items-baseline justify-between border-b hairline pb-3 mb-8">
          <h2 className="font-serif text-xl">精選文章</h2>
          <a href="/topic/all" className="text-xs tracking-widest text-muted-foreground hover:text-foreground">
            ALL →
          </a>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">載入中…</p>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            還沒有文章。創作者登入後可從右下角的＋按鈕新增第一篇。
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
            {articles.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t hairline py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} illusd
      </footer>
    </main>
  );
}
