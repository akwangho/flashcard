# Quiz Mode Specification

## Purpose

Defines the quiz system, including quick and full quiz modes, question generation, the answer flow, scoring, and wrong-answer review.

## Data Models

### Quiz State

```javascript
{
  isActive: Boolean,            // Whether a quiz is in progress
  type: String,                 // 'quick' (10 questions) or 'full' (all words)
  questions: Array,             // Array of Question objects
  currentQuestionIndex: Number, // Current question index
  selectedAnswer: String,       // Answer selected by the user
  answers: Array,               // Record of all answers
  score: Number,                // Current score
  startTime: Date,              // Quiz start time
  endTime: Date,                // Quiz end time
  availableWords: Array         // Eligible words (after filters applied)
}
```

### Question Object

```javascript
{
  word: Object,           // Original Word object
  type: String,           // 'en-zh' (EN → ZH) or 'zh-en' (ZH → EN); randomly chosen
  question: String,       // Question text
  correctAnswer: String,  // Correct answer
  options: Array          // 4 options (1 correct + 3 random wrong; randomly ordered)
}
```

## Requirements

### Requirement: Quick Quiz

The system SHALL provide a 10-question quiz drawn randomly from the current available word pool.

#### Scenario: Start quick quiz

- **GIVEN** at least 3 words are available
- **WHEN** the user starts a quick quiz
- **THEN** 10 words are randomly selected from the current pool
- **AND** the carousel is automatically paused

#### Scenario: Insufficient words

- **WHEN** fewer than 3 words are available
- **THEN** the quick quiz cannot start and a notification is shown

### Requirement: Full Quiz

The system SHALL provide a quiz covering all currently available words.

#### Scenario: Start full quiz

- **WHEN** the user starts a full quiz
- **THEN** all available words are used as the question pool

### Requirement: Question Generation

The system SHALL generate questions with randomly mixed English→Chinese and Chinese→English types.

#### Scenario: Question type selection

- **WHEN** generating each question
- **THEN** the type (`en-zh` or `zh-en`) is randomly chosen with 50% probability each

#### Scenario: Wrong option selection

- **WHEN** generating the 3 wrong options
- **THEN** they are drawn randomly from all loaded words
- **AND** no duplicates and no option equal to the correct answer are included
- **AND** if fewer than 3 distinct wrong options are available, generic fallback options are used

#### Scenario: Options ordering

- **WHEN** the 4 options are assembled (1 correct + 3 wrong)
- **THEN** they are randomly shuffled before display

### Requirement: Quiz Flow

The system SHALL guide the user through the quiz in a defined sequence of screens.

#### Scenario: Start screen

- **WHEN** the user opens the quiz
- **THEN** a start screen shows: quiz type, number of questions, and scope description

#### Scenario: Answer screen

- **WHEN** a question is active
- **THEN** the question text is displayed with 4 option buttons
- **WHEN** the user selects an option
- **THEN** immediate feedback is shown (correct/wrong)
- **AND** a "Next question" action is available

#### Scenario: Results screen

- **WHEN** all questions have been answered
- **THEN** a results screen shows: percentage score, correct/wrong counts, an encouraging message, and a list of wrong answers for review

### Requirement: Answer Feedback

The system SHALL provide immediate visual feedback on each answer.

#### Scenario: Correct answer

- **WHEN** the user selects the correct option
- **THEN** a green border and ✅ "Correct!" indicator appear

#### Scenario: Wrong answer

- **WHEN** the user selects a wrong option
- **THEN** a red border and ❌ "Wrong!" indicator appear
- **AND** the correct answer is highlighted

### Requirement: Score Messages

The system SHALL display a performance message based on the final percentage score.

#### Scenario: Encouragement messages

| Score range | Message |
|-------------|---------|
| 100% | 滿分！太厲害了！你完全掌握了這些單字！ |
| 80–99% | 太棒了！你的英文單字掌握得很好！ |
| 60–79% | 不錯哦！再多練習幾次就更熟了！ |
| 40–59% | 加油！多複習幾次就會進步的！ |
| 0–39% | 別灰心！持續學習就會越來越好！ |

### Requirement: Wrong-Answer Review

The system SHALL list wrong answers after the quiz and increase their difficulty.

#### Scenario: Wrong-answer display

- **WHEN** the results screen is shown
- **THEN** each wrong answer entry shows: original question, user's wrong answer, and correct answer

#### Scenario: Auto-difficulty increase

- **WHEN** a word is answered incorrectly
- **THEN** that word's `difficultyLevel` is increased by +1

### Requirement: Quiz Scope Indicator

The system SHALL display a description of which words are included in the current quiz.

#### Scenario: Scope text with difficulty filter

- **WHEN** a difficulty filter is active
- **THEN** shows "⭐ 測驗範圍：★N 以上的不熟單字" or "⭐ 測驗範圍：非常熟的單字" (for negative-difficulty filter)

#### Scenario: Scope text with removed words

- **WHEN** some words have been temporarily removed from the current round
- **THEN** shows "📗 測驗範圍：剩餘單字（已排除 X 個已移除單字）"

#### Scenario: Default scope text

- **WHEN** no filter is active
- **THEN** shows "📗 測驗範圍：所有單字"
