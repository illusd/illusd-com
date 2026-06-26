import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, profile, isCreator } = useAuth();

  const close = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b hairline">
        <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg tracking-wider" onClick={close}>
            illusd
          </Link>
          <button
            aria-label="開啟選單"
            onClick={() => setOpen((v) => !v)}
            className="p-2 -mr-2 text-foreground"
          >
            {open ? <X size={20} strokeWidth={1.25} /> : <Menu size={20} strokeWidth={1.25} />}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 bg-background pt-14 animate-in fade-in duration-150">
          <nav className="mx-auto max-w-5xl px-5 py-10 flex flex-col gap-6 text-xl font-serif">
            <Link to="/" onClick={close} className="border-b hairline pb-3">首頁</Link>
            <Link to="/topic/all" onClick={close} className="border-b hairline pb-3">所有文章</Link>
            <Link to="/short-url" onClick={close} className="border-b hairline pb-3">illurl 短網址</Link>

            {user ? (
              <>
                <div className="border-b hairline pb-3 text-base text-muted-foreground">
                  <div>{profile?.display_name ?? user.email}</div>
                  {isCreator && profile?.creator_id && (
                    <div className="text-xs mt-1">創作者 · {profile.creator_id}</div>
                  )}
                </div>
                {isCreator && (
                  <Link to="/new-article" onClick={close} className="border-b hairline pb-3">
                    + 撰寫文章
                  </Link>
                )}
                <button
                  className="text-left border-b hairline pb-3"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    close();
                  }}
                >
                  登出
                </button>
              </>
            ) : (
              <Link to="/sign-up" onClick={close} className="border-b hairline pb-3">
                註冊 / 登入
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
