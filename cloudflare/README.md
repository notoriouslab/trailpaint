# Cloudflare Workers — trailpaint.org

GitHub Pages 無 Functions，以下 Worker 在 Cloudflare 橘雲代理層補功能。

## `markdown-negotiation.worker.js`

**作用**：攔截帶 `Accept: text/markdown` header 的請求，改送對應的 `.md` 檔案（而非 HTML）。其他請求全部 pass-through 到 GitHub Pages。

**為什麼重要**：
- AI 爬蟲（Claude Code、ChatGPT browse、Perplexity）支援 Accept 協商，能拿到 token 效率約 5 倍的 Markdown 版本
- canaisee 的「Agent-native」評分核心檢查此功能
- 通用 GEO/AEO 優化

### 部署步驟

1. **Cloudflare Dashboard** → Workers & Pages → Create → Create Worker
2. 命名：`trailpaint-markdown-negotiation` (或任意)
3. 點 Edit Code → 把 `markdown-negotiation.worker.js` 全文貼入 → Deploy
4. 進入該 Worker → Settings → **Triggers** → Add route
   - Route: `trailpaint.org/*`
   - Zone: `trailpaint.org`
5. Save

### 驗證

```bash
# 應回 text/markdown + 200
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
  -H "Accept: text/markdown" https://trailpaint.org/

# 實際 markdown 內容
curl -s -H "Accept: text/markdown" https://trailpaint.org/ | head -10

# stories 子頁
curl -s -H "Accept: text/markdown" https://trailpaint.org/stories/passion-week/ | head -20

# 確認一般瀏覽不受影響（應回 text/html）
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://trailpaint.org/
```

### 免費額度

Cloudflare Workers Free Tier：**100,000 requests / day**。TrailPaint 目前流量完全不會觸頂。

### 維護

若未來新增 `.md` 檔案，不用改 Worker — 只要 `.md` 檔案存在於 GitHub Pages，Worker 就能自動 serve。若要新增路徑規則，改這個檔案重 deploy 即可。

## 相關設定

- Cloudflare Content-Signal header（AI 訓練授權宣告）— 已在 Cloudflare Dashboard 設定
- `.nojekyll`（關閉 Jekyll，讓 `.md` 可被 serve）— 已在 repo root
- `<link rel="alternate" type="text/markdown">`（爬蟲 discovery） — 已加入四個主要 HTML 頁面
