# Project: 英文單字閃卡應用程式

## Overview

英文單字閃卡 is a Google Apps Script + Google Sheets flashcard app for zh-TW learners: auto-carousel flashcards, EN/JA/ZH TTS, SRS, quizzes, listening practice, difficulty marking, filters, word export, and a dedicated 200-card mixed grammar-transformation worksheet with a configurable 5%-default review quota. The frontend targets modern Baseline Widely available browser features.

## Architecture

| Layer | Technology |
|-------|------------|
| Backend | Google Apps Script (`code.gs`, `grammarFlashcards.gs`); ES6 allowed; every function try-catch wrapped |
| Frontend | Modern JavaScript; prototype-based OOP — all methods on `FlashcardApp.prototype`; 100+ state properties initialised via 7 sub-init fns (`_initCoreState`, `_initVoiceState`, `_initSettingsState`, `_initFilterState`, `_initScreenAwakeState`, `_initQuizState`, `_initKKPhoneticState`) |
| Markup / CSS | HTML5 via GAS HTML Service templates (`<?!= include(); ?>`); CSS modules use native variables, Grid, and Flexbox |
| Voice | Web Speech API (EN/JA/ZH) |
| Data | Google Sheets via `SpreadsheetApp`; frontend calls backend via `google.script.run.withSuccessHandler()` |
| Persistence | LocalStorage for user preferences |

### Startup and word-load flows

- `new FlashcardApp()` (6 sub-inits) → `init()`: `loadSettings()` + `loadSheetSettings()` + `loadSrsData()` → `setupEventListeners()` (core / menu / modal / keyboard / swipe / progress); saved sheet → `loadWords(true)`, otherwise `openSheetSettings()`
- **Initial load:** `loadWordsProgressively()` → effective sheet list (always includes the dedicated grammar worksheet) → parallel `getWordsFromSingleSheet()` per sheet (progress bar) → `finishProgressiveLoading()` (reassign ids → duplicate auto-handle → notification) → `handleLoadingComplete()` → `startNewRound()`
- **Reload:** `getWordsFromSheetsWithDuplicateDetection()` (backend auto-handles duplicates; see `duplicate-handling/spec.md`) → notification / duplicate modal / proceed

## File Structure

- `code.gs` — backend; `grammarFlashcards.gs` — generated 200-card grammar worksheet seeder; `index.html` — main HTML (all modals)
- CSS: `style-base` · `style-flashcard` · `style-modal` · `style-sheets` · `style-quiz` (`.html`)
- JS: `script-runtime` (production logging controls) · `vendor-compromise` (grammar tagger) · `script-core` (`APP_CONSTANTS`, constructor, init, settings, word load) · `script-grammar` (verb role annotation) · `script-events` · `script-settings-modal` · `script-difficulty` · `script-display` · `script-progress-bar` · `script-voice` · `script-export` · `script-sheets` · `script-duplicates` · `script-filter` · `script-kk-phonetic` · `script-edit-word` · `script-search-word` · `script-srs` · `script-screen-awake` · `script-quiz` · `script-listening` · `script-bootstrap`
- Tooling: `appsscript.json` · `.clasp.json` · `.claspignore` · `package.json` · `jest.config.js` · `deploy.sh` · `clasp-node-ca.sh` · `deploy.local.sh.example` · `scripts/run-clasp.sh`
- Grammar data: `data/grammar-transformation-cards.json` (canonical 200 cards) · `scripts/generate-grammar-transformation-cards.mjs` (reproducible mixed-card generator) · `scripts/build-grammar-transformation-seed.mjs` (validation + `grammarFlashcards.gs` generator)
- Tests: `test/environment.js` (caches script content) · `test/setup-env.js` · `test/setup.js` (DOM mocks, `google.script.run` + `speechSynthesis` mocks, `createApp()`) · `test/*.test.js`

## Deployment (clasp)

`bash deploy.sh setup|push|pull|open|web` · `npm run push` · `npm run push:watch` · `npm run deploy` (push + open Web App). SSL-inspected corporate networks: copy `deploy.local.sh.example` → `deploy.local.sh` and set `NODE_EXTRA_CA_CERTS` or `FLASHCARD_CA_BUNDLE` (or drop a `.node-extra-ca.pem` in the project root).

## Browser Support (frontend)

The frontend targets Baseline Widely available browser features. Modern JavaScript syntax and native CSS/HTML APIs are allowed; no ES5 transpilation or compatibility polyfill layer is required.

- Prefer native Grid/Flexbox, CSS variables, forms, and keyboard events over legacy workarounds.
- Feature-detect APIs with narrower support and degrade gracefully rather than restoring broad legacy-browser support.
- Consult the `modern-web-guidance` skill for client-side HTML/CSS/JavaScript changes.

## Error Handling & Performance

- Word-load failure → `getDemoWords()` fallback; network error → error screen with reload button; voice failure never blocks flashcards
- Image preload: current + next 10 words; export batches of 15 (`EXPORT_BATCH_SIZE`); voice playback queued; `_setDisplayTimer`/`_clearDisplayTimer` run main-thread + Web Worker timers in parallel — first to fire runs the callback and cancels the other

## Default Configuration (source of truth — specs reference this table)

| Setting | Default |
|---------|---------|
| Delay time / font size / font family | 4.5 s / 96 px / system default |
| Display mode | `english-first` |
| `mustSpellChineseFirst` (mixed mode) | `true` |
| Delayed speech | off |
| EN/JA voice / voice speed | on / 0.8 |
| Letter spell-out / scope | off / `all` (所有單字) |
| Chinese voice / locales (zh / en / ja) | off / zh-TW · en-US · ja-JP |
| Sheet history limit / quick quiz questions | 10 / 10 |
| Export batch size / Keep-Alive interval / review-date sync threshold | 15 / 30 s / every 20 reviewed words |
| Review-time filter / difficulty filter / must-spell filter | all / 0 (only −999 words hidden by default) / off |
| Type filter / tag filter | all (word/phrase/sentence) / empty |
| Timer progress bar / offset | on (`showTimerProgressBar: true`) / 0 px |
| Smart timer / carousel memory mode | off (`smartTimerEnabled: false`) / off (`carouselMemoryMode: false`) |
| KK phonetic | **on** (`showKKPhonetic: true`) |
| Grammar role annotation | **on** (`grammarAnnotationEnabled: true`) |
| Grammar transformation worksheet | `文法句型轉換` in `WordGo Data Sheet` · 200 cards (50 per direction; 25 per BE / Do-Does subtype) |
| Grammar-review ratio | **5%** (`grammarReviewRatio: 5`) |
| Forced-review ratio | **10%** (`forcedReviewRatio: 10`) |
