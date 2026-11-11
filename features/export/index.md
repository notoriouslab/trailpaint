# 匯出 Export

> TrailPaint 匯出功能 reference：PNG 多比例插畫（IG / 限動 / 4:3 / 原比例）、.trailpaint 備份、GeoJSON / KML 互通、Cloudflare 短網址分享、Player 嵌入碼。

URL: https://trailpaint.org/features/export/
Parent: https://trailpaint.org/features/
Language: zh-TW

統一的 ExportWizard 入口，三 tab 分類：圖片、備份、互通。分享連結內建在圖片 tab。

![ExportWizard 圖片 tab 截圖](https://trailpaint.org/examples/export-wizard-image.jpg)

## 圖片 Tab — PNG 插畫

匯出手繪風 PNG 地圖插畫。

### 比例選項

- **原比例**：跟目前地圖視窗比例一致
- **1:1（IG feed）**：Instagram 方形貼文
- **9:16（限動）**：Instagram / Facebook Story、TikTok
- **4:3**：列印或簡報常用比例

### 邊框風格

- **經典雙邊**：外粗內細雙層
- **紙張素描**：粗筆手繪邊
- **最小細邊**：單一細邊

### 濾鏡

- **原始**：地圖底圖照常
- **極簡線條**：CSS filter 把底圖變成鉛筆線條風，景點卡與路線保持原色

### 選用項目

- 統計資訊覆蓋（總距離、時間、景點數）
- 固定 DPR 2x 匯出（iOS 自動降級為 1x 避免 canvas 上限）

## 圖片 Tab — 分享連結 Share Link

![ExportWizard 分享按鈕位置](https://trailpaint.org/examples/export-wizard-backup.jpg)

按「複製分享連結」會：

1. 前端 deflate 壓縮完整專案（含照片）成 base64 hash
2. POST 到 `https://trailpaint.org/api/s`（Cloudflare Worker + KV）
3. Worker 產 12 字元隨機 ID，存 KV（TTL 90 天），回傳 `https://trailpaint.org/s/<id>`
4. 複製到剪貼簿；Safari 透過 ClipboardItem + pending promise pattern 突破 user gesture 限制

**社交媒體預覽**：貼到 LINE / Facebook / Threads / X / Slack 時自動顯示：

- og:title：專案名稱
- og:image：第一個有照片的景點（無 cover 時 fallback 品牌預覽圖）

**降級鏈**：後端失敗時自動退回長 hash URL（`/app/#share=...`）。

## 備份 Tab — .trailpaint 完整專案檔

![ExportWizard 備份 tab](https://trailpaint.org/examples/export-wizard-backup.jpg)

下載一個 `.trailpaint.json` 檔，內含：

- 全部景點 + 路線 + 照片（base64 data URL）
- 地圖中心 + zoom + 底圖選擇
- 音樂 URL 與自動播放設定
- Schema version（目前 v3），未來版本會自動 migrate

用途：永久備份（不像分享連結 90 天過期）、跨裝置遷移、版本控管（git 追蹤）。

## 互通 Tab — GeoJSON / KML

![ExportWizard 互通 tab](https://trailpaint.org/examples/export-wizard-interop.jpg)

匯出給其他工具使用的純地理結構（**不含照片**，遵守 open data 邊界）。

- **GeoJSON**：給 [geojson.io](https://geojson.io)、Google Takeout、Mapbox 等
- **KML**：給 [Google My Maps](https://www.google.com/maps/d/)、Google Earth、[Gaia GPS](https://www.gaiagps.com/) 等

## Player 嵌入碼（HTML iframe）

「互通分享」tab 裡的「複製 Player 嵌入碼」產一段 `<iframe>`，可貼到部落格、教會網站、Notion。詳見 [故事地圖](https://trailpaint.org/features/story-mode/)。

[立即試用](https://trailpaint.org/app/) [看故事地圖 →](https://trailpaint.org/features/story-mode/)
