import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { parseTitle } from "@/lib/titleParser";
import { CoverUploader } from "@/components/CoverUploader";
import { MarkdownEditor } from "@/components/MarkdownEditor";

export const Route = createFileRoute("/article/$id/edit")({
  head: () => ({
    meta: [
      { title: i18n.t("meta.edit_article_title") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditArticle,
});

function EditArticle() {
  const { id } = Route.useParams();
  const { user, isCreator, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [rawTitle, setRawTitle] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [episodeNum, setEpisodeNum] = useState<string>("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/sign-up" }); return; }
    if (!isCreator) {
      toast.error(t("editor.creator_only_edit"));
      navigate({ to: "/article/$id", params: { id } });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!data) { toast.error(t("common.not_found")); navigate({ to: "/" }); return; }
      setRawTitle(data.raw_title ?? "");
      setTopicTitle(data.topic_title ?? "");
      setEpisodeNum(data.episode_num != null ? String(data.episode_num) : "");
      setEpisodeTitle(data.episode_title ?? "");
      setCoverUrl(data.cover_url ?? "");
      setContent(data.content ?? "");
      setLoading(false);
    })();
  }, [id, user, isCreator, authLoading, navigate]);

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
    if (!topicTitle.trim()) { toast.error(t("editor.topic_required")); return; }

    const finalRaw = rawTitle.trim() ||
      `#${episodeNum || "?"} (${episodeTitle || ""})-${topicTitle}`;

    setSubmitting(true);
    await (supabase as any).rpc("sync_current_user_creator_profile");
    const { error } = await supabase
      .from("articles")
      .update({
        raw_title: finalRaw,
        topic_title: topicTitle.trim(),
        episode_num: episodeNum ? parseInt(episodeNum, 10) : null,
        episode_title: episodeTitle.trim() || null,
        cover_url: coverUrl.trim() || null,
        content,
      })
      .eq("id", id);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("editor.updated"));
    navigate({ to: "/article/$id", params: { id } });
  };

  if (loading) {
    return <div className="p-10 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="sticky top-0 bg-background/90 backdrop-blur border-b hairline">
        <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
          <div className="font-serif text-lg">{t("editor.edit_title")}</div>
          <Link to="/article/$id" params={{ id }} aria-label={t("common.close")} className="p-2 -mr-2">
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
            placeholder={t("editor.format_placeholder")}
            className="w-full bg-transparent border-b hairline py-2 text-base focus:outline-none focus:border-foreground"
          />
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
            required
            className="w-full bg-transparent border-b hairline py-2 focus:outline-none focus:border-foreground"
          />
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
          <MarkdownEditor value={content} onChange={setContent} />
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t hairline">
          <Link to="/article/$id" params={{ id }} className="px-5 py-2 border hairline text-sm hover:bg-accent transition">
            {t("editor.cancel")}
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-foreground text-background text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? t("editor.saving") : t("editor.save_changes")}
          </button>
        </div>
      </form>
    </div>
  );
}
