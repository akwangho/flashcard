# Difficulty Marking Specification

## Purpose

Defines the multi-level difficulty system for tracking how well a learner knows each word, including the -999 to 10 scale, UI display rules, auto-decrement on removal, the "mark as very familiar" (D-key) flow, and synchronisation to Google Sheets.

## Requirements

### Requirement: Difficulty Scale

The system SHALL use a numeric difficulty scale from -999 to 10 stored in column D of each sheet.

#### Scenario: Scale values and meanings

- **WHEN** a word's difficulty level is read or displayed
- **THEN** the following semantics apply:
  - `-999` = Very familiar / mastered (shown green; excluded from carousel and quiz by default)
  - `-1` to `-998` = Reviewed multiple times (absolute value = review count; shown green; still appears in carousel)
  - `0` = Familiar (no mark)
  - `1–2` ★★ = Slightly unfamiliar (yellow)
  - `3–4` ★★★★ = Moderately unfamiliar (orange)
  - `5–6` ★★★★★★ = Quite unfamiliar (dark orange)
  - `7–9` ★★★★★★★★★ = Very unfamiliar (orange-red)
  - `10` ★★★★★★★★★★ = Most unfamiliar (red with red glow)

#### Scenario: Write format

- **WHEN** writing difficulty to Google Sheet column D
- **THEN** numbers are written as integers; `0` is written as an empty string

#### Scenario: Read format (backward compatibility)

- **WHEN** reading difficulty from column D
- **THEN** both numeric format and the legacy `*` symbol format are supported

### Requirement: Difficulty UI Display

The system SHALL display the difficulty level with stars and colour, applying special rules for negative values.

#### Scenario: Positive difficulty display

- **WHEN** `difficultyLevel > 0`
- **THEN** display `★N` where N is the difficulty number, coloured according to the scale

#### Scenario: Mastered display

- **WHEN** `difficultyLevel ≤ -999`
- **THEN** display `★✓` in green (the actual -999 number is not shown in the UI)

#### Scenario: Negative (reviewed) display

- **WHEN** `difficultyLevel` is between -1 and -998 inclusive
- **THEN** display `★0` in grey (the actual negative number is not shown in the UI; backend stores the real value)

### Requirement: Increase Difficulty

The system SHALL allow the user to increase the current word's difficulty by +1 via UI interaction.

#### Scenario: Normal increment

- **GIVEN** `difficultyLevel ≥ 0`
- **WHEN** the user clicks the difficulty indicator or presses S / F5 / Enter
- **THEN** difficulty increases by 1, up to a maximum of 10

#### Scenario: Negative to positive jump

- **GIVEN** `difficultyLevel < 0` (word was previously marked as familiar)
- **WHEN** the user increases difficulty
- **THEN** difficulty jumps directly to 1 (not +1)

#### Scenario: Increment blocked during pending removal

- **WHEN** the current word is in pending-removal state (`pendingRemoval` is true)
- **THEN** pressing S has no effect (to prevent accidental input)

#### Scenario: Backend sync on increase

- **WHEN** difficulty is increased
- **THEN** `updateWordDifficulty()` is called to write the new value to Google Sheet column D

### Requirement: Auto-Decrease Difficulty on Removal

The system SHALL automatically decrease difficulty by 1 when a word is confirmed removed (pending removal confirmed).

#### Scenario: Auto-decrement on confirm

- **WHEN** a word is confirmed removed from the current round
- **AND** the word's last review date is NOT today
- **THEN** difficulty decreases by 1 (minimum -999)

#### Scenario: No decrement if reviewed today

- **WHEN** the word's last review date is today
- **THEN** difficulty is NOT automatically decreased

#### Scenario: Immediate UI preview

- **WHEN** the user clicks the word card to mark it as pending removal
- **THEN** the difficulty display immediately shows the decremented value (not yet written to backend)
- **AND** if the user cancels the removal (R key or restore button), the display reverts to the original value

### Requirement: Mark as Very Familiar (D-Key Double-Confirm)

The system SHALL allow the user to mark a word as -999 (very familiar) using a two-press D-key confirmation flow.

#### Scenario: First D press

- **WHEN** the user presses D once
- **THEN** the timer and progress bar are paused
- **AND** a prompt "Press D again to mark as very familiar" is shown

#### Scenario: Second D press (within 3 seconds)

- **WHEN** the user presses D again within 3 seconds of the first press
- **THEN** the word enters pending-removal state (same visual behaviour as word-card click)
- **AND** the difficulty preview shows ✓
- **AND** a "✓ Marked as very familiar" toast appears
- **AND** a "Restore word" button is shown

#### Scenario: Confirm very-familiar on timer expiry

- **WHEN** the delay timer expires
- **THEN** the word is formally marked as -999
- **AND** the backend is updated immediately
- **AND** the word is removed from the current round

#### Scenario: Cancel very-familiar

- **WHEN** the user clicks "Restore word" or presses the left arrow before the timer expires
- **THEN** the mark is cancelled and the original difficulty is restored

#### Scenario: 3-second timeout (first press only)

- **WHEN** 3 seconds pass after the first D press without a second press
- **THEN** the operation is automatically cancelled
- **AND** the timer and progress bar resume

#### Scenario: Upgrade from pending-removal state

- **GIVEN** the word is already in pending-removal state from a word-card click
- **WHEN** the user presses D twice
- **THEN** the pending removal is upgraded: on expiry the word will be marked as -999 instead of normal removal

#### Scenario: Negative-filter special case

- **WHEN** the app is in negative-difficulty filter mode (showing very-familiar words)
- **THEN** pressing D twice sets difficulty to -999 and updates the display immediately (no pending-removal state)

### Requirement: Difficulty Filter

The system SHALL allow filtering the word pool to specific difficulty ranges.

#### Scenario: Filter options

- **WHEN** the user opens the difficulty filter modal
- **THEN** the available options are: All / ✓ Very familiar (mastered) / ★1+ / ★3+ / ★5+ / ★7+ / ★10 (most unfamiliar)

#### Scenario: Default exclusion of mastered words

- **WHEN** no difficulty filter is set
- **THEN** words with `difficultyLevel = -999` are excluded from the carousel and quiz
- **AND** words with `difficultyLevel` between -1 and -998 are included normally

#### Scenario: Filter with no matching words

- **WHEN** the applied filter yields zero words
- **THEN** a toast notification is shown
- **AND** the filter is reset to "All"
