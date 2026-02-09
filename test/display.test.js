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
