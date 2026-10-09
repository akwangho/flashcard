# KK Phonetic Specification

## Purpose

KK phonetic (KK 音標) feature: default-on settings toggle, centred card display, GAS query API backed by the `KK音標字庫` sheet dictionary, pre-cache, and multi-candidate confirmation via the edit modal. Column I (`KK音標`) of each word sheet stores the selected phonetic.

## Requirements

### Requirement: KK Phonetic Toggle

The system SHALL control the feature with the `showKKPhonetic` setting, **enabled by default**.

#### Scenario: Toggle via shortcut or settings

- **WHEN** the user presses K (also while paused) or toggles the settings-modal checkbox and saves
- **THEN** the choice persists to localStorage, the checkbox stays in sync, and a toast confirms the new state
- **AND** the current word updates immediately: an already-resolved phonetic fades in on enable; the phonetic is hidden and cleared on disable

### Requirement: Column I Storage

The system SHALL store each word's phonetic in column I (`KK音標`): a single value is human-confirmed; comma-joined values (`KK_PHONETIC_DELIMITER`, half-width comma) are unconfirmed candidates whose first entry is the tentative display value.

#### Scenario: Column I already has a value

- **WHEN** a word is displayed and column I is non-empty
- **THEN** the stored phonetic (first candidate if comma-joined) is displayed immediately with no GAS API call

#### Scenario: Column I is empty

- **WHEN** a word or phrase is displayed (content is not a sentence) and column I is empty
- **THEN** the phonetic is fetched from the GAS API, the first candidate is displayed, and all found candidates are written back comma-joined (a single candidate stored as-is)

### Requirement: Word and Phrase Content

The system SHALL restrict display, fetching, and pre-caching to words and phrases, never sentences. Word-form lists (`swing; swung; swung`, `woman / women`) and hyphenated compounds (`twenty-five`) count as words. Phrases (space-separated single-word tokens) are resolved per token and yield a phonetic only if **every** token resolves (combined space-joined; no partial phonetics).

#### Scenario: Sentence excluded

- **WHEN** the displayed content is a sentence
- **THEN** no phonetic is displayed, fetched, or pre-cached

### Requirement: Centre Display

The system SHALL display the phonetic centred on the card — exactly midway between the English and Chinese sections — wrapped in slashes (`/faɪr/`), on a single line (over-length phonetics shrink via `kk-phonetic-long`), fading in over 0.5 s.

#### Scenario: Phase-2 reveal

- **WHEN** phase 2 begins (second language revealed; in carousel memory mode, together with the card)
- **THEN** the phonetic fades in — never during phase 1, so it leaks no extra hint — is shown at most once per card, and disappears with the card on transition

#### Scenario: Needs-review colour

- **WHEN** the displayed phonetic is an unconfirmed first candidate of a multi-candidate cell
- **THEN** it renders in the needs-review colour (`kk-needs-review`, light blue vs. normal amber), persisting across reloads and devices until confirmed
- **WHEN** column I holds a single confirmed phonetic
- **THEN** it renders in the normal colour even if a stale candidate list remains cached

### Requirement: Fetching and Pre-Cache

The system SHALL fetch phonetics through a GAS endpoint without disturbing the flashcard flow: concurrent requests for the same word are deduplicated (one GAS call), failures are logged only, cached results (including "not found") are reused, and current + upcoming words are pre-fetched in the background, skipping sentences and already-resolved words. A response arriving after the user moved on is never shown on the wrong card but is still written back keyed to the original word (word object, cache, and column I for single-candidate results).

#### Scenario: Flow never blocked

- **WHEN** a fetch fails or pre-caching runs
- **THEN** the flashcard flow is never blocked or broken; failures are logged only

### Requirement: REST API

The system SHALL expose `queryKKPhonetic(word)` (and `doGet` with `?action=kk&word=`) returning `{ success, word, candidates: [string], source, error? }` with `source` one of `dict`, `web`, `none`.

#### Scenario: Lookup order

- **WHEN** a query is made
- **THEN** the `KK音標字庫` dictionary worksheet is searched first (columns A=單字, B=KK音標; case-insensitive; multiple rows per word), in order: the registered dictionary spreadsheet → the word-file spreadsheet → the bound spreadsheet
- **AND** word-form lists and phrases missing from the dictionary are resolved per segment/token, requiring every part to resolve
- **AND** misses query external APIs server-side in order: Free Dictionary API (IPA converted to KK), then moedict; web results are appended to the dictionary worksheet so repeat queries hit the dictionary

### Requirement: Candidate Confirmation

The system SHALL treat multi-candidate results as tentative until the user confirms a choice in the edit modal.

#### Scenario: Confirm a candidate

- **WHEN** the user opens the edit modal (E key) — the chooser renders immediately from the stored column-I candidates, no refetch — picks a candidate or types a phonetic, and saves
- **THEN** column I is replaced with the single value, in-memory/cached candidate lists are cleared, the needs-review highlight clears, and the value propagates to the word object, `words`/`currentWords`, the cache, and column I
- **AND** saving without a selection (and without an English change) keeps the comma-joined list (still needs-review)

#### Scenario: Refetch and edge rules

- **WHEN** the user clicks 重新抓取 KK 音標
- **THEN** the API is queried bypassing cache and column I; results (multiple candidates: selectable buttons, first pre-selected) fill the manual-entry field and are stored only on save; a typed value always wins
- **AND** saving an empty field clears the phonetic; changing the English word without a valid refetch or typed value clears column I and the old word's cached phonetic, so the new word cannot inherit it
