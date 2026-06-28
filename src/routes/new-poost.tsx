import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { LegalFooterLinks } from "@/components/SiteFooter";
import { createPoostAsCreator } from "@/lib/poost.functions";

export const Route = createFileRoute("/new-poost")({
  head: () => ({ meta: [{ title: "新增 Poost — illusd.com" }, { name: "robots", content: "noindex" }] }),
  component: NewPoostPage,
});

function NewPoostPage() {
  const { user, isCreator, loading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createPoost = useServerFn(createPoostAsCreator);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading || !user || !isCreator) return <div className="p-10 text-sm text-muted-foreground">{t("common.loading")}</div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createPoost({ data: { content } });
      toast.success(t("poost.published"));
      navigate({ to: "/poost" });
    } catch (err) {
      toast.error((err as Error).message || t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="sticky top-0 bg-background/90 backdrop-blur border-b hairline">
        <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
          <div className="font-serif text-lg">{t("poost.compose")}</div>
          <Link to="/" aria-label={t("common.close")} className="p-2 -mr-2"><X size={20} strokeWidth={1.25} /></Link>
        </div>
      </div>
      <form onSubmit={submit} className="mx-auto max-w-5xl px-5 py-10 space-y-6">
        <MarkdownEditor value={content} onChange={setContent} rows={12} placeholder={t("poost.placeholder")} />
        <div className="flex justify-end gap-3 pt-4 border-t hairline">
          <Link to="/" className="px-5 py-2 border hairline text-sm hover:bg-accent transition">{t("editor.cancel")}</Link>
          <button disabled={busy || !content.trim()} className="px-6 py-2 bg-foreground text-background text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50">
            {busy ? t("poost.publishing") : t("poost.publish")}
          </button>
        </div>
      </form>
      <LegalFooterLinks className="px-5 pb-8 text-xs text-muted-foreground" />
    </div>
  );
}
