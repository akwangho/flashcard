# Difficulty Marking Specification

## Purpose

Defines the -999 to 10 difficulty scale plus the 100 forced-review level, its UI rendering, the increase / auto-decrease rules, and the D-key mark-as-very-familiar flow. Difficulty is stored in Sheet column D; difficulty filters are specified in `review-filter/spec.md`.

## Requirements

### Requirement: Difficulty Scale and Display

The system SHALL use a difficulty scale from -999 to 10, plus the special forced-review level 100, and render it with stars and colour.

#### Scenario: Scale semantics and rendering

- **WHEN** a word's difficulty level is displayed
- **THEN** the semantics are: `-999` = very familiar / mastered (green; excluded from carousel and quiz by default), `-1` to `-998` = reviewed |N| times (green), `0` = familiar (no mark), `1–10` = ★N unfamiliar with colour escalating yellow → orange → dark orange → orange-red → red (`10` adds a red glow), `100` = forced review (cyan)
- **AND** positive values render as `★N`; `≤ -999` renders as `★✓` in green; `-1` to `-998` render as `★0` in grey — the real negative number is never shown in the UI
- **AND** the forced-review level renders as `★-` instead of a number, indicating it is excluded from difficulty statistics; the edit modal shows `★- 強制複習`

#### Scenario: Sheet read/write format

- **WHEN** difficulty is written to column D
- **THEN** numbers are written as integers and `0` as an empty string; reading accepts both numeric and legacy `*` formats

### Requirement: Increase Difficulty

The system SHALL allow the user to increase the current word's difficulty.

#### Scenario: Increment

- **GIVEN** `difficultyLevel ≥ 0`
- **WHEN** the user clicks the difficulty indicator or presses S / F5 / Enter
- **THEN** difficulty increases by 1 (capped at 10) and the new value is synced to Sheet column D

#### Scenario: Edge rules

- **GIVEN** `difficultyLevel < 0`
- **WHEN** the user increases difficulty
- **THEN** it jumps directly to 1 (not +1)
- **AND** while the word is pending removal, pressing S has no effect

### Requirement: Forced Review Level Protection

The system SHALL keep a word at difficulty 100 through review-related actions so it remains forced until the user explicitly edits it or marks it very familiar.

#### Scenario: Actions that do not change 100

- **WHEN** a forced-review word is increased (S / F5 / Enter / progress-area click), auto-decreased on confirmed removal, or answered wrong in a quiz
- **THEN** its difficulty stays 100 and no write is made that would change it
- **AND** the pending-removal preview continues to show `★-` rather than a decremented value

#### Scenario: Explicit override

- **WHEN** the user edits the word and changes the number input, or completes the D-key mark-as-very-familiar flow
- **THEN** the explicit new value is saved (values `≥ 100` entered in the number input normalise back to 100; values 11–99 clamp to 10)

### Requirement: Auto-Decrease Difficulty on Removal

The system SHALL automatically decrease difficulty by 1 when a word is confirmed removed.

#### Scenario: Auto-decrement on confirm

- **WHEN** a word's removal is confirmed and its last review date is NOT today
- **THEN** difficulty decreases by 1 (floor -999)
- **AND** if the word was already reviewed today, difficulty is NOT decreased

#### Scenario: UI preview and cancel

- **WHEN** the user clicks the word card to mark it pending removal
- **THEN** the display immediately shows the decremented value (not yet written to the sheet)
- **AND** cancelling (R key or restore button) reverts the display to the original value

### Requirement: Mark as Very Familiar (D-Key Double-Confirm)

The system SHALL mark a word as -999 (very familiar) via a two-press D-key confirmation flow.

#### Scenario: Double-press confirmation

- **WHEN** the user presses D once
- **THEN** the timer and progress bar pause and a "Press D again to mark as very familiar" prompt is shown
- **WHEN** D is pressed again within 3 seconds
- **THEN** the word enters pending-removal state with a ✓ preview, a "✓ Marked as very familiar" toast, and a "Restore word" button; without a second press within 3 seconds the operation auto-cancels and the timer resumes

#### Scenario: Confirm, cancel, and upgrade

- **WHEN** the delay timer expires
- **THEN** the word is formally marked -999, the backend is updated immediately, and the word is removed from the current round
- **AND** clicking "Restore word" or pressing ← before expiry cancels the mark and restores the original difficulty
- **AND** pressing D twice on a word already pending removal upgrades it: it will be marked -999 on expiry instead of normal removal
