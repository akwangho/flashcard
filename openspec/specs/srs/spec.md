# SRS (Spaced Repetition System) Specification

## Purpose

Defines the 8-level Leitner Box algorithm, box transitions and intervals, due-date detection, the quick-review UI, and the review-priority ordering shared with the carousel. SRS data is device-local in LocalStorage key `flashcard-srs`, keyed by `sheetName:rowIndex` as `{ box: 1–8, nextReview: "YYYY-MM-DD" }` (never synced to Google Sheets).

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

The system SHALL assign a starting box when a word first enters SRS.

#### Scenario: Assignment by difficulty

- **WHEN** a word enters SRS for the first time
- **THEN** its initial box is 7 for difficulty `< 0` (very familiar), 4 for `= 0`, 2 for `1–3`, and 1 for `≥ 4` (very unfamiliar)

### Requirement: Box Transition and Interval Rules

The system SHALL adjust the box level and next-review interval based on difficulty at review time.

#### Scenario: Transitions and interval override

- **WHEN** a word is reviewed
- **THEN** `difficultyLevel ≤ 5` promotes the box by one level (max 8); `6–7` holds the box; `≥ 8` resets it to box 1
- **AND** `nextReview` is set 1 day from today when `difficultyLevel > 0`, to the box's standard interval when `= 0`, and to `min(365, ceil(12 × sqrt(|difficultyLevel|)))` days when `< 0` (e.g. -1 → ~12 days, -999 → ~365 days)

### Requirement: Due Date Detection

The system SHALL determine which words are due for review.

#### Scenario: Due word criteria

- **WHEN** a word has SRS data with `nextReview ≤ today`, or has no SRS data at all
- **THEN** it is considered due for review

### Requirement: SRS Update Triggers

The system SHALL update a word's SRS data when its difficulty changes.

#### Scenario: Trigger events

- **WHEN** a word's difficulty changes (increased, auto-decreased on removal, or marked very familiar)
- **THEN** its box and `nextReview` are recalculated
- **AND** merely recording a review date does NOT trigger a recalculation (avoids double box adjustments within one session)

### Requirement: Quick Review UI

The system SHALL provide a quick-review modal with statistics, a priority list, and a start button.

#### Scenario: Modal contents

- **WHEN** the quick-review modal is opened from the menu button (whose red circular badge shows the due/overdue count, capped at "99+")
- **THEN** the modal shows the total "共 N 個單字", review-progress bars for the last 3 days / 7 days / 2 weeks / 1 month (count + percentage each) plus never-reviewed, and a difficulty distribution (≤ -999 green, ★0 grey, ★1–2 gold, ★3–4 orange, ★5–6 dark orange, ★7–8 orange-red, ★9–10 red; zero-count categories skipped)
- **AND** preset quantity buttons: 10, 20, 30, 50, 100, and "全部 (N)"
- **AND** an expandable priority table lists rank, word, category, difficulty, and last-review date (max 300 px, internal scrolling, sticky header); category labels are 不熟/全新, SRS到期, 已熟悉, 未到期 — display-only, ordering comes from the score

### Requirement: Word Priority Ordering

The system SHALL sort words by a unified **review-priority score** combining unfamiliarity (`difficultyLevel`, column D) with staleness (`lastReviewDate`, column G); higher scores first. The same score drives the carousel order and quick-review selection.

#### Scenario: Review-priority score formula

- **WHEN** ordering words for review
- **THEN** each word's score = staleness + difficultyComponent, sorted descending, where `staleness` = days since `lastReviewDate` clamped to `[0, 365]` (never-reviewed words use 365)
- **AND** `difficultyComponent` = `difficultyLevel × 15` when positive, `difficultyLevel × 8` when negative (a penalty pushing familiar words down), and `0` when neutral

#### Scenario: Tie-breaking

- **WHEN** two words have the same score
- **THEN** in the carousel their order is randomised (light mixing, keeps multi-sheet words shuffled); in the quick-review priority list ties break deterministically by higher `difficultyLevel`, then older `lastReviewDate`, then English text

### Requirement: Review Session Flow

The system SHALL start a filtered carousel session when the user initiates quick review.

#### Scenario: Start and end

- **WHEN** the user selects a quantity and starts the review
- **THEN** the top N words by priority are selected, shuffled (to prevent same-sheet clustering), and shown in standard flashcard mode
- **AND** the active-filters indicator shows "📖 快速複習"; SRS mode ends when the user clears filters or starts a new round
