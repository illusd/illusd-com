import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, Trash2, RefreshCw, Link as LinkIcon, FileText } from "lucide-react";
import { listMyShortLinks, deleteMyShort, type MyShortLinkRow } from "@/lib/illurl.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/_authenticated/my/illurl")({
  head: () => ({
    meta: [
      { title: "我的 illurl · illusd.com" },
      { name: "description", content: "管理你已建立的 illurl 短連結與檔案。" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyIllurlPage,
});

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return "已過期";
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 1) return "今天到期";
  if (days < 30) return `${days} 天後到期`;
  const months = Math.round(days / 30);
  return `約 ${months} 個月後到期`;
}

function MyIllurlPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<MyShortLinkRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useServerFn(listMyShortLinks);
  const del = useServerFn(deleteMyShort);

  const refresh = async () => {
    setBusy(true);
    try {
      const data = await list();
      setRows(data);
    } catch (e) {
      toast.error((e as Error).message || "載入失敗");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (r: MyShortLinkRow) => {
    if (!confirm(`刪除 ${r.url} ？此操作無法復原。`)) return;
    try {
      await del({ data: { kind: r.kind, code: r.code } });
      setRows((rs) => (rs ?? []).filter((x) => !(x.kind === r.kind && x.code === r.code)));
      toast.success("已刪除");
    } catch (e) {
      toast.error((e as Error).message || "刪除失敗");
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/" className="text-xs tracking-widest text-muted-foreground">{t("common.back_home")}</Link>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl">我的 illurl</h1>
            <p className="text-sm text-muted-foreground mt-2">
              永久連結僅提供 <strong>創作者</strong> 與 <Link to="/donate" className="underline">Ko-fi 會員</Link>；
              其他登入者建立的連結將於 1 年後自動刪除。到期前 7 天會寄送提醒信。
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={busy}
            className="border hairline px-3 py-2 text-xs flex items-center gap-2 hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> 重新整理
          </button>
        </div>

        <div className="mt-8 border hairline">
          {rows === null ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              還沒有任何連結。<Link to="/short-url" className="underline">立即建立</Link>。
            </div>
          ) : (
            <ul>
              {rows.map((r) => {
                const permanent = r.expiresAt === null;
                return (
                  <li key={`${r.kind}-${r.code}`} className="p-4 border-b hairline last:border-b-0 flex items-start gap-3">
                    <div className="mt-1 text-muted-foreground">
                      {r.kind === "link" ? <LinkIcon size={14} /> : <FileText size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-mono">{r.url}</code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(r.url);
                            toast.success(t("short.copied"));
                          }}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={t("common.copy")}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 break-all">{r.target}</div>
                      <div className="text-[11px] mt-2 flex gap-3 items-center">
                        <span className="text-muted-foreground">
                          建立於 {new Date(r.createdAt).toLocaleDateString("zh-TW")}
                        </span>
                        <span
                          className={
                            permanent
                              ? "text-foreground"
                              : new Date(r.expiresAt!).getTime() - Date.now() < 7 * 86400000
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }
                        >
                          {permanent ? "永久連結 ∞" : relTime(r.expiresAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(r)}
                      className="border hairline p-2 hover:bg-accent text-muted-foreground"
                      aria-label="刪除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
