import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Coffee } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PushSubscribeButton } from "./PushSubscribeButton";

import { DONATE_PATH } from "@/lib/donate";

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
              aria-label={t("nav.menu")}
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
          <nav className="mx-auto max-w-5xl px-5 py-8 flex flex-col gap-5 text-lg font-serif">
            <Link to="/" onClick={close} className="border-b hairline pb-3">{t("nav.home")}</Link>

            <div className="text-xs tracking-widest text-muted-foreground pt-2 font-sans">{t("nav.section_services")}</div>
            {user && (
              <Link to="/my/illurl" onClick={close} className="border-b hairline pb-3">{t("nav.my_illurl")}</Link>
            )}
            <Link to="/feedback" onClick={close} className="border-b hairline pb-3">{t("nav.feedback")}</Link>

            <div className="text-xs tracking-widest text-muted-foreground pt-2 font-sans">{t("nav.section_main")}</div>
            <Link to="/topic/all" onClick={close} className="border-b hairline pb-3">{t("nav.all_articles")}</Link>
            <Link to="/short-url" onClick={close} className="border-b hairline pb-3">{t("nav.short_url")}</Link>
            <Link to="/poost" onClick={close} className="border-b hairline pb-3">{t("nav.poost")}</Link>
            {user && (
              <Link to="/message" onClick={close} className="border-b hairline pb-3">{t("nav.message")}</Link>
            )}

            <Link
              to={DONATE_PATH}
              onClick={close}
              className="border-b hairline pb-3 flex items-center gap-2"
            >
              <Coffee size={18} strokeWidth={1.25} /> {t("nav.donate")}
            </Link>

            {isCreator && (
              <>
                <div className="text-xs tracking-widest text-muted-foreground pt-2 font-sans">{t("nav.section_creator")}</div>
                <Link to="/new-article" onClick={close} className="border-b hairline pb-3">{t("nav.write")}</Link>
                <Link to="/new-poost" onClick={close} className="border-b hairline pb-3">{t("nav.new_poost")}</Link>
                <Link to="/rednote/manage" onClick={close} className="border-b hairline pb-3">{t("nav.rednote_manage")}</Link>
                <Link to="/admin/webhooks" onClick={close} className="border-b hairline pb-3 text-sm text-muted-foreground">{t("nav.webhook_events")}</Link>
              </>
            )}

            <div className="border-b hairline pb-3 flex items-center justify-between text-sm font-sans pt-2">
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
