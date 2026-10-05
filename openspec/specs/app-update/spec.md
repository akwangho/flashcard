# App Update Specification

## Purpose

Defines how a long-lived browser tab discovers that a newer build of the app has been deployed to Google Apps Script, and reloads itself so the user actually gets the new code.

## Requirements

### Requirement: Deployed Version Reporting

The backend SHALL expose the currently deployed version so the frontend can compare it against the code it is running.

#### Scenario: Version source of truth

- **THEN** `code.gs` declares `var SERVER_VERSION = '<x.y.z>'` and `getServerVersion()` returns it
- **AND** `SERVER_VERSION` MUST equal `APP_CONSTANTS.APP_VERSION` in `script-core.html`; `test/app-update.test.js` asserts this so the two cannot drift (drift would make every page reload itself forever)

#### Scenario: Frontend comparison

- **WHEN** the backend version differs from `APP_CONSTANTS.APP_VERSION`
- **THEN** the backend value wins (it is what is actually deployed)
- **AND** this holds in both directions, including a rollback to an older build

### Requirement: Cache-Busting Reload

The system SHALL reload in a way that cannot be served from the browser cache.

#### Scenario: Reload URL

- **WHEN** a version mismatch is detected
- **THEN** the page navigates to `location.pathname + '?v=<serverVersion>&ts=<now>'` via `location.assign`
- **AND** it SHALL NOT use `location.reload()`, which reuses the same URL and can re-serve cached (stale) HTML

#### Scenario: User feedback before reloading

- **WHEN** a reload is about to happen
- **THEN** a toast shows `發現新版本 v<version>，正在重新載入…`

#### Scenario: No reload loop

- **WHEN** the same non-matching version is reported again within the same page session
- **THEN** the system logs a warning and does not reload again (guarded via `sessionStorage`)
- **AND** this guard is cleared by the reload itself, since a new page load gets a new session

#### Scenario: Reload can be downgraded to notify-only

- **WHEN** `APP_CONSTANTS.APP_UPDATE_FORCE_RELOAD` is `false`
- **THEN** a mismatch only shows the toast and no navigation occurs

### Requirement: Trigger Narrowing

The version check SHALL be rare and SHALL never interrupt active study. Checks are throttled by `APP_UPDATE_CHECK_INTERVAL_MS` (default 6 hours) persisted in `localStorage` under `STORAGE_KEYS.APP_UPDATE_CHECK`.

#### Scenario: Idle-only for automatic checks

- **WHEN** a check is automatic (`automatic: true`)
- **THEN** it only runs while the app is paused (`isPaused === true`), so a user drilling flashcards is never interrupted

#### Scenario: Skip conditions

- **WHEN** a check is requested while a card transition is in progress, speech is playing, or the carousel timer is live
- **THEN** the check is skipped and retried at the next opportunity
- **AND** it is skipped entirely outside a Google Apps Script environment

#### Scenario: Trigger points

| Trigger | Options | Rationale |
|---------|---------|-----------|
| Page becomes visible again after being hidden ≥ `APP_UPDATE_WAKE_HIDDEN_MIN_MS` (30 min) | `automatic: true` | Laptop lid closed for 12–24 h → opening the lid checks once |
| `APP_UPDATE_STARTUP_DELAY_MS` (10 s) after `handleLoadingComplete` | `automatic: true` | Catches a deploy that landed while the tab was closed |
| Every `APP_UPDATE_CHECK_INTERVAL_MS` (6 h) | `automatic: true` | Safety net; still requires the app to be paused |
| User presses 「🔄 重新載入單字」 | `automatic: false, force: true` | Explicit user intent to get the latest state; ignores the throttle |

#### Scenario: Reload-words is not a page reload

- **WHEN** the user chooses 「🔄 重新載入單字」
- **THEN** the action itself only re-fetches words from the Sheet (`restart()` → `loadWords`)
- **AND** this is exactly why the version check is needed there: the old JavaScript would otherwise stay in memory forever

### Requirement: Failure Tolerance

The check SHALL never break normal app usage.

#### Scenario: Backend failure or timeout

- **WHEN** `getServerVersion()` fails, throws, or does not respond within `APP_UPDATE_TIMEOUT_MS` (15 s)
- **THEN** the in-flight flag is cleared and the check time is still recorded (so a broken backend is not hammered on every trigger)
- **AND** no navigation occurs

#### Scenario: First run

- **WHEN** no check has ever been recorded
- **THEN** the page-load time is used as the throttle baseline, so opening a fresh page never immediately hits the backend