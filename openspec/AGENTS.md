# AGENTS.md — AI Assistant Guide

This project uses **OpenSpec v1.3.1** for spec-driven development.

## Where to Find Things

| Path | Contents |
|------|----------|
| `openspec/project.md` | Project background, architecture, file structure, deployment, ES5 constraints, testing, default config |
| `openspec/specs/` | Current deployed behaviour specifications (source of truth) |
| `openspec/specs/[capability]/spec.md` | Behavioural requirements and scenarios for that capability |

## Capability Index

| Capability folder | What it covers |
|-------------------|---------------|
| `flashcard-core/` | Auto-carousel, display modes, word click/removal, prev/next navigation |
| `difficulty-marking/` | Multi-level difficulty system (-999 ~ 10), auto-decrement, filters |
| `sheets-integration/` | Google Sheets data format, word loading, sheet management, backend API |
| `voice-tts/` | EN/JA/ZH text-to-speech, letter spell-out, voice wait mechanism |
| `pause-control/` | Pause/resume with precise timer and progress-bar sync |
| `quiz-mode/` | Quick quiz, full quiz, question generation, scoring, wrong-answer review |
| `listening-practice/` | Hear-and-identify and hear-and-spell listening modes |
| `word-export/` | Export to new sheet, batch progress, overwrite protection |
| `duplicate-handling/` | Duplicate detection, auto-merge, manual merge modal |
| `settings/` | General, voice, sheet settings UI and data models |
| `ui-shell/` | Loading screen, visual theme, fullscreen, modals, menu, notifications |
| `keyboard-shortcuts/` | Keyboard shortcuts and touch swipe gestures |
| `review-filter/` | Review-time filter, difficulty filter, must-spell filter, type filter, tag filter |
| `word-edit/` | Inline word edit modal, save validation, image preview |
| `srs/` | Leitner Box SRS, 8-level intervals, due detection, quick-review UI |
| `screen-awake/` | Prevent screen sleep: Wake Lock, NoSleep video, silent audio, Keep-Alive |

## OpenSpec Conventions

- `specs/` describes **how the system currently works** — it is the source of truth.
- When modifying code, **update the corresponding spec** to keep docs in sync with reality.
- `project.md` covers technical architecture and project conventions; keep implementation details out of `spec.md` files.
- Spec language uses **RFC 2119 keywords**: SHALL (absolute), SHOULD (recommended), MAY (optional).
- Requirements use `### Requirement: [Name]` headings; scenarios use `#### Scenario: [Description]`.

## Working With This Project

- All frontend code MUST be ES5-compatible (iPad 4 / iOS 10 support). See `project.md` for details.
- Backend (Google Apps Script, `code.gs`) may use ES6+.
- Do not introduce `let`, `const`, arrow functions, template literals, or any ES6+ syntax in frontend `.html` files.
- Use `APP_CONSTANTS` (defined in `script-core.html`) for any new magic numbers or localStorage keys.
- When adding a new feature, add a new `### Requirement:` block to the relevant `spec.md` before implementing.

## Changes Workflow (Future)

A `changes/` directory has not been initialised yet. When ready to adopt the full OpenSpec change-proposal workflow, run `openspec init` in the project root, or manually create `openspec/changes/` and follow the delta-spec conventions described at https://github.com/Fission-AI/OpenSpec.
