import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { MarkdownRenderer, lintMarkdown } from "./MarkdownRenderer";

const HELP_MD = `# 一級標題
## 二級標題
### 三級標題

**粗體**　*斜體*　~~刪除線~~　\`行內程式\`

> 引用文字

- 項目 A
- 項目 B
  - 子項目

1. 編號項目
2. 第二項

[連結文字](https://illusd.com)

![圖片替代文字](https://example.com/image.jpg)

| 欄位 | 說明 |
| --- | --- |
| A | 第一欄 |
| B | 第二欄 |

\`\`\`js
// 程式碼區塊（會自動高亮）
console.log("hello illusd");
\`\`\`

---

水平線（上一行三個減號）
`;

export function MarkdownEditor({
  value,
  onChange,
  rows = 16,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const warnings = useMemo(() => lintMarkdown(value), [value]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setHelpOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
      >
        {helpOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {t("editor.syntax_help")}
      </button>
      {helpOpen && (
        <pre className="text-[11px] bg-accent/40 border hairline p-3 mb-3 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
          {HELP_MD}
        </pre>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full bg-transparent border hairline p-3 text-sm leading-relaxed font-mono focus:outline-none focus:border-foreground resize-y"
        />
        <div className="border hairline p-3 min-h-[12rem] overflow-auto bg-background">
          <div className="text-[10px] tracking-widest text-muted-foreground uppercase mb-2">
            {t("editor.preview")}
          </div>
          {warnings.length > 0 && (
            <div className="mb-3 border hairline p-2 text-[11px] bg-yellow-50 text-yellow-900">
              <div className="flex items-center gap-1 font-medium">
                <AlertCircle size={12} /> {t("editor.warnings")}
              </div>
              <ul className="list-disc list-inside mt-1">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          <MarkdownRenderer content={value} />
        </div>
      </div>
    </div>
  );
}
