# Keyboard Shortcuts Specification

## Purpose

Defines the keyboard shortcuts and touch swipe gestures for controlling the flashcard app.

## Requirements

### Requirement: Keyboard Shortcuts

The system SHALL support the following keyboard shortcuts for controlling the carousel.

#### Scenario: Available shortcuts

| Key | Action |
|-----|--------|
| `B` | Pause / resume (works in any state; highest priority) |
| Space | Click word card (show translation / mark for removal) |
| Enter / `S` / F5 | Increase difficulty; `S`/F5: a negative value jumps to 1, blocked during pending removal |
| → / ← | Next / previous word |
| `M` / `F` | Toggle mute / toggle fullscreen |
| `D` | Mark as very familiar (-999); requires two presses within 3 s |
| `R` | Restore word (cancel pending removal) |
| `E` | Open edit-word modal (works even while paused) |
| `P` | Replay the whole word only (EN/JA auto-detected; skips letter spell-out even when spell-out is enabled); odd press = normal rate, even press = fixed slow rate `0.1` (not scaled by the user's voice rate); sentences always use normal rate; a re-press cancels the in-flight replay (works even while paused) |
| Escape | Close menu / exit fullscreen / cancel D-key pending state |

#### Scenario: Restrictions

- **WHEN** any modal is open and focus is inside a form control, or the carousel is paused
- **THEN** shortcuts are suppressed — all of them in the modal case; while paused, only `B`, `E`, and `P` remain active

### Requirement: Touch Swipe Gestures

The system SHALL support horizontal swipe gestures for word navigation.

#### Scenario: Swipe navigation

- **WHEN** the user swipes left / right
- **THEN** the carousel advances to the next / previous word
- **AND** a valid swipe travels ≥ 50 px (`SWIPE_THRESHOLD_PX`) in ≤ 500 ms (`SWIPE_TIME_LIMIT_MS`) with horizontal distance > vertical distance; swipes have no effect while the carousel is paused
