import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/rednote/cn/$film/$open")({
  head: () => ({ meta: [{ title: "小红书 · 视频下载" }] }),
  component: Page,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-red-600">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">页面不存在</div>,
});

function parseSeg(seg: string, prefix: string): string | null {
  if (!seg.startsWith(prefix)) return null;
  return decodeURIComponent(seg.slice(prefix.length));
}

function Page() {
  const { film, open } = Route.useParams();
  const filmId = parseSeg(film, "film-id=");
  const openId = parseSeg(open, "open-id=");

  const [status, setStatus] = useState<"loading" | "ok" | "invalid" | "used">("loading");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>("https://xhslink.com/m/4CLduv9Pzhv");
  const [title, setTitle] = useState("");

  useEffect(() => {
    (async () => {
      if (!filmId || !openId) { setStatus("invalid"); return; }
      const { data: code } = await supabase
        .from("rednote_open_codes" as any)
        .select("id, used_at")
        .eq("film_id", filmId).eq("open_id", openId).maybeSingle();
      if (!code) { setStatus("invalid"); return; }
      if ((code as any).used_at) { setStatus("used"); return; }

      const { data: film } = await supabase
        .from("rednote_films" as any)
        .select("title, target_url, video_path")
        .eq("film_id", filmId).maybeSingle();
      if (!film) { setStatus("invalid"); return; }
      setTitle((film as any).title ?? "");
      if ((film as any).target_url) setTargetUrl((film as any).target_url);
      if ((film as any).video_path) {
        const { data: signed } = await supabase.storage.from("rednote-videos").createSignedUrl((film as any).video_path, 60 * 60);
        if (signed?.signedUrl) setVideoUrl(signed.signedUrl);
      }

      // mark used
      await supabase.from("rednote_open_codes" as any).update({ used_at: new Date().toISOString() } as any)
        .eq("id", (code as any).id);
      setStatus("ok");
    })();
  }, [filmId, openId]);

  const onDownload = async () => {
    if (!videoUrl) { window.location.href = targetUrl; return; }
    try {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = `${filmId ?? "video"}.mp4`;
      document.body.appendChild(a); a.click(); a.remove();
    } finally {
      setTimeout(() => { window.location.href = targetUrl; }, 800);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans" lang="zh-CN">
      <div className="mx-auto max-w-md px-5 py-8">
        <div className="text-lg mb-4">小红书 · 视频下载</div>
        {status === "loading" && <div className="text-sm opacity-70">加载中…</div>}
        {status === "invalid" && <div className="text-sm opacity-70">链接无效或已失效。</div>}
        {status === "used" && <div className="text-sm opacity-70">此开启码已被使用，请重新获取。</div>}
        {status === "ok" && (
          <>
            {title && <div className="text-sm opacity-80 mb-3">{title}</div>}
            {videoUrl ? (
              <video src={videoUrl} controls playsInline className="w-full rounded-md bg-neutral-900 mb-5" />
            ) : (
              <div className="w-full aspect-video rounded-md bg-neutral-900 mb-5 flex items-center justify-center text-xs opacity-60">暂无预览</div>
            )}
            <Button onClick={onDownload} className="w-full bg-white text-black hover:bg-white/90">下载视频</Button>
            <div className="text-[11px] opacity-50 mt-4">下载完成后将自动跳转</div>
          </>
        )}
      </div>
    </main>
  );
}
