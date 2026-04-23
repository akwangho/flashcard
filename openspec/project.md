# Project: 英文單字閃卡應用程式

## Overview

英文單字閃卡 (English Vocabulary Flashcard) 是一個以 Google Apps Script 為後端、Google Sheets 為資料來源的英文單字學習閃卡應用程式。使用者可從 Google 試算表載入英文-中文單字對，透過自動輪播閃卡學習英文單字，並支援語音朗讀、測驗模式、不熟單字標記、SRS 間隔重複等豐富功能。

**Target users:** 學習英文單字的中文母語使用者（主要為台灣繁體中文）；使用平板裝置（尤其是 iPad）的學生。

**Core value proposition:**
- 自動輪播閃卡，無需手動操作即可持續學習
- 整合 Google Sheets 作為單字資料庫，方便管理和共享
- 多語言語音朗讀（英文、日文、中文）
- 測驗系統驗證學習成效
- 完整的 iPad 4（iOS 10 及以下）相容性

---

## Architecture

**Pattern:** 前後端分離的 Google Apps Script 應用程式

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Google Apps Script | Server-side JS; ES6 allowed |
| Frontend framework | Native JavaScript (ES5) | Prototype-based OOP (`FlashcardApp`) |
| Markup | HTML5 | GAS HTML Service template system |
| Styles | CSS3 | CSS variables with hard-coded fallbacks |
| Voice | Web Speech API (SpeechSynthesis) | EN/JA/ZH |
| Data | Google Sheets API | Via `SpreadsheetApp` |
| Local persistence | LocalStorage | User preferences |

### Frontend Design Patterns

- **Single constructor:** All methods mounted on `FlashcardApp.prototype`
- **Module split:** Frontend code in 14+ HTML module files, included via `<?!= include('filename'); ?>` in `index.html`
- **Global constants:** `APP_CONSTANTS` in `script-core.html` centralises all magic numbers (timeouts, SRS intervals, quiz settings, export settings, localStorage keys, etc.)
- **Constructor sub-init:** 100+ properties split into 6 sub-functions: `_initCoreState`, `_initVoiceState`, `_initSettingsState`, `_initFilterState`, `_initScreenAwakeState`, `_initQuizState`
- **Lifecycle:** Constructor → `init()` → load settings → load words → start carousel
- **State management:** All state stored as properties on the `FlashcardApp` instance

### App Startup Sequence

```
1. HTML load complete
2. new FlashcardApp() → 6 sub-init functions
3. FlashcardApp.init():
   a. loadSettings()        — LocalStorage general + voice settings
   b. loadSheetSettings()   — LocalStorage spreadsheet settings
   c. detectLegacyBrowser()
   d. setupEventListeners() — core / menu / modal (7 sub-fns) / keyboard / swipe / progress
   e. Has saved Sheet?
      YES → loadWords() → handleLoadingComplete() → startNewRound()
      NO  → handleLoadingComplete(false, true) → openSheetSettings()
```

### Word Load Flows

**Initial load (progressive + real progress bar):**
```
loadWords(isInitialLoad=true)
→ loadWordsProgressively()
→ parallel getWordsFromSingleSheet() per sheet
→ update progress bar per completion
→ finishProgressiveLoading()
  → reassign unique IDs
  → client-side detectAndHandleDuplicatesInMemory() (ES5)
  → auto-handle duplicates + show notification
→ handleLoadingComplete() → startNewRound()
```

**Non-initial reload (from settings):**
```
loadWords(isInitialLoad=false)
→ google.script.run.getWordsFromSheetsWithDuplicateDetection()
→ backend: getWordsFromSheets + detectDuplicateWords + auto-handle
→ frontend: show notification / showDuplicateModal / proceed
→ show flashcard main view
```

---

## File Structure

```
flashcard/
├── code.gs                      # GAS backend (COL/COL_NUM column constants)
├── index.html                   # Main HTML structure (all modals)
│
│   # CSS modules (split from style.html)
├── style-base.html              # CSS vars, iPad 4 fallback, reset, base components, RWD, animations
├── style-flashcard.html         # Flashcard display, restore button, progress/controls, menus, difficulty, pause/mute
├── style-modal.html             # Modal frames, form inputs, edit-word modal, tooltips
├── style-sheets.html            # Export progress, Google Sheet components, history list, duplicates, notifications
├── style-quiz.html              # Quiz components, review-filter modal
│
│   # Frontend JS modules
├── script-polyfills.html        # ES5 polyfills (forEach, filter, map, find, includes)
├── script-core.html             # APP_CONSTANTS, utilities, shared helpers, constructor, init, settings, word load
├── script-events.html           # Event listeners, speech enable, displayCurrentWord (+ 3 sub-fns), menu, fullscreen
├── script-settings-modal.html   # Settings modal open/close/save/reset, quick-mode toggle, Sheet settings UI, slider enhance
├── script-difficulty.html       # Difficulty increment/decrement/sync, UI render, smart timer delay, display order
├── script-display.html          # Pause/resume timer, word click/delete, translation display, navigation (next/prev), notifications, image preload
├── script-progress-bar.html     # Timer progress bar animation (start/pause/resume/reset)
├── script-voice.html            # TTS (EN/JA/ZH), letter spell-out, voice wait mechanism, voice settings UI
├── script-export.html           # Export (batch export, overwrite handling)
├── script-sheets.html           # Google Sheet load, validate, sheet selection
├── script-duplicates.html       # Duplicate detection and handling
├── script-filter.html           # Review time filter, difficulty filter, must-spell filter
├── script-edit-word.html        # Edit word modal (open, close, save, image preview)
├── script-search-word.html      # Word search (substring/B-col exact match, sheet/row, open edit)
├── script-srs.html              # SRS Leitner Box (due check, quick-review UI)
├── script-screen-awake.html     # Keep screen awake (Wake Lock, NoSleep Video, silent audio, Keep-Alive)
├── script-quiz.html             # Quiz system (question gen, answer flow, scoring)
├── script-listening.html        # Listening practice (hear-and-identify / hear-and-spell)
├── script-bootstrap.html        # Global init (window.onload, FlashcardApp instantiation, cleanup)
│
│   # Deployment & tooling
├── appsscript.json              # GAS project manifest (for clasp)
├── .clasp.json                  # clasp project config (Script ID)
├── .claspignore                 # Files excluded from clasp push
├── package.json                 # npm scripts (deploy + Jest tests)
├── jest.config.js               # Jest unit test config
├── deploy.sh                    # Deploy script (setup / push / pull)
├── clasp-node-ca.sh             # Source to set NODE_EXTRA_CA_CERTS for clasp/npm
├── deploy.local.sh.example      # Copy to deploy.local.sh to set local CA bundle (not committed)
├── scripts/run-clasp.sh         # Load CA then run clasp (used by npm scripts)
│
│   # Tests
├── test/environment.js          # Custom Jest env (cache ~400KB script content, reduce I/O)
├── test/setup-env.js            # Jest setupFilesAfterEnv (auto-run bootstrapApp)
├── test/setup.js                # Test env init (DOM mock, mocks, createApp helper)
└── test/*.test.js               # 813 test cases covering all major modules
```

---

## Deployment

Uses Google's official CLI tool **clasp** (Command Line Apps Script Projects).

### Commands

| Command | Description |
|---------|-------------|
| `bash deploy.sh setup` | First-time setup: install clasp → login → enter Script ID |
| `bash deploy.sh push` | Push code to Google Apps Script |
| `bash deploy.sh pull` | Pull code from GAS (overwrites local) |
| `bash deploy.sh open` | Open Apps Script editor in browser |
| `bash deploy.sh web`  | Open Web App in browser |
| `npm run push`         | Push code (via scripts/run-clasp.sh) |
| `npm run push:watch`   | Watch for changes and auto-push |
| `npm run deploy`       | Push and open Web App |

### Corporate Network / SSL (npm & clasp)

If you encounter `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` or `self-signed certificate in certificate chain`:

1. Copy `deploy.local.sh.example` → `deploy.local.sh` (gitignored)
2. Set one of:
   - `export NODE_EXTRA_CA_CERTS=/path/to/company_CA_chain.pem`
   - `export FLASHCARD_CA_BUNDLE=/path/to/company_CA_chain.pem`
   - Or place `.node-extra-ca.pem` in the project root
3. `deploy.sh` sources `clasp-node-ca.sh`; npm scripts use `scripts/run-clasp.sh`

---

## ES5 Compatibility Requirements (Critical)

All frontend code must run on iPad 4 (iOS 10 and below).

**Forbidden:**
- `let`, `const`, arrow functions, template literals, destructuring, spread operator, `Promise`, `async/await`, `class` syntax

**Required:**
- `var`, `function` declarations, string concatenation, `for` loops
- Polyfills: `Array.prototype.forEach`, `.filter`, `.map`, `.find`, `.includes`

**CSS:**
- Every `var(--property)` usage must have a hard-coded fallback value in the same or parent selector

**Touch events:**
- Use `touchstart`/`touchmove`/`touchend`; use `cancelBubble` as fallback for `stopPropagation`

---

## Testing

- **Framework:** Jest + jsdom
- **Run:** `npx jest` (813 test cases)
- **Custom env:** `test/environment.js` caches ~400KB script content to reduce repeated file I/O
- **Coverage areas:** voice wait, navigation, difficulty, pause/resume, SRS, sheet history, sheet load/validate/select, export batch/progress/overwrite, quiz answer flow, duplicate modal, smart timer, confirm/cancel removal, progress bar animation, edit-word save validation, image preload, review date recording, load progress, modal background click, reset settings, etc.

---

## Backend Constraints (Google Apps Script)

- Frontend calls backend via `google.script.run` (async)
- Use `.withSuccessHandler()` and `.withFailureHandler()` for callbacks
- HTML Service uses `HtmlService.createTemplateFromFile()` and `<?!= include() ?>` to include sub-files
- Backend ES6 syntax (`const`, `let`, arrow functions) is allowed (runs on Google servers)
- All backend functions are wrapped in try-catch

---

## Error Handling Strategy

- Word load failure → automatically fall back to `getDemoWords()` demo data
- All backend functions have try-catch wrappers
- Voice failure does not affect core flashcard functionality
- Network error → show error screen with reload button

---

## Performance Notes

- Image batch preload: current + next 10 words (`preloadUpcomingImages`)
- Batch export: avoids processing large data sets all at once (15 words/batch)
- Voice playback uses a queue to prevent overlap
- Timer management: `_setDisplayTimer` / `_clearDisplayTimer` sets both main-thread and Web Worker `setTimeout` simultaneously; whichever fires first runs the callback and cancels the other

---

## Default Configuration Values

| Setting | Default |
|---------|---------|
| Delay time | 4.5 s |
| Font size | 96 px |
| Font family | System default |
| Display mode | English first (`english-first`) |
| Must-spell force Chinese first (mixed mode) | Enabled (`mustSpellChineseFirst: true`) |
| Delayed speech | Disabled |
| EN/JA voice | Enabled |
| Voice speed | 0.8 |
| Letter spell-out | Disabled |
| Chinese voice | Disabled |
| Chinese voice locale | zh-TW |
| English voice locale | en-US |
| Japanese voice locale | ja-JP |
| Sheet history limit | 10 entries |
| Quick quiz questions | 10 |
| Export batch size | 15 (`APP_CONSTANTS.EXPORT_BATCH_SIZE`) |
| Keep-Alive interval | 30 s |
| Review date sync threshold | Every 20 reviewed words |
| Review time filter default | All (no filter) |
| Difficulty filter default | 0 (all; only -999 words excluded by default) |
| Timer progress bar | Enabled (`showTimerProgressBar: true`) |
| Timer progress bar offset | 0 px |
| Smart timer | Disabled (`smartTimerEnabled: false`) |
| Carousel memory mode | Disabled (`carouselMemoryMode: false`) |
| Must-spell filter default | false (no filter) |
| Type filter default | All (word / phrase / sentence) |
| Tag filter default | Empty (no filter) |
