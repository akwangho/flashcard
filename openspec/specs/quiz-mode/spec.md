# Quiz Mode Specification

## Purpose

Defines the quick and full quiz modes, question generation, the answer flow, scoring messages, and wrong-answer review.

## Requirements

### Requirement: Quiz Types

The system SHALL provide a 10-question quick quiz and a full quiz covering all available words.

#### Scenario: Quick quiz

- **GIVEN** at least 3 words are available
- **WHEN** the user starts a quick quiz
- **THEN** 10 words are randomly selected from the current pool and the carousel pauses automatically
- **AND** with fewer than 3 words the quiz cannot start and a notification is shown

#### Scenario: Full quiz

- **WHEN** the user starts a full quiz
- **THEN** all available words (after filters) form the question pool

### Requirement: Question Generation

The system SHALL generate 4-option questions with randomly mixed directions.

#### Scenario: Types and options

- **WHEN** each question is generated
- **THEN** its direction is randomly `en-zh` (EN → ZH) or `zh-en` (ZH → EN), 50% each
- **AND** the 4 options are 1 correct + 3 random wrong answers drawn from all loaded words, with no duplicates, generic fallbacks when fewer than 3 distinct wrong options exist, and random display order

### Requirement: Quiz Flow

The system SHALL guide the user through start, answer, and results screens.

#### Scenario: Screens

- **WHEN** the quiz runs
- **THEN** a start screen shows quiz type, question count, and scope; each question shows its text with 4 option buttons and a "Next question" action; the results screen shows percentage score, correct/wrong counts, an encouraging message, and the wrong answers for review

#### Scenario: Answer feedback

- **WHEN** the user selects the correct option
- **THEN** a green border and ✅ "Correct!" indicator appear
- **WHEN** the user selects a wrong option
- **THEN** a red border and ❌ "Wrong!" indicator appear and the correct answer is highlighted

### Requirement: Score Messages

The system SHALL display a performance message based on the final percentage score.

#### Scenario: Encouragement messages

- **WHEN** the final percentage score is computed
- **THEN** the message shown is: 100% → "滿分！太厲害了！你完全掌握了這些單字！" / 80–99% → "太棒了！你的英文單字掌握得很好！" / 60–79% → "不錯哦！再多練習幾次就更熟了！" / 40–59% → "加油！多複習幾次就會進步的！" / 0–39% → "別灰心！持續學習就會越來越好！"

### Requirement: Wrong-Answer Review

The system SHALL list wrong answers after the quiz and increase their difficulty.

#### Scenario: Display and difficulty increase

- **WHEN** the results screen is shown
- **THEN** each wrong answer entry shows the original question, the user's wrong answer, and the correct answer
- **AND** each incorrectly answered word's `difficultyLevel` is increased by +1

### Requirement: Quiz Scope Indicator

The system SHALL display which words the current quiz covers.

#### Scenario: Scope text

- **WHEN** the quiz screen is shown
- **THEN** the scope line reads "📗 測驗範圍：所有單字" by default; "⭐ 測驗範圍：★N 以上的不熟單字" with a difficulty filter ("⭐ 測驗範圍：非常熟的單字" for the very-familiar filter); or "📗 測驗範圍：剩餘單字（已排除 X 個已移除單字）" when words were removed from the round
