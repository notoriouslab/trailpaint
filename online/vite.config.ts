import { resolve, extname } from 'path'
import { existsSync, statSync, createReadStream } from 'fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Dev-only middleware: serve files from trailpaint repo root for paths that
 * live outside vite's `online/` root in production (e.g. /stories/, /church/).
 * In production these paths exist on trailpaint.org alongside /app/; in dev we
 * need the same absolute paths to resolve so ?compilation= and ?src= work.
 */
function serveTrailpaintRoot(): Plugin {
  const ALLOWED = ['/stories/', '/church/', '/features/', '/faq/'];
  const MIME: Record<string, string> = {
    '.json': 'application/json; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.md': 'text/markdown; charset=utf-8',
  };
  return {
    name: 'tp-serve-trailpaint-root',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (!ALLOWED.some((p) => url.startsWith(p))) return next();
        const filePath = resolve(__dirname, '..', url.replace(/^\//, ''));
        if (!existsSync(filePath) || !statSync(filePath).isFile()) return next();
        const mime = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    serveTrailpaintRoot(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'TrailPaint 路小繪',
        short_name: 'TrailPaint',
        description: '繪製你的登山路線地圖',
        theme_color: '#78350f',
        background_color: '#fdf8ef',
        display: 'standalone',
        scope: '/app/',
        start_url: '/app/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // heic-to* is a 2.7MB libheif wasm bundle, dynamically imported only
        // when the user picks a HEIC photo. Excluding it from precache keeps
        // first-load fast; the service worker will still serve it on demand.
        globIgnores: ['**/examples/**', '**/*.trailpaint-*', '**/heic-to-*'],
        navigateFallbackDenylist: [/^\/app\/player/],
        runtimeCaching: [
          // Carto 圖磚
          {
            urlPattern: /^https:\/\/[a-z]\.basemaps\.cartocdn\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'carto-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
              },
            },
          },
          // OSM 圖磚
          {
            urlPattern: /^https:\/\/[a-z]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'osm-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          // ArcGIS 圖磚
          {
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'arcgis-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          // OpenTopoMap 圖磚
          {
            urlPattern: /^https:\/\/[a-z]\.tile\.opentopomap\.org\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'opentopomap-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          // Protomaps vector tiles
          {
            urlPattern: /^https:\/\/api\.protomaps\.com\/tiles\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'protomaps-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          // Nominatim 搜尋 API
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nominatim-api',
              expiration: {
                maxEntries: 50,
              },
            },
          },
          // Open-Meteo 天氣 API
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo-api',
              expiration: {
                maxEntries: 50,
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/app/',
  build: {
    outDir: '../app',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        player: resolve(__dirname, 'player/index.html'),
      },
    },
  },
})
