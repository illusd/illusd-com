import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function locale(name: "zh" | "en" | "ja") {
  return JSON.parse(readFileSync(new URL(`../src/i18n/locales/${name}.json`, import.meta.url), "utf8"));
}

describe("comment replies", () => {
  test("reply Markdown renders common formatting", () => {
    const markdown = "**粗體** [連結](https://illusd.com)\n\n- a\n\n`code`\n\n| A | B |\n| - | - |\n| 1 | 2 |";
    const html = renderToStaticMarkup(
      React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, markdown),
    );

    expect(html).toContain("<strong>粗體</strong>");
    expect(html).toContain('<a href="https://illusd.com">連結</a>');
    expect(html).toContain("<li>a</li>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<table>");
  });

  test("reply UI labels are translated in Chinese, English, and Japanese", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      const article = locale(lang).article;
      for (const key of ["reply", "reply_placeholder", "markdown_supported", "submit", "cancel", "delete_confirm"]) {
        expect(article[key]).toBeTruthy();
      }
    }
  });
});