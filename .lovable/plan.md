# 全套升級計畫

分四批執行，每批結束會顯示進度。

---

## 第 1 批：SEO 驗證 + Google Search Console
- 用 curl 驗證 https://illusd.com/sitemap.xml 與 /robots.txt 內容（檢查 canonical 都指向 illusd.com）。
- 透過 Google Search Console 連接器：取得 META verification token → 寫入 `__root.tsx` → 呼叫 verify → PUT 加站。
- 觸發 SEO/Lighthouse scan，回報結果。

## 第 2 批：法務頁 + Cap captcha + 同意勾選 + 文章封面真實上傳
- 新增 `/terms-of-service` 與 `/privacy` 頁（繁中、極簡日系版式）。
- 註冊/登入頁：加入「□ 我已同意 illusd.com 的服務條款與隱私權政策」勾選框（未勾選 disabled）。
- 整合 [@cap.js/widget](https://github.com/tiagozip/cap) — 採其公開的免費 standalone challenge endpoint（無需自架）。註冊與登入皆需通過。
- `/new-article`：封面欄位改成 `<input type="file">`，上傳到 Supabase Storage `article-images` bucket，回填 public URL 到 `cover_url`（保留現有 URL 輸入做 fallback）。

## 第 3 批：Donate to Creator（Shopify 嵌入）+ 感謝動畫
- 文章頁加上「Donate to Creator」按鈕。
- 採 Shopify Buy Button / Storefront 直接導向 `https://pay.illusd.com/products/vibecoding`，並在 redirect 回站時帶 `?donated=1`（Shopify thank you page 設定外連回 `https://illusd.com/thanks`）。
- 新增 `/thanks` 路由，嵌入提供的「謝謝您的贊助」純黑動畫（轉成 React 元件 + Tailwind / styled），3 秒後自動 `navigate('/')`。

備註：因 Shopify checkout 在 pay.illusd.com 不能直接呼叫本站 JS，無法做即時付款偵測；改用 thank-you redirect 觸發動畫（最務實做法）。若要 webhook 寫入贊助紀錄，可第 5 批再做。

## 第 4 批：illurl 短網址 / 檔案服務
- DB 新增兩張表：
  - `short_links(code PK, target_url, created_by NULL, created_at)`
  - `short_files(code PK, storage_path, mime, size, created_by NULL, created_at)`
  - 加上 RLS：anon 可讀（用於跳轉/下載查詢）、insert 走 server fn（含 captcha + 速率限制）。
- Storage bucket `illurl-files`（私有，透過簽名 URL 對外）。檔案上限 200 MB。
- `/short-url` 頁：兩個 tab（短網址 / 檔案上傳），均強制 Cap captcha。
- 短碼演算法：先嘗試純數字 5 碼，若空間用盡再升級為「數字 + 大寫英文」5 碼（每次 insert 衝突自動重抽，最多 10 次後升級）。
- 路由：
  - `/$code`（splat route，僅 5 碼匹配）→ server loader 查 `short_links` → 302 到 `target_url`，未命中回 404。
  - `/f/$code` → 顯示檔案（圖片/影片預覽 + 下載按鈕）。
- 上傳完成 / 失敗動畫：將提供的兩段純 HTML 轉成 React 元件，嵌入 `/short-url` 流程（不顯示原始程式碼）。
- 防濫用：server fn 內以 IP + 24h 計數簡易速率限制（用一張 `upload_quota` 表），超限回失敗動畫。

---

## 技術細節
- Cap captcha：使用 `@cap.js/widget` script + 公開 verify endpoint；server fn 驗證 token 後才允許 signup/login/upload。
- 真實上傳統一走 `supabase.storage.from(bucket).upload(path, file)`，路徑 `${userId ?? 'anon'}/${uuid}-${filename}`。
- 既有 `article-images` bucket 已有 storage policy，沿用即可。
- 動畫元件放 `src/components/animations/`，純 React + inline `<style>` 或 styled component，不污染全站 CSS。
- 法務頁、thanks 頁、short-url 頁、/f/$code 頁都會加上 `head()` SEO metadata。
- Robots：disallow `/short-url`, `/f/`, `/$code` 等動態跳轉。

## 不在這次範圍
- Shopify 訂單 webhook 入庫（如需可後續加）。
- 多語系。
- illurl 後台管理頁。
