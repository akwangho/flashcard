# Screen Awake Specification

## Purpose

Defines the mechanisms used to prevent the device screen from sleeping and to keep the flashcard carousel running when the app is in the background, covering both iOS Safari and Android Chrome.

## Requirements

### Requirement: Multi-Layer Screen Wake Strategy

The system SHALL simultaneously attempt multiple methods to prevent screen sleep.

#### Scenario: Layer 0 — Background Web Worker timer

- **WHEN** a display timer is set
- **THEN** the same timeout is set in both the main thread and an inline Web Worker (via Blob URL)
- **AND** whichever fires first executes the callback and cancels the other
- **AND** the Web Worker's timer is not subject to main-thread background throttling, ensuring Android Chrome continues the carousel when the app is backgrounded

#### Scenario: Layer 1 — Wake Lock API

- **WHEN** the application starts
- **THEN** the system attempts to acquire the Screen Wake Lock API (`navigator.wakeLock`)
- **AND** gracefully handles failure (e.g., in Google Apps Script iframes on older platforms)

#### Scenario: Layer 2 — Silent audio (primary iOS method)

- **WHEN** the application starts
- **THEN** an `AudioContext` creates a silent buffer connected to a `createMediaStreamDestination()` output
- **AND** a hidden `<audio>` element plays the resulting MediaStream continuously
- **AND** iOS Safari treats the active audio session as a signal to keep the screen on
- **AND** Android Chrome's background throttling is reduced because of the active media session
- **WHEN** `createMediaStreamDestination` is not available (e.g., iPad 4)
- **THEN** a 20 kHz oscillator is used as a fallback

#### Scenario: Layer 3 — NoSleep video

- **WHEN** other methods are unavailable or insufficient
- **THEN** a 1×1 pixel invisible looping silent video is played as a fallback (legacy iOS and Android)

#### Scenario: Layer 4 — Keep-Alive heartbeat

- **WHEN** all other methods are active
- **THEN** every 30 seconds a brief high-frequency silent audio clip and a minimal DOM operation are performed as a last-resort fallback

### Requirement: iOS User-Gesture Activation

The system SHALL activate silent audio on every user interaction, because iOS may suspend the AudioContext at any time.

#### Scenario: Persistent activation check

- **WHEN** any `touchstart`, `touchend`, or `click` event fires
- **THEN** the system checks whether the AudioContext is running and whether the `<audio>` element is playing
- **AND** attempts to start or resume them if not (event listener is never removed)

### Requirement: Watchdog Monitoring

The system SHALL periodically verify that all wake-prevention mechanisms are still active.

#### Scenario: Watchdog interval

- **WHEN** 10 seconds have elapsed since the last check
- **THEN** the system checks the AudioContext state and whether the `<audio>` element is still playing
- **AND** if either has been paused, attempts to resume them automatically

### Requirement: Visibility Change Recovery

The system SHALL restore state and compensate for missed timers when the page becomes visible again.

#### Scenario: Return to foreground

- **WHEN** the `visibilitychange` event fires and the page becomes visible
- **THEN** the system:
  1. Attempts to resume the AudioContext
  2. Re-acquires the Wake Lock
  3. Resumes the NoSleep video
  4. Checks if any display timer has already expired during the background period
  5. If a timer has expired, immediately fires its callback (safety-net for extreme cases where the Web Worker was also suspended)
  6. Attempts to resume SpeechSynthesis if it was paused by Android Chrome

### Requirement: Android Background Execution

The system SHALL maintain carousel timing when the app is in the Android Chrome background.

#### Scenario: Three-layer background protection

- **WHEN** the app is moved to the background on Android Chrome
- **THEN** background carousel timing is maintained through three complementary mechanisms:
  1. Web Worker timer (not throttled by main-thread rules)
  2. Silent audio MediaSession (reduces Chrome's background throttling)
  3. `visibilitychange` compensation (fires any overdue callback immediately on return)
