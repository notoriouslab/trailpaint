# TrailPaint 路小繪

[English](README.en.md) | [日本語](README.ja.md)

> 手繪風路線地圖 · 從照片、地圖、AI 三種方式建立 · 一鍵輸出 PNG / 備份 / 互通格式

[![Version](https://img.shields.io/badge/version-1.3.0-orange.svg)](https://trailpaint.org/app/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-5a0fc8.svg)](https://trailpaint.org/app/)
[![i18n](https://img.shields.io/badge/i18n-中文%20%7C%20EN%20%7C%20日本語-green.svg)](https://trailpaint.org/app/)

**[立即使用 →](https://trailpaint.org/app/)** · **[探索故事地圖 →](https://trailpaint.org/stories/)** · **[Story Player →](https://trailpaint.org/app/player/)**

![TrailPaint Editor](./examples/trailpaint-hero.jpg)

---

## 這是什麼？

TrailPaint 路小繪是一款**手繪風路線地圖工具**。出去走一趟，回來幾分鐘就能把路徑、景點、照片變成一張可以印出來、分享到 IG、嵌入部落格的**插畫風地圖**。

- **零後端、零帳號**：所有資料在瀏覽器，按匯入就是你的地圖
- **支援 PWA**：裝到手機主畫面像 App 一樣用（[iOS / Android / 桌面安裝步驟](https://trailpaint.org/features/install/)）
- **三語自動偵測**：中文 / English / 日本語
- **開源 GPL-3.0**：自由使用、修改、二次創作

### 成品範例

![TrailPaint 成品 — 台北士林區 8 個景點路線](./examples/trailpaint-01.jpg)

---

## 三種建立路線的方式

### 📷 從照片建立（最快）

出門玩拍 20 張照片 → 拖進 TrailPaint → EXIF GPS 自動建立景點。**這是從 v1.3 開始的新能力**，把「回家後再對 Google Maps 查座標」這段痛苦消掉。

支援：
- iPhone HEIC 照片 EXIF GPS
- Android JPEG
- 無 GPS 照片：自動歸入「待定位」分組，拖一下就到位
- 地名浮現：Photon（主）/ Nominatim（備援）反向地理編碼自動補上景點標題

![匯入你的路線地圖](./examples/import-wizard.jpg)

上面這個匯入對話框還支援：**KML**（Google My Maps 匯出格式）、**GeoJSON**（geojson.io、Google Takeout）、**GPX**（登山 App 軌跡）、**自家 .trailpaint 專案**、截圖底圖。

### 🗺️ 在地圖上手動建

經典流程，最適合邊看地圖邊回憶路線：

1. 搜尋地點 或 拖曳截圖到畫面換底圖
2. 點「加景點」放標記，填入名稱、照片
3. 點「畫路線」描繪路徑
4. 點「匯出」下載成品

首次使用有 3 步引導教學。也可以從下拉選單載入 **8 條範例路線**（陽明山、合歡山、抹茶山、嘉明湖、九份、阿朗壹、白石湖、倫敦博物館之旅）一鍵試玩。

### 🤖 用 AI 生成

點「匯入」→「🤖 用 AI 製作路線 JSON」→ 複製提示詞模板，貼給 ChatGPT 或 Claude，描述你的行程，AI 就會生成可匯入的 JSON。適合沒出門過的規劃階段或虛構路線。

---

## 一張地圖，多種輸出

v1.3 把所有輸出統一成單一「匯出 Wizard」，三個 tab 對應三種使用情境：

### 🖼️ 圖片（給人看、給網路看）

![匯出 - 圖片 tab](./examples/export-wizard-image.jpg)

- **PNG 下載**：1:1（IG feed）/ 9:16（Story）/ 4:3 / 原始比例
- **3 種邊框**：經典雙框 / 紙感手繪 / 極簡細框
- **風格濾鏡**：原始 / 素描
- **即時預覽 + 構圖微調**：方向鍵平移、縮放
- **🔗 分享連結**：Cloudflare Workers + KV 短網址，TTL 90 天，照片會跟著一起分享，LINE / Facebook 預覽自動以第一張照片當 Open Graph 封面
- **🤖 AI 提示詞**：4 種風格（日系手繪 / 藏寶圖 / 療癒卡通 / 極簡線條），複製貼給 Midjourney / Gemini 產出純手繪風
- **📋 Player 嵌入碼**：一鍵複製含專案資料的 `<iframe>`，貼到 WordPress、Notion、Substack

### 💾 備份（自己用）

![匯出 - 備份 tab](./examples/export-wizard-backup.jpg)

- **下載 .trailpaint 存檔**：完整保留所有景點、路線、照片
- **匯入 .trailpaint**：還原編輯
- 這是你的原始檔案格式，換機、重灌、另存為草稿都靠它

### 🌐 互通格式（給其他工具用）

![匯出 - 互通 tab](./examples/export-wizard-interop.jpg)

- **GeoJSON**：geojson.io、Mapbox、D3 視覺化
- **KML**：Google My Maps、Google Earth、Gaia GPS
- 純地理結構，不含照片（open data 邊界）

---

## Story Player：把地圖變成故事

![Story Player — 耶穌受難週自動導覽](./examples/trailpaint-02.jpg)

**[/app/player/](https://trailpaint.org/app/player/)** 是獨立入口，專門做「自動導覽播放」：

- **▶ fly-to 動畫**：逐點飛過去、popup 展示照片和說明
- **⚙ 播放設定**：間隔 2s/4s/6s/8s，循環 1×/2×/3×/∞
- **🗺️ 底圖切換 + 歷史地圖疊加**：5 種底圖 + 中研院 1897/1921/1966 歷史圖層
- **🎵 背景音樂**：填入 MP3/M4A 直連網址即可播放（推薦 [incompetech.com](https://incompetech.com/music/royalty-free/music.html) 免費 CC BY）
- **📺 全螢幕**：適合展場、教學投影、活動展示

### Story Page：`/stories/` 故事集合

展示精選故事地圖：
- **台灣宣教士腳蹤**：馬偕、巴克禮、蘭大衛、馬雅各、彭蒙惠 等 19-20 世紀宣教士的在台路線，搭配中研院歷史地圖疊加
- **耶穌受難週**：從榮耀進城到復活顯現共 12+ 個聖經地點，搭配達文西、卡拉瓦喬、林布蘭等古典畫作，聖經經文連結到 YouVersion

橫向 tabs 切換不同人物路線，LINE / FB 分享自動顯示 OG 縮圖。

---

## 想要真手工繪圖風格？

匯出 PNG + 複製 AI 提示詞 → 丟給 ChatGPT / Gemini 的建立圖像功能：

![AI 風格化成品](./examples/Gemini_Generated_Image.jpg)

---

## 適合誰用

| 族群 | 用途 |
|------|------|
| 🎒 登山健行 | 路線規劃、GPX 匯入、海拔剖面 |
| 🚲 單車騎行 | 路線標記、距離統計 |
| 📸 旅遊部落客 | IG / Story 分享卡匯出 |
| 🌲 生態導覽 | 景點標記、解說卡片、照片 |
| 🏫 教育單位 | 環境教育、課程教材、歷史地圖 |
| ⛪ 教會 / NGO | 宣教士腳蹤、服事路線故事 |

---

## 功能一覽

### 底圖與標記
5 種線上地圖（標準 / 衛星 / 等高線 / 暗色 / 多語向量）· 拖曳截圖作為底圖 · 手繪風虛線 + 箭頭 · 紙感景點卡片 · 31 種景點圖示 · 拖曳節點編輯路線 · 5 色路線循環

### 資料處理
GPX 匯入（軌跡 + 航點自動簡化）· **照片 EXIF 匯入（JPEG/HEIC 含 GPS）** · **KML / GeoJSON 匯入** · 海拔剖面圖（距離/時間/累計爬升下降）· 路線反向地理編碼自動命名 · JSON 存檔完整回存

### 匯出
**統一 ExportWizard**（圖片 / 備份 / 互通三 tab）· 多比例裁切即時預覽 · 3 種邊框 + 2 種濾鏡 · 統計 overlay · Cloudflare Workers + KV 短網址（TTL 90 天、OG 封面照） · AI 提示詞 4 種風格 · Player 嵌入碼 · GeoJSON / KML 純地理結構

### 體驗
Undo/Redo（Cmd+Z）· 手繪搖晃 SVG filter · PWA 可安裝 · 三語自動偵測 · 手機底部浮動選單 · Fit All 全覽 · 景點拖曳排序 · 首次使用引導教學

### Story Player
自動播放 · 底圖切換 + 歷史圖層 · 背景音樂 · 全螢幕 · Player 嵌入碼 · Editor → Player 一鍵跳

---

## 使用的服務

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

## 官網架構

除了 Editor / Player，trailpaint.org 還有幾個入口可直接連結、嵌入、分享：

- [`/features/`](https://trailpaint.org/features/) — 功能一覽（匯入 / 匯出 / Story Player / AI 提示詞 / PWA 安裝）
- [`/features/install/`](https://trailpaint.org/features/install/) — **PWA 安裝教學**（iOS Safari / Android Chrome / 桌面）
- [`/examples/`](https://trailpaint.org/examples/) — 範例路線集合，一鍵播放或下載
- [`/stories/`](https://trailpaint.org/stories/) — 主題故事集合（台灣宣教士、耶穌受難週）
- [`/faq/`](https://trailpaint.org/faq/) — 完整 FAQ
- [`llms.txt`](https://trailpaint.org/llms.txt) / [`agent-card.json`](https://trailpaint.org/.well-known/agent-card.json) — 給 AI 與代理人讀的結構化摘要

---

## 技術架構

- **框架**：Vite + React 19 + TypeScript 5（strict）
- **地圖**：Leaflet + react-leaflet + protomaps-leaflet（CARTO + Protomaps 向量圖磚）
- **狀態**：Zustand + zundo（temporal undo/redo）
- **PWA**：vite-plugin-pwa + Workbox
- **匯出**：html-to-image + Canvas 後處理 + 風格濾鏡
- **匯入**：exifr（EXIF GPS，含 HEIC）+ @tmcw/togeojson（KML）+ 自建 GeoJSON parser
- **i18n**：自建 t() + runtime locale 偵測
- **結構**：`core/`（不依賴 Leaflet）· `map/`（Leaflet 整合層）· `player/`（Story Player 獨立入口）
- **Story Page**：純靜態 HTML + vanilla JS（不經 Vite，天然 SEO/OG）
- **Multi-page build**：Vite rollup multi-entry（Editor `/app/` + Player `/app/player/`）

---

## 開發

```bash
cd online
npm install
npm run dev        # 開發伺服器
npm run build      # 打包到 ../app/
npm test           # vitest
```

分享連結的 Cloudflare Worker 程式碼放在 [`cloudflare/`](./cloudflare/)，部署方式見該目錄 README。

Spectra SDD 規格文件：`openspec/changes/`（不進 git，本地參考）

---

## 分享你的路線地圖

用 TrailPaint 做了一張滿意的？把你的 `.trailpaint` 專案檔透過 [Issue](https://github.com/notoriouslab/trailpaint/issues) 分享，附上匯出成品圖和故事（這是哪條路線？為什麼走？）。優秀作品會展示在 `/stories/`，讓更多人看到。

## 貢獻

歡迎 PR 和 Issue。回報 bug、建議功能、分享作品都非常歡迎。

## 免責聲明

TrailPaint 是**路線記錄與分享工具，不是導航軟體**。距離、時間、海拔等數據根據地圖與 GPX 軌跡自動推算，可能與實際狀況有出入。戶外活動請自行做好行前規劃，並以現場實際狀況為準。地圖底圖資料來自 OpenStreetMap 等第三方服務，不保證即時或完全正確。

## 授權

GPL-3.0 License — 自由使用與修改，衍生作品必須同樣以 GPL-3.0 開源。

---

*TrailPaint 路小繪的原型由台北靈糧堂致福益人學苑_公園生態探索、專業戶外生態導覽需求啟發。🌿*
