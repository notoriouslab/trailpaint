# 故事地圖 Story Player

> TrailPaint Story Player：地圖自動導覽（fly-to、popup、循環）、背景音樂、16 張歷史地圖疊加與年代滑桿、全螢幕展場模式、iframe 嵌入碼給部落格與教會網站。

URL: https://trailpaint.org/features/story-mode/
Parent: https://trailpaint.org/features/
Language: zh-TW

把 `.trailpaint.json` 變成自動導覽的地圖故事。獨立入口 [/app/player/](https://trailpaint.org/app/player/)，適合展場、教學、部落格嵌入。

## 示範影片

## 核心功能

- **Fly-to 動畫**：逐個景點飛過去，Leaflet 平滑 pan + zoom
- **Popup 展示**：景點卡自動開合，顯示照片與說明
- **播放控制**：每點停留 2 / 4 / 6 / 8 秒（預設 6 秒），循環 1× / 2× / 3× / ∞，在 Player 設定面板調整
- **背景音樂**：專案內設定 MP3 URL，播放時自動 loop
- **歷史地圖疊加**：16 張老地圖圖磚疊在現代底圖上。中研院臺灣百年歷史地圖 8 張（1897、1904、1921、1945、1955、1966、1989、1993）、中研院 CCTS 中國七朝（西漢、三國、唐、南宋、元、明、清）、DARE 羅馬帝國 AD 200
- **年代滑桿**：拖動切換同時代的歷史地圖，景點依年代出現
- **全螢幕模式**：適合展場、教學投影、電視屏
- **多底圖切換**：Voyager、Positron、Dark Matter、OSM Standard、Protomaps

## 兩種啟動方式

### A. 直接開啟 Player

打開 [https://trailpaint.org/app/player/](https://trailpaint.org/app/player/)，用左上「載入專案」上傳 `.trailpaint.json`。

### B. 從 Editor 切換故事模式

Editor 右下的「故事模式」按鈕切到 Player，同 project state 沿用。

## URL 參數

Player 支援以下 query string：

- `?src=<path>` — 載入本站的故事檔，限 `/stories/`、`/taiwan/`、`/examples/routes/` 底下的 `.trailpaint.json`（不接受外部網址）
- `?compilation=<id>` — 載入合輯（多個故事疊在同一張地圖），例如 `silk-road-2000`
- `?embed=1` — 嵌入模式，適合 iframe
- `?autoplay=1` — 自動開始播放
- `?spot=<key>&year=<year>` — 搭配 `?src=`，直接開在指定景點與年份（這時不自動播放）；連結由 Player 的分享按鈕產生
- `?music=<url>` — 指定背景音樂（https 網址或本站路徑）

## iframe 嵌入範例

```
<iframe
  src="https://trailpaint.org/app/player/?src=/stories/passion-week/passion.trailpaint.json&embed=1&autoplay=1"
  width="100%"
  height="500"
  frameborder="0"
  allow="autoplay">
</iframe>
```

可直接貼到 WordPress、Notion、Ghost、HackMD（支援 HTML）、教會網站等。

要嵌入自己做的地圖，在 Editor「匯出 → 互通分享」或 Player 控制列按「複製 Player 嵌入碼」，地圖資料會直接包在嵌入碼裡，不需要另外放檔案。

## Story Page 故事集合

官方策展的故事集合入口在 [/stories/](https://trailpaint.org/stories/)，目前有：

- [台灣宣教士腳蹤](https://trailpaint.org/stories/taiwan-missionaries/) — 馬偕、巴克禮、蘭大衛、布勞姆、馬雅各等五位 19-20 世紀宣教士的宣教路線
- [耶穌受難週](https://trailpaint.org/stories/passion-week/) — 從進城、受難、復活三段共 12+ 個聖經地點，搭配古典繪畫（達文西、卡拉瓦喬、林布蘭、Giotto、東正教 icon 等）

## 故事展示 schema

Story Page 用兩層分離 schema：

- `<filename>.trailpaint.json` — 地理結構（Editor 產出）
- `story.json` — 展示 metadata（標題、描述、章節切分、scripture_refs 聖經經文引用）

Editor 不編輯 story.json 欄位，保持一般使用者介面單純。

[打開 Story Player](https://trailpaint.org/app/player/) [看既有故事](https://trailpaint.org/stories/)
