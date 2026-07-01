import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import {
  createRednoteFilm,
  deleteRednoteFilm,
  generateOpenCode,
  listRednoteFilms,
  type RednoteFilm,
} from "@/lib/rednote.functions";

export const Route = createFileRoute("/_authenticated/rednote/manage")({
  head: () => ({ meta: [{ title: "小紅書影片管理 · illusd" }] }),
  component: Page,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-red-600">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">找不到頁面</div>,
});

function Page() {
  const { isCreator, loading } = useAuth();
  const listFn = useServerFn(listRednoteFilms);
  const createFn = useServerFn(createRednoteFilm);
  const deleteFn = useServerFn(deleteRednoteFilm);
  const genFn = useServerFn(generateOpenCode);

  const [films, setFilms] = useState<RednoteFilm[]>([]);
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("https://xhslink.com/m/4CLduv9Pzhv");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<Record<string, { code: string; url: string }>>({});

  const refresh = async () => {
    try { setFilms(await listFn()); } catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { if (isCreator) void refresh(); }, [isCreator]);

  if (loading) return <div className="p-8 text-sm">載入中…</div>;
  if (!isCreator) return <div className="p-8 text-sm">僅創作者可存取此頁</div>;

  const onCreate = async () => {
    if (!title.trim()) return toast.error("請輸入標題");
    setBusy(true);
    try {
      const res = await createFn({
        data: {
          title: title.trim(),
          targetUrl: targetUrl.trim(),
          filename: file?.name,
          mime: file?.type,
          size: file?.size,
        },
      });
      if (file && res.uploadUrl) {
        const up = await fetch(res.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "video/mp4" }, body: file });
        if (!up.ok) throw new Error(`影片上傳失敗 (${up.status})`);
      }
      toast.success(`已新增 film-id=${res.film_id}`);
      setTitle(""); setFile(null);
      await refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const onGen = async (film_id: string) => {
    try {
      const res = await genFn({ data: { film_id } });
      setCodes((c) => ({ ...c, [film_id]: { code: res.open_id, url: res.url } }));
      const full = `${window.location.origin}${res.url}`;
      await navigator.clipboard.writeText(full).catch(() => {});
      toast.success(`開啟碼：${res.open_id}（已複製連結）`);
    } catch (e: any) { toast.error(e.message); }
  };

  const onDelete = async (film_id: string) => {
    if (!confirm(`刪除 film-id=${film_id}?`)) return;
    try { await deleteFn({ data: { film_id } }); await refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-10 font-serif">
        <h1 className="text-2xl mb-6">小紅書影片管理</h1>

        <section className="border hairline rounded-md p-5 mb-8 space-y-3">
          <div className="text-sm text-muted-foreground">新增網站 / 影片</div>
          <div className="space-y-2">
            <Label>標題</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：新品開箱" />
          </div>
          <div className="space-y-2">
            <Label>目標網址（下載後跳轉）</Label>
            <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>影片檔案（選填）</Label>
            <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <Button onClick={onCreate} disabled={busy}>{busy ? "處理中…" : "新增"}</Button>
        </section>

        <section className="space-y-4">
          {films.map((f) => (
            <div key={f.id} className="border hairline rounded-md p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-base">{f.title}</div>
                  <div className="text-xs text-muted-foreground break-all">film-id={f.film_id}</div>
                  {f.target_url && <div className="text-xs text-muted-foreground break-all">→ {f.target_url}</div>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => onGen(f.film_id)}>生成開啟碼</Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(f.film_id)}>刪除</Button>
                </div>
              </div>
              {codes[f.film_id] && (
                <div className="mt-3 text-xs bg-muted/40 p-2 rounded font-mono break-all">
                  {codes[f.film_id].code} · {codes[f.film_id].url}
                </div>
              )}
            </div>
          ))}
          {!films.length && <div className="text-sm text-muted-foreground">還沒有影片。</div>}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
