# TrailPaint 設計筆記

> 這份文件記錄產品方向、功能構想、技術決策的脈絡。
> 不是 TODO，而是「下次討論的起點」。

---

## 現有架構概覽（v1.2.0）

```
trailpaint/
├── online/src/          # Vite + React 19 + TypeScript
│   ├── core/            # 不依賴 Leaflet（models, store, utils, components）
│   ├── map/             # Leaflet 整合層（basemaps.ts, basemapLayer.ts, overlays.ts）
│   ├── player/          # Story Player 獨立入口
│   └── i18n/            # 三語（zh-TW, en, ja）
├── app/                 # Vite build 產出（GitHub Pages 部署）
├── stories/             # 純靜態 Story Page + 音樂 + 故事 JSON
│   ├── music/           # CC BY 配樂（m4a）
│   ├── stories.js       # Story Page vanilla JS
│   └── taiwan-missionaries/  # 台灣宣教士故事集
└── examples/            # 範例步道 JSON
```

**資料流**：Editor → Project JSON → Player（localStorage / ?src= / #share= / postMessage）

**Player embed**：postMessage handshake，父頁面傳完整 JSON（含照片）

---

## 功能構想（待討論）

### 1. 時間軸 / 人物軸互動 UI（009）

**背景**：台灣宣教士故事跨越 1865-2024，5 位人物時間重疊。目前 Story Page 只有 tabs 切換，看不到時間關係。

**構想**：
- 橫軸時間線，每位人物一條色帶
- 點擊時間點跳到對應景點
- 可以看到「1895 年巴克禮開城門時，蘭大衛同年抵台」這種歷史交集
- 也適用於聖經地圖（使徒行傳三次旅行的時間軸）

**待討論**：
- 放在 Story Page 還是 Player 裡？
- 手機版怎麼呈現（橫向時間線在小螢幕很擠）？
- 資料格式：story.json 需要加時間欄位嗎？

---

### 2. 聖經地圖系列

**背景**：主公的產品願景是把 TrailPaint 做成「宣教士足跡 + 聖經地圖」的互動平台。類似 YouTube 用戶產出內容的模式。

**構想**：
- 使徒行傳：保羅三次宣教旅行（地中海路線）
- 出埃及記：以色列人從埃及到迦南
- 耶穌生平：伯利恆→拿撒勒→耶路撒冷
- 每個系列一個 story.json + 多個 trailpaint.json

**待討論**：
- 底圖選擇：古代地圖 overlay？（需要找合法的聖經地圖資源）
- 多語言內容（中/英/日）怎麼管理？
- 照片/插畫來源（Wikimedia 有很多 Public Domain 宗教畫作）

---

### 3. Snap-to-trail（路線吸附）

**背景**：目前畫路線是自由繪製，不會吸附到實際步道。使用者畫的路線可能偏離實際路徑。

**構想**：
- 用 OSRM 或 Valhalla routing API 將手繪路線吸附到最近的步道
- 可選功能（toggle on/off），不強制

**待討論**：
- API 選擇：OSRM（免費但需自架）vs Valhalla vs GraphHopper
- 台灣的步道資料在 OSM 上完整度如何？
- 離線場景怎麼辦？
- 這功能對「手繪風」的產品定位是否矛盾？

---

### 4. 社群功能

**背景**：目前作品只能匯出 JSON 或 share link，沒有集中瀏覽/發現的機制。

**構想**：
- 使用者上傳作品到平台（需後端）
- 瀏覽/搜尋/收藏他人作品
- 按地區、主題分類
- 類似 CodePen 的 embed + fork 模式

**待討論**：
- 後端技術選型（Supabase? Cloudflare Workers + R2?）
- 審核機制（色情/政治敏感內容）
- 商業模式（免費 + premium?）
- MVP 是什麼？也許先做「gallery 展示頁」就好

---

### 5. 離線版退役 ✅

**背景**：`trailpaint.html` 是最早的單檔離線版。PWA 已可離線使用，繼續維護兩份代碼成本太高。

**現況（2026-04-20）**：正式退役。三個離線版 HTML（`trailpaint.html` / `-en` / `-ja`）移入 `old/`，官網與 README 不再指向；llms.txt / agent-card.json 同步移除。建議離線使用者改走 [PWA 安裝](https://trailpaint.org/features/install/)。

---

### 6. Player 離線強化（展場場景）

**背景**：展場/教會可能想用 Player 做自動播放展示，但現場可能沒有穩定網路。

**構想**：
- Player PWA 離線 cache
- 預載所有 tile + 照片
- USB 載入模式（從隨身碟讀 JSON）

**待討論**：
- tile 離線 cache 要多大？（一個區域的 zoom 10-16 可能幾十 MB）
- 用 Service Worker 預載還是用 mbtiles？

---

### 7. Markdown / 部落格嵌入

**背景**：很多人寫部落格記錄旅行，想在文章裡嵌入互動地圖。

**現狀**：已有 postMessage embed code，但使用者需要貼 HTML+JS。Markdown 平台（Medium, HackMD, Notion）不支援 script tag。

**構想**：
- 提供簡單的 iframe URL（不需 script）
- 把 project data 壓縮到 URL hash 裡
- 或者提供 oEmbed endpoint 讓平台自動 embed

**待討論**：
- URL 長度限制（Firefox 65KB）vs 照片大小
- oEmbed 需要後端
- 可能需要一個中間頁面負責解碼+渲染

---

### 8. 自動生成 Story Page

**背景**：目前 Story Page 的 index.html 是手寫的。如果故事超過 10 個，手動維護 story.json + index.html 很累。

**構想**：
- 從 story.json 自動生成 index.html（build script）
- 或者做成 SPA（一個 index.html 動態載入 story.json）

**待討論**：
- 自動生成 vs SPA — SEO 考量（靜態 HTML 對 OG 比較好）
- 什麼時候真的需要？（目前只有 1 個故事集）

---

### 9. Editor 音樂設定

**背景**：目前只有 Player 的設定面板可以填音樂 URL。Editor 的 ⚙ 面板沒有。

**構想**：
- Editor ⚙ 面板加「背景音樂」section
- 音樂 URL + 自動播放 checkbox
- 存在 project.music

**待討論**：
- Editor 本身要不要播音樂？還是只是設定（Player 播）？
- 如果 Editor 也播，跟 Player 的音樂可能重複

---

## 已決定不做

| 功能 | 理由 | 決定時間 |
|------|------|---------|
| Cover Mode（區域遮蓋） | 需求不大 | 2026-04 |
| Slideshow 播放模式 | scope 不符，Player 已有 fly-to | 2026-04 |
| 自訂 Emoji icon | 跨平台渲染不一致 | 2026-04 |
| photoY 垂直偏移 | schema 變更成本高 | 2026-04 |
| 手機底部浮動卡片+上滑手勢 | 複雜度高，目前 mobile 體驗可接受 | 2026-04 |
| ?url= 外部 JSON 載入 | CORS 問題，安全風險 | 2026-04 |
| postMessage API（雙向） | 太複雜，embed 用 postMessage 單向即可 | 2026-04 |
| 3x 解析度匯出 | 固定 2x，未來桌機版再考慮 | 2026-04 |

---

## 技術債（低優先，不急）

- `createBasemapLayer` 在 BasemapSwitcher 和 PlayerBasemapSwitcher 各一份（提取到 basemapLayer.ts 了但 import 仍各自 leaflet）
- Player bundle 包含 protomaps-leaflet（靜態 import，無法 tree-shake）
- MapView.css 被 Player import 但有 dead CSS（~195 行）
- `expandProject` 的 cardOffset 硬編碼 `{ x:0, y:-60 }` 而非 DEFAULT_CARD_OFFSET — 已修
- Protomaps API key 建議加 domain 白名單（incompetech 前端 key 設計如此，但仍建議限制）
