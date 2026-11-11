# 📱 安裝到主畫面（PWA）

> 把 TrailPaint 安裝成 PWA 加到 iOS / Android 手機主畫面與桌機應用程式 — 全螢幕開啟、打開更快、可離線編輯。含 iPhone Safari、Android Chrome、Windows / macOS 桌面三種安裝步驟。

URL: https://trailpaint.org/features/install/
Parent: https://trailpaint.org/features/
Language: zh-TW

TrailPaint 是 PWA（Progressive Web App），iPhone、Android、桌面瀏覽器都能「安裝」成獨立應用程式 — 全螢幕開啟、打開更快、可離線編輯、資料一樣留在你的瀏覽器。

## 30 秒示範影片

## 為什麼建議安裝？

- **打開更快** — 主畫面一點就開，不用進瀏覽器找分頁
- **全螢幕 App 體驗** — 沒有網址列與 tab 佔用，地圖與編輯區更大，手機尤其明顯
- **可離線編輯** — Service Worker 已快取核心資源，訊號不好時仍能開啟（地圖圖磚需要網路）
- **不吃額外空間** — 只是把網頁快捷加到主畫面，不像原生 App 要下載幾十 MB
- **資料沒有搬家問題** — 一樣存在同一個瀏覽器的 localStorage，網頁版 / PWA 切換共用同一份專案

## iPhone / iPad（Safari）

**必須使用 Safari**，iOS 上 Chrome / Firefox / Edge 的「加入主畫面」無法建立正式 PWA。

1. 用 **Safari** 打開 [https://trailpaint.org/app/](https://trailpaint.org/app/)
2. 點底部中間的 **分享按鈕**（方框上方有一支向上的箭頭 `□↑`）
3. 彈出選單往下捲動，點 **「加入主畫面」**（Add to Home Screen）
4. 可以改名稱（預設「TrailPaint」），右上點 **「加入」**
5. 回到主畫面，會看到 🌿 TrailPaint icon，點它會全螢幕開啟，跟原生 App 一樣

💡 建議順便在 Safari 關掉「請求桌面版網站」，避免被桌機版面擠壓到手機 UI。

## Android（Chrome / Edge / Samsung Internet）

1. 用 **Chrome**（或 Edge、Samsung Internet）打開 [https://trailpaint.org/app/](https://trailpaint.org/app/)
2. 點右上角 **⋮ 三點選單**
3. 選 **「加到主畫面」** 或 **「安裝應用程式」**（Install app，Chrome 會優先顯示後者）
4. 確認名稱，點 **「安裝」**
5. 主畫面多一個 🌿 TrailPaint icon，點開是獨立視窗，可從工作切換器看到

💡 Chrome 有時會自己跳「安裝 TrailPaint」的底部小橫幅，直接點就好。

## 桌面（Chrome / Edge — Windows / macOS / Linux）

1. 用 **Chrome** 或 **Edge** 打開 [https://trailpaint.org/app/](https://trailpaint.org/app/)
2. 網址列右邊會出現 **安裝圖示**（電腦加下箭頭的小 icon）
3. 點它 → 「安裝」，TrailPaint 會變成獨立視窗應用程式
4. macOS 會加到 Launchpad、Windows 加到開始選單，兩邊都能釘到 Dock / 工作列

💡 找不到安裝 icon？打開 `⋮` 選單 → 「安裝 TrailPaint」，或「儲存並分享」 → 「建立捷徑...」。

## 常見問題

### 裝成 PWA 會佔很多空間嗎？

不會。PWA 只是把網頁快取下來，通常 1-3 MB。你的專案資料存在瀏覽器 localStorage，不會重複儲存。

### 離線時可以完全使用嗎？

編輯介面可以離線開啟。**地圖圖磚、反向地理編碼、海拔查詢、分享連結**需要網路。建議在有訊號時先把要用的區域圖磚瀏覽過一次讓瀏覽器先快取。

### PWA 和網頁版的專案資料會同步嗎？

會，因為它們用同一個瀏覽器的 localStorage。只要是同一個裝置 + 同一個瀏覽器，切來切去都是同一份。換裝置要用「匯出 → 備份」存成 `.trailpaint` 檔搬過去。

### iOS 上為什麼一定要 Safari？

Apple 規定只有 Safari 能真正安裝 PWA。iOS 上的 Chrome / Firefox 內部也是用 WebKit，但沒有開放「加入主畫面」產生正式 PWA 的能力。用其他瀏覽器只能做普通書籤。

### 要怎麼移除 PWA？

手機：長按 icon → 「移除 App」或「從主畫面移除」即可。桌面：打開 PWA 視窗，右上 `⋮` → 「解除安裝 TrailPaint」。資料若要一併清掉，還要到瀏覽器裡把 trailpaint.org 的網站資料清除。

### Story Player 也可以單獨安裝嗎？

目前 PWA manifest scope 是 `/app/`，故事播放器 `/app/player/` 已包含在內，一個安裝檔兩個入口都能用。在 PWA 裡直接打 URL 或用 Editor 右下「故事模式」都會留在 App 內。

[打開 Editor 開始安裝](https://trailpaint.org/app/) [回 FAQ](https://trailpaint.org/faq/)
