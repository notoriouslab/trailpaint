# TrailPaint

[中文](README.md) | [日本語](README.ja.md)

> The most beautiful trail map maker — export as illustration, simple and powerful

[![Version](https://img.shields.io/badge/version-1.0.1-orange.svg)](https://trailpaint.org/app/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-5a0fc8.svg)](https://trailpaint.org/app/)
[![i18n](https://img.shields.io/badge/i18n-中文%20%7C%20EN%20%7C%20日本語-green.svg)](https://trailpaint.org/app/)
[![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-222.svg)](https://trailpaint.org/app/)

**[Try it now →](https://trailpaint.org/app/)** · **[Explore Stories →](https://trailpaint.org/stories/)** · **[Story Player →](https://trailpaint.org/app/player/)**

---

## What is This?

TrailPaint is a hand-drawn style trail map creation tool. Use the online map or upload a screenshot to produce a beautiful shareable illustrated map in minutes.

Supports PWA — installable to your phone's home screen like a native app. Auto-detects Chinese / English / Japanese.

![trailpaint/examples/trailpaint-map.jpg](./examples/trailpaint-map.jpg)

## Who is it for?

| Audience | Use Case |
|----------|----------|
| 🎒 Hiking & Trekking | Route planning, GPX import, elevation profile |
| 🚲 Cycling | Route marking, distance statistics |
| 📸 Travel Bloggers | IG / Story share card export |
| 🌲 Ecology Guides | POI markers, info cards, photos |
| 🏫 Education | Environmental education, course materials |

---

## How to Use

```
1. Search for a location  or  drag a screenshot onto the map
2. Click "Add Spot" to place markers, add name and photo
3. Click "Draw Route" to trace a path, then "Finish Route"
4. Click "Export" to open preview, choose ratio / border / style filter, download PNG
```

First-time users get a 3-step tutorial. You can also load one of 8 example routes from the dropdown (including a London Museum Tour).

### Create Trails with AI

Click "Import" → "🤖 Create trail JSON with AI" → copy the prompt template, paste it to ChatGPT or Claude with your trip description, and the AI will generate an importable JSON file.

---

## Features

### Map

- 🗺️ **Online Map** — OpenStreetMap with 5 basemap styles (Standard / Satellite / Contour / Dark / Multilingual Vector)
- 📷 **Screenshot Basemap** — Drag any image onto the map to use as custom basemap
- 🔍 **Place Search** — Search any location, map flies there
- ◎ **Locate** — One-tap geolocation

### Markers

- 🖊️ **Route Drawing** — Hand-drawn dashed lines + directional arrows, 5-color auto-cycle
- 📍 **Spot Cards** — Paper-textured hand-drawn style, with photos, 31 icon types, drag-to-position
- ✏️ **Route Editing** — Drag nodes to adjust, double-click to delete, change color
- 🔎 **Zoom-Aware Cards** — Cards scale with map zoom level
- 👆 **Touch Drag** — Drag cards with your finger on mobile

### Data

- 📥 **GPX Import** — Parse tracks + waypoints, auto-simplify large datasets
- ⛰️ **Elevation Profile** — Distance / estimated time / total ascent & descent
- 🔭 **Elevation Query** — Query elevation for manually drawn routes (Open-Meteo API)
- 📏 **Auto Route Naming** — Reverse geocode to place names
- 💾 **Save / Load** — JSON format, fully restorable

### Export

- 📐 **Export Preview** — Real-time preview overlay with all options in one place
- 🎯 **Composition Adjust** — Pan and zoom controls in preview to fine-tune framing
- 📐 **Multi-Ratio** — 1:1 (IG) / 9:16 (Story) / 4:3 / Original
- 🖼️ **3 Border Styles** — Classic double / Paper hand-drawn / Minimal thin
- 🎨 **Style Filters** — Original / Sketch
- 📊 **Stats Overlay** — Distance, time, elevation gain printed on image
- 🔗 **Share Link** — Generate shareable URL (optional short link)
- 🤖 **AI Prompt** — Copy a stylized prompt for AI image generation

### Import

- 📥 **Import Wizard** — Unified import: upload basemap / load JSON / import GPX, supports drag-and-drop files into the window
- 🤖 **AI Tutorial** — Built-in prompt template to generate importable JSON with AI
- 🌿 **Example Routes** — 8 example routes (including London Museum Tour), one-click load

### Experience

- ↩️ **Undo/Redo** — Cmd+Z / Ctrl+Z
- 🌊 **Hand-drawn Wobble** — SVG filter effect
- 📱 **PWA** — Installable to home screen, works like a native app
- 🌐 **Three Languages** — Chinese / English / Japanese, auto-detected
- ☰ **Mobile Bottom Menu** — Floating action menu when sidebar is closed

### UX Enhancements

- 🏁 **Fit All** — One-click zoom to show all spots and routes (including card bounds calculation)
- ↕️ **Drag Reorder** — Drag spots in the list to reorder

### Story Player

- ▶ **Auto-play** — Fly-to animation with popup cards showing photos and descriptions
- ⚙ **Playback settings** — Interval (2s/4s/6s/8s), loop count (1×/2×/3×/∞)
- 🗺️ **Historical map overlay** — Three historical map layers from Academia Sinica (1897/1921/1966)
- 📺 **Fullscreen** — Ideal for exhibitions, teaching, and presentations
- 🔗 **iframe embed** — `?embed=1&src=path` to embed in any webpage
- ▶ **Story mode** — One-click jump from Editor to Player

### Story Page

- 📖 **Story collections** — `/stories/` showcases curated story maps
- 👤 **Character switching** — Horizontal tabs to switch between routes
- 🌏 **OG preview** — Auto-generates title + thumbnail when shared on social media
- 📱 **Responsive** — Desktop / tablet / mobile adaptive layout
- 🇹🇼 **Taiwan Missionaries** — Mackay, Barclay, Landsborough, Maxwell, Brougham — 5 missionaries' footprints

### POI Icons (31 types)

🌿 Plant 🌸 Flower 🌲 Tree 🐦 Bird 🦋 Insect 💧 Water 🐟 Fish 🍄 Mushroom ⛰️ Rock
🚻 Restroom 🚌 Bus Stop 🛋️ Rest Area ⛺ Camping 🥤 Restaurant 🍺 Bar ♨️ Hot Spring 🏢 Mall 🎬 Cinema 🚲 Bicycle 🅿️ Parking 🩺 First Aid 🏖️ Beach 🎠 Amusement
△ Trig Point 🚩 Rally Point
🔍 Viewpoint 🔭 Stargazing 📷 Photo Spot ⚠️ Caution ℹ️ Info 📍 Pin

---

## Want a More Hand-Drawn Look?

After exporting, use the "Copy AI Prompt" button and paste it along with your exported image into ChatGPT / Gemini or any AI agent's image generation feature:

![Gemini_Generated_Image.jpg](./examples/Gemini_Generated_Image.jpg)

---

## Powered By

| Service | Purpose | Link |
|---------|---------|------|
| Leaflet | Map engine | [leafletjs.com](https://leafletjs.com) |
| OpenStreetMap | Map data (local language labels) | [openstreetmap.org](https://www.openstreetmap.org) |
| Protomaps | Multilingual vector map tiles | [protomaps.com](https://protomaps.com) |
| CARTO | Map tiles | [carto.com](https://carto.com) |
| Nominatim | Place search | [nominatim.org](https://nominatim.openstreetmap.org) |
| Open-Meteo | Elevation data | [open-meteo.com](https://open-meteo.com) |
| TinyURL | URL shortening | [tinyurl.com](https://tinyurl.com) |

## Offline Version

For fully offline use, download [`trailpaint.html`](trailpaint.html) and open in any browser.

> ⚠️ Offline version lacks online map, GPX import, elevation features. iOS cannot open local HTML files.

---

## Technical Architecture

- **Framework**: Vite + React 19 + TypeScript
- **Map**: Leaflet + react-leaflet + protomaps-leaflet (CARTO + Protomaps vector tiles)
- **State**: Zustand + zundo (temporal undo/redo)
- **PWA**: vite-plugin-pwa + Workbox
- **Export**: html-to-image + Canvas post-processing + style filters
- **i18n**: Custom t() + runtime locale detection
- **Structure**: core/ (Leaflet-independent) + map/ (Leaflet integration)

## Development

```bash
cd online
npm install
npm run dev        # Dev server
npm run build      # Build to ../app/
```

## Share Your Trail Map

Made a trail map you're proud of? We'd love to see it!

Share your `.trailpaint.json` via [Issue](https://github.com/notoriouslab/trailpaint/issues) with an exported image and brief description. We'll showcase the best ones here.

## Contributing

PRs and Issues are welcome!

## Disclaimer

TrailPaint is a route recording and sharing tool, not navigation software. Distance, time, elevation, and other data are automatically estimated from map and GPX data and may differ from actual conditions — for reference only. Basemap data is provided by third-party services such as OpenStreetMap and is not guaranteed to be up-to-date or fully accurate. Please plan your outdoor activities independently and always defer to actual on-site conditions.

## License

GPL-3.0 License — free to use and modify. Derivative works must also be open-sourced under GPL-3.0.

---

*TrailPaint was inspired by the park ecology exploration course at Taipei Bread of Life Church's Zhifu Yiren Academy and professional outdoor ecology guide needs. 🌿*
