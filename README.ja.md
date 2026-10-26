# TrailPaint 路小繪

[中文](README.md) | [English](README.en.md)

> **手描き風ルートマップ作成ツール** — 旅をひとつの物語る地図に。バックエンド不要、PWA インストール対応、三言語自動判定。

[![Version](https://img.shields.io/badge/version-1.8.3-orange.svg)](https://github.com/notoriouslab/trailpaint/releases)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-5a0fc8.svg)](https://trailpaint.org/features/install/)
[![i18n](https://img.shields.io/badge/i18n-中文%20%7C%20EN%20%7C%20日本語-green.svg)](https://trailpaint.org/app/)

**[今すぐ使う →](https://trailpaint.org/app/)** · **[ストーリーマップを見る →](https://trailpaint.org/stories/)** · **[Story Player →](https://trailpaint.org/app/player/)** · **[PWA インストール →](https://trailpaint.org/features/install/)**

![TrailPaint エディタ — デスクトップのツールドックレイアウト](./examples/trailpaint-hero.jpg)

---

## TrailPaint とは

使い方のリズムは三拍子：**集めて、編集して、シェアする**。

1. **集める** — スマホの写真をそのままインポート（EXIF GPS からスポット自動作成）、または ChatGPT / Claude に行程 JSON を生成してもらい貼り付け
2. **編集する** — デスクトップで並び替え、説明文、ルート描画、不要ルートの非表示、歴史地図の重ね合わせ
3. **シェアする** — イラスト風 PNG、短縮リンク、埋め込み可能な自動ツアープレイヤーで公開

| 特色 | 内容 |
|------|------|
| 📷 **写真インポート** | EXIF GPS でスポット自動作成・撮影時刻順に整列；複数日の旅は「スポットを連結」で日ごとに 1 本のルート |
| 🤖 **AI ワークフロー** | プロンプトテンプレート内蔵。LLM 生成の行程 JSON を貼るだけ、Wikimedia Commons から写真も自動取得 |
| ⏱ **時空を旅する語り** | 年代スライダー + 中央研究院の歴史地図オーバーレイ + 自動ツアー |
| 🖼️ **多彩な出力** | PNG（IG / ブログ）/ 短縮リンク / iframe 埋め込み / GPX·KML·GeoJSON 相互運用 |
| 🔐 **プライバシー第一** | バックエンドなし、データはすべてブラウザ内、オフライン動作 |

![TrailPaint 作品 — 台北士林区 8 スポットのルート](./examples/trailpaint-01.jpg)

---

## クイックスタート

[trailpaint.org/app/](https://trailpaint.org/app/) を開き、スタート画面の 3 枚のカードから選ぶだけ：

<img src="./examples/mobile-start.jpg" width="320" alt="モバイルのスタート画面 — 3 枚のアクションカード">

- **📷 写真をインポート** — 旅の写真を選ぶと GPS が位置を、撮影時刻が順序を決める。1 分で完成
- **🤖 AI JSON を貼り付け** — テンプレートを ChatGPT / Claude にコピーし、生成された JSON を貼り戻す
- **🗺️ 地図から始める** — スマホは地図をタップするだけでスポット追加（モード切替不要）、デスクトップはツールドック完備。サンプルルートもワンタップ

最後に「エクスポート」で比率とスタイルを選び、PNG 保存または共有リンクを発行。

---

## 3 つの作成方法

### 📷 写真から自動作成

GPS 付きで撮影 → ドラッグ＆ドロップ → 座標・時系列・逆ジオコーディングの地名まで自動。iPhone HEIC / Android JPEG 対応。GPS のない写真は撮影時刻から近傍補間で配置し、あとからドラッグで微調整。**複数日の旅程は「スポットを連結」で日ごとに 1 本のルートに**。見せたくないルートは個別に非表示にでき、Player・画像・GeoJSON 書き出しにも反映されます。

### 🤖 AI で生成

インポート画面のプロンプトテンプレートを ChatGPT / Claude に渡し、生成された JSON を貼り戻すだけ。Wikimedia Commons からの CC ライセンス写真自動取得（帰属表示付き）にも対応。旅の計画段階や歴史・フィクション題材に最適。

### 🗺️ 手で描く

地名検索、スポット追加、手描き風ルート描画。スマホはタップで追加、デスクトップはツールドックとプロパティパネルで快適に。

![インポート画面 — よく使う操作を上部に、他形式は折りたたみ](./examples/import-wizard.jpg)

**対応インポート形式：** 写真（EXIF）、GPX（登山アプリ）、KML（Google マイマップ）、GeoJSON、.trailpaint バックアップ、スクリーンショットをベースマップに

---

## 出力とシェア

| 形式 | 用途 |
|------|------|
| **PNG** | 1:1（IG フィード）/ 9:16（ストーリー）/ 4:3 / オリジナル；フレーム 3 種 × フィルター 2 種 |
| **短縮リンク** | 写真も一緒に共有、OG プレビューは表紙を自動使用（Cloudflare Workers、TTL 90 日） |
| **iframe 埋め込み** | WordPress、Notion、Substack にインタラクティブプレイヤーを設置 |
| **.trailpaint バックアップ** | プロジェクト完全保存 — 機種変更・復元用 |
| **GeoJSON / KML** | geojson.io、Google マイマップ、Google Earth 向け（地理データのみ） |

![エクスポート — 画像タブ](./examples/export-wizard-image.jpg)

**AI スタイル化プロンプト**（日本風手描き / 宝の地図 / ゆるいカートゥーン / ミニマル線画）も用意 — 出力 PNG を ChatGPT / Gemini に渡せば本格的な手描きイラストに：

![AI スタイル化の作例](./examples/Gemini_Generated_Image.jpg)

---

## Story Player：地図が物語る

**[Story Player](https://trailpaint.org/app/player/)** は静的な地図を自動ツアーに変えます：fly-to アニメーション、写真カード、BGM、フルスクリーン — 展示・授業・ウェブ埋め込みに。

- **⏱ 年代スライダー** — ドラッグで歴史地図をクロスフェード切替（中央研究院の前漢/唐/南宋/元/明 + 台湾 1897/1921/1966 + ローマ帝国 AD 200）、スポットも年代で明滅
- **📚 コンピレーション** — 複数の物語を 1 つのプレイヤーに束ね、物語順・年代順で再生
- **📮 ポストカード** — スポットごとにワンタップで 1080×1080 の正方形画像（地図 + カード + 年代スタンプ）

注目のストーリーマップ（[一覧 →](https://trailpaint.org/stories/)）：

- **台湾宣教師の足跡** — マッカイ、バークレーらのルートを 1897 年日本統治期の地図に重ねて
- **受難週** — 聖書の 12+ 地点、古典絵画、YouVersion 聖句リンク
- **パウロの三大伝道旅行** — AD 46-62 の地中海 34 スポット
- **シルクロード 2000 年** — 張騫 → 玄奘 → マルコ・ポーロ、同じ回廊の三つの足跡
- **裨海紀遊** — 郁永河の 1697 年台湾硫黄採取の旅、清代・日本統治期の地図と共に

![Story Player — 自動ツアー](./examples/trailpaint-02.jpg)

教会向けには [`/church/`](https://trailpaint.org/church/) ランディングページ（日曜学校・週報・ディボーション埋め込み例）。

---

## 技術

| レイヤー | スタック |
|------|------|
| **フロントエンド** | Vite + React 19 + TypeScript 5（strict）；`core/`（ロジック）· `map/`（Leaflet 層）· `player/`（独立エントリ）の分層 |
| **地図** | Leaflet + react-leaflet + protomaps-leaflet；Protomaps ベクター（多言語ラベル）/ OSM / OpenTopoMap / Esri 衛星タイル |
| **状態管理** | Zustand + zundo（undo/redo） |
| **入出力** | exifr + ExifReader（EXIF）、@tmcw/togeojson（KML）、html-to-image + Canvas |
| **地理サービス** | Photon（検索/逆ジオコーディング、主）+ Nominatim（予備）+ Open-Meteo（標高） |
| **歴史地図** | 中央研究院 [gis.sinica.edu.tw](https://gis.sinica.edu.tw) タイルサービス |
| **共有バックエンド** | Cloudflare Workers + KV（唯一のサーバー要素 — 短縮リンクのみ） |
| **PWA** | vite-plugin-pwa + Workbox オフライン対応 |

AI / エージェント統合：[`llms.txt`](https://trailpaint.org/llms.txt) · [`agent-card.json`](https://trailpaint.org/.well-known/agent-card.json) · [プロジェクト JSON Schema](https://trailpaint.org/schemas/project-v3.schema.json)

### 開発

```bash
cd online
npm install
npm run dev        # 開発サーバー（:5173）
npm run build      # ../app/ にビルド
npm test           # vitest
```

Cloudflare Worker のコードは [`cloudflare/`](./cloudflare/)、デプロイ方法は同ディレクトリの README を参照。

---

## コントリビュートと作品シェア

バグ報告（再現手順付き）、機能提案、ドキュメント改善、コード PR を歓迎します。

お気に入りの地図ができたら [Issue](https://github.com/notoriouslab/trailpaint/issues) で `.trailpaint` ファイルと物語をシェアしてください。優れた作品は [`/stories/`](https://trailpaint.org/stories/) で紹介します。

---

## 免責事項

TrailPaint は**ルート記録・共有ツールであり、ナビゲーションソフトではありません**。距離・標高などは自動推算値です。アウトドア活動は現地の実際の状況を優先してください。ベースマップは OpenStreetMap / Protomaps などのサードパーティ提供です。

## ライセンス

**GPL-3.0** — 自由に使用・改変・派生可能。派生物も同じく OSS として公開が必要です。詳細は [LICENSE](LICENSE)。

---

*TrailPaint 路小繪の原型は、台北霊糧堂致福益人学苑の公園エコツアーと自然ガイドのニーズから生まれました。🌿*
