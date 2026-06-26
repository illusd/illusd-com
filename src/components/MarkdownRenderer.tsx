import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm md:prose-base max-w-none font-sans leading-loose text-foreground
      prose-headings:font-serif prose-headings:tracking-wide
      prose-a:underline prose-a:underline-offset-2
      prose-code:before:content-none prose-code:after:content-none
      prose-code:bg-accent prose-code:px-1 prose-code:py-0.5 prose-code:rounded
      prose-pre:bg-[#f6f8fa] prose-pre:text-foreground prose-pre:border prose-pre:hairline
      prose-blockquote:border-l-foreground/30 prose-blockquote:text-muted-foreground
      prose-img:border prose-img:hairline
      prose-table:text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}

/** Lightweight Markdown linter; returns user-readable Chinese-by-default warnings. */
export function lintMarkdown(src: string): string[] {
  const issues: string[] = [];
  // unclosed code fences
  const fences = (src.match(/^```/gm) || []).length;
  if (fences % 2 !== 0) issues.push("有未關閉的 ``` 程式碼區塊 / Unclosed ``` code fence");
  // unbalanced brackets in links/images
  const open = (src.match(/\[/g) || []).length;
  const close = (src.match(/\]/g) || []).length;
  if (open !== close) issues.push("[ 與 ] 數量不一致 / Unbalanced [ ]");
  const popen = (src.match(/\(/g) || []).length;
  const pclose = (src.match(/\)/g) || []).length;
  if (Math.abs(popen - pclose) > 2)
    issues.push("( 與 ) 數量明顯不一致 / Parentheses mismatch");
  // table column consistency
  const lines = src.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\s*\|.*\|\s*$/.test(lines[i]) && /^\s*\|?[\s:-]+\|[\s:-|]+$/.test(lines[i + 1])) {
      const headerCols = lines[i].split("|").filter(Boolean).length;
      let j = i + 2;
      while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) {
        const cols = lines[j].split("|").filter(Boolean).length;
        if (cols !== headerCols) {
          issues.push(`表格第 ${j + 1} 行欄數與表頭不符 / Table row ${j + 1} column count mismatch`);
          break;
        }
        j++;
      }
      i = j;
    }
  }
  return issues;
}
