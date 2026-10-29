# Stickman Extension

Chrome extension (Manifest V3) — a stickman platformer that runs on any webpage.

## Structure

```
stickman-extension/
  manifest.json    — MV3 extension entrypoint
  content.js       — Game engine injected into all pages (class-based)
  background.js    — Service worker: listens for Ctrl+Shift+S keyboard shortcut
  popup.html        — Popup UI for toggling the game
  popup.js          — Popup ↔ content script messaging
temp.js            — Same game as a bookmarklet (IIFE, not part of extension). Gitignored.
```

## Dev workflow

- No build system, no package.json, no tests, no linter.
- Load `stickman-extension/` as an **unpacked extension** in Chrome (chrome://extensions → Load unpacked).
- Ctrl+Shift+S or popup button toggles the game.

## Key facts

- **content.js** injects a `<canvas>` into every page (`document_end`). It communicates with the extension via `chrome.runtime.onMessage` (toggle/getState).
- **temp.js** is the same game logic as a standalone bookmarklet — not loaded by the extension. Edited independently. Keep in sync with `content.js` manually if game logic changes.
- `popup.js` queries the active tab to sync button/status state; it does not control the game directly.
- All game state lives in `window.__stickman_ext__` (API object) and `window.__stickman_anim__` (destroy handle).
- Canvas is `position:fixed;pointer-events:none;z-index:999999` — invisible to page interaction.
