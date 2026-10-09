# Pause Control Specification

## Purpose

Defines pausing and resuming the carousel, with precise timer and progress-bar synchronisation so repeated pause/resume cycles cause no speed drift.

## Requirements

### Requirement: Pause and Resume

The system SHALL allow pausing and resuming the carousel at any time, resuming with the exact remaining time and no progress-bar speed drift.

#### Scenario: Pause

- **WHEN** the user pauses (pause button, `B` key, or opening any modal/menu)
- **THEN** the timer stops with its remaining time recorded, the progress bar freezes in place, and a "Paused" indicator is shown
- **AND** the persistent silent audio (see `screen-awake/spec.md`) is suspended so iOS releases the audio focus (no lingering Safari tab speaker icon; adjacent media such as YouTube is not auto-paused)

#### Scenario: Resume

- **WHEN** the user resumes (pause button, `B` key, tapping the "Paused" indicator, or closing a modal/menu — unless the carousel was already paused before it opened)
- **THEN** the timer restarts with the recorded remaining time and the progress bar continues from its frozen position with no speed change
- **AND** the "Paused" indicator is hidden, the silent audio resumes, and the pause button shows ⏸️ while playing and ▶️ while paused

### Requirement: Auto-Resume on Card Refresh

The system SHALL never show the "Paused" indicator while the progress bar is animating.

#### Scenario: Card-refreshing operations auto-resume

- **WHEN** an operation re-displays the current card while paused (e.g. saving a word edit — see `word-edit/spec.md` — applying a filter, changing difficulty, or starting a quick review)
- **THEN** the paused state is cleared (indicator hidden) and playback proceeds
