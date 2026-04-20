# TrailPaint

[中文](README.md) | [English](README.en.md)

> 手描き風ルートマップ · 写真・地図・AI 3 つの入口 · PNG / バックアップ / 互換形式で一発出力

[![Version](https://img.shields.io/badge/version-1.3.0-orange.svg)](https://trailpaint.org/app/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-5a0fc8.svg)](https://trailpaint.org/app/)
[![i18n](https://img.shields.io/badge/i18n-中文%20%7C%20EN%20%7C%20日本語-green.svg)](https://trailpaint.org/app/)

**[今すぐ使う →](https://trailpaint.org/app/)** · **[ストーリー地図を見る →](https://trailpaint.org/stories/)** · **[Story Player →](https://trailpaint.org/app/player/)**

![TrailPaint エディタ](./examples/trailpaint-hero.jpg)

---

## これは何？

TrailPaint は**手描き風ルートマップ作成ツール**です。旅から帰って数分で、経路・スポット・写真を印刷可能・IG 共有可能・ブログに埋め込み可能な**イラスト地図**に変えます。

- **バックエンド不要・アカウント不要**：すべてブラウザ内
- **PWA 対応**：スマホのホーム画面にインストールしてネイティブアプリのように使える（[iOS / Android / デスクトップのインストール手順](https://trailpaint.org/features/install/)）
- **3 言語自動判定**：中文 / English / 日本語
- **GPL-3.0 オープンソース**：自由に使用・改変・二次創作可能

### サンプル

![TrailPaint サンプル — 台北・士林エリアの 8 スポットルート](./examples/trailpaint-01.jpg)

---

## ルート作成の 3 つの方法

### 📷 写真から作成（最速）

旅先で 20 枚撮影 → TrailPaint にドラッグ → EXIF GPS から自動でスポット作成。**v1.3 の新機能**、「帰宅後に Google Maps で座標を調べる」痛みを解消。

対応：
- iPhone HEIC の EXIF GPS
- Android JPEG
- GPS なしの写真：「位置未設定」グループに自動分類、ドラッグで配置
- 地名浮現：Photon（主）/ Nominatim（フォールバック）逆ジオコーディングでスポット名を自動補完

![インポートダイアログ](./examples/import-wizard.jpg)

上記のインポートダイアログはさらに：**KML**（Google My Maps のエクスポート形式）、**GeoJSON**（geojson.io、Google Takeout）、**GPX**（登山アプリの軌跡）、**独自 .trailpaint プロジェクト**、スクリーンショット背景にも対応。

### 🗺️ 地図上で手動作成

定番の流れ。地図を見ながら旅を思い出すのに最適：

1. 地点検索、またはスクリーンショットをドラッグして背景に設定
2. 「スポット追加」で場所をマーク、名前・写真を入力
3. 「ルート描画」で経路を描く
4. 「エクスポート」で完成品をダウンロード

初回利用時には 3 ステップのチュートリアル付き。ドロップダウンから **8 つのサンプルルート**（陽明山・合歡山・抹茶山・嘉明湖・九份・阿朗壹・白石湖・ロンドン博物館巡り）をワンクリックで試せます。

### 🤖 AI で生成

「インポート」→「🤖 AI でルート JSON を作成」→ プロンプトテンプレートをコピー、ChatGPT や Claude に旅程を貼り付けると、インポート可能な JSON が生成されます。計画段階や架空ルートに最適。

---

## 一枚の地図、複数のアウトプット

v1.3 ではすべての出力を単一の「エクスポート Wizard」に統合、3 つの tab が 3 つの利用シーンに対応：

### 🖼️ 画像（人に見せる・ウェブに載せる）

![エクスポート - 画像 tab](./examples/export-wizard-image.jpg)

- **PNG ダウンロード**：1:1（IG feed）/ 9:16（ストーリー）/ 4:3 / オリジナル
- **3 種類のフレーム**：クラシック二重枠 / 紙の質感手描き / ミニマル細枠
- **スタイルフィルター**：オリジナル / スケッチ
- **リアルタイムプレビュー + 構図微調整**：矢印キーで移動、+/- でズーム
- **🔗 共有リンク**：Cloudflare Workers + KV の短縮 URL、TTL 90 日、写真もリンクと一緒に共有され、LINE / Facebook プレビューでは最初の写真が自動的に Open Graph カバーに
- **🤖 AI プロンプト**：4 スタイル（和風手描き / 宝の地図 / カワイイ / ミニマル線画）、Midjourney / Gemini で完全イラスト風へ
- **📋 Player 埋め込みコード**：プロジェクトデータ入りの `<iframe>` をワンクリックでコピー、WordPress・Notion・Substack に貼り付け

### 💾 バックアップ（自分用）

![エクスポート - バックアップ tab](./examples/export-wizard-backup.jpg)

- **.trailpaint プロジェクトファイルをダウンロード**：すべてのスポット・ルート・写真を完全保持
- **.trailpaint インポート**：編集を復元
- これがソース形式 — 機器変更・再インストール・草稿保存に使用

### 🌐 互換形式（他ツール用）

![エクスポート - 互換 tab](./examples/export-wizard-interop.jpg)

- **GeoJSON**：geojson.io、Mapbox、D3 ビジュアライゼーション
- **KML**：Google My Maps、Google Earth、Gaia GPS
- 純粋な地理構造のみ、写真は含まれません（オープンデータ境界）

---

## Story Player：地図を物語に

![Story Player — イエスの受難週自動ガイド](./examples/trailpaint-02.jpg)

**[/app/player/](https://trailpaint.org/app/player/)** は「自動ガイド再生」専用の独立エントリ：

- **▶ fly-to アニメーション**：各スポットへ飛び、ポップアップで写真と説明を表示
- **⚙ 再生設定**：間隔 2s/4s/6s/8s、ループ 1×/2×/3×/∞
- **🗺️ 背景切り替え + 歴史地図オーバーレイ**：5 種の背景 + 中央研究院 1897/1921/1966 歴史レイヤー
- **🎵 BGM**：MP3/M4A 直リンク URL を貼るだけで再生（[incompetech.com](https://incompetech.com/music/royalty-free/music.html) の無料 CC BY 音源推奨）
- **📺 フルスクリーン**：展示会・授業プロジェクション・イベント用途に最適

### Story Page：`/stories/` ストーリー集

厳選ストーリー地図を掲載：
- **台湾宣教師の足跡**：馬偕・バークレー・ランズボロー・マクスウェル・ドリス・ブルハムなど、19-20 世紀の宣教師の台湾における宣教ルート、中央研究院の歴史地図オーバーレイ付き
- **イエスの受難週**：エルサレム入城から復活顕現まで 12+ の聖地を、ダ・ヴィンチ・カラヴァッジョ・レンブラントなどの古典絵画と YouVersion の聖書テキストリンク付きで紹介

横タブで人物・章を切り替え、LINE / FB 共有時に OG サムネイル自動表示。

---

## 真の手描き風にしたい？

PNG エクスポート + AI プロンプトのコピー → ChatGPT / Gemini の画像生成機能に貼り付け：

![AI スタイル化結果](./examples/Gemini_Generated_Image.jpg)

---

## 誰向け？

| ユーザー | 用途 |
|----------|------|
| 🎒 登山・トレッキング | ルート計画、GPX インポート、標高プロファイル |
| 🚲 サイクリング | ルートマーク、距離統計 |
| 📸 旅行ブロガー | IG / ストーリー共有カードのエクスポート |
| 🌲 エコガイド | スポットマーカー、解説カード、写真 |
| 🏫 教育機関 | 環境教育、授業教材、歴史地図 |
| ⛪ 教会 / NGO | 宣教師の足跡、奉仕ルートストーリー |

---

## 機能一覧

### 背景地図とマーカー
5 種のオンライン地図（標準 / 衛星 / 等高線 / ダーク / 多言語ベクター）· スクリーンショットを背景としてドラッグ · 手描き風破線 + 矢印 · 紙質感スポットカード · 31 種スポットアイコン · ルートノードのドラッグ編集 · 5 色のルートカラー循環

### データ処理
GPX インポート（軌跡 + 航点の自動簡略化）· **写真 EXIF インポート（JPEG/HEIC with GPS）** · **KML / GeoJSON インポート** · 標高プロファイル（距離/時間/累積上昇下降）· 逆ジオコーディングによる自動命名 · JSON 保存で完全復元

### エクスポート
**統一 ExportWizard**（画像 / バックアップ / 互換の 3 tab）· マルチ比率クロップのリアルタイムプレビュー · 3 種フレーム + 2 種フィルター · 統計 overlay · Cloudflare Workers + KV 短縮 URL（TTL 90 日、OG カバー写真） · AI プロンプト 4 スタイル · Player 埋め込みコード · GeoJSON / KML 純粋な地理構造

### 体験
Undo/Redo（Cmd+Z）· 手描き揺れ SVG filter · PWA インストール可能 · 3 言語自動判定 · モバイル底部フローティングメニュー · Fit All 全体表示 · スポットのドラッグ並び替え · 初回チュートリアル

### Story Player
自動再生 · 背景切り替え + 歴史レイヤー · BGM · フルスクリーン · Player 埋め込みコード · Editor → Player ワンクリックジャンプ

---

## 利用サービス

| サービス | 用途 | リンク |
|----------|------|--------|
| Leaflet | マップエンジン | [leafletjs.com](https://leafletjs.com) |
| OpenStreetMap | 地図データ（現地語ラベル） | [openstreetmap.org](https://www.openstreetmap.org) |
| Protomaps | 多言語ベクタータイル | [protomaps.com](https://protomaps.com) |
| CARTO | マップタイル | [carto.com](https://carto.com) |
| Photon | 地点検索 + 逆ジオコーディング（主） | [photon.komoot.io](https://photon.komoot.io) |
| Nominatim | 逆ジオコーディング（フォールバック） | [nominatim.org](https://nominatim.openstreetmap.org) |
| Open-Meteo | 標高データ | [open-meteo.com](https://open-meteo.com) |
| Cloudflare Workers + KV | 共有リンク短縮 URL（TTL 90 日） | [workers.cloudflare.com](https://workers.cloudflare.com) |
| 中央研究院 | 台湾歴史地図 1897/1921/1966 | [gis.sinica.edu.tw](https://gis.sinica.edu.tw) |

---

## サイト構成

Editor / Player 以外にも、trailpaint.org には直接リンク・埋め込み・共有できるエントリがあります：

- [`/features/`](https://trailpaint.org/features/) — 機能リファレンス（インポート / エクスポート / Story Player / AI プロンプト / PWA インストール）
- [`/features/install/`](https://trailpaint.org/features/install/) — **PWA インストール手順**（iOS Safari / Android Chrome / デスクトップ）
- [`/examples/`](https://trailpaint.org/examples/) — サンプルルート集、ワンクリックで再生またはダウンロード
- [`/stories/`](https://trailpaint.org/stories/) — 厳選ストーリー集（台湾宣教師、受難週）
- [`/faq/`](https://trailpaint.org/faq/) — 完全な FAQ
- [`llms.txt`](https://trailpaint.org/llms.txt) / [`agent-card.json`](https://trailpaint.org/.well-known/agent-card.json) — AI・エージェント向けの構造化サマリ

---

## 技術構成

- **フレームワーク**：Vite + React 19 + TypeScript 5（strict）
- **地図**：Leaflet + react-leaflet + protomaps-leaflet（CARTO + Protomaps ベクタータイル）
- **状態管理**：Zustand + zundo（temporal undo/redo）
- **PWA**：vite-plugin-pwa + Workbox
- **エクスポート**：html-to-image + Canvas 後処理 + スタイルフィルター
- **インポート**：exifr（EXIF GPS、HEIC 含む）+ @tmcw/togeojson（KML）+ 自作 GeoJSON parser
- **i18n**：自作 t() + ランタイム locale 判定
- **構造**：`core/`（Leaflet 非依存）· `map/`（Leaflet 統合層）· `player/`（Story Player 独立エントリ）
- **Story Page**：純粋な静的 HTML + vanilla JS（Vite を経由せず、ネイティブ SEO/OG）
- **マルチページビルド**：Vite rollup multi-entry（Editor `/app/` + Player `/app/player/`）

---

## 開発

```bash
cd online
npm install
npm run dev        # 開発サーバー
npm run build      # ../app/ にビルド
npm test           # vitest
```

共有リンク短縮 URL を支える Cloudflare Worker は [`cloudflare/`](./cloudflare/) にあります。デプロイ方法は同ディレクトリの README を参照してください。

Spectra SDD 仕様：`openspec/changes/`（git 非管理、ローカル参照）

---

## あなたのルートマップを共有

TrailPaint で満足いく地図を作った？[Issue](https://github.com/notoriouslab/trailpaint/issues) から `.trailpaint` プロジェクトファイルを共有してください。エクスポート成果物とストーリー（どのルート？なぜ歩いた？）を添えて。優秀作品は `/stories/` に掲載されます。

## 貢献

PR と Issue を歓迎します。バグ報告、機能提案、作品共有、すべて大歓迎。

## 免責事項

TrailPaint は**ルート記録と共有ツールであり、ナビゲーションアプリではありません**。距離・時間・標高などのデータは地図と GPX 軌跡から自動計算され、実際の状況と異なる場合があります。アウトドア活動は各自で事前計画を行い、現地状況を最優先してください。背景地図データは OpenStreetMap などの第三者サービスに由来し、リアルタイム性や完全な正確性は保証されません。

## ライセンス

GPL-3.0 License — 自由に使用・改変可能、派生作品も同じく GPL-3.0 でオープンソース公開が必要。

---

*TrailPaint のプロトタイプは、台北靈糧堂致福益人学苑の公園生態探索プログラムと、プロのアウトドアエコガイドのニーズから着想を得ました。🌿*
