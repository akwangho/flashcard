/**
 * Tests for difficulty system: increaseDifficulty, decreaseDifficulty,
 * handleMarkVeryFamiliar, confirmMarkVeryFamiliar, cancelMarkVeryFamiliar
 * OpenSpec 4.2.2, 4.2.3, 4.2.4
 */
var setup = require('./setup');

var app;
var sampleWords;

beforeAll(function() {
  setup.bootstrapApp();
});

beforeEach(function() {
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;

  sampleWords = [
    { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0, sheetName: 'Sheet1', originalRowIndex: 2 },
    { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 5, sheetName: 'Sheet1', originalRowIndex: 3 },
    { id: 2, english: 'cat', chinese: '貓', difficultyLevel: 10, sheetName: 'Sheet1', originalRowIndex: 4 },
    { id: 3, english: 'dog', chinese: '狗', difficultyLevel: -1, sheetName: 'Sheet1', originalRowIndex: 5 }
  ];
  app.words = sampleWords.slice();
  app.currentWords = sampleWords.slice();
  app.currentIndex = 0;
  app.srsData = {};
});

// ============================================================
// increaseDifficulty (4.2.2)
// ============================================================
describe('increaseDifficulty', function() {

  test('increases difficulty by 1', function() {
    app.currentIndex = 0; // apple, difficulty 0
    app.increaseDifficulty();
    expect(app.currentWords[0].difficultyLevel).toBe(1);
  });

  test('caps at 10', function() {
    app.currentIndex = 2; // cat, difficulty 10
    app.increaseDifficulty();
    expect(app.currentWords[2].difficultyLevel).toBe(10);
  });

  test('changes -1 to 0', function() {
    app.currentIndex = 3; // dog, difficulty -1
    app.increaseDifficulty();
    expect(app.currentWords[3].difficultyLevel).toBe(0);
  });

  test('syncs to words main array', function() {
    app.currentIndex = 0;
    app.increaseDifficulty();
    var mainWord = app.words.find(function(w) { return w.id === 0; });
    expect(mainWord.difficultyLevel).toBe(1);
  });

  test('does nothing when no words', function() {
    app.currentWords = [];
    expect(function() { app.increaseDifficulty(); }).not.toThrow();
  });

  test('calls renderDifficultyLevel', function() {
    var spy = jest.spyOn(app, 'renderDifficultyLevel');
    app.increaseDifficulty();
    expect(spy).toHaveBeenCalled();
  });
});

// ============================================================
// decreaseDifficulty (4.2.3)
// ============================================================
describe('decreaseDifficulty', function() {

  test('decreases difficulty by 1', function() {
    var word = { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 5, sheetName: 'Sheet1', originalRowIndex: 3 };
    app.decreaseDifficulty(word);
    expect(word.difficultyLevel).toBe(4);
  });

  test('floors at 0 (does not go to -1)', function() {
    var word = { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.decreaseDifficulty(word);
    expect(word.difficultyLevel).toBe(0);
  });

  test('decreases from 1 to 0', function() {
    var word = { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 1, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.decreaseDifficulty(word);
    expect(word.difficultyLevel).toBe(0);
  });

  test('does nothing for null word', function() {
    expect(function() { app.decreaseDifficulty(null); }).not.toThrow();
  });

  test('handles undefined difficultyLevel as 0', function() {
    var word = { id: 0, english: 'test', chinese: '測試', sheetName: 'Sheet1', originalRowIndex: 2 };
    app.decreaseDifficulty(word);
    expect(word.difficultyLevel).toBe(0);
  });

  test('syncs to words main array', function() {
    app.currentIndex = 1;
    var word = app.currentWords[1]; // banana, difficulty 5
    app.decreaseDifficulty(word);
    var mainWord = app.words.find(function(w) { return w.id === 1; });
    expect(mainWord.difficultyLevel).toBe(4);
  });
});

// ============================================================
// handleMarkVeryFamiliar (4.2.4 - D key double-press)
// ============================================================
describe('handleMarkVeryFamiliar', function() {

  test('shows confirmation on first press', function() {
    app.currentIndex = 0; // apple, difficulty 0
    var spy = jest.spyOn(app, 'showVeryFamiliarToast');
    app.handleMarkVeryFamiliar();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('再按一下'));
    expect(app._pendingVeryFamiliar).not.toBeNull();
    expect(app._pendingVeryFamiliar.wordId).toBe(0);
  });

  test('confirms on second press', function() {
    app.currentIndex = 0;
    app.handleMarkVeryFamiliar(); // first press
    var spy = jest.spyOn(app, 'confirmMarkVeryFamiliar');
    app.handleMarkVeryFamiliar(); // second press
    expect(spy).toHaveBeenCalled();
  });

  test('shows already message when word is already -1', function() {
    app.currentIndex = 3; // dog, difficulty -1
    var spy = jest.spyOn(app, 'showVeryFamiliarToast');
    app.handleMarkVeryFamiliar();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('已經是非常熟'));
  });

  test('does nothing when no words', function() {
    app.currentWords = [];
    expect(function() { app.handleMarkVeryFamiliar(); }).not.toThrow();
  });
});

// ============================================================
// confirmMarkVeryFamiliar (4.2.4)
// ============================================================
describe('confirmMarkVeryFamiliar', function() {

  test('sets difficulty to -1', function() {
    app.currentIndex = 0; // apple, difficulty 0
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    app.confirmMarkVeryFamiliar();
    expect(app.currentWords[0].difficultyLevel).toBe(-1);
  });

  test('syncs -1 to words main array', function() {
    app.currentIndex = 0;
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    app.confirmMarkVeryFamiliar();
    var mainWord = app.words.find(function(w) { return w.id === 0; });
    expect(mainWord.difficultyLevel).toBe(-1);
  });

  test('clears pending state', function() {
    app.currentIndex = 0;
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    app.confirmMarkVeryFamiliar();
    expect(app._pendingVeryFamiliar).toBeNull();
  });

  test('does nothing if no pending state', function() {
    app._pendingVeryFamiliar = null;
    expect(function() { app.confirmMarkVeryFamiliar(); }).not.toThrow();
  });

  test('shows confirmation toast', function() {
    app.currentIndex = 0;
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    var spy = jest.spyOn(app, 'showVeryFamiliarToast');
    app.confirmMarkVeryFamiliar();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('✓'));
  });
});

// ============================================================
// cancelMarkVeryFamiliar (4.2.4)
// ============================================================
describe('cancelMarkVeryFamiliar', function() {

  test('clears pending state', function() {
    jest.useFakeTimers();
    app._pendingVeryFamiliar = { wordId: 0, timer: setTimeout(function() {}, 3000) };
    app.cancelMarkVeryFamiliar();
    expect(app._pendingVeryFamiliar).toBeNull();
    jest.useRealTimers();
  });

  test('does nothing if no pending state', function() {
    app._pendingVeryFamiliar = null;
    expect(function() { app.cancelMarkVeryFamiliar(); }).not.toThrow();
  });

  test('hides toast', function() {
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    var spy = jest.spyOn(app, 'hideVeryFamiliarToast');
    app.cancelMarkVeryFamiliar();
    expect(spy).toHaveBeenCalled();
  });
});
