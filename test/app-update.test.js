/**
 * Tests for the automatic new-version check (script-app-update.html)
 * Spec: openspec/specs/app-update/spec.md
 */
var fs = require('fs');
var path = require('path');

var app;

beforeEach(function() {
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;

  localStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.APP_UPDATE_CHECK);
  sessionStorage.removeItem('flashcard-app-update-reloaded-for');
  app._appUpdateChecking = false;
  app._appUpdateReloading = false;
  app._appUpdateWatcherReady = false;
  app._appUpdateHiddenAt = 0;
  app.isPaused = false;
  app.isTransitioning = false;
  app._activeTimerInfo = null;
  app.showNotification = jest.fn();
  app._navigateToAppVersion = jest.fn();

  global.speechSynthesis.speaking = false;
  global.speechSynthesis.pending = false;
  app.speechSynthesis = global.speechSynthesis;

  // 預設：後端回報與前端相同版本（= 已是最新）
  google.script.run.getAppDeployInfo = function() { return this; };
});

afterEach(function() {
  if (app._appUpdateInterval) clearInterval(app._appUpdateInterval);
  jest.restoreAllMocks();
});

// ============================================================
// 版本號一致性：後端 SERVER_VERSION 必須與前端 APP_VERSION 相同
// ============================================================
describe('SERVER_VERSION sync (code.gs ↔ script-core.html)', function() {

  var backendVersion;
  var backendBuildTime;
  var frontendVersion;
  var frontendBuildTime;

  beforeAll(function() {
    var gs = fs.readFileSync(path.join(__dirname, '..', 'code.gs'), 'utf8');
    var mv = gs.match(/var\s+SERVER_VERSION\s*=\s*'([^']+)'/);
    var mb = gs.match(/var\s+SERVER_BUILD_TIME\s*=\s*'([^']+)'/);
    backendVersion = mv ? mv[1] : null;
    backendBuildTime = mb ? mb[1] : null;
    frontendVersion = APP_CONSTANTS.APP_VERSION;
    frontendBuildTime = APP_CONSTANTS.APP_BUILD_TIME;
  });

  test('code.gs declares a SERVER_VERSION', function() {
    expect(backendVersion).toBeTruthy();
  });

  test('code.gs SERVER_VERSION matches APP_CONSTANTS.APP_VERSION', function() {
    // 兩邊不一致 → 前端會誤判「有新版本」而無限重新整理
    expect(backendVersion).toBe(frontendVersion);
  });

  test('code.gs SERVER_BUILD_TIME matches APP_CONSTANTS.APP_BUILD_TIME', function() {
    expect(backendBuildTime).toBeTruthy();
    expect(backendBuildTime).toBe(frontendBuildTime);
  });

  test('getServerVersion() returns SERVER_VERSION', function() {
    var gs = fs.readFileSync(path.join(__dirname, '..', 'code.gs'), 'utf8');
    expect(gs).toMatch(/function getServerVersion\(\)\s*\{\s*return SERVER_VERSION;/);
  });

  test('getAppDeployInfo() exposes version, buildTime and deployTime', function() {
    var gs = fs.readFileSync(path.join(__dirname, '..', 'code.gs'), 'utf8');
    expect(gs).toMatch(/version:\s*SERVER_VERSION/);
    expect(gs).toMatch(/buildTime:\s*SERVER_BUILD_TIME/);
    expect(gs).toMatch(/deployTime:\s*recordDeployTime\(SERVER_VERSION\)/);
  });

  test('deploy time is recorded server-side, never hand-maintained', function() {
    var gs = fs.readFileSync(path.join(__dirname, '..', 'code.gs'), 'utf8');
    // 部署時間必須由 Script Properties 自動寫入，不是另一個手動維護的常數
    expect(gs).toMatch(/PropertiesService\.getScriptProperties\(\)/);
    expect(gs).toMatch(/Utilities\.formatDate\(new Date\(\), Session\.getScriptTimeZone\(\)/);
  });
});

// ============================================================
// 載入畫面：版本 / 建置時間 / 部署時間
// ============================================================
describe('renderLoadingVersion', function() {

  beforeEach(function() {
    app._appUpdateDeployTime = null;
    document.getElementById('loading-version').textContent = '';
  });

  test('shows version and build time immediately', function() {
    app.renderLoadingVersion(null);
    var text = document.getElementById('loading-version').textContent;
    expect(text).toContain('v' + APP_CONSTANTS.APP_VERSION);
    expect(text).toContain('建置 ' + APP_CONSTANTS.APP_BUILD_TIME);
  });

  test('marks the deploy time as pending before the backend answers', function() {
    app.renderLoadingVersion(null);
    expect(document.getElementById('loading-version').textContent).toContain('部署 載入中…');
  });

  test('shows the deploy time once known', function() {
    app.renderLoadingVersion('2026-10-05 16:20');
    var text = document.getElementById('loading-version').textContent;
    expect(text).toContain('部署 2026-10-05 16:20');
    expect(text).not.toContain('載入中…');
  });

  test('falls back to the deploy time already known by the instance', function() {
    app._appUpdateDeployTime = '2026-10-05 09:00';
    app.renderLoadingVersion();
    expect(document.getElementById('loading-version').textContent).toContain('部署 2026-10-05 09:00');
  });

  test('is called at parse time so the loading screen is never blank', function() {
    // 頁面一載入就渲染（部署時間尚未取得時顯示「載入中…」）
    document.getElementById('loading-version').textContent = '';
    renderLoadingVersionText(null);
    expect(document.getElementById('loading-version').textContent).toContain('v' + APP_CONSTANTS.APP_VERSION);
  });
});

describe('fetchAppDeployInfo', function() {

  beforeEach(function() {
    jest.useFakeTimers();
    app._appUpdateDeployTime = null;
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  test('renders the deploy time reported by the backend', function() {
    google.script.run.getAppDeployInfo = function() {
      var self = this;
      setTimeout(function() {
        if (self._successHandler) {
          self._successHandler({ version: '99.0.0', buildTime: 'x', deployTime: '2026-10-05 16:20' });
        }
      }, 0);
      return this;
    };
    app.fetchAppDeployInfo();
    jest.advanceTimersByTime(1);
    expect(document.getElementById('loading-version').textContent).toContain('部署 2026-10-05 16:20');
  });

  test('keeps the pending label when the backend has no deploy time', function() {
    google.script.run.getAppDeployInfo = function() {
      var self = this;
      setTimeout(function() {
        if (self._successHandler) self._successHandler({ version: '99.0.0', buildTime: 'x', deployTime: '' });
      }, 0);
      return this;
    };
    app.fetchAppDeployInfo();
    jest.advanceTimersByTime(1);
    expect(document.getElementById('loading-version').textContent).toContain('部署 載入中…');
  });

  test('does not throw outside GAS', function() {
    var savedGoogle = global.google;
    global.google = undefined;
    try {
      expect(function() { app.fetchAppDeployInfo(); }).not.toThrow();
    } finally {
      global.google = savedGoogle;
    }
  });
});

// ============================================================
// getLastAppUpdateCheckTime / markAppUpdateChecked
// ============================================================
describe('update-check timestamp (throttle bookkeeping)', function() {

  test('returns 0 when never checked', function() {
    expect(app.getLastAppUpdateCheckTime()).toBe(0);
  });

  test('round-trips through localStorage', function() {
    app.markAppUpdateChecked(1700000000000);
    expect(localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.APP_UPDATE_CHECK)).toBe('1700000000000');
    expect(app.getLastAppUpdateCheckTime()).toBe(1700000000000);
  });

  test('treats garbage as never checked', function() {
    localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.APP_UPDATE_CHECK, 'not-a-number');
    expect(app.getLastAppUpdateCheckTime()).toBe(0);
  });
});

// ============================================================
// _shouldCheckAppUpdate — 節流
// ============================================================
describe('_shouldCheckAppUpdate', function() {

  test('skips when the interval has not elapsed', function() {
    app._appUpdateMountedAt = Date.now();
    app.markAppUpdateChecked(Date.now());
    expect(app._shouldCheckAppUpdate()).toBe(false);
  });

  test('allows once the interval has elapsed', function() {
    app.markAppUpdateChecked(Date.now() - APP_CONSTANTS.APP_UPDATE_CHECK_INTERVAL_MS - 1000);
    expect(app._shouldCheckAppUpdate()).toBe(true);
  });

  test('skips right after page load (never checked yet)', function() {
    app._appUpdateMountedAt = Date.now();
    expect(app.getLastAppUpdateCheckTime()).toBe(0);
    expect(app._shouldCheckAppUpdate()).toBe(false);
  });

  test('force ignores the interval', function() {
    app.markAppUpdateChecked(Date.now());
    expect(app._shouldCheckAppUpdate(true)).toBe(true);
  });

  test('skips while a check is already in flight', function() {
    app._appUpdateChecking = true;
    expect(app._shouldCheckAppUpdate(true)).toBe(false);
  });

  test('skips while a reload is in flight', function() {
    app._appUpdateReloading = true;
    expect(app._shouldCheckAppUpdate(true)).toBe(false);
  });
});

// ============================================================
// applyServerVersion — 比對與重新載入
// ============================================================
describe('applyServerVersion', function() {

  test('does nothing when versions match', function() {
    expect(app.applyServerVersion(APP_CONSTANTS.APP_VERSION)).toBe(false);
    expect(app._navigateToAppVersion).not.toHaveBeenCalled();
  });

  test('reloads via a cache-busting URL when the server is newer', function() {
    expect(app.applyServerVersion('99.0.0')).toBe(true);
    expect(app._navigateToAppVersion).toHaveBeenCalledTimes(1);
    var url = app._navigateToAppVersion.mock.calls[0][0];
    expect(url).toContain('v=99.0.0');
    expect(url).toContain('ts=');
    expect(app._appUpdateReloading).toBe(true);
  });

  test('notifies the user before reloading', function() {
    app.applyServerVersion('99.0.0');
    expect(app.showNotification).toHaveBeenCalled();
    expect(app.showNotification.mock.calls[0][0]).toContain('99.0.0');
  });

  test('reloads again when the server rolls back to an older build', function() {
    // 後端＝線上版本＝唯一事實來源；線上被改回舊版也要跟著回到舊版
    expect(app.applyServerVersion('0.0.1')).toBe(true);
    expect(app._navigateToAppVersion).toHaveBeenCalled();
  });

  test('ignores an empty server version', function() {
    expect(app.applyServerVersion('')).toBe(false);
    expect(app.applyServerVersion(null)).toBe(false);
    expect(app._navigateToAppVersion).not.toHaveBeenCalled();
  });

  test('does not loop when the same version is reported twice', function() {
    expect(app.applyServerVersion('99.0.0')).toBe(true);
    // 重新載入後仍拿到同一個版本（例：部署尚未完成）→ 不可再觸發
    expect(app.applyServerVersion('99.0.0')).toBe(false);
    expect(app._navigateToAppVersion).toHaveBeenCalledTimes(1);
  });

  test('only notifies without reloading when force reload is disabled', function() {
    var original = APP_CONSTANTS.APP_UPDATE_FORCE_RELOAD;
    APP_CONSTANTS.APP_UPDATE_FORCE_RELOAD = false;
    try {
      expect(app.applyServerVersion('99.0.0')).toBe(false);
      expect(app._navigateToAppVersion).not.toHaveBeenCalled();
      expect(app.showNotification).toHaveBeenCalled();
    } finally {
      APP_CONSTANTS.APP_UPDATE_FORCE_RELOAD = original;
    }
  });
});

// ============================================================
// checkForAppUpdate — 呼叫後端與觸發條件
// ============================================================
describe('checkForAppUpdate', function() {

  function respondWith(version) {
    google.script.run.getAppDeployInfo = function() {
      var self = this;
      setTimeout(function() {
        if (self._successHandler) {
          self._successHandler({ version: version, buildTime: 'b', deployTime: 'd' });
        }
      }, 0);
      return this;
    };
  }

  function respondWithError() {
    google.script.run.getAppDeployInfo = function() {
      var self = this;
      setTimeout(function() { if (self._failureHandler) self._failureHandler(new Error('network down')); }, 0);
      return this;
    };
  }

  beforeEach(function() {
    jest.useFakeTimers();
    app._appUpdateMountedAt = Date.now() - (APP_CONSTANTS.APP_UPDATE_CHECK_INTERVAL_MS + 1000);
    app.isPaused = true; // 自動檢查只在閒置（已暫停）時執行
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  test('queries the backend and records the check time', function() {
    respondWith(APP_CONSTANTS.APP_VERSION);
    expect(app.checkForAppUpdate({ automatic: true, reason: 'test' })).toBe(true);
    jest.advanceTimersByTime(1);
    expect(app.getLastAppUpdateCheckTime()).toBeGreaterThan(0);
    expect(app._appUpdateChecking).toBe(false);
  });

  test('reloads when the backend reports a newer version', function() {
    respondWith('99.0.0');
    app.checkForAppUpdate({ automatic: true, reason: 'test' });
    jest.advanceTimersByTime(1);
    expect(app._navigateToAppVersion).toHaveBeenCalledTimes(1);
  });

  test('automatic checks are skipped while the app is running', function() {
    // 使用者正在練習時不能重新整理
    respondWith('99.0.0');
    app.isPaused = false;
    expect(app.checkForAppUpdate({ automatic: true })).toBe(false);
    expect(app._navigateToAppVersion).not.toHaveBeenCalled();
  });

  test('automatic checks run while paused', function() {
    respondWith('99.0.0');
    app.isPaused = true;
    expect(app.checkForAppUpdate({ automatic: true })).toBe(true);
    jest.advanceTimersByTime(1);
    expect(app._navigateToAppVersion).toHaveBeenCalledTimes(1);
  });

  test('user-triggered checks ignore the paused state', function() {
    respondWith('99.0.0');
    app.isPaused = false;
    expect(app.checkForAppUpdate({ automatic: false, force: true })).toBe(true);
    jest.advanceTimersByTime(1);
    expect(app._navigateToAppVersion).toHaveBeenCalledTimes(1);
  });

  test('throttled calls never reach the backend', function() {
    respondWith('99.0.0');
    app.markAppUpdateChecked(Date.now());
    expect(app.checkForAppUpdate({ automatic: true })).toBe(false);
    expect(app.checkForAppUpdate({ automatic: false })).toBe(false);
  });

  test('skipped while speech is playing', function() {
    respondWith('99.0.0');
    app.isPaused = true;
    global.speechSynthesis.speaking = true;
    expect(app.checkForAppUpdate({ automatic: true })).toBe(false);
    global.speechSynthesis.speaking = false;
  });

  test('skipped during a card transition', function() {
    respondWith('99.0.0');
    app.isPaused = true;
    app.isTransitioning = true;
    expect(app.checkForAppUpdate({ automatic: true })).toBe(false);
  });

  test('records the check time even when the backend fails', function() {
    respondWithError();
    app.checkForAppUpdate({ automatic: true });
    jest.advanceTimersByTime(1);
    expect(app.getLastAppUpdateCheckTime()).toBeGreaterThan(0);
    expect(app._appUpdateChecking).toBe(false);
  });

  test('gives up after the timeout so it retries later', function() {
    // 後端完全沒有回應
    google.script.run.getAppDeployInfo = function() { return this; };
    app.checkForAppUpdate({ automatic: true });
    expect(app._appUpdateChecking).toBe(true);
    jest.advanceTimersByTime(APP_CONSTANTS.APP_UPDATE_TIMEOUT_MS + 10);
    expect(app._appUpdateChecking).toBe(false);
    expect(app.getLastAppUpdateCheckTime()).toBeGreaterThan(0);
  });

  test('does nothing outside GAS', function() {
    var savedGoogle = global.google;
    global.google = undefined;
    try {
      expect(app.checkForAppUpdate({ automatic: true, force: true })).toBe(false);
    } finally {
      global.google = savedGoogle;
    }
  });
});

// ============================================================
// 喚醒觸發（對應「蓋上螢幕睡 12~24 小時再開蓋」）
// ============================================================
describe('_onAppUpdateVisibilityChange', function() {

  beforeEach(function() {
    jest.useFakeTimers();
    app._appUpdateMountedAt = Date.now() - (APP_CONSTANTS.APP_UPDATE_CHECK_INTERVAL_MS + 1000);
    app.isPaused = true;
    google.script.run.getAppDeployInfo = function() { return this; };
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  test('remembers when the page became hidden', function() {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    app._onAppUpdateVisibilityChange();
    expect(app._appUpdateHiddenAt).toBeGreaterThan(0);
  });

  test('checks on wake after a long hidden period', function() {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    app._appUpdateHiddenAt = Date.now() - (APP_UPDATE_HIDDEN_TWO_HOURS);
    var check = jest.spyOn(app, 'checkForAppUpdate');
    app._onAppUpdateVisibilityChange();
    expect(check).toHaveBeenCalled();
    expect(check.mock.calls[0][0].automatic).toBe(true);
    expect(app._appUpdateHiddenAt).toBe(0);
  });

  test('ignores brief hide/show (alt-tab, lid creak)', function() {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    app._appUpdateHiddenAt = Date.now() - 5000;
    var check = jest.spyOn(app, 'checkForAppUpdate');
    app._onAppUpdateVisibilityChange();
    expect(check).not.toHaveBeenCalled();
  });

  test('ignores a visibility change with no recorded hidden time', function() {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    app._appUpdateHiddenAt = 0;
    var check = jest.spyOn(app, 'checkForAppUpdate');
    app._onAppUpdateVisibilityChange();
    expect(check).not.toHaveBeenCalled();
  });
});

// helper: 隱藏 2 小時（> 預設 30 分鐘門檻）
var APP_UPDATE_HIDDEN_TWO_HOURS = 2 * 60 * 60 * 1000;

// ============================================================
// setupAppUpdateWatcher
// ============================================================
describe('setupAppUpdateWatcher', function() {

  afterEach(function() {
    if (app._appUpdateInterval) clearInterval(app._appUpdateInterval);
  });

  test('is idempotent', function() {
    app.setupAppUpdateWatcher();
    var first = app._appUpdateInterval;
    app.setupAppUpdateWatcher();
    expect(app._appUpdateInterval).toBe(first);
  });

  test('records the mount time used by the throttle baseline', function() {
    app.setupAppUpdateWatcher();
    expect(app._appUpdateMountedAt).toBeGreaterThan(0);
  });

  test('is started automatically once loading completes', function() {
    app._appUpdateMountedAt = 0;
    app.handleLoadingComplete(false, true);
    expect(app._appUpdateWatcherReady).toBe(true);
    expect(app._appUpdateMountedAt).toBeGreaterThan(0);
  });
});

// ============================================================
// 「🔄 重新載入單字」也會檢查（使用者主動預期拿到最新狀態）
// ============================================================
describe('restart triggers an update check', function() {

  beforeEach(function() {
    jest.useFakeTimers();
    app.sheetSettings = { sheetId: '', selectedSheets: [] };
    app.pendingRemoval = null;
    // 沒有 Sheet 時 restart() 會直接開新回合，這裡只需要驗證「有觸發檢查」
    app.startNewRound = jest.fn();
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  test('restart() forces an update check', function() {
    var check = jest.spyOn(app, 'checkForAppUpdate').mockImplementation(function() { return true; });
    app.restart();
    expect(check).toHaveBeenCalled();
    expect(check.mock.calls[0][0].force).toBe(true);
    expect(check.mock.calls[0][0].automatic).toBe(false);
  });
});