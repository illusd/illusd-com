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
        <div className="illusd-marquee-viewport relative flex-1 overflow-hidden" aria-label={text}>
          <div className="illusd-marquee-track whitespace-nowrap will-change-transform">
            <span>{text}</span>
            <span aria-hidden="true">{text}</span>
          </div>
        </div>
      </div>
      <style>{`
        .illusd-marquee-viewport { --marquee-gap: 5rem; }
        .illusd-marquee-track {
          display: inline-flex;
          gap: var(--marquee-gap);
          min-width: max-content;
          animation: illusd-marquee-scroll 48s linear infinite;
        }
        .illusd-marquee-track span { flex: 0 0 auto; }
        .illusd-marquee-track:hover { animation-play-state: paused; }
        @keyframes illusd-marquee-scroll {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(calc(-50% - (var(--marquee-gap) / 2)), 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .illusd-marquee-track { animation-duration: 120s; }
        }
      `}</style>
    </div>
  );
}
