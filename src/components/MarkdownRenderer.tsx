import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm md:prose-base max-w-none font-serif leading-loose text-foreground
      prose-headings:font-serif prose-headings:tracking-wide prose-headings:text-foreground
      prose-p:font-serif
      prose-li:font-serif
      prose-blockquote:font-serif prose-blockquote:border-l-foreground/30 prose-blockquote:text-muted-foreground
      prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 prose-a:decoration-foreground/50 hover:prose-a:decoration-foreground
      prose-code:before:content-none prose-code:after:content-none
      prose-code:bg-accent prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-mono
      prose-pre:bg-[#f6f8fa] prose-pre:text-foreground prose-pre:border prose-pre:hairline prose-pre:font-mono
      prose-img:border prose-img:hairline
      prose-table:text-sm prose-table:font-serif
      prose-strong:text-foreground prose-strong:font-semibold">
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
  const fences = (src.match(/^```/gm) || []).length;
  if (fences % 2 !== 0) issues.push("有未關閉的 ``` 程式碼區塊 / Unclosed ``` code fence");
  const open = (src.match(/\[/g) || []).length;
  const close = (src.match(/\]/g) || []).length;
  if (open !== close) issues.push("[ 與 ] 數量不一致 / Unbalanced [ ]");
  const popen = (src.match(/\(/g) || []).length;
  const pclose = (src.match(/\)/g) || []).length;
  if (Math.abs(popen - pclose) > 2)
    issues.push("( 與 ) 數量明顯不一致 / Parentheses mismatch");
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
