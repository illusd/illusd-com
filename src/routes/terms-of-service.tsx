import { createFileRoute, Link } from "@tanstack/react-router";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/terms-of-service")({
  head: () => {
    const title = i18n.t("meta.terms_title");
    const description = i18n.t("meta.terms_description");
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
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link to="/" className="text-xs tracking-widest text-muted-foreground">{t("common.back_home")}</Link>
      <h1 className="font-serif text-3xl mt-6 mb-2">{t("terms.title")}</h1>
      <p className="text-xs text-muted-foreground mb-10">{t("terms.updated")}</p>

      <section className="space-y-4 text-sm leading-loose">
        <p>{t("terms.intro")}</p>

        <h2 className="font-serif text-xl mt-8">{t("terms.s1_title")}</h2>
        <p>{t("terms.s1")}</p>

        <h2 className="font-serif text-xl mt-8">{t("terms.s2_title")}</h2>
        <p>{t("terms.s2a")}</p>
        <p>{t("terms.s2b")}</p>

        <h2 className="font-serif text-xl mt-8">{t("terms.s3_title")}</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t("terms.ban_1")}</li>
          <li>{t("terms.ban_2")}</li>
          <li>{t("terms.ban_3")}</li>
          <li>{t("terms.ban_4")}</li>
        </ul>

        <h2 className="font-serif text-xl mt-8">{t("terms.s4_title")}</h2>
        <p>{t("terms.s4")}</p>

        <h2 className="font-serif text-xl mt-8">{t("terms.s5_title")}</h2>
        <p>{t("terms.s5")}</p>

        <h2 className="font-serif text-xl mt-8">{t("terms.s6_title")}</h2>
        <p>{t("terms.s6")}</p>

        <h2 className="font-serif text-xl mt-8">{t("terms.s7_title")}</h2>
        <p>{t("terms.s7")}</p>

        <h2 className="font-serif text-xl mt-8">{t("terms.s8_title")}</h2>
        <p>{t("terms.s8")}</p>

        <h2 className="font-serif text-xl mt-8">{t("terms.s9_title")}</h2>
        <p>
          {t("terms.contact_prefix")}
          <a href="mailto:lan.2015.se@gmail.com" className="underline">lan.2015.se@gmail.com</a>
          {t("terms.contact_suffix")}
        </p>
      </section>
    </main>
  );
}
