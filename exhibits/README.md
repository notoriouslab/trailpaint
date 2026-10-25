# 首頁作品圖（exhibits）

首頁展廳、作品列與 /examples/ 用的作品圖。每張都是對應路線或故事的實際畫面截圖，不是另外繪製的插圖。

## 來源

| 檔案 | 來源 | 截法 |
|---|---|---|
| daan-park.jpg | `/stories/taipei-daan-park/daan-park.trailpaint.json` | Player，起始年 1904（臺灣堡圖圖層） |
| mackay.jpg | `/stories/taiwan-missionaries/mackay.trailpaint.json` | Player，點開第 2 個景點 |
| passion.jpg | `/stories/passion-week/entry.trailpaint.json` | Player，點開第 4 個景點 |
| paul.jpg | `/stories/paul/second-journey.trailpaint.json` | Player，點開第 6 個景點 |
| xuanzang.jpg | `/stories/xuanzang/west.trailpaint.json` | Player，點開第 5 個景點 |
| qixing / baishihu / hehuan / jiaming / matcha / alangyi / jiufen / london .jpg | `/examples/routes/` 同名路線 | Editor，載入後的手繪卡片畫面 |

## 截圖規格

- 瀏覽器 device scale 2；Editor 視窗 1180×820，Player 視窗 1440×900（daan-park 1600×1000）。
- 截 `.leaflet-container`，截前隱藏地圖控制鈕。
- 一般作品裁 4:3 輸出 1200×900；daan-park 輸出 2000×1429（首頁大格）。JPEG quality 78、progressive。
- Editor 沒有 URL 載入參數，用 localStorage `trailpaint-editor-restore`（`{project, savedAt}`，一小時內有效）把路線帶進去。

## 授權

- 底圖：© OpenStreetMap contributors、Protomaps（首頁頁尾已標示）。
- 歷史圖層：中研院人社中心 GIS 專題中心（臺灣堡圖）、DARE（羅馬帝國地圖），見各故事頁 CREDITS.md。
- 畫面中的照片與畫作：沿用各故事或路線檔內的 photoMeta 授權，見各故事頁 CREDITS.md。

## 換特展或每日一選

- 當季特展：改 `/index.html` 的 `.hall--big` 連結、圖片與文字。
- 每日一選：改 `/index.html` 內 `pool` 陣列（`[圖檔名, 標題, 說明, 連結]`），HTML 預設值同步改成陣列第一筆。

## 故事地圖卡片圖（stories/<id>/card.jpg）

`/stories/` 總覽卡片用的圖，由 `stories/catalog.json` 的 `thumbnail` 指向。每個故事取第一條路線，Player 點開一個有照片的景點後截圖（1440×900、scale 2），中央裁 4:3 輸出 800×600。台灣宣教士、受難週、保羅、玄奘、大安森林公園五張由本目錄同名作品圖縮出。`cover.jpg` 不動，仍給社群分享圖與故事頁使用。
