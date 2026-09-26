# KK Phonetic Specification

## Purpose

Defines the KK phonetic (KK 音標) feature: an opt-in display in the centre of the flashcard, a GAS REST API for querying candidate phonetics backed by a sheet dictionary, pre-fetching of upcoming words, and the edit-modal workflow for refetching and selecting among multiple candidates. Column I of each word sheet stores the user-selected phonetic.

## Requirements

### Requirement: Learning Flashcard Dictionary Sheet

The system SHALL provide a curated 41-phoneme KK phonetic learning deck (one phoneme per week for a 5th grader, five stages: easy consonants, familiar consonants, special consonants, long/short vowel pairs, diphthongs and schwa) stored in a `KK音標閃卡` worksheet in the same spreadsheet as the phonetic dictionary, with per-card metadata: week, stage, phonetic, category, contrast phoneme, example word, example word phonetic (auto-filled from the same dictionary so the app display matches), phonics mapping, zhuyin hint, a child-friendly pronunciation tip, and extra words.

#### Scenario: Import the flashcard deck

- **WHEN** `importKKFlashcardsFromGitHub()` runs in Apps Script (or `importKKFlashcardsFromDriveFile` / `importKKFlashcardsFromJson`)
- **THEN** the `KK音標閃卡` worksheet is created in the dictionary spreadsheet if missing and all 41 cards are written
- **AND** re-running the import updates existing rows by week instead of duplicating them

#### Scenario: Verify the deck

- **WHEN** `verifyKKFlashcards()` runs
- **THEN** it reports the stored card count and any missing weeks out of 1–41

### Requirement: KK Phonetic Toggle

The system SHALL provide a settings toggle (`showKKPhonetic`) that controls the entire KK phonetic feature.

#### Scenario: Disabled by default

- **WHEN** the app is used with default settings
- **THEN** `showKKPhonetic` is `false`
- **AND** no KK phonetic is displayed and no GAS phonetic API calls are made

#### Scenario: Enabled via settings

- **WHEN** the user enables the KK phonetic toggle in the settings modal and saves
- **THEN** the setting persists to localStorage
- **AND** KK phonetics are displayed and fetched from that point on

#### Scenario: Toggled with the K shortcut key

- **WHEN** the user presses K on the flashcard (also available while paused)
- **THEN** `showKKPhonetic` flips, persists to localStorage, and the settings-modal checkbox stays in sync
- **AND** a toast confirms the new state (開啟/關閉)
- **AND** the current word updates immediately: on enable, an already-resolved phonetic fades in right away (an in-flight response shows as soon as it arrives, not gated on phase 2); on disable, the phonetic is hidden at once and cleared

### Requirement: Column I Storage

The system SHALL use Google Sheet column I (`KK音標`) to store the KK phonetic for each word row. A single value is a human-confirmed phonetic; multiple candidates from an automatic query are stored comma-joined (`KK_PHONETIC_DELIMITER`, half-width comma), where the first candidate is the tentative display value pending human confirmation.

#### Scenario: Column I already has a phonetic

- **WHEN** a word is displayed while the feature is enabled and column I already contains a value
- **THEN** the stored phonetic is displayed immediately (for a multi-candidate cell, the first candidate)
- **AND** no GAS phonetic API call is made

#### Scenario: Column I is empty for a word

- **WHEN** a word is displayed, column I is empty, and the content is a single word
- **THEN** the phonetic is fetched from the GAS API
- **AND** the first candidate is displayed as soon as it arrives
- **AND** all found candidates are written back to column I comma-joined (a single candidate is stored as-is)

#### Scenario: Multi-candidate cell is loaded

- **WHEN** a word is loaded and its column I cell contains multiple comma-joined candidates
- **THEN** the backend splits the cell into `kkPhonetic` (the first candidate, the display value) and `kkCandidates` (all candidates)
- **AND** the frontend shows the first candidate in the needs-review colour until a selection is confirmed

### Requirement: Word-Type Only

The system SHALL restrict KK phonetic display, fetching, and pre-caching to content classified as a single word.
A "word" also covers semicolon- or slash-separated word-form lists (e.g. `swing; swung; swung`, `woman / women`) where every segment is a single English token, and hyphenated compounds (e.g. `twenty-five`, `mother-in-law`).

#### Scenario: Phrase or sentence content

- **WHEN** the displayed content is a phrase or sentence (multi-word content)
- **THEN** no phonetic is displayed
- **AND** no phonetic is fetched or pre-cached for that content

#### Scenario: Word-form list content

- **WHEN** the content is a semicolon- or slash-separated list of single-word forms (e.g. `swing; swung; swung`)
- **THEN** it is treated as a word: the phonetic is displayed, fetched, and pre-cached
- **AND** the backend resolves each segment against the dictionary and combines the per-segment candidates (e.g. `siŋ swəŋ`)

### Requirement: Centre Display

The system SHALL display the KK phonetic in the centre of the flashcard while the feature is enabled.

#### Scenario: Display and placement

- **WHEN** a phonetic is available for the current word
- **THEN** it appears centred on the card wrapped in slashes (e.g. `/faɪr/`)
- **AND** it sits exactly midway between the upper text area (english-section) and the lower text area (chinese-section), via a dedicated anchor container spanning both sections
- **AND** it stays on a single line (whitespace-nowrap, minimal side padding) so long phonetics use the full screen width instead of wrapping

#### Scenario: Typography matches the word display

- **WHEN** the phonetic is shown
- **THEN** its font family, size (`--font-4xl`, `--font-3xl` under 768px), and weight (bold) match the English/Chinese word styling, including the user's font-family setting

#### Scenario: Setting turned off

- **WHEN** the feature is disabled (or content is not a word)
- **THEN** the phonetic element is hidden and cleared

#### Scenario: Timing matches the second-language reveal (phase 2)

- **WHEN** phase 2 begins (the timer reaches half: the second language text is revealed in normal, chinese-first, and listening modes)
- **THEN** the phonetic fades in at that moment (or as soon as a slow fetch resolves afterwards)
- **AND** the phonetic is NOT shown during phase 1, so it never gives an extra hint before the second language appears (english-only phase 1 stays unassisted; chinese-only phase 1 does not leak the answer)
- **AND** in carousel memory mode (english and chinese shown simultaneously) the phonetic appears right away with the card
- **AND** when the card transitions away (next/previous/undo), the phonetic disappears together with the English word instead of lingering
- **AND** the phonetic is revealed at most once per card

#### Scenario: Fade-in animation

- **WHEN** the phonetic becomes visible
- **THEN** it fades in over 0.5s (matching the `.word` `--transition-slow` reveal) instead of appearing abruptly

#### Scenario: Needs-review colour for multi-candidate results

- **WHEN** the displayed phonetic is a tentative first candidate whose word still has multiple unconfirmed candidates (column I stores them comma-joined)
- **THEN** it renders in a distinct needs-review colour (light blue on a deep-blue tint, vs. the normal amber) via the `kk-needs-review` class, signalling that the user should pick the pronunciation that matches their learning via the edit modal
- **AND** the highlight persists across card revisits, reloads, and devices (candidates live in column I, not just the local cache)
- **WHEN** column I holds a single confirmed phonetic (user-selected and saved, or pre-existing)
- **THEN** the phonetic renders in the normal colour even if the local cache still has a stale candidate list

### Requirement: Fetch Behaviour

The system SHALL fetch phonetics through a GAS endpoint without blocking or breaking the flashcard flow.

#### Scenario: Deduplication of concurrent requests

- **WHEN** multiple fetches are started for the same word (display, pre-cache, or other operations)
- **THEN** only one GAS request is sent
- **AND** all waiting callers receive the same result

#### Scenario: Failure tolerance

- **WHEN** the phonetic API call fails or returns an error
- **THEN** the failure is logged only
- **AND** the flashcard continues to work normally and the display stays hidden for that word

#### Scenario: Cached result reuse

- **WHEN** a word's phonetic is already in the local cache (including an empty "not found" result)
- **THEN** the cache is used instead of calling the API again
- **AND** the edit modal's refetch action can bypass both the cache and column I

### Requirement: Pre-Cache

The system SHALL pre-fetch phonetics for the current and upcoming words while the feature is enabled, mirroring the image pre-cache mechanism.

#### Scenario: Pre-cache upcoming words

- **WHEN** a card is displayed
- **THEN** phonetics for the next several words (including the current one) are fetched in the background, skipping words that already have a phonetic (column I or cache) or a fetch in flight, and skipping non-word content

#### Scenario: No blocking

- **WHEN** pre-caching runs
- **THEN** it never blocks the current card's display and never affects the carousel on failure

### Requirement: Race Condition Protection

The system SHALL handle asynchronous responses that arrive after the user has moved to another card.

#### Scenario: Stale response does not display

- **WHEN** a phonetic response arrives after the user has switched to a different word
- **THEN** the stale phonetic is not displayed on the current card

#### Scenario: Stale response still writes back

- **WHEN** a stale response arrives for the original word
- **THEN** the phonetic is still written back to the original word's data (word object, cache, and column I for unambiguous single-candidate results), keyed by the original word, so the next visit shows it immediately

### Requirement: REST API

The system SHALL expose a GAS function and HTTP endpoint for querying candidate KK phonetics.

#### Scenario: Query result shape

- **WHEN** `queryKKPhonetic(word)` is called (or `doGet` with `?action=kk&word=apple`)
- **THEN** it returns `{ success, word, candidates: [string], source, error? }` where `candidates` lists every candidate phonetic found and `source` is one of `dict`, `web`, or `none`

#### Scenario: Lookup order

- **WHEN** a query is made
- **THEN** the `KK音標字庫` dictionary worksheet is consulted first via `TextFinder` (searched in order: the spreadsheet registered via `setKKDictSpreadsheet` → the word-file spreadsheet → the bound spreadsheet; columns: A = 單字, B = KK音標; multiple rows per word allowed; case-insensitive match)
- **AND** no phonetics are hard-coded in source; the full dictionary (~126k words converted from `open-dict-data/ipa-dict` en_US by `scripts/build-kk-dictionary.mjs`) lives only in the worksheet and `data/kk-phonetics.json`
- **AND** if not found, external dictionary REST APIs are queried server-side in order: Free Dictionary API (dictionaryapi.dev, IPA converted to KK via `ipaToKK`), then moedict English API
- **AND** if neither yields a result, an empty candidate list with `source: 'none'` is returned

#### Scenario: KK conversion rules

- **WHEN** IPA is converted to KK (`ipaToKK`, kept in sync with `scripts/build-kk-dictionary.mjs`)
- **THEN** syllabic l uses ḷ (apple `/ˈæpəɫ/` → `ˋæpḷ`), primary stress uses ˋ and secondary ˏ, `eɪ→e`, `oʊ→o`, r-colored vowels split by stress (world `/ˈwɝɫd/` → `ˋwɝld`, letter `/ˈlɛtɝ/` → `ˋlɛtɚ`), diphthongs `aɪ/aʊ/ɔɪ` are preserved, dark l `ɫ→l`, `ɹ→r`, `ɡ→g`

#### Scenario: Web results cached into the dictionary

- **WHEN** an external API returns candidates
- **THEN** they are appended to the `KK音標字庫` worksheet (created with header 單字/KK音標 if missing) so later queries for the same word hit the dictionary without calling external APIs again

#### Scenario: Dictionary bulk import

- **WHEN** `importKKPhoneticsFromGitHub()` (or `importKKPhoneticsFromDriveFile(fileId)` / `importKKPhoneticsFromJson` / `importKKPhoneticsFromRows`) is run in the Apps Script editor
- **THEN** the dictionary rows are appended to the target worksheet in chunks of 20,000 rows with duplicates skipped
- **AND** `clearKKPhoneticsDictionary()` empties the worksheet (keeping the header) before a fresh import

#### Scenario: Legacy column I cleanup

- **WHEN** `clearOldKKPhoneticsInWordSheets(sheetId)` is run
- **THEN** column I cells containing the old IPA-style stress marks (ˈ/ˌ) are cleared so they are re-queried from the dictionary with correct KK marks (ˋ/ˏ)

#### Scenario: Diagnostics

- **WHEN** `debugKKPhonetics(testWord)` is run
- **THEN** it reports the configured dictionary spreadsheet id, every dictionary worksheet found with its row count, and a live test query result

### Requirement: Multiple Candidate Selection

The system SHALL return all candidate phonetics and let the user choose which one to keep. Multi-candidate query results are tentative until a human confirms a choice.

#### Scenario: Multiple candidates returned and marked for review

- **WHEN** the API returns multiple candidates
- **THEN** all candidates are stored comma-joined in column I (so the edit modal can offer them without refetching), and the display shows the first candidate in the needs-review colour (`kk-needs-review`)
- **AND** the needs-review highlight persists until the user confirms a selection

#### Scenario: Single candidate returned

- **WHEN** the API returns exactly one candidate
- **THEN** the phonetic is displayed in the normal colour and column I stores it as a single confirmed-style value

#### Scenario: User confirms a selection

- **WHEN** the user opens the edit modal (E key), picks one candidate from the stored column-I candidates, and saves
- **THEN** column I is replaced with the single selected phonetic, the in-memory candidate marker (`kkCandidates`) and the cached candidate list are cleared, and the display returns to the normal colour
- **WHEN** the user saves the edit modal without picking any candidate while the word is still pending
- **THEN** column I keeps the comma-joined candidate list unchanged (still pending, still highlighted)

### Requirement: Edit Modal Integration

The system SHALL show KK phonetic information in the edit-word modal and support refetching.

#### Scenario: Current phonetic shown

- **WHEN** the edit-word modal opens
- **THEN** the word's current column I phonetic is shown (or a "not set" placeholder)

#### Scenario: Stored candidates offered without refetching

- **WHEN** the edit-word modal opens for a word whose column I holds multiple comma-joined candidates
- **THEN** the candidate chooser is rendered immediately from the stored candidates (no GAS API call, no refetch wait), with none pre-selected
- **AND** the refetch button remains available for forcing a fresh query

#### Scenario: Force refetch

- **WHEN** the user clicks "重新抓取 KK 音標"
- **THEN** the GAS API is queried even if column I or the cache already has a value
- **AND** the result is not written to column I immediately; it is stored only when the user saves

#### Scenario: Candidate chooser

- **WHEN** a refetch returns multiple candidates
- **THEN** all candidates are shown as selectable buttons with the first pre-selected
- **WHEN** the user selects a candidate and saves
- **THEN** the selected phonetic is written to column I and the multi-candidate needs-review state is cleared

#### Scenario: English change clears phonetic

- **WHEN** the user edits the English word and saves without a valid refetch for the new word
- **THEN** column I is cleared to an empty string
- **AND** the old word's cached phonetic is removed so the new word cannot inherit it

#### Scenario: Refetch for the new word

- **WHEN** the user changes the English word, refetches, selects a candidate, and saves
- **THEN** the selected phonetic for the new word is stored (the old word's phonetic is not reused)

### Requirement: Data Consistency on Save

The system SHALL keep the phonetic consistent across the word object, the in-memory arrays, and column I on save.

#### Scenario: Save writes everywhere

- **WHEN** a phonetic is saved from the edit modal
- **THEN** the word object, `words`/`currentWords` entries, the local cache, and column I all reflect the same value

#### Scenario: Save without a selection keeps pending candidates

- **WHEN** the edit modal is saved while the word still has unconfirmed multiple candidates and the user did not pick one (and did not change the English)
- **THEN** column I keeps the comma-joined candidate list, `word.kkPhonetic` keeps the first candidate as the display value, `kkCandidates` and the cached candidate list are preserved, and the word stays needs-review highlighted
