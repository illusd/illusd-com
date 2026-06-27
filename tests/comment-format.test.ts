import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";

const LOCALES = ["zh", "en", "ja"] as const;

function locale(name: (typeof LOCALES)[number]) {
  return JSON.parse(readFileSync(new URL(`../src/i18n/locales/${name}.json`, import.meta.url), "utf8"));
}

function renderMarkdown(markdown: string) {
  return renderToStaticMarkup(
    React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, markdown),
  );
}

describe("comment replies — Markdown formatting", () => {
  const SAMPLES: Record<(typeof LOCALES)[number], string> = {
    zh: "**粗體** *斜體* [連結](https://illusd.com)\n\n- 項目一\n- 項目二\n\n`程式` 與\n\n```ts\nconst x = 1;\n```\n\n| 欄 | 位 |\n| - | - |\n| 1 | 2 |",
    en: "**bold** *italic* [link](https://illusd.com)\n\n- one\n- two\n\n`code`\n\n```ts\nconst x = 1;\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |",
    ja: "**太字** *斜体* [リンク](https://illusd.com)\n\n- 一つ\n- 二つ\n\n`コード`\n\n```ts\nconst x = 1;\n```\n\n| 列 | 値 |\n| - | - |\n| 1 | 2 |",
  };

  for (const lang of LOCALES) {
    test(`renders common Markdown for ${lang}`, () => {
      const html = renderMarkdown(SAMPLES[lang]);
      expect(html).toContain("<strong>");
      expect(html).toContain("<em>");
      expect(html).toContain('<a href="https://illusd.com">');
      expect(html).toMatch(/<li>/);
      expect(html).toContain("<code>");
      expect(html).toContain("<pre>");
      expect(html).toContain("<table>");
    });
  }

  test("does not produce raw script tags from comment input", () => {
    const html = renderMarkdown('regular **text** <script>alert(1)</script>');
    expect(html).not.toContain("<script>");
  });
});

describe("comment UI i18n", () => {
  const KEYS = [
    "comments",
    "reply",
    "reply_placeholder",
    "markdown_supported",
    "submit",
    "cancel",
    "edit",
    "delete",
    "delete_confirm",
    "edited",
    "reader",
    "creator_tag",
    "donate",
    "donate_article",
  ];

  for (const lang of LOCALES) {
    test(`${lang} has all comment keys`, () => {
      const dict = locale(lang).article;
      for (const k of KEYS) {
        expect(dict[k], `missing article.${k} in ${lang}`).toBeTruthy();
      }
    });
  }

  test("article.from_series interpolates topic per locale", async () => {
    for (const lang of LOCALES) {
      const dict = locale(lang);
      await i18next.init({ lng: lang, resources: { [lang]: { translation: dict } } });
      const out = i18next.t("article.from_series", { topic: "VIBE人人都可實現" });
      expect(out).toContain("VIBE人人都可實現");
    }
  });

  test("provider wires translations into a rendered tree", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        I18nextProvider,
        { i18n: i18next },
        React.createElement("span", null, i18next.t("article.reply")),
      ),
    );
    expect(html).toMatch(/<span>.+<\/span>/);
  });
});
