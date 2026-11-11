# AI Prompt → Map Story

> Open .trailpaint.json format for map stories: numbered spots, routes, historical overlays, CC-attributed photos. LLMs generate JSON directly; TrailPaint auto-fetches photos from Wikimedia Commons. JSON Schema 2020-12 public — AI agents can reference it.

URL: https://trailpaint.org/features/ai-prompt/en/
Parent: https://trailpaint.org/features/ai-prompt/
Language: en

Hand a topic to an LLM, get a `.trailpaint.json` file, import it to render a hand-drawn map story with auto-fetched Commons photos. Open JSON Schema — AI agents can reference directly.

## What is this format?

`.trailpaint.json` is TrailPaint's "map story" format: a named JSON document with a center point, numbered spots, routes, optional historical basemaps, and CC-attributed photos. It is designed for LLM generation and AI agent consumption.

- **JSON Schema 2020-12 public**: [`https://trailpaint.org/schemas/project-v3.schema.json`](https://trailpaint.org/schemas/project-v3.schema.json)
- **Discovery**: [`/.well-known/trailpaint`](https://trailpaint.org/.well-known/trailpaint) (schema, examples, @context vocab)
- **JSON-LD @context**: exported files include `@context` mapping to `schema.org/TouristTrip` + `tp:` vocab — readable by any JSON-LD parser
- **License**: GPL-3.0. Third-party parsers and generators welcome.

## Workflow

1. Open the [Editor](https://trailpaint.org/app/) → "Export" button (bottom-right) → **Image Download** tab
2. Pick an AI style from the dropdown (Japanese Hand-drawn / Treasure Map / Kawaii / Minimal Line)
3. Click "Copy AI Prompt"
4. Paste into ChatGPT / Claude / Gemini with your topic (e.g. "5 stops along the Pacific Crest Trail")
5. The LLM returns a `.trailpaint.json` snippet (with `photo_query` bilingual search fields)
6. In the Editor → Import → "Paste JSON", check "**Auto-fetch from Commons**". TrailPaint pulls CC-licensed photos and records attribution automatically.

## Four built-in prompt styles

### Hiking

Emphasizes mountain spots: summits, huts, water sources, hazards, viewpoints. Routes include elevation notes. Icon bias: ⛰️ 🏕️ 💧.

### Mission

Emphasizes missionary footsteps: churches, hospitals, schools, indigenous villages, martyr sites. Each spot carries year / person / historical event. Icon bias: ⛪ 🏥 🏫.

### History

Emphasizes historical sites: battlefields, archaeological sites, old city gates, old harbors. Each spot carries dynasty / date and citation. Icon bias: 🏛️ ⚔️ 📜.

### Travel

Emphasizes tourism: attractions, food, lodging, transit hubs. Each spot carries recommended dwell time and budget. Icon bias: 📸 🍜 ☕ 🏨.

## Prompt example (v3.1 with photo_query)

### Prompt

```
You are a trail-map JSON generator. For the topic "{TOPIC}",
produce a .trailpaint.json v3.1 document (schema at
https://trailpaint.org/schemas/project-v3.schema.json) with:
- version: 3
- name: route name
- center: [lat, lng] map center
- zoom: 13-15
- spots: 5-8 items, each with
    id/latlng/num/title/desc/iconId/photo_query
- routes: 1-2 polylines, pts: [[lat,lng], ...]
- iconId from ICONS: home/church/camera/food/coffee/peak/...
- photo_query as "中文關鍵字 | English keywords" bilingual,
  so TrailPaint can auto-fetch from Wikimedia Commons
Return raw JSON only, no explanation.
```

### LLM response (excerpt)

```
{
  "version": 3,
  "name": "Taipei one-day cafe loop",
  "center": [25.0425, 121.5320],
  "zoom": 14,
  "spots": [
    { "id": "s1", "latlng": [25.0379, 121.5180],
      "num": 1, "title": "Chiang Kai-shek Memorial Hall",
      "desc": "White marble + Freedom Square, best morning light.",
      "iconId": "building",
      "photo_query": "中正紀念堂 自由廣場 | Chiang Kai-shek Memorial Hall Taipei" },
    { "id": "s2", "latlng": [25.0337, 121.5298],
      "num": 2, "title": "Yongkang Street",
      "desc": "Cafe district. Try Din Tai Fung + mango shaved ice.",
      "iconId": "coffee",
      "photo_query": "永康街 鼎泰豐 | Yongkang Street Taipei" }
  ],
  "routes": [
    { "id": "r1", "name": "Cafe loop",
      "pts": [[25.0379,121.5180],[25.0337,121.5298]],
      "color": "orange",
      "elevations": null }
  ]
}
```

## For AI developers / agents

If you are building an agent or tool on top of the TrailPaint format, the following are stable, citable endpoints:

- **JSON Schema**: [`/schemas/project-v3.schema.json`](https://trailpaint.org/schemas/project-v3.schema.json) (JSON Schema 2020-12)
- **Well-known discovery**: [`/.well-known/trailpaint`](https://trailpaint.org/.well-known/trailpaint)
- **WebMCP**: the homepage inlines `navigator.modelContext.provideContext()` exposing `open-trailpaint-editor` and `create-share-link` tools
- **Sample files**: [`/stories/paul/first-journey.trailpaint.json`](https://trailpaint.org/stories/paul/first-journey.trailpaint.json), [`/stories/xuanzang/west.trailpaint.json`](https://trailpaint.org/stories/xuanzang/west.trailpaint.json), [`/stories/taiwan-missionaries/barclay.trailpaint.json`](https://trailpaint.org/stories/taiwan-missionaries/barclay.trailpaint.json)
- **Exports carry JSON-LD**: files exported from the Editor include `@context` (schema.org + [`tp:` vocab](https://trailpaint.org/ns/v3/)) and `@type: ["TouristTrip", "tp:TrailStory"]` — feed them directly to any JSON-LD parser
- **Authoritative fields**: `spots` / `routes` hold the real data; `itinerary` is an `ItemList` mirror (each `itemListElement[i].item` is a `Place + tp:Spot`) for AI agents. **If they disagree, `spots` wins.** The Editor strips `@context`/`@type`/`itinerary` on import and trusts only the native fields.

## Caveats

- **Coordinate accuracy**: LLMs are fine for landmarks, but obscure spots may drift 100-500 m. Fine-tune after import.
- **Photos**: LLMs don't produce data-URL photos; instead they emit `photo_query`, and TrailPaint auto-fetches CC-licensed photos from Wikimedia Commons with attribution. You can still swap in your own photos after import.
- **Schema version**: ask the LLM for v3 (the schema file is v3.1). Older versions auto-migrate on import.
- **LLM recommendation**: Claude is most stable for structured JSON output. ChatGPT and Gemini also work.

## Advanced: photo-EXIF → JSON via ChatGPT-4V

Drop 10 photos from your phone into ChatGPT-4V and say "produce a .trailpaint.json from these photos' EXIF". It will read EXIF GPS and generate spots directly. That said, TrailPaint's native "Import Photos" feature is faster and more accurate — the ChatGPT workflow is mainly useful when the photos are in someone else's hands and you just have the files.

[Launch Editor](https://trailpaint.org/app/) [← Import](https://trailpaint.org/features/import/)
