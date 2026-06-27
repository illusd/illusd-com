import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Link as LinkIcon, FileUp, Copy } from "lucide-react";
import { Recaptcha } from "@/components/Recaptcha";
import { FullscreenStateOverlay } from "@/components/animations/AppleStateAnimation";
import { supabase } from "@/integrations/supabase/client";
import { createShortLink, prepareShortFile } from "@/lib/illurl.functions";
import { useDraftPersist, clearDraft } from "@/hooks/useDraftPersist";

export const Route = createFileRoute("/short-url")({
  head: () => {
    const title = "illurl 短網址與檔案分享 — illusd";
    const description = "免費生成 illusd.com 短網址與檔案分享連結，最大 200MB。";
    const url = "https://illusd.com/short-url";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ShortUrlPage,
});

type Tab = "link" | "file";
type Overlay = null | { kind: "success" | "error"; title: string; subtitle: string };

function ShortUrlPage() {
  const [tab, setTab] = useState<Tab>("link");
  const [capToken, setCapToken] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  // link form
  const [target, setTarget] = useState("");
  useDraftPersist("short-url:target", target, setTarget);
  const [linkBusy, setLinkBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // file form
  const [file, setFile] = useState<File | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileProgress, setFileProgress] = useState(0);

  const createLinkFn = useServerFn(createShortLink);
  const prepareFileFn = useServerFn(prepareShortFile);

  const showOverlay = (o: Overlay) => {
    setOverlay(o);
    setTimeout(() => setOverlay(null), 3000);
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capToken) {
      toast.error("請等待人機驗證完成");
      return;
    }
    if (!target.trim()) return;
    setLinkBusy(true);
    setResultUrl(null);
    try {
      const r = await createLinkFn({ data: { capToken, targetUrl: target.trim() } });
      setResultUrl(r.url);
      clearDraft("short-url:target");
      showOverlay({ kind: "success", title: "上傳完成！", subtitle: "短網址已成功建立並可立即使用" });
    } catch (err) {
      showOverlay({
        kind: "error",
        title: "上傳失敗！",
        subtitle: (err as Error).message || "偵測到異常流量或已達速率限制上限，請稍後再試",
      });
    } finally {
      setLinkBusy(false);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capToken) {
      toast.error("請等待人機驗證完成");
      return;
    }
    if (!file) return;
    setFileBusy(true);
    setFileProgress(0);
    setResultUrl(null);
    try {
      const prep = await prepareFileFn({
        data: {
          capToken,
          filename: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
        },
      });
      // Direct upload to Supabase storage via signed upload URL
      const { error: upErr } = await supabase.storage
        .from("illurl-files")
        .uploadToSignedUrl(prep.path, prep.token, file, {
          contentType: file.type || "application/octet-stream",
        });
      if (upErr) throw upErr;
      setFileProgress(100);
      setResultUrl(prep.url);
      showOverlay({ kind: "success", title: "上傳完成！", subtitle: "您的檔案已成功處理並安全儲存" });
    } catch (err) {
      showOverlay({
        kind: "error",
        title: "上傳失敗！",
        subtitle: (err as Error).message || "偵測到異常流量或已達速率限制上限，請稍後再試",
      });
    } finally {
      setFileBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl px-5 py-14">
      {overlay && (
        <FullscreenStateOverlay
          variant={overlay.kind}
          title={overlay.title}
          subtitle={overlay.subtitle}
        />
      )}

      <Link to="/" className="text-xs tracking-widest text-muted-foreground">← 回首頁</Link>
      <h1 className="font-serif text-3xl mt-6">illurl</h1>
      <p className="text-sm text-muted-foreground mt-2">
        免費生成 illusd.com 短網址或檔案分享連結。每組短碼五位數，全站永久有效。
      </p>

      <div className="mt-8 flex border hairline text-sm">
        <button
          onClick={() => { setTab("link"); setResultUrl(null); }}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition ${
            tab === "link" ? "bg-foreground text-background" : "hover:bg-accent"
          }`}
        >
          <LinkIcon size={14} /> 短網址
        </button>
        <button
          onClick={() => { setTab("file"); setResultUrl(null); }}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition border-l hairline ${
            tab === "file" ? "bg-foreground text-background" : "hover:bg-accent"
          }`}
        >
          <FileUp size={14} /> 檔案上傳
        </button>
      </div>

      {tab === "link" ? (
        <form onSubmit={handleCreateLink} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs tracking-widest text-muted-foreground mb-2">目標網址</label>
            <input
              type="url"
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="https://example.com/very/long/url"
              className="w-full bg-transparent border-b hairline py-2 focus:outline-none focus:border-foreground"
            />
          </div>
          <CapCaptcha onVerified={setCapToken} />
          <button
            type="submit"
            disabled={linkBusy || !capToken}
            className="w-full bg-foreground text-background py-3 text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
          >
            {linkBusy ? "建立中…" : "建立短網址"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleUploadFile} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs tracking-widest text-muted-foreground mb-2">
              選擇檔案（最大 200 MB）
            </label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:border file:border-solid file:hairline file:bg-transparent file:text-sm hover:file:bg-accent"
            />
            {file && (
              <p className="text-xs text-muted-foreground mt-2">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
          <CapCaptcha onVerified={setCapToken} />
          {fileBusy && (
            <div className="text-xs text-muted-foreground">
              上傳中… {fileProgress > 0 ? `${fileProgress}%` : ""}
            </div>
          )}
          <button
            type="submit"
            disabled={fileBusy || !capToken || !file}
            className="w-full bg-foreground text-background py-3 text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
          >
            {fileBusy ? "上傳中…" : "上傳並建立連結"}
          </button>
        </form>
      )}

      {resultUrl && (
        <div className="mt-8 border hairline p-4">
          <div className="text-xs tracking-widest text-muted-foreground mb-2">永久連結</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm break-all">{resultUrl}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(resultUrl);
                toast.success("已複製連結");
              }}
              className="border hairline p-2 hover:bg-accent"
              aria-label="複製"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground mt-10 leading-relaxed">
        使用 illurl 即表示同意 <Link to="/terms-of-service" className="underline">服務條款</Link> 與{" "}
        <Link to="/privacy" className="underline">隱私權政策</Link>。我們會記錄建立來源以防範濫用。
      </p>
    </main>
  );
}
