# AI プロンプトで地図ストーリー生成

> オープンな .trailpaint.json 形式で地図ストーリーを記述。番号付きスポット・ルート・歴史地図・CC 授権写真。LLM が JSON を生成し、TrailPaint が Wikimedia Commons から自動で写真を取得。JSON Schema 2020-12 公開、AI エージェントが直接参照可能。

URL: https://trailpaint.org/features/ai-prompt/ja/
Parent: https://trailpaint.org/features/ai-prompt/
Language: ja

トピックを LLM に渡し、`.trailpaint.json` を生成、インポートすれば Commons から自動取得された写真とともに手描き風の地図ストーリーに。オープン JSON Schema で AI エージェントから直接参照可能。

## このフォーマットとは？

`.trailpaint.json` は TrailPaint の「地図ストーリー」フォーマット：名前・中心点・番号付きスポット・ルート・オプションの歴史地図・CC 授権写真を含む JSON ドキュメント。LLM による生成と AI エージェントによる消費を想定して設計されています。

- **JSON Schema 2020-12 公開**：[`https://trailpaint.org/schemas/project-v3.schema.json`](https://trailpaint.org/schemas/project-v3.schema.json)
- **Discovery**：[`/.well-known/trailpaint`](https://trailpaint.org/.well-known/trailpaint)（schema・例・@context vocab）
- **JSON-LD @context**：エクスポートされたファイルには `@context` が含まれ、`schema.org/TouristTrip` + `tp:` vocab にマッピングされます。任意の JSON-LD パーサーで読めます。
- **ライセンス**：GPL-3.0。サードパーティのパーサー / ジェネレーターを歓迎します。

## ワークフロー

1. [エディター](https://trailpaint.org/app/)を開く → 右下の「エクスポート」ボタン → **画像ダウンロード**タブ
2. 「AI プロンプトスタイル」を選択（和風手描き / 宝の地図 / カワイイ / ミニマル線画）
3. 「AI プロンプトをコピー」
4. ChatGPT / Claude / Gemini に貼り付け、トピックを入力（例：「富士山登山 5 スポット」）
5. LLM が `.trailpaint.json`（`photo_query` バイリンガル検索フィールド付き）を返します
6. エディターの「インポート」→「JSON を貼り付け」で「**Commons から自動取得**」にチェック。TrailPaint が CC 授権写真を取得し、帰属を自動記録。

## 組み込み 4 スタイル

### ハイキング Hiking

山岳スポット重視：三角点・山小屋・水場・危険地形・展望台。ルートに標高起伏の説明あり。アイコンは ⛰️ 🏕️ 💧。

### 宣教 Mission

宣教師の足跡重視：教会・病院・学校・原住民集落・殉教地。各スポットに年号・人物・歴史事件。アイコンは ⛪ 🏥 🏫。

### 歴史 History

歴史遺跡重視：古戦場・考古地・古城門・旧港。各スポットに王朝 / 年代・典拠。アイコンは 🏛️ ⚔️ 📜。

### 観光 Travel

観光体験重視：名所・グルメ・宿・交通ハブ。各スポットに推奨滞在時間と予算。アイコンは 📸 🍜 ☕ 🏨。

## プロンプト例（v3.1 photo_query 付き）

### Prompt

```
あなたはルート地図 JSON ジェネレーターです。トピック「{TOPIC}」に対して、
TrailPaint .trailpaint.json v3.1 形式（schema:
https://trailpaint.org/schemas/project-v3.schema.json）に準拠した
地図ドキュメントを生成してください：
- version: 3
- name: ルート名
- center: [lat, lng] 地図中心
- zoom: 13-15
- spots: 5-8 個、各項目に
    id/latlng/num/title/desc/iconId/photo_query
- routes: 1-2 本、pts: [[lat,lng], ...]
- iconId は ICONS から選択：home/church/camera/food/coffee/peak/...
- photo_query は「日本語 | English」のバイリンガル形式で、
  TrailPaint が Wikimedia Commons から自動取得できるように
JSON のみ返し、説明は加えないでください。
```

### LLM 応答（抜粋）

```
{
  "version": 3,
  "name": "富士山須走ルート",
  "center": [35.3606, 138.7274],
  "zoom": 14,
  "spots": [
    { "id": "s1", "latlng": [35.3353, 138.7353],
      "num": 1, "title": "須走口五合目",
      "desc": "登山口。駐車場と売店あり。",
      "iconId": "camera",
      "photo_query": "富士山 須走口 五合目 | Mount Fuji Subashiri trailhead" },
    { "id": "s2", "latlng": [35.3606, 138.7274],
      "num": 2, "title": "富士山頂",
      "desc": "日本最高峰 3776m。",
      "iconId": "peak",
      "photo_query": "富士山頂 剣ヶ峰 | Mount Fuji summit Kengamine" }
  ],
  "routes": [
    { "id": "r1", "name": "須走ルート",
      "pts": [[35.3353,138.7353],[35.3606,138.7274]],
      "color": "blue",
      "elevations": null }
  ]
}
```

## AI 開発者 / エージェント向け

TrailPaint フォーマットを使うエージェントやツールを構築する場合、以下は安定した参照可能なエンドポイントです：

- **JSON Schema**：[`/schemas/project-v3.schema.json`](https://trailpaint.org/schemas/project-v3.schema.json)（JSON Schema 2020-12）
- **Well-known discovery**：[`/.well-known/trailpaint`](https://trailpaint.org/.well-known/trailpaint)
- **WebMCP**：ホームページ inline で `navigator.modelContext.provideContext()` が `open-trailpaint-editor` と `create-share-link` を公開
- **サンプルファイル**：[`/stories/paul/first-journey.trailpaint.json`](https://trailpaint.org/stories/paul/first-journey.trailpaint.json)、[`/stories/xuanzang/west.trailpaint.json`](https://trailpaint.org/stories/xuanzang/west.trailpaint.json)、[`/stories/taiwan-missionaries/barclay.trailpaint.json`](https://trailpaint.org/stories/taiwan-missionaries/barclay.trailpaint.json)
- **エクスポートは JSON-LD を含む**：エディターからエクスポートした `.trailpaint.json` は `@context`（schema.org + [`tp:` vocab](https://trailpaint.org/ns/v3/)）と `@type: ["TouristTrip", "tp:TrailStory"]` を持ち、JSON-LD パーサーに直接渡せます
- **Authoritative フィールド**：`spots` / `routes` が真のデータ；`itinerary` は AI エージェント向けの `ItemList` ミラー（各 `itemListElement[i].item` は `Place + tp:Spot`）。**食い違う場合は `spots` を優先**。インポート時に `@context`/`@type`/`itinerary` は strip され、native フィールドのみ信頼されます。

## 注意事項

- **座標の精度**：LLM は有名ランドマークなら正確ですが、マイナーな地点は 100-500m ずれる可能性あり。インポート後に手動で微調整してください。
- **写真**：LLM は data URL 写真を直接生成しません。代わりに `photo_query` を出力し、TrailPaint が Wikimedia Commons から CC 授権写真を自動取得します。自前の写真はインポート後に差し替え可能。
- **Schema バージョン**：LLM には v3 を要求（schema ファイルは v3.1）。古いバージョンは自動マイグレーションされます。
- **LLM 推奨**：Claude は構造化 JSON 出力が最も安定。ChatGPT / Gemini も使用可。

## 上級：ChatGPT-4V で写真 EXIF から直接生成

スマホのアルバムから 10 枚の写真を ChatGPT-4V に渡して「これらの EXIF から .trailpaint.json を作って」と指示すると、GPS 情報を読み取ってスポットを生成してくれます。ただし TrailPaint の「写真インポート」機能のほうが速く正確なので、このワークフローは「写真が他人の手元にあり、ファイルだけ受け取った」協業シーンに向いています。

[エディターを起動](https://trailpaint.org/app/) [← インポート](https://trailpaint.org/features/import/)
