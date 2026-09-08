# WebCarPlay

A single-screen driving dashboard for the phone: map on the left, video/music on
the right, so you're not switching apps at a red light.

Plain HTML/CSS/JS. No build step, no dependencies — open `index.html` and it runs.

## Phase 1 (done)

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

## Google Maps API key

Optional. Without one the map uses the keyless
`https://www.google.com/maps?q=...&output=embed` URL, which works but is limited.

For the real Maps Embed API:

1. <https://console.cloud.google.com> — create or pick a project
2. APIs & Services → Library → enable **Maps Embed API**
3. APIs & Services → Credentials → Create credentials → API key
4. Restrict it: Websites → your deploy domain (plus `http://localhost`), and
   API restrictions → Maps Embed API only
5. Paste it into `GOOGLE_MAPS_API_KEY` at the top of `app.js`

A browser key is always visible in page source — the domain restriction is what
protects it. Phase 2 moves the key into `localStorage` so it never enters the repo.

## Notes

- Spotify embeds sometimes only play 30-second previews unless you're logged into
  Spotify in the same browser.
- iOS Safari can't force landscape orientation, so portrait is handled with CSS
  rather than a lock.

## Files

    index.html   markup
    style.css    layout + dark high-contrast theme
    app.js       URL parsing, localStorage, tab switching
