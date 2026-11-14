# Grammar Transformation Flashcards Specification

## Purpose

Defines the dedicated 100-card worksheet in `WordGo Data Sheet` for practising affirmative-to-negative and affirmative-to-question transformations with BE verbs (`am/is/are`) and auxiliary verbs (`do/does`).

## Data Model

### Worksheet: `文法句型轉換`

The worksheet lives in the built-in `WordGo Data Sheet` spreadsheet (`1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM`) and remains compatible with the existing A–I vocabulary schema.

| Column | Content |
|--------|---------|
| A | `0` (no must-spell marker; the dedicated mode always shows the prompt first) |
| B | Affirmative prompt followed by `(轉成否定句)` or `(轉成疑問句)` |
| C | Correct negative or question answer |
| H | Tags including `文法轉換` and the transformation category |
| J–L | Source words from `單字庫`, transformation category, and grammar rule (teacher reference) |

Cell A1 contains `100`.

## Requirements

### Requirement: Canonical 100-Card Dataset

The system SHALL provide exactly 100 grammar transformation cards sourced from vocabulary entries in the `單字庫` worksheet. It SHALL contain 25 BE-negative, 25 BE-question, 25 Do/Does-negative, and 25 Do/Does-question cards, with unique prompts and answers.

#### Scenario: Worksheet creation and verification

- **WHEN** `seedGrammarTransformationSheet_()` is run in Apps Script
- **THEN** it creates or replaces `文法句型轉換` inside `WordGo Data Sheet`, writes the canonical 100 rows, and sets A1 to `100`
- **AND** `getGrammarTransformationSheetStatus_()` reports the worksheet name, data-row count, and A1 count for verification.

### Requirement: Prompt-First Timed Reveal

The system SHALL treat grammar transformation cards as a dedicated two-phase flashcard mode. The affirmative prompt SHALL appear first; the negative or question answer SHALL appear only when the phase-1 timer completes at the 50% progress point. This mode SHALL override Chinese-first, mixed, carousel-memory, and listening display behaviour so the answer cannot be shown early.

#### Scenario: Timer crosses the halfway point

- **GIVEN** a grammar transformation card such as `He is from the USA. (轉成疑問句)`
- **WHEN** the card starts
- **THEN** the prompt is shown while the progress bar advances from 0% to 50%
- **WHEN** phase 1 completes
- **THEN** `Is he from the USA?` appears as the second side and the progress bar continues from 50% to 100%.

### Requirement: English Prompt and Answer Speech

The system SHALL read grammar transformation prompts and answers with the English voice. The Chinese transformation instruction SHALL remain visible but SHALL be omitted from prompt speech.

#### Scenario: Speech content

- **WHEN** a grammar transformation card enters phase 1
- **THEN** only the affirmative English sentence is spoken, without `(轉成否定句)` or `(轉成疑問句)`
- **WHEN** the answer appears in phase 2
- **THEN** the English negative sentence or question is spoken with the English voice.
