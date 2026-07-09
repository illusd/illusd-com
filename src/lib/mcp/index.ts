import { defineMcp } from "@lovable.dev/mcp-js";
import listArticles from "./tools/list-articles";
import getArticle from "./tools/get-article";
import listPoosts from "./tools/list-poosts";
import resolveShortLink from "./tools/resolve-short-link";

export default defineMcp({
  name: "illusd-mcp",
  title: "illusd.com",
  version: "0.1.0",
  instructions:
    "Public tools for illusd.com. Read published articles, browse Poosts (short posts), and resolve illurl short links. No authentication required; only public data is exposed.",
  tools: [listArticles, getArticle, listPoosts, resolveShortLink],
});
