/** Display helpers for recommendation links (client-safe). */

/** https://google.com/ -> google.com */
export function bareUrl(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  return value
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

/** Ensure a clickable absolute href even if the stored value has no scheme. */
export function fullUrl(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}
