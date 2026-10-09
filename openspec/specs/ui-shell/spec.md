# UI Shell Specification

## Purpose

Application shell: loading screen, dark theme, fullscreen, image display, modal system, menu, quick-settings presets, active-filter indicator, toasts, and word search.

## Requirements

### Requirement: Loading Screen

The system SHALL show a loading screen during startup and word reload.

#### Scenario: Content

- **WHEN** the loading screen appears
- **THEN** it shows the last-viewed word from localStorage (`flashcard-last-word`; fallback "Ready / 準備好的；有準備的"), a progress bar (indeterminate → determinate "loading sheet N of M" → completion), and small grey version + build date/time text

### Requirement: Visual Theme and Responsive Layout

The system SHALL use a dark theme with CSS variables and hard-coded fallbacks: `--primary-color` #FFFF00, `--bg-color` #000000, `--text-color` #FFFFFF, `--gray-color` #888888, `--success-color` #00FF00, `--error-color` #FF6B6B, `--warning-color` #FFA500. The viewport uses `user-scalable=no` and `maximum-scale=1.0`, with sufficiently large touch targets on touch devices.

#### Scenario: Palette and viewport

- **WHEN** the UI renders on a touch device
- **THEN** the variables above apply (yellow primary text on black, white general text) with legacy fallbacks, and interactive buttons keep large tap targets

### Requirement: Fullscreen Mode

#### Scenario: Toggle and iOS fallback

- **WHEN** the user presses F or the menu button
- **THEN** fullscreen toggles via the vendor-prefixed APIs (`requestFullscreen`/`webkit…`/`moz…`/`ms…`) and the label switches to Exit fullscreen
- **WHEN** on iOS (no fullscreen API)
- **THEN** an "Add to Home Screen" hint shows — or an already-standalone message when `navigator.standalone`

### Requirement: Image Display

The system SHALL show a word's image (when it has a URL) as the card background when the translation appears in phase 2, scaled `contain` (no cropping), with a semi-transparent black text backdrop for legibility.

#### Scenario: Preloading

- **WHEN** a word is displayed
- **THEN** images for the current + next 10 words are preloaded (`preloadUpcomingImages`): in-progress loads keep their image-object reference until done (WebKit cancels GC'd downloads), duplicate in-flight URLs are deduplicated, successful URLs are remembered for the session, and failed URLs are retried when they re-enter the window

### Requirement: Modal System

The system SHALL present secondary interfaces as modals: opening any modal pauses the carousel, closing resumes it unless it was already paused, and backdrop click closes. Confirmations use a custom HTML dialog (title, message with line breaks, optional warning, custom button labels) instead of native `confirm()` so fullscreen is not exited.

#### Scenario: Modal IDs

- Element IDs: `sheet-settings-modal`, `settings-modal`, `voice-settings-modal`, `export-modal`, `overwrite-confirm-modal`, `duplicate-words-modal`, `quiz-modal`, `edit-word-modal`, `difficulty-filter-modal`, `review-filter-modal`, `srs-review-modal`, `custom-confirm-modal`, `type-filter-modal`, `tag-filter-modal`

### Requirement: Menu System

#### Scenario: Structure and behaviour

- **WHEN** the user opens the ▼ menu
- **THEN** the items are: **◂ 篩選** (⭐ Difficulty, 📅 Review time, ✍️ Must-spell, 📝 Type, 🏷️ Tags) · 📖 Quick review (due-badge count) · **◂ 測驗** (🎯 Quick quiz 10 Q, 📝 Full quiz) · ✏️ Edit current word · 🔍 Search words · 📤 Export words · 🔄 Reload words · **◂ 快速設定** (presets) · 📋 Sheet settings · **◂ 設定** (🔊 Voice, ⚙️ General) · 📺 Fullscreen
- **AND** flyout submenus open on the left (one at a time); menu open pauses the carousel, close resumes it (unless already paused) and hides the whole toolbar until the cursor/tap re-enters the toolbar zone; a too-tall menu scrolls vertically (`max-height: 70vh`, never horizontally)

### Requirement: Quick Settings Presets

The system SHALL apply one-click preset learning modes — applied immediately, saved to localStorage, menu closes, multi-line toast, current word re-displayed with reset timer; leaving carousel-memory mode auto-disables `carouselMemoryMode`:

| Preset | Applied settings |
|--------|------------------|
| 🎧 用聽的背單字 | `chinese-first`, `spellOutLetters=true` scope `all`, `chineseEnabled=true`, `delayTime=9`, smart timer + progress bar |
| 👂 用聽的認識單字 | `english-first`, spell-out off, `chineseEnabled=true`, `delayTime=4.5`, smart timer, no delayed speech |
| 📝 日常複習 | `mixed`, delayed speech, `spellOutLetters=true` scope `must-spell-all`, `chineseEnabled=false`, `delayTime=10`, smart timer + progress bar |
| 🎧 聽力訓練 | `listeningMode=true`, spell-out off, `chineseEnabled=false`, smart timer |
| 🔄 輪播記憶 | `carouselMemoryMode=true`, `english-first`, spell-out off, `chineseEnabled=false`, `delayTime=5`, no smart timer, no progress bar, no delayed speech |

#### Scenario: Apply a preset

- **WHEN** the user picks a preset from the 快速設定 flyout
- **THEN** its settings apply immediately, save to localStorage, the menu closes with a multi-line toast, and the current word re-displays with a reset timer

### Requirement: Active Filters Indicator

#### Scenario: Display and clear

- **WHEN** filters are active
- **THEN** a condensed summary shows above the progress area, e.g. `篩選: ⭐ ★5+ | 📅 >2週 | ✍️ 要會拼 | 📖 快速複習 (42個)`
- **WHEN** the user clicks ✕ 清除
- **THEN** all filters clear, including exiting SRS review mode

### Requirement: Toast Notifications

#### Scenario: Display

- **WHEN** a notification fires
- **THEN** a centred semi-transparent rounded toast appears, auto-dismisses after 3 s with fade-out, and is replaced by any newer notification (success = green border, info = blue)

### Requirement: Word Search

#### Scenario: Behaviour

- **WHEN** the user searches loaded words
- **THEN** English matches case-insensitively by substring and Chinese by substring; "Complete match" restricts to exact case-insensitive English; results show sheet name, row number, preview, and an Edit button that closes search and opens the edit modal pre-filled
- **AND** opening search from the menu keeps the carousel paused
