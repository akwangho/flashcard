# SRS (Spaced Repetition System) Specification

## Purpose

Defines the Leitner Box spaced-repetition algorithm, box-transition rules, due-date calculation, the quick-review UI, and the priority ordering of words for review sessions.

## Data Model

### SRS Entry (stored in `flashcard-srs` LocalStorage)

```javascript
{
  "sheetName:rowIndex": {
    box: Number,         // Leitner Box level 1–8
    nextReview: String   // Next review date "YYYY-MM-DD"
  }
}
```

> Keyed by `sheetName:rowIndex`. Device-local; not synced to Google Sheets.

## Requirements

### Requirement: Leitner Box Algorithm

The system SHALL implement an 8-level Leitner Box SRS with fixed review intervals.

#### Scenario: Box intervals

| Box | Review interval |
|-----|----------------|
| 1 | 1 day (new / very unfamiliar) |
| 2 | 2 days (rapid reinforcement) |
| 3 | 4 days (twice a week) |
| 4 | 7 days (weekly) |
| 5 | 14 days (bi-weekly) |
| 6 | 30 days (monthly) |
| 7 | 60 days (bi-monthly) |
| 8 | 120 days (quarterly; graduated) |

### Requirement: Initial Box Assignment

The system SHALL assign a starting box when a word enters SRS for the first time.

#### Scenario: Box assignment by difficulty

| Difficulty | Initial box |
|-----------|-------------|
| `< 0` (very familiar) | Box 7 (next review in 60 days) |
| `= 0` (no mark) | Box 4 (next review in 7 days) |
| `1–3` (slightly unfamiliar) | Box 2 (next review in 2 days) |
| `≥ 4` (very unfamiliar) | Box 1 (next review in 1 day) |

### Requirement: Box Transition Rules

The system SHALL advance or demote the box level based on difficulty at the time of review.

#### Scenario: Advance box (familiar)

- **WHEN** a word is reviewed and `difficultyLevel ≤ 5`
- **THEN** the box is promoted by one level (maximum box 8)

#### Scenario: Hold box (learning)

- **WHEN** a word is reviewed and `6 ≤ difficultyLevel ≤ 7`
- **THEN** the box level is unchanged

#### Scenario: Reset box (very unfamiliar)

- **WHEN** a word is reviewed and `difficultyLevel ≥ 8`
- **THEN** the box is reset to 1

### Requirement: Review Interval Override by Difficulty

The system SHALL override the standard box interval based on difficulty level.

#### Scenario: Difficult words reviewed daily

- **WHEN** `difficultyLevel > 0` (unfamiliar)
- **THEN** next review is set to 1 day from today (daily review until difficulty decreases)

#### Scenario: Standard interval for neutral words

- **WHEN** `difficultyLevel = 0`
- **THEN** next review uses the box's standard interval

#### Scenario: Extended interval for familiar words

- **WHEN** `difficultyLevel < 0` (familiar)
- **THEN** `interval = min(365, ceil(12 × sqrt(|difficultyLevel|)))` days
  - Example: -1 → ~12 days; -100 → ~120 days; -999 → ~365 days

### Requirement: Due Date Detection

The system SHALL determine which words are due for review.

#### Scenario: Due word criteria

- **WHEN** a word has SRS data with `nextReview ≤ today`
- **OR WHEN** a word has no SRS data at all
- **THEN** the word is considered due for review

### Requirement: SRS Update Triggers

The system SHALL update a word's SRS data when its difficulty changes.

#### Scenario: Trigger events

- **WHEN** difficulty is decreased (word confirmed removed → `decreaseDifficulty`)
- **OR WHEN** a word is marked as very familiar (`confirmMarkVeryFamiliar`)
- **OR WHEN** difficulty is increased (`increaseDifficulty`)
- **THEN** `updateSrsData()` is called for that word

#### Scenario: Review-date recording does NOT trigger SRS update

- **WHEN** `markWordAsReviewed()` is called (logs the review date)
- **THEN** `updateSrsData()` is NOT called, to avoid double box adjustments in a single review session

### Requirement: Quick Review UI

The system SHALL provide a quick-review modal with statistics, word priority list, and a start button.

#### Scenario: Due-badge count

- **WHEN** the SRS review button is shown in the menu
- **THEN** a red circular badge shows the count of due/overdue words (capped at "99+" for counts > 99)

#### Scenario: Statistics dashboard

- **WHEN** the SRS review modal is open
- **THEN** the following data is shown:
  - Total word count: "共 N 個單字"
  - **Review progress** (based on `lastReviewDate`):
    - Reviewed in last 3 days: count + percentage + green progress bar
    - Reviewed in last 7 days: count + percentage + progress bar
    - Reviewed in last 2 weeks: count + percentage + progress bar
    - Reviewed in last 1 month: count + percentage + progress bar
    - Never reviewed: count
  - **Difficulty distribution** (skipping zero-count categories):
    - Very familiar (≤ -999): green bar
    - ★0 (-998 ~ 0): grey bar
    - ★1–2: gold bar
    - ★3–4: orange bar
    - ★5–6: dark-orange bar
    - ★7–8: orange-red bar
    - ★9–10: red bar

#### Scenario: Quantity selection

- **WHEN** the user views the modal
- **THEN** preset quantity buttons are shown: 10, 20, 30, 50, 100, and "全部 (N)"

#### Scenario: Word priority list (collapsible)

- **WHEN** the user expands the priority list
- **THEN** a table shows rank, word, priority category, difficulty, and last-review date
- **AND** the table is limited to 300 px height with internal scrolling and a sticky header

### Requirement: Word Priority Ordering

The system SHALL sort words for review by a unified **review-priority score** that combines how unfamiliar a word is (`difficultyLevel`, sheet column D) with how long it has gone without review (`lastReviewDate`, sheet column G). Words with a higher score appear first. This same score drives both the normal carousel order and the quick-review selection.

#### Scenario: Review-priority score formula

- **WHEN** ordering words for review
- **THEN** each word's score is computed as `staleness + difficultyComponent` where:
  - `staleness` = days since `lastReviewDate`, clamped to `[0, MAX_STALENESS_DAYS]` (default 365); a word that was **never reviewed** (empty column G) uses `NEVER_REVIEWED_DAYS` (default 365)
  - `difficultyComponent` = `difficultyLevel × UNFAMILIAR_DAY_WEIGHT` (default 15) when `difficultyLevel > 0`
  - `difficultyComponent` = `difficultyLevel × FAMILIAR_DAY_WEIGHT` (default 8) when `difficultyLevel < 0` (a negative penalty, so very familiar words sink to the bottom)
  - `difficultyComponent` = 0 when `difficultyLevel = 0`
- **AND** words are sorted by score descending

#### Scenario: Stale + unfamiliar outranks recent + familiar

- **WHEN** comparing a word with a large `difficultyLevel` that has not been reviewed for a long time against a word with a small/negative `difficultyLevel` that was reviewed recently
- **THEN** the stale, unfamiliar word receives the higher score and appears first
- **AND** the recently-reviewed, low-difficulty word is pushed toward the back

#### Scenario: Tie-breaking

- **WHEN** two words have the same score in the carousel (`applyAllFilters` / `sortWordsByReviewPriority`)
- **THEN** their relative order is randomised (light mixing, also keeps multi-sheet words shuffled)
- **WHEN** two words have the same score in the quick-review priority list (`_buildPriorityList`)
- **THEN** ties break deterministically by decreasing `difficultyLevel`, then older `lastReviewDate` first, then English text, so the displayed list is stable

#### Scenario: Display category (priority list only)

- **WHEN** rendering the collapsible priority table
- **THEN** each row still shows a category label for context — 不熟/全新, SRS到期, 已熟悉, 未到期 — derived from SRS due state and review history
- **AND** the category is a label only; the row order is governed by the review-priority score, not the category

### Requirement: Review Session Flow

The system SHALL start a filtered carousel session when the user initiates quick review.

#### Scenario: Start review

- **WHEN** the user selects a quantity and clicks "Start review"
- **THEN** the top N words (by priority order) are selected
- **AND** they are shuffled (to prevent same-sheet clustering)
- **AND** the carousel starts in standard flashcard mode with this filtered word set

#### Scenario: SRS mode indicator

- **WHEN** the SRS review session is active
- **THEN** the active-filters indicator shows "📖 快速複習"

#### Scenario: SRS mode end

- **WHEN** the user clears all filters or starts a new round
- **THEN** SRS review mode ends automatically
