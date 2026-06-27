import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Coffee } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PushSubscribeButton } from "./PushSubscribeButton";

const DONATE_URL = "https://pay.illusd.com/products/vibecoding";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, profile, isCreator } = useAuth();
  const { t } = useTranslation();

  const close = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b hairline">
        <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg tracking-wider" onClick={close}>
            illusd
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <PushSubscribeButton />
            </div>
            <button
              aria-label="menu"
              onClick={() => setOpen((v) => !v)}
              className="p-2 -mr-2 text-foreground"
            >
              {open ? <X size={20} strokeWidth={1.25} /> : <Menu size={20} strokeWidth={1.25} />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 bg-background pt-14 animate-in fade-in duration-150 overflow-y-auto">
          <nav className="mx-auto max-w-5xl px-5 py-10 flex flex-col gap-6 text-xl font-serif">
            <Link to="/" onClick={close} className="border-b hairline pb-3">{t("nav.home")}</Link>
            <Link to="/topic/all" onClick={close} className="border-b hairline pb-3">{t("nav.all_articles")}</Link>
            <Link to="/short-url" onClick={close} className="border-b hairline pb-3">{t("nav.short_url")}</Link>
            {user && (
              <Link to="/message" onClick={close} className="border-b hairline pb-3">{t("nav.message")}</Link>
            )}
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="border-b hairline pb-3 flex items-center gap-2"
            >
              <Coffee size={18} strokeWidth={1.25} /> {t("nav.donate")}
            </a>

            <div className="border-b hairline pb-3 flex items-center justify-between text-sm font-sans">
              <LanguageSwitcher />
              <PushSubscribeButton />
            </div>

            {user ? (
              <>
                <div className="border-b hairline pb-3 text-base text-muted-foreground font-sans">
                  <div>{profile?.display_name ?? user.email}</div>
                  {isCreator && profile?.creator_id && (
                    <div className="text-xs mt-1">{t("nav.creator")} · {profile.creator_id}</div>
                  )}
                </div>
                {isCreator && (
                  <Link to="/new-article" onClick={close} className="border-b hairline pb-3">
                    {t("nav.write")}
                  </Link>
                )}
                <button
                  className="text-left border-b hairline pb-3"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    close();
                  }}
                >
                  {t("nav.sign_out")}
                </button>
              </>
            ) : (
              <Link to="/sign-up" onClick={close} className="border-b hairline pb-3">
                {t("nav.sign_in")}
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
