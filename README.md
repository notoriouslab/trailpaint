# TrailPaint 路小繪

[English](README.en.md) | [日本語](README.ja.md)

> 最漂亮的路線圖產出工具 — 匯出即插畫，簡單好用不複雜

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

---

## 立即使用

### 線上版（推薦）

**[打開 TrailPaint](https://notoriouslab.github.io/trailpaint/app/)**

在真實地圖上製作手繪風路線插畫。支援 PWA，可安裝到手機主畫面。

### 離線版

下載 [`trailpaint.html`](trailpaint.html) 單一檔案，用瀏覽器開啟即可，不需要網路。

> ⚠️ iOS 無法直接從「檔案」App 開啟本機 HTML。建議使用線上版。

---

## 這是什麼？

TrailPaint 路小繪 是一款手繪風格的路線地圖製作工具。上傳截圖或使用線上地圖，幾分鐘就能產出一張可分享的漂亮插畫地圖。

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

## 兩個版本比較

| | 線上版 | 離線版 |
|---|-------|--------|
| 底圖 | OpenStreetMap 即時地圖 + 可上傳截圖 | 上傳截圖 |
| GPS 座標 | 有（經緯度） | 無（像素座標） |
| GPX 匯入 | 有 | 無 |
| 海拔資料 | 有（GPX 或 API 查詢） | 無 |
| 地名搜尋 | 有 | 無 |
| 底圖切換 | 標準/衛星/等高線/暗色 | 無 |
| 區域遮蓋 | 無 | 有（磨砂/柔邊/紙紋） |
| 清爽濾鏡 | 無 | 有（水彩風） |
| PWA 安裝 | 有 | 無 |
| 離線使用 | 需先連線快取 | 完全離線 |
| 技術架構 | React + TypeScript + Leaflet | 單檔 HTML + compiled JSX |

---

## 線上版功能

### 核心

- 🖊️ **路線繪製** — 手繪風虛線 + 箭頭方向，5 色自動循環
- 📍 **景點卡片** — 紙感手繪風，含照片、21 種圖示、拖曳定位
- 📷 **截圖底圖** — 拖曳圖片到畫面自動切換，支援 Google Maps 截圖
- 🗺️ **底圖切換** — 標準 / 衛星 / 等高線 / 暗色

### 匯出

- 📐 **多比例匯出** — 1:1（IG）/ 9:16（Story）/ 4:3 / 原始
- 🖼️ **3 種邊框** — 經典雙框 / 紙感手繪 / 極簡細框
- 📊 **統計 overlay** — 距離、時間、爬升自動印在圖上
- 🔍 **高解析** — 1x / 2x / 3x pixelRatio

### 資料

- 📥 **GPX 匯入** — 解析軌跡 + 航點，自動簡化大量點
- ⛰️ **海拔剖面** — Canvas 折線圖，距離/時間/爬升/下降
- 🔭 **海拔查詢** — 手動畫的路線也能查海拔（Open-Meteo API）
- 💾 **存檔載入** — JSON 格式，向後相容

### 體驗

- ↩️ **Undo/Redo** — Cmd+Z 快捷鍵
- 🌊 **手繪搖晃** — SVG filter 效果，可開關
- 🌐 **三語言** — 中文/英文/日文，自動偵測
- 📱 **PWA** — 可安裝到手機主畫面
- 🎓 **使用者引導** — 首次開啟 3 步教學 + 範例專案

### 景點圖示

🌿植物 🌸花卉 🌲樹木 🐦鳥類 🦋昆蟲 💧水域 🐟魚類 🍄菌類 ⛰️岩石
🚻廁所 🚌站牌 🪑休憩 🥤餐廳 🚲腳踏車 🅿️停車 🩺急救
🔭觀景 📷拍照 ⚠️注意 ℹ️說明 📍標記

---

## 使用方式

```
1. 搜尋地點 或 拖曳截圖到畫面
2. 點「加景點」在地圖上放置標記，填入名稱、照片
3. 點「畫路線」描繪路徑，按「完成路線」
4. 選擇匯出格式和邊框風格，下載 PNG
```

---

## 技術架構

### 線上版（`online/`）

- **框架**：Vite + React 19 + TypeScript
- **地圖**：Leaflet + react-leaflet（Carto Voyager 圖磚）
- **狀態**：Zustand + zundo（temporal undo/redo）
- **PWA**：vite-plugin-pwa + Workbox
- **匯出**：html-to-image + Canvas 後處理
- **i18n**：自建輕量 t() + runtime locale 偵測
- **結構**：core/（不依賴 leaflet）+ map/（Leaflet 整合層）

### 離線版（根目錄）

- **框架**：Preact（React compat）+ 純 Browser API
- **渲染**：SVG overlay + Canvas export
- **單檔**：所有 JS/CSS 內嵌在 HTML 中

## 開發

```bash
# 線上版
cd online
npm install
npm run dev        # 開發伺服器
npm run build      # 打包到 ../app/

# 離線版（無需 build）
open trailpaint.html
```

## 已知限制

- 線上版需要網路載入地圖圖磚（PWA 快取後可離線瀏覽已快取區域）
- 截圖↔地圖模式切換會清除景點和路線（座標系統不同）
- iOS 無法開啟本機 HTML 檔案（平台限制，請用線上版）

## 假如想要更像手工繪圖的風格

將匯出的圖檔丟給 ChatGPT / Gemini，下提示詞「製作一個漫畫風格的地圖」，即可產生類似手工繪圖的風格地圖：

![Gemini_Generated_Image.jpg](./examples/Gemini_Generated_Image.jpg)

## 貢獻

歡迎 PR 和 Issue！

## 授權

GPL-3.0 License — 自由使用與修改，衍生作品必須同樣以 GPL-3.0 開源。

---

*TrailPaint 路小繪 的原型由台北靈糧堂致福益人學苑_公園生態探索、專業戶外生態導覽需求啟發。🌿*
