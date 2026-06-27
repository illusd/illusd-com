import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zh from "./locales/zh.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

export const SUPPORTED_LANGUAGES = ["zh", "en", "ja"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        zh: { translation: zh },
        en: { translation: en },
        ja: { translation: ja },
      },
      fallbackLng: "zh",
      supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
}

export function normalizeLanguage(lng: string | null | undefined): SupportedLanguage {
  const base = (lng || "zh").split("-")[0];
  return SUPPORTED_LANGUAGES.includes(base as SupportedLanguage) ? (base as SupportedLanguage) : "zh";
}

export function htmlLangFor(lng: string): string {
  if (lng.startsWith("zh")) return "zh-Hant";
  if (lng.startsWith("ja")) return "ja";
  return "en";
}

export default i18n;
