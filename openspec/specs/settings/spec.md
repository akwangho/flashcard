# Settings Specification

## Purpose

Defines the general and voice settings modals and the LocalStorage models persisting preferences, sheet selection/history, last-viewed word, and SRS data. Default values are not restated here — see the defaults table in `openspec/project.md`.

## Data Models

### General Settings (`flashcard-settings`)

- `delayTime: Number` (1–10 s, step 0.5), `fontSize: Number` (20–120 px, step 4), `displayMode: String` (`'english-first'` | `'chinese-first'` | `'mixed'`), `fontFamily: String` (font code; see Font Family Mapping)
- `delaySpeechInNormalMode: Boolean` (EN speech deferred to phase 2), `mustSpellChineseFirst: Boolean` (mixed mode: force Chinese-first for 衝刺要會拼單字 only; see `flashcard-core/spec.md`)
- `showTimerProgressBar: Boolean`, `timerProgressBarOffset: Number` (0–100 px), `smartTimerEnabled: Boolean`, `showKKPhonetic: Boolean` (see `kk-phonetic` spec)

### Voice Settings (`flashcard-voice-settings`)

- `enabled: Boolean` (EN/JA voice), `rate: Number` (0.1–1.0, step 0.1), `pitch: Number` and `volume: Number` (defaults 1), `spellOutLetters: Boolean`
- `lang: String` + `voiceURI: String` (English voice), `japaneseLang: String` + `japaneseVoiceURI: String` (Japanese voice)
- `spellOutScope: String` (`'all'` | `'must-spell-all'` | `'must-spell-random'` | `'must-spell-sprint'`)
- `chineseEnabled: Boolean`, `chineseLang: String`, `chineseVoiceURI: String` (Chinese voice)

### Other LocalStorage Keys

- `flashcard-sheet-settings`: `{ sheetId: String, selectedSheets: Array }` — Google Sheet ID + selected worksheet names
- `flashcard-sheet-history`: `[{ id, name, isDefault: false, lastUsed: ISO timestamp }]` — max 10 entries, default sheet excluded
- `flashcard-last-word`: `{ english, chinese }` — saved on every word transition, shown on the loading screen at startup
- `flashcard-srs`: SRS box data keyed by `sheetName:rowIndex`, device-local (see `srs/spec.md`)

## Requirements

### Requirement: General Settings Modal

The system SHALL provide a modal for configuring core carousel behaviour.

#### Scenario: Available controls

- **WHEN** the general settings modal is open
- **THEN** it offers a delay time slider (1–10 s, step 0.5), font size slider (20–120 px, step 4, live preview), font family dropdown (9 fonts, live preview), display mode radio (English first / Chinese first / Mixed), sprint must-spell force-Chinese-first toggle (visible only in Mixed mode), smart timer toggle, timer progress bar toggle, and progress bar top offset input (0–100 px, visible only when the bar is enabled)

### Requirement: Voice Settings Modal

The system SHALL provide a modal for configuring text-to-speech behaviour.

#### Scenario: Available controls

- **WHEN** the voice settings modal is open
- **THEN** it offers an enable EN/JA voice toggle, speech rate slider (0.1–1.0, step 0.1), English and Japanese voice dropdowns (dynamically populated from system voices), delayed speech toggle, spell out letters toggle with scope dropdown (所有單字 / 所有要會拼單字 / 隨機要會拼單字 / 衝刺要會拼單字), enable Chinese voice toggle, and Chinese voice dropdown

### Requirement: Font Family Mapping

The system SHALL support the following font family codes.

#### Scenario: Available fonts

| Code | Display name | CSS font-family |
|------|-------------|----------------|
| `system-default` | 系統預設 | `'Microsoft JhengHei', 'PingFang TC', 'Helvetica Neue', Arial, sans-serif` |
| `microsoft-yahei` | 微軟正黑體 | `'Microsoft JhengHei', 'Microsoft YaHei', 'SimHei', 'Arial Unicode MS', Arial, sans-serif` |
| `songti` | 宋體 | `'STSong', 'SimSun', 'Times New Roman', serif` |
| `kaiti` | 楷體 | `'STKaiti', 'KaiTi', 'BiauKai', 'Times New Roman', serif` |
| `arial` | Arial | `Arial, 'Helvetica Neue', Helvetica, sans-serif` |
| `helvetica` | Helvetica | `'Helvetica Neue', Helvetica, Arial, sans-serif` |
| `times` | Times New Roman | `'Times New Roman', Times, serif` |
| `courier` | Courier New | `'Courier New', Courier, monospace` |
| `verdana` | Verdana | `Verdana, Geneva, sans-serif` |

### Requirement: Settings Persistence

The system SHALL persist all settings to LocalStorage and apply them on startup.

#### Scenario: Save, load, reset, migrate

- **WHEN** the user changes any setting and saves or closes a modal
- **THEN** the settings are written to their LocalStorage key; on startup they are read and applied before the carousel begins
- **AND** clicking the 重置設定 (reset to defaults) button restores all settings to the defaults in `project.md`
- **AND** a legacy `reverseMode` boolean is silently migrated on load: `true` → `chinese-first`, `false` → `english-first`
