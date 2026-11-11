# 常見問題

> TrailPaint 路小繪常見問題：免費？要不要註冊？支援哪些格式？手機可以用嗎？分享連結會過期嗎？開源授權？

URL: https://trailpaint.org/faq/
Parent: https://trailpaint.org/
Language: zh-TW

13 題覆蓋免費、隱私、匯入匯出、分享連結、手機、授權、回報 bug。

### TrailPaint 是什麼？

TrailPaint 路小繪是一個免費、開源的瀏覽器工具，在真實地圖上製作手繪風格的路線插畫。支援從照片 EXIF、KML、GeoJSON、GPX 匯入，匯出 PNG 地圖插畫、完整備份、以及 GeoJSON / KML 互通格式。純前端運作，無需註冊，資料存在瀏覽器本地不上傳伺服器。

### 免費嗎？

完全免費。採 GPL-3.0 開源授權，原始碼在 GitHub（[notoriouslab/trailpaint](https://github.com/notoriouslab/trailpaint)）公開。沒有帳號、沒有訂閱、沒有廣告。

### 需要註冊帳號嗎？

不需要。打開 [trailpaint.org/app/](https://trailpaint.org/app/) 直接使用，專案資料存在瀏覽器 localStorage。分享連結是可選功能（由 Cloudflare Workers + KV 提供短網址），同樣不需登入。

### 資料會上傳到伺服器嗎？

不會上傳編輯資料。TrailPaint 是純前端工具，所有專案資料存在瀏覽器 localStorage。

只有以下三種情況會呼叫外部服務，且都是由使用者主動觸發：

- 地圖圖磚（OpenStreetMap / Carto / Protomaps）
- 反向地理編碼（Photon 為主、Nominatim 為備用）— 僅傳送座標
- 海拔查詢（open-elevation）— 僅傳送座標

只有當主動按「複製分享連結」才會把專案壓縮後送到 trailpaint.org 的 Cloudflare Workers + KV（TTL 90 天）。

### 如何從照片批次建立景點？

點「匯入」→「匯入照片」→ 選取或拖曳最多 20 張照片（JPEG / HEIC 皆可）。TrailPaint 會讀取 EXIF GPS 座標自動建立景點，無 GPS 的照片會放在「待定位」分組，拖曳即可設定位置。Photon 或 Nominatim 反向地理編碼會自動補上地名作為景點標題。詳見 [匯入功能](https://trailpaint.org/features/import/)。

### 支援哪些匯入與匯出格式？

**匯入**：.trailpaint 專案檔、照片 EXIF（JPEG / HEIC）、KML（Google My Maps）、GeoJSON（geojson.io / Google Takeout）、GPX（登山 App）、截圖底圖。

**匯出**：PNG 多比例插畫、.trailpaint 完整備份、GeoJSON / KML 純地理結構（給 Google My Maps、Google Earth、Gaia GPS 用）、分享連結、Player 嵌入 HTML。

詳見 [匯入功能](https://trailpaint.org/features/import/) 與 [匯出功能](https://trailpaint.org/features/export/)。

### 分享連結會過期嗎？

會。後端 share link（`trailpaint.org/s/<id>`）TTL 90 天，90 天後自動失效。想永久保存要用備份功能下載 `.trailpaint` 專案檔，未來可重新匯入或再次產生分享連結。

### 分享連結的預覽圖是什麼？

分享到 LINE、Facebook、Threads、X、Slack 等平台時，預覽圖是該專案裡第一個有照片的景點。若專案沒有任何照片，會 fallback 到 TrailPaint 的品牌預覽圖。

### Story Player 是什麼？

Story Player 是 TrailPaint 的獨立入口（[/app/player/](https://trailpaint.org/app/player/)），把地圖變成自動導覽故事：

- Fly-to 動畫逐點飛過去、popup 展示照片與說明
- 可設定播放間隔與循環
- 支援背景音樂
- 16 張歷史地圖疊加（中研院臺灣百年歷史地圖 1897 至 1993、CCTS 中國七朝、羅馬帝國 AD 200）
- 全螢幕模式適合展場與教學投影

一鍵複製嵌入碼可貼到部落格、教會網站、Notion。詳見 [故事地圖](https://trailpaint.org/features/story-mode/)。

### 手機可以用嗎？離線能用嗎？

**手機**：iOS Safari、Android Chrome 都支援響應式設計。強烈建議安裝為 PWA（Progressive Web App）加到主畫面當原生 App 使用 — 打開更快、全螢幕無瀏覽器列，手機體驗差很多。[📱 看 iOS / Android 安裝步驟](https://trailpaint.org/features/install/)。

**離線**：PWA 快取可以離線開啟 Editor，但新照片匯入的反向地理編碼、地圖圖磚需要網路才能取得最新內容。

### 可以商業使用嗎？

可以。TrailPaint 採 [GPL-3.0 License](https://www.gnu.org/licenses/gpl-3.0.html)，允許商業使用、修改、二次創作，但衍生作品必須同樣以 GPL-3.0 開源。匯出的 PNG 插畫 / 專案檔屬於你自己的創作，不受授權限制。

### 支援哪些語言？

繁體中文、英文、日文三種語言，根據瀏覽器偏好自動偵測，也可透過 `?lang=zh-TW` / `?lang=en` / `?lang=ja` URL 參數手動切換。

### 找到 bug 或有建議怎麼回報？

到 GitHub 開 issue：[github.com/notoriouslab/trailpaint/issues](https://github.com/notoriouslab/trailpaint/issues)。附上重現步驟、截圖、瀏覽器與版本資訊最有幫助。
