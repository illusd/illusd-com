import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RecRow {
  id: string;
  name: string;
  url: string;
  description: string | null;
}

export const Route = createFileRoute("/recommend=$")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "推薦平台 — illusd.com" },
      { name: "description", content: "illusd 創作者對這個平台的推薦說明與連結。" },
      { property: "og:title", content: "推薦平台 — illusd.com" },
      { property: "og:description", content: "illusd 創作者對這個平台的推薦說明與連結。" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecommendDetailPage,
});

function readTargetUrl(): string {
  if (typeof window === "undefined") return "";
  const href = window.location.href;
  const marker = "/recommend=";
  const idx = href.indexOf(marker);
  if (idx === -1) return "";
  return decodeURIComponent(href.slice(idx + marker.length));
}

function RecommendDetailPage() {
  const [target, setTarget] = useState("");
  const [rows, setRows] = useState<RecRow[] | null>(null);

  useEffect(() => {
    const url = readTargetUrl();
    setTarget(url);
    if (!url) {
      setRows([]);
      return;
    }
    const bare = url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    (supabase as any)
      .from("recommendations")
      .select("id, name, url, description")
      .ilike("url", `%${bare}%`)
      .limit(20)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <Link to="/recommend" className="text-xs tracking-widest text-muted-foreground hover:text-foreground">
        ← Recommend
      </Link>

      {rows === null ? (
        <p className="mt-10 text-sm text-muted-foreground">載入中…</p>
      ) : rows.length === 0 ? (
        <>
          <h1 className="mt-6 font-serif text-2xl">找不到這個推薦</h1>
          <p className="mt-3 text-sm text-muted-foreground break-all">
            網址：{target || "（未提供）"}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            正確格式為 <code className="text-xs">/recommend=平台網址</code>。
          </p>
        </>
      ) : (
        <div className="mt-8 space-y-10">
          {rows.map((r) => (
            <article key={r.id}>
              <h1 className="font-serif text-3xl">{r.name}</h1>
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 break-all"
              >
                {r.url} <ExternalLink size={12} strokeWidth={1.5} />
              </a>
              {r.description && (
                <p className="mt-6 text-sm leading-relaxed whitespace-pre-wrap">{r.description}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
