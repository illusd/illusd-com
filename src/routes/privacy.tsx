import { createFileRoute, Link } from "@tanstack/react-router";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/privacy")({
  head: () => {
    const title = i18n.t("meta.privacy_title");
    const description = i18n.t("meta.privacy_description");
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
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link to="/" className="text-xs tracking-widest text-muted-foreground">{t("common.back_home")}</Link>
      <h1 className="font-serif text-3xl mt-6 mb-2">{t("privacy.title")}</h1>
      <p className="text-xs text-muted-foreground mb-10">{t("privacy.updated")}</p>

      <section className="space-y-4 text-sm leading-loose">
        <p>{t("privacy.intro")}</p>

        <h2 className="font-serif text-xl mt-8">{t("privacy.s1_title")}</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-medium">{t("privacy.account_label")}</span>{t("privacy.account")}</li>
          <li><span className="font-medium">{t("privacy.content_label")}</span>{t("privacy.content")}</li>
          <li><span className="font-medium">{t("privacy.usage_label")}</span>{t("privacy.usage")}</li>
          <li><span className="font-medium">{t("privacy.payment_label")}</span>{t("privacy.payment")}</li>
        </ul>

        <h2 className="font-serif text-xl mt-8">{t("privacy.s2_title")}</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t("privacy.use_1")}</li>
          <li>{t("privacy.use_2")}</li>
          <li>{t("privacy.use_3")}</li>
          <li>{t("privacy.use_4")}</li>
        </ul>

        <h2 className="font-serif text-xl mt-8">{t("privacy.s3_title")}</h2>
        <p>{t("privacy.third_party")}</p>

        <h2 className="font-serif text-xl mt-8">{t("privacy.s4_title")}</h2>
        <p>{t("privacy.cookies")}</p>

        <h2 className="font-serif text-xl mt-8">{t("privacy.s5_title")}</h2>
        <p>
          {t("privacy.rights_prefix")}
          <a href="mailto:lan.2015.se@gmail.com" className="underline">lan.2015.se@gmail.com</a>
          {t("privacy.rights_suffix")}
        </p>

        <h2 className="font-serif text-xl mt-8">{t("privacy.s6_title")}</h2>
        <p>{t("privacy.retention")}</p>

        <h2 className="font-serif text-xl mt-8">{t("privacy.s7_title")}</h2>
        <p>{t("privacy.children")}</p>

        <h2 className="font-serif text-xl mt-8">{t("privacy.s8_title")}</h2>
        <p>{t("privacy.updates")}</p>
      </section>
    </main>
  );
}
