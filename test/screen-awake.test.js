/**
 * Keep screen awake / background timer behaviour
 * Spec: openspec/specs/screen-awake/spec.md
 */
describe('script-screen-awake', function() {
  var app;

  beforeEach(function() {
    app = new FlashcardApp();
    app.isPaused = false;
    app.keepScreenAwake = false;
    jest.useFakeTimers();
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  // ===========================================
  // _isAndroidDevice
  // ===========================================
  describe('_isAndroidDevice', function() {
    var originalUA;
    beforeEach(function() {
      originalUA = navigator.userAgent;
    });
    afterEach(function() {
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUA, configurable: true
      });
    });

    test('returns true for Android UA', function() {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36', configurable: true
      });
      expect(app._isAndroidDevice()).toBe(true);
    });

    test('returns false for iOS UA', function() {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 10_3_3)', configurable: true
      });
      expect(app._isAndroidDevice()).toBe(false);
    });

    test('returns false for desktop UA', function() {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', configurable: true
      });
      expect(app._isAndroidDevice()).toBe(false);
    });
  });

  // ===========================================
  // _setDisplayTimer / _clearDisplayTimer
  // ===========================================
  describe('_setDisplayTimer', function() {
    test('executes callback after delay', function() {
      var called = false;
      app._setDisplayTimer(function() { called = true; }, 1000);
      expect(called).toBe(false);
      jest.advanceTimersByTime(1000);
      expect(called).toBe(true);
    });

    test('sets _activeTimerInfo with correct properties', function() {
      app._setDisplayTimer(function() {}, 2000);
      expect(app._activeTimerInfo).not.toBeNull();
      expect(app._activeTimerInfo.delay).toBe(2000);
      expect(typeof app._activeTimerInfo.setAt).toBe('number');
      expect(typeof app._activeTimerInfo.execute).toBe('function');
    });

    test('clears previous timer before setting new one', function() {
      var firstCalled = false;
      var secondCalled = false;
      app._setDisplayTimer(function() { firstCalled = true; }, 1000);
      app._setDisplayTimer(function() { secondCalled = true; }, 2000);
      jest.advanceTimersByTime(2000);
      expect(firstCalled).toBe(false);
      expect(secondCalled).toBe(true);
    });

    test('callback only fires once even if called rapidly', function() {
      var count = 0;
      app._setDisplayTimer(function() { count++; }, 500);
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(500);
      expect(count).toBe(1);
    });
  });

  describe('_clearDisplayTimer', function() {
    test('prevents callback from firing', function() {
      var called = false;
      app._setDisplayTimer(function() { called = true; }, 1000);
      app._clearDisplayTimer();
      jest.advanceTimersByTime(2000);
      expect(called).toBe(false);
    });

    test('sets _activeTimerInfo to null', function() {
      app._setDisplayTimer(function() {}, 1000);
      expect(app._activeTimerInfo).not.toBeNull();
      app._clearDisplayTimer();
      expect(app._activeTimerInfo).toBeNull();
    });

    test('clears displayTimer', function() {
      app._setDisplayTimer(function() {}, 1000);
      expect(app.displayTimer).not.toBeNull();
      app._clearDisplayTimer();
      expect(app.displayTimer).toBeNull();
    });

    test('does not throw when called with no active timer', function() {
      expect(function() { app._clearDisplayTimer(); }).not.toThrow();
    });
  });

  // ===========================================
  // _handleVisibilityResume
  // ===========================================
  describe('_handleVisibilityResume', function() {
    test('does nothing when paused', function() {
      var called = false;
      app._activeTimerInfo = { setAt: Date.now() - 5000, delay: 1000, execute: function() { called = true; } };
      app.isPaused = true;
      app._handleVisibilityResume();
      expect(called).toBe(false);
    });

    test('does nothing when no active timer', function() {
      app._activeTimerInfo = null;
      expect(function() { app._handleVisibilityResume(); }).not.toThrow();
    });

    test('fires execute when timer has expired', function() {
      var called = false;
      app._activeTimerInfo = {
        setAt: Date.now() - 5000,
        delay: 1000,
        execute: function() { called = true; }
      };
      app._handleVisibilityResume();
      expect(called).toBe(true);
    });

    test('does not fire when timer has not yet expired', function() {
      var called = false;
      app._activeTimerInfo = {
        setAt: Date.now() - 500,
        delay: 2000,
        execute: function() { called = true; }
      };
      app._handleVisibilityResume();
      expect(called).toBe(false);
    });
  });

  // ===========================================
  // enableKeepScreenAwake / disableKeepScreenAwake
  // ===========================================
  describe('enableKeepScreenAwake', function() {
    test('sets keepScreenAwake to true', function() {
      app.enableKeepScreenAwake();
      expect(app.keepScreenAwake).toBe(true);
    });

    test('resets wake state flags', function() {
      app._wakeLockAcquired = true;
      app._noSleepVideoPlaying = true;
      app._persistentAudioRunning = true;
      app.enableKeepScreenAwake();
      expect(app._wakeLockAcquired).toBe(false);
      expect(app._noSleepVideoPlaying).toBe(false);
      expect(app._persistentAudioRunning).toBe(false);
    });
  });

  describe('disableKeepScreenAwake', function() {
    test('sets keepScreenAwake to false', function() {
      app.keepScreenAwake = true;
      app.disableKeepScreenAwake();
      expect(app.keepScreenAwake).toBe(false);
    });

    test('clears all state flags', function() {
      app.keepScreenAwake = true;
      app._wakeLockAcquired = true;
      app._noSleepVideoPlaying = true;
      app._persistentAudioRunning = true;
      app.disableKeepScreenAwake();
      expect(app._wakeLockAcquired).toBe(false);
      expect(app._noSleepVideoPlaying).toBe(false);
      expect(app._persistentAudioRunning).toBe(false);
    });

    test('clears _activeTimerInfo', function() {
      app._activeTimerInfo = { setAt: Date.now(), delay: 1000 };
      app.disableKeepScreenAwake();
      expect(app._activeTimerInfo).toBeNull();
    });

    test('terminates bgWorker if present', function() {
      var terminated = false;
      app._bgWorker = { terminate: function() { terminated = true; }, postMessage: function() {} };
      app.disableKeepScreenAwake();
      expect(terminated).toBe(true);
      expect(app._bgWorker).toBeNull();
    });

    test('does not throw when no resources exist', function() {
      expect(function() { app.disableKeepScreenAwake(); }).not.toThrow();
    });
  });

  // ===========================================
  // _createBackgroundWorker
  // ===========================================
  describe('_createBackgroundWorker', function() {
    test('does not recreate if worker already exists', function() {
      var fakeWorker = { onmessage: null, onerror: null };
      app._bgWorker = fakeWorker;
      app._createBackgroundWorker();
      expect(app._bgWorker).toBe(fakeWorker);
    });

    test('handles environment without Worker gracefully', function() {
      var origWorker = global.Worker;
      var origBlob = global.Blob;
      global.Worker = undefined;
      global.Blob = undefined;
      app._bgWorker = null;
      expect(function() { app._createBackgroundWorker(); }).not.toThrow();
      global.Worker = origWorker;
      global.Blob = origBlob;
    });
  });
});
