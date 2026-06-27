import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { FullscreenStateOverlay } from "@/components/animations/AppleStateAnimation";

export const Route = createFileRoute("/thanks")({
  head: () => ({
    meta: [
      { title: i18n.t("meta.thanks_title") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThanksPage,
});

function ThanksPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  useEffect(() => {
    const tm = setTimeout(() => navigate({ to: "/" }), 3000);
    return () => clearTimeout(tm);
  }, [navigate]);
  return (
    <FullscreenStateOverlay
      variant="success"
      title={t("thanks.title")}
      subtitle={t("thanks.subtitle")}
    />
  );
}
