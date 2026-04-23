# Word Edit Specification

## Purpose

Defines the inline word-edit modal that lets users modify any loaded word during an active session without switching to Google Sheets, accessible from the menu, the E key, or via the search-word results.

## Requirements

### Requirement: Edit Word Modal Activation

The system SHALL allow opening the edit-word modal for the current word or a specific word.

#### Scenario: Open for current word

- **WHEN** the user selects "✏️ Edit current word" from the menu or presses E
- **THEN** the edit-word modal opens pre-filled with the currently displayed word's data
- **AND** the carousel is paused

#### Scenario: Open from search results

- **WHEN** the user clicks "Edit" on a word search result
- **THEN** the search modal closes and the edit-word modal opens with that specific word's data

#### Scenario: Auto-pause and resume

- **WHEN** the edit modal opens
- **THEN** the carousel is paused and a "Paused" indicator is shown
- **WHEN** the edit modal closes
- **THEN** the carousel resumes if it was not already paused before opening

### Requirement: Editable Fields

The system SHALL allow editing the following word properties.

#### Scenario: Available fields

| Field | Source column | Input type | Notes |
|-------|--------------|------------|-------|
| English word | B | Text input | Required; cannot be empty |
| Chinese translation | C | Text input | Required; cannot be empty |
| Difficulty level | D | Slider (-1~10) + number input (-999~10) | Bidirectional sync; ≤-999 shows "✓ 已掌握" (green); -1~-998 shows ★0 (grey); 0–10 shows ★N with colour |
| Must-spell | A | Toggle switch | — |
| Image URL | E | Text input (may be empty) | With live image preview |
| Tags | H | Text input (comma-separated; `,` or `，`) | — |

#### Scenario: Read-only info

- **WHEN** the edit modal is open
- **THEN** the source sheet name is shown as read-only information

### Requirement: Image Preview

The system SHALL show a live preview of the image URL entered in the edit modal.

#### Scenario: Preview on input

- **WHEN** the user types or pastes an image URL
- **THEN** the preview updates after 500 ms debounce

#### Scenario: Load error

- **WHEN** the image URL fails to load
- **THEN** "圖片載入失敗" is shown in the preview area

#### Scenario: Empty URL

- **WHEN** the image URL field is empty
- **THEN** the preview area is hidden

### Requirement: Save Behaviour

The system SHALL validate and save changes both in-memory and to the Google Sheet backend.

#### Scenario: Validation

- **WHEN** the user attempts to save
- **AND** the English word or Chinese translation field is empty
- **THEN** saving is blocked and an error indication is shown

#### Scenario: In-memory sync

- **WHEN** the save succeeds
- **THEN** the corresponding entry in `words` and `currentWords` arrays is updated immediately
- **AND** the flashcard display is re-rendered to reflect the change

#### Scenario: Backend sync

- **WHEN** the save succeeds
- **THEN** `google.script.run.updateWordProperties()` is called asynchronously to write the change to Google Sheet columns A/B/C/D/E

### Requirement: Enter Key Save

The system SHALL support saving via the Enter key in text inputs.

#### Scenario: Enter to save

- **WHEN** the user presses Enter while focus is in any text input inside the edit modal
- **THEN** the form is saved (same as clicking the save button)
