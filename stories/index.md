# TrailPaint Stories — 嚴選互動故事地圖 / Curated Interactive Story Maps

URL: https://trailpaint.org/stories/
Parent: https://trailpaint.org/
Languages: zh-TW / en / ja
Version: 1.4.0

## 這是什麼 / What is This

TrailPaint Stories 是用 TrailPaint 製作的精選故事地圖集合。每個故事包含多條歷史路線，可自動播放導覽（fly-to 動畫 + 照片 popup + 配樂 + 9 張歷史地圖疊加），也可全螢幕投影做教學展示，或一鍵嵌入部落格、教會網站、Notion。v1.4 起加入年代滑桿（拖動切換歷史地圖底圖、景點按 era 漸隱）、合輯（多故事跨人物時序排序）、電子明信片（1080×1080 IG 方圖下載）。

TrailPaint Stories is a curated collection of interactive story maps. Each story contains multiple historical routes with auto-play narration, photo popups, background music, and 9 historical basemap overlays. v1.4 adds an era slider (cross-fade historical maps + spot opacity by era), compilations (multi-story chronological dialogue), and electronic postcards (1080×1080 IG square downloads).

## 收錄故事 / Featured Collections

### 台灣宣教士腳蹤 / Footprints of Missionaries in Taiwan (1865–2024)
URL: https://trailpaint.org/stories/taiwan-missionaries/

五位宣教士在台灣的故事路線 / Five missionaries' routes across Taiwan:

- **George Leslie Mackay 馬偕博士** — 北部宣教之父 (1872–1901). Tamsui, Keelung, Yilan, Hsinchu, Hualien. Founded Oxford College and Hobe Mackay Hospital.
- **Thomas Barclay 巴克禮牧師** — 台語白話字之父 (1875–1935). Tainan. Founded Tainan Theological College, translated the Taiwanese Bible, launched Taiwan Church News.
- **David Landsborough 蘭大衛醫師** — 切膚之愛 / Love by the Skin (1895–1936). Changhua. Founded Changhua Christian Hospital.
- **James Laidlaw Maxwell 馬雅各醫師** — 台灣醫療宣教先驅 (1865–1871). Tainan, Qihou. Taiwan's first Christian missionary.
- **Doris Brougham 彭蒙惠宣教師** — 台灣英語教育之母 (1951–2024). Hualien, Taipei. Founded ORTV and Studio Classroom.

### 耶穌受難週 / Passion Week (ca. AD 30)
URL: https://trailpaint.org/stories/passion-week/

耶穌在耶路撒冷最後一週的足跡，分三段 / Jesus' final week in Jerusalem in three segments:

- **Triumphal Entry** (Sunday–Wednesday): Jesus rides into Jerusalem, cleanses the Temple, debates with religious leaders.
- **Last Supper to Calvary** (Thursday–Friday): The Upper Room, Gethsemane, trial before Pilate, Via Dolorosa, the cross at Calvary.
- **Resurrection and Appearances** (Saturday–Sunday): the empty tomb, road to Emmaus, appearances to disciples, Ascension from the Mount of Olives.

### 保羅宣教三次旅行 / Paul's Three Missionary Journeys (AD 46–62)
URL: https://trailpaint.org/stories/paul/

從敘利亞安提阿三次橫渡地中海，最後押解羅馬。沿使徒行傳 13–28 章 34 個景點 / Three Mediterranean crossings + journey to Rome, 34 spots along Acts 13–28:

- **First Journey** (AD 46–48): Cyprus and southern Galatia
- **Second Journey** (AD 49–52): Macedonian call, opening Europe
- **To Rome** (AD 60–62): Caesarea trial, storm at sea, house arrest in Rome

### 耶穌加利利傳道 / Jesus' Galilean Ministry (AD 27–30)
URL: https://trailpaint.org/stories/jesus-galilee/

早期事工與變像山 16 個景點 / Early ministry and Transfiguration Road, 16 spots:

- **Early Galilee** (AD 27–29): Cana, Capernaum, Sea of Galilee teaching
- **Transfiguration Road** (AD 29–30): from Caesarea Philippi to the Mount of Transfiguration

### 絲路單段故事 / Silk Road Source Segments

URL: https://trailpaint.org/stories/zhang-qian/ · /xuanzang/ · /marco-polo/

三段個別故事，可獨立播放或合輯時序 mix / Three standalone stories, also bundled in `silk-road-2000` chronological compilation:

- **張騫鑿空 Zhang Qian's Western Mission** (BC 138–115): first/second mission opening the Silk Road
- **玄奘西行 Xuanzang's Journey West** (AD 629–645): westward to India + return with sutras
- **馬可波羅東來 Marco Polo's Travels** (AD 1271–1295): east journey + west return via maritime route

### 文天祥南撤北擄 / Wen Tianxiang's Southern Retreat & Northern Captivity (AD 1275–1283)
URL: https://trailpaint.org/stories/wen-tianxiang/

南宋亡國前後忠臣足跡 / Southern Song's loyal minister at the dynasty's end.

### 徐霞客西南壯遊 / Xu Xiake's Southwest Journey (AD 1636–1640)
URL: https://trailpaint.org/stories/xu-xiake/

明末地理學家最後四年壯遊滇黔桂 / Late-Ming geographer's final four-year exploration through Yunnan, Guizhou, Guangxi.

## 預設合輯 / Default Compilations (v1.4)

URL pattern: https://trailpaint.org/app/player/?compilation=<id>

合輯把多段故事綁成一個 Player session，可選 sequential（依故事順序）或 chronological（依 spot.era 全域時序，跨人物 mix）/ Compilations bundle multiple segments into one session — choose `sequential` (story order) or `chronological` (global era.start sort, cross-author mixing).

- **paul-three-journeys** — 保羅宣教三次旅行 (AD 46–62, 34 spots, sequential)
- **four-gospels-map** — 四福音書地圖：加利利傳道 + 變像山 + 受難週 (AD 27–30, 33 spots, sequential)
- **silk-road-2000** — 絲路 2000 年：張騫 + 玄奘 + 馬可波羅同條走廊 (BC 138–AD 1295, 59 spots, chronological — cross-author dialogue)

## Story Player 功能 / Features

- fly-to 自動導覽 + 1.8 秒地圖呈現延遲再開 popup (v1.4 節奏調整) / auto-guided playback with 1.8s map-settle delay before popup (v1.4)
- 照片 popup + 描述文字 / photo popups with descriptions
- 播放間隔與循環設定 / playback interval and loop settings (2s/4s/6s/8s, 1×/2×/3×/∞)
- 5 種底圖 + 9 張歷史地圖疊加 / 5 basemaps + 9 historical overlays:
  - Academia Sinica CCTS 西漢 BC 7 / 唐 741 / 南宋 1208 / 元 1330 / 明 1582
  - 台灣輿圖 jm200k 1897 / jm20k 1921 / Corona 衛星 1966
  - DARE Roman Empire AD 200
- **年代滑桿 / Era Slider (v1.4)**: 拖動切換歷史地圖 + 景點按 era 漸隱；🗺️ 歷史 / 📖 聖經敘事兩刻度組
- **電子明信片 / Postcard (v1.4)**: 1080×1080 IG 方圖含地圖 + 景點卡 + 年代印章一鍵下載
- **合輯 / Compilation (v1.4)**: 多故事跨人物時序排序，partial fail tolerant
- 背景音樂 MP3/M4A 支援 / background music
- 全螢幕 / fullscreen mode
- Player 嵌入碼 / embed code for external sites（單故事 inline data 或合輯 URL ref）

## 教會頁 / Church Landing (v1.4)
URL: https://trailpaint.org/church/

教會 vertical landing 頁，三個用例 + iframe 嵌入示範 / Church-vertical landing with three iframe-embedded use cases (Sunday school / weekly bulletin / personal devotion).

## 自建故事 / Build Your Own Story

使用 TrailPaint Editor 建立自己的故事地圖：https://trailpaint.org/app/
Create your own story map with TrailPaint Editor: https://trailpaint.org/app/

1. 建立景點與路線 / Create spots and routes
2. 點「▶ 故事模式」進入 Player / Click "▶ Story Mode" to enter Player
3. 匯出對話框的「圖片」tab 複製 Player 嵌入碼 / Copy Player embed code from the Image tab

## License

TrailPaint is GPL-3.0. Story content copyrights belong to the respective authors.

## See Also

- Home: https://trailpaint.org/
- Editor: https://trailpaint.org/app/
- Player: https://trailpaint.org/app/player/
- Church landing: https://trailpaint.org/church/
- Source: https://github.com/notoriouslab/trailpaint
- llms.txt: https://trailpaint.org/llms.txt
- index.md (LLM-friendly summary): https://trailpaint.org/index.md
