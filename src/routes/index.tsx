import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard, type ArticleCardData } from "@/components/ArticleCard";
import { AnnouncementMarquee } from "@/components/AnnouncementMarquee";

export const Route = createFileRoute("/")({
  head: () => {
    const title = i18n.t("meta.home_title");
    const description = i18n.t("meta.home_description");
    const url = "https://illusd.com/";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: Index,
});

function Index() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<ArticleCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("articles")
      .select("id, raw_title, topic_title, episode_num, episode_title, cover_url, created_at")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setArticles((data ?? []) as ArticleCardData[]);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      <AnnouncementMarquee />

      <section className="mx-auto max-w-3xl px-5 pt-16 pb-16 md:pt-20 md:pb-20">
        <p className="text-xs tracking-[0.4em] text-muted-foreground mb-6">ILLUSD · ESTD 2025</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-tight tracking-wide">
          {t("home.site_title")}
        </h1>
        <p className="mt-8 font-serif text-xl md:text-2xl leading-[1.5]">
          {t("home.tagline_a")}<br className="hidden md:block" />
          {t("home.tagline_b")}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">{t("home.subline")}</p>
        <div className="mt-10 h-px w-16 bg-foreground/40" />

        <section
          aria-labelledby="about-illusd"
          className="mt-12 border hairline p-6 text-sm leading-relaxed font-sans"
        >
          <h2 id="about-illusd" className="font-serif text-lg mb-3">{t("home.about_title")}</h2>
          <p className="text-foreground/80">{t("home.about_body")}</p>
        </section>

        <aside
          aria-label={t("home.google_notice_label")}
          className="mt-6 border hairline p-5 text-sm leading-relaxed text-foreground/80 font-sans"
        >
          {t("home.google_notice")}
        </aside>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="flex items-baseline justify-between border-b hairline pb-3 mb-8">
          <h2 className="font-serif text-xl">{t("home.featured")}</h2>
          <a href="/topic/all" className="text-xs tracking-widest text-muted-foreground hover:text-foreground">
            {t("home.all")} →
          </a>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("home.loading")}</p>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("home.empty")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
            {articles.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
