import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

type Announcement = { id: string; content: string };

export function AnnouncementMarquee() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    let alive = true;
    supabase
      .from("announcements")
      .select("id, content")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (alive) setItems((data ?? []) as Announcement[]);
      });
    const ch = supabase
      .channel("announcements_public")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        supabase
          .from("announcements")
          .select("id, content")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(10)
          .then(({ data }) => {
            if (alive) setItems((data ?? []) as Announcement[]);
          });
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  if (items.length === 0) return null;

  const text = items.map((a) => a.content).join("　·　");

  return (
    <div className="border-b hairline bg-accent/40 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 py-2 flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 shrink-0 text-muted-foreground">
          <Megaphone size={12} strokeWidth={1.5} />
          {t("announcement.title")}
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="marquee-track whitespace-nowrap will-change-transform">
            <span className="inline-block pr-16">{text}</span>
            <span className="inline-block pr-16">{text}</span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { animation: marquee-scroll 60s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}
