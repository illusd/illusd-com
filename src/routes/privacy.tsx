import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => {
    const title = "隱私權政策 — illusd";
    const description = "illusd 如何蒐集、使用、保護您的個人資料與使用紀錄。";
    const url = "https://illusd.com/privacy";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link to="/" className="text-xs tracking-widest text-muted-foreground">← 回首頁</Link>
      <h1 className="font-serif text-3xl mt-6 mb-2">隱私權政策</h1>
      <p className="text-xs text-muted-foreground mb-10">最後更新：2026 年 6 月 26 日</p>

      <section className="space-y-4 text-sm leading-loose">
        <p>
          本頁由 illusd 站方維護，說明我們如何蒐集、使用與保護您的個人資料。使用本服務即表示您同意以下做法。
        </p>

        <h2 className="font-serif text-xl mt-8">1. 我們蒐集的資料</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">帳號資料：</span>電子郵件、顯示名稱、頭像（若以 Google 登入則一併取得 Google 公開資料）。</li>
          <li><span className="font-medium">內容資料：</span>您張貼的文章、評論、按讚、上傳檔案及短網址目標。</li>
          <li><span className="font-medium">使用紀錄：</span>IP、瀏覽器資訊、操作時間、人機驗證紀錄，用於風險控管。</li>
          <li><span className="font-medium">付款資料：</span>當您透過 Shopify 贊助時，金流資訊由 Shopify 處理，本站僅取得訂單成立的回呼通知，不保留卡號。</li>
        </ul>

        <h2 className="font-serif text-xl mt-8">2. 我們如何使用資料</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>提供與維護本服務的核心功能。</li>
          <li>寄送系統信件（驗證、密碼重設、贊助通知等）。</li>
          <li>偵測異常流量、阻擋自動化攻擊。</li>
          <li>改善服務品質與內容推薦。</li>
        </ul>

        <h2 className="font-serif text-xl mt-8">3. 第三方服務</h2>
        <p>
          本服務目前使用：Supabase（資料庫與身份驗證）、Cloudflare（網域與防護）、Google（OAuth 登入）、Shopify（金流）、Lovable（部署）。各家服務皆有其獨立的隱私權政策，請另行參閱。
        </p>

        <h2 className="font-serif text-xl mt-8">4. Cookie 與本機儲存</h2>
        <p>
          我們使用必要的本機儲存（localStorage）以維持登入狀態。未經您主動操作不會植入任何廣告追蹤 Cookie。
        </p>

        <h2 className="font-serif text-xl mt-8">5. 您的權利</h2>
        <p>
          您可隨時要求查閱、更正或刪除個人資料。請來信 <a href="mailto:lan.2015.se@gmail.com" className="underline">lan.2015.se@gmail.com</a>，我們會於合理期間內回覆。
        </p>

        <h2 className="font-serif text-xl mt-8">6. 資料保存期間</h2>
        <p>
          帳號資料保存至您要求刪除為止；系統日誌通常保留 90 日；違規記錄則保留較長期間以避免重複違規。
        </p>

        <h2 className="font-serif text-xl mt-8">7. 兒童隱私</h2>
        <p>
          本服務不主動蒐集未滿 13 歲兒童的個人資料。若得知有此情形，將儘速刪除相關資料。
        </p>

        <h2 className="font-serif text-xl mt-8">8. 政策更新</h2>
        <p>
          本政策若有修訂，將於本頁公告並更新「最後更新」日期。重大變更會另以站內通知或信件告知。
        </p>
      </section>
    </main>
  );
}
