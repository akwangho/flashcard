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
| `S` / F5 | Increase difficulty +1 (negative → jumps to 1; blocked during pending removal) | — |
| `D` | Mark as very familiar (-999); requires two presses within 3 s | — |
| `R` | Restore word (cancel pending removal) | — |
| `E` | Open edit-word modal | Works even while paused |
| `P` | Replay the **whole word only** (EN / JA auto-detected); MUST skip letter spell-out even when spell-out is enabled. Odd press uses normal rate, even press uses slow rate (`SLOW_SPEECH_RATE_FACTOR` × `voiceSettings.rate`, default factor `0.1` ≈ Google Dictionary slow / syllable-clear speed; floored at `0.1`). Sentences (`getWordType === 'sentence'`) always use normal rate. Increments `_speechPlayId` and cancels in-flight speech so stale spell-out callbacks cannot interrupt. Counter resets when the displayed word changes | Works even while paused |
| Escape | Close menu / exit fullscreen / cancel D-key pending state | — |

#### Scenario: Matching strategy

- **WHEN** a key event fires
- **THEN** the system matches using `keyCode`, `code`, and `key` in that order for maximum compatibility with iPad 4

#### Scenario: Modal suppression

- **WHEN** any modal is open and focus is inside a form control
- **THEN** all keyboard shortcuts are suppressed to avoid interfering with text input

#### Scenario: Paused-state restrictions

- **WHEN** the carousel is paused
- **THEN** only `B` (pause/resume), `E` (edit word), and `P` (replay pronunciation) are active (all marked `allowWhenPaused: true`)
- **AND** all other shortcuts have no effect

#### Scenario: Sentences always replay at normal rate

- **WHEN** the current card's english is a sentence (`getWordType` returns `sentence`)
- **THEN** every `P` press plays at the user's normal `voiceSettings.rate`
- **AND** the slow replay is reserved for single words / phrases, where syllable-by-syllable listening is the learning goal

#### Scenario: P pressed while audio is still playing

- **WHEN** the user presses `P` while the previous `P` replay is still speaking
- **THEN** the in-flight utterance is cancelled and the replay starts again (never left silent)
- **AND** because `speechSynthesis.cancel()` is asynchronous on iOS Safari, the new playback SHALL wait until `speaking`/`pending` reports idle (polled every `SPEECH_RESTART_POLL_MS`, forced after `SPEECH_RESTART_MAX_WAIT_MS`) instead of calling `speak()` in the same tick
- **WHEN** `P` is pressed several times in rapid succession
- **THEN** only the last press plays, using the rate implied by the total press count

#### Scenario: Pending replay is dropped on navigation

- **WHEN** a deferred `P` replay is still waiting for the speech engine to go idle and the word is switched (or voice is muted)
- **THEN** `cancelPendingSpeechRestart` drops the pending playback so it never fires on the new card

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
