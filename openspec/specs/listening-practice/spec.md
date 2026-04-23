# Listening Practice Specification

## Purpose

Defines the listening practice mode, which trains learners to identify or spell a word by hearing it, without seeing the text. Two sub-modes are supported: hear-and-identify (multiple choice) and hear-and-spell (free text entry).

## Requirements

### Requirement: Listening Mode Activation

The system SHALL allow the user to enter listening practice mode.

#### Scenario: Activate via quick settings

- **WHEN** the user selects "🎧 聽力訓練" from the quick-settings submenu
- **THEN** listening mode is enabled
- **AND** the carousel restarts with listening mode behaviour

#### Scenario: Deactivation

- **WHEN** the user exits listening mode (via menu or switching to another mode)
- **THEN** normal carousel behaviour resumes

### Requirement: Hear-and-Identify Mode

The system SHALL present an audio-first multiple-choice exercise.

#### Scenario: Question presentation

- **WHEN** a word is displayed in hear-and-identify mode
- **THEN** the English word text is hidden initially
- **AND** the word is read aloud automatically
- **AND** multiple-choice options are displayed for the user to choose the word they heard

#### Scenario: Answer feedback

- **WHEN** the user selects an option
- **THEN** immediate correct/wrong feedback is shown
- **AND** the word text is revealed

#### Scenario: Replay audio

- **WHEN** the word is being displayed in this mode
- **THEN** the user can replay the audio to hear the word again before answering

### Requirement: Hear-and-Spell Mode

The system SHALL present an audio-first free-text entry exercise.

#### Scenario: Question presentation

- **WHEN** a word is displayed in hear-and-spell mode
- **THEN** the English word text is hidden initially
- **AND** the word is read aloud automatically
- **AND** a text input field is shown for the user to type the word they heard

#### Scenario: Answer submission

- **WHEN** the user types their answer and submits (Enter key or submit button)
- **THEN** the answer is compared to the correct word (case-insensitive)
- **AND** correct/wrong feedback is shown
- **AND** the correct spelling is revealed

#### Scenario: Phrase and sentence support

- **WHEN** the target word is a phrase or sentence (contains spaces or ends with punctuation)
- **THEN** the hear-and-spell mode accepts full phrase/sentence input

### Requirement: Wrong-Word Review

The system SHALL track incorrectly identified/spelled words for focused review.

#### Scenario: Wrong-word accumulation

- **WHEN** a word is answered incorrectly in either listening mode
- **THEN** it is added to a wrong-review list for the current session

#### Scenario: Review round

- **WHEN** the initial listening session completes
- **THEN** the system offers a focused review round containing only the words that were answered incorrectly

### Requirement: Smart Timer Integration

The system SHALL apply smart-timer suppression rules consistently in listening mode.

#### Scenario: Smart timer midpoint for carousel

- **WHEN** the carousel is running in listening mode
- **THEN** the progress-bar midpoint (50%) is used as the "in-progress" boundary for removal-undo eligibility (same as normal mode)
