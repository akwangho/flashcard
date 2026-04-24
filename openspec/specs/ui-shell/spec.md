# UI Shell Specification

## Purpose

Defines the application shell: loading screen, visual theme, fullscreen mode, image display, modal system, menu system, toast notifications, word search, and CSS design tokens.

## Requirements

### Requirement: Loading Screen

The system SHALL display a loading screen during startup and word reload.

#### Scenario: Last-viewed word display

- **WHEN** the loading screen appears (on startup or "Reload words")
- **THEN** the last-viewed word is read from LocalStorage (`flashcard-last-word`) and shown
- **AND** if no saved word exists, "Ready / 準備好的；有準備的" is shown

#### Scenario: Real progress bar

- **WHEN** sheets are being loaded
- **THEN** the progress bar passes through three phases:
  1. Indeterminate animation (connecting to Google Sheet)
  2. Determinate percentage (loading sheet N of M)
  3. Completion (processing → done)

#### Scenario: Version display

- **WHEN** the loading screen is shown
- **THEN** the application version number is displayed in small grey text below the progress bar
- **AND** the build date and time for that version are shown on the line below the version string

### Requirement: Visual Theme

The system SHALL use a dark colour theme with yellow primary text.

#### Scenario: Colour palette

- **WHEN** the UI is rendered
- **THEN** the following CSS variable-based colours are used (with hard-coded fallbacks for legacy browsers):

| Variable | Value | Usage |
|----------|-------|-------|
| `--primary-color` | `#FFFF00` | Primary text (yellow) |
| `--bg-color` | `#000000` | Background (black) |
| `--text-color` | `#FFFFFF` | General text (white) |
| `--gray-color` | `#888888` | Secondary text |
| `--success-color` | `#00FF00` | Success (green) |
| `--error-color` | `#FF6B6B` | Error (red) |
| `--warning-color` | `#FFA500` | Warning (orange) |

### Requirement: Fullscreen Mode

The system SHALL support entering and exiting fullscreen.

#### Scenario: Enter fullscreen

- **WHEN** the user triggers fullscreen (F key or menu button)
- **THEN** the system calls the appropriate fullscreen API (`requestFullscreen`, `webkitRequestFullscreen`, `mozRequestFullScreen`, or `msRequestFullscreen`)
- **AND** the button label changes to "Exit fullscreen"

#### Scenario: iOS fallback

- **WHEN** an iOS device is detected (Safari/Chrome on iOS does not support fullscreen API)
- **THEN** a "Add to Home Screen" guidance message is shown
- **WHEN** the app is already running standalone (`navigator.standalone`)
- **THEN** a message indicates that fullscreen mode is already active

### Requirement: Image Display

The system SHALL display an associated image for words that have an image URL.

#### Scenario: Image shown with translation

- **WHEN** the Chinese translation is revealed in phase 2
- **AND** the current word has an image URL
- **THEN** the image is shown as the background of the flashcard container, scaled with `contain` (no cropping)

#### Scenario: Text legibility on image

- **WHEN** an image is displayed as background
- **THEN** the word text has a semi-transparent black background to ensure readability

#### Scenario: Image preloading

- **WHEN** displaying a word
- **THEN** the system preloads images for the current and the next 10 upcoming words (`preloadUpcomingImages`)

### Requirement: Modal System

The system SHALL present all secondary interfaces as modals with consistent open/close behaviour.

#### Scenario: Common modal behaviour

- **WHEN** any modal is opened
- **THEN** the carousel is automatically paused
- **WHEN** any modal is closed
- **THEN** the carousel resumes (unless it was already paused before opening)
- **AND** clicking outside the modal (on the backdrop) closes it

#### Scenario: Custom confirm dialog

- **WHEN** a confirmation is needed (e.g., reload words, overwrite sheet)
- **THEN** a custom HTML modal replaces the browser's native `confirm()` to avoid exiting fullscreen
- **AND** the dialog supports: title, message (with line breaks), optional warning text, custom button labels

#### Scenario: Modal IDs

The following modal element IDs exist in the application:

| Modal ID | Purpose |
|----------|---------|
| `sheet-settings-modal` | Sheet selection |
| `settings-modal` | General settings |
| `voice-settings-modal` | Voice settings |
| `export-modal` | Word export |
| `overwrite-confirm-modal` | Export overwrite confirmation |
| `duplicate-words-modal` | Duplicate word handling |
| `quiz-modal` | Quiz system |
| `edit-word-modal` | Edit current word |
| `difficulty-filter-modal` | Difficulty filter |
| `review-filter-modal` | Review time filter |
| `srs-review-modal` | SRS quick review |
| `custom-confirm-modal` | Custom confirm dialog |
| `type-filter-modal` | Word type filter |
| `tag-filter-modal` | Tag filter |

### Requirement: Menu System

The system SHALL provide a main dropdown menu with flyout submenus.

#### Scenario: Menu structure

- **WHEN** the user opens the menu (▼ button)
- **THEN** the following items are available (with flyout submenus for ◂ items):
  - **◂ 篩選** (flyout): ⭐ Difficulty, 📅 Review time, ✍️ Must-spell, 📝 Type, 🏷️ Tags
  - 📖 Quick review (with due-badge count)
  - **◂ 測驗** (flyout): 🎯 Quick quiz (10 Q), 📝 Full quiz
  - ✏️ Edit current word
  - 🔍 Search words
  - 📤 Export words
  - 🔄 Reload words
  - **◂ 快速設定** (flyout): 5 preset learning modes
  - 📋 Sheet settings
  - **◂ 設定** (flyout): 🔊 Voice settings, ⚙️ General settings
  - 📺 Fullscreen

#### Scenario: Flyout submenu behaviour

- **WHEN** the user hovers over a flyout item (desktop) or taps it (touch)
- **THEN** the submenu appears on the left side
- **AND** only one submenu is open at a time
- **WHEN** the menu closes
- **THEN** all submenus are also closed

#### Scenario: Auto-pause on menu open

- **WHEN** the menu opens
- **THEN** the carousel is paused
- **WHEN** the menu closes
- **THEN** the carousel resumes (unless already paused)

#### Scenario: Toolbar hide on menu close

- **WHEN** the menu closes
- **THEN** the entire toolbar (prev, next, voice, pause, menu buttons) is hidden
- **AND** it reappears when the user moves the cursor into the toolbar zone (desktop) or taps the zone (touch)

#### Scenario: Overflow scroll

- **WHEN** the screen height is insufficient to show the full menu
- **THEN** a vertical scrollbar appears (`max-height: 70vh`); horizontal scrollbar is never shown

### Requirement: Quick Settings Presets

The system SHALL provide one-click preset modes in the menu's quick-settings submenu.

#### Scenario: Available presets

| Preset | Settings applied |
|--------|-----------------|
| 🎧 用聽的背單字 | `displayMode='chinese-first'`, `spellOutLetters=true`, `chineseEnabled=true`, `delayTime=9`, `smartTimerEnabled=true` |
| 👂 用聽的認識單字 | `displayMode='english-first'`, `spellOutLetters=false`, `chineseEnabled=true`, `delayTime=4.5`, `smartTimerEnabled=true`, `delaySpeechInNormalMode=false` |
| 📝 日常複習 | `displayMode='mixed'`, `delaySpeechInNormalMode=true`, `spellOutLetters=false`, `chineseEnabled=false`, `delayTime=10`, `smartTimerEnabled=true` |
| 🎧 聽力訓練 | `listeningMode=true`, `spellOutLetters=false`, `chineseEnabled=false`, `smartTimerEnabled=true` |
| 🔄 輪播記憶 | `carouselMemoryMode=true`, `displayMode='english-first'`, `spellOutLetters=false`, `chineseEnabled=false`, `delayTime=5`, `smartTimerEnabled=false`, `showTimerProgressBar=false`, `delaySpeechInNormalMode=false` |

#### Scenario: Preset application

- **WHEN** the user selects a preset
- **THEN** the settings are applied immediately, saved to LocalStorage, and the menu closes
- **AND** a multi-line toast shows the specific settings applied
- **AND** the current word is re-displayed with reset timer and recalculated display order
- **AND** switching away from carousel-memory mode automatically disables `carouselMemoryMode`

### Requirement: Active Filters Indicator

The system SHALL show a summary of active filters above the progress area.

#### Scenario: Indicator content

- **WHEN** one or more filters are active
- **THEN** the indicator shows a condensed description, e.g.:
  - `篩選: ⭐ ★5+ | 📅 >2週 | ✍️ 要會拼 | 📖 快速複習 (42個)`
  - Or `篩選: ⭐ 非常熟 (10個)` for negative-difficulty filter

#### Scenario: Clear all filters

- **WHEN** the user clicks "✕ 清除" in the indicator
- **THEN** all active filters are cleared, including exiting SRS review mode

### Requirement: Toast Notifications

The system SHALL display brief notifications for operation results.

#### Scenario: Toast display

- **WHEN** a notification is triggered
- **THEN** a centred semi-transparent toast appears with rounded corners
- **AND** it auto-dismisses after 3 seconds with a fade-out
- **AND** a new notification replaces the current one

#### Scenario: Toast types

- **WHEN** a success notification fires
- **THEN** a green border is shown
- **WHEN** an info notification fires
- **THEN** a blue border is shown

### Requirement: Word Search

The system SHALL allow searching through all loaded words by keyword.

#### Scenario: Search behaviour

- **WHEN** the user opens the search modal and enters a query
- **THEN** the system searches the English field (case-insensitive substring) and Chinese field (substring) across all loaded words
- **AND** results show: sheet name, spreadsheet row number, English/Chinese preview, and an "Edit" button

#### Scenario: Exact-match option

- **WHEN** the user enables "Complete match"
- **THEN** only the English field is searched, and the query must exactly match (case-insensitive)

#### Scenario: Search-to-edit

- **WHEN** the user clicks "Edit" on a search result
- **THEN** the search modal closes and the edit-word modal opens pre-filled with that word's data

#### Scenario: Pause maintenance

- **WHEN** the search modal is opened from the menu
- **THEN** the carousel remains paused (the menu's pause is carried through; the timer is not resumed on menu close)

### Requirement: Responsive Design

The system SHALL adapt to different screen sizes and prevent unwanted zoom.

#### Scenario: Viewport configuration

- **WHEN** the page loads
- **THEN** the viewport is configured with `user-scalable=no` and `maximum-scale=1.0`

#### Scenario: Touch target sizes

- **WHEN** rendered on touch devices
- **THEN** all interactive buttons have sufficient tap target size
