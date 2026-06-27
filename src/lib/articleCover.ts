export const ARTICLE_IMAGE_BUCKET = "article-images";
export const ARTICLE_IMAGE_REF_PREFIX = `${ARTICLE_IMAGE_BUCKET}://`;

export function toArticleImageRef(path: string) {
  return `${ARTICLE_IMAGE_REF_PREFIX}${path}`;
}

export function getArticleImagePath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(ARTICLE_IMAGE_REF_PREFIX)) {
    return trimmed.slice(ARTICLE_IMAGE_REF_PREFIX.length);
  }
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const publicMarker = `/storage/v1/object/public/${ARTICLE_IMAGE_BUCKET}/`;
    const signedMarker = `/storage/v1/object/sign/${ARTICLE_IMAGE_BUCKET}/`;
    const marker = url.pathname.includes(publicMarker) ? publicMarker : signedMarker;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}
