// ── Offices ───────────────────────────────────────────────
const OFFICES = [
  { key:'uk',      label:'United Kingdom', flag:'🇬🇧', tz:'Europe/London',       offices:'London, EC2A',       lat:51.5,  lng:-0.09, },
  { key:'brussels',label:'Brussels',       flag:'🇧🇪', tz:'Europe/Brussels',     offices:'Brussels, 1000',     lat:50.85, lng:4.35,  },
  { key:'brazil',  label:'Brazil',         flag:'🇧🇷', tz:'America/Sao_Paulo',   offices:'São Paulo, SP',      lat:-23.5, lng:-46.6, },
  { key:'beijing', label:'Beijing',        flag:'🇨🇳', tz:'Asia/Shanghai',       offices:'Beijing, 100000',    lat:39.9,  lng:116.4, },
  { key:'newyork', label:'New York',       flag:'🇺🇸', tz:'America/New_York',    offices:'New York, NY',       lat:40.7,  lng:-74.0, fullWidth:true },
];

// ── City → TZ map ─────────────────────────────────────────
const CITY_TZ = [
  ['London','Europe/London'],['New York','America/New_York'],['Los Angeles','America/Los_Angeles'],
  ['Chicago','America/Chicago'],['Toronto','America/Toronto'],['Vancouver','America/Vancouver'],
  ['São Paulo','America/Sao_Paulo'],['Buenos Aires','America/Argentina/Buenos_Aires'],
  ['Mexico City','America/Mexico_City'],['Bogotá','America/Bogota'],['Lima','America/Lima'],
  ['Paris','Europe/Paris'],['Berlin','Europe/Berlin'],['Madrid','Europe/Madrid'],
  ['Rome','Europe/Rome'],['Amsterdam','Europe/Amsterdam'],['Brussels','Europe/Brussels'],
  ['Zurich','Europe/Zurich'],['Stockholm','Europe/Stockholm'],['Oslo','Europe/Oslo'],
  ['Copenhagen','Europe/Copenhagen'],['Helsinki','Europe/Helsinki'],['Warsaw','Europe/Warsaw'],
  ['Prague','Europe/Prague'],['Vienna','Europe/Vienna'],['Budapest','Europe/Budapest'],
  ['Lisbon','Europe/Lisbon'],['Athens','Europe/Athens'],['Istanbul','Europe/Istanbul'],
  ['Dubai','Asia/Dubai'],['Riyadh','Asia/Riyadh'],['Tel Aviv','Asia/Jerusalem'],
  ['Cairo','Africa/Cairo'],['Nairobi','Africa/Nairobi'],['Lagos','Africa/Lagos'],
  ['Johannesburg','Africa/Johannesburg'],['Casablanca','Africa/Casablanca'],
  ['Mumbai','Asia/Kolkata'],['Delhi','Asia/Kolkata'],['Kolkata','Asia/Kolkata'],
  ['Chennai','Asia/Kolkata'],['Bangalore','Asia/Kolkata'],
  ['Karachi','Asia/Karachi'],['Dhaka','Asia/Dhaka'],['Kathmandu','Asia/Kathmandu'],
  ['Bangkok','Asia/Bangkok'],['Ho Chi Minh City','Asia/Ho_Chi_Minh'],['Jakarta','Asia/Jakarta'],
  ['Kuala Lumpur','Asia/Kuala_Lumpur'],['Singapore','Asia/Singapore'],
  ['Beijing','Asia/Shanghai'],['Shanghai','Asia/Shanghai'],['Hong Kong','Asia/Hong_Kong'],
  ['Taipei','Asia/Taipei'],['Seoul','Asia/Seoul'],['Tokyo','Asia/Tokyo'],
  ['Osaka','Asia/Tokyo'],['Manila','Asia/Manila'],
  ['Sydney','Australia/Sydney'],['Melbourne','Australia/Melbourne'],
  ['Brisbane','Australia/Brisbane'],['Perth','Australia/Perth'],['Auckland','Pacific/Auckland'],
  ['Honolulu','Pacific/Honolulu'],['Anchorage','America/Anchorage'],
  ['Denver','America/Denver'],['Phoenix','America/Phoenix'],['Miami','America/New_York'],
  ['Boston','America/New_York'],['Washington DC','America/New_York'],['Atlanta','America/New_York'],
  ['Seattle','America/Los_Angeles'],['San Francisco','America/Los_Angeles'],
  ['Las Vegas','America/Los_Angeles'],['Montreal','America/Toronto'],
  ['Reykjavik','Atlantic/Reykjavik'],['Accra','Africa/Accra'],
  ['Addis Ababa','Africa/Addis_Ababa'],['Dar es Salaam','Africa/Dar_es_Salaam'],
];

// ── Helpers ───────────────────────────────────────────────
function getOfficeTime(tz) {
  const now  = new Date();
  const hour = parseInt(now.toLocaleTimeString('en-GB', { timeZone:tz, hour:'2-digit', hour12:false }));
  return {
    time:   now.toLocaleTimeString('en-GB', { timeZone:tz, hour:'2-digit', minute:'2-digit', hour12:false }),
    date:   now.toLocaleDateString('en-GB', { timeZone:tz, weekday:'short', day:'numeric', month:'short' }),
    period: getPeriod(hour),
  };
}

function getPeriod(h) {
  if (h < 6)  return 'Early morning';
  if (h < 12) return 'Morning';
  if (h < 14) return 'Lunchtime';
  if (h < 18) return 'Afternoon';
  if (h < 21) return 'Evening';
  return 'Night';
}

function getOffset(tzA, tzB) {
  const now   = new Date();
  const base  = new Date(now.toLocaleString('en-US', { timeZone:tzA }));
  const other = new Date(now.toLocaleString('en-US', { timeZone:tzB }));
  const diff  = Math.round((other - base) / 3600000);
  if (diff === 0) return null;
  return diff > 0 ? `+${diff} hr${Math.abs(diff)!==1?'s':''}` : `−${Math.abs(diff)} hr${Math.abs(diff)!==1?'s':''}`;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function findNearestOffice(lat, lng) {
  return OFFICES.reduce((best,o) => {
    const d = haversine(lat,lng,o.lat,o.lng);
    return d < best.dist ? {office:o,dist:d} : best;
  }, {office:null,dist:Infinity}).office;
}

function isAtOffice(lat, lng, office, km=80) { return haversine(lat,lng,office.lat,office.lng) < km; }
function tzToOffice(tz) { return OFFICES.find(o => o.tz===tz) || null; }
function getUserCityName(tz) { return tz.split('/').pop().replace(/_/g,' '); }

function getUtcOffsetMins(tz) {
  const now=new Date(), u=new Date(now.toLocaleString('en-US',{timeZone:'UTC'})), t=new Date(now.toLocaleString('en-US',{timeZone:tz}));
  return Math.round((t-u)/60000);
}

function getUtcOffsetStr(tz) {
  const m=getUtcOffsetMins(tz), sign=m>=0?'+':'−', h=Math.floor(Math.abs(m)/60), min=Math.abs(m)%60;
  return `UTC${sign}${h}${min?':'+String(min).padStart(2,'0'):''}`;
}

function searchCities(q) {
  if (!q||q.length<2) return [];
  const lq=q.toLowerCase();
  return CITY_TZ.filter(([c])=>c.toLowerCase().includes(lq)).slice(0,6);
}

// ── Render office tiles ───────────────────────────────────
function renderTiles(userLat, userLng, userTz, geoAvailable) {
  const tilesEl  = document.getElementById('tiles');
  const locEl    = document.getElementById('loc-status');
  const atOffice = geoAvailable && userLat!==null ? OFFICES.find(o=>isAtOffice(userLat,userLng,o))||null : tzToOffice(userTz);
  const nearest  = (!atOffice && geoAvailable && userLat!==null) ? findNearestOffice(userLat,userLng) : null;

  if (!geoAvailable) { locEl.textContent='Location unavailable — showing timezone match'; locEl.classList.add('visible'); }
  else locEl.classList.remove('visible');

  const officeHtml = OFFICES.map(o => {
    const t=getOfficeTime(o.tz), isYou=atOffice?.key===o.key, isNearest=nearest?.key===o.key;
    const offset=getOffset(userTz, o.tz);
    const cls=['tile',o.fullWidth?'full-width':'',isYou?'you-here':isNearest?'nearest':''].filter(Boolean).join(' ');
    const badge=isYou?`<span class="tile-badge badge-you">You are here</span>`:isNearest?`<span class="tile-badge badge-nearest">Nearest office</span>`:offset?`<span class="tile-offset">${offset}</span>`:`<span class="tile-offset">Same time</span>`;
    return `<div class="${cls}">
      <div class="tile-top"><div class="tile-flag">${o.flag}</div>${badge}</div>
      <div class="tile-city">${o.label}</div>
      <div class="tile-offices">${o.offices.split('\n').join('<br>')}</div>
      <div class="tile-time">${t.time}</div>
      <div class="tile-meta">${t.date} · ${t.period}</div>
    </div>`;
  }).join('');

  let userTile='';
  if (geoAvailable && userLat!==null && !atOffice) {
    const t=getOfficeTime(userTz);
    userTile=`<div class="tile full-width user-loc">
      <div class="tile-top"><div class="tile-flag">📍</div><span class="tile-badge badge-loc">Your location</span></div>
      <div class="tile-city">${getUserCityName(userTz)}</div>
      <div class="tile-offices">Detected from your browser</div>
      <div class="tile-time">${t.time}</div>
      <div class="tile-meta">${t.date} · ${t.period}</div>
    </div>`;
  }
  tilesEl.innerHTML = officeHtml + userTile;
}

// ── Office converter ──────────────────────────────────────
function buildConverter(defaultKey, userLat, userLng, userTz, geoAvailable) {
  const fromEl=document.getElementById('conv-from'), hourEl=document.getElementById('conv-hour'), minEl=document.getElementById('conv-min'), resultsEl=document.getElementById('conv-results');
  const atOffice=geoAvailable&&userLat!==null?OFFICES.find(o=>isAtOffice(userLat,userLng,o)):tzToOffice(userTz);
  let userLocOption='';
  if (geoAvailable&&userLat!==null&&!atOffice) { userLocOption=`<option value="__user__">📍 ${getUserCityName(userTz)} (your location)</option>`; }
  fromEl.innerHTML=userLocOption+OFFICES.map(o=>`<option value="${o.key}" ${o.key===defaultKey&&!userLocOption?'selected':''}>${o.flag} ${o.label}</option>`).join('');
  if (userLocOption) fromEl.value='__user__';
  hourEl.innerHTML=Array.from({length:24},(_,i)=>`<option value="${i}">${String(i).padStart(2,'0')}</option>`).join('');
  minEl.innerHTML=Array.from({length:60},(_,i)=>`<option value="${i}">${String(i).padStart(2,'0')}</option>`).join('');
  const now=new Date(); hourEl.value=now.getHours(); minEl.value=now.getMinutes();
  function getTz(key) { return key==='__user__'?userTz:OFFICES.find(o=>o.key===key)?.tz||userTz; }
  function update() {
    const fromTz=getTz(fromEl.value), h=parseInt(hourEl.value), m=parseInt(minEl.value);
    const fromOff=getUtcOffsetMins(fromTz), utcMins=h*60+m-fromOff;
    resultsEl.innerHTML=OFFICES.filter(o=>o.key!==fromEl.value).map(o=>{
      const destOff=getUtcOffsetMins(o.tz), dest=((utcMins+destOff)%1440+1440)%1440;
      return `<div class="conv-result-row"><span class="conv-result-city">${o.flag} ${o.label}</span><span class="conv-result-time">${String(Math.floor(dest/60)).padStart(2,'0')}:${String(dest%60).padStart(2,'0')}</span></div>`;
    }).join('');
  }
  fromEl.addEventListener('change',update); hourEl.addEventListener('change',update); minEl.addEventListener('change',update);
  update();
}

// ── Saved locations ───────────────────────────────────────
let savedLocations = [];

async function loadSavedLocations() {
  const data = await chrome.storage.local.get({ savedLocations:[] });
  savedLocations = data.savedLocations;
}

async function saveSavedLocations() {
  await chrome.storage.local.set({ savedLocations });
}

function renderSavedTiles() {
  const el = document.getElementById('saved-tiles');
  const tiles = savedLocations.map((loc, i) => {
    const t = getOfficeTime(loc.tz);
    const offset = getOffset(Intl.DateTimeFormat().resolvedOptions().timeZone, loc.tz);
    return `<div class="saved-tile">
      <button class="saved-tile-remove" data-i="${i}">×</button>
      <div class="saved-tile-city">${loc.city}</div>
      <div class="saved-tile-tz">${loc.tz}${offset ? ' · ' + offset : ''}</div>
      <div class="saved-tile-time">${t.time}</div>
      <div class="saved-tile-meta">${t.date} · ${t.period}</div>
    </div>`;
  }).join('');

  el.innerHTML = tiles + `<button class="saved-tile-add" id="btn-add-location"><span style="font-size:18px;color:var(--text3);">+</span><span>Add a location</span></button>`;

  el.querySelectorAll('.saved-tile-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      savedLocations.splice(parseInt(btn.dataset.i), 1);
      await saveSavedLocations();
      renderSavedTiles();
    });
  });

  document.getElementById('btn-add-location').addEventListener('click', () => {
    document.getElementById('add-modal-wrap').classList.add('open');
    document.getElementById('add-search').value='';
    document.getElementById('add-dropdown').classList.remove('open');
    document.getElementById('add-dropdown').innerHTML='';
    document.getElementById('add-search').focus();
  });
}

// Add location modal
document.getElementById('btn-modal-cancel').addEventListener('click', () => {
  document.getElementById('add-modal-wrap').classList.remove('open');
});

document.getElementById('add-modal-wrap').addEventListener('click', e => {
  if (e.target === document.getElementById('add-modal-wrap')) {
    document.getElementById('add-modal-wrap').classList.remove('open');
  }
});

document.getElementById('add-search').addEventListener('input', e => {
  const results = searchCities(e.target.value);
  const drop = document.getElementById('add-dropdown');
  if (!results.length) { drop.classList.remove('open'); return; }
  drop.innerHTML = results.map(([city,tz]) => `
    <div class="add-option" data-city="${city}" data-tz="${tz}">
      <div class="add-option-city">${city}</div>
      <div class="add-option-tz">${tz} · ${getUtcOffsetStr(tz)}</div>
    </div>`).join('');
  drop.classList.add('open');
  drop.querySelectorAll('.add-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      if (!savedLocations.find(l => l.tz===opt.dataset.tz)) {
        savedLocations.push({ city:opt.dataset.city, tz:opt.dataset.tz });
        await saveSavedLocations();
        renderSavedTiles();
      }
      document.getElementById('add-modal-wrap').classList.remove('open');
    });
  });
});

// ── World converter ───────────────────────────────────────
function initWorldConverter() {
  const wcHourEl=document.getElementById('wc-hour'), wcMinEl=document.getElementById('wc-min');
  const wcFromInput=document.getElementById('wc-from-input'), wcFromDrop=document.getElementById('wc-from-dropdown');
  const wcToInput=document.getElementById('wc-to-input'), wcToDrop=document.getElementById('wc-to-dropdown');
  const wcToTags=document.getElementById('wc-to-tags'), wcResults=document.getElementById('wc-results');

  wcHourEl.innerHTML=Array.from({length:24},(_,i)=>`<option value="${i}">${String(i).padStart(2,'0')}</option>`).join('');
  wcMinEl.innerHTML=Array.from({length:60},(_,i)=>`<option value="${i}">${String(i).padStart(2,'0')}</option>`).join('');
  const now=new Date(); wcHourEl.value=now.getHours(); wcMinEl.value=now.getMinutes();

  let fromTz=Intl.DateTimeFormat().resolvedOptions().timeZone;
  wcFromInput.value=getUserCityName(fromTz);
  let toZones=[];

  function updateResults() {
    if (!toZones.length) { wcResults.innerHTML='<div style="font-size:11px;color:var(--text3);padding:4px 0;">Add a destination above.</div>'; return; }
    const h=parseInt(wcHourEl.value), m=parseInt(wcMinEl.value);
    const fromOff=getUtcOffsetMins(fromTz), utcMins=h*60+m-fromOff;
    wcResults.innerHTML=toZones.map(({city,tz})=>{
      const destOff=getUtcOffsetMins(tz), destMins=((utcMins+destOff)%1440+1440)%1440;
      const timeStr=`${String(Math.floor(destMins/60)).padStart(2,'0')}:${String(destMins%60).padStart(2,'0')}`;
      const rawDest=utcMins+destOff, dayDiff=Math.floor(rawDest/1440)-(rawDest<0?-1:0)- (h*60+m>=0?0:0);
      const crossDay=Math.floor((utcMins+destOff)/1440);
      const dayLabel=crossDay===1?'+1 day':crossDay===-1?'−1 day':'';
      return `<div class="wc-result-row"><span class="wc-result-label">${city}</span><span style="display:flex;align-items:baseline;gap:4px;"><span class="wc-result-time">${timeStr}</span>${dayLabel?`<span class="wc-result-day">${dayLabel}</span>`:''}</span></div>`;
    }).join('');
  }

  function renderTags() {
    wcToTags.innerHTML=toZones.map((z,i)=>`<div class="wc-tag"><span class="wc-tag-name">${z.city}</span><button class="wc-tag-remove" data-i="${i}">×</button></div>`).join('');
    wcToTags.querySelectorAll('.wc-tag-remove').forEach(btn=>{
      btn.addEventListener('click',()=>{ toZones.splice(parseInt(btn.dataset.i),1); renderTags(); updateResults(); });
    });
  }

  function showDropdown(input, dropdown, onSelect) {
    input.addEventListener('input', () => {
      const results=searchCities(input.value);
      if (!results.length) { dropdown.classList.remove('open'); return; }
      dropdown.innerHTML=results.map(([city,tz])=>`<div class="tz-option" data-city="${city}" data-tz="${tz}"><div class="tz-option-city">${city}</div><div class="tz-option-zone">${tz} · ${getUtcOffsetStr(tz)}</div></div>`).join('');
      dropdown.classList.add('open');
      dropdown.querySelectorAll('.tz-option').forEach(opt=>{
        opt.addEventListener('click',()=>{ onSelect(opt.dataset.city,opt.dataset.tz); dropdown.classList.remove('open'); });
      });
    });
    document.addEventListener('click',e=>{ if (!input.contains(e.target)&&!dropdown.contains(e.target)) dropdown.classList.remove('open'); });
  }

  showDropdown(wcFromInput, wcFromDrop, (city,tz)=>{ fromTz=tz; wcFromInput.value=city; updateResults(); });
  showDropdown(wcToInput, wcToDrop, (city,tz)=>{ if (!toZones.find(z=>z.tz===tz)) { toZones.push({city,tz}); renderTags(); updateResults(); } wcToInput.value=''; });
  wcHourEl.addEventListener('change',updateResults); wcMinEl.addEventListener('change',updateResults);
  updateResults();
}

// ── Init ──────────────────────────────────────────────────
let cachedLat=null, cachedLng=null, cachedGeo=false;

function render() {
  const userTz=Intl.DateTimeFormat().resolvedOptions().timeZone;
  renderTiles(cachedLat, cachedLng, userTz, cachedGeo);
  renderSavedTiles();
}

async function init() {
  await loadSavedLocations();
  renderSavedTiles();
  initWorldConverter();

  const userTz=Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        cachedLat=pos.coords.latitude; cachedLng=pos.coords.longitude; cachedGeo=true;
        const atOffice=OFFICES.find(o=>isAtOffice(cachedLat,cachedLng,o));
        renderTiles(cachedLat,cachedLng,userTz,true);
        buildConverter(atOffice?.key||'uk',cachedLat,cachedLng,userTz,true);
      },
      () => {
        cachedGeo=false;
        const tzMatch=OFFICES.find(o=>o.tz===userTz);
        renderTiles(null,null,userTz,false);
        buildConverter(tzMatch?.key||'uk',null,null,userTz,false);
      },
      { timeout:6000, maximumAge:300000 }
    );
  } else {
    cachedGeo=false;
    const tzMatch=OFFICES.find(o=>o.tz===userTz);
    renderTiles(null,null,userTz,false);
    buildConverter(tzMatch?.key||'uk',null,null,userTz,false);
  }

  setInterval(render, 30000);
}

document.getElementById('btn-refresh').addEventListener('click', init);
init();
