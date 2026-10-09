# Voice TTS Specification

## Purpose

Text-to-speech for English, Japanese, and Chinese: playback timing, KK phonetic recordings, letter spell-out, the voice-wait mechanism, and voice activation gates for legacy/iPadOS browsers.

## Requirements

### Requirement: English TTS

The system SHALL read English words aloud via SpeechSynthesis when the English text appears (phase 1 in `english-first`, phase 2 in `chinese-first`). With delayed speech enabled and `english-first`, English TTS instead plays together with the phase-2 Chinese translation.

#### Scenario: Voice selection

- **WHEN** the user opens voice settings
- **THEN** a dropdown lists all system English voices (default locale `en-US`)

### Requirement: KK Phonetic TTS

When `speakWord` receives a KK phonetic string (`/.../`), the system SHALL stream a real human recording from `https://akwangho.github.io/kk-audio/<symbol>.mp3` or `.ogg` (41 symbols, one dedicated clip each) instead of TTS.

#### Scenario: Format negotiation and failure

- **WHEN** the browser reports Opus support (`canPlayType('audio/ogg; codecs="opus"')`, probed once per session), `.ogg` is used; otherwise `.mp3` directly
- **AND** an `.ogg` load failure switches the session to `.mp3` and retries the clip; TTS fallback happens only if `.mp3` also fails
- **AND** autoplay-policy rejections (e.g. iOS before first gesture) fail silently without TTS; when `voiceSettings.enabled` is false nothing plays; when `Audio` is unavailable the caller falls back to TTS instead of throwing

#### Scenario: Preload and replay

- **WHEN** a word list containing phonetic cards loads
- **THEN** `preloadUpcomingKKAudio` preloads every phonetic card in the round (plus resolved phonetics in the pre-cache window) via hidden `Audio` elements, deduplicated by symbol, never blocking rendering
- **WHEN** the user presses P on a phonetic card
- **THEN** the recorded clip replays; normal and Japanese words keep whole-word TTS with alternating normal/slow rate

#### Scenario: TTS approximation fallback

- **WHEN** a clip errors (offline, CDN down)
- **THEN** a single symbol converts via `KK_SINGLE_SYMBOL_MAP` (teacher-style: `m`→"muh", `aɪ`→"eye", `θ`→"thuh") and is spoken via `speakEnglishWordOnly` with the user's voice/rate
- **AND** multi-symbol content converts in one longest-match-first pass via `KK_INWORD_MAP` (`ŋ`→"ng", `ɪ`→"i", `ʌ`→"u"); empty results are skipped silently; plain English (`hello`, `a/b/c`) never matches `isKKPhoneticText`

### Requirement: Japanese TTS

The system SHALL detect Japanese content (English field matching `[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]`) and read it with a Japanese voice.

#### Scenario: Detection

- **WHEN** a word's English field contains kana or kanji
- **THEN** it is read with a Japanese voice instead of English

### Requirement: Chinese TTS

The system SHALL optionally play the Chinese translation when it appears in phase 2, waiting (100 ms poll) for any EN/JA audio to finish first, always at rate 1 (not the user's EN/JA rate).

#### Scenario: Timing and rate

- **WHEN** Chinese TTS is enabled and the translation appears in phase 2
- **THEN** playback starts once EN/JA audio finishes (100 ms poll), always at rate 1

### Requirement: Letter Spell-Out

The system SHALL optionally spell out letters (a–z/A–Z; spaces and hyphens skipped) then read the full word, shortening the initial speech delay from 500 ms to 50 ms.

#### Scenario: Must-spell single-utterance and scope

- **WHEN** spell-out runs for a must-spell word (level 1 衝刺 or 0.5 隨機)
- **THEN** letters are joined with single spaces (`breakfast` → `b r e a k f a s t`) and spoken as ONE utterance at rate 1, then the full word; other words (level 0 / -1) use the per-letter sequence
- **AND** the `spellOutScope` selector (shown only while spell-out is enabled) picks: `all` 所有單字 · `must-spell-all` 所有要會拼單字 (0.5/1) · `must-spell-random` 隨機要會拼單字 (0.5) · `must-spell-sprint` 衝刺要會拼單字 (1); out-of-scope words read normally with the standard 500 ms delay

### Requirement: Voice Wait Mechanism

The system SHALL hold the carousel at timer expiry while any voice (EN/JA/ZH/spell-out) is still playing (max 60 s), tracking `_speechSequenceActive` so the gap between the last letter and the full word is not treated as "speech complete". Manual next/previous bypasses the wait and cancels in-progress voice.

#### Scenario: Wait and bypass

- **WHEN** the phase timer expires while a voice is playing
- **THEN** advancement waits (max 60 s) for the voice to finish; manual next/previous advances immediately and cancels the voice

### Requirement: Mute / Unmute

The system SHALL toggle voice with the voice button or M key, showing 🔊 (active) or 🔇 (muted) plus a Muted indicator.

#### Scenario: Toggle

- **WHEN** the user clicks the voice button or presses M
- **THEN** voice mutes/unmutes with 🔊/🔇 icon and a Muted indicator while muted

### Requirement: Voice Activation Gates

The system SHALL gate first-use voice on non-desktop platforms: legacy browsers (iOS ≤10, Chrome ≤80, Safari ≤12) show an "Enable voice playback" button on the loading screen; iPads show a fullscreen 輕觸畫面以開始 overlay before data loads, because iPadOS Safari permanently breaks the speech engine if `speechSynthesis.speak()` runs before the first user gesture.

#### Scenario: Legacy browser unlock

- **WHEN** the user clicks the "Enable voice playback" button
- **THEN** a silent utterance unlocks the TTS engine and normal voice functionality follows

#### Scenario: iPadOS detection and overlay

- **WHEN** the page loads on iPad (UA contains `iPad`, or `Macintosh`/`Mac OS X` with multi-touch (`maxTouchPoints > 1` or `ontouchstart`), or legacy `platform === 'MacIntel'` + multi-touch)
- **THEN** the overlay appears and swallows taps (`preventDefault` + `stopPropagation`); iPhone/Android/desktop never trigger it
- **WHEN** the user taps anywhere
- **THEN** `_userGestureSeen = true`, the overlay hides, a silent utterance unlocks SpeechSynthesis, and any deferred `startNewRound` proceeds; pre-gesture speak calls are skipped with a console log
