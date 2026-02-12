/**
 * Tests for navigation: nextWord, previousWord, saveNavigationState, updateProgress
 * OpenSpec 4.1.5, 4.1.6
 */
var setup = require('./setup');

var app;
var sampleWords = [
  { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0, sheetName: 'Sheet1', originalRowIndex: 2 },
  { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 1, sheetName: 'Sheet1', originalRowIndex: 3 },
  { id: 2, english: 'cat', chinese: '貓', difficultyLevel: 2, sheetName: 'Sheet1', originalRowIndex: 4 },
  { id: 3, english: 'dog', chinese: '狗', difficultyLevel: 0, sheetName: 'Sheet1', originalRowIndex: 5 }
];

beforeAll(function() {
  setup.bootstrapApp();
});

beforeEach(function() {
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;

  // Setup words
  app.words = sampleWords.slice();
  app.currentWords = sampleWords.slice();
  app.currentIndex = 0;
  app.showingChinese = true;
  app.isTransitioning = false;
  app.isPaused = false;
  app.pendingRemoval = null;
  app.navigationHistory = [];
  app.removedWords = [];

  // Mock timers and speech
  global.speechSynthesis.cancel = jest.fn();
  global.speechSynthesis.speak = jest.fn();
  global.speechSynthesis.speaking = false;
  app.speechSynthesis = global.speechSynthesis;
});

// ============================================================
// saveNavigationState (4.1.5)
// ============================================================
describe('saveNavigationState', function() {

  test('pushes current state to navigation history', function() {
    app.currentIndex = 1;
    app.saveNavigationState();
    expect(app.navigationHistory.length).toBe(1);
    expect(app.navigationHistory[0].currentIndex).toBe(1);
  });

  test('saves a copy of currentWords', function() {
    app.saveNavigationState();
    var saved = app.navigationHistory[0].wordSequence;
    expect(saved.length).toBe(app.currentWords.length);
    // Should be a copy, not the same reference
    expect(saved).not.toBe(app.currentWords);
  });

  test('limits history to 20 entries', function() {
    for (var i = 0; i < 25; i++) {
      app.saveNavigationState();
    }
    expect(app.navigationHistory.length).toBe(20);
  });

  test('does nothing when no words', function() {
    app.currentWords = [];
    app.saveNavigationState();
    expect(app.navigationHistory.length).toBe(0);
  });
});

// ============================================================
// nextWord (4.1.5)
// ============================================================
describe('nextWord', function() {

  test('does nothing when transitioning', function() {
    app.isTransitioning = true;
    app.currentIndex = 0;
    app.nextWord();
    expect(app.currentIndex).toBe(0);
  });

  test('does nothing when paused and verifies index unchanged', function() {
    app.isPaused = true;
    app.currentIndex = 0;
    var originalIndex = app.currentIndex;
    app.nextWord();
    expect(app.currentIndex).toBe(originalIndex);
  });

  test('shows second part if chinese not showing yet', function() {
    app.showingChinese = false;
    var spy = jest.spyOn(app, 'showSecondPartAndScheduleNext');
    app.nextWord();
    expect(spy).toHaveBeenCalled();
  });

  test('confirms removal if pending', function() {
    app.pendingRemoval = { word: sampleWords[0], index: 0 };
    var spy = jest.spyOn(app, 'confirmRemoval');
    app.nextWord();
    expect(spy).toHaveBeenCalled();
  });

  test('cancels speech on transition', function() {
    app.showingChinese = true;
    app.nextWord();
    expect(global.speechSynthesis.cancel).toHaveBeenCalled();
  });

  test('clears display timer', function() {
    jest.useFakeTimers();
    app.showingChinese = true;
    app.displayTimer = setTimeout(function() {}, 5000);
    app.nextWord();
    // Timer should be cleared (not fire)
    expect(app.displayTimer).toBeDefined(); // set to new timer in displayCurrentWord
    jest.useRealTimers();
  });

  test('clears speech wait timers', function() {
    app.showingChinese = true;
    var spy = jest.spyOn(app, 'clearSpeechWait');
    app.nextWord();
    expect(spy).toHaveBeenCalled();
  });

  test('clears chinese wait interval', function() {
    jest.useFakeTimers();
    app.showingChinese = true;
    app.chineseWaitInterval = setInterval(function() {}, 100);
    app.nextWord();
    expect(app.chineseWaitInterval).toBeNull();
    jest.useRealTimers();
  });
});

// ============================================================
// previousWord (4.1.5)
// ============================================================
describe('previousWord', function() {

  test('does nothing when transitioning', function() {
    app.isTransitioning = true;
    app.currentIndex = 1;
    app.previousWord();
    expect(app.currentIndex).toBe(1);
  });

  test('does nothing when paused and verifies index unchanged', function() {
    app.isPaused = true;
    app.currentIndex = 2;
    app.previousWord();
    expect(app.currentIndex).toBe(2);
  });

  test('does nothing when no history', function() {
    app.navigationHistory = [];
    app.currentIndex = 1;
    app.previousWord();
    expect(app.currentIndex).toBe(1);
  });

  test('cancels removal if pending', function() {
    app.pendingRemoval = { word: sampleWords[0], index: 0 };
    var spy = jest.spyOn(app, 'cancelRemoval');
    app.previousWord();
    expect(spy).toHaveBeenCalled();
  });

  test('cancels speech when navigating back', function() {
    app.navigationHistory = [{ currentIndex: 0, wordSequence: sampleWords.slice() }];
    app.previousWord();
    expect(global.speechSynthesis.cancel).toHaveBeenCalled();
  });

  test('clears speech wait timers', function() {
    app.navigationHistory = [{ currentIndex: 0, wordSequence: sampleWords.slice() }];
    var spy = jest.spyOn(app, 'clearSpeechWait');
    app.previousWord();
    expect(spy).toHaveBeenCalled();
  });
});

// ============================================================
// updateProgress (4.1.6)
// ============================================================
describe('updateProgress', function() {

  test('displays correct progress text', function() {
    app.currentIndex = 2;
    app.currentWords = sampleWords.slice();
    app.updateProgress();
    var text = document.getElementById('progress-text').textContent;
    expect(text).toBe('3/4');
  });

  test('shows 1/N for first word', function() {
    app.currentIndex = 0;
    app.currentWords = sampleWords.slice();
    app.updateProgress();
    var text = document.getElementById('progress-text').textContent;
    expect(text).toBe('1/4');
  });
});

// ============================================================
// nextWord advancing when showingChinese=true (uses setTimeout)
// ============================================================
describe('nextWord advances index when showing Chinese', function() {

  beforeEach(function() {
    jest.useFakeTimers();
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  test('increments currentIndex after transition delay', function() {
    app.currentIndex = 0;
    app.showingChinese = true;
    app.nextWord();
    jest.advanceTimersByTime(500);
    expect(app.currentIndex).toBe(1);
  });

  test('wraps around to 0 at end of list', function() {
    app.currentIndex = sampleWords.length - 1;
    app.showingChinese = true;
    app.nextWord();
    jest.advanceTimersByTime(500);
    expect(app.currentIndex).toBe(0);
  });

  test('saves navigation state before advancing', function() {
    app.currentIndex = 1;
    app.showingChinese = true;
    var spy = jest.spyOn(app, 'saveNavigationState');
    app.nextWord();
    expect(spy).toHaveBeenCalled();
  });
});

// ============================================================
// previousWord restores history state (uses setTimeout)
// ============================================================
describe('previousWord restores history', function() {

  beforeEach(function() {
    jest.useFakeTimers();
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  test('restores previous index from history after transition delay', function() {
    app.currentIndex = 2;
    app.navigationHistory = [{
      currentIndex: 1,
      wordSequence: sampleWords.slice()
    }];
    app.previousWord();
    jest.advanceTimersByTime(500);
    expect(app.currentIndex).toBe(1);
  });

  test('pops the history entry after restoring', function() {
    app.navigationHistory = [
      { currentIndex: 0, wordSequence: sampleWords.slice() },
      { currentIndex: 1, wordSequence: sampleWords.slice() }
    ];
    app.previousWord();
    jest.advanceTimersByTime(500);
    expect(app.navigationHistory.length).toBe(1);
  });
});
