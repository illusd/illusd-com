export interface NewArticleNotificationInput {
  id: string;
  episode_num?: number | null;
  episode_title?: string | null;
  topic_title: string;
}

export interface NewArticleNotification {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export function formatEpisodeLabel(episodeNum?: number | null): string {
  return episodeNum != null ? `Ep.${episodeNum}` : "ARTICLE";
}

export function formatNewArticlePushTitle(article: NewArticleNotificationInput): string {
  const episode = formatEpisodeLabel(article.episode_num);
  const episodeTitle = (article.episode_title ?? "").trim() || article.topic_title.trim() || "未命名";
  const topic = article.topic_title.trim() || "illusd";
  return `新文章 ${episode} ${episodeTitle} — ${topic}`;
}

export function articleCanonicalUrl(articleId: string, origin = "https://illusd.com"): string {
  return `${origin.replace(/\/$/, "")}/article/${encodeURIComponent(articleId)}`;
}

export function buildNewArticleNotification(
  article: NewArticleNotificationInput,
  origin = "https://illusd.com",
): NewArticleNotification {
  return {
    title: formatNewArticlePushTitle(article),
    body: "",
    url: articleCanonicalUrl(article.id, origin),
    tag: `article-${article.id}`,
  };
}