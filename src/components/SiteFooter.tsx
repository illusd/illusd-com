import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function LegalFooterLinks({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <nav className={`flex items-center justify-center gap-5 ${className}`}>
      <Link to="/privacy" className="hover:text-foreground">{t("footer.privacy")}</Link>
      <Link to="/terms-of-service" className="hover:text-foreground">{t("footer.terms")}</Link>
    </nav>
  );
}

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t hairline mt-12">
      <div className="mx-auto max-w-5xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>{t("footer.copy", { year: new Date().getFullYear() })}</div>
        <LegalFooterLinks />
      </div>
    </footer>
  );
}
