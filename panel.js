'use strict';

// ---------- Settings ----------
const OFFICES = [
  { id: 'uk', code: 'UK', name: 'United Kingdom', tz: 'Europe/London', colour: 'var(--yellow)' },
  { id: 'be', code: 'BE', name: 'Brussels', tz: 'Europe/Brussels', colour: 'var(--pink)' },
  { id: 'br', code: 'BR', name: 'Brazil', tz: 'America/Sao_Paulo', colour: 'var(--sky)' },
  { id: 'us', code: 'US', name: 'New York', tz: 'America/New_York', colour: 'var(--mint)' },
  { id: 'cn', code: 'CN', name: 'Beijing', tz: 'Asia/Shanghai', colour: 'var(--lilac)' }
];
const WORK_START = 9 * 60;        // 09:00
const WORK_END = 17 * 60 + 30;    // 17:30
const MAX_PLACES = 6;
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Friendly names that are not IANA city names
const ALIASES = {
  'Cowes': 'Europe/London', 'Edinburgh': 'Europe/London', 'Manchester': 'Europe/London',
  'Beijing': 'Asia/Shanghai', 'Delhi': 'Asia/Kolkata', 'New Delhi': 'Asia/Kolkata',
  'Mumbai': 'Asia/Kolkata', 'Bangalore': 'Asia/Kolkata', 'San Francisco': 'America/Los_Angeles',
  'Seattle': 'America/Los_Angeles', 'Washington DC': 'America/New_York', 'Boston': 'America/New_York',
  'Miami': 'America/New_York', 'Rio de Janeiro': 'America/Sao_Paulo', 'Cape Town': 'Africa/Johannesburg',
  'Geneva': 'Europe/Zurich', 'Milan': 'Europe/Rome', 'Barcelona': 'Europe/Madrid',
  'Munich': 'Europe/Berlin', 'Frankfurt': 'Europe/Berlin', 'Abu Dhabi': 'Asia/Dubai',
  'United Kingdom': 'Europe/London', 'Brazil': 'America/Sao_Paulo'
};

const state = { hour12: false, places: [], convFrom: null, convExtra: null, convInstant: null };

// ---------- Storage (works without chrome.* for local previews) ----------
const store = {
  async load() {
    if (!window.chrome?.storage?.sync) return {};
    return chrome.storage.sync.get({ hour12: false, places: [] });
  },
  save() {
    if (!window.chrome?.storage?.sync) return;
    chrome.storage.sync.set({ hour12: state.hour12, places: state.places });
  }
};

// ---------- Time helpers ----------
const fmtCache = new Map();
function getFmt(tz) {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23'
    }));
  }
  return fmtCache.get(tz);
}

function zoneParts(date, tz) {
  const o = {};
  for (const p of getFmt(tz).formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, wd: o.weekday };
}

function offsetMin(tz, date) {
  const p = zoneParts(date, tz);
  const asUTC = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
  const t = Math.floor(date.getTime() / 60000) * 60000;
  return Math.round((asUTC - t) / 60000);
}

// A wall-clock time in one zone, turned into a real moment
function zonedToInstant(y, m, d, h, mi, tz) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const off1 = offsetMin(tz, new Date(guess));
  let inst = guess - off1 * 60000;
  const off2 = offsetMin(tz, new Date(inst));
  if (off2 !== off1) inst = guess - off2 * 60000;
  return new Date(inst);
}

const pad = (n) => String(n).padStart(2, '0');
const dayNum = (p) => Date.UTC(p.y, p.m - 1, p.d) / 86400000;

function timeText(h, mi) {
  if (!state.hour12) return { main: `${pad(h)}:${pad(mi)}`, suffix: '' };
  return { main: `${h % 12 || 12}:${pad(mi)}`, suffix: h < 12 ? 'am' : 'pm' };
}
function timePlain(h, mi) {
  const t = timeText(h, mi);
  return t.suffix ? `${t.main}${t.suffix}` : t.main;
}

function status(p) {
  if (p.wd === 'Sat' || p.wd === 'Sun') return 'Weekend';
  const mins = p.h * 60 + p.mi;
  return mins >= WORK_START && mins < WORK_END ? 'In hours' : 'Out of hours';
}
const isNight = (p) => p.h < 7 || p.h >= 20;

function diffText(tz, date) {
  const diff = offsetMin(tz, date) - offsetMin(LOCAL_TZ, date);
  if (diff === 0) return 'Same time';
  const hrs = Math.abs(diff) / 60;
  const n = Number.isInteger(hrs) ? hrs : hrs.toFixed(1);
  return `${diff > 0 ? '+' : '-'}${n} ${hrs === 1 ? 'hr' : 'hrs'}`;
}

function dayWord(a, b) {
  const d = dayNum(a) - dayNum(b);
  if (d > 0) return 'Tomorrow';
  if (d < 0) return 'Yesterday';
  return '';
}

// ---------- Places list ----------
function buildCities() {
  const map = new Map();
  let zones = [];
  try { zones = Intl.supportedValuesOf('timeZone'); } catch (e) { zones = []; }
  for (const z of zones) {
    if (!z.includes('/') || z.startsWith('Etc/')) continue;
    const name = z.split('/').pop().replace(/_/g, ' ');
    if (!map.has(name)) map.set(name, z);
  }
  for (const [name, tz] of Object.entries(ALIASES)) map.set(name, tz);
  return map;
}
const CITIES = buildCities();

function zonesList() {
  const list = [];
  const here = OFFICES.find((o) => o.tz === LOCAL_TZ);
  if (here) list.push({ ...here, here: true });
  else list.push({ id: 'you', code: 'YOU', name: 'Your time', tz: LOCAL_TZ, colour: 'var(--peach)', here: true });
  for (const o of OFFICES) if (o !== here) list.push(o);
  state.places.forEach((p, i) => list.push({
    id: `place-${i}`, code: p.name.slice(0, 2).toUpperCase(), name: p.name, tz: p.tz,
    colour: 'var(--white)', place: true, index: i
  }));
  return list;
}

// ---------- Rendering ----------
const $ = (id) => document.getElementById(id);
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function renderRows() {
  const now = new Date();
  const local = zoneParts(now, LOCAL_TZ);
  const ul = $('rows');
  ul.replaceChildren();

  for (const z of zonesList()) {
    const p = zoneParts(now, z.tz);
    const li = el('li', 'row');
    li.style.background = z.colour;
    if (isNight(p)) li.classList.add('night');
    if (z.here) li.classList.add('here');

    li.append(el('span', 'code', z.code));
    li.lastChild.setAttribute('aria-hidden', 'true');

    const info = el('div', 'info');
    info.append(el('div', 'name', z.name));
    const bits = [z.here ? 'You are here' : (z.place ? `My place, ${diffText(z.tz, now)}` : diffText(z.tz, now))];
    const dw = dayWord(p, local);
    if (dw) bits.push(dw);
    bits.push(status(p));
    info.append(el('div', 'sub', bits.join(' · ')));
    li.append(info);

    const t = timeText(p.h, p.mi);
    const time = el('div', 'time', t.main);
    if (t.suffix) time.append(el('small', '', t.suffix));
    li.append(time);

    if (z.place) {
      const rm = el('button', 'remove', '×');
      rm.type = 'button';
      rm.setAttribute('aria-label', `Remove ${z.name}`);
      rm.addEventListener('click', () => removePlace(z.index));
      li.append(rm);
    }
    ul.append(li);
  }
}

// Keep both city boxes in step (without fighting someone typing)
function renderConvSelect() {
  if (!state.convFrom) {
    const first = zonesList()[0];
    state.convFrom = { name: first.name, tz: first.tz };
  }
  const a = $('conv-zone');
  const b = $('conv-extra');
  if (document.activeElement !== a) a.value = state.convFrom.name;
  if (document.activeElement !== b) b.value = state.convExtra ? state.convExtra.name : '';
}

// Match typed text to your rows first, then any city
function findZone(input) {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  const row = zonesList().find((z) => z.name.toLowerCase() === q);
  if (row) return { name: row.name, tz: row.tz };
  return findCity(input);
}

// Set a wall-clock time in one zone, on the day that zone is currently showing
function setTimeIn(tz, hhmm) {
  if (!hhmm) return;
  const [h, mi] = hhmm.split(':').map(Number);
  const base = zoneParts(state.convInstant, tz);
  state.convInstant = zonedToInstant(base.y, base.m, base.d, h, mi, tz);
}

const hhmm = (p) => `${pad(p.h)}:${pad(p.mi)}`;

function convResults() {
  const list = zonesList();
  const src = state.convFrom;
  const to = state.convExtra;
  const instant = state.convInstant;
  const srcP = zoneParts(instant, src.tz);
  const dayDiff = (p) => {
    const d = dayNum(p) - dayNum(srcP);
    return d > 0 ? `+${d} day` : d < 0 ? `${d} day` : '';
  };
  const toRes = to ? (() => { const p = zoneParts(instant, to.tz); return { z: to, p, day: dayDiff(p), st: status(p) }; })() : null;
  const others = list
    .filter((z) => z.name !== src.name && (!to || z.name !== to.name))
    .map((z) => { const p = zoneParts(instant, z.tz); return { z, p, day: dayDiff(p), st: status(p) }; });
  return { src, srcP, toRes, others };
}

function renderConv() {
  const { srcP, toRes, others } = convResults();
  const ta = $('conv-time-a');
  const tb = $('conv-time-b');
  if (document.activeElement !== ta) ta.value = hhmm(srcP);
  tb.disabled = !toRes;
  if (toRes && document.activeElement !== tb) tb.value = hhmm(toRes.p);
  if (!toRes) tb.value = '';
  $('conv-day').textContent = toRes && toRes.day ? `${toRes.z.name} is ${toRes.day}` : '';

  const ul = $('conv-out');
  ul.replaceChildren();
  for (const r of others) {
    const li = el('li', 'chip');
    if (r.st !== 'In hours') li.classList.add('off');
    li.append(el('span', 'chip-name', r.z.name));
    const line = el('span', 'chip-time');
    const t = timeText(r.p.h, r.p.mi);
    const b = el('b', '', t.main);
    if (t.suffix) b.append(el('small', '', t.suffix));
    line.append(b);
    if (r.day) line.append(el('span', 'day', r.day));
    li.append(line);
    li.append(el('span', 'sr-only', `, ${r.st}`));
    ul.append(li);
  }
}

function renderFormatButton() {
  const b = $('fmt');
  b.textContent = state.hour12 ? '12h' : '24h';
  b.setAttribute('aria-label', `Clock is ${state.hour12 ? '12' : '24'} hour. Switch to ${state.hour12 ? '24' : '12'} hour`);
}

function renderAll() {
  renderFormatButton();
  renderRows();
  renderConvSelect();
  renderConv();
}

// ---------- Actions ----------
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

async function copyForSlack() {
  const { src, srcP, toRes, others } = convResults();
  const parts = [`${timePlain(srcP.h, srcP.mi)} ${src.name}`];
  const rows = toRes ? [toRes, ...others] : others;
  for (const r of rows) parts.push(`${timePlain(r.p.h, r.p.mi)} ${r.z.name}${r.day ? ` (${r.day})` : ''}`);
  const text = `🕒 ${parts.join(' / ')}`;
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast('Copied for Slack');
}

function findCity(input) {
  const q = input.trim().toLowerCase();
  for (const [name, tz] of CITIES) if (name.toLowerCase() === q) return { name, tz };
  return null;
}

function addPlace(e) {
  e.preventDefault();
  const msg = $('add-msg');
  const city = findCity($('add-input').value);
  if (!city) { msg.textContent = 'Pick a city from the list, for example Lisbon or Sydney.'; return; }
  if (state.places.some((p) => p.name === city.name)) { msg.textContent = `${city.name} is already in your list.`; return; }
  if (state.places.length >= MAX_PLACES) { msg.textContent = `You can save up to ${MAX_PLACES} places. Remove one first.`; return; }
  state.places.push(city);
  store.save();
  $('add-input').value = '';
  msg.textContent = '';
  toggleAdd(false);
  renderAll();
  toast(`Added ${city.name}`);
}

function removePlace(i) {
  const [gone] = state.places.splice(i, 1);
  store.save();
  renderAll();
  if (gone) toast(`Removed ${gone.name}`);
}

function toggleAdd(open) {
  const form = $('add-form');
  const show = open ?? form.hidden;
  form.hidden = !show;
  $('add-toggle').setAttribute('aria-expanded', String(show));
  if (show) $('add-input').focus();
}

// Refresh exactly on each new minute
function tick() {
  const wait = 60000 - (Date.now() % 60000) + 50;
  setTimeout(() => { renderRows(); tick(); }, wait);
}

// ---------- Start ----------
(async function init() {
  const saved = await store.load();
  state.hour12 = !!saved.hour12;
  state.places = Array.isArray(saved.places) ? saved.places.filter((p) => p && p.name && p.tz) : [];

  // Default converter: the next full hour in your time
  const first = zonesList()[0];
  state.convFrom = { name: first.name, tz: first.tz };
  state.convInstant = new Date();
  setTimeIn(first.tz, `${pad((zoneParts(new Date(), first.tz).h + 1) % 24)}:00`);

  $('city-list').replaceChildren(...[...CITIES.keys()].sort().map((n) => {
    const o = document.createElement('option');
    o.value = n;
    return o;
  }));

  $('fmt').addEventListener('click', () => { state.hour12 = !state.hour12; store.save(); renderAll(); });
  const badCity = 'Pick a city from the list, for example Tokyo or Lima.';
  $('conv-time-a').addEventListener('input', (e) => {
    if (!e.target.value) return;
    setTimeIn(state.convFrom.tz, e.target.value);
    renderConv();
  });
  $('conv-time-b').addEventListener('input', (e) => {
    if (!e.target.value || !state.convExtra) return;
    setTimeIn(state.convExtra.tz, e.target.value);
    renderConv();
  });
  // Changing the top city keeps the top time you typed
  $('conv-zone').addEventListener('input', (e) => {
    const z = findZone(e.target.value);
    if (!z) return;
    const keep = hhmm(zoneParts(state.convInstant, state.convFrom.tz));
    state.convFrom = z;
    setTimeIn(z.tz, keep);
    $('conv-msg').textContent = '';
    renderConv();
  });
  $('conv-zone').addEventListener('change', (e) => {
    if (findZone(e.target.value)) return;
    $('conv-msg').textContent = badCity;
    e.target.value = state.convFrom.name;
  });
  // Changing the bottom city keeps the same moment, so its time updates
  $('conv-extra').addEventListener('input', (e) => {
    const v = e.target.value.trim();
    const z = findZone(v);
    if (!z && v) return;
    state.convExtra = z;
    $('conv-msg').textContent = '';
    renderConv();
  });
  $('conv-extra').addEventListener('change', (e) => {
    if (!e.target.value.trim() || findZone(e.target.value)) return;
    $('conv-msg').textContent = badCity;
    e.target.value = state.convExtra ? state.convExtra.name : '';
  });
  $('swap').addEventListener('click', () => {
    if (!state.convExtra) { $('conv-msg').textContent = 'Add a second city to swap.'; return; }
    [state.convFrom, state.convExtra] = [state.convExtra, state.convFrom];
    $('conv-msg').textContent = '';
    renderConvSelect();
    renderConv();
  });
  $('copy').addEventListener('click', copyForSlack);
  $('add-toggle').addEventListener('click', () => toggleAdd());
  $('add-form').addEventListener('submit', addPlace);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderRows(); });

  renderAll();
  tick();
})();
