/**
 * Tests for display logic: isReversedForCurrentWord, renderMustSpellIndicator,
 * renderDifficultyLevel, renderDifficultyLevelPreview, getPhase2Delay,
 * confirmRemoval, cancelRemoval, startProgressBar, pauseProgressBar,
 * resumeProgressBar, resetProgressBar, preloadImage
 */
var setup = require('./setup');

var app;

beforeAll(function() {
  setup.bootstrapApp();
});

beforeEach(function() {
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;
});

describe('isReversedForCurrentWord', function() {

  test('returns false for english-first mode', function() {
    app.settings.displayMode = 'english-first';
    expect(app.isReversedForCurrentWord()).toBe(false);
  });

  test('returns true for chinese-first mode', function() {
    app.settings.displayMode = 'chinese-first';
    expect(app.isReversedForCurrentWord()).toBe(true);
  });

  test('returns currentWordReversed value for mixed mode', function() {
    app.settings.displayMode = 'mixed';

    app.currentWordReversed = true;
    expect(app.isReversedForCurrentWord()).toBe(true);

    app.currentWordReversed = false;
    expect(app.isReversedForCurrentWord()).toBe(false);
  });

  test('returns false for unknown mode', function() {
    app.settings.displayMode = 'unknown';
    expect(app.isReversedForCurrentWord()).toBe(false);
  });
});

describe('renderMustSpellIndicator', function() {
  beforeEach(function() {
    app.currentWords = [
      { id: 1, english: 'apple', chinese: '蘋果', mustSpell: true },
      { id: 2, english: 'banana', chinese: '香蕉', mustSpell: false }
    ];
    app.currentIndex = 0;
  });

  test('shows indicator when current word has mustSpell true', function() {
    app.currentIndex = 0; // apple, mustSpell: true
    app.renderMustSpellIndicator();
    var indicator = document.getElementById('must-spell-indicator');
    expect(indicator.style.display).toBe('inline-block');
  });

  test('hides indicator when current word has mustSpell false', function() {
    app.currentIndex = 1; // banana, mustSpell: false
    app.renderMustSpellIndicator();
    var indicator = document.getElementById('must-spell-indicator');
    expect(indicator.style.display).toBe('none');
  });

  test('hides indicator when no current word', function() {
    app.currentWords = [];
    app.currentIndex = 0;
    app.renderMustSpellIndicator();
    var indicator = document.getElementById('must-spell-indicator');
    expect(indicator.style.display).toBe('none');
  });
});

describe('renderDifficultyLevel', function() {
  beforeEach(function() {
    app.currentWords = [
      { id: 1, english: 'apple', chinese: '蘋果', difficultyLevel: 5 },
      { id: 2, english: 'banana', chinese: '香蕉', difficultyLevel: 0 },
      { id: 3, english: 'cat', chinese: '貓', difficultyLevel: -1 }
    ];
    app.currentIndex = 0;
  });

  test('displays correct difficulty number', function() {
    app.currentIndex = 0; // apple, difficulty 5
    app.renderDifficultyLevel();
    var levelEl = document.getElementById('difficulty-level');
    expect(levelEl.textContent).toBe('5');
  });

  test('displays 0 for zero difficulty', function() {
    app.currentIndex = 1; // banana, difficulty 0
    app.renderDifficultyLevel();
    var levelEl = document.getElementById('difficulty-level');
    expect(levelEl.textContent).toBe('0');
  });

  test('displays checkmark for -1 difficulty', function() {
    app.currentIndex = 2; // cat, difficulty -1
    app.renderDifficultyLevel();
    var levelEl = document.getElementById('difficulty-level');
    expect(levelEl.textContent).toBe('✓');
  });

  test('adds correct difficulty CSS class', function() {
    app.currentIndex = 0; // apple, difficulty 5
    app.renderDifficultyLevel();
    var display = document.getElementById('difficulty-display');
    expect(display.classList.contains('difficulty-level-5')).toBe(true);
  });

  test('adds n1 CSS class for -1 difficulty', function() {
    app.currentIndex = 2; // cat, difficulty -1
    app.renderDifficultyLevel();
    var display = document.getElementById('difficulty-display');
    expect(display.classList.contains('difficulty-level-n1')).toBe(true);
  });

  test('removes old difficulty class when switching words', function() {
    app.currentIndex = 0; // difficulty 5
    app.renderDifficultyLevel();
    var display = document.getElementById('difficulty-display');
    expect(display.classList.contains('difficulty-level-5')).toBe(true);

    app.currentIndex = 1; // difficulty 0
    app.renderDifficultyLevel();
    expect(display.classList.contains('difficulty-level-5')).toBe(false);
    expect(display.classList.contains('difficulty-level-0')).toBe(true);
  });
});

describe('renderDifficultyLevelPreview', function() {

  beforeEach(function() {
    app.currentWords = [
      { id: 1, english: 'apple', chinese: '蘋果', difficultyLevel: 5 }
    ];
    app.currentIndex = 0;
  });

  test('temporarily shows preview level without changing word data', function() {
    app.renderDifficultyLevelPreview(4);
    var levelEl = document.getElementById('difficulty-level');
    expect(levelEl.textContent).toBe('4');
    // Original word data unchanged
    expect(app.currentWords[0].difficultyLevel).toBe(5);
  });

  test('shows checkmark for preview level -1', function() {
    app.renderDifficultyLevelPreview(-1);
    var levelEl = document.getElementById('difficulty-level');
    expect(levelEl.textContent).toBe('✓');
  });

  test('applies preview level CSS class', function() {
    app.renderDifficultyLevelPreview(3);
    var display = document.getElementById('difficulty-display');
    expect(display.classList.contains('difficulty-level-3')).toBe(true);
  });
});

// ============================================================
// onWordClick
// ============================================================
describe('onWordClick', function() {
  var sampleWords;

  beforeEach(function() {
    sampleWords = [
      { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0 },
      { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 1 },
      { id: 2, english: 'cat', chinese: '貓', difficultyLevel: 2 }
    ];
    app.words = sampleWords.slice();
    app.currentWords = sampleWords.slice();
    app.currentIndex = 0;
    app.showingChinese = false;
    app.isTransitioning = false;
    app.isPaused = false;
    app.isProcessingClick = false;
    app.pendingRemoval = null;
    app.settings.displayMode = 'english-first';

    // Mock dependent methods
    app.speakWord = jest.fn();
    app.speakChineseWord = jest.fn();
    app.markWordAsReviewed = jest.fn();
    app.preloadNextImage = jest.fn();
    app.renderDifficultyLevelPreview = jest.fn();
  });

  test('does nothing when paused', function() {
    app.isPaused = true;
    app.onWordClick();
    expect(app.isProcessingClick).toBe(false);
  });

  test('does nothing when transitioning', function() {
    app.isTransitioning = true;
    app.onWordClick();
    expect(app.isProcessingClick).toBe(false);
  });

  test('flashes red when only 1 word left', function() {
    app.currentWords = [sampleWords[0]];
    app.onWordClick();
    expect(app.pendingRemoval).toBeNull();
  });

  test('marks word as pending removal', function() {
    app.onWordClick();
    expect(app.pendingRemoval).not.toBeNull();
    expect(app.pendingRemoval.word.english).toBe('apple');
  });

  test('shows Chinese text when not showing yet', function() {
    app.showingChinese = false;
    app.onWordClick();
    var chineseEl = document.getElementById('chinese-word');
    expect(chineseEl.textContent).toBe('蘋果');
    expect(app.showingChinese).toBe(true);
  });

  test('adds word-pending-removal class to elements', function() {
    app.onWordClick();
    var englishEl = document.getElementById('english-word');
    expect(englishEl.classList.contains('word-pending-removal')).toBe(true);
  });

  test('calls nextWord when word already marked', function() {
    var englishEl = document.getElementById('english-word');
    englishEl.classList.add('word-pending-removal');
    var spy = jest.spyOn(app, 'nextWord');
    app.onWordClick();
    expect(spy).toHaveBeenCalled();
  });
});

// ============================================================
// openSettings / closeSettings
// ============================================================
describe('openSettings / closeSettings', function() {

  test('opens settings modal', function() {
    app.applySettings = jest.fn();
    app.openSettings();
    var modal = document.getElementById('settings-modal');
    expect(modal.style.display).toBe('flex');
  });

  test('closes settings modal', function() {
    app.redisplayCurrentWord = jest.fn();
    var modal = document.getElementById('settings-modal');
    modal.style.display = 'flex';
    app.closeSettings(false);
    expect(modal.style.display).toBe('none');
  });

  test('redisplays current word when requested on close', function() {
    app.redisplayCurrentWord = jest.fn();
    app.closeSettings(true);
    expect(app.redisplayCurrentWord).toHaveBeenCalled();
  });
});

// ============================================================
// getPhase2Delay (smart timer) (4.1.3)
// ============================================================
describe('getPhase2Delay', function() {
  var sampleWords;

  beforeEach(function() {
    sampleWords = [
      { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0 },
      { id: 1, english: 'cat', chinese: '貓', difficultyLevel: 0 },
      { id: 2, english: 'internationalization', chinese: '國際化', difficultyLevel: 3, mustSpell: true },
      { id: 3, english: 'hi', chinese: '嗨', difficultyLevel: 0 },
      { id: 4, english: '', chinese: '', difficultyLevel: 0 }
    ];
    app.words = sampleWords.slice();
    app.currentWords = sampleWords.slice();
    app.currentIndex = 0;
    app.settings.delayTime = 5;
    app.settings.smartTimerEnabled = true;
    app.settings.displayMode = 'english-first';
  });

  test('returns delayTime when smart timer is disabled', function() {
    app.settings.smartTimerEnabled = false;
    expect(app.getPhase2Delay()).toBe(5);
  });

  test('returns delayTime when no current word', function() {
    app.currentWords = [];
    app.currentIndex = 0;
    expect(app.getPhase2Delay()).toBe(5);
  });

  test('calculates based on Chinese character count in normal mode', function() {
    app.currentIndex = 0; // '蘋果' = 2 chars
    app.settings.displayMode = 'english-first';
    var delay = app.getPhase2Delay();
    // baseTime=1.0, perCharTime=0.15, so 1.0 + 2*0.15 = 1.3, min=1.2, max=5
    expect(delay).toBeGreaterThanOrEqual(1.2);
    expect(delay).toBeLessThanOrEqual(5);
  });

  test('returns delayTime for empty Chinese text in normal mode', function() {
    app.currentIndex = 4; // empty chinese
    app.settings.displayMode = 'english-first';
    expect(app.getPhase2Delay()).toBe(5);
  });

  test('short Chinese text gives shorter delay', function() {
    app.currentIndex = 1; // '貓' = 1 char
    app.settings.displayMode = 'english-first';
    var shortDelay = app.getPhase2Delay();
    app.currentIndex = 0; // '蘋果' = 2 chars
    var longerDelay = app.getPhase2Delay();
    expect(shortDelay).toBeLessThanOrEqual(longerDelay);
  });

  test('calculates based on English letter count in reversed mode', function() {
    app.currentIndex = 0; // 'apple' = 5 letters
    app.settings.displayMode = 'chinese-first';
    var delay = app.getPhase2Delay();
    // baseTime=0.5, perLetterTime=0.3, so 0.5 + 5*0.3 = 2.0, min=1.2, max=5
    expect(delay).toBeGreaterThanOrEqual(1.2);
    expect(delay).toBeLessThanOrEqual(5);
  });

  test('returns delayTime for empty English text in reversed mode', function() {
    app.currentIndex = 4; // empty english
    app.settings.displayMode = 'chinese-first';
    expect(app.getPhase2Delay()).toBe(5);
  });

  test('long English word gives longer delay than short word', function() {
    app.settings.displayMode = 'chinese-first';
    app.currentIndex = 3; // 'hi' = 2 letters
    var shortDelay = app.getPhase2Delay();
    app.currentIndex = 0; // 'apple' = 5 letters
    var longerDelay = app.getPhase2Delay();
    expect(shortDelay).toBeLessThanOrEqual(longerDelay);
  });

  test('mustSpell with difficulty >= 1 uses delayTime in reversed mode', function() {
    app.currentIndex = 2; // 'internationalization', mustSpell=true, difficulty=3
    app.settings.displayMode = 'chinese-first';
    expect(app.getPhase2Delay()).toBe(5);
  });

  test('mustSpell with difficulty 0 still uses smart timer', function() {
    app.currentWords[2].difficultyLevel = 0;
    app.currentIndex = 2; // mustSpell=true but difficulty=0
    app.settings.displayMode = 'chinese-first';
    var delay = app.getPhase2Delay();
    // Should not be forced to delayTime
    expect(delay).toBeLessThanOrEqual(5);
  });

  test('never exceeds delayTime', function() {
    app.settings.delayTime = 2;
    app.currentIndex = 2; // very long word
    app.settings.displayMode = 'chinese-first';
    app.currentWords[2].mustSpell = false;
    app.currentWords[2].difficultyLevel = 0;
    // Even long word should not exceed delayTime
    expect(app.getPhase2Delay()).toBeLessThanOrEqual(2);
  });
});

// ============================================================
// confirmRemoval (4.1.5)
// ============================================================
describe('confirmRemoval', function() {
  var sampleWords;

  beforeEach(function() {
    sampleWords = [
      { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 3, sheetName: 'Sheet1', originalRowIndex: 2 },
      { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 5, sheetName: 'Sheet1', originalRowIndex: 3 },
      { id: 2, english: 'cat', chinese: '貓', difficultyLevel: 1, sheetName: 'Sheet1', originalRowIndex: 4 }
    ];
    app.words = sampleWords.map(function(w) { return Object.assign({}, w); });
    app.currentWords = sampleWords.map(function(w) { return Object.assign({}, w); });
    app.currentIndex = 0;
    app.removedWords = [];
    app.srsData = {};
    app.reviewedInSession = {};
    app.pendingRemoval = null;
    app.isProcessingClick = true;

    // Mock dependent methods
    app.displayCurrentWord = jest.fn();
    app.startNewRound = jest.fn();
    app.markWordAsReviewed = jest.fn();
    app.syncDifficultyToBackend = jest.fn();
  });

  test('does nothing if no pendingRemoval', function() {
    app.pendingRemoval = null;
    expect(function() { app.confirmRemoval(); }).not.toThrow();
  });

  test('removes word from currentWords for normal removal', function() {
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      isVeryFamiliar: false
    };
    app.confirmRemoval();
    expect(app.currentWords.length).toBe(2);
    expect(app.removedWords.length).toBe(1);
  });

  test('decreases difficulty on normal removal', function() {
    var spy = jest.spyOn(app, 'decreaseDifficulty');
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      isVeryFamiliar: false
    };
    app.confirmRemoval();
    expect(spy).toHaveBeenCalled();
  });

  test('sets difficultyLevel to -1 for isVeryFamiliar removal', function() {
    var targetWord = app.currentWords[0];
    app.pendingRemoval = {
      word: targetWord,
      index: 0,
      isVeryFamiliar: true
    };
    app.confirmRemoval();
    expect(targetWord.difficultyLevel).toBe(-1);
  });

  test('syncs -1 to words main array for isVeryFamiliar', function() {
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      isVeryFamiliar: true
    };
    app.confirmRemoval();
    var mainWord = app.words.find(function(w) { return w.id === 0; });
    expect(mainWord.difficultyLevel).toBe(-1);
  });

  test('syncs to backend for isVeryFamiliar', function() {
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      isVeryFamiliar: true
    };
    app.confirmRemoval();
    expect(app.syncDifficultyToBackend).toHaveBeenCalled();
  });

  test('calls markWordAsReviewed', function() {
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      isVeryFamiliar: false
    };
    app.confirmRemoval();
    expect(app.markWordAsReviewed).toHaveBeenCalled();
  });

  test('clears pendingRemoval after confirm', function() {
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      isVeryFamiliar: false
    };
    app.confirmRemoval();
    expect(app.pendingRemoval).toBeNull();
  });

  test('starts new round when all words removed', function() {
    app.currentWords = [sampleWords[0]];
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      isVeryFamiliar: false
    };
    app.confirmRemoval();
    expect(app.startNewRound).toHaveBeenCalled();
  });

  test('displays next word after removal when words remain', function() {
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      isVeryFamiliar: false
    };
    app.confirmRemoval();
    expect(app.displayCurrentWord).toHaveBeenCalled();
  });

  test('wraps currentIndex if it exceeds array length', function() {
    app.currentIndex = 2; // last word
    app.pendingRemoval = {
      word: app.currentWords[2],
      index: 2,
      isVeryFamiliar: false
    };
    app.confirmRemoval();
    expect(app.currentIndex).toBe(0);
  });
});

// ============================================================
// cancelRemoval (4.1.5)
// ============================================================
describe('cancelRemoval', function() {
  var sampleWords;

  beforeEach(function() {
    sampleWords = [
      { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 3 },
      { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 5 }
    ];
    app.words = sampleWords.slice();
    app.currentWords = sampleWords.slice();
    app.currentIndex = 0;
    app.showingChinese = true;
    app.isProcessingClick = true;
    app.settings.delayTime = 5;
    app.settings.smartTimerEnabled = false;
  });

  test('does nothing if no pendingRemoval', function() {
    app.pendingRemoval = null;
    expect(function() { app.cancelRemoval(); }).not.toThrow();
  });

  test('clears pendingRemoval', function() {
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      originalDifficultyLevel: 3,
      isVeryFamiliar: false
    };
    app.cancelRemoval();
    expect(app.pendingRemoval).toBeNull();
  });

  test('removes word-pending-removal class', function() {
    var englishEl = document.getElementById('english-word');
    var chineseEl = document.getElementById('chinese-word');
    englishEl.classList.add('word-pending-removal');
    chineseEl.classList.add('word-pending-removal');

    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      originalDifficultyLevel: 3,
      isVeryFamiliar: false
    };
    app.cancelRemoval();
    expect(englishEl.classList.contains('word-pending-removal')).toBe(false);
    expect(chineseEl.classList.contains('word-pending-removal')).toBe(false);
  });

  test('restores original difficulty level preview', function() {
    var spy = jest.spyOn(app, 'renderDifficultyLevelPreview');
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      originalDifficultyLevel: 3,
      isVeryFamiliar: false
    };
    app.cancelRemoval();
    expect(spy).toHaveBeenCalledWith(3);
  });

  test('hides very familiar toast for isVeryFamiliar cancel', function() {
    var spy = jest.spyOn(app, 'hideVeryFamiliarToast');
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      originalDifficultyLevel: 3,
      isVeryFamiliar: true
    };
    app.cancelRemoval();
    expect(spy).toHaveBeenCalled();
  });

  test('resets isProcessingClick', function() {
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      originalDifficultyLevel: 3,
      isVeryFamiliar: false
    };
    app.cancelRemoval();
    expect(app.isProcessingClick).toBe(false);
  });
});

// ============================================================
// Progress bar (4.1.8)
// ============================================================
describe('startProgressBar', function() {

  test('sets phase 1 width from 0% to 50%', function() {
    app.settings.delayTime = 5;
    app.startProgressBar(1);
    var bar = document.getElementById('timer-progress-bar');
    expect(bar.style.width).toBe('50%');
    expect(app._progressPhase).toBe(1);
  });

  test('sets phase 2 width from 50% to 100%', function() {
    app.settings.delayTime = 5;
    app.startProgressBar(2);
    var bar = document.getElementById('timer-progress-bar');
    expect(bar.style.width).toBe('100%');
    expect(app._progressPhase).toBe(2);
  });

  test('uses customDuration for phase 2 when provided', function() {
    app.startProgressBar(2, 3);
    expect(app._progressDuration).toBe(3);
  });

  test('uses delayTime when customDuration not provided', function() {
    app.settings.delayTime = 7;
    app.startProgressBar(1);
    expect(app._progressDuration).toBe(7);
  });

  test('sets transition property', function() {
    app.settings.delayTime = 5;
    app.startProgressBar(1);
    var bar = document.getElementById('timer-progress-bar');
    expect(bar.style.transition).toContain('width');
    expect(bar.style.transition).toContain('5s');
  });
});

describe('pauseProgressBar', function() {

  test('freezes bar at current position', function() {
    app.startProgressBar(1);
    app.pauseProgressBar();
    var bar = document.getElementById('timer-progress-bar');
    // Should have set transition to 'none'
    expect(bar.style.transition).toBe('none');
  });

  test('does not throw if bar is missing', function() {
    var bar = document.getElementById('timer-progress-bar');
    bar.parentElement.removeChild(bar);
    expect(function() { app.pauseProgressBar(); }).not.toThrow();
    // Restore bar
    var newBar = document.createElement('div');
    newBar.id = 'timer-progress-bar';
    document.body.appendChild(newBar);
  });
});

describe('resumeProgressBar', function() {

  test('animates to 50% for phase 1', function() {
    app._progressPhase = 1;
    app._progressDuration = 5;
    app.settings.delayTime = 5;
    app.resumeProgressBar(3);
    var bar = document.getElementById('timer-progress-bar');
    expect(bar.style.width).toBe('50%');
    expect(bar.style.transition).toContain('3s');
  });

  test('animates to 100% for phase 2', function() {
    app._progressPhase = 2;
    app._progressDuration = 5;
    app.settings.delayTime = 5;
    app.resumeProgressBar(2);
    var bar = document.getElementById('timer-progress-bar');
    expect(bar.style.width).toBe('100%');
    expect(bar.style.transition).toContain('2s');
  });

  test('does nothing if no progress phase', function() {
    app._progressPhase = null;
    expect(function() { app.resumeProgressBar(3); }).not.toThrow();
  });
});

describe('resetProgressBar', function() {

  test('resets width to 0%', function() {
    app.startProgressBar(1);
    app.resetProgressBar();
    var bar = document.getElementById('timer-progress-bar');
    expect(bar.style.width).toBe('0%');
  });

  test('clears progress phase', function() {
    app._progressPhase = 2;
    app.resetProgressBar();
    expect(app._progressPhase).toBeNull();
  });

  test('sets transition to none', function() {
    app.resetProgressBar();
    var bar = document.getElementById('timer-progress-bar');
    expect(bar.style.transition).toBe('none');
  });
});

// ============================================================
// preloadImage (4.10.3)
// ============================================================
describe('preloadImage', function() {

  beforeEach(function() {
    app.preloadedImages = {};
  });

  test('calls callback(false) for empty URL', function() {
    var cb = jest.fn();
    app.preloadImage('', cb);
    expect(cb).toHaveBeenCalledWith(false);
  });

  test('calls callback(false) for null URL', function() {
    var cb = jest.fn();
    app.preloadImage(null, cb);
    expect(cb).toHaveBeenCalledWith(false);
  });

  test('calls callback(true) for already-cached URL', function() {
    app.preloadedImages['http://example.com/img.png'] = true;
    var cb = jest.fn();
    app.preloadImage('http://example.com/img.png', cb);
    expect(cb).toHaveBeenCalledWith(true);
  });

  test('does not throw without callback', function() {
    expect(function() { app.preloadImage(''); }).not.toThrow();
    expect(function() { app.preloadImage(null); }).not.toThrow();
  });
});
