# Sheets Integration Specification

## Purpose

Defines how words are loaded from Google Sheets, how the sheet and worksheets are selected, and the backend API for reading and writing word data.

## Data Model

### Google Sheet Column Layout

Row 1 is a header row; data starts from row 2.

| Column | Header (row 1) | Data rows | Required |
|--------|----------------|-----------|----------|
| A | (A1 = valid word count) | Must-spell flag: `1` = 衝刺要會拼單字 (sprint), `0.5` = 隨機要會拼單字 (random), `-1` = 看懂就好 (understand-only), empty/`0` = none; other legacy values read as `1` (see `flashcard-core/spec.md`) | No |
| B | `單字` | English word | Yes |
| C | `翻譯` | Chinese translation | Yes |
| D | `不熟程度` | Difficulty -999~10 (empty = 0; reads legacy `*`, writes numbers) | No |
| E | `圖片URL` | Image URL | No |
| F | `圖片` | Image display formula | No |
| G | `最後複習日期` | Last review date `YYYY-MM-DD` (empty = never reviewed) | No |
| H | `標籤` | Tags separated by half-width `,` or full-width `，` | No |
| I | `KK音標` | User-selected KK phonetic (written by the app; see `kk-phonetic` spec) | No |

## Requirements

### Requirement: Sheet Settings Interface

The system SHALL provide a modal for selecting the Google Sheet and individual worksheets to load.

#### Scenario: Interface and quick-select collapse

- **WHEN** the user opens the sheet-settings modal
- **THEN** it shows a list of built-in default sheets, a list of recently used non-default sheets (up to 10), a text field for a Sheet ID or full Google Sheets URL with a "Load sheet list" button, and — once a sheet is loaded — a worksheet multi-select list
- **AND** selecting a default/recent sheet or loading a sheet list hides the lists, field, and button, leaving only the worksheet selection and bottom action buttons; reopening the modal restores the full interface

### Requirement: Built-In Default Sheets

The system SHALL include pre-configured default sheets accessible without entering an ID.

#### Scenario: Default sheet entries

- **WHEN** the sheet-settings modal is opened
- **THEN** the built-in sheets listed are: `WordGo Data Sheet` (ID `1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM`) and `小學生教育部規定1200單字` (ID `1hX2Ux2__5F-jdhfegmzMBZ7bg3faOt06ARb7ezC8Yzg`)

### Requirement: Recent Sheet History

The system SHALL automatically record recently used non-default sheets.

#### Scenario: History persistence and quick access

- **WHEN** the user loads a non-default sheet
- **THEN** it is saved to LocalStorage key `flashcard-sheet-history` (up to 10 entries; each has `id`, `name`, `isDefault` always false, `lastUsed` ISO timestamp)
- **AND** clicking a history entry loads it; individual entries can be deleted

### Requirement: Sheet ID Extraction

The system SHALL automatically extract the Sheet ID from a full Google Sheets URL.

#### Scenario: URL parsing

- **WHEN** the user pastes a URL like `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
- **THEN** the Sheet ID is extracted using the pattern `/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/`

### Requirement: Worksheet Selection

The system SHALL allow selecting one or more worksheets to load simultaneously.

#### Scenario: Multi-select, bulk buttons, and exclusions

- **WHEN** a Google Sheet is loaded
- **THEN** each worksheet is listed with its name and word count (read from cell A1); selecting multiple worksheets merges their words into a single pool, and Shift+Click batch-selects/deselects the range between the last click and the current one
- **AND** "Select all" / "Deselect all" selects or clears every worksheet (label updates automatically), and "Clear" deselects all (hidden when nothing is selected)
- **AND** the worksheet named `記事` is always hidden and never loaded

### Requirement: Load Progress Bar

The system SHALL show a real progress bar during sheet loading.

#### Scenario: Two-phase progress

- **WHEN** loading sheets
- **THEN** Phase 1 shows an indeterminate animation (connecting to the Google Sheet) and Phase 2 shows a determinate percentage as each worksheet's word count is retrieved

### Requirement: Backend API

The backend SHALL expose the following functions to the frontend (via `google.script.run`).

#### Scenario: Available functions

- **WHEN** the frontend requests words or sheet data
- **THEN** word loading is provided by `getWordsFromSheet() → Array<Word>` (default sheet), `getWordsFromSheets(sheetId, sheetNames) → Array<Word>`, `getWordsFromSingleSheet(sheetId, sheetName) → {success, words, sheetName, wordCount}` (progressive loading), `getWordsFromSheetsWithDuplicateDetection(sheetId, sheetNames, autoHandle) → Object` (non-initial reload; see `duplicate-handling/spec.md`), and `getDemoWords() → Array<Word>` (fallback)
- **AND** sheet management by `getSheetsList(sheetId) → {spreadsheetName, sheets: [{name, wordCount}]}`, `getSheetNamesOnly(sheetId) → {spreadsheetName, sheetNames, sheetCount}`, `getSheetWordCount(sheetId, sheetName) → {name, wordCount}`, and `checkSheetExists(sheetName, targetSheetId) → Boolean`
- **AND** word operations by `updateWordProperties(sheetId, sheetName, rowIndex, properties) → Object` (columns A–E), `updateWordDifficulty(sheetId, sheetName, rowIndex, difficultyLevel) → Boolean` (column D; 0 written as empty), `batchUpdateReviewDates(sheetId, updates) → Object` (batch-write `[{sheetName, rowIndex, date}]` to column G), and `exportWordsToSheet(words, sheetName, targetSheetId, overwrite, isFirstBatch) → Object` (see `word-export/spec.md`)
