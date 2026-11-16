# Grammar Transformation Flashcards Specification

## Purpose

Defines the dedicated 200-card worksheet in `WordGo Data Sheet` for practising mixed sentence-form transformations with BE verbs (`am/is/are`) and auxiliary verbs (`do/does`). Prompts may be affirmative, negative, or interrogative; each card asks for one specific target form. The worksheet also supplies a configurable share of grammar cards in normal and quick-review pools.

## Data Model

### Worksheet: `文法句型轉換`

The worksheet lives in the built-in `WordGo Data Sheet` spreadsheet (`1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM`) and remains compatible with the existing A–I vocabulary schema.

| Column | Content |
|--------|---------|
| A | `0` (no must-spell marker; the dedicated mode always shows the prompt first) |
| B | Affirmative, negative, or question prompt followed by `(轉成否定句)`, `(轉成疑問句)`, or `(轉成肯定句)` |
| C | One correct target-form answer; no paired contracted/expanded alternatives |
| H | Tags including `文法轉換` and the transformation category |
| J–L | Source words from `單字庫`, transformation category, and grammar rule (teacher reference) |

Cell A1 contains `200`.

## Requirements

### Requirement: Canonical 200-Card Mixed Dataset

The system SHALL provide exactly 200 grammar transformation cards sourced from vocabulary entries in the `單字庫` worksheet. It SHALL use 50 base sentences, each represented in four transformation directions: affirmative→negative, affirmative→question, negative→question, and question→affirmative. It SHALL contain 100 BE cards and 100 Do/Does cards, with 50 cards in each transformation direction. Complete prompts, including their instructions, SHALL be unique.

Each answer SHALL contain exactly one grammatical form. Negative answers SHALL mix contracted and expanded forms rather than displaying both alternatives together.

#### Scenario: Worksheet creation and verification

- **WHEN** `seedGrammarTransformationSheet_()` is run in Apps Script
- **THEN** it creates or replaces `文法句型轉換` inside `WordGo Data Sheet`, writes the canonical 200 rows, and sets A1 to `200`
- **AND** `getGrammarTransformationSheetStatus_()` reports the worksheet name, data-row count, and A1 count for verification.

### Requirement: Prompt-First Timed Reveal

The system SHALL treat grammar transformation cards as a dedicated two-phase flashcard mode. The supplied prompt SHALL appear first regardless of whether it is affirmative, negative, or interrogative; the target-form answer SHALL appear only when the phase-1 timer completes at the 50% progress point. This mode SHALL override Chinese-first, mixed, carousel-memory, and listening display behaviour so the answer cannot be shown early.

#### Scenario: Timer crosses the halfway point

- **GIVEN** a grammar transformation card such as `Is he from the USA? (轉成肯定句)`
- **WHEN** the card starts
- **THEN** the question prompt is shown while the progress bar advances from 0% to 50%
- **WHEN** phase 1 completes
- **THEN** `He is from the USA.` appears as the second side and the progress bar continues from 50% to 100%.

### Requirement: English Prompt and Answer Speech

The system SHALL read grammar transformation prompts and answers with the English voice. The Chinese transformation instruction SHALL remain visible but SHALL be omitted from prompt speech.

#### Scenario: Speech content

- **WHEN** a grammar transformation card enters phase 1
- **THEN** only the supplied English sentence is spoken, without `(轉成否定句)`, `(轉成疑問句)`, or `(轉成肯定句)`
- **WHEN** the answer appears in phase 2
- **THEN** the English target form is spoken with the English voice.

### Requirement: Answer Grammar Annotation

When automatic grammar annotation is enabled, the system SHALL apply the same main-verb, auxiliary-verb, and BE-verb colouring to the English answer when it appears in phase 2. The answer text SHALL remain unchanged, and the annotation toggle SHALL continue to control both prompts and answers.

#### Scenario: Annotated English answer

- **GIVEN** grammar annotation is enabled and a grammar transformation card has the answer `They have finished the work.`
- **WHEN** the phase-2 answer appears
- **THEN** `have` is coloured as an auxiliary verb and `finished` is coloured as a main verb.
- **WHEN** grammar annotation is disabled
- **THEN** the answer appears as plain text without grammar-role colour spans.

### Requirement: Question-and-Answer Editing Compatibility

The system SHALL load grammar cards through the same worksheet and word-object path as other vocabulary cards. Column B SHALL represent the question/prompt and column C SHALL represent the English answer. Editing a grammar card SHALL save both values back to those columns and SHALL use question/answer labels instead of vocabulary/translation labels.

#### Scenario: Edit a grammar card

- **GIVEN** a card loaded from `文法句型轉換`
- **WHEN** the edit modal opens
- **THEN** the primary fields are labelled `題目` and `答案`, while fields irrelevant to complete sentences are hidden
- **WHEN** the edited values are saved
- **THEN** the prompt is written to column B and the English answer is written to column C using the existing sheet-update API.

### Requirement: Configurable Grammar Review Share

The system SHALL provide a persisted grammar-review ratio setting from 0% to 100%, defaulting to 5%. The dedicated grammar worksheet SHALL be loaded from `WordGo Data Sheet` regardless of which other worksheets the user selects. For each carousel or quick-review pool, the grammar quota SHALL be calculated independently from the original normal-card count, rounded up, and capped by the available grammar cards. The forced-review quota SHALL also use that same original normal-card count without including grammar cards in its own calculation basis. Grammar cards SHALL be selected from the complete grammar source so ordinary difficulty, review-time, type, and tag filters cannot remove them, and SHALL be interleaved among normal cards. A ratio of 0% SHALL exclude grammar cards; a ratio of 100% SHALL add one grammar card per original normal card.

#### Scenario: Default 5% ratio with restrictive filters

- **GIVEN** 100 normal cards that pass the current filters and 200 grammar cards available from the dedicated worksheet
- **WHEN** a review pool is built with the default grammar-review ratio and no forced-review cards
- **THEN** 5 grammar cards are added, giving 105 cards in total
- **AND** the grammar cards appear at distributed positions rather than as one block.

#### Scenario: Forced-review and grammar quotas use the same original base

- **GIVEN** a quick review requesting 100 normal cards, a forced-review ratio of 10%, and a grammar-review ratio of 5%
- **WHEN** the review pool is built
- **THEN** 10 forced-review cards and 5 grammar cards are added independently from the original 100 normal cards
- **AND** the pool contains exactly 115 cards.

#### Scenario: Quick review keeps its normal-card quantity

- **GIVEN** a quick review requesting 10 normal cards
- **WHEN** the pool is built with the default grammar-review ratio
- **THEN** the 10 normal-card slots are preserved and one grammar card is added outside those slots.
