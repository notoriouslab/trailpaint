# TrailPaint

[中文](README.md) | [日本語](README.ja.md)

> The most beautiful trail map maker — export as illustration, simple and powerful

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

**[Try it now →](https://notoriouslab.github.io/trailpaint/app/)**

---

## What is This?

TrailPaint is a hand-drawn style trail map creation tool. Use the online map or upload a screenshot to produce a beautiful shareable illustrated map in minutes.

Supports PWA — installable to your phone's home screen. Auto-detects Chinese / English / Japanese.

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

First-time users get a 3-step tutorial. You can also load one of 6 example trails from the dropdown.

### Create Trails with AI

Click "Import" → "🤖 Create trail JSON with AI" → copy the prompt template, paste it to ChatGPT or Claude with your trip description, and the AI will generate an importable JSON file.

---

## Features

### Map

- 🗺️ **Online Map** — OpenStreetMap with 4 basemap styles (Standard / Satellite / Contour / Dark)
- 📷 **Screenshot Basemap** — Drag any image onto the map to use as custom basemap
- 🔍 **Place Search** — Search any location, map flies there
- ◎ **Locate** — One-tap geolocation

### Markers

- 🖊️ **Route Drawing** — Hand-drawn dashed lines + directional arrows, 5-color auto-cycle
- 📍 **Spot Cards** — Paper-textured hand-drawn style, with photos, 21 icon types, drag-to-position
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
- 📐 **Multi-Ratio** — 1:1 (IG) / 9:16 (Story) / 4:3 / Original
- 🖼️ **3 Border Styles** — Classic double / Paper hand-drawn / Minimal thin
- 🎨 **5 Style Filters** — Original / Watercolor / Sketch / Vintage / Comic
- 📊 **Stats Overlay** — Distance, time, elevation gain printed on image
- 🔗 **Share Link** — Generate shareable URL (optional short link)
- 🤖 **AI Prompt** — Copy a stylized prompt for AI image generation

### Import

- 📥 **Import Wizard** — Unified import: upload basemap / load JSON / import GPX
- 🤖 **AI Tutorial** — Built-in prompt template to generate importable JSON with AI
- 🌿 **Example Trails** — 6 famous Taiwan trails, one-click load

### Experience

- ↩️ **Undo/Redo** — Cmd+Z / Ctrl+Z
- 🌊 **Hand-drawn Wobble** — SVG filter effect
- 📱 **PWA** — Installable, offline cache
- 🌐 **Three Languages** — Chinese / English / Japanese, auto-detected
- ☰ **Mobile Bottom Menu** — Floating action menu when sidebar is closed

### POI Icons (21 types)

🌿 Plant 🌸 Flower 🌲 Tree 🐦 Bird 🦋 Insect 💧 Water 🐟 Fish 🍄 Mushroom ⛰️ Rock
🚻 Restroom 🚌 Bus Stop 🪑 Rest Area 🥤 Restaurant 🚲 Bicycle 🅿️ Parking 🩺 First Aid
🔭 Viewpoint 📷 Photo Spot ⚠️ Caution ℹ️ Info 📍 Pin

---

## Want a More Hand-Drawn Look?

Choose a style filter when exporting (Watercolor, Sketch, Vintage, Comic), or feed the exported image to ChatGPT / Gemini with a prompt like "create a comic-style map":

![Gemini_Generated_Image.jpg](./examples/Gemini_Generated_Image.jpg)

---

## Powered By

| Service | Purpose | Link |
|---------|---------|------|
| Leaflet | Map engine | [leafletjs.com](https://leafletjs.com) |
| OpenStreetMap | Map data (local language labels) | [openstreetmap.org](https://www.openstreetmap.org) |
| CARTO | Map tiles | [carto.com](https://carto.com) |
| Nominatim | Place search | [nominatim.org](https://nominatim.openstreetmap.org) |
| Open-Meteo | Elevation data | [open-meteo.com](https://open-meteo.com) |

All services are free public APIs — no API keys required.

## Offline Version

For fully offline use, download [`trailpaint.html`](trailpaint.html) and open in any browser.

> ⚠️ Offline version lacks online map, GPX import, elevation features. iOS cannot open local HTML files.

---

## Technical Architecture

- **Framework**: Vite + React 19 + TypeScript
- **Map**: Leaflet + react-leaflet (CARTO Voyager tiles)
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

## License

GPL-3.0 License — free to use and modify. Derivative works must also be open-sourced under GPL-3.0.

---

*TrailPaint was inspired by the park ecology exploration course at Taipei Bread of Life Church's Zhifu Yiren Academy and professional outdoor ecology guide needs. 🌿*
