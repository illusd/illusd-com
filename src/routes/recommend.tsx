import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { deleteRecommendationAsCreator } from "@/lib/recommend.functions";

interface RecRow {
  id: string;
  name: string;
  url: string;
  description: string | null;
  created_at: string;
}

export const Route = createFileRoute("/recommend")({
  head: () => ({
    meta: [
      { title: "Recommend 推薦平台 — illusd.com" },
      {
        name: "description",
        content: "illusd 創作者親自推薦的平台清單，包含平台名稱、網址與推薦說明。",
      },
      { property: "og:title", content: "Recommend 推薦平台 — illusd.com" },
      {
        property: "og:description",
        content: "illusd 創作者親自推薦的平台清單，包含平台名稱、網址與推薦說明。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecommendPage,
});

function RecommendPage() {
  const { isCreator } = useAuth();
  const removeRec = useServerFn(deleteRecommendationAsCreator);
  const [rows, setRows] = useState<RecRow[] | null>(null);

  useEffect(() => {
    (supabase as any)
      .from("recommendations")
      .select("id, name, url, description, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  const onDelete = async (id: string) => {
    if (!confirm("確定要刪除這個推薦嗎？")) return;
    try {
      await removeRec({ data: { id } });
      setRows((r) => (r ?? []).filter((x) => x.id !== id));
      toast.success("已刪除");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-serif text-3xl">Recommend 推薦</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        創作者推薦的平台，包含名稱、網址與說明。
      </p>

      {rows === null ? (
        <p className="mt-10 text-sm text-muted-foreground">載入中…</p>
      ) : rows.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">目前還沒有推薦。</p>
      ) : (
        <ul className="mt-10 space-y-8">
          {rows.map((r) => (
            <li key={r.id} className="border-b hairline pb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-serif text-xl">{r.name}</h2>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 break-all"
                  >
                    {r.url} <ExternalLink size={12} strokeWidth={1.5} />
                  </a>
                  {r.description && (
                    <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{r.description}</p>
                  )}
                  <Link
                    to="/recommend=$"
                    params={{ _splat: r.url }}
                    className="mt-3 inline-block text-[11px] tracking-widest text-muted-foreground hover:text-foreground"
                  >
                    單頁連結 →
                  </Link>
                </div>
                {isCreator && (
                  <button
                    onClick={() => onDelete(r.id)}
                    aria-label="刪除推薦"
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <Trash2 size={16} strokeWidth={1.25} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isCreator && (
        <Link
          to="/new-recommend"
          className="mt-12 inline-block border hairline px-5 py-3 text-sm hover:bg-accent transition"
        >
          新增推薦
        </Link>
      )}
    </main>
  );
}
