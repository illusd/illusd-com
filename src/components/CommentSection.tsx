import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Trash2, Edit2, MessageSquare, Check, X, Coffee } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDraftPersist, clearDraft } from "@/hooks/useDraftPersist";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

const ARTICLE_DONATE_URL = "https://pay.illusd.com/products/article-donate";

type ProfileLite = { display_name: string | null; creator_id: string | null };

interface CommentRow {
  id: string;
  article_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: ProfileLite | null;
  likeCount?: number;
  liked?: boolean;
  replies?: CommentRow[];
}

export function CommentSection({ articleId }: { articleId: string }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newText, setNewText] = useState("");
  const draftKey = `comment:${articleId}`;
  useDraftPersist(draftKey, newText, setNewText);

  const load = useCallback(async () => {
    const [{ data: cs }, { data: cls }] = await Promise.all([
      supabase
        .from("comments")
        .select("id, article_id, user_id, parent_id, content, created_at, updated_at")
        .eq("article_id", articleId)
        .order("created_at", { ascending: true }),
      supabase.from("comment_likes").select("comment_id, user_id"),
    ]);
    const list = (cs ?? []) as CommentRow[];

    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    const pmap = new Map<string, ProfileLite>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, creator_id")
        .in("id", ids);
      (profs ?? []).forEach((p: { id: string } & ProfileLite) =>
        pmap.set(p.id, { display_name: p.display_name, creator_id: p.creator_id }),
      );
    }

    const likeCount = new Map<string, number>();
    const likedSet = new Set<string>();
    (cls ?? []).forEach((l: { comment_id: string; user_id: string }) => {
      likeCount.set(l.comment_id, (likeCount.get(l.comment_id) ?? 0) + 1);
      if (user && l.user_id === user.id) likedSet.add(l.comment_id);
    });

    const enriched = list.map((c) => ({
      ...c,
      profile: pmap.get(c.user_id) ?? null,
      likeCount: likeCount.get(c.id) ?? 0,
      liked: likedSet.has(c.id),
    }));

    // build tree (one level)
    const byId = new Map(enriched.map((c) => [c.id, { ...c, replies: [] as CommentRow[] }]));
    const roots: CommentRow[] = [];
    byId.forEach((c) => {
      if (c.parent_id && byId.has(c.parent_id)) {
        byId.get(c.parent_id)!.replies!.push(c);
      } else {
        roots.push(c);
      }
    });
    roots.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setComments(roots);
  }, [articleId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel(`comments-${articleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `article_id=eq.${articleId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comment_likes" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [articleId, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const txt = newText.trim();
    if (!txt) return;
    const { error } = await supabase
      .from("comments")
      .insert({ article_id: articleId, user_id: user.id, content: txt });
    if (error) return toast.error(error.message);
    setNewText("");
    clearDraft(draftKey);
  };

  const total = comments.reduce((s, c) => s + 1 + (c.replies?.length ?? 0), 0);

  return (
    <section className="mx-auto max-w-2xl px-5 pb-24">
      <h2 className="font-serif text-xl border-b hairline pb-3 mb-6">
        {t("article.comments")} · {total}
      </h2>

      {user ? (
        <form onSubmit={submit} className="mb-8">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={3}
            placeholder={t("article.placeholder")}
            className="w-full border hairline p-3 bg-transparent text-sm focus:outline-none focus:border-foreground resize-y"
          />
          <div className="flex justify-end mt-2">
            <button className="px-5 py-2 bg-foreground text-background text-sm hover:opacity-90 transition">
              {t("article.submit")}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground mb-8">
          <Link to="/sign-up" className="underline">
            {t("nav.sign_in")}
          </Link>{" "}
          {t("article.sign_in_prompt")}
        </p>
      )}

      <ul className="space-y-6">
        {comments.map((c) => (
          <CommentItem key={c.id} c={c} articleId={articleId} onChanged={load} />
        ))}
        {comments.length === 0 && (
          <li className="text-sm text-muted-foreground">{t("article.no_comments")}</li>
        )}
      </ul>
    </section>
  );
}

function CommentItem({
  c,
  articleId,
  onChanged,
  isReply = false,
}: {
  c: CommentRow;
  articleId: string;
  onChanged: () => void;
  isReply?: boolean;
}) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(c.content);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  const own = user?.id === c.user_id;
  const wasEdited = +new Date(c.updated_at) - +new Date(c.created_at) > 2000;

  const toggleLike = async () => {
    if (!user) {
      toast.error(t("article.sign_in_prompt"));
      return;
    }
    if (c.liked) {
      await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", c.id)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("comment_likes")
        .insert({ comment_id: c.id, user_id: user.id });
    }
  };

  const saveEdit = async () => {
    const t2 = editText.trim();
    if (!t2) return;
    const { error } = await supabase
      .from("comments")
      .update({ content: t2 })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    setEditing(false);
    onChanged();
  };

  const remove = async () => {
    if (!confirm(t("article.delete_confirm"))) return;
    await supabase.from("comments").delete().eq("id", c.id);
    onChanged();
  };

  const locale = i18n.language === "zh" ? "zh-TW" : i18n.language === "ja" ? "ja-JP" : "en-US";

  const sendReply = async () => {
    if (!user) return;
    const txt = replyText.trim();
    if (!txt) return;
    const { error } = await supabase.from("comments").insert({
      article_id: articleId,
      user_id: user.id,
      content: txt,
      parent_id: c.parent_id ?? c.id, // flatten to 1 level
    });
    if (error) return toast.error(error.message);
    setReplyText("");
    setReplying(false);
    onChanged();
  };

  return (
    <li className={`${isReply ? "" : "border-b hairline pb-5"}`}>
      <div className="flex items-baseline justify-between">
        <div className="text-sm">
          <span className="font-medium">{c.profile?.display_name ?? t("article.reader")}</span>
          {c.profile?.creator_id && (
            <span className="ml-2 text-[10px] tracking-widest text-muted-foreground">
              {t("article.creator_tag")}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-3">
          {new Date(c.created_at).toLocaleString(locale)}
          {wasEdited && <span>· {t("article.edited")}</span>}
        </div>
      </div>

      {editing ? (
        <div className="mt-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={2}
            className="w-full border hairline p-2 bg-transparent text-sm focus:outline-none focus:border-foreground"
          />
          <div className="flex gap-2 mt-1 text-xs">
            <button onClick={saveEdit} className="flex items-center gap-1 border hairline px-2 py-1">
              <Check size={12} /> {t("article.save")}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditText(c.content);
              }}
              className="flex items-center gap-1 border hairline px-2 py-1"
            >
              <X size={12} /> {t("article.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-sm">
          <MarkdownRenderer content={c.content} />
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1 hover:text-foreground ${c.liked ? "text-foreground" : ""}`}
        >
          <Heart size={12} fill={c.liked ? "currentColor" : "none"} /> {c.likeCount ?? 0}
        </button>
        {!isReply && user && (
          <button
            onClick={() => setReplying((v) => !v)}
            className="flex items-center gap-1 hover:text-foreground"
          >
            <MessageSquare size={12} /> {t("article.reply")}
          </button>
        )}
        {own && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Edit2 size={12} /> {t("article.edit")}
            </button>
            <button
              onClick={remove}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Trash2 size={12} /> {t("article.delete")}
            </button>
          </>
        )}
      </div>

      {replying && (
        <div className="mt-2 pl-4 border-l hairline">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder={t("article.reply_placeholder")}
            className="w-full border hairline p-2 bg-transparent text-sm focus:outline-none focus:border-foreground"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">{t("article.markdown_supported")}</p>
          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={() => setReplying(false)}
              className="text-xs px-3 py-1 border hairline"
            >
              {t("article.cancel")}
            </button>
            <button
              onClick={sendReply}
              className="text-xs px-3 py-1 bg-foreground text-background"
            >
              {t("article.submit")}
            </button>
          </div>
        </div>
      )}

      {c.replies && c.replies.length > 0 && (
        <ul className="mt-4 pl-4 border-l hairline space-y-4">
          {c.replies.map((r) => (
            <CommentItem
              key={r.id}
              c={r}
              articleId={articleId}
              onChanged={onChanged}
              isReply
            />
          ))}
        </ul>
      )}
    </li>
  );
}
