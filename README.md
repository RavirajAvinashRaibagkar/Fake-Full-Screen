# Fake Fullscreen

> A lightweight Chrome extension (Manifest V3) that makes a web page believe it is running in fullscreen, while your browser stays in normal windowed mode.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2020-yellow)
![Chrome](https://img.shields.io/badge/Chrome-111%2B-green)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

---

## Overview

Some web apps (video players, dashboards, kiosk-style tools, web games) insist on real fullscreen and show a blocking prompt or pause when it is not active. **Fake Fullscreen** spoofs the browser's Fullscreen API *inside the page* so those apps behave as if fullscreen is on, without taking over your screen.

It is useful for:

- Testing how your **own** web app reacts to fullscreen enter/exit events
- Working with fullscreen-only tools while keeping other windows visible
- Learning how the Fullscreen API, content-script worlds, and MV3 messaging work

---

## Features

- **One-click toggle** from the toolbar icon
- **Keyboard shortcut**: `Ctrl + Shift + F` (`Cmd + Shift + F` on macOS)
- **Per-site memory**: enable once for a site and it stays on for that hostname
- **Green `ON` badge** on the toolbar icon so you always know the state
- **Full API coverage**: `requestFullscreen`, `exitFullscreen`, `fullscreenElement`, `fullscreenEnabled`, `document.fullscreen`, `webkit*` variants, and `fullscreenchange` events
- **Window metrics spoofing** (`innerWidth/Height`, `outerWidth/Height`, `screenX/Y`) with a single on/off switch in code
- **`(display-mode: fullscreen)`** media query support
- **Works inside iframes** and survives page reloads
- **Minimal permissions**: only `storage` and `activeTab`

---

## How It Works

```
 Toolbar click / Ctrl+Shift+F
            │
            ▼
   service_worker.js      → toggles the current hostname in chrome.storage.local
            │
            ▼  (storage change event)
       bridge.js          → content script (isolated world); reads storage,
            │               sends ON/OFF to the page via a CustomEvent
            ▼
        spoof.js          → content script (MAIN world, document_start);
                            patches the Fullscreen API inside the page
```

1. **`service_worker.js`** flips the hostname in `chrome.storage.local` and updates the toolbar badge.
2. **`bridge.js`** runs in Chrome's isolated world, listens for storage changes, and tells the page script to turn on or off.
3. **`spoof.js`** runs in the page's own JavaScript world at `document_start`, so it is in place before the site's scripts run. It overrides the Fullscreen API getters and methods, fires `fullscreenchange`, and keeps patched functions looking native.

Running the spoof in the `MAIN` world (instead of injecting an inline `<script>`) avoids Content-Security-Policy blocks.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Platform | Google Chrome Extension, **Manifest V3** |
| Language | **JavaScript (ES2020)**, no frameworks or build step |
| Background logic | MV3 **Service Worker** |
| Page integration | **Content Scripts** (isolated world + `MAIN` world) |
| Browser APIs | `chrome.storage`, `chrome.action`, `chrome.commands`, `chrome.runtime` messaging |
| Web APIs spoofed | Fullscreen API, `matchMedia`, `window` size properties |
| Communication | `CustomEvent` between isolated world and page world |

---

## Project Structure

```
fake-fullscreen/
├── manifest.json        # Extension config (MV3, permissions, content scripts, shortcut)
├── service_worker.js    # Toolbar click / shortcut handler, per-site toggle, badge
├── bridge.js            # Isolated-world content script, syncs storage state to the page
├── spoof.js             # MAIN-world script that spoofs the Fullscreen API
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Installation (Developer Mode)

1. **Clone or download** this repository.
   ```bash
   git clone https://github.com/RavirajRaibagkar/fake-fullscreen.git
   ```
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Pin the extension to your toolbar (optional).

> Requires **Chrome 111 or newer** (needed for `"world": "MAIN"` content scripts).

---

## Usage

1. Open the website you want to use it on.
2. Click the extension icon or press **`Ctrl + Shift + F`**.
3. The badge shows **ON** and the page now sees fullscreen as active.
4. **Reload the page once** after the first toggle if the site checks fullscreen at load time.
5. Toggle again to turn it off for that site.

---

## Configuration

In `spoof.js`:

```js
// Report screen-sized window.innerWidth/innerHeight/outerWidth/outerHeight while "fullscreen".
// Set to false if a site's layout breaks because it sizes its UI from innerHeight.
const SPOOF_WINDOW_SIZE = true;
```

To change the shortcut, go to `chrome://extensions/shortcuts`.

---

## Limitations

- Sites that verify fullscreen on the server side or with other signals cannot be fooled by client-side spoofing.
- Layout can differ from real fullscreen because the actual window size does not change.
- The spoof is applied after storage loads, so a site that checks the very instant it loads may need a page reload.
- Chrome and Chromium-based browsers only.

---

## Responsible Use

This extension changes what a web page can detect about *your own browser*. Use it only on your own projects, testing environments, and sites where it is allowed.

**Do not use it to get around exam, assessment, or proctoring rules.** Doing so can violate platform terms and academic or institutional policies, and you are responsible for following the rules of any site you use.

---

## Contributing

Issues and pull requests are welcome. Please keep changes small and focused, and describe how you tested them.

---

## Author

**Raviraj**
Computer Engineering student, VIT Pune
GitHub: [@RavirajRaibagkar](https://github.com/RavirajRaibagkar)
