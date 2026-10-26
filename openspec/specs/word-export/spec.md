# Word Export Specification

## Purpose

Defines exporting the current word set to a new worksheet in the same Google Sheet, with overwrite protection and batch progress.

## Requirements

### Requirement: Export to New Worksheet

The system SHALL export words to a new worksheet in the same Google Sheet, defaulting to a timestamp-based name that the user MAY override.

#### Scenario: Export types and format

- **WHEN** the user opens the export modal and runs an export
- **THEN** two export types are offered: **Remaining words** (all words not yet removed this round) and **Difficult words (★1+)** (`difficultyLevel ≥ 1`), and the default worksheet name is `<first-selected-worksheet>_YYYYMMDD`
- **AND** the sheet gets a row-1 header, the total word count in cell A1 (written on the first batch; later batches append without recounting A1), and per word: B = English, C = Chinese, D = difficulty (0 as empty string), E = image URL (A must-spell, F image formula, H tags, and I KK phonetic are not part of the export payload, so those columns stay empty)
- **AND** words are sent in batches of 15 (`APP_CONSTANTS.EXPORT_BATCH_SIZE`; see `project.md` defaults) while a progress bar shows the percentage complete and the `processed / total` count; each batch is written with a single Sheets write call
- **AND** overwrite mode only ever clears the target worksheet for the first batch; later batches always append

#### Scenario: Overwrite protection

- **WHEN** the target worksheet name already exists in the Google Sheet
- **THEN** a confirmation modal offers **Use a different name** (suggests an alternate by appending — or refreshing a trailing — `_HHMM` time suffix) or **Overwrite existing worksheet** (deletes the old worksheet first)
