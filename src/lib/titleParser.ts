// Parses raw title format: "#1 (集名)-話題標題"
// Returns parsed parts; falls back gracefully when format doesn't match.
export interface ParsedTitle {
  episodeNum: number | null;
  episodeTitle: string | null;
  topicTitle: string;
}

const FULL_RE = /^#\s*(\d+)\s*[（(]\s*(.+?)\s*[)）]\s*[-—–]\s*(.+)$/;

export function parseTitle(raw: string): ParsedTitle {
  const s = (raw ?? "").trim();
  const m = s.match(FULL_RE);
  if (m) {
    return {
      episodeNum: parseInt(m[1], 10),
      episodeTitle: m[2].trim(),
      topicTitle: m[3].trim(),
    };
  }
  // Fallback: treat the whole string as topicTitle
  return { episodeNum: null, episodeTitle: null, topicTitle: s };
}

// Display: "Ep.1  平台選擇   自「VIBE人人都可實現」"
export function formatDisplay(p: ParsedTitle): string {
  const parts: string[] = [];
  if (p.episodeNum != null) parts.push(`Ep.${p.episodeNum}`);
  if (p.episodeTitle) parts.push(p.episodeTitle);
  parts.push(`自「${p.topicTitle}」`);
  return parts.join("   ");
}
