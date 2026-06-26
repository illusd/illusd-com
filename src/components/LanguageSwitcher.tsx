import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { htmlLangFor, SUPPORTED_LANGUAGES } from "@/i18n";

const LABELS: Record<string, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語",
};

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = htmlLangFor(i18n.language);
    }
  }, [i18n.language]);

  const change = (lng: string) => {
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem("illusd_lang", lng);
    } catch {
      // ignore
    }
  };

  return (
    <label className={`flex items-center gap-2 ${compact ? "text-sm" : ""}`}>
      <Globe size={16} strokeWidth={1.25} aria-label={t("nav.language")} />
      <select
        value={(i18n.language || "zh").split("-")[0]}
        onChange={(e) => change(e.target.value)}
        className="bg-transparent border-b hairline py-1 pr-1 text-sm focus:outline-none focus:border-foreground"
      >
        {SUPPORTED_LANGUAGES.map((lng) => (
          <option key={lng} value={lng}>
            {LABELS[lng] ?? lng}
          </option>
        ))}
      </select>
    </label>
  );
}
