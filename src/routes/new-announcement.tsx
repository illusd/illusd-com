import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X, Trash2, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/new-announcement")({
  head: () => ({
    meta: [
      { title: "張貼公告 — illusd" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewAnnouncement,
});

type Item = { id: string; content: string; active: boolean; created_at: string };

function NewAnnouncement() {
  const { user, isCreator, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<Item[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("id, content, active, created_at")
      .order("created_at", { ascending: false });
    setList((data ?? []) as Item[]);
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/sign-up" });
    if (!loading && user && !isCreator) {
      toast.error(t("announcement.creator_only"));
      navigate({ to: "/" });
    }
  }, [user, isCreator, loading, navigate]);

  useEffect(() => { if (isCreator) load(); }, [isCreator, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      author_id: user.id,
      content: content.trim(),
      active: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setContent("");
    toast.success(t("announcement.submit"));
    load();
  };

  const toggle = async (it: Item) => {
    await supabase.from("announcements").update({ active: !it.active }).eq("id", it.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(t("announcement.delete_confirm"))) return;
    await supabase.from("announcements").delete().eq("id", id);
    load();
  };

  if (loading || !user || !isCreator) {
    return <div className="p-10 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="sticky top-0 bg-background/90 backdrop-blur border-b hairline">
        <div className="mx-auto max-w-3xl px-5 h-14 flex items-center justify-between">
          <div className="font-serif text-lg flex items-center gap-2">
            <Megaphone size={18} strokeWidth={1.5} /> {t("announcement.compose")}
          </div>
          <Link to="/" aria-label={t("common.close")} className="p-2 -mr-2">
            <X size={20} strokeWidth={1.25} />
          </Link>
        </div>
      </div>

      <form onSubmit={submit} className="mx-auto max-w-3xl px-5 py-10 space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("announcement.placeholder")}
          rows={3}
          required
          className="w-full bg-transparent border hairline px-3 py-2 text-sm focus:outline-none focus:border-foreground"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="px-6 py-2 bg-foreground text-background text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? t("announcement.submitting") : t("announcement.submit")}
          </button>
        </div>
      </form>

      <section className="mx-auto max-w-3xl px-5 pb-20">
        <h2 className="font-serif text-base border-b hairline pb-2 mb-3">{t("announcement.manage")}</h2>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("announcement.empty")}</p>
        ) : (
          <ul className="divide-y hairline">
            {list.map((it) => (
              <li key={it.id} className="py-3 flex items-start gap-3 text-sm">
                <div className="flex-1">
                  <div>{it.content}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {new Date(it.created_at).toLocaleString()} · {it.active ? t("announcement.active") : t("announcement.hidden")}
                  </div>
                </div>
                <button onClick={() => toggle(it)} className="text-xs border hairline px-2 py-1 hover:bg-accent">
                  {it.active ? t("announcement.hidden") : t("announcement.active")}
                </button>
                <button onClick={() => remove(it.id)} aria-label={t("article.delete")} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
