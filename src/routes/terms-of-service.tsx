import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms-of-service")({
  head: () => {
    const title = "服務條款 — illusd";
    const description = "illusd 與 illurl 服務的使用條款、責任範圍與帳號規範。";
    const url = "https://illusd.com/terms-of-service";
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
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link to="/" className="text-xs tracking-widest text-muted-foreground">← 回首頁</Link>
      <h1 className="font-serif text-3xl mt-6 mb-2">服務條款</h1>
      <p className="text-xs text-muted-foreground mb-10">最後更新：2026 年 6 月 26 日</p>

      <section className="space-y-4 text-sm leading-loose">
        <p>
          歡迎使用 illusd.com 與其相關服務（包含 illurl 短網址／檔案分享、創作者贊助、文章評論等，以下統稱「本服務」）。當您使用本服務即表示您已閱讀、瞭解並同意接受以下條款。
        </p>

        <h2 className="font-serif text-xl mt-8">1. 帳號與資格</h2>
        <p>
          您必須年滿 13 歲（未滿須得到法定代理人同意）才能註冊。註冊時應提供真實正確的資料，並負責維護帳號安全。創作者身份僅限被預先列入名單者；其他使用者僅能以一般讀者身份使用。
        </p>

        <h2 className="font-serif text-xl mt-8">2. 使用者內容</h2>
        <p>
          您張貼的文章、留言、檔案、短網址目標等內容，所有權與責任皆屬於您本人。您須保證未侵犯任何第三方權利，包含但不限於著作權、商標、隱私權與肖像權。
        </p>
        <p>
          您授予 illusd 一份非專屬、免授權金、可全球使用、可再授權的權利，得為提供與推廣本服務之目的儲存、重製、修改格式及公開傳輸您張貼的內容。
        </p>

        <h2 className="font-serif text-xl mt-8">3. 禁止行為</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>散佈違法、色情、暴力、歧視、騷擾、誹謗或詐騙資訊。</li>
          <li>上傳惡意程式、釣魚連結或濫用 illurl 服務佔用儲存空間。</li>
          <li>未經授權存取系統、繞過人機驗證、進行壓力測試或自動化爬取。</li>
          <li>冒用他人身份、創作者標籤或盜用他人作品。</li>
        </ul>

        <h2 className="font-serif text-xl mt-8">4. illurl 服務細則</h2>
        <p>
          短網址與檔案連結為公開可存取（任何持有連結者皆能讀取／下載）。檔案單檔上限 200 MB；本服務保留視情況刪除違規內容、限制速率或終止服務的權利。
        </p>

        <h2 className="font-serif text-xl mt-8">5. 贊助與付款</h2>
        <p>
          創作者贊助透過 ECPay 綠界金流處理。付款、退款、爭議皆依 ECPay 與信用卡發卡機構之規範辦理；illusd 不直接保管款項，亦不擔保特定創作者必然提供任何回饋。付款成功後將自動導回 illusd.com/thanks。
        </p>

        <h2 className="font-serif text-xl mt-8">6. 服務變更與終止</h2>
        <p>
          本服務保留隨時新增、修改、暫停或終止任何功能之權利，且無須事先通知。若您違反本條款，我們得逕行停權或刪除相關內容。
        </p>

        <h2 className="font-serif text-xl mt-8">7. 免責聲明</h2>
        <p>
          本服務依「現狀」提供，不擔保連續性、可用性或內容正確性。對於任何因使用或無法使用本服務所致之間接、附隨、衍生性損害，於法律允許範圍內，illusd 概不負責。
        </p>

        <h2 className="font-serif text-xl mt-8">8. 準據法</h2>
        <p>
          本條款之解釋與適用以中華民國法律為準據法，如有爭議，雙方合意以臺灣臺北地方法院為第一審管轄法院。
        </p>

        <h2 className="font-serif text-xl mt-8">9. 聯絡</h2>
        <p>
          相關問題請來信 <a href="mailto:lan.2015.se@gmail.com" className="underline">lan.2015.se@gmail.com</a>。
        </p>
      </section>
    </main>
  );
}
