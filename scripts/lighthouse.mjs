#!/usr/bin/env node
// One-shot Lighthouse runner for illusd: collects LCP + SEO across key routes
// and writes a Markdown report. Run after the live site is reachable.
//
// Usage:
//   node scripts/lighthouse.mjs                              # defaults to https://illusd.com
//   node scripts/lighthouse.mjs https://illusd.com /topic/all /article/abc
//
// Requires Chromium available at PUPPETEER_EXECUTABLE_PATH or system Chrome.
// Install deps if missing: bun add -d lighthouse chrome-launcher

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [, , baseArg, ...rest] = process.argv;
const BASE = (baseArg ?? "https://illusd.com").replace(/\/$/, "");
const ROUTES = rest.length > 0 ? rest : ["/", "/topic/all", "/sign-up", "/short-url"];

const outDir = "lighthouse-reports";
mkdirSync(outDir, { recursive: true });

const lh = await import("lighthouse").then((m) => m.default ?? m);
const cl = await import("chrome-launcher");

const chrome = await cl.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
const opts = {
  logLevel: "error",
  output: "json",
  onlyCategories: ["performance", "seo", "accessibility", "best-practices"],
  port: chrome.port,
};

const rows = [];
for (const path of ROUTES) {
  const url = `${BASE}${path}`;
  process.stderr.write(`→ ${url}\n`);
  try {
    const runner = await lh(url, opts);
    const lhr = runner.lhr;
    const perf = Math.round((lhr.categories.performance?.score ?? 0) * 100);
    const seo = Math.round((lhr.categories.seo?.score ?? 0) * 100);
    const a11y = Math.round((lhr.categories.accessibility?.score ?? 0) * 100);
    const bp = Math.round((lhr.categories["best-practices"]?.score ?? 0) * 100);
    const lcp = lhr.audits["largest-contentful-paint"]?.displayValue ?? "—";
    const cls = lhr.audits["cumulative-layout-shift"]?.displayValue ?? "—";
    const tbt = lhr.audits["total-blocking-time"]?.displayValue ?? "—";
    rows.push({ path, perf, seo, a11y, bp, lcp, cls, tbt });
    writeFileSync(join(outDir, `${path.replace(/[/]/g, "_") || "_root"}.json`), JSON.stringify(lhr, null, 2));
  } catch (e) {
    rows.push({ path, error: (e instanceof Error ? e.message : String(e)) });
  }
}

await chrome.kill();

const date = new Date().toISOString();
const md = [
  `# Lighthouse Report — ${BASE}`,
  `Generated: ${date}`,
  "",
  `| Path | Perf | SEO | A11y | BP | LCP | CLS | TBT |`,
  `| ---- | ---- | --- | ---- | -- | --- | --- | --- |`,
  ...rows.map((r) =>
    r.error
      ? `| ${r.path} | ❌ | — | — | — | — | — | ${r.error} |`
      : `| ${r.path} | ${r.perf} | ${r.seo} | ${r.a11y} | ${r.bp} | ${r.lcp} | ${r.cls} | ${r.tbt} |`,
  ),
  "",
  `_Full per-route JSON in \`${outDir}/\`._`,
].join("\n");

const reportPath = join(outDir, `report-${date.replace(/[:.]/g, "-")}.md`);
writeFileSync(reportPath, md);
writeFileSync(join(outDir, "latest.md"), md);
console.log(md);
console.log(`\nSaved → ${reportPath}`);
