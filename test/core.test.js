/**
 * Tests for FlashcardApp core: constructor, settings, shuffleArray, defaults
 */
var setup = require('./setup');

beforeAll(function() {
  setup.bootstrapApp();
});

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

describe('isDefaultSheet', function() {
  var app;

  beforeEach(function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    app = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;
  });

  test('returns true for a known default sheet ID', function() {
    var defaults = app.getDefaultSheets();
    if (defaults.length > 0) {
      expect(app.isDefaultSheet(defaults[0].id)).toBe(true);
    }
  });

  test('returns false for a random sheet ID', function() {
    expect(app.isDefaultSheet('random-id-12345')).toBe(false);
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
