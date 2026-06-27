import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Coffee, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDisplay } from "@/lib/titleParser";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { CommentSection } from "@/components/CommentSection";
import { DONATE_PATH } from "@/lib/donate";

interface Article {
  id: string;
  author_id: string;
  raw_title: string;
  episode_num: number | null;
  episode_title: string | null;
  topic_title: string;
  cover_url: string | null;
  content: string;
  created_at: string;
}


export const Route = createFileRoute("/article/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("articles")
      .select("id, raw_title, topic_title, episode_num, episode_title, cover_url, content, created_at, author_id")
      .eq("id", params.id)
      .maybeSingle();
    return { meta: data as Article | null };
  },
  head: ({ params, loaderData }) => {
    const a = loaderData?.meta;
    const url = `https://illusd.com/article/${params.id}`;
    if (!a) {
      return {
        meta: [
          { title: "文章 — illusd" },
          { name: "description", content: "illusd 上的 Vibe Coding 文章。" },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const headline = a.episode_title
      ? (a.episode_num != null ? `Ep.${a.episode_num} ${a.episode_title}` : a.episode_title)
      : a.topic_title;
    const title = `${headline} — ${a.topic_title} | illusd`;
    const plain = (a.content || "").replace(/\s+/g, " ").trim();
    const description = (plain || `《${a.topic_title}》系列文章，由 illusd 創作者發表。`).slice(0, 158);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: headline },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...(a.cover_url ? [{ property: "og:image", content: a.cover_url }, { name: "twitter:image", content: a.cover_url }] : []),
        { name: "twitter:title", content: headline },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline,
            description,
            datePublished: a.created_at,
            image: a.cover_url ?? undefined,
            mainEntityOfPage: url,
            inLanguage: "zh-Hant",
            isPartOf: { "@type": "CreativeWorkSeries", name: a.topic_title },
          }),
        },
      ],
    };
  },
  component: ArticleDetail,
});

function ArticleDetail() {
  const { id } = Route.useParams();
  const { user, isCreator } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: a }, { data: likes }] = await Promise.all([
        supabase.from("articles").select("*").eq("id", id).maybeSingle(),
        supabase.from("likes").select("user_id").eq("article_id", id),
      ]);
      if (cancelled) return;
      setArticle((a as Article) ?? null);
      setLikeCount(likes?.length ?? 0);
      setLiked(!!user && !!likes?.some((l: { user_id: string }) => l.user_id === user.id));
      if (a) {
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name, creator_id")
          .eq("id", (a as Article).author_id)
          .maybeSingle();
        if (!cancelled) setAuthorName(p?.display_name ?? "");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, user?.id]);

  const toggleLike = async () => {
    if (!user) { navigate({ to: "/sign-up" }); return; }
    if (liked) {
      await supabase.from("likes").delete().eq("article_id", id).eq("user_id", user.id);
      setLikeCount((n) => n - 1);
      setLiked(false);
    } else {
      const { error } = await supabase.from("likes").insert({ article_id: id, user_id: user.id });
      if (!error) { setLikeCount((n) => n + 1); setLiked(true); }
    }
  };

  if (loading) return <div className="p-10 text-sm text-muted-foreground">載入中…</div>;
  if (!article) return <div className="p-10">找不到文章。<Link to="/" className="underline ml-2">回首頁</Link></div>;

  const parsed = {
    episodeNum: article.episode_num,
    episodeTitle: article.episode_title,
    topicTitle: article.topic_title,
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      <article className="mx-auto max-w-2xl px-5 pt-12 pb-16">
        <div className="text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
          {parsed.episodeNum != null ? `EP.${parsed.episodeNum}` : "ARTICLE"}
        </div>
        <h1 className="font-serif text-3xl md:text-4xl leading-snug mt-3">
          {parsed.episodeTitle ?? parsed.topicTitle}
        </h1>
        <div className="text-sm text-muted-foreground mt-3">
          自「{parsed.topicTitle}」 · {authorName || "創作者"} · {new Date(article.created_at).toLocaleDateString("zh-TW")}
        </div>

        {article.cover_url && (
          <div className="mt-8 border hairline overflow-hidden">
            <img src={article.cover_url} alt={parsed.episodeTitle ?? parsed.topicTitle} className="w-full" />
          </div>
        )}

        <div className="mt-10">
          {article.content
            ? <MarkdownRenderer content={article.content} />
            : <span className="text-muted-foreground">（無內文）</span>}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3 pt-6 border-t hairline">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-2 text-sm border hairline px-4 py-2 transition ${
              liked ? "bg-foreground text-background" : "hover:bg-accent"
            }`}
          >
            <Heart size={16} strokeWidth={1.5} fill={liked ? "currentColor" : "none"} />
            {likeCount}
          </button>
          <Link
            to={DONATE_PATH}
            className="flex items-center gap-2 text-sm border hairline px-4 py-2 hover:bg-accent transition"
          >
            <Coffee size={16} strokeWidth={1.5} />
            {t("article.donate")}
          </Link>
          {isCreator && (
            <Link
              to="/article/$id/edit"
              params={{ id: article.id }}
              className="flex items-center gap-2 text-sm border hairline px-4 py-2 hover:bg-accent transition"
            >
              <Edit2 size={16} strokeWidth={1.5} />
              編輯
            </Link>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{formatDisplay(parsed)}</span>
        </div>
      </article>

      <section className="mx-auto max-w-2xl px-5 pb-24">
        <CommentSection articleId={id} />
      </section>
    </main>
  );
}

