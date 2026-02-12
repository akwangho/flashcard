/**
 * Tests for display logic: isReversedForCurrentWord, renderMustSpellIndicator,
 * renderDifficultyLevel, renderDifficultyLevelPreview
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
