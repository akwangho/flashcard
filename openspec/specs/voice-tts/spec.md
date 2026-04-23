# Voice TTS Specification

## Purpose

Defines text-to-speech behaviour for English, Japanese, and Chinese, including the letter spell-out feature, the voice-wait mechanism that prevents audio truncation, and the voice settings UI.

## Requirements

### Requirement: English TTS

The system SHALL read English words aloud using the Web Speech API (SpeechSynthesis).

#### Scenario: Normal mode playback timing

- **WHEN** display mode is `english-first` and English appears in phase 1
- **THEN** English TTS fires when the English text is shown (unless delayed-speech mode is active)

#### Scenario: Reverse mode playback timing

- **WHEN** display mode is `chinese-first` and English appears in phase 2
- **THEN** English TTS fires when the English text is shown

#### Scenario: Voice selection

- **WHEN** the user opens voice settings
- **THEN** a dropdown lists all system-available English voices
- **AND** the user can select a specific voice or locale (default `en-US`)

### Requirement: Japanese TTS

The system SHALL automatically detect Japanese content and use a Japanese voice.

#### Scenario: Japanese detection

- **WHEN** a word is about to be read aloud
- **THEN** the system checks the English field against Unicode ranges `[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]`
- **AND** if the content matches, a Japanese voice is used instead of English

### Requirement: Chinese TTS

The system SHALL optionally play the Chinese translation aloud.

#### Scenario: Chinese playback timing

- **WHEN** Chinese TTS is enabled
- **THEN** Chinese audio plays when the Chinese translation is displayed in phase 2

#### Scenario: Chinese waits for EN/JA

- **WHEN** English or Japanese audio is still playing when the Chinese translation appears
- **THEN** the system polls every 100 ms and defers Chinese playback until EN/JA audio finishes

#### Scenario: Chinese speech rate

- **WHEN** Chinese TTS plays
- **THEN** it always uses a speech rate of 1 (normal speed, not the user-configured EN/JA rate)

### Requirement: Letter Spell-Out

The system SHALL optionally spell out each letter of an English word before saying the full word.

#### Scenario: Spell-out sequence

- **WHEN** letter spell-out is enabled
- **THEN** each letter (a–z, A–Z only; spaces and hyphens skipped) is played individually
- **AND** after all letters, the complete word is read
- **THEN** the sequence is: letter 1 → letter 2 → … → full word

#### Scenario: Reduced initial delay

- **WHEN** letter spell-out is enabled
- **THEN** the initial speech delay is shortened from 500 ms to 50 ms (the letters themselves guide attention)

### Requirement: Voice Wait Mechanism

The system SHALL delay carousel advancement when any voice is still playing, to prevent audio truncation.

#### Scenario: Timer-expiry wait

- **WHEN** the phase timer expires
- **AND** any voice (EN, JA, ZH, or letter spell-out) is still playing
- **THEN** the system waits for the voice to finish before advancing (maximum wait 60 seconds)

#### Scenario: Sequence guard for spell-out

- **WHEN** letter spell-out is active
- **THEN** the system tracks `_speechSequenceActive` to avoid treating the brief gap between the last letter and the full-word utterance as "speech complete"

#### Scenario: Manual navigation overrides

- **WHEN** the user manually presses next/previous, clicks next word, or similar
- **THEN** the wait mechanism is bypassed and the carousel advances immediately, cancelling any in-progress voice

### Requirement: Delayed Speech Mode

The system SHALL support a mode where English TTS is deferred until the Chinese translation appears.

#### Scenario: Delayed speech in normal mode

- **WHEN** delayed-speech mode is enabled and the display mode is `english-first`
- **THEN** English TTS does NOT play when English appears in phase 1
- **AND** English TTS plays when the Chinese translation appears in phase 2

### Requirement: Mute / Unmute

The system SHALL allow toggling voice on and off.

#### Scenario: Mute toggle

- **WHEN** the user clicks the voice toggle button or presses M
- **THEN** voice output is muted or unmuted
- **AND** the button shows 🔇 (muted) or 🔊 (active)
- **AND** a "Muted" indicator is shown when muted

### Requirement: Legacy Browser Voice Activation

The system SHALL provide a manual activation step on browsers that require user interaction before allowing TTS.

#### Scenario: Activation prompt

- **WHEN** a legacy browser is detected (iOS 10 and below, Chrome 80 and below, Safari 12 and below)
- **THEN** an "Enable voice playback" button is shown on the loading screen
- **WHEN** the user clicks it
- **THEN** a silent test utterance is played to unlock the TTS engine
- **AND** normal voice functionality is enabled
