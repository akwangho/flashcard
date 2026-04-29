# Flashcard Core Specification

## Purpose

Defines the auto-carousel flashcard loop, display modes, word-card interaction (click to reveal/remove), navigation (previous/next), and the pending-removal undo mechanism. This capability is the primary learning loop of the application.

## Data Model

### Word Object

```javascript
{
  id: Number,                // Unique identifier (assigned sequentially on load)
  english: String,           // English word (from column B)
  chinese: String,           // Chinese translation (from column C)
  difficultyLevel: Number,   // Difficulty level -999~10 (column D; negative = very familiar)
  image: String,             // Image URL (column E)
  imageFormula: String,      // Image display formula (column F)
  lastReviewDate: String,    // Last review date 'YYYY-MM-DD' (column G; empty = never reviewed)
  mustSpell: Boolean,        // Must-spell flag (column A)
  tags: Array,               // Tags array (column H; comma-separated)
  sheetName: String,         // Source sheet name
  originalRowIndex: Number   // 1-based row index in source sheet
}
```

## Requirements

### Requirement: Auto-Carousel Word Display

The system SHALL automatically cycle through word cards, displaying the first language, then the second language after a configurable delay, then advancing to the next word.

#### Scenario: Standard carousel cycle

- **WHEN** the carousel is running
- **THEN** the system displays the first language (100 ms fade-in animation)
- **AND** waits the configured delay time (1–10 s, default 4.5 s, step 0.5 s)
- **AND** displays the second language (fade-in) simultaneously with any associated image
- **AND** waits the delay time again
- **AND** automatically advances to the next word

#### Scenario: Round completion and reshuffle

- **WHEN** the last word in the current round is displayed
- **THEN** the system reshuffles all qualifying words (Fisher-Yates algorithm)
- **AND** starts a new round from the beginning

#### Scenario: Post-filter reshuffle

- **WHEN** words are loaded from multiple sheets or filters are applied
- **THEN** the system reshuffles the filtered result to mix words from different sheets evenly

#### Scenario: Word load failure fallback

- **WHEN** all selected sheets fail to load (error, timeout, or zero words)
- **THEN** the system does not show an error screen
- **AND** automatically opens the sheet-settings modal so the user can reselect sheets

### Requirement: Display Modes

The system SHALL support three display modes controlling which language appears first on each card.

#### Scenario: English-first mode (default)

- **WHEN** display mode is `english-first`
- **THEN** English is shown in phase 1, Chinese translation in phase 2

#### Scenario: Chinese-first mode

- **WHEN** display mode is `chinese-first`
- **THEN** Chinese translation is shown in phase 1, English in phase 2

#### Scenario: Mixed mode

- **WHEN** display mode is `mixed`
- **THEN** each card independently decides its order with 50% probability
- **AND** the chosen order remains consistent for the full display cycle of that card

#### Scenario: Must-spell forced Chinese first

- **GIVEN** display mode is `mixed`
- **AND** the general setting `mustSpellChineseFirst` is `true`
- **WHEN** a word has `mustSpell: true`
- **THEN** that word is always shown Chinese-first (to prompt the learner to recall the spelling)

### Requirement: Smart Timer

The system SHALL optionally adjust the phase-2 wait time based on text length when smart timer is enabled.

#### Scenario: Smart timer for Chinese as second language

- **WHEN** smart timer is enabled and the second language is Chinese
- **THEN** `smartDelay = max(1.2, 1.0 + charCount × 0.15)` seconds, capped at `delayTime`
  - Constants: `SMART_TIMER_BASE_TIME` (1.0), `SMART_TIMER_PER_CHAR_TIME` (0.15), `SMART_TIMER_MIN_TIME` (1.2)

#### Scenario: Smart timer for English as second language

- **WHEN** smart timer is enabled and the second language is English
- **THEN** `smartDelay = min(delayTime, max(1.2, 0.5 + letterCount × 0.3))` seconds
  - Only a–z / A–Z count as letters (spaces and hyphens excluded)

#### Scenario: Smart timer suppression

- **WHEN** the word has `mustSpell: true` AND `difficultyLevel > 0` (both conditions simultaneously)
- **OR WHEN** `difficultyLevel ≥ 3`
- **THEN** the full `delayTime` is used regardless of text length

### Requirement: Timer Progress Bar

The system SHALL display a horizontal progress bar at the top of the screen that visually indicates time remaining in each phase.

#### Scenario: Two-phase animation

- **WHEN** phase 1 begins (first language shown)
- **THEN** the progress bar grows from 0% to 50% over `delayTime` seconds
- **WHEN** 50% is reached
- **THEN** the second language appears and phase 2 begins
- **THEN** the bar grows from 50% to 100% over the phase-2 delay duration
- **WHEN** 100% is reached
- **THEN** the system advances to the next word

#### Scenario: Progress bar interactions

- **WHEN** the user clicks the word card (pending removal)
- **THEN** the bar jumps to 50% and phase 2 starts immediately
- **WHEN** the user triggers prev/next navigation
- **THEN** the bar resets to 0% for the new word's phase 1

#### Scenario: Pause/resume accuracy

- **WHEN** the carousel is paused
- **THEN** the bar freezes at its current position
- **WHEN** the carousel resumes
- **THEN** the bar continues from the frozen position using the remaining time, with no speed drift from repeated pause/resume cycles

#### Scenario: Visibility toggle

- **WHEN** the user disables "show timer progress bar" in general settings
- **THEN** the progress bar is hidden

### Requirement: Word Card Click Interaction

The system SHALL treat a tap/click on the word card as a "pending removal" action.

#### Scenario: Reveal and mark for removal

- **GIVEN** the second language has not yet been shown
- **WHEN** the user clicks the word card
- **THEN** the second language and image are shown immediately
- **AND** the word text is styled as pending removal (greyed with visible outline)
- **AND** a "Restore word" button appears

#### Scenario: Confirm removal on timer expiry

- **WHEN** the delay timer expires while the word is in pending-removal state
- **THEN** the word is removed from the current round (added to `removedWords`)
- **AND** the carousel advances to the next word

#### Scenario: Cancel pending removal

- **WHEN** the user clicks the "Restore word" button before the timer expires
- **THEN** the pending removal is cancelled
- **AND** normal playback resumes

#### Scenario: Single-word guard

- **WHEN** only 1 word remains in the current round
- **AND** the user clicks the word card
- **THEN** the card flashes red to indicate removal is not possible
- **AND** no removal is queued

### Requirement: Word Removal and Round Restoration

The system SHALL manage a removed-words pool that resets each round.

#### Scenario: Removal tracking

- **WHEN** a word is confirmed removed
- **THEN** it is stored in `removedWords` and excluded from the current round

#### Scenario: Round restoration

- **WHEN** a new round begins
- **THEN** all previously removed words are restored to the word pool

### Requirement: Confirmed-Removal Undo (Single-Use)

The system SHALL allow a one-time undo of the most recently confirmed removal via the previous-word action, under strict conditions.

#### Scenario: Eligible undo

- **GIVEN** the most recent word was removed via confirmed pending-removal (snapshot stored in `removalUndoEntry`)
- **WHEN** the user presses ← / ↑ or the "Previous" button
- **THEN** the confirmed removal is undone (word restored with original difficulty, review mark, SRS data, and round position)
- **AND** the `removalUndoEntry` snapshot is cleared (undo is available only once)

#### Scenario: Undo ineligibility

- **WHEN** the user navigates to a further word without removing the current one
- **THEN** the undo snapshot is cleared
- **AND** the previous-word action falls back to normal history navigation

### Requirement: Previous / Next Navigation

The system SHALL allow the user to manually navigate to the previous or next word.

#### Scenario: Previous word (priority order)

- **WHEN** the user triggers the "previous" action
- **THEN** the system checks in order:
  1. If current word is in pending-removal state → cancel the removal
  2. Else if `removalUndoEntry` exists and `isRemovalUndoEligible()` is true → undo confirmed removal
  3. Otherwise → pop the previous state from the navigation history stack (includes word index and the word sequence at that step)

#### Scenario: Next word

- **WHEN** the user triggers the "next" action
- **THEN** the current timer is stopped and the carousel advances immediately

#### Scenario: Auto-wrap

- **WHEN** the user navigates past the last word
- **THEN** the carousel wraps to the first word

### Requirement: Progress Indicator

The system SHALL display a word count indicator showing current position within the round.

#### Scenario: Progress text format

- **WHEN** a word is displayed
- **THEN** a progress indicator shows `<current>/<total>` (e.g., `3/25`)

### Requirement: Must-Spell Indicator

The system SHALL display a visual indicator when the current word requires spelling practice.

#### Scenario: Indicator visibility

- **WHEN** the current word has `mustSpell: true`
- **THEN** a "✍️要會拼" indicator is shown in the progress area regardless of display mode

### Requirement: Quick Timer Dock

The system SHALL provide a collapsible panel on the main screen for adjusting delay time and smart timer without opening the full settings modal.

#### Scenario: Desktop hover expand

- **WHEN** the user hovers over the left-edge hot zone (~26 px wide) on a pointer/hover device
- **THEN** the quick timer panel expands
- **WHEN** the cursor leaves both the hot zone and the panel
- **THEN** the panel collapses after ~320 ms delay

#### Scenario: Touch expand/collapse

- **WHEN** the device has no hover capability (touch/coarse pointer)
- **THEN** a small "⏱" button is shown at the left edge
- **WHEN** the user taps the button
- **THEN** the panel toggles open/closed
- **WHEN** the panel is open and the user taps outside
- **THEN** the panel collapses

#### Scenario: Settings sync

- **WHEN** the user changes delay time or smart timer in the quick timer dock
- **THEN** the change is written to `flashcard-settings` in LocalStorage
- **AND** the general settings modal reflects the updated value (bidirectional sync)

#### Scenario: Click exclusion

- **WHEN** the user interacts with the quick timer dock area
- **THEN** the word-card click (pending removal) is NOT triggered
