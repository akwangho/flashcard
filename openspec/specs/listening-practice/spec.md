# Listening Practice Specification

## Purpose

Defines the listening practice mode, which trains identifying or spelling a word by hearing it without seeing the text: hear-and-identify (multiple choice) and hear-and-spell (free text).

## Requirements

### Requirement: Listening Mode Activation

The system SHALL provide a listening mode entered from the quick-settings menu; smart-timer and removal-undo rules are unchanged from normal carousel mode (see `flashcard-core/spec.md`).

#### Scenario: Activate and exit

- **WHEN** the user selects 「🎧 聽力訓練」 from the quick-settings submenu
- **THEN** listening mode is enabled and the carousel restarts with listening behaviour; exiting it (via menu or switching to another mode) resumes normal carousel behaviour

### Requirement: Audio-First Exercises

The system SHALL hide the English word text, read the word aloud automatically, and allow replaying the audio before answering.

#### Scenario: Exercise flow

- **WHEN** a word is displayed in hear-and-identify or hear-and-spell mode
- **THEN** multiple-choice options (identify) or a text input (spell) are shown; phrases and sentences accept full-phrase input in spell mode
- **WHEN** the user answers (selects an option, or submits typed text via Enter or the submit button)
- **THEN** immediate correct/wrong feedback is shown and the word text / correct spelling is revealed; typed answers are compared case-insensitively

### Requirement: Wrong-Word Review

The system SHALL track incorrectly answered words for focused review.

#### Scenario: Focused review round

- **WHEN** a word is answered incorrectly in either sub-mode
- **THEN** it is added to the session's wrong-review list
- **AND** when the listening session completes, a focused review round containing only those words is offered
