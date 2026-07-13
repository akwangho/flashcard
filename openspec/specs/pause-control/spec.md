# Pause Control Specification

## Purpose

Defines the pause and resume behaviour for the flashcard carousel, including precise timer and progress-bar synchronisation to avoid speed drift from repeated pause/resume cycles.

## Requirements

### Requirement: Pause and Resume

The system SHALL allow the user to pause and resume the carousel at any time.

#### Scenario: Pause behaviour

- **WHEN** the user triggers pause (pause button, B key, or opening a modal/menu)
- **THEN** the active timer's remaining time is precisely recorded (via `_activeTimerInfo` → `_pauseRemainingMs`)
- **AND** the timer is stopped
- **AND** the progress bar animation is frozen at its current position
- **AND** a "Paused" indicator is shown
- **AND** the persistent silent audio (AudioContext + hidden `<audio>` MediaStream) is suspended/paused so iOS releases the audio focus, preventing the Safari tab speaker icon from staying visible and stopping adjacent media tabs (e.g. YouTube) from being auto-paused

#### Scenario: Resume behaviour

- **WHEN** the user triggers resume (pause button, B key, clicking the "Paused" indicator, or closing a modal/menu)
- **THEN** the timer restarts using the recorded remaining time
- **AND** the progress bar animation continues from the frozen position, using the exact remaining duration, with no speed change
- **AND** the "Paused" indicator is hidden
- **AND** the persistent silent audio is resumed (AudioContext `resume()` + `<audio>` `play()`)

#### Scenario: Modal/menu auto-pause

- **WHEN** any modal or the menu is opened
- **THEN** the carousel is automatically paused

#### Scenario: Modal/menu auto-resume

- **WHEN** a modal or the menu is closed
- **THEN** the carousel resumes, unless it was already paused before the modal/menu was opened (in which case it remains paused)

### Requirement: Paused Indicator Interaction

The system SHALL make the "Paused" indicator itself a tappable control.

#### Scenario: Tap to resume

- **WHEN** the "Paused" indicator is visible
- **AND** the user taps/clicks it
- **THEN** the carousel resumes

### Requirement: Pause/Progress Synchronisation Invariant

The system SHALL keep the "Paused" indicator and the countdown progress bar in sync at all times, so the "Paused" indicator is never shown while the progress bar is animating.

#### Scenario: Starting a fresh countdown clears stale paused state

- **WHEN** a fresh countdown is started for a card (via `startProgressBar`, or any operation that re-displays the current card through `displayCurrentWord`)
- **AND** the carousel is currently marked as paused
- **THEN** the paused state is cleared (`userPaused`, `isPaused`, `_pauseRemainingMs`), the "Paused" indicator is hidden, and the persistent silent audio is resumed
- **AND** playback proceeds so the indicator and progress bar remain in sync

#### Scenario: Card-refreshing operations auto-resume

- **WHEN** the user performs an operation that refreshes the current card while paused (e.g. saving a word edit, applying a filter, changing difficulty, applying settings that re-display the card, or starting a quick review)
- **THEN** the carousel auto-resumes (the "Paused" indicator is cleared) rather than leaving "Paused" shown while the progress bar runs

### Requirement: Pause Button State

The system SHALL reflect the current playback state in the pause button icon.

#### Scenario: Icon update

- **WHEN** the carousel is playing
- **THEN** the pause button shows ⏸️
- **WHEN** the carousel is paused
- **THEN** the button shows ▶️
