# TrailPaint 路小繪

[中文](README.md) | [日本語](README.ja.md)

> The most beautiful trail map export tool — export as illustration, simple and easy to use

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

---

## Use It Now

### Online Version (Recommended)

**[Open TrailPaint](https://notoriouslab.github.io/trailpaint/app/)**

Create hand-drawn trail illustrations on a real map. Supports PWA — installable to your phone's home screen.

### Offline Version

Download [`trailpaint.html`](trailpaint.html) as a single file, open it in any browser. No internet required.

> ⚠️ iOS cannot open local HTML files directly from the Files app. Use the online version instead.

---

## What is This?

TrailPaint is a hand-drawn style trail map creation tool. Upload a screenshot or use the online map to produce a beautiful shareable illustrated map in minutes.

![trailpaint/examples/trailpaint-map.jpg](./examples/trailpaint-map.jpg)

## Who is it for?

| Audience | Use Case |
|----------|----------|
| 🎒 Hiking & Trekking | Route planning, GPX import, elevation profile |
| 🚲 Cycling | Route marking, distance statistics |
| 📸 Travel Bloggers | IG / Story share card export |
| 🌲 Ecology Guides | POI markers, info cards, photos |
| 🏫 Educational Institutions | Environmental education, course materials |

---

## Two Versions Compared

| | Online Version | Offline Version |
|---|----------------|-----------------|
| Base Map | OpenStreetMap live map + screenshot upload | Screenshot upload only |
| GPS Coordinates | Yes (lat/lon) | No (pixel coordinates) |
| GPX Import | Yes | No |
| Elevation Data | Yes (GPX or API query) | No |
| Place Search | Yes | No |
| Map Style Switch | Standard / Satellite / Contour / Dark | No |
| Area Cover-up | No | Yes (frosted / soft / paper) |
| Watercolor Filter | No | Yes |
| PWA Install | Yes | No |
| Offline Use | Requires prior connection for caching | Fully offline |
| Tech Stack | React + TypeScript + Leaflet | Single HTML + compiled JSX |

---

## Online Version Features

### Core

- 🖊️ **Route Drawing** — Hand-drawn dashed lines + directional arrows, 5-color auto-cycle
- 📍 **POI Cards** — Paper-textured hand-drawn style, with photos, 21 icon types, drag-to-position
- 📷 **Screenshot Base Map** — Drag an image onto the screen to switch automatically, supports Google Maps screenshots
- 🗺️ **Map Style Switch** — Standard / Satellite / Contour / Dark

### Export

- 📐 **Multi-ratio Export** — 1:1 (IG) / 9:16 (Story) / 4:3 / Original
- 🖼️ **3 Border Styles** — Classic double-frame / Paper hand-drawn / Minimal thin-frame
- 📊 **Stats Overlay** — Distance, time, and elevation gain automatically printed on the image
- 🔍 **High Resolution** — 1x / 2x / 3x pixelRatio

### Data

- 📥 **GPX Import** — Parse tracks + waypoints, auto-simplify large point sets
- ⛰️ **Elevation Profile** — Canvas polyline chart with distance / time / gain / loss
- 🔭 **Elevation Query** — Manually drawn routes can also query elevation (Open-Meteo API)
- 💾 **Save / Load** — JSON format, backward compatible

### Experience

- ↩️ **Undo/Redo** — Cmd+Z keyboard shortcut
- 🌊 **Hand-drawn Wobble** — SVG filter effect, togglable
- 🌐 **Three Languages** — Chinese / English / Japanese, auto-detected
- 📱 **PWA** — Installable to phone home screen
- 🎓 **User Onboarding** — 3-step tutorial on first launch + example project

### POI Icons

🌿 Plant 🌸 Flower 🌲 Tree 🐦 Bird 🦋 Insect 💧 Water 🐟 Fish 🍄 Mushroom ⛰️ Rock  
🚻 Restroom 🚌 Bus Stop 🪑 Rest Area 🥤 Food & Drink 🚲 Bicycle 🅿️ Parking 🩺 First Aid  
🔭 Viewpoint 📷 Photo Spot ⚠️ Caution ℹ️ Info 📍 Pin

---

## How to Use

```
1. Search for a location  or  drag a screenshot onto the screen
2. Click "Add POI" to place a marker on the map, fill in name and photo
3. Click "Draw Route" to trace a path, then click "Finish Route"
4. Choose export ratio and border style, download PNG
```

---

## Technical Architecture

### Online Version (`online/`)

- **Framework**: Vite + React 19 + TypeScript
- **Map**: Leaflet + react-leaflet (Carto Voyager tiles)
- **State**: Zustand + zundo (temporal undo/redo)
- **PWA**: vite-plugin-pwa + Workbox
- **Export**: html-to-image + Canvas post-processing
- **i18n**: Lightweight custom t() + runtime locale detection
- **Structure**: core/ (Leaflet-independent) + map/ (Leaflet integration layer)

### Offline Version (root directory)

- **Framework**: Preact (React compat) + pure Browser API
- **Rendering**: SVG overlay + Canvas export
- **Single File**: All JS/CSS embedded in HTML

## Development

```bash
# Online version
cd online
npm install
npm run dev        # Dev server
npm run build      # Build to ../app/

# Offline version (no build needed)
open trailpaint.html
```

## Known Limitations

- Online version requires internet to load map tiles (PWA cache allows offline browsing of cached areas)
- Switching between screenshot and map mode clears all POIs and routes (different coordinate systems)
- iOS cannot open local HTML files (platform limitation — use the online version)

## Want a More Hand-Drawn Look?

Take the exported image and feed it to ChatGPT / Gemini with a prompt like "create a comic-style map" to produce an even more hand-crafted aesthetic:

![Gemini_Generated_Image.jpg](./examples/Gemini_Generated_Image.jpg)

## Contributing

PRs and Issues are welcome!

## License

GPL-3.0 License — free to use and modify. Derivative works must also be open-sourced under GPL-3.0.

---

*TrailPaint was originally inspired by the park ecology exploration course at Taipei Bread of Life Church's Zhifu Yiren Academy and professional outdoor ecology guide needs. 🌿*
