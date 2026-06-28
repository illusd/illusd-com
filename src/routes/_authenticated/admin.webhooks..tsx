import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/useAuth";

type Jsonish = Record<string, unknown> | unknown[] | string | number | boolean | null;
interface DetailRow {
  id: string; source: string; event_type: string | null; status: string; http_status: number; email: string | null;
  message_id: string | null; reason: string | null; links_upgraded: number | null; files_upgraded: number | null;
  raw: Jsonish; verification_result: Jsonish; write_result: Jsonish; upgrade_before: Jsonish; upgrade_after: Jsonish; created_at: string;
}

export const Route = createFileRoute("/_authenticated/admin/webhooks/")({
  head: () => ({ meta: [{ title: "Webhook 事件詳情 · illusd.com" }, { name: "robots", content: "noindex" }] }),
  component: WebhookEventDetailPage,
});

function Pretty({ title, value }: { title: string; value: Jsonish }) {
  return (
    <section className="border hairline p-4">
      <h2 className="font-serif text-lg mb-3">{title}</h2>
      <pre className="text-xs bg-accent/30 p-3 overflow-auto whitespace-pre-wrap leading-relaxed">{JSON.stringify(value ?? null, null, 2)}</pre>
    </section>
  );
}

function WebhookEventDetailPage() {
  const { id } = Route.useParams();
  const { isCreator, loading } = useAuth();
  const [row, setRow] = useState<DetailRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isCreator) { setErr("僅限創作者瀏覽"); return; }
    (supabase as any).from("webhook_events").select("*").eq("id", id).maybeSingle().then(({ data, error }: any) => {
      if (error) setErr(error.message); else if (!data) setErr("找不到事件"); else setRow(data);
    });
  }, [id, isCreator, loading]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link to="/admin/webhooks" className="text-xs tracking-widest text-muted-foreground">← Webhook 事件</Link>
        <h1 className="font-serif text-3xl mt-4">Webhook 事件詳情</h1>
        {err && <p className="mt-6 text-sm text-destructive">{err}</p>}
        {!row && !err ? <p className="mt-8 text-sm text-muted-foreground">載入中…</p> : row ? (
          <div className="mt-8 space-y-5">
            <section className="border hairline p-4 grid gap-2 text-sm md:grid-cols-2">
              <div><span className="text-muted-foreground">狀態：</span>{row.status} / HTTP {row.http_status}</div>
              <div><span className="text-muted-foreground">來源：</span>{row.source}</div>
              <div><span className="text-muted-foreground">事件：</span>{row.event_type ?? "—"}</div>
              <div><span className="text-muted-foreground">時間：</span>{new Date(row.created_at).toLocaleString("zh-TW")}</div>
              <div><span className="text-muted-foreground">Email：</span>{row.email ?? "—"}</div>
              <div><span className="text-muted-foreground">Message ID：</span>{row.message_id ?? "—"}</div>
              <div><span className="text-muted-foreground">升級：</span>links {row.links_upgraded ?? 0} / files {row.files_upgraded ?? 0}</div>
              <div><span className="text-muted-foreground">原因：</span>{row.reason ?? "—"}</div>
            </section>
            <Pretty title="原始 payload" value={row.raw} />
            <Pretty title="驗證結果" value={row.verification_result} />
            <Pretty title="寫入的資料" value={row.write_result} />
            <Pretty title="升級前狀態" value={row.upgrade_before} />
            <Pretty title="升級後狀態" value={row.upgrade_after} />
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
