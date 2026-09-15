## Project Overview

English Vocabulary Flashcard (英文單字閃卡) is a Google Apps Script web application that uses Google Sheets as a data source for English-Chinese word flashcards. It runs as a Google Web App, targeting iPad 4 (iOS 10 and below) users learning English vocabulary. Features include auto-carousel flashcards, TTS (EN/JA/ZH), SRS spaced repetition, quiz modes, listening practice, filters, and word export.

## Deployment

This project uses **clasp** (Command Line Apps Script Projects). All code is pushed to Google's servers — there is no local server.

| Command | Description |
|---------|-------------|
| `npm run setup` | First-time setup: install clasp, login, link Script ID |
| `npm run push` | Push code to Google Apps Script |
| `npm run pull` | Pull code from GAS (overwrites local) |
| `npm run open` | Open Apps Script editor in browser |
| `npm run open:web` | Open Web App in browser |
| `npm test` | Run all Jest tests |
| `npx jest <test_file>` | Run a single test file (e.g., `npx jest test/voice.test.js`) |

For corporate networks with SSL inspection, see the `deploy.sh` comments for CA configuration (`NODE_EXTRA_CA_CERTS` or `FLASHCARD_CA_BUNDLE`).

## Architecture

**Pattern:** Frontend-backend split via Google Apps Script HTML Service. Backend is `code.gs`; frontend is 14+ `.html` modules included via `<?!= include(); ?>` in `index.html`.

**Frontend JS Pattern:**
- All methods mounted on `FlashcardApp.prototype` (prototype-based OOP, single constructor)
- 100+ instance properties split across 6 sub-init functions
- State stored as properties on the `FlashcardApp` instance
- `APP_CONSTANTS` in `script-core.html` centralizes all magic numbers, timeouts, SRS intervals, quiz settings, localStorage keys, etc.

**Backend:** `code.gs` runs ES6+ on Google servers. All functions wrapped in try-catch. Frontend calls via `google.script.run.withSuccessHandler()`.

## Critical Constraint: ES5 Frontend

All frontend `.html` files must be **ES5-compatible** (iPad 4 / iOS 10):
- **Forbidden:** `let`, `const`, arrow functions, template literals, destructuring, spread operator, `Promise`, `async/await`, `class` syntax
- **Required:** `var`, `function`, string concatenation, `for` loops
- Polyfills for `Array.prototype.forEach/filter/map/find/includes` are in `script-polyfills.html`

Backend (`code.gs`) may use ES6+.

## Spec-Driven Development (OpenSpec)

Current deployed behavior is documented in `openspec/specs/<capability>/spec.md`. When modifying code, **update the corresponding spec** to keep it in sync. Specs use RFC 2119 keywords (SHALL, SHOULD, MAY). See `openspec/AGENTS.md` for the capability index and conventions.

## Versioning

Each code change should update:
- `APP_CONSTANTS.APP_VERSION` and `APP_CONSTANTS.APP_BUILD_TIME` in `script-core.html`
- Corresponding `openspec/specs/` spec file(s) if behavior or docs changed

## Test Setup

Tests use Jest + jsdom with a custom environment (`test/environment.js`) that caches ~400KB of script content to avoid repeated file I/O. `test/setup.js` creates mock DOM elements, mocks `google.script.run` and `speechSynthesis`, loads all script files by stripping `<script>` tags, and provides a `createApp()` helper.
