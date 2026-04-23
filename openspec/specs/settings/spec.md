# Settings Specification

## Purpose

Defines the settings UI (general and voice modals) and the LocalStorage data models for persisting user preferences, sheet selections, sheet history, last-viewed word, and SRS data.

## Data Models

### General Settings (`flashcard-settings` in LocalStorage)

```javascript
{
  delayTime: Number,              // Card delay in seconds; 1–10, default 4.5, step 0.5
  fontSize: Number,               // Font size in px; 20–120, default 96, step 4
  displayMode: String,            // 'english-first' (default) | 'chinese-first' | 'mixed'
  fontFamily: String,             // Font code; default 'system-default'
  delaySpeechInNormalMode: Boolean, // Delay EN speech until phase 2; default false
  mustSpellChineseFirst: Boolean, // Force Chinese-first for must-spell words in mixed mode; default true
  showTimerProgressBar: Boolean,  // Show timer progress bar; default true
  timerProgressBarOffset: Number, // Top offset in px (0–100); default 0
  smartTimerEnabled: Boolean      // Smart timer; default false
}
```

> **Backward compatibility:** If legacy `reverseMode: Boolean` is detected on load, it is automatically migrated to `displayMode` (`true` → `'chinese-first'`, `false` → `'english-first'`).

### Voice Settings (`flashcard-voice-settings` in LocalStorage)

```javascript
{
  enabled: Boolean,           // Enable EN/JA voice; default true
  rate: Number,               // Speech rate; 0.1–1.0, default 0.8, step 0.1
  pitch: Number,              // Pitch; default 1
  volume: Number,             // Volume; default 1
  lang: String,               // English locale; default 'en-US'
  voiceURI: String,           // Selected English voice URI
  japaneseLang: String,       // Japanese locale; default 'ja-JP'
  japaneseVoiceURI: String,   // Selected Japanese voice URI
  spellOutLetters: Boolean,   // Spell out each letter; default false
  chineseEnabled: Boolean,    // Enable Chinese voice; default false
  chineseLang: String,        // Chinese locale; default 'zh-TW'
  chineseVoiceURI: String     // Selected Chinese voice URI
}
```

### Sheet Settings (`flashcard-sheet-settings` in LocalStorage)

```javascript
{
  sheetId: String,          // Google Sheet ID
  selectedSheets: Array     // Array of selected worksheet names
}
```

### Sheet History (`flashcard-sheet-history` in LocalStorage)

```javascript
[
  {
    id: String,             // Google Sheet ID
    name: String,           // Spreadsheet name
    isDefault: Boolean,     // Always false for history entries
    lastUsed: String        // ISO timestamp of last use
  }
]
// Maximum 10 entries; default sheet is excluded
```

### Last-Viewed Word (`flashcard-last-word` in LocalStorage)

```javascript
{
  english: String,  // English word
  chinese: String   // Chinese translation
}
```

> Saved on every word transition. Read on startup and during word reload to display the last-seen word on the loading screen.

### SRS Data (`flashcard-srs` in LocalStorage)

```javascript
{
  "sheetName:rowIndex": {
    box: Number,         // Leitner Box level 1–8
    nextReview: String   // Next review date "YYYY-MM-DD"
  }
}
```

> Keyed by `sheetName:rowIndex`. Device-local; not synced to Google Sheets.

## Requirements

### Requirement: General Settings Modal

The system SHALL provide a modal for configuring core carousel behaviour.

#### Scenario: Available controls

- **WHEN** the general settings modal is open
- **THEN** the following controls are available:
  - **Delay time** slider: 1–10 s, step 0.5 s
  - **Font size** slider: 20–120 px, step 4 px, with live preview
  - **Font family** dropdown: 9 font options with live preview area
  - **Display mode** radio: English first / Chinese first / Mixed
  - **Must-spell force Chinese first** toggle (visible only in Mixed mode; default enabled)
  - **Smart timer** toggle (default disabled)
  - **Show timer progress bar** toggle (default enabled)
  - **Progress bar top offset** number input: 0–100 px (visible only when progress bar is enabled)

### Requirement: Voice Settings Modal

The system SHALL provide a modal for configuring text-to-speech behaviour.

#### Scenario: Available controls

- **WHEN** the voice settings modal is open
- **THEN** the following controls are available:
  - **Enable EN/JA voice** toggle
  - **Speech rate** slider: 0.1–1.0, step 0.1
  - **English voice** dropdown (dynamically populated from system voices)
  - **Japanese voice** dropdown
  - **Delayed speech** toggle (EN speech deferred to phase 2)
  - **Spell out letters** toggle (spell-out mode)
  - **Enable Chinese voice** toggle
  - **Chinese voice** dropdown

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

#### Scenario: Save on change

- **WHEN** the user changes any setting and saves or closes the modal
- **THEN** the updated settings are written to the appropriate LocalStorage key

#### Scenario: Load on startup

- **WHEN** the application starts
- **THEN** settings are read from LocalStorage and applied before the carousel begins

#### Scenario: Reset to defaults

- **WHEN** the user clicks "Reset to defaults"
- **THEN** all settings are restored to their default values (see `project.md` for the default config table)

### Requirement: Settings Backward Compatibility

The system SHALL silently migrate deprecated setting formats on load.

#### Scenario: reverseMode migration

- **WHEN** `flashcard-settings` contains `reverseMode: true`
- **THEN** it is converted to `displayMode: 'chinese-first'` and saved
- **WHEN** `flashcard-settings` contains `reverseMode: false`
- **THEN** it is converted to `displayMode: 'english-first'` and saved
