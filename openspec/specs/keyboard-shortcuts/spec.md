# Keyboard Shortcuts Specification

## Purpose

Defines keyboard shortcuts for controlling the flashcard application and the touch swipe gestures available on mobile and tablet devices.

## Requirements

### Requirement: Keyboard Shortcuts

The system SHALL support the following keyboard shortcuts for controlling the carousel.

#### Scenario: Available shortcuts

| Key | Action | Notes |
|-----|--------|-------|
| `B` | Pause / resume | Works in any state; highest priority |
| Space | Click word card (show translation / mark for removal) | — |
| Enter | Increase difficulty (`toggleDifficultCurrentWord`) | — |
| → (Right arrow) | Next word | — |
| ← (Left arrow) | Previous word | — |
| `M` | Toggle mute / unmute | — |
| `F` | Toggle fullscreen | — |
| `S` / F5 | Increase difficulty +1 (negative → jumps to 3; blocked during pending removal) | — |
| `D` | Mark as very familiar (-999); requires two presses within 3 s | — |
| `R` | Restore word (cancel pending removal) | — |
| `E` | Open edit-word modal | Works even while paused |
| Escape | Close menu / exit fullscreen / cancel D-key pending state | — |

#### Scenario: Matching strategy

- **WHEN** a key event fires
- **THEN** the system matches using `keyCode`, `code`, and `key` in that order for maximum compatibility with iPad 4

#### Scenario: Modal suppression

- **WHEN** any modal is open and focus is inside a form control
- **THEN** all keyboard shortcuts are suppressed to avoid interfering with text input

#### Scenario: Paused-state restrictions

- **WHEN** the carousel is paused
- **THEN** only `B` (pause/resume) and `E` (edit word, marked `allowWhenPaused: true`) are active
- **AND** all other shortcuts have no effect

### Requirement: Touch Swipe Gestures

The system SHALL support horizontal swipe gestures on touch devices for word navigation.

#### Scenario: Available gestures

| Gesture | Action | Equivalent key |
|---------|--------|----------------|
| Swipe left | Next word | → |
| Swipe right | Previous word | ← |

#### Scenario: Swipe detection criteria

- **WHEN** a horizontal touch gesture is detected
- **THEN** the system verifies all of:
  - Horizontal distance ≥ 50 px (`APP_CONSTANTS.SWIPE_THRESHOLD_PX`)
  - Gesture duration ≤ 500 ms (`APP_CONSTANTS.SWIPE_TIME_LIMIT_MS`)
  - Horizontal distance > vertical distance (prevents conflict with page scroll)

#### Scenario: Swipe while paused

- **WHEN** the carousel is paused
- **THEN** swipe gestures have no effect

#### Scenario: Scroll conflict prevention

- **WHEN** a valid horizontal swipe is detected
- **THEN** `preventDefault()` is called to block page scroll and subsequent click events
