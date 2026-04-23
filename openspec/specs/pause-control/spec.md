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

#### Scenario: Resume behaviour

- **WHEN** the user triggers resume (pause button, B key, clicking the "Paused" indicator, or closing a modal/menu)
- **THEN** the timer restarts using the recorded remaining time
- **AND** the progress bar animation continues from the frozen position, using the exact remaining duration, with no speed change
- **AND** the "Paused" indicator is hidden

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

### Requirement: Pause Button State

The system SHALL reflect the current playback state in the pause button icon.

#### Scenario: Icon update

- **WHEN** the carousel is playing
- **THEN** the pause button shows ⏸️
- **WHEN** the carousel is paused
- **THEN** the button shows ▶️
