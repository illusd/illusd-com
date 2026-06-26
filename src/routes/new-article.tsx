import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { parseTitle } from "@/lib/titleParser";
import { X } from "lucide-react";

export const Route = createFileRoute("/new-article")({
  head: () => {
    const title = "撰寫文章 — illusd";
    const description = "創作者專用：在 illusd 上發表新的 Vibe Coding 文章。";
    const url = "https://illusd.com/new-article";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: NewArticle,
});

function NewArticle() {
  const { user, isCreator, loading } = useAuth();
  const navigate = useNavigate();

  const [rawTitle, setRawTitle] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [episodeNum, setEpisodeNum] = useState<string>("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [content, setContent] = useState("");
  const [existingTopics, setExistingTopics] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/sign-up" });
    if (!loading && user && !isCreator) {
      toast.error("僅創作者可以發布文章");
      navigate({ to: "/" });
    }
  }, [user, isCreator, loading, navigate]);

  useEffect(() => {
    supabase.from("articles").select("topic_title").then(({ data }) => {
      const set = new Set<string>();
      (data ?? []).forEach((r: { topic_title: string }) => set.add(r.topic_title));
      setExistingTopics(Array.from(set));
    });
  }, []);

  // Auto-parse raw title if format matches
  useEffect(() => {
    if (!rawTitle) return;
    const p = parseTitle(rawTitle);
    if (p.episodeNum != null) {
      setEpisodeNum(String(p.episodeNum));
      setEpisodeTitle(p.episodeTitle ?? "");
      setTopicTitle(p.topicTitle);
    }
  }, [rawTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!topicTitle.trim()) { toast.error("請填寫話題標題"); return; }

    const finalRaw = rawTitle.trim() ||
      `#${episodeNum || "?"} (${episodeTitle || ""})-${topicTitle}`;

    setSubmitting(true);
    const { data, error } = await supabase.from("articles").insert({
      author_id: user.id,
      raw_title: finalRaw,
      topic_title: topicTitle.trim(),
      episode_num: episodeNum ? parseInt(episodeNum, 10) : null,
      episode_title: episodeTitle.trim() || null,
      cover_url: coverUrl.trim() || null,
      content,
    }).select("id").single();
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("文章已發布");
    navigate({ to: "/article/$id", params: { id: data!.id } });
  };

  if (loading || !user || !isCreator) {
    return <div className="p-10 text-sm text-muted-foreground">載入中…</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="sticky top-0 bg-background/90 backdrop-blur border-b hairline">
        <div className="mx-auto max-w-3xl px-5 h-14 flex items-center justify-between">
          <div className="font-serif text-lg">撰寫文章</div>
          <Link to="/" aria-label="關閉" className="p-2 -mr-2">
            <X size={20} strokeWidth={1.25} />
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-5 py-10 space-y-8">
        <section>
          <label className="block text-xs tracking-widest text-muted-foreground mb-2">
            格式輸入（選用）
          </label>
          <input
            value={rawTitle}
            onChange={(e) => setRawTitle(e.target.value)}
            placeholder="#1 (平台選擇)-VIBE人人都可實現"
            className="w-full bg-transparent border-b hairline py-2 text-base focus:outline-none focus:border-foreground"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            輸入此格式會自動拆解為集數／集名／話題；也可手動填下方欄位。
          </p>
        </section>

        <div className="grid grid-cols-3 gap-4">
          <section className="col-span-1">
            <label className="block text-xs tracking-widest text-muted-foreground mb-2">集數</label>
            <input
              type="number"
              min={1}
              value={episodeNum}
              onChange={(e) => setEpisodeNum(e.target.value)}
              placeholder="1"
              className="w-full bg-transparent border-b hairline py-2 focus:outline-none focus:border-foreground"
            />
          </section>
          <section className="col-span-2">
            <label className="block text-xs tracking-widest text-muted-foreground mb-2">本集標題</label>
            <input
              value={episodeTitle}
              onChange={(e) => setEpisodeTitle(e.target.value)}
              placeholder="平台選擇"
              className="w-full bg-transparent border-b hairline py-2 focus:outline-none focus:border-foreground"
            />
          </section>
        </div>

        <section>
          <label className="block text-xs tracking-widest text-muted-foreground mb-2">話題標題</label>
          <input
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            list="topic-options"
            required
            placeholder="VIBE人人都可實現"
            className="w-full bg-transparent border-b hairline py-2 focus:outline-none focus:border-foreground"
          />
          <datalist id="topic-options">
            {existingTopics.map((t) => <option key={t} value={t} />)}
          </datalist>
          <p className="text-[11px] text-muted-foreground mt-1">
            可直接從現有話題中選擇，或新增新話題。
          </p>
        </section>

        <section>
          <label className="block text-xs tracking-widest text-muted-foreground mb-2">封面圖片</label>
          <CoverUploader value={coverUrl} onChange={setCoverUrl} userId={user!.id} />
        </section>


        <section>
          <label className="block text-xs tracking-widest text-muted-foreground mb-2">內文</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            placeholder="開始寫吧……"
            className="w-full bg-transparent border hairline p-3 text-base leading-relaxed focus:outline-none focus:border-foreground resize-y"
          />
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t hairline">
          <Link to="/" className="px-5 py-2 border hairline text-sm hover:bg-accent transition">
            取消
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-foreground text-background text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? "發布中…" : "發布"}
          </button>
        </div>
      </form>
    </div>
  );
}
