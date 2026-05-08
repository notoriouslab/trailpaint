# TrailPaint 路小繪

[English](README.en.md) | [日本語](README.ja.md)

> **手繪風路線地圖工具** · 出門玩、回家製圖、分享成品 · 零後端、PWA 可裝機、三語自動偵測

[![Version](https://img.shields.io/badge/version-1.4-orange.svg)](https://trailpaint.org/app/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-5a0fc8.svg)](https://trailpaint.org/app/)
[![i18n](https://img.shields.io/badge/i18n-中文%20%7C%20EN%20%7C%20日本語-green.svg)](https://trailpaint.org/app/)
[![Star History](https://img.shields.io/github/stars/notoriouslab/trailpaint?style=social)](https://star-history.com/#notoriouslab/trailpaint&Date)

**[立即使用 →](https://trailpaint.org/app/)** · **[探索故事地圖 →](https://trailpaint.org/stories/)** · **[Story Player →](https://trailpaint.org/app/player/)** · **[PWA 安裝 →](https://trailpaint.org/features/install/)**

![TrailPaint Editor](./examples/trailpaint-hero.jpg)

---

## 核心定位

TrailPaint 把「回憶一趟路線」變成「3 分鐘製圖 → 一鍵分享」的體驗。無論是登山、旅遊、教學、宣教，只要有故事、有地點、有照片，就能用 TrailPaint 生成一張插畫風地圖。

**核心特色：**

| 特色 | 實現方式 |
|------|--------|
| 📷 **照片直匯** | EXIF GPS 自動抓座標，KML / GeoJSON / GPX 也支援 |
| 🖼️ **多種輸出** | PNG（IG / 部落格）/ 備份檔 / 互通格式 |
| ⏱ **時空敘事** | 年代滑桿 + 歷史地圖疊加 + 自動導覽故事 |
| 🔐 **隱私優先** | 零後端、所有資料在瀏覽器、可離線使用 |
| 📱 **應裝即裝** | PWA，一鍵安裝到手機主畫面 |

![TrailPaint 成品 — 台北士林區 8 個景點路線](./examples/trailpaint-01.jpg)

---

## 快速開始（3 步）

### 方案 1：直接玩（最快 1 分鐘）

1. 開啟 [trailpaint.org/app/](https://trailpaint.org/app/)
2. 點下拉選單「載入範例」，選一條路線（陽明山、合歡山、台北古蹟等）
3. 點「匯出」→「圖片」，選樣式、下載 PNG

**輸出：** IG-ready 插畫風地圖

### 方案 2：手工製作（5 分鐘）

1. 開啟編輯器，搜尋地點或拖截圖換底圖
2. 點「加景點」放標記，拖曳描繪路線
3. 點「匯出」選樣式下載

**輸出：** 自製地圖或短網址分享

### 方案 3：匯入現有路線（1 分鐘）

1. 準備 GPX（登山 App）、KML（Google My Maps）、或 照片資料夾
2. 點「匯入」→ 拖拽或選檔案
3. 系統自動建立景點 → 點「匯出」

**輸出：** 自動製圖

---

## 常見使用路徑

| 場景 | 操作 | 輸出 |
|------|------|------|
| 🎒 **登山者** | 手機錄 GPX → 匯入 → 標景點 → 海拔剖面 | 路線檔（分享隊友） |
| 📸 **旅遊部落客** | 拍照 20 張（含 EXIF GPS） → 拖進 TrailPaint → 加標題敘述 | IG Story / 9:16 長圖 |
| ⛪ **宣教教學** | 載入「馬偕宣教足跡」或「耶穌受難週」 → Story Player 年代滑桿 + 歷史地圖 → 播放講解 | 投影、教案嵌入 |
| 🌲 **生態導覽** | 手工標景點 + 上傳物種照片 → 加說明卡 → 匯出 KML 給 Google My Maps | 導覽地圖檔 |
| 🎨 **故事創作** | 虛構路線 → 用 AI 提示詞生成插圖 → 嵌入部落格 | Notion / WordPress 嵌入 iframe |

---

## 核心概念

### 建立路線：三種管道

#### 📷 從照片自動建（最快 1 分鐘）
拍 20 張照片（含 EXIF GPS）→ 拖進 TrailPaint → 系統自動抓座標、補景點名稱。支援 iPhone HEIC / Android JPEG、反向地理編碼、無 GPS 照片拖曳定位。

#### 🗺️ 在地圖上手動繪（經典流程）
搜尋地點 → 點「加景點」放標記 → 填名稱和照片 → 點「畫路線」描繪 → 匯出。首次使用有引導教學，也可一鍵載入 8 條範例路線試玩。

#### 🤖 用 AI 生成
點「匯入」→「用 AI 製作路線 JSON」→ 複製提示詞貼給 ChatGPT / Claude → AI 生成可匯入的 JSON。適合規劃階段或虛構創作。

**支援匯入格式：** GPX（登山 App）、KML（Google My Maps）、GeoJSON（geojson.io）、.trailpaint 存檔、截圖作為底圖

![匯入對話框](./examples/import-wizard.jpg)

---

### 輸出：一張地圖，多種成品

#### 🖼️ 圖片輸出（用於分享）

**PNG 比例：** 1:1（IG feed）/ 9:16（Story）/ 4:3 / 原始

**邊框 + 濾鏡：** 3 種邊框（經典雙框 / 紙感手繪 / 極簡細框）× 2 種濾鏡（原始 / 素描）

**分享與嵌入：**
- 🔗 短網址（Cloudflare Workers + KV，TTL 90 天，OG 封面自動用第一張照片）
- 📋 iframe embed code — 貼到 WordPress、Notion、Substack 等平台

![匯出 - 圖片 tab](./examples/export-wizard-image.jpg)

#### 💾 備份檔（用於修改）

下載 .trailpaint 專案檔（保留所有景點、路線、照片、編輯狀態）→ 換機或重灌時匯入恢復。

#### 🌐 互通格式（給其他工具用）

- **GeoJSON**：geojson.io、Mapbox、D3 視覺化
- **KML**：Google My Maps、Google Earth、Gaia GPS

純地理資料結構，不含照片。

---

### Story Player：讓地圖說故事

**[Story Player](/app/player/)** 是獨立播放入口，把靜態地圖變成自動導覽體驗：

#### 核心播放功能

| 功能 | 用途 |
|------|------|
| ▶ **Fly-to 動畫** | 逐點飛過去、popup 展示照片和說明 |
| ⚙ **播放設定** | 間隔 2s/4s/6s/8s，迴圈 1×/2×/3×/∞ |
| 🗺️ **底圖 + 歷史圖層** | 5 種底圖 + 中研院歷史地圖（西漢/唐/南宋/元/明） + 台灣 1897/1921/1966 + AD 200 羅馬地圖 |
| 🎵 **背景音樂** | 貼 MP3/M4A 直連網址播放 |
| 📺 **全螢幕模式** | 展場/教學投影/活動展示最佳化 |

#### 精選故事地圖（v1.4 新增）

- **台灣宣教士腳蹤**：馬偕、巴克禮等 19-20 世紀宣教士的在台路線 + 中研院歷史地圖疊加
- **耶穌受難週**：12+ 聖經地點 + 古典畫作 + YouVersion 經文連結
- **保羅宣教三次旅行**：34 景點、AD 46-62 地中海與羅馬
- **絲路 2000 年**：張騫 BC 138 → 玄奘 AD 629 → 馬可波羅 AD 1271，同條中亞走廊三段足跡

![Story Player — 耶穌受難週自動導覽](./examples/trailpaint-02.jpg)

#### ⏱ 年代滑桿（TimeSlider）

地圖頂部水平滑桿，拖動時自動 cross-fade 切換歷史地圖底圖，同時根據景點年代漸隱不相關標記。可切換「歷史地圖」或「聖經敘事」兩組刻度。

#### 📚 合輯（Compilation）

多個故事段落綁成一個 Player：
- `sequential`：依故事順序播
- `chronological`：依年代全域排序（跨人物混編）

預設三個合輯：保羅三次旅行 / 四福音地圖 / 絲路 2000 年。

![絲路 2000 年合輯 — 跨故事 chronological 排序](./examples/silk-road-2000-compilation.jpg)

#### 📮 IG 方圖明信片

每個景點一鍵生成 1080×1080 PNG：
- 上半：地圖（自動縮放看清古地圖紋路）
- 中段：景點卡（照片 + 標題 + 經文 + 描述）
- 下方：年代印章（「公元 1897 年」/ 「AD 50」/ 「西暦 X 年」）+ 浮水印

智慧 fallback：景點不在當前地理範圍時，自動切回現代底圖。

![馬偕宣教足跡 1897 年五股坑明信片](./examples/postcard-mackay-1897.jpg)

#### ⛪ 教會版落地頁（`/church/`）

預設嵌入範例：主日學四福音 / 週報保羅三次 / 個人靈修絲路 2000。Player 一鍵複製 iframe embed code。

---

### AI 風格化

匯出 PNG → 複製 AI 提示詞 → 丟給 ChatGPT / Gemini 的圖像生成功能，產出真正手繪風插圖。

4 種風格提示詞預設：日系手繪 / 藏寶圖 / 療癒卡通 / 極簡線條。

![AI 風格化成品](./examples/Gemini_Generated_Image.jpg)

---

---

## 進階參考

### 完整功能表

| 類別 | 功能 |
|------|------|
| **底圖與標記** | 5 種線上地圖（標準 / 衛星 / 等高線 / 暗色 / 多語向量）· 拖曳截圖自訂底圖 · 31 種景點圖示 · 手繪風虛線 + 箭頭 · 紙感景點卡片 |
| **資料處理** | GPX / KML / GeoJSON 匯入（自動簡化）· 照片 EXIF GPS 匯入（iPhone HEIC / Android JPEG）· 海拔剖面圖（距離/時間/累計爬升下降）· 反向地理編碼自動命名 |
| **編輯與互動** | Undo/Redo（Cmd+Z）· 拖曳編輯節點 · 景點排序 · 手繪搖晃 SVG filter · Fit All 全覽 |
| **匯出與分享** | PNG 多比例裁切 · 3 種邊框 + 2 種濾鏡 · 短網址（OG 預覽自動用照片）· Player 嵌入 iframe · GeoJSON / KML 純地理結構 · .trailpaint 完整備份 |
| **體驗優化** | PWA 可安裝 · 三語自動偵測 · 手機浮動選單 · 引導教學 · 8 條範例路線 |

### 使用的外部服務

| 服務 | 用途 | 連結 |
|------|------|------|
| Leaflet | 地圖引擎 | [leafletjs.com](https://leafletjs.com) |
| OpenStreetMap | 地圖資料（當地語言標籤） | [openstreetmap.org](https://www.openstreetmap.org) |
| Protomaps | 多語向量地圖圖磚 | [protomaps.com](https://protomaps.com) |
| CARTO | 地圖圖磚 | [carto.com](https://carto.com) |
| Photon | 地點搜尋與反向地理編碼（主） | [photon.komoot.io](https://photon.komoot.io) |
| Nominatim | 反向地理編碼（備援） | [nominatim.org](https://nominatim.openstreetmap.org) |
| Open-Meteo | 海拔資料 | [open-meteo.com](https://open-meteo.com) |
| Cloudflare Workers + KV | 分享連結短網址（TTL 90 天） | [workers.cloudflare.com](https://workers.cloudflare.com) |
| 中研院 | 台灣歷史地圖 1897/1921/1966 | [gis.sinica.edu.tw](https://gis.sinica.edu.tw) |

---

## 整合與生態

### 官網入口

| 頁面 | 用途 |
|------|------|
| [`/app/`](https://trailpaint.org/app/) | **Editor** — 主編輯器（新建、匯入、手工繪製） |
| [`/app/player/`](https://trailpaint.org/app/player/) | **Story Player** — 自動導覽播放（含年代滑桿、合輯、音樂） |
| [`/stories/`](https://trailpaint.org/stories/) — 精選故事集（台灣宣教士、耶穌受難週、保羅三次、絲路 2000 年等） |
| [`/examples/`](https://trailpaint.org/examples/) | 範例路線集合（一鍵試玩） |
| [`/features/`](https://trailpaint.org/features/) | 功能介紹（匯入 / 匯出 / Story Player / AI 提示詞） |
| [`/features/install/`](https://trailpaint.org/features/install/) | PWA 安裝教學（iOS / Android / 桌面） |
| [`/church/`](https://trailpaint.org/church/) | 教會版落地頁（主日學、週報、靈修嵌入示範） |
| [`/faq/`](https://trailpaint.org/faq/) | 常見問答 |
| [`llms.txt`](https://trailpaint.org/llms.txt) / [`agent-card.json`](https://trailpaint.org/.well-known/agent-card.json) | AI 與 Agent 讀的結構化摘要 |

### 與 notoriouslab 其他項目的關係

- **doc-cleaner**：PDF/PPTX/Word 文件清理 → 產出內容可用於 TrailPaint 的景點說明
- **OpenSpec**：規格管理工具（TrailPaint 的 Spectra SDD 規格在此）
- **bu-ketao**：中文 LLM 輸出壓縮（故事地圖的描述文字可用此規則精簡）

---

## 技術細節

### 核心技術棧

| 層級 | 技術 |
|------|------|
| **前端框架** | Vite + React 19 + TypeScript 5（strict mode） |
| **地圖引擎** | Leaflet + react-leaflet + protomaps-leaflet（向量圖磚） |
| **狀態管理** | Zustand + zundo（temporal undo/redo） |
| **PWA** | vite-plugin-pwa + Workbox（離線支援） |
| **Export** | html-to-image + Canvas 後處理 + SVG 風格濾鏡 |
| **Import** | exifr（EXIF GPS）+ @tmcw/togeojson（KML） + 自建 GeoJSON parser |
| **i18n** | 自建 t() 函數 + runtime locale 偵測 |
| **構架分層** | `core/`（邏輯、不依賴 Leaflet）· `map/`（Leaflet 整合層）· `player/`（獨立入口） |

### 建置與部署

- **Editor + Player**：Vite rollup multi-entry（`/app/` + `/app/player/`）
- **Story Page**：純靜態 HTML + vanilla JS（天然 SEO/OG，不經 Vite）
- **Cloudflare Worker**：短網址分享連結（KV 儲存，TTL 90 天）

---

## 開發與貢獻

---

### 快速啟動

```bash
cd online
npm install
npm run dev        # 開發伺服器（:5173）
npm run build      # 打包到 ../app/
npm test           # vitest
```

**Cloudflare Worker** 程式碼：[`cloudflare/`](./cloudflare/) 目錄，部署方式見該 README。

**Spectra SDD 規格**：`openspec/changes/`（本地開發參考，不進 git）

---

## 分享作品

用 TrailPaint 做了一張滿意的路線地圖？透過 [GitHub Issue](https://github.com/notoriouslab/trailpaint/issues) 分享你的 `.trailpaint` 專案檔、匯出成品圖，以及故事（這是哪條路線？為什麼走？）。

優秀作品會被推薦展示在 [`/stories/`](https://trailpaint.org/stories/)，讓更多人看到。

---

## 貢獻

我們非常歡迎：
- 🐛 Bug 回報（含複現步驟、截圖）
- 💡 功能建議（新輸出格式、新底圖、新故事主題）
- 🎨 作品分享（見上方「分享作品」）
- 📝 文件改進
- 🔧 程式碼 PR

---

## 免責聲明

TrailPaint 是**路線記錄與分享工具，不是導航軟體**。

- 距離、時間、海拔等數據根據地圖與 GPX 軌跡自動推算，可能與實際狀況有出入
- 戶外活動請自行做好行前規劃，並以現場實際狀況為準
- 地圖底圖資料來自 OpenStreetMap / CARTO 等第三方服務，不保證即時或完全正確

---

## 授權

**GPL-3.0 License** — 自由使用、修改、衍生創作。衍生作品必須同樣以 GPL-3.0 開源。

詳見 [LICENSE](LICENSE) 文件。

---

[![Star History Chart](https://api.star-history.com/svg?repos=notoriouslab/trailpaint&type=Date)](https://star-history.com/#notoriouslab/trailpaint&Date)

---

*TrailPaint 路小繪的原型由台北靈糧堂致福益人學苑公園生態探索、專業戶外生態導覽需求啟發。🌿*
