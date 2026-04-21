// ── Office definitions ─────────────────────────────────────
const OFFICES = [
  {
    key:      'uk',
    label:    'United Kingdom',
    flag:     '🇬🇧',
    tz:       'Europe/London',
    offices:  'London, EC2A',
    lat: 51.5, lng: -0.09,
  },
  {
    key:      'brussels',
    label:    'Brussels',
    flag:     '🇧🇪',
    tz:       'Europe/Brussels',
    offices:  'Brussels, 1000',
    lat: 50.85, lng: 4.35,
  },
  {
    key:      'brazil',
    label:    'Brazil',
    flag:     '🇧🇷',
    tz:       'America/Sao_Paulo',
    offices:  'São Paulo, SP',
    lat: -23.5, lng: -46.6,
  },
  {
    key:      'beijing',
    label:    'Beijing',
    flag:     '🇨🇳',
    tz:       'Asia/Shanghai',
    offices:  'Beijing, 100000',
    lat: 39.9, lng: 116.4,
  },
  {
    key:      'newyork',
    label:    'New York',
    flag:     '🇺🇸',
    tz:       'America/New_York',
    offices:  'New York, NY',
    lat: 40.7, lng: -74.0,
    fullWidth: true,
  },
];

// ── Helpers ───────────────────────────────────────────────
function getOfficeTime(tz) {
  const now = new Date();
  return {
    time:    now.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }),
    date:    now.toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }),
    period:  getPeriod(parseInt(now.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }))),
    offset:  getOffset(tz),
  };
}

function getPeriod(hour) {
  if (hour < 6)  return 'Early morning';
  if (hour < 12) return 'Morning';
  if (hour < 14) return 'Lunchtime';
  if (hour < 18) return 'Afternoon';
  if (hour < 21) return 'Evening';
  return 'Night';
}

function getOffset(tz) {
  const now       = new Date();
  const local     = now.getTime() + now.getTimezoneOffset() * 60000;
  const tzDate    = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const localDate = new Date(now.toLocaleString('en-US'));
  const diff      = Math.round((tzDate - localDate) / 3600000);
  if (diff === 0) return 'Your time';
  return diff > 0 ? `+${diff} hr${Math.abs(diff) !== 1 ? 's' : ''}` : `−${Math.abs(diff)} hr${Math.abs(diff) !== 1 ? 's' : ''}`;
}

function getUserTz() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getUserCityName(tz) {
  // Extract readable city from IANA tz string e.g. "Europe/Amsterdam" → "Amsterdam"
  const parts = tz.split('/');
  return parts[parts.length - 1].replace(/_/g, ' ');
}

function haversine(lat1, lng1, lat2, lng2) {
  const R   = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a   = Math.sin(dLat/2) ** 2 +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function findNearestOffice(lat, lng) {
  let nearest = null, minDist = Infinity;
  for (const o of OFFICES) {
    const d = haversine(lat, lng, o.lat, o.lng);
    if (d < minDist) { minDist = d; nearest = o; }
  }
  return { office: nearest, distKm: Math.round(minDist) };
}

function isAtOffice(lat, lng, office, thresholdKm = 100) {
  return haversine(lat, lng, office.lat, office.lng) < thresholdKm;
}

// ── Render tiles ──────────────────────────────────────────
function renderTiles(userLat, userLng, userTz) {
  const tilesEl   = document.getElementById('tiles');
  const userAtKey = OFFICES.find(o => isAtOffice(userLat, userLng, o)) || null;
  const nearest   = userAtKey ? null : findNearestOffice(userLat, userLng).office;

  const officeHtml = OFFICES.map(o => {
    const t          = getOfficeTime(o.tz);
    const isYou      = userAtKey?.key === o.key;
    const isNearest  = !userAtKey && nearest?.key === o.key;
    const cls        = ['tile', o.fullWidth ? 'full-width' : '', isYou ? 'you-here' : isNearest ? 'nearest' : ''].filter(Boolean).join(' ');
    const badge      = isYou
      ? `<span class="tile-badge badge-you">You are here</span>`
      : isNearest
      ? `<span class="tile-badge badge-nearest">Nearest office</span>`
      : `<span style="font-size:10px;color:var(--text3);">${t.offset}</span>`;

    const officeLines = o.offices.split('\n').join('<br>');

    return `<div class="${cls}">
      <div class="tile-top">
        <div class="tile-flag">${o.flag}</div>
        ${badge}
      </div>
      <div class="tile-city">${o.label}</div>
      <div class="tile-offices">${officeLines}</div>
      <div class="tile-time">${t.time}</div>
      <div class="tile-meta">${t.date} · ${t.period}</div>
    </div>`;
  }).join('');

  // User location tile if not at any office
  let userTileHtml = '';
  if (!userAtKey && userLat !== null) {
    const cityName = getUserCityName(userTz);
    const t        = getOfficeTime(userTz);
    userTileHtml   = `<div class="tile full-width user-loc">
      <div class="tile-top">
        <div class="tile-flag">📍</div>
        <span class="tile-badge badge-loc">Your location</span>
      </div>
      <div class="tile-city">${cityName}</div>
      <div class="tile-offices">Detected from your browser</div>
      <div class="tile-time">${t.time}</div>
      <div class="tile-meta">${t.date} · ${t.period}</div>
    </div>`;
  }

  tilesEl.innerHTML = officeHtml + userTileHtml;
}

// ── Converter ─────────────────────────────────────────────
function buildConverter(selectedKey) {
  const fromEl    = document.getElementById('conv-from');
  const timeEl    = document.getElementById('conv-time');
  const resultsEl = document.getElementById('conv-results');

  // Populate from dropdown
  fromEl.innerHTML = OFFICES.map(o =>
    `<option value="${o.key}" ${o.key === selectedKey ? 'selected' : ''}>${o.flag} ${o.label}</option>`
  ).join('');

  // Set default time to now
  const now = new Date();
  timeEl.value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  function updateResults() {
    const fromKey  = fromEl.value;
    const fromOffice = OFFICES.find(o => o.key === fromKey);
    const [h, m]   = timeEl.value.split(':').map(Number);

    // Build a date object in the source timezone
    const now      = new Date();
    const srcStr   = now.toLocaleDateString('en-CA', { timeZone: fromOffice.tz });
    const srcDate  = new Date(`${srcStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);

    // Get offset of source tz from UTC
    const srcLocal   = new Date(now.toLocaleString('en-US', { timeZone: fromOffice.tz }));
    const srcUTC     = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const srcOffsetMs = srcLocal - srcUTC;

    const utcMs = srcDate.getTime() - srcOffsetMs;

    resultsEl.innerHTML = OFFICES
      .filter(o => o.key !== fromKey)
      .map(o => {
        const destLocal = new Date(now.toLocaleString('en-US', { timeZone: o.tz }));
        const destOffsetMs = destLocal - srcUTC;
        const destDate = new Date(utcMs + destOffsetMs);
        const timeStr  = destDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return `<div class="conv-result-row">
          <span class="conv-result-city">${o.flag} ${o.label}</span>
          <span class="conv-result-time">${timeStr}</span>
        </div>`;
      }).join('');
  }

  fromEl.addEventListener('change', updateResults);
  timeEl.addEventListener('change', updateResults);
  updateResults();
}

// ── Init ──────────────────────────────────────────────────
function init() {
  const userTz  = getUserTz();

  // Try geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const atOffice = OFFICES.find(o => isAtOffice(lat, lng, o));
        renderTiles(lat, lng, userTz);
        buildConverter(atOffice?.key || 'uk');
      },
      () => {
        // Geolocation denied — fall back to timezone matching
        const tzMatch = OFFICES.find(o => o.tz === userTz);
        renderTiles(null, null, userTz);
        buildConverter(tzMatch?.key || 'uk');
      },
      { timeout: 5000 }
    );
  } else {
    renderTiles(null, null, userTz);
    buildConverter('uk');
  }

  // Auto-refresh clock every 30s
  setInterval(() => {
    const userTz = getUserTz();
    renderTiles(null, null, userTz);
  }, 30000);
}

document.getElementById('btn-refresh').addEventListener('click', init);

init();
