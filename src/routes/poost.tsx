import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useAuth } from "@/hooks/useAuth";
import { deletePoostAsCreator } from "@/lib/poost.functions";

interface PoostRow { id: string; content: string; created_at: string; author_id: string; }

export const Route = createFileRoute("/poost")({
  head: () => ({ meta: [{ title: "Poost — illusd.com" }, { name: "description", content: "創作者 Poost 動態。" }] }),
  component: PoostPage,
});

function PoostPage() {
  const { t, i18n } = useTranslation();
  const { isCreator } = useAuth();
  const deletePoost = useServerFn(deletePoostAsCreator);
  const [rows, setRows] = useState<PoostRow[] | null>(null);
  useEffect(() => {
    (supabase as any).from("poosts").select("id, content, created_at, author_id").order("created_at", { ascending: false }).limit(50)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);
  const locale = i18n.language === "zh" ? "zh-TW" : i18n.language === "ja" ? "ja-JP" : "en-US";

  const onDelete = async (id: string) => {
    if (!confirm("確定要刪除這則 Poost 嗎？")) return;
    try {
      await deletePoost({ data: { id } });
      setRows((r) => (r ?? []).filter((p) => p.id !== id));
      toast.success("已刪除");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link to="/" className="text-xs tracking-widest text-muted-foreground">{t("common.back_home")}</Link>
      <h1 className="font-serif text-3xl mt-6">Poost</h1>
      <p className="text-xs tracking-widest text-muted-foreground mt-2 uppercase">Powered by Poost.illusd.com</p>
      {rows === null ? <p className="mt-8 text-sm text-muted-foreground">{t("common.loading")}</p> : rows.length === 0 ? <p className="mt-8 text-sm text-muted-foreground">{t("poost.empty")}</p> : (
        <div className="mt-8 space-y-6">
          {rows.map((p) => (
            <article key={p.id} className="border hairline p-5">
              <MarkdownRenderer content={p.content} />
              <div className="mt-4 flex items-center justify-between text-[11px] tracking-widest text-muted-foreground">
                <span>{new Date(p.created_at).toLocaleString(locale)}</span>
                {isCreator && (
                  <button onClick={() => onDelete(p.id)} className="underline underline-offset-4 hover:text-destructive">
                    刪除
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
