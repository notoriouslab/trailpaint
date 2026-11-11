# AI 提示詞生成地圖故事

> 開放格式 .trailpaint.json 描述「地圖故事」：景點、路線、歷史底圖、CC 授權照片。LLM 直接產 JSON，TrailPaint 自動從 Wikimedia Commons 補圖。JSON Schema 2020-12 公開，AI agent 可直接引用。

URL: https://trailpaint.org/features/ai-prompt/
Parent: https://trailpaint.org/features/
Language: zh-TW

把景點、人物、旅遊路線丟給 LLM，產 `.trailpaint.json`，匯入後自動從 Wikimedia Commons 補圖、渲染為手繪風地圖故事。開放 JSON Schema，AI agent 可直接引用。

## 這是什麼格式？

`.trailpaint.json` 是 TrailPaint 的「地圖故事」格式：一份有名字、有中心點、有編號景點、有路線、可選歷史底圖、可帶 CC 授權照片的 JSON 檔案。設計目標是讓 LLM 能直接產、AI agent 能直接讀。

- **JSON Schema 2020-12 公開**：[`https://trailpaint.org/schemas/project-v3.schema.json`](https://trailpaint.org/schemas/project-v3.schema.json)
- **Discovery**：[`/.well-known/trailpaint`](https://trailpaint.org/.well-known/trailpaint)（指向 schema、範例、@context vocab）
- **JSON-LD @context**：匯出檔預設含 `@context` 映射到 `schema.org/TouristTrip` + `tp:` vocab，AI agent 可直接以語義解析
- **授權**：GPL-3.0，歡迎第三方 parser / generator 採用

## 使用流程

1. 打開 [Editor](https://trailpaint.org/app/) → 右下「匯出」按鈕 → **圖片下載** tab
2. 下拉選「AI 提示詞風格」（日系手繪 / 藏寶圖 / 卡通 / 極簡線條四種）
3. 點「複製 AI 提示詞」
4. 貼到 ChatGPT / Claude / Gemini，填進你的主題（例：「阿朗壹古道 5 個景點」）
5. LLM 回傳一段 `.trailpaint.json` 內容（含 `photo_query` 雙語搜圖欄位）
6. 在 Editor「匯入」→「貼上 JSON」勾選「**自動從 Commons 補圖**」，TrailPaint 會依 `photo_query` 找 CC 照片並記錄 attribution

## 四種內建風格

### 登山 Hiking

輸出著重山區景點：三角點、山屋、水源、危險地形、展望點。路線帶海拔起伏描述。圖示偏向 ⛰️ 🏕️ 💧。

### 宣教 Mission

輸出著重宣教士足跡：教會、醫館、學校、原住民部落、殉道地。每景點含年份、人物、歷史事件。圖示偏向 ⛪ 🏥 🏫。

### 歷史 History

輸出著重歷史遺跡：古戰場、考古地點、古城門、舊碼頭。每景點含朝代 / 年代、考證參考。圖示偏向 🏛️ ⚔️ 📜。

### 旅遊 Travel

輸出著重觀光體驗：景點、美食、住宿、交通樞紐。每景點含推薦停留時間、預算。圖示偏向 📸 🍜 ☕ 🏨。

## 提示詞範例（v3.1 含 photo_query）

### Prompt

```
你是路線地圖 JSON 生成器。請為主題「{TOPIC}」產一份符合
TrailPaint .trailpaint.json v3.1 格式的路線地圖（schema 見
https://trailpaint.org/schemas/project-v3.schema.json），包含：
- version: 3
- name: 路線名稱
- center: [lat, lng] 地圖中心
- zoom: 13-15
- spots: 5-8 個景點，每個包含
    id/latlng/num/title/desc/iconId/photo_query
- routes: 1-2 條路線，pts: [[lat,lng], ...]
- iconId 從 ICONS 選：home/church/camera/food/coffee/peak/...
- photo_query 為「中文關鍵字 | English keywords」雙語，
  讓 TrailPaint 從 Wikimedia Commons 自動補圖
直接回 JSON，不加任何說明文字。
```

### LLM 回應（節錄）

```
{
  "version": 3,
  "name": "台北一日文青路線",
  "center": [25.0425, 121.5320],
  "zoom": 14,
  "spots": [
    { "id": "s1", "latlng": [25.0379, 121.5180],
      "num": 1, "title": "中正紀念堂",
      "desc": "白色大理石建築 + 自由廣場，上午光線最佳",
      "iconId": "building",
      "photo_query": "中正紀念堂 自由廣場 | Chiang Kai-shek Memorial Hall Taipei" },
    { "id": "s2", "latlng": [25.0337, 121.5298],
      "num": 2, "title": "永康街",
      "desc": "文青街區，推薦鼎泰豐 + 芒果冰",
      "iconId": "coffee",
      "photo_query": "永康街 鼎泰豐 | Yongkang Street Taipei" }
  ],
  "routes": [
    { "id": "r1", "name": "文青路線",
      "pts": [[25.0379,121.5180],[25.0337,121.5298]],
      "color": "orange",
      "elevations": null }
  ]
}
```

## 給 AI 開發者 / Agent 使用

若你是在打造使用 TrailPaint 格式的 agent / tool，以下是你可以直接引用的資源：

- **JSON Schema**：[`/schemas/project-v3.schema.json`](https://trailpaint.org/schemas/project-v3.schema.json)（JSON Schema 2020-12）
- **Well-known discovery**：[`/.well-known/trailpaint`](https://trailpaint.org/.well-known/trailpaint)
- **WebMCP**：首頁 inline `navigator.modelContext.provideContext()` 已暴露 `open-trailpaint-editor` 與 `create-share-link` 兩個 tool
- **範例檔**：[`/stories/paul/first-journey.trailpaint.json`](https://trailpaint.org/stories/paul/first-journey.trailpaint.json)、[`/stories/xuanzang/west.trailpaint.json`](https://trailpaint.org/stories/xuanzang/west.trailpaint.json)、[`/stories/taiwan-missionaries/barclay.trailpaint.json`](https://trailpaint.org/stories/taiwan-missionaries/barclay.trailpaint.json)
- **匯出檔含 JSON-LD**：從 Editor 匯出的 `.trailpaint.json` 帶 `@context`（schema.org + [`tp:` vocab](https://trailpaint.org/ns/v3/)）與 `@type: ["TouristTrip", "tp:TrailStory"]`，可直接餵 JSON-LD parser
- **Authoritative 欄位**：`spots` / `routes` 是真實資料；`itinerary` 是給 AI agent 的 ItemList mirror（每個 `itemListElement[i].item` 是 `Place + tp:Spot`）。**若兩者不一致，以 `spots` 為準**。Editor 匯入時會 strip 掉 `@context`/`@type`/`itinerary`，只信任 native 欄位。

## 注意事項

- **座標準確性**：LLM 對常見地標座標基本準確，冷門地點可能漂移 100-500 公尺，建議匯入後手動微調
- **照片**：LLM 不直接產 data URL 照片；但帶 `photo_query` 讓 TrailPaint 從 Wikimedia Commons 自動補圖（CC 授權，自動記錄作者）。自家照片仍可在匯入後手動替換。
- **schema 版本**：請要求 LLM 用 v3（對應 schema 檔 v3.1）；舊版本 TrailPaint 會自動 migrate
- **免費 LLM 建議**：Claude 對結構化 JSON 輸出最穩定；ChatGPT / Gemini 也都可用

## 進階：從 ChatGPT 照片 EXIF 直接生成

把手機相簿選 10 張照片交給 ChatGPT-4V 並說「從這些照片 EXIF 產 .trailpaint.json」— ChatGPT 能讀 EXIF GPS 直接產景點。但 TrailPaint 本身就有「匯入照片」功能（更快也更準），這個 workflow 主要適合「照片在別人手上、你只拿到檔案」的協作情境。

[立即試用](https://trailpaint.org/app/) [← 回匯入](https://trailpaint.org/features/import/)
