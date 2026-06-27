import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export const Route = createFileRoute("/_authenticated/message")({
  head: () => ({
    meta: [
      { title: "聊天室 — illusd" },
      { name: "description", content: "illusd 登入後聊天室。" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MessagePage,
});

type Msg = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name?: string | null;
  creator_id?: string | null;
};

function MessagePage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, user_id, content, created_at")
      .order("created_at", { ascending: true })
      .limit(200);
    const list = (data ?? []) as Msg[];
    const ids = Array.from(new Set(list.map((m) => m.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, creator_id")
        .in("id", ids);
      const pmap = new Map(
        (profs ?? []).map((p: { id: string; display_name: string | null; creator_id: string | null }) => [p.id, p]),
      );
      list.forEach((m) => {
        const p = pmap.get(m.user_id);
        m.display_name = p?.display_name ?? null;
        m.creator_id = p?.creator_id ?? null;
      });
    }
    setMessages(list);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("chat_messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || !user) return;
    const { error } = await supabase.from("chat_messages").insert({ user_id: user.id, content: v });
    if (error) return toast.error(error.message);
    setText("");
  };

  const remove = async (id: string) => {
    if (!confirm(t("article.delete_confirm"))) return;
    await supabase.from("chat_messages").delete().eq("id", id);
  };

  const locale = i18n.language === "zh" ? "zh-TW" : i18n.language === "ja" ? "ja-JP" : "en-US";

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      <header className="px-5 py-4 border-b hairline">
        <h1 className="font-serif text-xl">{t("nav.message")}</h1>
        <p className="text-xs text-muted-foreground mt-1">{t("message.subtitle")}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 mx-auto w-full max-w-2xl">
        <ul className="space-y-4">
          {messages.map((m) => {
            const own = user?.id === m.user_id;
            return (
              <li key={m.id} className="text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{m.display_name ?? t("article.reader")}</span>
                  {m.creator_id && (
                    <span className="text-[10px] tracking-widest text-muted-foreground">
                      {t("article.creator_tag")}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(m.created_at).toLocaleString(locale)}
                  </span>
                  {own && (
                    <button onClick={() => remove(m.id)} aria-label="delete" className="text-muted-foreground hover:text-foreground">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <div className="mt-1">
                  <MarkdownRenderer content={m.content} />
                </div>
              </li>
            );
          })}
          {messages.length === 0 && (
            <li className="text-sm text-muted-foreground">{t("message.empty")}</li>
          )}
        </ul>
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t hairline p-3 mx-auto w-full max-w-2xl flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("message.placeholder")}
          className="flex-1 border hairline px-3 py-2 bg-transparent text-sm focus:outline-none focus:border-foreground"
        />
        <button className="px-4 py-2 bg-foreground text-background text-sm">{t("article.submit")}</button>
      </form>
    </main>
  );
}
