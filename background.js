const CLIENT_ID = 'YOUR_GOOGLE_OAUTH_CLIENT_ID';
const SCOPES    = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/directory.readonly',
].join(' ');

// ── Open side panel on icon click ─────────────────────────
chrome.action.onClicked.addListener(tab => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// ── Auth ──────────────────────────────────────────────────
async function getToken(interactive = false) {
  const cache = await chrome.storage.local.get({ token: null, tokenExpiry: 0 });
  if (cache.token && Date.now() < cache.tokenExpiry - 60000) return cache.token;
  if (!interactive) return null;

  const redirectUrl = chrome.identity.getRedirectURL();
  const authUrl = 'https://accounts.google.com/o/oauth2/auth?' + new URLSearchParams({
    client_id:     CLIENT_ID,
    response_type: 'token',
    redirect_uri:  redirectUrl,
    scope:         SCOPES,
  });

  return new Promise(resolve => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, responseUrl => {
      if (chrome.runtime.lastError || !responseUrl) { resolve(null); return; }
      const params = new URLSearchParams(new URL(responseUrl).hash.slice(1));
      const token  = params.get('access_token');
      const expiry = Date.now() + parseInt(params.get('expires_in') || '3600') * 1000;
      if (token) chrome.storage.local.set({ token, tokenExpiry: expiry });
      resolve(token || null);
    });
  });
}

async function clearToken() {
  await chrome.storage.local.remove(['token', 'tokenExpiry']);
}

// ── Messages ──────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'SIGN_IN') {
    (async () => {
      const token = await getToken(true);
      sendResponse(token ? { ok: true } : { error: 'auth_failed' });
    })();
    return true;
  }

  if (msg.type === 'SIGN_OUT') {
    clearToken().then(() => {
      chrome.storage.local.clear();
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'GET_TOKEN') {
    getToken(false).then(token => sendResponse({ token }));
    return true;
  }
});
