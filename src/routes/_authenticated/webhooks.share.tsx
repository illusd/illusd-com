import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { lookupKofiByEmail, type KofiOrder } from "@/lib/kofi.functions";

export const Route = createFileRoute("/_authenticated/webhooks/share")({
  head: () => ({
    meta: [
      { title: "Ko-fi 用戶查詢 · illusd.com" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebhookShare,
});

interface Member {
  email: string;
  kofi_transaction_id: string | null;
  tier_name: string | null;
  is_subscription: boolean;
  last_donation_at: string | null;
  total_amount: number | string | null;
  created_at: string;
  updated_at: string;
}

function WebhookShare() {
  const { isCreator, loading } = useAuth();
  const lookup = useServerFn(lookupKofiByEmail);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [orders, setOrders] = useState<KofiOrder[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (loading) return <div className="p-10 text-sm text-muted-foreground">載入中…</div>;
  if (!isCreator) return <div className="p-10 text-sm text-destructive">僅限創作者瀏覽</div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMember(null);
    setOrders(null);
    try {
      const res = await lookup({ data: { email } });
      setMember(res.member as Member | null);
      setOrders(res.orders);
      if (!res.member && res.orders.length === 0) toast.message("查無資料");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <Link to="/admin/webhooks" className="text-xs tracking-widest text-muted-foreground">← Webhook 事件</Link>
        <h1 className="font-serif text-3xl mt-4">Ko-fi 用戶查詢</h1>
        <p className="text-sm text-muted-foreground mt-2">輸入 Email 查詢 Ko-fi 會員與訂單資料。</p>

        <form onSubmit={submit} className="mt-6 flex gap-2">
          <input
            type="email"
            required
            placeholder="supporter@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 border hairline px-3 py-2 text-sm bg-background"
          />
          <button disabled={busy} className="px-5 py-2 bg-foreground text-background text-sm tracking-wider disabled:opacity-50">
            {busy ? "查詢中…" : "查詢"}
          </button>
        </form>

        {err && <p className="mt-6 text-sm text-destructive">{err}</p>}

        {member && (
          <section className="mt-8 border hairline p-5">
            <h2 className="font-serif text-xl">會員資料</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Email</dt><dd className="break-all">{member.email}</dd>
              <dt className="text-muted-foreground">會員等級</dt><dd>{member.tier_name ?? "—"}</dd>
              <dt className="text-muted-foreground">訂閱中</dt><dd>{member.is_subscription ? "是" : "否"}</dd>
              <dt className="text-muted-foreground">累計贊助</dt><dd>{member.total_amount ?? 0}</dd>
              <dt className="text-muted-foreground">最後贊助</dt><dd>{member.last_donation_at ? new Date(member.last_donation_at).toLocaleString("zh-TW") : "—"}</dd>
              <dt className="text-muted-foreground">最後交易 ID</dt><dd className="break-all">{member.kofi_transaction_id ?? "—"}</dd>
              <dt className="text-muted-foreground">首次紀錄</dt><dd>{new Date(member.created_at).toLocaleString("zh-TW")}</dd>
              <dt className="text-muted-foreground">更新時間</dt><dd>{new Date(member.updated_at).toLocaleString("zh-TW")}</dd>
            </dl>
          </section>
        )}

        {orders && orders.length > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-xl">訂單紀錄（{orders.length}）</h2>
            <div className="mt-4 border hairline overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-accent/40 text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">時間</th>
                    <th className="text-left p-2">類型</th>
                    <th className="text-left p-2">金額</th>
                    <th className="text-left p-2">等級</th>
                    <th className="text-left p-2">訂閱</th>
                    <th className="text-left p-2">姓名</th>
                    <th className="text-left p-2">Message ID</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.message_id ?? Math.random()} className="border-t hairline align-top">
                      <td className="p-2 whitespace-nowrap">{o.timestamp ? new Date(o.timestamp).toLocaleString("zh-TW") : "—"}</td>
                      <td className="p-2">{o.type ?? "—"}</td>
                      <td className="p-2 whitespace-nowrap">{o.amount ?? "—"} {o.currency ?? ""}</td>
                      <td className="p-2">{o.tier_name ?? "—"}</td>
                      <td className="p-2">{o.is_subscription ? "是" : "否"}</td>
                      <td className="p-2">{o.from_name ?? "—"}</td>
                      <td className="p-2 break-all">{o.message_id ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
