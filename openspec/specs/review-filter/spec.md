# Review Filter Specification

## Purpose

Defines the set of filters that restrict which words appear in the carousel and quiz, including review-time filter, difficulty filter, must-spell filter, word-type filter, and tag filter. All filters are combinable (intersection logic).

## Requirements

### Requirement: Review Time Filter

The system SHALL allow filtering words by how long ago they were last reviewed.

#### Scenario: Filter options

- **WHEN** the user opens the review-time filter modal
- **THEN** the following options are available (each showing the matching word count):
  - All (no filter)
  - Never reviewed (column G is empty)
  - Not reviewed in 2+ weeks (G empty or date > 14 days ago)
  - Not reviewed in 1+ month (G empty or date > 30 days ago)
  - Not reviewed in 3+ months (G empty or date > 90 days ago)
  - Not reviewed in 6+ months (G empty or date > 180 days ago)

#### Scenario: Review date definition

- **WHEN** a word is confirmed removed (pending removal confirmed, including the "mark as very familiar" flow)
- **THEN** today's date is recorded as its last review date (column G, format `YYYY-MM-DD`)
- **AND** words that are revealed but NOT removed are not counted as reviewed

#### Scenario: Review date sync

- **WHEN** any of these events occurs:
  - User leaves the page (`beforeunload`)
  - User opens the menu
  - User opens any modal
  - 20 words have been reviewed since the last sync
- **THEN** accumulated review dates are batch-written to Google Sheet column G via `batchUpdateReviewDates()`

### Requirement: Difficulty Filter

The system SHALL allow filtering words by difficulty range.

#### Scenario: Difficulty filter options

- **WHEN** the user opens the difficulty filter modal
- **THEN** options are: All / ✓ Very familiar (mastered, -999) / ★1+ / ★3+ / ★5+ / ★7+ / ★10
- **AND** each option shows the matching word count

#### Scenario: Default difficulty exclusion

- **WHEN** no difficulty filter is active
- **THEN** words with `difficultyLevel = -999` are excluded from the carousel and quiz
- **AND** words with `difficultyLevel` between -1 and -998 are included normally

### Requirement: Must-Spell Filter

The system SHALL allow filtering to show only words marked as "must spell."

#### Scenario: Toggle behaviour

- **WHEN** the user clicks the must-spell filter button in the menu
- **THEN** the filter toggles on or off (no separate modal)
- **WHEN** enabled
- **THEN** only words with `mustSpell: true` are included in the carousel

### Requirement: Word Type Filter

The system SHALL allow filtering words by their grammatical/structural type.

#### Scenario: Type classification

- **WHEN** classifying a word's type
- **THEN** the English field is examined:
  - **Sentence**: ends with `.`, `?`, or `!` (after trimming whitespace; also handles quote-ending sentences)
  - **Phrase**: contains spaces but does not end with sentence-ending punctuation
  - **Word**: no spaces and does not end with sentence-ending punctuation

#### Scenario: Type filter options

- **WHEN** the user opens the type filter modal
- **THEN** three checkboxes are shown: word / phrase / sentence, each with a count
- **AND** all three are selected by default (no filtering)
- **AND** the user must select at least one type

#### Scenario: Filter with no matches

- **WHEN** the applied type filter yields zero words
- **THEN** a toast notification is shown and the filter is reset to "All"

### Requirement: Tag Filter

The system SHALL allow filtering words by their tags.

#### Scenario: Tag source

- **WHEN** displaying tag options
- **THEN** all unique tags from all loaded words (column H; split by `,` or `，`) are collected and sorted
- **AND** each tag shows its word count

#### Scenario: OR filter logic

- **WHEN** the user selects one or more tags
- **THEN** a word is included if it has ANY of the selected tags

#### Scenario: Empty state

- **WHEN** no loaded words have any tags
- **THEN** the tag filter modal displays "目前沒有任何標籤"

#### Scenario: No selection equals no filter

- **WHEN** no tags are selected
- **THEN** the tag filter is inactive (all words shown)

### Requirement: Filter Combination

The system SHALL apply all active filters simultaneously using intersection logic.

#### Scenario: Multiple filters active

- **WHEN** two or more filters are active
- **THEN** only words satisfying ALL active filter conditions are included in the carousel

#### Scenario: Filter application triggers reshuffle

- **WHEN** any filter is applied or changed
- **THEN** the word pool is reshuffled and the carousel restarts from the beginning of a new round

#### Scenario: Filter with no matches

- **WHEN** the combined filters yield zero words
- **THEN** a toast notification is shown
- **AND** the most recently changed filter is reset
