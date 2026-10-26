# Listening Practice Specification

## Purpose

Defines the listening practice mode, which trains identifying or spelling a word by hearing it without seeing the text: hear-and-identify (multiple choice) and hear-and-spell (free text).

## Requirements

### Requirement: Exercise Launch Points

The system SHALL provide two listening exercises launched from the 測驗 menu — hear-and-identify (👂 聽音辨字) and hear-and-spell (✍️ 聽音拼字); both pause the carousel and run in a modal. The quick-settings preset 「🎧 聽力訓練」 is a separate, exercise-free carousel display mode that hides the word text and speaks each word.

#### Scenario: Activate and exit

- **WHEN** the user selects 「👂 聽音辨字」 or 「✍️ 聽音拼字」 from the 測驗 flyout
- **THEN** the carousel pauses and the exercise modal opens; the 結束 button closes the modal and ends the session

### Requirement: Audio-First Exercises

The system SHALL hide the English word text, read the word aloud automatically, and allow replaying the audio before answering.

#### Scenario: Exercise flow

- **WHEN** a word is displayed in hear-and-identify or hear-and-spell mode
- **THEN** multiple-choice options (identify) or a text input (spell) are shown; phrases and sentences accept full-phrase input in spell mode
- **WHEN** the user answers (selects an option, or submits typed text via Enter)
- **THEN** immediate correct/wrong feedback is shown and the word text / correct spelling is revealed; typed answers are compared case-insensitively

### Requirement: Wrong-Word Tracking

The system SHALL track incorrectly answered words and list them when the session ends.

#### Scenario: Wrong-answer list on the results screen

- **WHEN** a word is answered incorrectly in either sub-mode
- **THEN** it is added to the session's wrong-answer list
- **AND** when the session completes, the results screen lists those words (English word, your answer, correct answer); 「再來一次」 regenerates questions from the full filtered word pool, not only the wrong words
