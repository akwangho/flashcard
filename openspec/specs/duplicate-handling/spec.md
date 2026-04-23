# Duplicate Handling Specification

## Purpose

Defines detection of duplicate English words across sheets, automatic in-memory merging with user notification, and the manual resolution modal.

## Requirements

### Requirement: Duplicate Detection

The system SHALL automatically detect words with the same English text when loading from multiple sheets.

#### Scenario: Detection on every load

- **WHEN** words are loaded from one or more sheets
- **THEN** duplicates are detected based on the English field (case-sensitive; `May` and `may` are treated as different words)

### Requirement: Auto-Merge (In-Memory)

The system SHALL automatically resolve duplicates in memory during initial load, without modifying the Google Sheet.

#### Scenario: Identical Chinese translation

- **WHEN** two or more words share the same English text AND the same Chinese translation
- **THEN** the first occurrence is kept and the others are removed from memory

#### Scenario: Different Chinese translations

- **WHEN** two or more words share the same English text but have different Chinese translations
- **THEN** all translations are merged into the first occurrence using the format `1. TranslationA\n2. TranslationB`
- **AND** the other duplicates are removed from memory

#### Scenario: Auto-merge notification

- **WHEN** auto-merge is completed
- **THEN** a notification appears in the upper-right corner showing the word count before and after merging
- **AND** the notification pauses auto-dismiss while the mouse hovers over it

#### Scenario: "Don't auto-merge next time" option

- **WHEN** the auto-merge notification is shown
- **THEN** it includes a "下次不自動合併" link
- **WHEN** the user clicks that link
- **THEN** the preference is saved to LocalStorage key `flashcard-no-auto-merge`
- **AND** on the next load, if duplicates are still present, the manual merge modal is shown instead of auto-merging

### Requirement: Manual Resolution Modal

The system SHALL provide a modal for resolving duplicates one group at a time.

#### Scenario: Per-group options

- **WHEN** the duplicate modal is open and a group of duplicates is shown
- **THEN** the user can choose one of:
  1. **Keep first, delete others** — retains the first occurrence and deletes the rest (modifies Google Sheet)
  2. **Merge definitions** — combines all translations into one entry (modifies Google Sheet)
  3. **Skip, handle later** — applies in-memory auto-handling without modifying Google Sheet
