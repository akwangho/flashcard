/**
 * Tests for difficulty system: increaseDifficulty, decreaseDifficulty,
 * handleMarkVeryFamiliar, confirmMarkVeryFamiliar, cancelMarkVeryFamiliar
 * OpenSpec 4.2.2, 4.2.3, 4.2.4
 */
var app;
var sampleWords;

beforeEach(function() {
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;

  sampleWords = [
    { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0, sheetName: 'Sheet1', originalRowIndex: 2 },
    { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 5, sheetName: 'Sheet1', originalRowIndex: 3 },
    { id: 2, english: 'cat', chinese: '貓', difficultyLevel: 10, sheetName: 'Sheet1', originalRowIndex: 4 },
    { id: 3, english: 'dog', chinese: '狗', difficultyLevel: -999, sheetName: 'Sheet1', originalRowIndex: 5 }
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

  test('jumps negative difficulty directly to 3', function() {
    app.currentIndex = 3; // dog, difficulty -999
    app.increaseDifficulty();
    expect(app.currentWords[3].difficultyLevel).toBe(3);
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

  test('updates difficulty display in DOM', function() {
    app.increaseDifficulty();
    var levelEl = document.getElementById('difficulty-level');
    expect(levelEl.textContent).not.toBe('');
  });

  test('does nothing when pendingRemoval (temporary delete; S key no longer sets 非常熟)', function() {
    app.currentIndex = 0;
    app.pendingRemoval = {
      word: app.currentWords[0],
      index: 0,
      isVeryFamiliar: false
    };
    var spyToast = jest.spyOn(app, 'showVeryFamiliarToast');
    app.increaseDifficulty();
    expect(spyToast).not.toHaveBeenCalled();
    expect(app.pendingRemoval.isVeryFamiliar).not.toBe(true);
    expect(app.currentWords[0].difficultyLevel).toBe(0);
    spyToast.mockRestore();
  });

  test('does not change difficulty when pendingRemoval with higher level word', function() {
    app.currentIndex = 1; // banana, difficulty 5
    app.pendingRemoval = {
      word: app.currentWords[1],
      index: 1,
      isVeryFamiliar: false
    };
    app.increaseDifficulty();
    expect(app.currentWords[1].difficultyLevel).toBe(5);
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

  test('can decrease below 0 to track review count', function() {
    var word = { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.decreaseDifficulty(word);
    expect(word.difficultyLevel).toBe(-1);
  });

  test('floors at -999', function() {
    var word = { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: -999, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.decreaseDifficulty(word);
    expect(word.difficultyLevel).toBe(-999);
  });

  test('decreases from 1 to 0', function() {
    var word = { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 1, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.decreaseDifficulty(word);
    expect(word.difficultyLevel).toBe(0);
  });

  test('does nothing for null word', function() {
    expect(function() { app.decreaseDifficulty(null); }).not.toThrow();
  });

  test('handles undefined difficultyLevel as 0 and decreases to -1', function() {
    var word = { id: 0, english: 'test', chinese: '測試', sheetName: 'Sheet1', originalRowIndex: 2 };
    app.decreaseDifficulty(word);
    expect(word.difficultyLevel).toBe(-1);
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

  test('shows already message when word is already -999', function() {
    app.currentIndex = 3; // dog, difficulty -999
    var spy = jest.spyOn(app, 'showVeryFamiliarToast');
    app.handleMarkVeryFamiliar();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('已經是非常熟'));
  });

  test('allows marking -1 word as very familiar (not already -999)', function() {
    app.currentWords.push({ id: 4, english: 'fox', chinese: '狐狸', difficultyLevel: -1, sheetName: 'Sheet1', originalRowIndex: 6 });
    app.currentIndex = 4;
    var spy = jest.spyOn(app, 'showVeryFamiliarToast');
    app.handleMarkVeryFamiliar();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('再按一下'));
    expect(app._pendingVeryFamiliar).not.toBeNull();
  });

  test('allows marking -500 word as very familiar (not already -999)', function() {
    app.currentWords.push({ id: 5, english: 'wolf', chinese: '狼', difficultyLevel: -500, sheetName: 'Sheet1', originalRowIndex: 7 });
    app.currentIndex = 4;
    var spy = jest.spyOn(app, 'showVeryFamiliarToast');
    app.handleMarkVeryFamiliar();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('再按一下'));
    expect(app._pendingVeryFamiliar).not.toBeNull();
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

  test('enters pending removal state with isVeryFamiliar flag', function() {
    app.currentIndex = 0; // apple, difficulty 0
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    app.confirmMarkVeryFamiliar();
    expect(app.pendingRemoval).not.toBeNull();
    expect(app.pendingRemoval.isVeryFamiliar).toBe(true);
    expect(app.pendingRemoval.word.id).toBe(0);
  });

  test('sets -999 directly in difficultyFilter -1 mode', function() {
    app.currentIndex = 0; // apple, difficulty 0
    app.difficultyFilter = -1;
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    app.confirmMarkVeryFamiliar();
    expect(app.currentWords[0].difficultyLevel).toBe(-999);
    var mainWord = app.words.find(function(w) { return w.id === 0; });
    expect(mainWord.difficultyLevel).toBe(-999);
  });

  test('upgrades existing pendingRemoval to isVeryFamiliar', function() {
    app.currentIndex = 0;
    app.pendingRemoval = { word: app.currentWords[0], index: 0, isVeryFamiliar: false };
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    app.confirmMarkVeryFamiliar();
    expect(app.pendingRemoval.isVeryFamiliar).toBe(true);
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
// confirmMarkVeryFamiliar – edge cases
// ============================================================
describe('confirmMarkVeryFamiliar edge cases', function() {

  test('syncs to backend when setting -999 in difficultyFilter mode', function() {
    app.currentIndex = 0;
    app.difficultyFilter = -1;
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    var spy = jest.spyOn(app, 'syncDifficultyToBackend');
    app.confirmMarkVeryFamiliar();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 0 }));
    spy.mockRestore();
  });

  test('updates SRS data when setting -999 in difficultyFilter mode', function() {
    app.currentIndex = 0;
    app.difficultyFilter = -1;
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    var spy = jest.spyOn(app, 'updateSrsData');
    app.confirmMarkVeryFamiliar();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('does nothing when wordId does not match current word', function() {
    app.currentIndex = 0;
    app._pendingVeryFamiliar = { wordId: 999, timer: null };
    app.confirmMarkVeryFamiliar();
    expect(app.pendingRemoval).toBeNull();
  });

  test('shows second part UI if chinese not yet showing', function() {
    app.currentIndex = 0;
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    app.showingChinese = false;
    var spy = jest.spyOn(app, '_revealSecondPart');
    app.confirmMarkVeryFamiliar();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('sets isProcessingClick when entering pending state', function() {
    app.currentIndex = 0;
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    app.isProcessingClick = false;
    app.confirmMarkVeryFamiliar();
    expect(app.isProcessingClick).toBe(true);
  });

  test('renders difficulty preview as -999', function() {
    app.currentIndex = 0;
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    var spy = jest.spyOn(app, 'renderDifficultyLevelPreview');
    app.confirmMarkVeryFamiliar();
    expect(spy).toHaveBeenCalledWith(-999);
    spy.mockRestore();
  });

  test('records original difficulty for undo', function() {
    app.currentIndex = 1; // banana, difficulty 5
    app._pendingVeryFamiliar = { wordId: 1, timer: null };
    app.confirmMarkVeryFamiliar();
    expect(app.pendingRemoval.originalDifficultyLevel).toBe(5);
  });

  test('resumes timer after direct-set in difficultyFilter mode', function() {
    app.currentIndex = 0;
    app.difficultyFilter = -1;
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    app._vfSavedTimer = { remainingMs: 2000, progressPhase: 1 };
    var spy = jest.spyOn(app, '_resumeTimerAfterVeryFamiliarCancel');
    app.confirmMarkVeryFamiliar();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
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

  test('calls _resumeTimerAfterVeryFamiliarCancel', function() {
    app._pendingVeryFamiliar = { wordId: 0, timer: null };
    var spy = jest.spyOn(app, '_resumeTimerAfterVeryFamiliarCancel');
    app.cancelMarkVeryFamiliar();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
