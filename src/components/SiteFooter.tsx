import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import threadsIcon from "@/assets/threads-icon.jpg";
import githubLogo from "@/assets/github-logo.png";

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
        <div className="flex items-center gap-4">
          <a href="https://threads.com/@ferz.z.z.z.z" target="_blank" rel="noreferrer" aria-label="Threads" className="opacity-75 hover:opacity-100 transition">
            <img src={threadsIcon} alt="Threads" className="h-7 w-7 object-cover rounded-md border hairline" />
          </a>
          <a href="https://github.com/lan2015se-collab" target="_blank" rel="noreferrer" aria-label="GitHub" className="opacity-75 hover:opacity-100 transition">
            <img src={githubLogo} alt="GitHub" className="h-7 w-12 object-contain" />
          </a>
        </div>
        <LegalFooterLinks />
      </div>
    </footer>
  );
}
