import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { KOFI_EMBED_URL, KOFI_URL, KOFI_USERNAME } from "@/lib/donate";

export const Route = createFileRoute("/donate")({
  head: () => {
    const title = "贊助創作者 — illusd";
    const description = "透過 Ko-fi 支持 illusd 的創作者，每一份心意都讓我們走得更遠。";
    const url = "https://illusd.com/donate";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: DonatePage,
});

function DonatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      try {
        const origin = e.origin || "";
        if (!/ko-?fi\.com$/.test(new URL(origin).hostname)) return;
        const data = e.data;
        const text = typeof data === "string" ? data : JSON.stringify(data ?? "");
        if (/thank|donation|tip[_ -]?received|payment[_ -]?success/i.test(text)) {
          navigate({ to: "/thanks" });
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);

  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      <section className="mx-auto max-w-3xl px-5 pt-12 pb-10">
        <Link to="/" className="text-xs tracking-widest text-muted-foreground">{t("common.back_home")}</Link>
        <h1 className="font-serif text-3xl md:text-4xl mt-6">{t("donate_page.title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{t("donate_page.desc")}</p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-24">
        <div className="border hairline overflow-hidden bg-white">
          <iframe
            id="kofiframe"
            src={KOFI_EMBED_URL}
            title={`Support ${KOFI_USERNAME} on Ko-fi`}
            style={{ border: "none", width: "100%", padding: "4px", background: "#fff" }}
            height={712}
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          {t("donate_page.fallback")}
          <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="underline ml-1">
            {t("donate_page.open_kofi")}
          </a>
        </p>
      </section>
    </main>
  );
}
