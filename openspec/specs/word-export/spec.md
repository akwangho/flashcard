# Word Export Specification

## Purpose

Defines the export feature that writes the current word set to a new worksheet in the same Google Sheet, including batch processing, progress display, and overwrite protection.

## Requirements

### Requirement: Export to New Worksheet

The system SHALL export words to a new worksheet in the same Google Sheet.

#### Scenario: Export types

- **WHEN** the user opens the export modal
- **THEN** two export types are available:
  1. **Remaining words** — all words not yet removed in the current round
  2. **Difficult words (★1+)** — only words with `difficultyLevel ≥ 1`

#### Scenario: Exported columns

- **WHEN** words are exported
- **THEN** the following columns are written:
  - Column A: Must-spell flag
  - Column B: English word
  - Column C: Chinese translation
  - Column D: Difficulty level (integer; 0 as empty string)
  - Column E: Image URL
  - Column H: Tags
- **AND** cell A1 stores the total word count
- **AND** a header row is written as row 1

### Requirement: Worksheet Naming

The system SHALL provide a default timestamp-based name that the user may override.

#### Scenario: Default name

- **WHEN** the export modal opens
- **THEN** the default worksheet name is `已匯出_YYYYMMDD_HHMMSS` using the current timestamp

#### Scenario: Custom name

- **WHEN** the user enters a custom name
- **THEN** that name is used for the new worksheet

### Requirement: Overwrite Protection

The system SHALL prevent accidental overwriting of an existing worksheet.

#### Scenario: Duplicate name detected

- **WHEN** the target worksheet name already exists in the Google Sheet
- **THEN** an overwrite-confirmation modal is shown with two options:
  1. **Use a different name** — automatically suggests an alternate name by appending `_1`, `_2`, etc.
  2. **Overwrite existing worksheet** — deletes the old worksheet and creates a new one

### Requirement: Batch Export with Progress

The system SHALL export words in batches and display a progress indicator.

#### Scenario: Batch processing

- **WHEN** an export is executed
- **THEN** words are sent in batches of 15 (`APP_CONSTANTS.EXPORT_BATCH_SIZE`)
- **AND** a progress bar shows the percentage complete and `processed / total` count
