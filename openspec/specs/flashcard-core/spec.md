# Flashcard Core Specification

## Purpose

The primary learning loop: auto-carousel, display modes, smart timer, word-card interaction (click to reveal/remove), pending-removal undo, navigation, and progress indicators.

## Data Model

### Word Object (referenced by all other specs)

| Field | Column | Meaning |
|-------|--------|---------|
| `id` | — | Unique id, assigned sequentially on load |
| `english` | B | English word |
| `chinese` | C | Chinese translation |
| `difficultyLevel` | D | Difficulty -999~10 (negative = very familiar) |
| `image` / `imageFormula` | E / F | Image URL / image display formula |
| `lastReviewDate` | G | 'YYYY-MM-DD'; empty = never reviewed |
| `mustSpell` | A | 0 none · 1 衝刺要會拼單字 (sprint) · 0.5 隨機要會拼單字 (random) · -1 看懂就好 (understand-only) |
| `tags` | H | Comma-separated tags array |
| `sheetName` / `originalRowIndex` | — | Source sheet name / 1-based row index |

## Requirements

### Requirement: Auto-Carousel Word Display

The system SHALL display the first language (0.1 s fade-in), then the second language together with its image after the configured delay (1–10 s, default 4.5 s, step 0.5 s), then advance automatically.

#### Scenario: Reordering and failure fallback

- **WHEN** a round completes, words load from multiple sheets, or filters change
- **THEN** the pool is reordered by the review-priority score (see `srs/spec.md`), equal scores randomised so words mix evenly, and a new round starts
- **WHEN** all selected sheets fail (error, timeout, or zero words)
- **THEN** no error screen is shown; the sheet-settings modal opens for reselection

### Requirement: Display Modes

The system SHALL support `english-first` (default), `chinese-first`, and `mixed` (each card independently 50/50, consistent for its whole display cycle). With `mustSpellChineseFirst` enabled in mixed mode: `mustSpell` = 1 → always Chinese-first; 0.5 → stays random; -1 → always English-first, overriding the sprint rule.

#### Scenario: Mixed-mode rules

- **WHEN** display mode is `mixed` with `mustSpellChineseFirst` enabled
- **THEN** `mustSpell` 1 → Chinese-first · 0.5 → random · -1 → English-first (overrides the sprint rule)

### Requirement: Smart Timer

The system SHALL, when smart timer is enabled, replace the phase-2 delay with `smartDelay` for Chinese `max(1.2, 1.0 + chars × 0.15)` and for English `min(delayTime, max(1.2, 0.5 + letters × 0.3))` (only a–z/A–Z count), and SHALL use the full `delayTime` regardless of length when (`mustSpell` is 1 or 0.5 AND `difficultyLevel > 0`) or `difficultyLevel ≥ 3` (`mustSpell` = -1 does not count as must-spell here).

#### Scenario: Example

- **WHEN** smart timer is enabled with delay 4.5 s and a 4-char Chinese translation in phase 2
- **THEN** phase 2 waits max(1.2, 1.0 + 4 × 0.15) = 1.6 s; a word with `difficultyLevel ≥ 3` waits the full 4.5 s

### Requirement: Display Text Normalization

All on-card text rendering SHALL pass through `displayTextFor(word, lang)`: trims surrounding whitespace and normalizes full-width spaces (U+3000) to half-width. Display-layer only — the word object and sheet data are never modified.

#### Scenario: Whitespace-only translation

- **WHEN** a word's translation is whitespace-only (e.g. blank translation used to learn with a custom image)
- **THEN** the element text is set to `''` and gets the `word-empty` class, removing the background box/blur/padding/radius (the element is not `display:none`, so the 0.5 s fade-in still plays for the next real translation)
- **AND** the class is removed as soon as non-empty text displays again

### Requirement: Timer Progress Bar

The system SHALL show a top progress bar (toggleable in general settings) growing 0%→50% over phase 1, then 50%→100% over phase 2.

#### Scenario: Interactions

- **WHEN** the card is clicked early (pending removal)
- **THEN** the bar jumps to 50% and phase 2 starts immediately
- **WHEN** prev/next navigation happens, the bar resets to 0% for the new word
- **WHEN** paused, the bar freezes at its position; on resume it continues with the remaining time, with no drift from repeated pause/resume cycles

### Requirement: Word Card Click Interaction

The system SHALL treat a tap on the word card as a pending-removal action.

#### Scenario: Reveal, confirm, or cancel

- **GIVEN** the second language has not yet been shown
- **WHEN** the user clicks the card
- **THEN** the second language and image show immediately, the text greys out with a visible outline, and a Restore word button appears
- **WHEN** the delay timer expires in this state, the word is removed from the round (added to `removedWords`, excluded from the current round) and the carousel advances; clicking Restore before expiry cancels the removal and resumes normal playback
- **AND** all removed words are restored when the next round begins
- **AND** when only 1 word remains in the round, the card flashes red and no removal is queued

### Requirement: Previous / Next Navigation

The system SHALL support manual navigation. Next stops the timer and advances immediately (wrapping past the last word). Previous checks in order: cancel pending removal → single-use removal undo → pop the navigation history stack (word index and word sequence at that step).

#### Scenario: Single-use removal undo

- **GIVEN** the most recent word was confirmed-removed (snapshot stored in `removalUndoEntry`)
- **WHEN** the user presses ← / ↑ or the Previous button
- **THEN** the word is restored with original difficulty, last review date, review mark, SRS data, and round position; the previous `lastReviewDate` is written back to column G via `batchUpdateReviewDates()` (empty string when never reviewed) so in-flight or already-flushed syncs are rolled back; the snapshot is cleared (undo available only once)
- **WHEN** the user navigates to a further word without removing the current one
- **THEN** the snapshot clears and Previous falls back to normal history navigation

#### Scenario: Priority order

- **WHEN** the user triggers Previous while the current word is pending-removal
- **THEN** the removal is cancelled first; the undo and history-stack paths apply only when no removal is pending

### Requirement: Progress Indicators

The system SHALL display `<current>/<total>` (e.g. `3/25`) in the progress area, plus a ✍️要會拼 badge (sky-blue) for `mustSpell` 1/0.5 and a 👁英翻中 badge (amber) for -1 (never both; neither for 0/empty).

#### Scenario: Position and badges

- **WHEN** word 3 of 25 is displayed with `mustSpell` 0.5
- **THEN** the progress area shows `3/25` and a ✍️要會拼 badge (👁英翻中 instead when `mustSpell` is -1; no badge when 0/empty)

### Requirement: Quick Timer Dock

The system SHALL provide a collapsible left-edge panel adjusting delay time and smart timer without the full settings modal: a ~26 px hover hot zone expands it on pointer devices (collapsing ~320 ms after the cursor leaves); a ⏱ button toggles it on touch devices (tap outside collapses). Changes sync bidirectionally with `flashcard-settings` in localStorage and the settings modal, and dock interactions never trigger the word-card pending-removal click.

#### Scenario: Expand and sync

- **WHEN** the user hovers the left-edge hot zone (pointer device) or taps ⏱ (touch device)
- **THEN** the dock expands and adjusts delay time / smart timer with live sync to localStorage and the settings modal
