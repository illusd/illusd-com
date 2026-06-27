import { describe, expect, test } from "bun:test";
import { buildNewArticleNotification, formatNewArticlePushTitle } from "../src/lib/notifications";

describe("new article Web Push notification format", () => {
  test("matches 新文章 {第幾集} {本集標題} — {話題}", () => {
    expect(
      formatNewArticlePushTitle({
        id: "article-1",
        episode_num: 1,
        episode_title: "平台選擇",
        topic_title: "VIBE人人都可實現",
      }),
    ).toBe("新文章 Ep.1 平台選擇 — VIBE人人都可實現");
  });

  test("links directly to the canonical article page", () => {
    expect(
      buildNewArticleNotification(
        {
          id: "abc-123",
          episode_num: 12,
          episode_title: "Markdown 預覽",
          topic_title: "VibeCoding",
        },
        "https://illusd.com",
      ),
    ).toMatchObject({
      title: "新文章 Ep.12 Markdown 預覽 — VibeCoding",
      body: "",
      url: "https://illusd.com/article/abc-123",
      tag: "article-abc-123",
    });
  });
});