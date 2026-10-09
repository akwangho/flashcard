# App Update Specification

## Purpose

Defines how a long-lived browser tab detects that a newer build was deployed to Google Apps Script and reloads itself without serving from the browser cache.

## Requirements

### Requirement: Deployed Version and Build Reporting

The backend SHALL expose the deployed version and build time, and the frontend SHALL treat the backend values as the source of truth.

#### Scenario: Version comparison

- **WHEN** the backend version differs from `APP_CONSTANTS.APP_VERSION`
- **THEN** the backend value wins in both directions (including rollbacks)
- **AND** `SERVER_VERSION` in `code.gs` MUST equal `APP_CONSTANTS.APP_VERSION`, and `SERVER_BUILD_TIME` MUST equal `APP_BUILD_TIME` (drift would reload the page forever; enforced by `test/app-update.test.js`)

#### Scenario: Loading screen contents

- **WHEN** the loading screen is visible
- **THEN** it renders `v<version>`, `建置 <buildTime>`, and `部署 <deployTime>` at script-parse time, before any network call (`部署 載入中…` until the backend answers)
- **AND** the backend records the deploy time automatically on the first request per version (Script Property `DEPLOY_TIME_<version>`) and returns the stored value afterwards

### Requirement: Cache-Busting Reload

The system SHALL reload in a way that cannot be served from the browser cache.

#### Scenario: Reload on mismatch

- **WHEN** a version mismatch is detected
- **THEN** a toast shows `發現新版本 v<version>，正在重新載入…` and the page navigates via `location.assign` to `location.pathname + '?v=<serverVersion>&ts=<now>'`
- **AND** `location.reload()` SHALL NOT be used (it reuses the same URL and can re-serve cached HTML)
- **AND** the same non-matching version triggers at most one reload per page session (sessionStorage guard, preventing reload loops)
- **AND** with `APP_CONSTANTS.APP_UPDATE_FORCE_RELOAD` `false`, a mismatch only shows the toast and does not navigate

### Requirement: Trigger Narrowing and Failure Tolerance

The version check SHALL be rare, SHALL never interrupt active study, and SHALL never break normal usage; automatic checks are throttled by `APP_UPDATE_CHECK_INTERVAL_MS` (default 6 h, persisted in localStorage).

#### Scenario: Automatic check conditions

- **WHEN** a check is automatic
- **THEN** it runs only while the carousel is paused, and is skipped (retried at the next opportunity) during card transitions, while speech is playing, or while a carousel timer is live
- **AND** if `getServerVersion()` fails, throws, or does not respond within `APP_UPDATE_TIMEOUT_MS` (15 s), no navigation occurs and the check time is still recorded (a broken backend is not re-hammered)

#### Scenario: Triggers

- **WHEN** the page becomes visible again after ≥ 30 min hidden (`APP_UPDATE_WAKE_HIDDEN_MIN_MS`), `APP_UPDATE_STARTUP_DELAY_MS` (10 s) after loading completes, every `APP_UPDATE_CHECK_INTERVAL_MS` (6 h), or the user presses 「🔄 重新載入單字」
- **THEN** a version check runs — the 重新載入單字 trigger is `force: true` and ignores the throttle, and that action itself only re-fetches words (the old JavaScript would otherwise stay in memory)
