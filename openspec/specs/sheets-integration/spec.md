# Sheets Integration Specification

## Purpose

Defines how the application loads vocabulary from Google Sheets, manages sheet selection, detects and validates sheet IDs, and exposes backend API functions for reading and writing word data.

## Data Model

### Google Sheet Column Layout

Each sheet's first row is a header row; data starts from row 2.

| Column | Header row (row 1) | Data rows | Required |
|--------|-------------------|-----------|----------|
| A (col 1) | Valid word count (number in A1) | Must-spell flag (`1` = must spell; empty = no) | No |
| B (col 2) | `單字` | English word | Yes |
| C (col 3) | `翻譯` | Chinese translation | Yes |
| D (col 4) | `不熟程度` | Difficulty -999~10 (negative = very familiar; empty = 0). Reads legacy `*` format; writes numbers | No |
| E (col 5) | `圖片URL` | Image URL | No |
| F (col 6) | `圖片` | Image display formula | No |
| G (col 7) | `最後複習日期` | Last review date `YYYY-MM-DD` (empty = never reviewed) | No |
| H (col 8) | `標籤` | Tags separated by half-width `,` or full-width `，` | No |

## Requirements

### Requirement: Sheet Settings Interface

The system SHALL provide a modal for selecting the Google Sheet and individual worksheets to load.

#### Scenario: Interface elements

- **WHEN** the user opens the sheet-settings modal
- **THEN** the modal shows:
  - A list of built-in default sheets
  - A list of recently used non-default sheets (up to 10)
  - A text field for entering a Sheet ID or full Google Sheets URL
  - A "Load sheet list" button
  - A worksheet multi-select list (shown after a sheet is loaded)

#### Scenario: Quick-select collapse

- **WHEN** the user selects a default sheet, a recent entry, or clicks "Load sheet list"
- **THEN** the default list, recent list, ID field, and load button are hidden
- **AND** only the worksheet selection area and bottom action buttons are shown
- **AND** reopening the modal restores the full interface

### Requirement: Built-In Default Sheets

The system SHALL include pre-configured default sheets accessible without entering an ID.

#### Scenario: Default sheet entries

- **WHEN** the sheet-settings modal is opened
- **THEN** the following built-in sheets are listed:
  1. `WordGo Data Sheet` (ID: `1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM`)
  2. `小學生教育部規定1200單字` (ID: `1hX2Ux2__5F-jdhfegmzMBZ7bg3faOt06ARb7ezC8Yzg`)

### Requirement: Recent Sheet History

The system SHALL automatically record recently used non-default sheets.

#### Scenario: History persistence

- **WHEN** the user loads a non-default sheet
- **THEN** it is saved to LocalStorage key `flashcard-sheet-history` (up to 10 entries)
- **AND** each entry contains: `id`, `name`, `isDefault` (always false), `lastUsed` (ISO timestamp)

#### Scenario: Quick access and deletion

- **WHEN** viewing the recent history list
- **THEN** the user can click an entry to load it or delete individual entries

### Requirement: Sheet ID Extraction

The system SHALL automatically extract the Sheet ID from a full Google Sheets URL.

#### Scenario: URL parsing

- **GIVEN** the user pastes a full URL like `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
- **WHEN** the input is processed
- **THEN** the Sheet ID is extracted using the pattern `/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/`

### Requirement: Worksheet Selection

The system SHALL allow the user to select one or more worksheets to load simultaneously.

#### Scenario: Worksheet list display

- **WHEN** a Google Sheet is loaded
- **THEN** each worksheet is listed with its name and word count (read from cell A1)

#### Scenario: Multi-select and merge

- **WHEN** the user selects multiple worksheets
- **THEN** words from all selected sheets are merged into a single word pool

#### Scenario: Shift+Click range selection

- **WHEN** the user holds Shift and clicks a worksheet item
- **THEN** all items between the last clicked item and the current item are batch-selected or deselected

#### Scenario: Select-all / deselect-all

- **WHEN** the user clicks the "Select all" button
- **THEN** all worksheets are selected
- **WHEN** the user clicks "Deselect all"
- **THEN** all worksheets are deselected
- **AND** the button label updates automatically based on current selection state

#### Scenario: Clear selection

- **WHEN** the user clicks the "Clear" button
- **THEN** all selected worksheets are deselected
- **AND** the "Clear" button is hidden when no worksheets are selected

#### Scenario: Excluded worksheets

- **WHEN** building the worksheet list
- **THEN** the sheet named `記事` is automatically hidden and never loaded

### Requirement: Load Progress Bar

The system SHALL show a real progress bar during sheet loading.

#### Scenario: Two-phase progress

- **WHEN** loading sheets
- **THEN** Phase 1 shows an indeterminate animation (connecting to Google Sheet)
- **AND** Phase 2 shows a determinate percentage as each worksheet's word count is retrieved

### Requirement: Backend Word Loading API

The backend SHALL expose functions for loading words from sheets.

#### Scenario: Available backend functions

- **WHEN** the frontend requests words
- **THEN** the backend provides:

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getWordsFromSheet()` | — | `Array<Word>` | Load from default sheet (backward-compatible) |
| `getWordsFromSheets(sheetId, sheetNames)` | Sheet ID, sheet name array | `Array<Word>` | Load from multiple named sheets |
| `getWordsFromSingleSheet(sheetId, sheetName)` | Sheet ID, sheet name | `{success, words, sheetName, wordCount}` | Load single sheet (used for progressive loading) |
| `getWordsFromSheetsWithDuplicateDetection(sheetId, sheetNames, autoHandle)` | Sheet ID, sheet names, auto-handle flag | `Object` | Load with duplicate detection/handling (non-initial reload) |
| `getDemoWords()` | — | `Array<Word>` | Demo data (fallback when load fails) |

### Requirement: Backend Sheet Management API

The backend SHALL expose functions for listing and validating worksheets.

#### Scenario: Available sheet management functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getSheetsList(sheetId)` | Sheet ID | `{spreadsheetName, sheets: [{name, wordCount}]}` | All sheets with word counts (one-shot) |
| `getSheetNamesOnly(sheetId)` | Sheet ID | `{spreadsheetName, sheetNames, sheetCount}` | Sheet names only (fast, for quick list display) |
| `getSheetWordCount(sheetId, sheetName)` | Sheet ID, sheet name | `{name, wordCount}` | Word count for one sheet (used with progress bar) |
| `checkSheetExists(sheetName, targetSheetId)` | Sheet name, Sheet ID | `Boolean` | Check if a worksheet exists |

### Requirement: Backend Word Operations API

The backend SHALL expose functions for reading and writing individual word properties.

#### Scenario: Available word operation functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `updateWordProperties(sheetId, sheetName, rowIndex, properties)` | Sheet ID, sheet name, row index, `{english, chinese, difficultyLevel, imageUrl, mustSpell}` | `Object` | Update multiple word properties (columns A/B/C/D/E) |
| `updateWordDifficulty(sheetId, sheetName, rowIndex, difficultyLevel)` | Sheet ID, sheet name, row index, -999~10 | `Boolean` | Update difficulty in column D (integer; 0 written as empty string) |
| `markWordAsDifficult(sheetId, sheetName, rowIndex, isDifficult)` | Sheet ID, sheet name, row index, boolean | `Boolean` | Backward-compat wrapper → calls `updateWordDifficulty` |
| `batchUpdateReviewDates(sheetId, updates)` | Sheet ID, `[{sheetName, rowIndex, date}]` | `Object` | Batch-write review dates to column G |
| `exportWordsToSheet(words, sheetName, targetSheetId, overwrite, isFirstBatch)` | Word array, sheet name, Sheet ID, overwrite flag, first-batch flag | `Object` | Export words to a new worksheet |

### Requirement: Backend Utility Functions and Constants

The backend SHALL provide utility functions and column-index constants.

#### Scenario: Column constants

- **WHEN** accessing sheet data
- **THEN** `COL` provides 0-based indices: `MUST_SPELL=0, ENGLISH=1, CHINESE=2, DIFFICULTY=3, IMAGE_URL=4, IMAGE_FORMULA=5, LAST_REVIEW=6`
- **AND** `COL_NUM` provides 1-based column numbers for `getRange(row, col)` calls

#### Scenario: Utility functions

| Function | Description |
|----------|-------------|
| `validateAndCleanSheetId(sheetId)` | Validate and sanitise a Sheet ID |
| `openSpreadsheetSafely(sheetId)` | Open a Google Spreadsheet with error handling |
| `countValidWords(sheet)` | Read A1 value as the valid word count |
| `createWordObject(rowData, id, sheetName, rowIndex)` | Build a Word object from row data using `COL` constants |
| `findWordRowIndex(sheet, englishWord, chineseWord)` | Find the row index for a word by English and Chinese text |
