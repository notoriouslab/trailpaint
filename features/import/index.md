# 匯入 Import

> TrailPaint 匯入功能 reference：照片 EXIF GPS（JPEG / HEIC）、KML（Google My Maps）、GeoJSON、GPX（登山 App）、.trailpaint 專案檔、截圖底圖。

URL: https://trailpaint.org/features/import/
Parent: https://trailpaint.org/features/
Language: zh-TW

6 種方式把外部資料帶進 Editor。統一的 ImportWizard 入口（點 Editor 左下「匯入」）。

## 影片教學

![ImportWizard 介面截圖](https://trailpaint.org/examples/import-wizard.jpg)

## 1. 照片 EXIF GPS（JPEG / HEIC）

最多拖 20 張照片進來，TrailPaint 讀 EXIF GPS 自動建立景點。

- **iPhone HEIC**：原生支援，Chrome / Firefox 桌機經 libheif 轉 JPEG 處理
- **Android JPEG**：標準 EXIF 讀取
- **無 GPS 的照片**：放在「待定位」分組，拖曳到地圖上即可設定位置
- **地名自動補全**：Photon（預設）/ Nominatim 反向地理編碼，title 變成 `MM-DD 館前12商業大樓` 這種「日期 + 地名」
- **照片壓縮**：自動 600px 邊長 + JPEG Q0.7 壓縮後存進景點 photo 欄位
- **隱私**：所有處理在瀏覽器本地，EXIF 和照片不會上傳任何伺服器；只有座標傳給 Photon 取地名

## 2. KML（Google My Maps）

從 Google My Maps 或 Google Earth 匯出的 `.kml` 檔可以直接匯入。

- Point Feature → 景點
- LineString Feature → 路線
- Polygon 不支援（TrailPaint 沒有多邊形概念）
- KML 裡的 description / ExtendedData 會被解析成景點說明

## 3. GeoJSON

從 [geojson.io](https://geojson.io)、Google Takeout、或其他 GIS 工具匯出的 `.geojson` 檔。

- FeatureCollection 格式
- Point Feature → 景點；LineString / MultiLineString → 路線
- properties.name → 景點 / 路線名稱
- properties.description → 景點說明

## 4. GPX（登山 App 軌跡）

從 Garmin、Strava、Hikingbook、綠野遊蹤等登山 App 匯出的 `.gpx` 檔。

- `<trk>` → 路線（帶海拔點）
- `<wpt>` → 景點
- 軌跡含海拔 → 自動產生海拔剖面
- 多段軌跡 → 多條路線

## 5. .trailpaint 專案檔

TrailPaint 自己的完整專案備份格式（內含景點、路線、照片、設定、音樂 URL）。

- 從「匯出 → 備份 tab」產生
- schema 版本會自動遷移（v1 → v2 → v3，含 MIME 白名單等安全檢查）
- 重新匯入後完全一致，可繼續編輯或分享

## 6. 截圖底圖（Base Map Image）

上傳一張靜態圖片當地圖底圖（手繪地圖、古地圖掃描、遊戲地圖等）。

- 上傳後手動拖移 / 縮放對位
- 不會影響真實地圖座標（景點仍走真實 GPS）
- 適合復古風格或虛構世界地圖

## 安全規則

- 所有匯入檔案在瀏覽器本地解析，**不上傳任何伺服器**
- 照片 MIME 白名單（JPEG / HEIC / PNG / WebP），非圖片附件拒絕
- GeoJSON / KML / GPX 的 URL 欄位走白名單（`http(s):`），阻擋 `javascript:` 等危險協定
- 座標 clamp 到 `[-90,90]` × `[-180,180]`，防呆處理
- 單次匯入上限：20 張照片；spot 上限 200；route 點上限 5,000

[立即試用](https://trailpaint.org/app/) [看匯出功能 →](https://trailpaint.org/features/export/)
