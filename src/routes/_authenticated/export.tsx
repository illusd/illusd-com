import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Database } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  EXPORT_TABLES,
  exportTableChunk,
  getExportTableCounts,
} from "@/lib/dbExport.functions";

export const Route = createFileRoute("/_authenticated/export")({
  head: () => ({
    meta: [
      { title: "資料匯出 — illusd.com" },
      { name: "description", content: "創作者專用：把所有資料表匯出成 JSON 或 CSV，方便搬遷到自己的資料庫。" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "資料匯出 — illusd.com" },
      { property: "og:description", content: "創作者專用的資料表匯出工具。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExportPage,
});

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

interface Info {
  table: string;
  count: number;
  error: string | null;
}

function ExportPage() {
  const { isCreator, loading } = useAuth();
  const loadCounts = useServerFn(getExportTableCounts);
  const fetchChunk = useServerFn(exportTableChunk);

  const [info, setInfo] = useState<Info[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    if (!isCreator) return;
    loadCounts({})
      .then((r) => setInfo(r.tables))
      .catch((e) => toast.error((e as Error).message));
  }, [isCreator]);

  const fetchAll = async (table: string): Promise<Record<string, unknown>[]> => {
    const all: Record<string, unknown>[] = [];
    let offset: number | null = 0;
    while (offset !== null) {
      const res = await fetchChunk({ data: { table, offset } });
      all.push(...(JSON.parse(res.rowsJson) as Record<string, unknown>[]));
      setProgress(`${table}：已取得 ${all.length} 筆`);
      offset = res.nextOffset;
    }
    return all;
  };

  const exportOne = async (table: string, format: "json" | "csv") => {
    setBusy(`${table}-${format}`);
    try {
      const rows = await fetchAll(table);
      if (format === "json") {
        download(`${table}.json`, JSON.stringify(rows, null, 2), "application/json");
      } else {
        download(`${table}.csv`, toCsv(rows), "text/csv");
      }
      toast.success(`${table}：已匯出 ${rows.length} 筆`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      setProgress("");
    }
  };

  const exportAllJson = async () => {
    setBusy("all-json");
    try {
      const dump: Record<string, Record<string, unknown>[]> = {};
      for (const table of EXPORT_TABLES) {
        try {
          dump[table] = await fetchAll(table);
        } catch {
          dump[table] = [];
        }
      }
      const stamp = new Date().toISOString().slice(0, 10);
      download(
        `illusd-database-${stamp}.json`,
        JSON.stringify({ exported_at: new Date().toISOString(), tables: dump }, null, 2),
        "application/json",
      );
      toast.success("已匯出完整資料庫 JSON");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      setProgress("");
    }
  };

  if (loading) {
    return <main className="mx-auto max-w-3xl px-5 py-24 text-sm text-muted-foreground">載入中…</main>;
  }

  if (!isCreator) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-serif text-2xl">只有創作者可以匯出資料</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-serif text-3xl flex items-center gap-2">
        <Database size={22} strokeWidth={1.25} /> 資料匯出
      </h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        把資料表下載成 JSON 或 CSV，之後在你自己的資料庫用同樣的欄位匯入即可。
        建議先下載「完整資料庫 JSON」保存一份，再依需要下載單表 CSV。
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={exportAllJson}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-3 text-sm tracking-wider hover:opacity-90 transition disabled:opacity-50"
        >
          <Download size={14} strokeWidth={1.5} /> 下載完整資料庫 JSON
        </button>
        {progress && <span className="text-xs text-muted-foreground">{progress}</span>}
      </div>

      <ul className="mt-12 divide-y hairline border-t hairline">
        {(info ?? EXPORT_TABLES.map((t) => ({ table: t, count: -1, error: null }))).map((row) => (
          <li key={row.table} className="py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-serif">{row.table}</div>
              <div className="text-[11px] text-muted-foreground">
                {row.error ? row.error : row.count < 0 ? "計算中…" : `${row.count} 筆`}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => exportOne(row.table, "json")}
                disabled={busy !== null}
                className="border hairline px-3 py-1.5 text-xs hover:bg-accent transition disabled:opacity-50"
              >
                JSON
              </button>
              <button
                onClick={() => exportOne(row.table, "csv")}
                disabled={busy !== null}
                className="border hairline px-3 py-1.5 text-xs hover:bg-accent transition disabled:opacity-50"
              >
                CSV
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-xs text-muted-foreground leading-relaxed">
        注意：儲存空間的檔案（文章封面、illurl 檔案、影片）不在此匯出範圍內，需要另外從儲存空間下載。
      </p>
    </main>
  );
}
