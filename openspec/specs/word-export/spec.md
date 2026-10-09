# Word Export Specification

## Purpose

Defines exporting the current word set to a new worksheet in the same Google Sheet, with overwrite protection and batch progress.

## Requirements

### Requirement: Export to New Worksheet

The system SHALL export words to a new worksheet in the same Google Sheet, defaulting to a timestamp-based name that the user MAY override.

#### Scenario: Export types and format

- **WHEN** the user opens the export modal and runs an export
- **THEN** two export types are offered: **Remaining words** (all words not yet removed this round) and **Difficult words (★1+)** (`difficultyLevel ≥ 1`), and the default worksheet name is `已匯出_YYYYMMDD_HHMMSS` (current timestamp)
- **AND** the sheet gets a row-1 header, the total word count in cell A1, and per word: A = must-spell flag, B = English, C = Chinese, D = difficulty (0 as empty string), E = image URL, H = tags
- **AND** words are sent in batches of 15 (`APP_CONSTANTS.EXPORT_BATCH_SIZE`; see `project.md` defaults) while a progress bar shows the percentage complete and the `processed / total` count

#### Scenario: Overwrite protection

- **WHEN** the target worksheet name already exists in the Google Sheet
- **THEN** a confirmation modal offers **Use a different name** (suggests an alternate by appending `_1`, `_2`, …) or **Overwrite existing worksheet** (deletes the old worksheet first)
