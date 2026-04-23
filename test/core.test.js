/**
 * Tests for FlashcardApp core: constructor, settings, shuffleArray, defaults
 * Spec: openspec/specs/settings/spec.md; openspec/project.md (architecture / defaults)
 */
describe('FlashcardApp Constructor', function() {

  test('FlashcardApp is defined as a function', function() {
    expect(typeof FlashcardApp).toBe('function');
  });

  test('constructor initializes words as empty array', function() {
    // Create instance without triggering init (we override init temporarily)
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    var app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;

    expect(app.words).toEqual([]);
    expect(app.currentWords).toEqual([]);
    expect(app.currentIndex).toBe(0);
  });

  test('constructor initializes default settings', function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    var app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;

    expect(app.settings.delayTime).toBe(4.5);
    expect(app.settings.fontSize).toBe(96);
    expect(app.settings.displayMode).toBe('english-first');
    expect(app.settings.fontFamily).toBe('system-default');
    expect(app.settings.delaySpeechInNormalMode).toBe(false);
  });

  test('constructor initializes currentWordReversed flag', function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    var app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;

    expect(app.currentWordReversed).toBe(false);
  });

  test('constructor initializes voice settings', function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    var app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;

    expect(app.voiceSettings.enabled).toBe(true);
    expect(app.voiceSettings.rate).toBe(0.8);
    expect(app.voiceSettings.lang).toBe('en-US');
    expect(app.voiceSettings.chineseEnabled).toBe(false);
    expect(app.voiceSettings.chineseLang).toBe('zh-TW');
  });

  test('constructor initializes quiz state', function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    var app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;

    expect(app.quizState.isActive).toBe(false);
    expect(app.quizState.type).toBe('quick');
    expect(app.quizState.questions).toEqual([]);
    expect(app.quizState.score).toBe(0);
  });

  test('constructor initializes filter state', function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    var app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;

    expect(app.difficultyFilter).toBe(0);
    expect(app.reviewFilter).toBe('all');
    expect(app.mustSpellFilter).toBe(false);
    expect(app.reviewedInSession).toEqual({});
  });
});

describe('Settings management', function() {
  var app;

  beforeEach(function() {
    localStorage.clear();
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;
  });

  test('saveSettings stores to localStorage', function() {
    app.settings.delayTime = 3;
    app.settings.fontSize = 48;
    app.saveSettings();

    var stored = JSON.parse(localStorage.getItem('flashcard-settings'));
    expect(stored.delayTime).toBe(3);
    expect(stored.fontSize).toBe(48);
  });

  test('loadSettings restores from localStorage', function() {
    localStorage.setItem('flashcard-settings', JSON.stringify({
      delayTime: 7,
      fontSize: 64,
      displayMode: 'chinese-first',
      fontFamily: 'arial'
    }));

    app.loadSettings();
    expect(app.settings.delayTime).toBe(7);
    expect(app.settings.fontSize).toBe(64);
    expect(app.settings.displayMode).toBe('chinese-first');
    expect(app.settings.fontFamily).toBe('arial');
  });

  test('loadSettings uses defaults when localStorage is empty', function() {
    app.loadSettings();
    expect(app.settings.delayTime).toBe(4.5);
    expect(app.settings.fontSize).toBe(96);
    expect(app.settings.displayMode).toBe('english-first');
  });

  test('loadSettings migrates old reverseMode to displayMode', function() {
    localStorage.setItem('flashcard-settings', JSON.stringify({
      delayTime: 5,
      reverseMode: true
    }));

    app.loadSettings();
    expect(app.settings.displayMode).toBe('chinese-first');
    expect(app.settings.reverseMode).toBeUndefined();
  });

  test('loadSettings migrates reverseMode false to english-first', function() {
    localStorage.setItem('flashcard-settings', JSON.stringify({
      delayTime: 5,
      reverseMode: false
    }));

    app.loadSettings();
    expect(app.settings.displayMode).toBe('english-first');
  });

  test('saveSheetSettings and loadSheetSettings round-trip', function() {
    app.sheetSettings.sheetId = 'test123';
    app.sheetSettings.selectedSheets = ['Sheet1', 'Sheet2'];
    app.saveSheetSettings();

    var app2 = new FlashcardApp();
    // Re-stub init for app2 too
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    app2 = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;
    
    app2.loadSheetSettings();
    expect(app2.sheetSettings.sheetId).toBe('test123');
    expect(app2.sheetSettings.selectedSheets).toEqual(['Sheet1', 'Sheet2']);
  });
});

describe('getDefaultSheets', function() {
  var app;

  beforeEach(function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;
  });

  test('returns an array with at least 1 default sheet', function() {
    var defaults = app.getDefaultSheets();
    expect(Array.isArray(defaults)).toBe(true);
    expect(defaults.length).toBeGreaterThan(0);
  });

  test('each default sheet has id and name', function() {
    var defaults = app.getDefaultSheets();
    defaults.forEach(function(sheet) {
      expect(sheet).toHaveProperty('id');
      expect(sheet).toHaveProperty('name');
      expect(typeof sheet.id).toBe('string');
      expect(typeof sheet.name).toBe('string');
    });
  });
});

describe('shuffleArray', function() {
  var app;

  beforeEach(function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;
  });

  test('preserves array length', function() {
    var arr = [1, 2, 3, 4, 5];
    app.shuffleArray(arr);
    expect(arr.length).toBe(5);
  });

  test('preserves all elements (same set)', function() {
    var arr = [1, 2, 3, 4, 5];
    app.shuffleArray(arr);
    expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  test('handles single-element array', function() {
    var arr = [42];
    app.shuffleArray(arr);
    expect(arr).toEqual([42]);
  });

  test('handles empty array', function() {
    var arr = [];
    app.shuffleArray(arr);
    expect(arr).toEqual([]);
  });

  test('mutates the array in place', function() {
    var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var original = arr.slice();
    // With 10 elements, the probability of no change is 1/10! ≈ very low
    // Run multiple times to be safe
    var changed = false;
    for (var i = 0; i < 10; i++) {
      arr = original.slice();
      app.shuffleArray(arr);
      if (JSON.stringify(arr) !== JSON.stringify(original)) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });
});

describe('fontFamilyMap', function() {
  test('has all 9 font keys', function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    var app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;

    var expectedKeys = [
      'system-default', 'microsoft-yahei', 'songti', 'kaiti',
      'arial', 'helvetica', 'times', 'courier', 'verdana'
    ];
    expectedKeys.forEach(function(key) {
      expect(app.fontFamilyMap).toHaveProperty(key);
      expect(typeof app.fontFamilyMap[key]).toBe('string');
    });
  });
});

// ============================================================
// applyQuickMode (quick settings presets) — openspec/specs/ui-shell/spec.md
// ============================================================
describe('applyQuickMode', function() {
  var app;

  beforeEach(function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;
    app.currentWords = [{ id: 0, english: 'test', chinese: '測試', difficultyLevel: 0 }];
    app.currentIndex = 0;
    app.showNotification = jest.fn();
    app.closeMenu = jest.fn();
    app.redisplayCurrentWord = jest.fn();
  });

  test('mode 1 sets chinese-first, spellOutLetters on, chinese on, 9s, smart timer', function() {
    app.applyQuickMode(1);
    expect(app.settings.displayMode).toBe('chinese-first');
    expect(app.voiceSettings.spellOutLetters).toBe(true);
    expect(app.voiceSettings.chineseEnabled).toBe(true);
    expect(app.settings.delayTime).toBe(9);
    expect(app.settings.smartTimerEnabled).toBe(true);
  });

  test('mode 2 sets english-first, spellOutLetters off, chinese on, 4.5s, smart timer, no delay speech', function() {
    app.applyQuickMode(2);
    expect(app.settings.displayMode).toBe('english-first');
    expect(app.voiceSettings.spellOutLetters).toBe(false);
    expect(app.voiceSettings.chineseEnabled).toBe(true);
    expect(app.settings.delayTime).toBe(4.5);
    expect(app.settings.smartTimerEnabled).toBe(true);
    expect(app.settings.delaySpeechInNormalMode).toBe(false);
  });

  test('mode 3 sets mixed, delay speech on, spellOutLetters off, chinese off, smart timer', function() {
    app.applyQuickMode(3);
    expect(app.settings.displayMode).toBe('mixed');
    expect(app.settings.delaySpeechInNormalMode).toBe(true);
    expect(app.voiceSettings.spellOutLetters).toBe(false);
    expect(app.voiceSettings.chineseEnabled).toBe(false);
    expect(app.settings.smartTimerEnabled).toBe(true);
  });

  test('saves settings after applying mode', function() {
    var spy = jest.spyOn(app, 'saveSettings');
    app.applyQuickMode(1);
    expect(spy).toHaveBeenCalled();
  });

  test('closes menu after applying mode', function() {
    var spy = jest.spyOn(app, 'closeMenu');
    app.applyQuickMode(1);
    expect(spy).toHaveBeenCalled();
  });

  test('shows notification after applying mode', function() {
    var spy = jest.spyOn(app, 'showNotification');
    app.applyQuickMode(1);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('用聽的背單字'), 'success');
  });

  test('calls redisplayCurrentWord after applying mode', function() {
    var spy = jest.spyOn(app, 'redisplayCurrentWord');
    app.applyQuickMode(2);
    expect(spy).toHaveBeenCalled();
  });

  test('mode 1 does not affect other modes settings after switching', function() {
    app.applyQuickMode(2);
    expect(app.settings.displayMode).toBe('english-first');
    app.applyQuickMode(1);
    expect(app.settings.displayMode).toBe('chinese-first');
    expect(app.voiceSettings.spellOutLetters).toBe(true);
  });
});

// ============================================================
// formatDateYYYYMMDD (utility)
// ============================================================
describe('formatDateYYYYMMDD', function() {

  test('formats a specific date correctly', function() {
    var date = new Date(2025, 0, 15); // Jan 15, 2025
    expect(formatDateYYYYMMDD(date)).toBe('2025-01-15');
  });

  test('pads single-digit month', function() {
    var date = new Date(2025, 2, 5); // Mar 5, 2025
    expect(formatDateYYYYMMDD(date)).toBe('2025-03-05');
  });

  test('pads single-digit day', function() {
    var date = new Date(2025, 11, 1); // Dec 1, 2025
    expect(formatDateYYYYMMDD(date)).toBe('2025-12-01');
  });

  test('handles double-digit month and day', function() {
    var date = new Date(2025, 10, 25); // Nov 25, 2025
    expect(formatDateYYYYMMDD(date)).toBe('2025-11-25');
  });

  test('returns today when no argument', function() {
    var result = formatDateYYYYMMDD();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('returns today when null argument', function() {
    var result = formatDateYYYYMMDD(null);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ============================================================
// isModalBackgroundClick (utility)
// ============================================================
describe('isModalBackgroundClick', function() {

  test('returns true when click target is the modal element', function() {
    var modal = document.createElement('div');
    var e = { target: modal };
    expect(typeof isModalBackgroundClick).toBe('function');
    expect(isModalBackgroundClick(e, modal)).toBe(true);
  });

  test('returns false when click target is a child of the modal', function() {
    var modal = document.createElement('div');
    var child = document.createElement('span');
    modal.appendChild(child);
    var e = { target: child };
    expect(isModalBackgroundClick(e, modal)).toBe(false);
  });
});

// ============================================================
// updateLoadingProgress
// ============================================================
describe('updateLoadingProgress', function() {
  var app;

  beforeEach(function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;
  });

  test('sets progress bar to percentage and status text when completed and total are positive', function() {
    app.updateLoadingProgress(3, 10, 'Loading 3/10...');
    var fillEl = document.getElementById('loading-progress-fill');
    var barEl = document.getElementById('loading-progress-bar');
    var textEl = document.getElementById('loading-status-text');
    expect(barEl.className).toBe('loading-progress-bar');
    expect(barEl.className.indexOf('indeterminate')).toBe(-1);
    expect(fillEl.style.width).toBe('30%');
    expect(textEl.textContent).toBe('Loading 3/10...');
  });

  test('sets progress bar to indeterminate when completed <= 0 and total > 0', function() {
    app.updateLoadingProgress(0, 5, 'Connecting...');
    var barEl = document.getElementById('loading-progress-bar');
    expect(barEl.className.indexOf('indeterminate')).not.toBe(-1);
  });

  test('handles total 0 without crashing and sets width to 0%', function() {
    app.updateLoadingProgress(0, 0, 'Idle');
    var fillEl = document.getElementById('loading-progress-fill');
    expect(fillEl.style.width).toBe('0%');
  });
});
