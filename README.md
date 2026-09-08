# WebCarPlay

A single-screen driving dashboard for the phone: map on the left, video/music on
the right, so you're not switching apps at a red light.

Plain HTML/CSS/JS. No build step, no dependencies — open `index.html` and it runs.

Live: <https://lazare2.github.io/WebCarPlay/>

## Phase 1 — dashboard

- Landscape-first split layout, ~55/45, full viewport height, no scrolling
- **Left** — Google Maps embed driven by a destination box
- **Right** — Video / Music tabs
  - Video: paste any YouTube link, the video ID is extracted and embedded
  - Music: paste any `open.spotify.com` track/playlist/album link, converted to
    the official embed URL
- Waze button in the top bar, following whatever destination is typed
- Last destination, YouTube link, Spotify link and active tab remembered in
  `localStorage`
- Portrait fallback: panels stack vertically and a "rotate your phone" banner appears

## Phase 2 — PWA + fullscreen

- `manifest.json` — standalone display, landscape orientation, theme colours
- `apple-touch-icon` + `apple-mobile-web-app-capable` so the iOS home-screen
  icon launches without Safari's address bar or tab bar
- `sw.js` — service worker caching the app shell (HTML/CSS/JS/icons) only.
  Cross-origin requests are deliberately untouched, so the map, YouTube and
  Spotify iframes always hit the network.
- Settings (gear icon) — stores your Google Maps API key in `localStorage`
  instead of in source, so nothing sensitive lands in a public repo
- Fullscreen button in the top bar

### Fullscreen: what works where

| Platform | Result |
|---|---|
| Android — Chrome, Firefox, Samsung Internet, Edge | Button works — true fullscreen |
| Desktop browsers, iPadOS Safari | Button works |
| **iPhone — every browser, not just Safari** | **Button is hidden** |

The iPhone row covers Chrome, Firefox, Edge and Brave as well as Safari: Apple
requires every iOS browser to run on WebKit, so they all inherit the same gap.
Those apps are Safari's engine in a different wrapper, and none of them exposes
the Fullscreen API for pages.

On iPhone the equivalent is **Share → Add to Home Screen from Safari**, then launch
from that icon: `apple-mobile-web-app-capable` makes it open standalone with no
browser UI at all. Do the install from Safari specifically — third-party iOS
browsers don't reliably produce a standalone web clip.

The button is shown purely on capability detection, never user-agent sniffing, so
it appears by itself if a browser gains support. It stays available inside an
installed PWA too: on Android, standalone mode still shows the system status bar,
and fullscreen hides that as well.

### Changing the app after deploy

The service worker caches the shell. Page loads are network-first so a deploy
shows up straight away, but if a CSS/JS change seems stuck, bump `CACHE_VERSION`
in [`sw.js`](sw.js) — the old cache is dropped on activate.

## Google Maps API key

Optional. Without one the map uses the keyless
`https://www.google.com/maps?q=...&output=embed` URL, which works but is limited.

For the real Maps Embed API:

1. <https://console.cloud.google.com> — create or pick a project
2. APIs & Services → Library → enable **Maps Embed API**
3. APIs & Services → Credentials → Create credentials → API key
4. Restrict it: Websites → `https://lazare2.github.io/*` (plus `http://localhost:*`),
   and API restrictions → Maps Embed API only
5. Paste it into the app's Settings panel

A browser key is always visible to anyone using the page — the domain restriction
is what protects it. Don't put it in `app.js`; the repo is public.

## Notes

- Spotify embeds sometimes only play 30-second previews unless you're logged into
  Spotify in the same browser.
- iOS Safari can't force landscape orientation, so portrait is handled with CSS
  rather than a lock.

## Files

    index.html     markup
    style.css      layout + dark high-contrast theme
    app.js         URL parsing, localStorage, tabs, fullscreen, settings
    sw.js          app-shell service worker
    manifest.json  PWA manifest
    icon-*.png     app icons (generated, steering wheel mark)
