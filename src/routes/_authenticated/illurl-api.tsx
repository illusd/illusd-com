import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listApiKeys, createApiKey, deleteApiKey } from "@/lib/illurlApiKeys.functions";

export const Route = createFileRoute("/_authenticated/illurl-api")({
  head: () => ({
    meta: [
      { title: "illurl API — 無 captcha 短網址 API" },
      { name: "description", content: "生成 API Key，透過 HTTP 呼叫產生 illusd.com 短網址，無需 captcha。" },
    ],
  }),
  component: Page,
});

type KeyRow = { id: string; key: string; name: string | null; created_at: string; last_used_at: string | null };

function Page() {
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const del = useServerFn(deleteApiKey);
  const [rows, setRows] = useState<KeyRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const reload = async () => {
    try { setRows((await list()) as KeyRow[]); } catch (e) { setErr((e as Error).message); }
  };
  useEffect(() => { reload(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const { key } = await create({ data: { name: name || undefined } });
      setJustCreated(key);
      setName("");
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("確定刪除？此 API Key 將立即失效。")) return;
    try { await del({ data: { id } }); await reload(); }
    catch (e) { setErr((e as Error).message); }
  };

  const endpoint = "https://illusd.com/api/public/illurl/shorten";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">illurl API</h1>
        <p className="text-muted-foreground text-sm">
          用 API Key 產生 illusd.com 短網址，無需 captcha。適合自動化/程式呼叫。
          你在 <Link to="/short-url" className="underline">/short-url</Link> 的會員/創作者權限（永久連結）會自動套用。
        </p>
      </div>

      {/* Docs */}
      <section className="space-y-3 text-sm">
        <h2 className="text-lg font-semibold">如何使用</h2>
        <div className="rounded border p-3 bg-muted/30 space-y-2">
          <div><b>Endpoint</b>: <code>POST {endpoint}</code></div>
          <div><b>認證</b>: HTTP header <code>X-API-Key: &lt;你的 key&gt;</code>（或 <code>Authorization: Bearer &lt;key&gt;</code>）</div>
          <div><b>Body (JSON)</b>: <code>{`{ "url": "https://example.com/long-path" }`}</code></div>
          <div><b>回傳 (JSON)</b>:</div>
          <pre className="text-xs bg-background p-2 rounded overflow-x-auto">{`{
  "url": "https://illusd.com/AB12C",
  "code": "AB12C",
  "permanent": false,
  "expires_at": "2027-07-09T02:18:05.000Z"
}`}</pre>
          <div><b>錯誤</b>: <code>400</code> 網址無效、<code>401</code> API Key 缺失或無效、<code>500</code> 伺服器錯誤，body 為 <code>{`{ "error": "..." }`}</code>。</div>
        </div>

        <h3 className="font-semibold mt-4">範例：curl</h3>
        <pre className="text-xs bg-muted/30 border rounded p-2 overflow-x-auto">{`curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: illurl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -d '{"url":"https://example.com/long-path"}'`}</pre>

        <h3 className="font-semibold mt-4">範例：JavaScript (fetch)</h3>
        <pre className="text-xs bg-muted/30 border rounded p-2 overflow-x-auto">{`const r = await fetch("${endpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "illurl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  body: JSON.stringify({ url: "https://example.com/long-path" }),
});
const data = await r.json();
console.log(data.url);`}</pre>

        <h3 className="font-semibold mt-4">範例：Python</h3>
        <pre className="text-xs bg-muted/30 border rounded p-2 overflow-x-auto">{`import requests
r = requests.post(
    "${endpoint}",
    headers={"X-API-Key": "illurl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"},
    json={"url": "https://example.com/long-path"},
)
print(r.json()["url"])`}</pre>

        <h3 className="font-semibold mt-4">縮檔案（貼檔案網址）</h3>
        <div className="rounded border p-3 bg-muted/30 space-y-2">
          <div>本 API 不接受檔案上傳，只接受<b>檔案的直接下載網址</b>。把該網址放進 <code>url</code> 欄位即可，回傳格式與縮一般網址相同。</div>
          <pre className="text-xs bg-background p-2 rounded overflow-x-auto">{`curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: illurl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -d '{"url":"https://cdn.example.com/path/report.pdf"}'`}</pre>
          <div>回傳：</div>
          <pre className="text-xs bg-background p-2 rounded overflow-x-auto">{`{
  "url": "https://illusd.com/AB12C",
  "code": "AB12C",
  "permanent": false,
  "expires_at": "2027-07-09T02:18:05.000Z"
}`}</pre>
          <div className="text-xs text-muted-foreground">短網址會 302 轉址到你提供的檔案網址。權限規則（會員/創作者永久連結）與一般網址相同。</div>
        </div>
      </section>

      {/* Keys */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">你的 API Keys</h2>
        <form onSubmit={onCreate} className="flex gap-2 items-center">
          <input
            className="border rounded px-2 py-1 text-sm flex-1"
            placeholder="名稱（選填，方便記憶）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
          />
          <button type="submit" disabled={busy} className="px-3 py-1 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50">
            {busy ? "建立中..." : "建立新 API Key"}
          </button>
        </form>

        {justCreated && (
          <div className="border border-green-500/40 bg-green-500/10 rounded p-3 text-sm">
            <div className="font-medium mb-1">新的 API Key（僅顯示一次，請立刻複製保存）</div>
            <code className="block break-all">{justCreated}</code>
            <button
              className="mt-2 text-xs underline"
              onClick={() => { navigator.clipboard.writeText(justCreated); }}
            >複製</button>
            <button className="ml-3 text-xs underline" onClick={() => setJustCreated(null)}>關閉</button>
          </div>
        )}

        {err && <div className="text-sm text-red-500">錯誤：{err}</div>}

        <div className="border rounded divide-y">
          {rows.length === 0 && <div className="p-3 text-sm text-muted-foreground">尚無 API Key。</div>}
          {rows.map((r) => (
            <div key={r.id} className="p-3 flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.name || "(未命名)"}</div>
                <code className="text-xs text-muted-foreground break-all">
                  {r.key.slice(0, 12)}…{r.key.slice(-6)}
                </code>
                <div className="text-xs text-muted-foreground">
                  建立：{new Date(r.created_at).toLocaleString()}　最後使用：{r.last_used_at ? new Date(r.last_used_at).toLocaleString() : "—"}
                </div>
              </div>
              <button className="text-xs text-red-500 underline" onClick={() => onDelete(r.id)}>刪除</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
