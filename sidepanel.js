const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const WORK_START   = 9;
const WORK_END     = 18;
const SLOT_MINS    = 30;

// ── State ─────────────────────────────────────────────────
let colleagues    = [];
let selectedRange = 1;
let selectedSlot   = null;
let selectedDur    = 30;
let selectedLink   = 'zoom';
let savedZoomUrl   = '';
let zoomRooms      = []; // [{ name, url }]
let assistantMode  = false;
let currentToken   = null;
let includeSelf    = true;
let lastDays       = null;
let lastBusyMap    = null;
let lastAllEmails  = null;

// ── Helpers ───────────────────────────────────────────────
function formatDate(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

function getWorkingDays(n) {
  const days = [];
  const d    = new Date();
  d.setHours(0, 0, 0, 0);
  while (days.length < n) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getSlots(day) {
  const slots = [];
  const start = new Date(day);
  start.setHours(WORK_START, 0, 0, 0);
  const end = new Date(day);
  end.setHours(WORK_END, 0, 0, 0);
  let current = new Date(start);
  while (current < end) {
    slots.push(new Date(current));
    current = addMinutes(current, 15);
  }
  return slots;
}

// ── UI refs ───────────────────────────────────────────────
const viewSignin    = document.getElementById('view-signin');
const viewMain      = document.getElementById('view-main');
const viewSchedule  = document.getElementById('view-schedule');
const viewSuccess   = document.getElementById('view-success');
const btnSignin     = document.getElementById('btn-signin');
const btnSignout    = document.getElementById('btn-signout');
const btnAddEmail   = document.getElementById('btn-add-email');
const emailInput    = document.getElementById('email-input');
const colleagueTags = document.getElementById('colleague-tags');
const btnCheck      = document.getElementById('btn-check');
const gridEmpty     = document.getElementById('grid-empty');
const gridLoading   = document.getElementById('grid-loading');
const gridResults   = document.getElementById('grid-results');
const btnBack       = document.getElementById('btn-back');
const btnSend       = document.getElementById('btn-send');
const btnDone       = document.getElementById('btn-done');
const toggleMeet    = null; // replaced by link pills
const slotSummary   = document.getElementById('slot-summary');
const meetingTitle   = document.getElementById('meeting-title');
const meetingDesc    = document.getElementById('meeting-description');
const errorMsg       = document.getElementById('error-msg');
const successSub     = document.getElementById('success-sub');
const btnOpenCal     = document.getElementById('btn-open-calendar');
const btnClearAll    = document.getElementById('btn-clear-all');
const viewSettings  = document.getElementById('view-settings');
const btnSettings   = document.getElementById('btn-settings');
const btnSettingsBack = document.getElementById('btn-settings-back');
const btnSaveSettings = document.getElementById('btn-save-settings');
const zoomUrlInput       = document.getElementById('zoom-url-input');
const zoomNameInput      = document.getElementById('zoom-name-input');
const zoomRoomUrlInput   = document.getElementById('zoom-room-url-input');
const zoomWarning        = document.getElementById('zoom-warning');
const zoomRoomsList      = document.getElementById('zoom-rooms-list');
const zoomRoomPicker     = document.getElementById('zoom-room-picker');
const zoomRoomSelect     = document.getElementById('zoom-room-select');
const btnAddZoomRoom     = document.getElementById('btn-add-zoom-room');
const toggleAssistant    = document.getElementById('toggle-assistant');
const assistantZoomSection = document.getElementById('assistant-zoom-section');

// ── Include self toggle ───────────────────────────────────
// Controlled by Assistant Mode in settings — no manual toggle needed

// ── Views ─────────────────────────────────────────────────
function showView(name) {
  viewSignin.style.display    = name === 'signin'   ? 'flex'  : 'none';
  viewMain.style.display      = name === 'main'     ? 'flex'  : 'none';
  viewSchedule.style.display  = name === 'schedule' ? 'flex'  : 'none';
  viewSuccess.style.display   = name === 'success'  ? 'flex'  : 'none';
  viewSettings.style.display  = name === 'settings' ? 'flex'  : 'none';
  btnSignout.style.display    = name === 'main'     ? 'block' : 'none';
  btnSettings.style.display   = name === 'main'     ? 'block' : 'none';
}

// ── Settings ──────────────────────────────────────────────
function renderZoomRooms() {
  if (!zoomRooms.length) {
    zoomRoomsList.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:4px 0;">No Zoom rooms saved yet.</div>';
    return;
  }
  zoomRoomsList.innerHTML = zoomRooms.map((r, i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:600;color:var(--text);">${r.name}</div>
        <div style="font-size:11px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.url}</div>
      </div>
      <button class="btn-sm" data-i="${i}" style="color:var(--red);flex-shrink:0;">Remove</button>
    </div>
  `).join('');

  zoomRoomsList.querySelectorAll('.btn-sm').forEach(btn => {
    btn.addEventListener('click', () => {
      zoomRooms.splice(parseInt(btn.dataset.i), 1);
      renderZoomRooms();
    });
  });
}

btnAddZoomRoom.addEventListener('click', () => {
  const name = zoomNameInput.value.trim();
  const url  = zoomRoomUrlInput.value.trim();
  if (!name || !url) return;
  zoomRooms.push({ name, url });
  zoomNameInput.value    = '';
  zoomRoomUrlInput.value = '';
  renderZoomRooms();
});

toggleAssistant.addEventListener('click', () => {
  assistantMode = !assistantMode;
  toggleAssistant.classList.toggle('on', assistantMode);
  assistantZoomSection.style.display = assistantMode ? 'block' : 'none';
});

btnSettings.addEventListener('click', async () => {
  const data = await chrome.storage.local.get({ zoomRooms: [], assistantMode: false, zoomUrl: '' });
  zoomRooms     = data.zoomRooms;
  assistantMode = data.assistantMode;
  zoomUrlInput.value = data.zoomUrl || '';
  toggleAssistant.classList.toggle('on', assistantMode);
  assistantZoomSection.style.display = assistantMode ? 'block' : 'none';
  renderZoomRooms();
  showView('settings');
});

btnSettingsBack.addEventListener('click', () => showView('main'));

btnSaveSettings.addEventListener('click', async () => {
  savedZoomUrl = zoomUrlInput.value.trim();
  await chrome.storage.local.set({ zoomRooms, assistantMode, zoomUrl: savedZoomUrl });
  applyAssistantMode();
  btnSaveSettings.textContent = 'Saved ✓';
  setTimeout(() => { btnSaveSettings.textContent = 'Save settings'; showView('main'); }, 1000);
});

function applyAssistantMode() {
  // In assistant mode, never check own calendar
  includeSelf = !assistantMode;
}

// ── Sign in ───────────────────────────────────────────────
btnSignin.addEventListener('click', async () => {
  btnSignin.disabled    = true;
  btnSignin.textContent = 'Connecting…';
  const res = await chrome.runtime.sendMessage({ type: 'SIGN_IN' });
  if (res?.ok) {
    const { token } = await chrome.runtime.sendMessage({ type: 'GET_TOKEN' });
    currentToken = token;
    showView('main');
  } else {
    btnSignin.disabled    = false;
    btnSignin.textContent = 'Sign in with Google';
  }
});

btnSignout.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
  currentToken = null;
  colleagues   = [];
  showView('signin');
});

const autocompleteDropdown = document.getElementById('autocomplete-dropdown');

// ── Contacts autocomplete ─────────────────────────────────
let searchTimer = null;

emailInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const val = emailInput.value.trim();
  if (val.length < 2) { hideDropdown(); return; }
  searchTimer = setTimeout(() => searchContacts(val), 300);
});

emailInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') hideDropdown();
  if (e.key === 'Enter') { addEmail(); hideDropdown(); }
});

document.addEventListener('click', e => {
  if (!e.target.closest('.email-input-wrap')) hideDropdown();
});

function hideDropdown() {
  autocompleteDropdown.classList.remove('visible');
  autocompleteDropdown.innerHTML = '';
}

async function searchContacts(query) {
  if (!currentToken) return;
  try {
    const headers = { Authorization: `Bearer ${currentToken}` };
    const base    = 'https://people.googleapis.com/v1/people:searchDirectoryPeople';
    const params  = '&readMask=names,emailAddresses&sources=DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE&pageSize=5';

    // Search by name AND by email prefix in parallel to maximise coverage
    const [nameRes, emailRes, contactsRes] = await Promise.all([
      fetch(`${base}?query=${encodeURIComponent(query)}${params}`, { headers }),
      fetch(`${base}?query=${encodeURIComponent(query + '@yourdomain.com')}${params}`, { headers }),
      fetch(`https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses&pageSize=5`, { headers }),
    ]);

    const seen        = new Set();
    const suggestions = [];

    const extractPeople = (people) => {
      (people || []).forEach(p => {
        const name  = p.names?.[0]?.displayName || '';
        const email = p.emailAddresses?.[0]?.value?.toLowerCase() || '';
        if (!email || seen.has(email) || colleagues.includes(email)) return;
        seen.add(email);
        suggestions.push({ name, email });
      });
    };

    if (nameRes.ok)     { const d = await nameRes.json();     extractPeople(d.people); }
    if (emailRes.ok)    { const d = await emailRes.json();    extractPeople(d.people); }
    if (contactsRes.ok) {
      const d = await contactsRes.json();
      (d.results || []).forEach(r => {
        const name  = r.person?.names?.[0]?.displayName || '';
        const email = r.person?.emailAddresses?.[0]?.value?.toLowerCase() || '';
        if (!email || seen.has(email) || colleagues.includes(email)) return;
        seen.add(email);
        suggestions.push({ name, email });
      });
    }

    if (!suggestions.length) { hideDropdown(); return; }

    autocompleteDropdown.innerHTML = suggestions.slice(0, 6).map(s => `
      <div class="autocomplete-item" data-email="${s.email}">
        <div class="autocomplete-name">${s.name || s.email.split('@')[0]}</div>
        <div class="autocomplete-email">${s.email}</div>
      </div>
    `).join('');

    autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        emailInput.value = item.dataset.email;
        addEmail();
        hideDropdown();
      });
    });

    autocompleteDropdown.classList.add('visible');
  } catch (e) { hideDropdown(); }
}

// ── Colleagues ────────────────────────────────────────────
function renderTags() {
  colleagueTags.innerHTML = colleagues.map((email, i) => `
    <div class="tag">
      ${email.split('@')[0]}
      <button class="tag-remove" data-i="${i}">×</button>
    </div>
  `).join('');

  btnClearAll.style.display = colleagues.length > 1 ? 'block' : 'none';

  colleagueTags.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      colleagues.splice(parseInt(btn.dataset.i), 1);
      renderTags();
    });
  });
}

btnClearAll.addEventListener('click', () => {
  colleagues = [];
  renderTags();
});

btnAddEmail.addEventListener('click', addEmail);
emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') addEmail(); });

function addEmail() {
  const val = emailInput.value.trim().toLowerCase();
  if (!val || !val.includes('@')) return;
  if (colleagues.length >= 10) return;
  if (colleagues.includes(val)) { emailInput.value = ''; return; }
  colleagues.push(val);
  emailInput.value = '';
  renderTags();
}

// ── Date range ────────────────────────────────────────────
document.querySelectorAll('.date-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.date-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedRange = parseInt(pill.dataset.range);
  });
});

// ── Check availability ────────────────────────────────────
btnCheck.addEventListener('click', async () => {
  if (!colleagues.length) {
    emailInput.focus(); return;
  }

  gridEmpty.style.display   = 'none';
  gridLoading.classList.add('visible');
  gridResults.innerHTML     = '';
  btnCheck.disabled         = true;
  btnCheck.textContent      = 'Checking…';

  try {
    // Include own calendar based on toggle
    const allEmails = includeSelf
      ? ['primary', ...colleagues]
      : [...colleagues];

    const days = getWorkingDays(selectedRange);
    const timeMin = new Date(days[0]);
    timeMin.setHours(WORK_START, 0, 0, 0);
    const timeMax = new Date(days[days.length - 1]);
    timeMax.setHours(WORK_END, 0, 0, 0);

    const res = await fetch(`${CALENDAR_API}/freeBusy`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin:  timeMin.toISOString(),
        timeMax:  timeMax.toISOString(),
        items:    allEmails.map(email => ({ id: email })),
      }),
    });

    if (res.status === 401) {
      showView('signin'); return;
    }

    const data    = await res.json();
    const busyMap = data.calendars || {};

    lastDays      = days;
    lastBusyMap   = busyMap;
    lastAllEmails = allEmails;

    gridLoading.classList.remove('visible');
    renderGrid(days, busyMap, allEmails);
  } catch (e) {
    gridLoading.classList.remove('visible');
    gridEmpty.style.display  = 'block';
    gridEmpty.innerHTML      = '<span style="color:#E24B4A">Could not check availability.<br>Please try again.</span>';
  }

  btnCheck.disabled    = false;
  btnCheck.textContent = 'Check availability';
});

// ── Render grid ───────────────────────────────────────────
function isSlotBusy(slot, busyPeriods) {
  const slotEnd = addMinutes(slot, SLOT_MINS);
  return busyPeriods.some(p => {
    const start = new Date(p.start);
    const end   = new Date(p.end);
    return slot < end && slotEnd > start;
  });
}

function isBlockFreeForDuration(slot, durationMins, email, busyMap) {
  const slotEnd = addMinutes(slot, durationMins);
  const periods = busyMap[email]?.busy || [];
  return !periods.some(p => slot < new Date(p.end) && slotEnd > new Date(p.start));
}

function renderGrid(days, busyMap, allEmails) {
  const total = allEmails.length;

  gridResults.innerHTML = days.map(day => {
    const slots = getSlots(day);
    const now   = new Date();

    const slotRows = slots.map(slot => {
      if (slot < now) return '';

      let busyCount = 0;
      allEmails.forEach(email => {
        if (!isBlockFreeForDuration(slot, selectedDur, email, busyMap)) busyCount++;
      });

      const allFree  = busyCount === 0;
      const allBusy  = busyCount === total;
      const partial  = !allFree && !allBusy;

      const statusClass = allFree ? 'free' : allBusy ? 'busy' : 'partial';
      const barClass    = allFree ? '' : allBusy ? 'busy' : 'partial';
      const statusText  = allFree
        ? total > 0 ? 'All free' : 'Free'
        : allBusy ? 'Busy' : `${total - busyCount} of ${total} free`;

      const rowClass = allBusy ? 'slot-row busy' : 'slot-row';
      const dataAttr = allBusy ? '' : `data-slot="${slot.toISOString()}"`;

      return `<div class="${rowClass}" ${dataAttr}>
        <div class="slot-time">${formatTime(slot)}</div>
        <div class="slot-bar ${barClass}"></div>
        <div class="slot-status ${statusClass}">${statusText}</div>
      </div>`;
    }).join('');

    return `<div class="day-block">
      <div class="day-header">${formatDate(day)}</div>
      ${slotRows || '<div style="padding:12px 16px;color:#AAAAAA;font-size:12px">No more slots today</div>'}
    </div>`;
  }).join('');

  // Click slot to schedule
  gridResults.querySelectorAll('.slot-row:not(.busy)').forEach(row => {
    row.addEventListener('click', () => {
      selectedSlot = new Date(row.dataset.slot);
      openSchedule();
    });
  });
}

// ── Schedule modal ────────────────────────────────────────
function openSchedule() {
  const durLabel = selectedDur < 60 ? `${selectedDur}m` : selectedDur === 60 ? '1h' : '1.5h';
  slotSummary.textContent = `${formatDate(selectedSlot)} at ${formatTime(selectedSlot)} · ${durLabel} · with ${colleagues.map(e => e.split('@')[0]).join(', ')}`;
  meetingTitle.value = '';
  meetingDesc.value  = '';
  errorMsg.classList.remove('visible');
  zoomWarning.style.display = 'none';

  // Reset to zoom default
  selectedLink = 'zoom';
  document.querySelectorAll('.link-pill').forEach(p => p.classList.toggle('active', p.dataset.link === 'zoom'));

  // Zoom room picker — build list from own URL + extra rooms
  const allRooms = [];
  if (savedZoomUrl) allRooms.push({ name: 'My Zoom room', url: savedZoomUrl });
  zoomRooms.forEach(r => allRooms.push(r));

  if (assistantMode && allRooms.length > 1) {
    zoomRoomSelect.innerHTML = allRooms.map((r, i) =>
      `<option value="${i}">${r.name} — ${r.url.replace(/https?:\/\//, '').slice(0, 40)}</option>`
    ).join('');
    zoomRoomPicker.style.display = 'block';
    zoomWarning.style.display    = 'none';
  } else if (!savedZoomUrl && !zoomRooms.length) {
    zoomWarning.style.display    = 'block';
    zoomRoomPicker.style.display = 'none';
  } else {
    zoomRoomPicker.style.display = 'none';
  }

  showView('schedule');
}

btnBack.addEventListener('click', () => showView('main'));

// Duration pills — now in main view
document.querySelectorAll('.dur-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.dur-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedDur = parseInt(pill.dataset.mins);
    // If grid is already showing, re-render with new duration
    if (gridResults.innerHTML) renderGrid(lastDays, lastBusyMap, lastAllEmails);
  });
});

// Link type pills
document.querySelectorAll('.link-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.link-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedLink = pill.dataset.link;
    zoomWarning.style.display = (selectedLink === 'zoom' && !savedZoomUrl) ? 'block' : 'none';
  });
});

// ── Send invites ──────────────────────────────────────────
btnSend.addEventListener('click', async () => {
  const title = meetingTitle.value.trim();
  const desc  = meetingDesc.value.trim();
  if (!title) {
    errorMsg.textContent = 'Please enter a meeting title.';
    errorMsg.classList.add('visible');
    return;
  }

  btnSend.disabled    = true;
  btnSend.textContent = 'Sending…';
  errorMsg.classList.remove('visible');

  const start = selectedSlot;
  const end   = addMinutes(start, selectedDur);

  const event = {
    summary:     title,
    start:       { dateTime: start.toISOString() },
    end:         { dateTime: end.toISOString() },
    attendees:   colleagues.map(email => ({ email })),
    reminders:   { useDefault: true },
  };

  // Always set description if provided
  if (desc) event.description = desc;

  if (selectedLink === 'meet') {
    event.conferenceData = {
      createRequest: { requestId: Math.random().toString(36).slice(2) },
    };
  } else if (selectedLink === 'zoom') {
    const allRooms = [];
    if (savedZoomUrl) allRooms.push({ name: 'My Zoom room', url: savedZoomUrl });
    zoomRooms.forEach(r => allRooms.push(r));
    const zoomUrl = assistantMode && allRooms.length > 1
      ? allRooms[parseInt(zoomRoomSelect.value)]?.url
      : savedZoomUrl;
    if (zoomUrl) {
      event.description = `Join Zoom Meeting: ${zoomUrl}${desc ? '\n\n' + desc : ''}`;
    }
  }

  try {
    const useConference = selectedLink === 'meet';
    const url = `${CALENDAR_API}/calendars/primary/events${useConference ? '?conferenceDataVersion=1' : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) throw new Error(await res.text());

    const created = await res.json();
    const calLink = created.htmlLink || 'https://calendar.google.com';
    btnOpenCal.href = calLink;
    successSub.textContent = `"${title}" on ${formatDate(start)} at ${formatTime(start)} — invites sent to ${colleagues.length} colleague${colleagues.length !== 1 ? 's' : ''}.`;
    showView('success');
  } catch (e) {
    errorMsg.textContent = 'Could not create the event. Please try again.';
    errorMsg.classList.add('visible');
  }

  btnSend.disabled    = false;
  btnSend.textContent = 'Send invites';
});

btnDone.addEventListener('click', () => {
  gridResults.innerHTML = '';
  gridEmpty.style.display = 'block';
  gridEmpty.innerHTML = 'Add colleagues and click<br><strong>Check availability</strong> to see free slots.';
  showView('main');
});

// ── Init ──────────────────────────────────────────────────
(async () => {
  const { token } = await chrome.runtime.sendMessage({ type: 'GET_TOKEN' });
  const data      = await chrome.storage.local.get({ zoomRooms: [], zoomUrl: '', assistantMode: false });
  zoomRooms     = data.zoomRooms;
  savedZoomUrl  = data.zoomUrl || data.zoomRooms[0]?.url || '';
  assistantMode = data.assistantMode;
  applyAssistantMode();
  if (token) {
    currentToken = token;
    showView('main');
  } else {
    showView('signin');
  }
})();
