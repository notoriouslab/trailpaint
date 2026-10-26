# TrailPaint

[中文](README.md) | [日本語](README.ja.md)

> **Hand-drawn trail map maker** — turn a journey into an illustrated map that tells its story. No backend, installable PWA, auto-detected trilingual UI.

[![Version](https://img.shields.io/badge/version-1.8.2-orange.svg)](https://github.com/notoriouslab/trailpaint/releases)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-5a0fc8.svg)](https://trailpaint.org/features/install/)
[![i18n](https://img.shields.io/badge/i18n-中文%20%7C%20EN%20%7C%20日本語-green.svg)](https://trailpaint.org/app/)

**[Open the app →](https://trailpaint.org/app/)** · **[Story maps →](https://trailpaint.org/stories/)** · **[Trails & travel →](https://trailpaint.org/examples/)** · **[Taiwan Century →](https://trailpaint.org/taiwan/)** · **[Story Player →](https://trailpaint.org/app/player/)**

![TrailPaint editor — desktop tool-dock layout](./examples/trailpaint-hero.jpg)

---

## What it is

TrailPaint works in three beats: **collect, edit, share**.

1. **Collect** — import photos straight from your phone (EXIF GPS auto-creates spots), or have ChatGPT / Claude generate an itinerary JSON and paste it back
2. **Edit** — reorder, write captions, draw routes, hide clutter routes, and overlay historical maps on desktop
3. **Share** — export an IG-ready illustration, a short link, or an embeddable auto-touring player

| Feature | Details |
|------|------|
| 📷 **Photo import** | EXIF GPS auto-creates spots sorted by capture time; multi-day trips get one route per day via "connect spots" |
| 🤖 **AI workflow** | Built-in prompt template — LLM-generated itinerary JSON imports in one paste, with auto photo-fetch from Wikimedia Commons |
| ⏱ **Time-travel storytelling** | Era slider + Academia Sinica historical map overlays + auto-touring stories |
| 🖼️ **Many outputs** | PNG (IG / blog) / short links / iframe embeds / GPX·KML·GeoJSON interchange |
| 🔐 **Privacy first** | No backend, all data stays in your browser, works offline |

![TrailPaint output — an 8-spot route in Shilin, Taipei](./examples/trailpaint-01.jpg)

---

## Quick start

Open [trailpaint.org/app/](https://trailpaint.org/app/) and pick one of the three cards on the start screen:

<img src="./examples/mobile-start.jpg" width="320" alt="Mobile start screen — three action cards">

- **📷 Import Photos** — pick 20 trip photos; GPS pins them, capture time orders them, done in a minute
- **🤖 Paste AI JSON** — copy the prompt template to ChatGPT / Claude, paste the generated JSON back
- **🗺️ Start on the Map** — on phones just tap the map to add a spot (no mode switching); desktop has a full tool dock; sample trails are one tap away

Then hit **Export**, choose a ratio and style, and download a PNG or create a share link.

---

## Three ways to build

### 📷 From photos

Shoot with GPS on → drop the photos in → coordinates, chronological order, and reverse-geocoded names come for free. iPhone HEIC and Android JPEG both work; photos without GPS are placed by time-neighbor interpolation and can be dragged into place. **Multi-day trips: "connect spots" draws one route per day** — routes can be hidden individually (excluded from Player, image, and GeoJSON export alike).

### 🤖 With AI

The import dialog ships a prompt template: describe your trip to ChatGPT / Claude → paste the generated JSON back. Optionally auto-fetch CC-licensed photos from Wikimedia Commons (attribution included). Great for trip planning, history, or fiction.

### 🗺️ By hand

Search places, add spots, draw hand-drawn-style routes. Tap-to-add on phones, full tool dock and properties panel on desktop.

![Import dialog — frequent actions on top, other formats collapsed](./examples/import-wizard.jpg)

**Import formats:** photos (EXIF), GPX (hiking apps), KML (Google My Maps), GeoJSON, .trailpaint backups, screenshots as basemaps

---

## Output & sharing

| Format | Use |
|------|------|
| **PNG** | 1:1 (IG feed) / 9:16 (Story) / 4:3 / original; 3 frames × 2 filters |
| **Short link** | photos travel with it, OG preview uses the cover (Cloudflare Workers, 90-day TTL) |
| **iframe embed** | drop an interactive player into WordPress, Notion, Substack |
| **.trailpaint backup** | full project file — restore after switching devices |
| **GeoJSON / KML** | for geojson.io, Google My Maps, Google Earth (geometry only) |

![Export — image tab](./examples/export-wizard-image.jpg)

There's also an **AI stylization prompt** (Japanese sketch / treasure map / cozy cartoon / minimal line) — feed your exported PNG to ChatGPT / Gemini for a truly hand-painted look:

![AI-stylized output](./examples/Gemini_Generated_Image.jpg)

---

## The website: see the work first, then draw your own

The [trailpaint.org](https://trailpaint.org/) homepage works like a small gallery: a seasonal feature on the left, a daily pick that rotates every day, an entrance to trails and travel routes, and rows of finished maps below. The editor comes last, for when you're ready to draw.

Three curated sections:

- **[Story maps](https://trailpaint.org/stories/)** — the Bible, mission history, Chinese history and the age of exploration, each with historical maps and a time slider
- **[Trails & travel](https://trailpaint.org/examples/)** — hiking trails, old roads, family walks and trips abroad; play them or download the route file to make it your own
- **[Taiwan Century](https://trailpaint.org/taiwan/)** — one place across a hundred years, on Academia Sinica historical maps from the 1904 colonial survey to today; so far Da'an Forest Park, Da'an District and Gongguan to Jingmei

## Story Player: maps that tell stories

**[Story Player](https://trailpaint.org/app/player/)** turns a static map into a guided tour: fly-to animations, photo cards, background music, and fullscreen mode — built for exhibitions, classrooms, and web embeds.

- **⏱ Era slider** — drag to cross-fade historical basemaps (Academia Sinica Han/Tang/Song/Yuan/Ming China + Taiwan 1897/1921/1966 + Roman Empire AD 200) while spots fade by era
- **📚 Compilations** — bundle story chapters into one player, ordered by narrative or by global chronology
- **📮 Postcards** — one-tap 1080×1080 square per spot (map + spot card + era stamp)

Featured story maps ([all →](https://trailpaint.org/stories/)):

- **Taiwan Missionaries** — Mackay, Barclay and others, overlaid on the 1897 Japanese-era map
- **Passion Week** — 12+ biblical sites with classical paintings and YouVersion links
- **Paul's Three Journeys** — 34 spots across the AD 46-62 Mediterranean
- **Silk Road 2000 Years** — Zhang Qian → Xuanzang → Marco Polo on the same corridor
- **Yu Yonghe's 1697 Journey** — a sulfur expedition across Qing-era Taiwan
- **Da'an Forest Park** — one Taipei block across a century: rice fields, a 1932 park plan, military villages, then a forest park; drag the slider to change era ([Taiwan Century](https://trailpaint.org/taiwan/))

![Story Player — auto tour](./examples/trailpaint-02.jpg)

For churches there's a dedicated [`/church/`](https://trailpaint.org/church/) landing page (Sunday school, bulletin, devotional embeds).

---

## Tech

| Layer | Stack |
|------|------|
| **Frontend** | Vite + React 19 + TypeScript 5 (strict); layered `core/` (logic) · `map/` (Leaflet) · `player/` (own entry) |
| **Maps** | Leaflet + react-leaflet + protomaps-leaflet; Protomaps vector (multilingual labels) / OSM / OpenTopoMap / Esri satellite tiles |
| **State** | Zustand + zundo (undo/redo) |
| **Import/Export** | exifr + ExifReader (EXIF), @tmcw/togeojson (KML), html-to-image + Canvas |
| **Geo services** | Photon (search/reverse-geocoding, primary) + Nominatim (fallback) + Open-Meteo (elevation) |
| **Historical maps** | Academia Sinica [gis.sinica.edu.tw](https://gis.sinica.edu.tw) tile services |
| **Share backend** | Cloudflare Workers + KV (the only server component — short links only) |
| **PWA** | vite-plugin-pwa + Workbox offline support |

AI / agent integration: [`llms.txt`](https://trailpaint.org/llms.txt) · [`agent-card.json`](https://trailpaint.org/.well-known/agent-card.json) · [project JSON Schema](https://trailpaint.org/schemas/project-v3.schema.json)

### Development

```bash
cd online
npm install
npm run dev        # dev server (:5173)
npm run build      # bundles into ../app/
npm test           # vitest
```

The Cloudflare Worker lives in [`cloudflare/`](./cloudflare/) with its own deploy README.

---

## Contributing & sharing

Bug reports (with repro steps), feature ideas, docs fixes, and code PRs are all welcome.

Made a map you're proud of? Open an [issue](https://github.com/notoriouslab/trailpaint/issues) with your `.trailpaint` file and its story — great ones get featured on [`/stories/`](https://trailpaint.org/stories/).

---

## Disclaimer

TrailPaint is a **route journaling and sharing tool, not navigation software**. Distances and elevations are estimates; always plan outdoor activities against real conditions. Basemap data comes from OpenStreetMap / Protomaps and other third parties.

## License

**GPL-3.0** — free to use, modify, and build upon; derivatives must stay open source. See [LICENSE](LICENSE).

---

*TrailPaint was inspired by the eco-tour guiding needs of Bread of Life Christian Church Taipei's community college nature walks. 🌿*
