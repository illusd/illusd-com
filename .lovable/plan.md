# 一次到位升級計畫

## 1. Lighthouse 報告
- 用 Playwright + `lighthouse` CLI 跑最新已 publish 的 `https://illusd.com`
- 產出 Performance / Accessibility / Best Practices / SEO 四個分數
- 重點看 LCP、CLS、TBT、TTFB，附上具體可改善項目清單
- 輸出到 `/mnt/documents/lighthouse-report.html` 並在訊息中摘要

## 2. 輸入內容消失問題
**原因**：React 元件 state 只活在記憶體；切分頁時瀏覽器可能凍結或重新掛載，state 就沒了。新文章與留言輸入都受影響。

**修法**：建立 `useDraftPersist(key, value, setValue)` hook，自動把表單內容寫進 `localStorage`，每 500ms debounce，發布／送出成功後清除。套用到：
- `/new-article`：rawTitle / topicTitle / episodeNum / episodeTitle / content / coverUrl
- 文章內的留言輸入框（per article id）
- `/short-url`：文字內容輸入

## 3. Web Push 通知
- 後端：用 `web-push` 套件 + 自動產生 VAPID 金鑰（存到 secrets）
- DB：`push_subscriptions` 資料表（endpoint, p256dh, auth, user_id 可空）
- Service Worker：`public/sw.js` 註冊 push 監聽，點擊跳轉到文章
- UI：站台 header 旁加「🔔 訂閱新文章」按鈕（首次點擊申請權限）
- 觸發：`articles` insert trigger → 呼叫 `/api/public/hooks/notify-new-article` → 廣播給所有訂閱者
- 通知格式：標題「新文章」、內文「Ep.{n} {episode_title} — {topic_title}」

## 4. 完整留言系統
擴充現有 `comments`：
- 加 `parent_id`（巢狀回覆，最多一層）
- 加 `updated_at` + 編輯功能
- 留言按讚：新增 `comment_likes` 資料表
- UI：回覆 / 編輯 / 刪除 / 按讚 + 即時更新（Supabase Realtime）
- 已登入才能操作，未登入引導 /sign-up

## 5. Markdown 編輯器
- 安裝 `react-markdown` + `remark-gfm` + `rehype-highlight`
- `/new-article` 內文改成左右分欄（上下分欄於手機）：左邊輸入、右邊即時預覽
- 上方折疊面板：完整 Markdown 語法說明與範例（標題 / 列表 / 表格 / 程式碼 / 圖片 / 連結 / 引用）
- 文章詳情頁渲染 Markdown（原有純文字相容）
- "Auto-debug"：偵測未閉合的 \`\`\`、未配對的 [] ()、表格欄數不一致等，於預覽上方顯示警告

## 6. i18n（中 / 英 / 日）
- 安裝 `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- 翻譯檔：`src/i18n/locales/{zh,en,ja}.json`
- 涵蓋所有現有 UI 文字（Header / 首頁標語 / 註冊登入 / 新文章 / 留言 / 法務 / illurl / 動畫提示）
- Header 加語言切換選單（🌐）；偏好寫入 `localStorage`
- `<html lang>` 動態切換（影響 SEO）
- 文章內容本身**不翻譯**（使用者產生內容），只翻譯 UI chrome

## 7. 中文 Email 模板
重寫 `src/lib/email-templates/*.tsx`（signup / recovery / magic-link / invite / email-change / reauthentication）：
- 主旨、內文、按鈕全改繁體中文
- 保留 illusd 品牌排版與 mails.illusd.com 寄件設定

---

## 執行順序（盡量並行）
1. 安裝套件：`web-push`、`react-markdown`、`remark-gfm`、`rehype-highlight`、`i18next`、`react-i18next`、`i18next-browser-languagedetector`、`lighthouse`
2. DB migration：`push_subscriptions`、`comments.parent_id` + `updated_at`、`comment_likes`
3. 程式碼變更全部並行寫入
4. 跑 Lighthouse 並輸出報告

## 需要你確認的 3 件事
1. **Lighthouse**：要 mobile 還是 desktop 模擬？（預設 mobile，比較嚴格）
2. **Web Push 圖示**：用 illusd logo？若有檔案請告知，否則我用文字 logo 自動生成 192/512 PNG
3. **留言巢狀層數**：1 層回覆（Threads 風格）還是無限層？預設 1 層較乾淨

如果都採預設，直接回「OK 開動」我就一次做完。
