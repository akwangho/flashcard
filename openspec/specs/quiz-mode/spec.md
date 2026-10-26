# Quiz Mode Specification

## Purpose

Defines the quick and full quiz modes, question generation, the answer flow, scoring messages, and wrong-answer review.

## Requirements

### Requirement: Quiz Types

The system SHALL provide a quick quiz of up to 10 questions and a full quiz covering all available words.

#### Scenario: Quick quiz

- **GIVEN** at least 3 words are available
- **WHEN** the user starts a quick quiz
- **THEN** up to 10 words are randomly selected from the current pool (all available words when fewer than 10) and the carousel pauses automatically
- **AND** with fewer than 3 words the quiz cannot start and a notification is shown

#### Scenario: Full quiz

- **WHEN** the user starts a full quiz
- **THEN** all available words (after filters) form the question pool

### Requirement: Question Generation

The system SHALL generate 4-option questions with randomly mixed directions.

#### Scenario: Types and options

- **WHEN** each question is generated
- **THEN** its direction is randomly `en-zh` (EN → ZH) or `zh-en` (ZH → EN), 50% each
- **AND** the 4 options are 1 correct + 3 random wrong answers drawn from the current filtered word pool (temporarily-removed words excluded), with no duplicates, generic fallbacks when fewer than 3 distinct wrong options exist, and random display order

### Requirement: Quiz Flow

The system SHALL guide the user through start, answer, and results screens.

#### Scenario: Screens

- **WHEN** the quiz runs
- **THEN** a start screen shows quiz type, question count, and scope; each question shows its text with 4 option buttons and a "Next question" action; the results screen shows percentage score, correct/wrong counts, an encouraging message, and the wrong answers for review

#### Scenario: Answer feedback

- **WHEN** the user selects the correct option
- **THEN** a green border and a ✅ 答對了！ indicator appear
- **WHEN** the user selects a wrong option
- **THEN** a red border and a ❌ 答錯了！ indicator appear and the correct answer is highlighted

### Requirement: Score Messages

The system SHALL display a performance message based on the final percentage score.

#### Scenario: Encouragement messages

- **WHEN** the final percentage score is computed
- **THEN** the message shown is: ≥90 → "太棒了！你是英文單字小高手！🏆" / 80–89% → "很好！你的英文單字掌握得不錯！👍" / 70–79% → "不錯哦！繼續努力就會更棒！💪" / 60–69% → "還可以！多多練習會進步的！📚" / <60 → "加油！多讀多練習一定會進步的！🌟"

### Requirement: Wrong-Answer Review

The system SHALL list wrong answers after the quiz and increase their difficulty.

#### Scenario: Display and difficulty increase

- **WHEN** the results screen is shown
- **THEN** each wrong answer entry shows the word (English), the user's wrong answer, and the correct answer
- **AND** each incorrectly answered word's `difficultyLevel` is immediately increased by +1 at answer time (capped at ★10; forced-review ★100 words are unchanged)

### Requirement: Quiz Scope Indicator

The system SHALL display which words the current quiz covers.

#### Scenario: Scope text

- **WHEN** the quiz screen is shown
- **THEN** the scope line reads "📗 測驗範圍：所有單字（N 題）" by default; "📚 測驗範圍：⭐ ★N 以上（N 題）" with a difficulty filter ("📚 測驗範圍：⭐ 非常熟（已掌握）（N 題）" for the very-familiar filter; other active filters append · -joined parts); or "📖 測驗範圍：剩餘單字（N 題，已排除 X 個）" when words were removed from the round

#### Scenario: Removed words stay out of the pool

- **WHEN** words have been temporarily removed this round and the user starts a quiz
- **THEN** the question pool applies all filters and additionally excludes every temporarily-removed word, so removed words are never asked (the listening and SRS quick-review pools share the same exclusion)
- **AND** when every word is removed, starting a quiz shows the "所有單字都已被暫時移除" message instead of an empty quiz
