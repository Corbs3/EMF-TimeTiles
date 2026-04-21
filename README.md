# TimeTiles

A Chrome extension that shows the current time across your company's global offices at a glance, with a built-in time zone converter.

Available as both a popup and a side panel.

## Features

- **Office tiles** - live clocks for each configured office, updating every 30 seconds
- **"You are here" badge** - detects your location and highlights the nearest office
- **"Nearest office" badge** - shows which office is closest when you're not at one
- **Your location tile** - adds a tile for your detected location if you're not near any office
- **UTC offset labels** - shows the time difference between your location and each office
- **Office converter** - convert a time from one office to all others
- **Saved locations** - add and save any city in the world as a personal tile
- **World converter** - convert any time between any two cities, with 80+ cities built in
- **Geolocation support** - uses your browser location for accurate nearest-office detection, with timezone fallback if denied
- **Side panel mode** - open as a persistent side panel while browsing

## Customising Your Offices

The office list is defined at the top of both `popup.js` and `sidepanel.js`:

```js
const OFFICES = [
  {
    key:      'uk',
    label:    'United Kingdom',
    flag:     '🇬🇧',
    tz:       'Europe/London',
    offices:  'London, EC2A',
    lat: 51.5, lng: -0.09,
  },
  // Add more offices here...
];
```

To customise for your own company, update the `label`, `offices`, `tz`, `lat`, and `lng` fields for each location. Timezone strings follow the [IANA tz database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

## Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `timetiles` folder

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Saves your custom saved locations locally |
| `sidePanel` | Enables the side panel view |
| `geolocation` | Detects your location to highlight the nearest office and show your location tile |

## File Structure

```
timetiles/
  manifest.json     Extension config and permissions
  background.js     Service worker - opens side panel on icon click
  popup.html        Popup UI - compact two-column tile grid
  popup.js          Popup logic - tiles, office converter
  sidepanel.html    Side panel UI - full-featured layout
  sidepanel.js      Side panel logic - tiles, converters, saved locations, world converter
  icons/            Extension icons (16px, 48px, 128px)
```

## Licence

MIT
