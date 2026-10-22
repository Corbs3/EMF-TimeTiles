# TimeTiles

A cheerful Chrome side panel that shows the time in every office at a glance, converts any time between any two places, and copies the result ready for Slack.

Built for the Ellen MacArthur Foundation's internal Chrome Web Store.

## Features

- **Live office rows**: United Kingdom, Brussels, Brazil, New York and Beijing
- **You are here**: your row comes first, based on your computer's time zone (no location permission)
- **Working hours labels**: In hours (09:00 to 17:30), Out of hours, or Weekend
- **Night rows** turn navy before 07:00 and after 20:00
- **Two-way converter**: type a time in either box, for any city, and the other updates. Swap with ⇅
- **Across EMF bubbles**: see the converted time for every office and your places
- **Copy for Slack**: copies something like `🕒 14:00 United Kingdom / 15:00 Brussels / 09:00 New York`
- **My places**: save up to 6 cities
- **12h / 24h** toggle

## Install (for testing)

1. Download or clone this repository
2. Open `chrome://extensions` and turn on **Developer mode**
3. Click **Load unpacked** and select this folder
4. Pin TimeTiles and click the icon to open the side panel

## Changing the offices or hours

Edit the top of `panel.js`:

- `OFFICES`: name, two-letter code, IANA time zone and row colour
- `WORK_START` / `WORK_END`: working hours in minutes from midnight

## Files

| File | What it does |
|---|---|
| `manifest.json` | Extension settings (Manifest V3) |
| `background.js` | Opens the side panel when the icon is clicked |
| `panel.html` / `panel.css` / `panel.js` | The side panel |
| `icons/` | Toolbar and store icons |

## Changelog

**2.0.0**
- New "Bubble Pop" design
- Two-way converter for any time and any city, with swap
- Copy for Slack, 12h / 24h toggle, working hours labels
- Merged the office and world converters into one
- Removed the location permission; uses your time zone instead
- New York shown as a city (office closed)

## Licence

MIT. See `LICENSE`.
