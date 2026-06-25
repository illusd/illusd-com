import { Link } from "@tanstack/react-router";
import { parseTitle } from "@/lib/titleParser";

export interface ArticleCardData {
  id: string;
  raw_title: string;
  topic_title: string;
  episode_num: number | null;
  episode_title: string | null;
  cover_url: string | null;
  created_at: string;
}

export function ArticleCard({ a }: { a: ArticleCardData }) {
  const p = a.episode_num != null
    ? { episodeNum: a.episode_num, episodeTitle: a.episode_title, topicTitle: a.topic_title }
    : parseTitle(a.raw_title);

  return (
    <Link
      to="/article/$id"
      params={{ id: a.id }}
      className="group block"
    >
      <div className="aspect-[3/2] overflow-hidden bg-muted border hairline">
        {a.cover_url ? (
          <img
            src={a.cover_url}
            alt={p.episodeTitle ?? p.topicTitle}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
            無封面
          </div>
        )}
      </div>
      <div className="pt-3 pb-1">
        <div className="text-[11px] tracking-widest text-muted-foreground uppercase">
          {p.episodeNum != null ? `Ep.${p.episodeNum}` : "—"}
        </div>
        <h3 className="mt-1 font-serif text-lg leading-snug">
          {p.episodeTitle ?? p.topicTitle}
        </h3>
        <div className="mt-1 text-xs text-muted-foreground">
          自「{p.topicTitle}」
        </div>
      </div>
    </Link>
  );
}
