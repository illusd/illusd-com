import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface PoostRow { id: string; content: string; created_at: string; author_id: string; }

export const Route = createFileRoute("/poost")({
  head: () => ({ meta: [{ title: "Poost — illusd.com" }, { name: "description", content: "創作者 Poost 動態。" }] }),
  component: PoostPage,
});

function PoostPage() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<PoostRow[] | null>(null);
  useEffect(() => {
    (supabase as any).from("poosts").select("id, content, created_at, author_id").order("created_at", { ascending: false }).limit(50)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);
  const locale = i18n.language === "zh" ? "zh-TW" : i18n.language === "ja" ? "ja-JP" : "en-US";
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
              <div className="mt-4 text-[11px] tracking-widest text-muted-foreground">{new Date(p.created_at).toLocaleString(locale)}</div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
