import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { MarkdownRenderer, lintMarkdown } from "./MarkdownRenderer";

const HELP_MD = `===== 標題 Headings =====
# 一級標題（H1，整篇文章只用一次）
## 二級標題（H2，章節用）
### 三級標題（H3，小節用）
#### 四級標題
##### 五級標題
###### 六級標題

===== 文字樣式 Inline =====
**粗體**　__也是粗體__
*斜體*　_也是斜體_
~~刪除線~~
\`行內程式 code\`
H~2~O 與 X^2^（部分平台才支援上下標）

===== 引用 Blockquote =====
> 單行引用
>
> 第二段引用，前面要保留一個 \`>\`
>> 巢狀引用（引用裡再引用）

===== 清單 Lists =====
- 無序清單項目 A
- 無序清單項目 B
  - 子項目（縮排 2 空格）
    - 孫項目

1. 有序清單第一項
2. 有序清單第二項
   1. 有序子項

- [ ] 待辦事項（未完成）
- [x] 已完成事項

===== 連結與圖片 Links & Images =====
這是一個 [連結文字](https://illusd.com "滑鼠停留提示")
自動連結：<https://illusd.com>
參考式連結：請見 [文件][doc]

[doc]: https://illusd.com/terms-of-service

圖片：
![圖片替代文字](https://example.com/cover.jpg)

可點擊的圖片連結：
[![替代文字](https://example.com/thumb.jpg)](https://illusd.com)

===== 表格 Tables =====
| 欄位 | 對齊置中 | 對齊靠右 |
| :--- | :---: | ---: |
| A | 中 | 1 |
| B | 中 | 22 |
| C | 中 | 333 |

===== 程式碼 Code Blocks =====
\`\`\`js
// 標明語言可自動高亮
function greet(name) {
  console.log(\`hello \${name}\`);
}
\`\`\`

\`\`\`python
def add(a, b):
    return a + b
\`\`\`

\`\`\`bash
echo "也支援 shell"
\`\`\`

===== 水平線 Horizontal Rule =====

---

===== 跳脫字元 Escape =====
若要顯示星號或底線本身：\\*不變斜體\\*，\\_不變斜體\\_

===== 換行 Line Break =====
段落之間請空一行。
若同段內要換行，請在行尾「加兩個空格」再 Enter。
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
