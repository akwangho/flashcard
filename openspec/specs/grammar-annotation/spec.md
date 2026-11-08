# Grammar Annotation Specification

## Purpose

Defines the optional automatic grammar-role highlighting of English flashcard text: main verbs, auxiliary verbs, and BE verbs are shown in three distinct colours.

## Data Models

### Grammar Annotation Setting (`flashcard-settings`)

- `grammarAnnotationEnabled: Boolean` — enables automatic grammar-role highlighting; defaults to `true`.

## Requirements

### Requirement: Optional Automatic Grammar Annotation

The system SHALL provide a general-settings toggle for automatic grammar-role annotation. When enabled, it SHALL colour English main verbs, auxiliary verbs, and BE verbs with three visually distinct colours while preserving the original text.

#### Scenario: Disable annotation

- **WHEN** the user disables grammar annotation
- **THEN** English text is rendered without grammar-role colour spans and no grammar legend is shown.

### Requirement: Annotation Timing

The system SHALL withhold annotation from English text that appears first and SHALL apply it only when the Chinese translation appears. When Chinese appears first, English SHALL be rendered with annotation immediately when it appears.

#### Scenario: English first

- **GIVEN** the card shows English before Chinese and grammar annotation is enabled
- **WHEN** only the English side is visible
- **THEN** the English text has no grammar-role colour spans, allowing the learner to identify the verb first
- **WHEN** the Chinese translation appears
- **THEN** the visible English text is annotated in place.

#### Scenario: Chinese first

- **GIVEN** the card shows Chinese before English and grammar annotation is enabled
- **WHEN** the English side appears
- **THEN** the English text is already annotated when it becomes visible.

### Requirement: Grammar Role Classification

The system SHALL classify and colour main verbs, auxiliary verbs, and BE verbs separately. BE forms take precedence over the general auxiliary category; modal, perfect, and do-support auxiliaries use the auxiliary category; other verbs use the main-verb category.

#### Scenario: Representative sentence

- **WHEN** the English text is `She has eaten.`
- **THEN** `has` is coloured as an auxiliary verb and `eaten` is coloured as a main verb.
