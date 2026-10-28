# Duplicate Handling Specification

## Purpose

Defines detection of duplicate English words across sheets, automatic in-memory merging with user notification, and the manual resolution modal.

## Requirements

### Requirement: Duplicate Detection and Auto-Merge

The system SHALL detect duplicate English words (case-sensitive) on every load, auto-merge them in memory without modifying the Google Sheet, and preserve metadata from every entry.

#### Scenario: In-memory auto-merge

- **WHEN** two or more loaded words share the same English text (case-sensitive; `May` and `may` are different words)
- **THEN** the first occurrence is kept and the others removed from memory; differing Chinese translations are combined into the first occurrence as `1. TranslationA\n2. TranslationB`
- **AND** an upper-right notification shows the number of duplicate groups processed (success/total) with a 「下次不自動合併」 link; clicking it saves LocalStorage key `flashcard-no-auto-merge`, and the next load shows the manual modal instead of auto-merging

#### Scenario: Metadata preservation on merge

- **WHEN** a duplicate group is resolved by keeping one entry and removing the others (auto-merge, skip, or manual keep/merge)
- **THEN** the kept entry takes: 不熟程度 (difficulty) = maximum across the group; 圖片URL (image) = first non-empty in group order (in-memory resolutions also merge the image formula; manual keep/merge writes only the image URL to the sheet, leaving column F untouched); 標籤 (tags) = de-duplicated union in first-seen order
- **AND** 要會拼 (must-spell) = the strictest level present: `1` > `0.5` > `-1` (看懂就好) > `0`
- **AND** the kept entry's 複習日期 (lastReviewDate) is unchanged, so SRS scheduling is unaffected; manual keep/merge resolutions write the merged metadata to the kept sheet row before deleting the other rows

#### Scenario: Deleting the right rows

- **WHEN** the same word exists multiple times in the SAME sheet (identical English + Chinese)
- **THEN** each deleted duplicate resolves to a distinct physical row — never the row that just received the merged metadata — and rows are deleted bottom-up so earlier deletions cannot shift later row numbers
- **AND** if the target/kept worksheet no longer exists (renamed or deleted since load), the kept/target row cannot be found, or the protective metadata merge write fails, the resolution fails with an error BEFORE any source row is deleted, so no metadata is lost (both manual actions share this guarantee)

### Requirement: Manual Resolution Modal

The system SHALL let the user resolve duplicate groups one at a time.

#### Scenario: Per-group options

- **WHEN** a duplicate group is shown in the manual modal
- **THEN** the user chooses **Keep one, delete others** (modifies Google Sheet), **Merge definitions** (combines all translations into the selected sheet; only offered when translations differ), or **Skip, handle later** (in-memory handling only)
- **AND** clicking a destination option (radio or label) auto-selects the matching action, and confirming writes the result to the selected sheet
