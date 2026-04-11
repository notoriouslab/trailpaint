# Change 004: 手機 UX 升級

## 概述

解決手機上的 4 個 UX 痛點：卡片太大/不縮放/不能拖/功能沒入口。

## 設計決策

### D1: 卡片 Zoom-Aware 縮放

**方案比較：**

| 方案 | 做法 | 優點 | 缺點 |
|------|------|------|------|
| A. CSS scale（推薦） | transform: scale() 隨 zoom 線性縮放 | 改動小，保留現有紙感視覺 | 需處理 connector line 計算 |
| B. SVG 卡片 | 把卡片改成 SVG 繪製 | 天然隨地圖縮放，匯出更可靠 | 改動巨大，中文排版困難 |
| C. Leaflet Popup | 用原生 L.popup | 零程式碼 | 樣式受限，無法做紙感效果 |

**選擇 A。** 改動最小，視覺品質不變。

**公式：** `scale = clamp(0.5, 1 + (zoom - 14) * 0.12, 1.3)`
- 基準 zoom 14（步道地圖主要操作範圍 12-16 的中間值）
- 線性而非指數，zoom 10-17 之間平滑縮放（8 個 zoom levels）
- Clamp 避免極端值：最小 50%、最大 130%

**transform-origin: top center** — connector line 連接到卡片頂部中心，縮放不影響連接點。

**pin circle 一起縮放：** `.spot-pin__circle` 加 CSS `transform: scale(var(--spot-scale))`。Leaflet iconSize 保持 50x50（click area 不變，小 pin 反而更容易點擊）。

### D2: 卡片 Touch Drag

平行 mouse events 加 touch events：

```
onTouchStart → record touch position + current offset
touchmove → update offset (clientX/Y delta)
touchend → cleanup, re-enable map dragging
```

關鍵：
- touchmove 用 `{ passive: false }` + `preventDefault()` 阻止頁面滾動
- **多指手勢區分**：`onTouchStart` 只在 `e.touches.length === 1` 時啟動 drag。如果觸摸中途變成多指（`e.touches.length > 1`），立即取消 drag、還原 offset、re-enable map dragging。這樣 pinch-zoom 不會被誤判為 card drag。

### D3: 手機卡片尺寸

| 裝置 | 寬度 | halfW |
|------|------|-------|
| 桌面 (>768px) | 180px | 90 |
| 手機 (≤768px) | 150px | 75 |

SpotCard.css 用 media query。SpotMarker.tsx 用自訂 `useIsMobile()` hook（基於 `matchMedia('(max-width: 768px)')`，監聽 `change` event 實時更新），驅動 halfW 切換。halfW 變化時 `reposition()` 會自動重算 connector line x2/y2。手機版 padding/font-size 微調（padding 8px→6px，title 15px→13px）避免 150px 排版擁擠。

### D4: 底部浮動選單

**方案比較：**

| 方案 | 做法 | 優點 | 缺點 |
|------|------|------|------|
| A. ☰ popover（推薦） | ModeToolbar 旁加 ☰ 按鈕，展開功能列表 | 乾淨不佔空間 | 多一層操作 |
| B. 全部攤開 | 底部工具列加所有按鈕 | 一鍵直達 | 擁擠 |
| C. Bottom sheet | sidebar 改底部滑出 | 手機 UX 最佳實踐 | 改動巨大 |

**選擇 A。** 改動適中。

FloatingActions 組件：
- 位置：ModeToolbar 右邊
- 按鈕：☰
- 展開：向上彈出 popover，5 個選項（匯出/存檔/載入/GPX/設定）
- 關閉：點外面 / Escape / 選了功能後

### D5: 匯出截圖 Scale 處理

匯出時用當前 zoom 的 scale 渲染卡片（主公已確認）。

**html-to-image + CSS transform 驗證**：html-to-image 在 clone DOM 時會保留 inline style 的 transform（包含 scale）。但需要在 T1 完成後立即實機驗證。降級方案：如果截圖中 scale 丟失，在 captureMap 前遍歷 `.spot-overlay` 用 `getComputedStyle().transform` 取得 matrix，將 scale 寫入 DOM width/height 屬性再截圖。

## 改動檔案清單

| 檔案 | 變更 |
|------|------|
| `online/src/map/SpotMarker.tsx` | T1+T2+T3：scale 計算、touch drag、halfW 動態 |
| `online/src/map/MapView.css` | T1：pin scale CSS 變數 |
| `online/src/core/components/SpotCard.css` | T3：手機 150px |
| `online/src/App.tsx` | T4：floating 區域加 FloatingActions |
| `online/src/core/components/FloatingActions.tsx` | T4：新建 |
| `online/src/core/components/FloatingActions.css` | T4：新建 |
| `online/src/i18n/zh-TW.ts` | T4：新 key |
| `online/src/i18n/en.ts` | T4：新 key |
| `online/src/i18n/ja.ts` | T4：新 key |

## 任務拆解

| Task | 內容 | 依賴 |
|------|------|------|
| T1 | 卡片 zoom scale + pin scale | — |
| T2 | 卡片 touch drag | T1（共改 SpotMarker） |
| T3 | 手機卡片 150px + halfW 動態 | T1 |
| T4 | 底部浮動選單 FloatingActions | — |
| T5 | i18n 三語 | T4 |
| T6 | Build + 桌面/手機測試 | T1-T5 |

## 風險

1. **connector line 計算**：scale 後 pin-to-card 相對位置改變，line 的 x1/y1/x2/y2 需要配合。用 transform-origin: top center 可簡化。
2. **touch vs map zoom 衝突**：card touch 時 disable map dragging（跟 mouse 版一致）。
3. **iOS 匯出**：截圖時 scale 已在 DOM 中，html-to-image 應能正確截取。需實機驗證。

## G1 審查修正

Sub-Agent 審查發現 3 個 CRITICAL，已修正：

1. **halfW 動態切換邏輯**（CRITICAL→修正）：補充 `useIsMobile()` hook 監聽 matchMedia change event，halfW 實時更新。手機版加 padding/font-size 微調避免排版擁擠。
2. **Touch drag 多指手勢區分**（CRITICAL→修正）：補充 `touches.length === 1` 判斷，多指時取消 drag + re-enable map。
3. **截圖 scale 驗證**（CRITICAL→修正）：補充 T1 後立即驗證 + 降級方案（getComputedStyle → 寫入 DOM width/height）。

Sub-Agent 另有 4 個 WARNING（connector line 計算文件化、popover 事件冒泡、手機排版驗證、iOS 實機驗證），已知悉，實作時處理。
