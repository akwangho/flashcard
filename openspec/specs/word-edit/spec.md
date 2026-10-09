# Word Edit Specification

## Purpose

Defines the inline word-edit modal for modifying any loaded word during a session, opened from the menu, the `E` key, or word-search results.

## Requirements

### Requirement: Edit Word Modal Activation

The system SHALL open the edit-word modal pre-filled with the target word's data; opening it pauses the carousel (auto-pause/resume rules per `pause-control/spec.md`).

#### Scenario: Opening the modal

- **WHEN** the user selects "✏️ Edit current word" from the menu, presses `E`, or clicks "Edit" on a word-search result
- **THEN** the modal opens pre-filled with that word's data (for search results, the search modal closes first)

### Requirement: Editable Fields

The system SHALL allow editing the following word properties.

#### Scenario: Available fields

| Field | Input | Constraints / notes |
|-------|-------|--------------------|
| English word / Chinese translation | Text input | Required; cannot be empty |
| Difficulty level | Slider (-1~10) + number input (-999~10) | Bidirectional sync; ≤ -999 shows "✓ 已掌握" (green), -1~-998 shows ★0 (grey), 0–10 shows ★N with colour |
| Must-spell | Four-option select | `0` 不需 / `1` 衝刺要會拼單字 / `0.5` 隨機要會拼單字 / `-1` 看懂就好（先英文，不用中翻英）; mixed-mode ordering per `flashcard-core/spec.md` |
| Image URL | Text input | May be empty; live preview (below) |
| KK phonetic | Display + manual text input + 重新抓取 refetch | Chooser and refetch rules per `kk-phonetic/spec.md` |
| Tags | Text input | Comma-separated (`,` or `，`) |
| Source sheet name | Read-only display | — |

#### Scenario: Image preview

- **WHEN** the user types or pastes an image URL
- **THEN** the preview updates after a 500 ms debounce
- **AND** a failed load shows "圖片載入失敗" in the preview area; an empty URL hides the preview

### Requirement: Save Behaviour

The system SHALL validate and save changes both in-memory and to the Google Sheet.

#### Scenario: Validation and save

- **WHEN** the user saves (Save button or Enter in any text input)
- **THEN** saving is blocked with an error indication if the English word or Chinese translation is empty
- **AND** otherwise the word is updated in `words`/`currentWords`, the card is re-displayed (always auto-resuming the carousel — see `pause-control/spec.md`), and `google.script.run.updateWordProperties()` writes columns A/B/C/D/E asynchronously
