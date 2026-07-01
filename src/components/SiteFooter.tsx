import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { useTranslation } from "react-i18next";
import banbanAsset from "@/assets/banban.jpg.asset.json";
import rednoteAsset from "@/assets/rednote.png.asset.json";

export function LegalFooterLinks({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <nav className={`flex items-center justify-center gap-5 ${className}`}>
      <Link to="/privacy" className="hover:text-foreground">{t("footer.privacy")}</Link>
      <Link to="/terms-of-service" className="hover:text-foreground">{t("footer.terms")}</Link>
    </nav>
  );
}

const iconBtn = "opacity-75 hover:opacity-100 transition inline-flex items-center justify-center h-8 w-8 rounded-md border hairline bg-background";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t hairline mt-12">
      <div className="mx-auto max-w-5xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>{t("footer.copy", { year: new Date().getFullYear() })}</div>
        <div className="flex items-center gap-3">
          <a href="https://threads.com/@ferz.z.z.z.z" target="_blank" rel="noreferrer" aria-label="Threads" className={iconBtn}>
            <span className="font-bold text-sm">@</span>
          </a>
          <a href="https://github.com/lan2015se-collab" target="_blank" rel="noreferrer" aria-label="GitHub" className={iconBtn}>
            <Github size={16} strokeWidth={1.5} />
          </a>
          <a href="https://ban-ban.net/u/illusd" target="_blank" rel="noreferrer" aria-label="Banban" className={iconBtn + " overflow-hidden p-0"}>
            <img src={banbanAsset.url} alt="Banban" className="h-full w-full object-cover" />
          </a>
          <a href="https://xhslink.com/m/4CLduv9Pzhv" target="_blank" rel="noreferrer" aria-label="小红书" className={iconBtn + " overflow-hidden p-1 bg-white"}>
            <img src={rednoteAsset.url} alt="小红书" className="h-full w-full object-contain" />
          </a>
        </div>
        <LegalFooterLinks />
      </div>
    </footer>
  );
}
