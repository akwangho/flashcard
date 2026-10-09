# Screen Awake Specification

## Purpose

Defines the multi-layer mechanisms that keep the device screen awake and the carousel running in the background (iOS Safari and Android Chrome).

## Requirements

### Requirement: Multi-Layer Screen Wake Strategy

The system SHALL simultaneously attempt several methods to prevent screen sleep and keep them active: the Wake Lock API, continuous silent audio, a looping silent NoSleep video, and a 30-second Keep-Alive heartbeat (brief silent audio + minimal DOM operation; see `project.md` defaults).

#### Scenario: Silent audio and iOS user-gesture activation

- **WHEN** the app starts
- **THEN** a silent `AudioContext` MediaStream plays through a hidden `<audio>` element (iOS keeps the screen on; Android throttles less), falling back to a 20 kHz oscillator when `createMediaStreamDestination` is unavailable (iPad 4)
- **AND** on every `touchstart` / `touchend` / `click`, the AudioContext and `<audio>` element are re-checked and resumed if iOS suspended them

#### Scenario: Watchdog monitoring

- **WHEN** 10 seconds have elapsed since the last watchdog check
- **THEN** the AudioContext and `<audio>` element are resumed automatically if paused
- **AND** while the user has actively paused playback, the watchdog resumes nothing and the Keep-Alive heartbeat skips its oscillator burst, so iOS audio focus is not stolen from other tabs (e.g. YouTube)

### Requirement: Visibility and Background Recovery

The system SHALL restore state and compensate for missed timers when the page becomes visible, and maintain timing while backgrounded.

#### Scenario: Return to foreground

- **WHEN** the `visibilitychange` event fires and the page becomes visible
- **THEN** the AudioContext, Wake Lock, NoSleep video, and SpeechSynthesis are resumed / re-acquired
- **AND** any display timer that already expired while hidden fires its callback immediately

#### Scenario: Android background execution

- **WHEN** the app is backgrounded on Android Chrome
- **THEN** carousel timing is maintained by the dual main-thread + Web Worker timers (whichever fires first executes and cancels the other; see `project.md`), the silent-audio MediaSession, and `visibilitychange` compensation
