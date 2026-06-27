import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/webhooks")({
  head: () => ({
    meta: [
      { title: "Webhook 事件 · illusd.com" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebhookEventsPage,
});

interface Row {
  id: string;
  source: string;
  event_type: string | null;
  status: string;
  http_status: number;
  email: string | null;
  message_id: string | null;
  reason: string | null;
  links_upgraded: number | null;
  files_upgraded: number | null;
  created_at: string;
}

function badge(status: string) {
  const m: Record<string, string> = {
    ok: "bg-foreground text-background",
    invalid_token: "bg-destructive text-background",
    invalid_payload: "border border-destructive text-destructive",
    error: "border border-destructive text-destructive",
  };
  return m[status] || "border hairline";
}

function WebhookEventsPage() {
  const { isCreator, loading } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isCreator) {
      setErr("僅限創作者瀏覽");
      return;
    }
    (async () => {
      const { data, error } = await (supabase as any)
        .from("webhook_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) setErr(error.message);
      else setRows((data as Row[]) ?? []);
    })();
  }, [isCreator, loading]);

  const csvEscape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const buildCsv = (data: Row[]) => {
    const headers = ["created_at","status","http_status","event_type","email","message_id","links_upgraded","files_upgraded","reason"];
    const lines = [headers.join(",")];
    for (const r of data) {
      lines.push([
        r.created_at, r.status, r.http_status, r.event_type ?? "",
        r.email ?? "", r.message_id ?? "",
        r.links_upgraded ?? 0, r.files_upgraded ?? 0, r.reason ?? "",
      ].map(csvEscape).join(","));
    }
    return lines.join("\n");
  };
  const downloadCsv = () => {
    if (!rows) return;
    const csv = "\uFEFF" + buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webhook_events_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const [copied, setCopied] = useState(false);
  const copyCsv = async () => {
    if (!rows) return;
    await navigator.clipboard.writeText(buildCsv(rows));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link to="/" className="text-xs tracking-widest text-muted-foreground">← 回首頁</Link>
        <h1 className="font-serif text-3xl mt-4">Webhook 事件</h1>
        <p className="text-sm text-muted-foreground mt-2">最近 100 筆 Ko-fi webhook 處理紀錄。</p>

        {rows && rows.length > 0 && (
          <div className="mt-4 flex gap-2">
            <button onClick={downloadCsv} className="text-xs border hairline px-3 py-1.5 hover:bg-accent">下載 CSV</button>
            <button onClick={copyCsv} className="text-xs border hairline px-3 py-1.5 hover:bg-accent">
              {copied ? "已複製 ✓" : "複製 CSV"}
            </button>
          </div>
        )}

        {err && <p className="mt-6 text-sm text-destructive">{err}</p>}

        {rows === null && !err ? (
          <p className="mt-8 text-sm text-muted-foreground">載入中…</p>
        ) : rows && rows.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">尚無事件。</p>
        ) : rows ? (
          <div className="mt-6 border hairline overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-accent/40 text-muted-foreground">
                <tr>
                  <th className="text-left p-2">時間</th>
                  <th className="text-left p-2">狀態</th>
                  <th className="text-left p-2">HTTP</th>
                  <th className="text-left p-2">事件</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">升級</th>
                  <th className="text-left p-2">原因</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hairline align-top">
                    <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("zh-TW")}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 text-[10px] ${badge(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="p-2">{r.http_status}</td>
                    <td className="p-2">{r.event_type ?? "—"}</td>
                    <td className="p-2 break-all">{r.email ?? "—"}</td>
                    <td className="p-2">
                      {(r.links_upgraded ?? 0) + (r.files_upgraded ?? 0) > 0
                        ? `🔗${r.links_upgraded ?? 0} 📄${r.files_upgraded ?? 0}`
                        : "—"}
                    </td>
                    <td className="p-2 break-all max-w-sm">{r.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
