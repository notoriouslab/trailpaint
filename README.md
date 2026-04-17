# TrailPaint 路小繪

[English](README.en.md) | [日本語](README.ja.md)

> 最漂亮的路線圖產出工具 — 匯出即插畫，簡單好用不複雜

[![Version](https://img.shields.io/badge/version-1.2.0-orange.svg)](https://trailpaint.org/app/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-5a0fc8.svg)](https://trailpaint.org/app/)
[![i18n](https://img.shields.io/badge/i18n-中文%20%7C%20EN%20%7C%20日本語-green.svg)](https://trailpaint.org/app/)
[![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-222.svg)](https://trailpaint.org/app/)

**[立即使用 →](https://trailpaint.org/app/)** · **[探索故事地圖 →](https://trailpaint.org/stories/)** · **[Story Player →](https://trailpaint.org/app/player/)**

---

## 這是什麼？

TrailPaint 路小繪 是一款手繪風格的路線地圖製作工具。使用線上地圖或上傳截圖，幾分鐘就能產出一張可分享的漂亮插畫地圖。

支援 PWA，可安裝到手機主畫面像 App 一樣使用。中文 / English / 日本語 自動偵測。

![trailpaint/examples/trailpaint-map.jpg](./examples/trailpaint-map.jpg)

## 適合誰用？

| 族群 | 用途 |
|------|------|
| 🎒 登山健行 | 路線規劃、GPX 匯入、海拔剖面 |
| 🚲 單車騎行 | 路線標記、距離統計 |
| 📸 旅遊部落客 | IG / Story 分享卡匯出 |
| 🌲 生態導覽 | 景點標記、解說卡片、照片 |
| 🏫 教育單位 | 環境教育、課程教材 |

---

## 使用方式

```
1. 搜尋地點 或 拖曳截圖到畫面換底圖
2. 點「加景點」在地圖上放置標記，填入名稱、照片
3. 點「畫路線」描繪路徑，按「完成路線」
4. 點「匯出」打開預覽頁，選擇比例、邊框、風格濾鏡，下載 PNG
```

首次使用有 3 步引導教學，也可以從下拉選單載入 8 條範例路線試玩（含倫敦博物館之旅）。

### 用 AI 製作路線 JSON

點「匯入」→「🤖 用 AI 製作路線 JSON」→ 複製提示詞模板，貼給 ChatGPT 或 Claude，描述你的行程，AI 就會生成可匯入的 JSON 檔案。

---

## 功能

### 底圖

- 🗺️ **線上地圖** — OpenStreetMap 即時地圖，5 種底圖切換（標準/衛星/等高線/暗色/多語向量）
- 📷 **上傳截圖** — 拖曳 Google Maps / Apple Maps 截圖到畫面，自動切換截圖模式
- 🔍 **地名搜尋** — 搜尋任何地點，地圖自動飛過去
- ◎ **定位** — 一鍵定位到目前位置

### 標記

- 🖊️ **路線繪製** — 手繪風虛線 + 箭頭方向，5 色自動循環
- 📍 **景點卡片** — 紙感手繪風，含照片、31 種圖示、拖曳定位
- ✏️ **路線編輯** — 拖曳節點調整、雙擊刪除、換色
- 🔎 **卡片 zoom 縮放** — 卡片隨地圖縮放等比變大/變小
- 👆 **手機拖動** — 手機上可用手指拖動卡片調整位置

### 資料

- 📥 **GPX 匯入** — 解析軌跡 + 航點，大量點自動簡化
- ⛰️ **海拔剖面圖** — 距離/預估時間/累計爬升/下降
- 🔭 **海拔查詢** — 手動畫的路線也能查海拔
- 📏 **路線自動命名** — 反向地理編碼取地名
- 💾 **專案存檔** — JSON 格式，可完整載入繼續編輯

### 匯出

- 📐 **匯出預覽頁** — 即時預覽裁切效果，所有選項集中在一個 overlay
- 🎯 **構圖調整** — 預覽中可用方向鍵平移、縮放微調構圖
- 📐 **多比例** — 1:1（IG feed）/ 9:16（Story）/ 4:3 / 原始比例
- 🖼️ **3 種邊框** — 經典雙框 / 紙感手繪 / 極簡細框
- 🎨 **風格濾鏡** — 原始 / 素描
- 📊 **統計 overlay** — 距離、時間、爬升自動印在圖上
- 🔗 **分享連結** — 一鍵產生可分享的 URL（可選短網址）
- 🤖 **AI 提示詞** — 一鍵複製風格化提示詞，搭配 AI 繪圖使用

### 匯入

- 📥 **匯入 Wizard** — 統一匯入入口：上傳底圖 / 載入 JSON / 匯入 GPX，支援拖曳檔案到視窗
- 🤖 **AI 教學** — 內建 prompt 模板，教你用 AI 生成可匯入的 JSON
- 🌿 **範例路線** — 8 條範例路線（含倫敦博物館之旅），一鍵載入試玩

### 體驗

- ↩️ **Undo/Redo** — Cmd+Z / Ctrl+Z 快捷鍵
- 🌊 **手繪搖晃** — SVG filter 效果
- 📱 **PWA** — 可安裝到手機主畫面，像原生 App 一樣使用
- 🌐 **三語言** — 中文/英文/日文，自動偵測
- ☰ **手機底部選單** — sidebar 收起時，底部浮動選單提供匯出/存/載快捷

### 體驗增強

- 🏁 **一鍵全覽** — Fit All 按鈕，縮放至顯示所有景點與路線（含卡片 bounds 計算）
- ↕️ **景點拖曳排序** — 直接在列表中拖曳景點重新排列

### Story Player 故事播放器

- ▶ **自動播放** — fly-to 動畫逐點導覽，popup 自動展示照片與說明
- ⚙ **播放設定** — 間隔時間（2s/4s/6s/8s）、循環次數（1×/2×/3×/∞）
- 🗺️ **底圖切換 + 歷史地圖疊加** — 5 種底圖 + 中研院 1897/1921/1966 三種歷史圖層
- 🎵 **背景音樂** — 設定面板填入 MP3/M4A 直連網址即可播放，支援自動播放（推薦 [incompetech.com](https://incompetech.com/music/royalty-free/music.html) 免費 CC BY 配樂）
- 📺 **全螢幕** — 適合展場、教學投影、活動展示
- 📋 **複製 Player 嵌入碼** — 一鍵複製含專案資料的 `<iframe>` HTML
- ▶ **故事模式** — Editor 一鍵跳到 Player 播放當前專案

### Story Page 故事集合

- 📖 **故事集合頁** — `/stories/` 展示精選故事地圖
- 👤 **人物切換** — 橫向 tabs 切換不同人物路線
- 🌏 **OG 預覽** — 分享到 LINE/FB 自動顯示標題 + 縮圖
- 📱 **響應式** — 桌面 / 平板 / 手機自適應佈局
- 🇹🇼 **台灣宣教士腳蹤** — 馬偕、巴克禮、蘭大衛、馬雅各、彭蒙惠 5 位宣教士

### 景點圖示（31 種）

🌿植物 🌸花卉 🌲樹木 🐦鳥類 🦋昆蟲 💧水域 🐟魚類 🍄菌類 ⛰️岩石
🚻廁所 🚌站牌 🛋️休憩 ⛺住宿 🥤餐廳 🍺酒吧 ♨️溫泉 🏢商城 🎬電影院 🚲腳踏車 🅿️停車 🩺急救 🏖️海邊 🎠遊樂
△三角點 🚩集合點
🔍觀景 🔭星空 📷拍照 ⚠️注意 ℹ️說明 📍標記

---

## 假如想要更像手工繪圖的風格

匯出後將圖檔結合「複製 AI 提示詞」功能，一起丟給 ChatGPT / Gemini 等 AI Agent 的建立圖像功能，就可以得到囉～

![Gemini_Generated_Image.jpg](./examples/Gemini_Generated_Image.jpg)

---

## 使用的服務

| 服務 | 用途 | 連結 |
|------|------|------|
| Leaflet | 地圖引擎 | [leafletjs.com](https://leafletjs.com) |
| OpenStreetMap | 地圖資料（當地語言標籤） | [openstreetmap.org](https://www.openstreetmap.org) |
| Protomaps | 多語向量地圖圖磚 | [protomaps.com](https://protomaps.com) |
| CARTO | 地圖圖磚 | [carto.com](https://carto.com) |
| Nominatim | 地點搜尋 | [nominatim.org](https://nominatim.openstreetmap.org) |
| Open-Meteo | 海拔資料 | [open-meteo.com](https://open-meteo.com) |
| TinyURL | 短網址服務 | [tinyurl.com](https://tinyurl.com) |

## 離線版

如果需要完全零網路的環境，可下載 [`trailpaint.html`](trailpaint.html) 單一檔案，用瀏覽器開啟即可使用。

> ⚠️ 離線版不包含線上地圖、GPX 匯入、海拔等功能。iOS 無法直接開啟本機 HTML。

---

## 技術架構

- **框架**：Vite + React 19 + TypeScript
- **地圖**：Leaflet + react-leaflet + protomaps-leaflet（CARTO + Protomaps 向量圖磚）
- **狀態**：Zustand + zundo（temporal undo/redo）
- **PWA**：vite-plugin-pwa + Workbox
- **匯出**：html-to-image + Canvas 後處理 + 風格濾鏡
- **i18n**：自建 t() + runtime locale 偵測
- **結構**：core/（不依賴 leaflet）+ map/（Leaflet 整合層）+ player/（Story Player 獨立入口）
- **Story Page**：純靜態 HTML + vanilla JS（不經 Vite，天然 SEO/OG）
- **Multi-page**：Vite rollup multi-entry（Editor `/app/` + Player `/app/player/`）

## 開發

```bash
cd online
npm install
npm run dev        # 開發伺服器
npm run build      # 打包到 ../app/
```

## 分享你的路線地圖

用 TrailPaint 做了一張自己滿意的路線地圖？我們很想看！

把你的 `.trailpaint.json` 專案檔透過 [Issue](https://github.com/notoriouslab/trailpaint/issues) 分享給我們，附上一張匯出的成品圖和簡短描述（這是哪條路線？有什麼故事？）。我們會挑選優秀的作品展示在這裡，讓更多人看到你的創作。

## 貢獻

歡迎 PR 和 Issue！不管是回報 bug、建議功能、還是分享你做的路線地圖，都非常歡迎。

## 免責聲明

TrailPaint 是路線記錄與分享工具，不是導航軟體。距離、時間、海拔等數據根據地圖與 GPX 軌跡自動推算，可能與實際狀況有出入，僅供參考。地圖底圖資料來自 OpenStreetMap 等第三方服務，不保證即時或完全正確。戶外活動請自行做好行前規劃，並以現場實際狀況為準。

## 授權

GPL-3.0 License — 自由使用與修改，衍生作品必須同樣以 GPL-3.0 開源。

---

*TrailPaint 路小繪 的原型由台北靈糧堂致福益人學苑_公園生態探索、專業戶外生態導覽需求啟發。🌿*
