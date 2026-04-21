# SlotSync

A Chrome extension that finds when colleagues are free and schedules meetings in one click.

Opens as a side panel, connects to Google Calendar, and lets you check availability across up to 10 people before sending calendar invites — without leaving your browser.

## Features

- **Availability grid** - shows free, partial, and busy slots across selected colleagues for up to a month ahead
- **One-click scheduling** - select a slot and send Google Calendar invites directly from the extension
- **Contacts autocomplete** - searches your Google directory and contacts as you type
- **Google Meet or Zoom** - choose your meeting link type when scheduling
- **Multiple Zoom rooms** - save multiple Zoom room URLs and choose between them when booking
- **Assistant Mode** - schedule on behalf of others without checking your own calendar or adding yourself as an attendee
- **Flexible duration** - 15m, 30m, 45m, 1h, or 1.5h meeting slots
- **Date range options** - Today, This week, Fortnight, or Month
- **Side panel UI** - stays open while you browse, no popup closing on you

## Setup

SlotSync requires a Google OAuth Client ID to authenticate with the Google Calendar and People APIs.

### 1. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable the following APIs:
   - Google Calendar API
   - Google People API

### 2. Create OAuth credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Choose **Chrome Extension** as the application type
4. Enter your extension ID (found at `chrome://extensions` after loading it)
5. Copy the generated Client ID

### 3. Add your Client ID

Open `background.js` and replace the placeholder:

```js
const CLIENT_ID = 'YOUR_GOOGLE_OAUTH_CLIENT_ID';
```

### 4. Configure the domain for autocomplete (optional)

In `sidepanel.js`, the contacts autocomplete searches your Google directory. You can update the domain used for email prefix searching:

```js
fetch(`${base}?query=${encodeURIComponent(query + '@yourdomain.com')}${params}`, { headers }),
```

Replace `yourdomain.com` with your organisation's domain to improve autocomplete results.

### 5. Load the extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `slotsync` folder

## Permissions

| Permission | Reason |
|---|---|
| `identity` | Handles Google OAuth sign-in flow |
| `storage` | Saves Zoom URLs, settings, and auth token locally |
| `sidePanel` | Displays the extension in Chrome's side panel |

### Google API scopes

| Scope | Reason |
|---|---|
| `calendar.readonly` | Reads calendar data to check availability |
| `calendar.events` | Creates calendar events and sends invites |
| `calendar.freebusy` | Queries free/busy status for multiple attendees |
| `contacts.readonly` | Searches your Google contacts for autocomplete |
| `directory.readonly` | Searches your organisation's directory for autocomplete |

## File Structure

```
slotsync/
  manifest.json     Extension config and permissions
  background.js     Service worker - OAuth flow and token management
  sidepanel.html    Side panel UI and styles
  sidepanel.js      Main logic - availability checking, scheduling, settings
  icons/            Extension icons (16px, 48px, 128px)
```

## Licence

MIT
