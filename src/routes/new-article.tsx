import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { parseTitle } from "@/lib/titleParser";
import { X } from "lucide-react";
import { CoverUploader } from "@/components/CoverUploader";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { useDraftPersist, clearDraft } from "@/hooks/useDraftPersist";

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
  const { t } = useTranslation();

  const [rawTitle, setRawTitle] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [episodeNum, setEpisodeNum] = useState<string>("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [content, setContent] = useState("");
  const [existingTopics, setExistingTopics] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Persist drafts across tab visibility / navigation
  useDraftPersist("new-article:rawTitle", rawTitle, setRawTitle);
  useDraftPersist("new-article:topicTitle", topicTitle, setTopicTitle);
  useDraftPersist("new-article:episodeNum", episodeNum, setEpisodeNum);
  useDraftPersist("new-article:episodeTitle", episodeTitle, setEpisodeTitle);
  useDraftPersist("new-article:coverUrl", coverUrl, setCoverUrl);
  useDraftPersist("new-article:content", content, setContent);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/sign-up" });
    if (!loading && user && !isCreator) {
      toast.error(t("editor.creator_only_publish"));
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

  useEffect(() => {
    if (!rawTitle) return;
    const p = parseTitle(rawTitle);
    if (p.episodeNum != null) {
      setEpisodeNum(String(p.episodeNum));
      setEpisodeTitle(p.episodeTitle ?? "");
      setTopicTitle(p.topicTitle);
    }
  }, [rawTitle]);

  const clearAllDrafts = () => {
    ["rawTitle", "topicTitle", "episodeNum", "episodeTitle", "coverUrl", "content"].forEach((k) =>
      clearDraft(`new-article:${k}`),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!topicTitle.trim()) { toast.error(t("editor.topic_required")); return; }

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

    if (error) { toast.error(error.message); return; }
    clearAllDrafts();
    toast.success(t("editor.published"));
    navigate({ to: "/article/$id", params: { id: data!.id } });
  };

  if (loading || !user || !isCreator) {
    return <div className="p-10 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="sticky top-0 bg-background/90 backdrop-blur border-b hairline">
        <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
          <div className="font-serif text-lg">{t("editor.title")}</div>
          <Link to="/" aria-label={t("common.close")} className="p-2 -mr-2">
            <X size={20} strokeWidth={1.25} />
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl px-5 py-10 space-y-8">
        <section>
          <label className="block text-xs tracking-widest text-muted-foreground mb-2">
            {t("editor.format_input")}
          </label>
          <input
            value={rawTitle}
            onChange={(e) => setRawTitle(e.target.value)}
            placeholder="#1 (平台選擇)-VIBE人人都可實現"
            className="w-full bg-transparent border-b hairline py-2 text-base focus:outline-none focus:border-foreground"
          />
          <p className="text-[11px] text-muted-foreground mt-1">{t("editor.format_hint")}</p>
        </section>

        <div className="grid grid-cols-3 gap-4">
          <section className="col-span-1">
            <label className="block text-xs tracking-widest text-muted-foreground mb-2">
              {t("editor.episode_num")}
            </label>
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
            <label className="block text-xs tracking-widest text-muted-foreground mb-2">
              {t("editor.episode_title")}
            </label>
            <input
              value={episodeTitle}
              onChange={(e) => setEpisodeTitle(e.target.value)}
              placeholder="平台選擇"
              className="w-full bg-transparent border-b hairline py-2 focus:outline-none focus:border-foreground"
            />
          </section>
        </div>

        <section>
          <label className="block text-xs tracking-widest text-muted-foreground mb-2">
            {t("editor.topic_title")}
          </label>
          <input
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            list="topic-options"
            required
            placeholder="VIBE人人都可實現"
            className="w-full bg-transparent border-b hairline py-2 focus:outline-none focus:border-foreground"
          />
          <datalist id="topic-options">
            {existingTopics.map((t2) => <option key={t2} value={t2} />)}
          </datalist>
          <p className="text-[11px] text-muted-foreground mt-1">{t("editor.topic_hint")}</p>
        </section>

        <section>
          <label className="block text-xs tracking-widest text-muted-foreground mb-2">
            {t("editor.cover")}
          </label>
          <CoverUploader value={coverUrl} onChange={setCoverUrl} userId={user!.id} />
        </section>

        <section>
          <label className="block text-xs tracking-widest text-muted-foreground mb-2">
            {t("editor.content")}
          </label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="# Hello illusd ..."
          />
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t hairline">
          <Link to="/" className="px-5 py-2 border hairline text-sm hover:bg-accent transition">
            {t("editor.cancel")}
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-foreground text-background text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? t("editor.publishing") : t("editor.publish")}
          </button>
        </div>
      </form>
    </div>
  );
}
