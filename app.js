/* ==========================================================================
   WebCarPlay — app logic
   No build step, no dependencies. Everything runs from file:// or any host.
   ========================================================================== */

/* --------------------------------------------------------------------------
   GOOGLE MAPS API KEY (optional)

   Leave this empty and the map still works: we fall back to the keyless
   https://www.google.com/maps?q=...&output=embed URL, which shows the place
   but gives you no directions embed and no usage quota of your own.

   To get a key:
     1. https://console.cloud.google.com  ->  create (or pick) a project
     2. APIs & Services -> Library -> enable "Maps Embed API"
     3. APIs & Services -> Credentials -> Create credentials -> API key
     4. Restrict the key: Application restrictions -> Websites -> add the
        domain you deploy to (and http://localhost for local testing),
        and API restrictions -> Maps Embed API only.
     5. Paste it below.

   NOTE: a browser API key is always visible in page source. Restricting it to
   your domain + the Maps Embed API is what keeps it safe. Phase 2 moves this
   into localStorage via a settings panel so it stays out of the repo.
   -------------------------------------------------------------------------- */
const GOOGLE_MAPS_API_KEY = '';

/* --------------------------------------------------------------------------
   localStorage (wrapped — Safari private mode throws on access)
   -------------------------------------------------------------------------- */
const KEY = {
  dest:    'webcarplay.dest',
  youtube: 'webcarplay.youtube',
  spotify: 'webcarplay.spotify',
  tab:     'webcarplay.tab'
};

function load(k, fallback) {
  if (fallback === undefined) fallback = '';
  try {
    var v = localStorage.getItem(k);
    return v === null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function save(k, v) {
  try { localStorage.setItem(k, v); } catch (e) { /* private mode / storage full */ }
}

function $(id) { return document.getElementById(id); }

/* --------------------------------------------------------------------------
   MAP
   -------------------------------------------------------------------------- */

// "41.7151, 44.8271" -> ["41.7151", "44.8271"], otherwise null
function parseLatLon(s) {
  var m = String(s).trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  if (Math.abs(parseFloat(m[1])) > 90 || Math.abs(parseFloat(m[2])) > 180) return null;
  return [m[1], m[2]];
}

function mapUrl(query) {
  var q = encodeURIComponent(query);
  if (GOOGLE_MAPS_API_KEY) {
    // Maps Embed API — /place. Swap to /directions?origin=..&destination=..
    // once you want a full route drawn inside the embed.
    return 'https://www.google.com/maps/embed/v1/place?key=' + GOOGLE_MAPS_API_KEY + '&q=' + q;
  }
  // Keyless fallback — limited, but needs no Google Cloud project at all.
  return 'https://www.google.com/maps?q=' + q + '&output=embed';
}

function setMap(query, persist) {
  var dest = String(query).trim();
  if (!dest) return;
  $('mapFrame').src = mapUrl(dest);
  $('mapStatus').textContent = GOOGLE_MAPS_API_KEY
    ? ''
    : 'No API key set — using the basic keyless map embed.';
  updateWaze(dest);
  if (persist !== false) save(KEY.dest, dest);
}

/* --------------------------------------------------------------------------
   WAZE
   waze.com/ul is Waze's universal link: on a phone it opens the Waze app if
   installed, otherwise the Waze website. The raw waze://?ll=..&navigate=yes
   scheme also works, but dead-ends when the app isn't installed.
   -------------------------------------------------------------------------- */
function updateWaze(dest) {
  var btn = $('wazeBtn');
  var coords = parseLatLon(dest);
  if (coords) {
    btn.href = 'https://waze.com/ul?ll=' + coords[0] + ',' + coords[1] + '&navigate=yes';
  } else if (String(dest).trim()) {
    // No client-side geocoding in the MVP — hand the address to Waze as a search.
    btn.href = 'https://waze.com/ul?q=' + encodeURIComponent(String(dest).trim()) + '&navigate=yes';
  } else {
    btn.href = 'https://waze.com/ul';
  }
}

/* --------------------------------------------------------------------------
   YOUTUBE
   -------------------------------------------------------------------------- */
function youtubeId(input) {
  var s = String(input).trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;                 // bare video ID

  var u;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
  } catch (e) {
    return null;
  }

  var host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
  function grab(v) { return v && /^[\w-]{11}/.test(v) ? v.slice(0, 11) : null; }

  if (host === 'youtu.be') return grab(u.pathname.slice(1));

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    var v = grab(u.searchParams.get('v'));
    if (v) return v;
    var m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
    if (m) return m[1];
  }
  return null;
}

function setYouTube(input, persist) {
  var raw = String(input).trim();
  if (!raw) return;
  var id = youtubeId(raw);
  if (!id) {
    $('ytStatus').textContent = 'That does not look like a YouTube link.';
    return;
  }
  $('ytStatus').textContent = '';
  $('ytFrame').src = 'https://www.youtube.com/embed/' + id + '?playsinline=1&rel=0';
  $('ytEmpty').hidden = true;
  if (persist !== false) save(KEY.youtube, raw);
}

/* --------------------------------------------------------------------------
   SPOTIFY
   open.spotify.com/track/ID  ->  open.spotify.com/embed/track/ID
   Also handles /intl-xx/ links and spotify:track:ID URIs.
   -------------------------------------------------------------------------- */
var SPOTIFY_TYPES = 'track|playlist|album|episode|show|artist';

function spotifyEmbedUrl(input) {
  var s = String(input).trim();
  if (!s) return null;

  var uri = s.match(new RegExp('^spotify:(' + SPOTIFY_TYPES + '):([A-Za-z0-9]+)', 'i'));
  if (uri) return 'https://open.spotify.com/embed/' + uri[1].toLowerCase() + '/' + uri[2];

  var u;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
  } catch (e) {
    return null;
  }
  if (!/(^|\.)spotify\.com$/i.test(u.hostname)) return null;

  // Matches /track/ID and /intl-de/track/ID alike, and tolerates an already
  // embedded /embed/track/ID link being pasted back in.
  var m = u.pathname.match(new RegExp('/(' + SPOTIFY_TYPES + ')/([A-Za-z0-9]+)', 'i'));
  if (!m) return null;
  return 'https://open.spotify.com/embed/' + m[1].toLowerCase() + '/' + m[2];
}

function setSpotify(input, persist) {
  var raw = String(input).trim();
  if (!raw) return;
  var url = spotifyEmbedUrl(raw);
  if (!url) {
    $('spStatus').textContent = 'Paste an open.spotify.com track, playlist or album link.';
    return;
  }
  $('spStatus').textContent = '';
  $('spFrame').src = url;
  $('spEmpty').hidden = true;
  if (persist !== false) save(KEY.spotify, raw);
}

/* --------------------------------------------------------------------------
   TABS
   -------------------------------------------------------------------------- */
function showTab(name) {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    var on = tabs[i].getAttribute('data-tab') === name;
    tabs[i].classList.toggle('is-active', on);
    tabs[i].setAttribute('aria-selected', String(on));
  }
  $('pane-video').classList.toggle('is-hidden', name !== 'video');
  $('pane-music').classList.toggle('is-hidden', name !== 'music');
  save(KEY.tab, name);
}

/* --------------------------------------------------------------------------
   WIRING
   -------------------------------------------------------------------------- */
$('mapForm').addEventListener('submit', function (e) {
  e.preventDefault();
  $('destInput').blur();                 // drop the on-screen keyboard
  setMap($('destInput').value);
});

$('ytForm').addEventListener('submit', function (e) {
  e.preventDefault();
  $('ytInput').blur();
  setYouTube($('ytInput').value);
});

$('spForm').addEventListener('submit', function (e) {
  e.preventDefault();
  $('spInput').blur();
  setSpotify($('spInput').value);
});

// Keep the Waze link in step with whatever is currently typed.
$('destInput').addEventListener('input', function (e) { updateWaze(e.target.value); });

(function bindTabs() {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function () {
      showTab(this.getAttribute('data-tab'));
    });
  }
})();

/* --------------------------------------------------------------------------
   RESTORE LAST SESSION
   -------------------------------------------------------------------------- */
(function restore() {
  var dest = load(KEY.dest);
  var yt   = load(KEY.youtube);
  var sp   = load(KEY.spotify);

  $('destInput').value = dest;
  $('ytInput').value   = yt;
  $('spInput').value   = sp;

  if (dest) {
    setMap(dest, false);
  } else {
    updateWaze('');
    $('mapStatus').textContent = 'Type a destination to load the map.';
  }

  if (yt) setYouTube(yt, false);
  if (sp) setSpotify(sp, false);

  showTab(load(KEY.tab, 'video') === 'music' ? 'music' : 'video');
})();
