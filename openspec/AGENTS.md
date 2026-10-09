# AGENTS.md — AI Assistant Guide

OpenSpec v1.3.1. Specs describe **current deployed behaviour** and are the source of truth; keep them in sync with the code whenever behaviour changes.

## Where to Find Things

`openspec/project.md` holds architecture, file structure, deployment, ES5 constraints, testing, and the **defaults table**; each capability's requirements + scenarios live in `openspec/specs/<capability>/spec.md`.

## Capability Index

| Capability | Covers |
|------------|--------|
| `flashcard-core/` | Auto-carousel, display modes, smart timer, word click/removal, prev/next, undo, word-object data model |
| `difficulty-marking/` | Difficulty system (-999~10), auto-decrement, filters |
| `sheets-integration/` | Sheets data format, word loading, sheet management, backend API |
| `voice-tts/` | EN/JA/ZH TTS, KK phonetic audio, letter spell-out, voice wait |
| `pause-control/` | Pause/resume with precise timer and progress-bar sync |
| `quiz-mode/` | Quick/full quiz, question generation, scoring, wrong-answer review |
| `listening-practice/` | Hear-and-identify and hear-and-spell modes |
| `word-export/` | Export to new sheet, batch progress, overwrite protection |
| `duplicate-handling/` | Duplicate detection, auto-merge, manual merge modal |
| `settings/` | General, voice, sheet settings UI and data models |
| `ui-shell/` | Loading screen, theme, fullscreen, modals, menu, toasts, search, presets |
| `keyboard-shortcuts/` | Keyboard shortcuts and touch swipe gestures |
| `review-filter/` | Review-time, difficulty, must-spell, type, tag filters |
| `word-edit/` | Inline word edit modal, save validation, image preview |
| `srs/` | Leitner Box SRS, 8-level intervals, due detection, quick review |
| `app-update/` | New-version detection, cache-busting reload, trigger narrowing |
| `screen-awake/` | Wake Lock, NoSleep video, silent audio, Keep-Alive |
| `kk-phonetic/` | KK phonetic toggle, centre display, dictionary query, pre-cache, edit-modal confirmation |

## Conventions

- Requirements use `### Requirement:` headings; scenarios use `#### Scenario:` with **GIVEN/WHEN/THEN** bullets; RFC 2119 keywords (SHALL/SHOULD/MAY).
- Keep specs lean: 1–2 core scenarios per requirement, cross-reference other specs and the `project.md` defaults table instead of restating facts, and keep implementation details out of `spec.md`.
- Frontend MUST be ES5 (see `project.md`); put new magic numbers / localStorage keys in `APP_CONSTANTS` (`script-core.html`).
- When adding a feature, add its `### Requirement:` block to the relevant spec before implementing.
- A `changes/` directory (delta-spec workflow) is not initialised; run `openspec init` if adopting it.
