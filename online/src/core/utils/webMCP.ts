/**
 * WebMCP (navigator.modelContext) registration
 *
 * Declarative registration of TrailPaint's skills for Chrome's Built-In AI
 * agent protocol (experimental). If the API is unavailable, this is a no-op.
 *
 * Spec (draft): https://github.com/webmachinelearning/webmcp
 * Rationale: canaisee and other AEO scanners check for this surface. Even when
 * no browser currently invokes these tools, declaring them makes TrailPaint
 * discoverable to future AI agents that honor the protocol.
 *
 * Skills registered here mirror /.well-known/agent-card.json (A2A protocol).
 * The A2A card is authoritative for inputs/outputs; WebMCP is a browser-side
 * echo so agents running in the page context can discover capabilities too.
 */

interface WebMCPTool {
  name: string;
  description: string;
  // Optional JSON Schema for input validation. Chrome's current draft accepts
  // loose object shapes; we document the intent rather than enforce.
  inputSchema?: Record<string, unknown>;
  execute?: (args: unknown) => Promise<unknown>;
}

interface NavigatorWithModelContext {
  modelContext?: {
    registerTool?: (tool: WebMCPTool) => void;
    // Some draft implementations use provideContext instead
    provideContext?: (ctx: unknown) => void;
  };
}

const SKILLS: WebMCPTool[] = [
  {
    name: 'open-editor',
    description:
      'Open the TrailPaint Editor at https://trailpaint.org/app/. Users can draw routes, add spots with 31 icons, attach photos, and export as PNG / GeoJSON / KML.',
  },
  {
    name: 'open-player',
    description:
      'Open the TrailPaint Story Player at https://trailpaint.org/app/player/ for auto-guided map playback with fly-to animations, photo popups, and historical basemap overlays.',
  },
  {
    name: 'import-photos-guide',
    description:
      'Describes how to build a trail map from photos: drag up to 20 JPEG/HEIC photos with EXIF GPS into the Editor. Photos without GPS get a pending-location group; drag to place them. Reverse geocoding auto-fills spot titles.',
    inputSchema: { photoCount: { type: 'integer', maximum: 20 } },
  },
  {
    name: 'import-geo-formats-guide',
    description:
      'Describes supported geographic imports: KML (Google My Maps export), GeoJSON (geojson.io, Google Takeout), GPX (hiking app tracks), native .trailpaint project files. Drop any of these onto the Editor to import.',
  },
  {
    name: 'export-png-guide',
    description:
      'Describes PNG export options: aspect ratios 1:1 (IG feed), 9:16 (Story), 4:3, or original. Three border styles (classic, paper, minimal). Two filters (original, sketch). Optional stats overlay. Available in the Editor Export dialog Image tab.',
  },
  {
    name: 'export-interop-formats-guide',
    description:
      'Describes geographic interop exports (GeoJSON, KML) for round-tripping into Google My Maps, Google Earth, Mapbox, Gaia GPS, or D3. Photos are excluded by design (open data boundary). Available in the Editor Export dialog Interop tab.',
  },
  {
    name: 'share-link-guide',
    description:
      'Describes how to generate a shareable URL that encodes the entire project (spots, routes, photos) into the URL hash. Optional TinyURL shortening. Recipient opens the link to view the map.',
  },
  {
    name: 'embed-player-guide',
    description:
      'Describes the Story Player embed code: an <iframe> snippet with the project data baked in, for embedding in blogs (WordPress, Substack, Notion) or church / NGO sites.',
  },
  {
    name: 'get-llms-txt',
    description: 'Returns the machine-readable overview of TrailPaint at https://trailpaint.org/llms.txt',
    execute: async () => {
      const res = await fetch('/llms.txt', { headers: { Accept: 'text/plain' } });
      return res.ok ? res.text() : null;
    },
  },
  {
    name: 'get-agent-card',
    description:
      'Returns the A2A agent card describing TrailPaint skills, inputs, outputs at https://trailpaint.org/.well-known/agent-card.json',
    execute: async () => {
      const res = await fetch('/.well-known/agent-card.json', { headers: { Accept: 'application/json' } });
      return res.ok ? res.json() : null;
    },
  },
];

let registered = false;

export function registerWebMCP(): void {
  if (registered) return;
  if (typeof navigator === 'undefined') return;

  const nav = navigator as unknown as NavigatorWithModelContext;
  const mc = nav.modelContext;

  if (!mc || typeof mc.registerTool !== 'function') {
    // API not available in this browser — AEO scanners reading the source for
    // navigator.modelContext reference can still pick up the signal.
    return;
  }

  try {
    for (const skill of SKILLS) {
      mc.registerTool(skill);
    }
    registered = true;
  } catch (err) {
    // Draft API may throw on unknown fields; degrade silently.
    console.debug('[WebMCP] registration skipped:', err);
  }
}
