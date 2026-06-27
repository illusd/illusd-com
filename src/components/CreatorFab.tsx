import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, FileText, Megaphone, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

export function CreatorFab() {
  const { isCreator } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!isCreator) return null;

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Link
            to="/new-article"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 bg-background border hairline px-4 py-2 text-sm shadow hover:bg-accent transition"
          >
            <FileText size={14} strokeWidth={1.5} /> {t("nav.new_article")}
          </Link>
          <Link
            to="/new-announcement"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 bg-background border hairline px-4 py-2 text-sm shadow hover:bg-accent transition"
          >
            <Megaphone size={14} strokeWidth={1.5} /> {t("nav.new_announcement")}
          </Link>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "close" : "open"}
        className="h-14 w-14 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:opacity-90 transition"
      >
        {open ? <X size={22} strokeWidth={1.5} /> : <Plus size={24} strokeWidth={1.5} />}
      </button>
    </div>
  );
}
