# Review Filter Specification

## Purpose

Defines the filters restricting which words appear in the carousel and quiz: review-time, difficulty, must-spell, word-type, and tag. All active filters combine via intersection logic, except forced-review words (difficulty 100), which always bypass filters.

## Requirements

### Requirement: Review Time Filter

The system SHALL allow filtering words by how long ago they were last reviewed (Sheet column G; empty = never reviewed).

#### Scenario: Filter options and review dates

- **WHEN** the user opens the review-time filter modal
- **THEN** these options are available, each showing its matching word count: All / Never reviewed (column G empty) / Not reviewed in 2+ weeks / 1+ month / 3+ months / 6+ months (G empty or date > 14 / 30 / 90 / 180 days ago)
- **AND** a word counts as reviewed only when its removal is confirmed (including the mark-as-very-familiar flow): today's date is written to column G as `YYYY-MM-DD`, batch-synced on page unload, menu open, pause, when ≤ 3 words remain in the round, or every 20 reviewed words; revealed-but-not-removed words never count

### Requirement: Difficulty Filter

The system SHALL allow filtering words by difficulty range.

#### Scenario: Filter options and default exclusion

- **WHEN** the user opens the difficulty filter modal
- **THEN** the options are All / ✓ Very familiar (mastered, -999) / ★1+ / ★3+ / ★5+ / ★7+ / ★10, each showing its matching word count; with no filter active, -999 words are excluded from the carousel and quiz while words from -1 to -998 are included normally

### Requirement: Must-Spell Filter

The system SHALL allow filtering to only words with a must-spell level (`mustSpell` semantics: see `flashcard-core/spec.md`).

#### Scenario: Toggle

- **WHEN** the user clicks the must-spell filter button in the menu
- **THEN** the filter toggles on or off with no separate modal; when enabled, only words with `mustSpell > 0` are included in the carousel

### Requirement: Word Type Filter

The system SHALL allow filtering words by grammatical type: word, phrase, or sentence.

#### Scenario: Classification and options

- **WHEN** the type filter modal is opened
- **THEN** each word is classified from its English field as sentence (ends `.`/`?`/`!` after trimming), phrase (has spaces, no sentence-ending punctuation), or word (otherwise — semicolon/slash-separated word-form lists like `swing; swung; swung` or `woman / women` count as word), shown as three checkboxes — word / phrase / sentence, each with a count — all selected by default
- **AND** at least one type must remain selected

### Requirement: Tag Filter

The system SHALL allow filtering words by tags (column H, split by `,` or `，`).

#### Scenario: OR logic and empty state

- **WHEN** the user selects one or more tags
- **THEN** a word is included if it has ANY selected tag; all unique tags from loaded words are listed sorted, each with its word count
- **AND** with no tags selected the filter is inactive (all words shown); when no loaded words have tags, the modal displays "目前沒有任何標籤"

### Requirement: Forced Review Override

The system SHALL always load every word whose difficulty is 100, regardless of the active filters, and SHALL exclude those words from filter counts and statistics.

#### Scenario: Extra words beyond the filtered set

- **WHEN** any filter combination is applied and the pool contains forced-review words
- **THEN** the filtered normal words are returned plus ALL forced-review words, even if they fail the difficulty, review-time, must-spell, type, or tag filters (e.g. 100 filtered normal words + 3 forced-review words = 103 words loaded)
- **AND** the filter-option counts (`countWordsForFilter`, `countWordsForDifficultyFilter`) and SRS statistics count normal words only, so forced-review words do not change those numbers
- **AND** the `★-` display indicates a forced-review word is excluded from statistics

### Requirement: Filter Combination

The system SHALL apply all active filters simultaneously using intersection logic.

#### Scenario: Combination, reordering, and no matches

- **WHEN** two or more filters are active
- **THEN** only words satisfying ALL conditions are included, reordered by review-priority score with equal scores randomised (see `srs/spec.md`), and the carousel restarts from the beginning
- **AND** if the filters yield zero words, an alert dialog is shown; the four modal filters reset the changed filter, while the must-spell toggle resets all filters (its empty pool routes through the new-round restart)
