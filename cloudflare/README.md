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

## `share.worker.js`

**作用**：取代 TinyURL 第三方依賴，為 TrailPaint 提供原生 share link 後端。使用者按「複製分享連結」→ 前端把 project 壓縮成 deflate-base64 hash → POST `/api/s` → Worker 產 12 字元隨機 ID 存進 KV（TTL 90 天）→ 回傳 `https://trailpaint.org/s/:id`。朋友點短網址時 Worker 回 HTML body 內含 `sessionStorage` + `location.replace('/app/?share=ss')`；前端載入後從 sessionStorage 取 hash，交給既有 `decodeShareLink` 復原專案（**含照片**）。

**為什麼重要**：
- URL hash 架構無法承載照片（LINE / 微信 / Messenger 這類通訊管道 ≥10 KB 就會截斷連結）
- TinyURL 是不可控第三方，哪天服務終止或在某地區被牆，歷史連結全失效
- 需要觀察入口（誰的 share 被點、被點幾次）

**架構要點（Worker 設計決策）**：
- **Frontend 預壓、Worker 零壓縮**：前端先 deflate+base64 成 hash 才 POST，body 縮約 3 倍，避開 Safari 大 fetch 問題、Worker 也省下 free tier 10 ms CPU 預算
- **Envelope 存 hash 而非 raw JSON**：GET /s/:id 只需 `KV.get → HTML body`，零 CPU 工作，在 Cloudflare edge cache 下幾乎無 KV 讀取壓力
- **HTML body redirect 而非 307 Location**：photo-heavy hash 可達 MB 級，塞 Location header 會撞 CF 邊緣 header 限制；改 response body 攜帶 hash 無此限
- **sessionStorage 而非 URL fragment**：`location.replace('/app/#share=<huge>')` 會被瀏覽器 URL parser 截斷；sessionStorage 同 origin、容量 MB 級、無 URL 限制

### 部署步驟

1. Cloudflare Dashboard → Workers & Pages → **Create** → **Worker**
2. 命名 `trailpaint-share` → 點 Edit code → 全文貼入 `share.worker.js` → **Deploy**
3. **KV namespace**：Workers & Pages → KV → **Create a namespace** → 名稱 `trailpaint-share-kv`
4. 回 Worker → Settings → **Bindings** → Add binding → **KV**
   - Variable: `SHARE_KV`
   - Namespace: 選剛建立的 `trailpaint-share-kv`
5. 繼續 Add binding → **Analytics Engine**
   - Variable: `SHARE_ANALYTICS`
   - Dataset: `trailpaint_share_events`
   - 若尚未啟用 Analytics Engine，Dashboard 會提示到 Workers & Pages → Analytics Engine 頁面按 Enable 一次即可
6. Worker → Settings → **Triggers** → Add route
   - Route 1: `trailpaint.org/s/*` — Zone: `trailpaint.org`
   - Route 2: `trailpaint.org/api/s` — Zone: `trailpaint.org`

### Rate Limit（WAF）

Cloudflare Free plan 只給一條 Rate Limiting rule，優先保留寫入日限（最有效阻擋 KV quota 濫用）。

- Dashboard → trailpaint.org zone → Security → WAF → **Rate limiting rules** → Create rule
- 點右上 **Edit expression** 輸入：`(http.request.uri.path eq "/api/s")`
- Requests: **30**，Period: **10 seconds**（Free plan 只能選此 period；語意變成「10 秒內不得超過 30 次」，對突發寫入已足夠）
  - 若未來升級到 Pro / Business plan，建議改為 30 req / 24 hours 以擋慢速爬取
- Action: **Block**
- Duration: **1 hour**

另外建議開啟 Dashboard → Security → Bots → **Bot Fight Mode**（免費）以補防明顯的自動化攻擊。

### 驗證

```bash
VALID_HASH='eJxLy89JLAIACHsCvQ=='  # 任意合法 base64 即可

# 1. POST 建立新 share
curl -X POST https://trailpaint.org/api/s \
  -H 'content-type: application/json' \
  -d "{\"hash\":\"$VALID_HASH\"}"
# 預期: {"url":"https://trailpaint.org/s/...","id":"...","expiresAt":...}

# 2. 讀取（HTML body 內含 sessionStorage 寫入 + /app/?share=ss 跳轉）
curl -s https://trailpaint.org/s/<id> | head -10
# 預期 200 + 含 `sessionStorage.setItem('tp_share_hash', ...)` 的 <script>

# 3. 二次讀取（cache 命中）
curl -sI https://trailpaint.org/s/<id>
# 預期 cf-cache-status: HIT

# 4. 格式錯誤
curl -X POST https://trailpaint.org/api/s \
  -H 'content-type: application/json' \
  -d '{"hash":"<<<invalid"}'
# 預期 400 {"error":"invalid hash format"}
```

### Analytics Engine 查 share 熱度

Dashboard → Workers & Pages → Analytics Engine → SQL：

```sql
SELECT blob1 AS id,
       COUNT() AS events,
       SUM(_sample_interval) AS estimated_hits
FROM trailpaint_share_events
WHERE timestamp > NOW() - INTERVAL '7' DAY
GROUP BY blob1
ORDER BY events DESC
LIMIT 50
```

**注意**：
- Cloudflare Analytics Engine SQL 的 `COUNT()` 必須是**零參數**，寫 `COUNT(*)` 會 error。
- 只計算 cache-miss 的讀取（cache hit 時 Worker 未執行），所以真實點擊數會被系統性低估；作為「哪個 share 比較熱」的趨勢指標仍準確。
- Analytics Engine 目前對所有 Workers plan（含 Free）免費；未來若開啟計費 Free plan 仍會有免費額度。

### Admin 手動操作

無使用者端 delete/edit API（匿名系統，common-ground #49 決策）。必要時：

- **刪除單筆 share**：Dashboard → KV → `trailpaint-share-kv` → 找 key → **Delete**。edge cache 最多保留 1 小時後自動過期；若需立即失效，同時 Dashboard → Caching → Configuration → **Purge Cache** 針對 `/s/<id>` URL
- **查看 payload**：KV → 點 key → 檢視 envelope（`{ hash, userId, createdAt, v: 2 }`）

### 免費額度

- KV：1 GB 儲存 / 100k 讀 / 1k 寫 每天
- Analytics Engine：10M events/day（目前 Workers 所有 plan 免費）
- Worker：100k 請求 / 天
- **單人專案極不可能觸頂**。監控方式：Dashboard → Storage → KV Overview → `trailpaint-share-kv` 看用量，接近 800MB 時再考慮縮短 TTL 或提升計費 plan。

### 降級鏈（前端 `shareLink.ts:createBackendShare`）

1. **後端 `POST /api/s`**（本 Worker）— 主要路徑
2. **長 hash URL** — 後端失敗時最後一線（會捨棄照片，但至少連結可用）

降級對使用者**透明**（`console.warn` 留痕但不出錯誤 toast），確保「按複製一定有結果」。先前的 TinyURL fallback 已移除 — 它產出的是無照片連結，收件人會看到空白預覽以為連結壞掉，體驗反而更差。

## 相關設定

- Cloudflare Content-Signal header（AI 訓練授權宣告）— 已在 Cloudflare Dashboard 設定
- `.nojekyll`（關閉 Jekyll，讓 `.md` 可被 serve）— 已在 repo root
- `<link rel="alternate" type="text/markdown">`（爬蟲 discovery） — 已加入四個主要 HTML 頁面
