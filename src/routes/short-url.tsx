import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useServerFn } from "@tanstack/react-start";
import { Link as LinkIcon, FileUp, Copy } from "lucide-react";
import { Recaptcha } from "@/components/Recaptcha";
import { FullscreenStateOverlay } from "@/components/animations/AppleStateAnimation";
import { supabase } from "@/integrations/supabase/client";
import { createShortLink, prepareShortFile } from "@/lib/illurl.functions";
import { useDraftPersist, clearDraft } from "@/hooks/useDraftPersist";

export const Route = createFileRoute("/short-url")({
  head: () => {
    const title = i18n.t("meta.short_title");
    const description = i18n.t("meta.short_description");
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
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("link");
  const [capToken, setCapToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
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
      const message = captchaError || t("short.captcha_wait");
      toast.error(message);
      return;
    }
    if (!target.trim()) return;
    setLinkBusy(true);
    setResultUrl(null);
    try {
      const r = await createLinkFn({ data: { capToken, targetUrl: target.trim() } });
      setResultUrl(r.url);
      clearDraft("short-url:target");
      showOverlay({ kind: "success", title: t("short.create"), subtitle: t("short.result") });
    } catch (err) {
      const message = (err as Error).message || t("short.captcha_wait");
      toast.error(message);
      showOverlay({ kind: "error", title: t("short.create"), subtitle: message });
    } finally {
      setLinkBusy(false);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capToken) {
      const message = captchaError || t("short.captcha_wait");
      toast.error(message);
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
      const { error: upErr } = await supabase.storage
        .from("illurl-files")
        .uploadToSignedUrl(prep.path, prep.token, file, {
          contentType: file.type || "application/octet-stream",
        });
      if (upErr) throw upErr;
      setFileProgress(100);
      setResultUrl(prep.url);
      showOverlay({ kind: "success", title: t("short.upload"), subtitle: t("short.result") });
    } catch (err) {
      const message = (err as Error).message || t("short.captcha_wait");
      toast.error(message);
      showOverlay({ kind: "error", title: t("short.upload"), subtitle: message });
    } finally {
      setFileBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl px-5 py-14">
      {overlay && (
        <FullscreenStateOverlay variant={overlay.kind} title={overlay.title} subtitle={overlay.subtitle} />
      )}

      <Link to="/" className="text-xs tracking-widest text-muted-foreground">{t("common.back_home")}</Link>
      <h1 className="font-serif text-3xl mt-6">{t("short.title")}</h1>
      <p className="text-sm text-muted-foreground mt-2">{t("short.desc")}</p>
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed border-l-2 border-foreground/40 pl-3">
        {t("short.membership_note")} <Link to="/my/illurl" className="underline">{t("nav.my_illurl")}</Link>
      </p>


      <div className="mt-8 flex border hairline text-sm">
        <button
          onClick={() => { setTab("link"); setResultUrl(null); }}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition ${
            tab === "link" ? "bg-foreground text-background" : "hover:bg-accent"
          }`}
        >
          <LinkIcon size={14} /> {t("short.tab_link")}
        </button>
        <button
          onClick={() => { setTab("file"); setResultUrl(null); }}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition border-l hairline ${
            tab === "file" ? "bg-foreground text-background" : "hover:bg-accent"
          }`}
        >
          <FileUp size={14} /> {t("short.tab_file")}
        </button>
      </div>

      {tab === "link" ? (
        <form onSubmit={handleCreateLink} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs tracking-widest text-muted-foreground mb-2">{t("short.target")}</label>
            <input
              type="url"
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={t("short.target_placeholder")}
              className="w-full bg-transparent border-b hairline py-2 focus:outline-none focus:border-foreground"
            />
          </div>
          <Recaptcha
            onVerified={(token) => { setCapToken(token); if (token) setCaptchaError(null); }}
            onError={setCaptchaError}
          />
          {captchaError && <p role="alert" className="text-xs text-destructive">{captchaError}</p>}
          <button
            type="submit"
            disabled={linkBusy || !capToken}
            className="w-full bg-foreground text-background py-3 text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
          >
            {linkBusy ? t("short.creating") : t("short.create")}
          </button>
        </form>
      ) : (
        <form onSubmit={handleUploadFile} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs tracking-widest text-muted-foreground mb-2">{t("short.choose_file")}</label>
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
          <Recaptcha
            onVerified={(token) => { setCapToken(token); if (token) setCaptchaError(null); }}
            onError={setCaptchaError}
          />
          {captchaError && <p role="alert" className="text-xs text-destructive">{captchaError}</p>}
          {fileBusy && (
            <div className="text-xs text-muted-foreground">
              {t("short.uploading")} {fileProgress > 0 ? `${fileProgress}%` : ""}
            </div>
          )}
          <button
            type="submit"
            disabled={fileBusy || !capToken || !file}
            className="w-full bg-foreground text-background py-3 text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
          >
            {fileBusy ? t("short.uploading") : t("short.upload")}
          </button>
        </form>
      )}

      {resultUrl && (
        <div className="mt-8 border hairline p-4">
          <div className="text-xs tracking-widest text-muted-foreground mb-2">{t("short.result")}</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm break-all">{resultUrl}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(resultUrl); toast.success(t("short.copied")); }}
              className="border hairline p-2 hover:bg-accent"
              aria-label={t("common.copy")}
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground mt-10 leading-relaxed">{t("short.agree_note")}</p>
    </main>
  );
}
