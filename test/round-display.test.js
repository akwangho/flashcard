var setup = require('./setup');

describe('displayCurrentWord and startNewRound', function() {
  var app;

  beforeAll(function() {
    setup.bootstrapApp();
  });

  beforeEach(function() {
    app = new FlashcardApp();
    jest.useFakeTimers();

    app.words = [
      { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0, image: '' },
      { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 3, image: 'http://img.test/banana.jpg' },
      { id: 2, english: 'cat', chinese: '貓', difficultyLevel: 0, mustSpell: true, image: '' }
    ];
    app.currentWords = app.words.slice();
    app.currentIndex = 0;
    app.isPaused = false;
    app.userPaused = false;
    app.showingChinese = false;
    app.isTransitioning = false;
    app.settings.displayMode = 'english-first';
    app.settings.delayTime = 4.5;
    app.settings.fontSize = 96;
    app.settings.showTimerProgressBar = true;
    app.srsData = {};
    app.srsReviewActive = false;

    app.speakWord = jest.fn();
    app.speakChineseWord = jest.fn();
    app.waitForSpeechThenExecute = jest.fn(function(cb) { cb(); });
    app.clearSpeechWait = jest.fn();
    app.updateActiveFilterDisplay = jest.fn();
    app.updateDifficultyFilterButtonText = jest.fn();
    app.updateReviewFilterButtonText = jest.fn();
    app.syncReviewDates = jest.fn();
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  // ===========================================
  // displayCurrentWord
  // ===========================================
  describe('displayCurrentWord', function() {
    test('sets english text on english-word element', function() {
      app.displayCurrentWord();
      jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
      var el = document.getElementById('english-word');
      expect(el.textContent).toBe('apple');
    });

    test('resets showingChinese to false', function() {
      app.showingChinese = true;
      app.displayCurrentWord();
      expect(app.showingChinese).toBe(false);
    });

    test('clears chinese text initially', function() {
      var chineseEl = document.getElementById('chinese-word');
      chineseEl.textContent = '舊文字';
      app.displayCurrentWord();
      expect(chineseEl.textContent).toBe('');
    });

    test('shows chinese-first text in reversed mode', function() {
      app.settings.displayMode = 'chinese-first';
      app.displayCurrentWord();
      jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
      var el = document.getElementById('english-word');
      expect(el.textContent).toBe('蘋果');
    });

    test('updates progress text', function() {
      app.currentIndex = 1;
      app.displayCurrentWord();
      var progressText = document.getElementById('progress-text');
      expect(progressText.textContent).toBe('2/3');
    });

    test('updates difficulty display', function() {
      app.currentWords[app.currentIndex].difficultyLevel = 5;
      app.displayCurrentWord();
      var display = document.getElementById('difficulty-display');
      expect(display.classList.contains('difficulty-display')).toBe(true);
    });

    test('updates must-spell indicator', function() {
      app.currentWords[app.currentIndex].mustSpell = true;
      app.displayCurrentWord();
      var indicator = document.getElementById('must-spell-indicator');
      expect(indicator.style.display).not.toBe('none');
    });

    test('starts new round when currentWords is empty', function() {
      app.currentWords = [];
      var spy = jest.spyOn(app, 'startNewRound');
      app.displayCurrentWord();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('clears pending removal state', function() {
      app.pendingRemoval = { word: app.words[0] };
      app.displayCurrentWord();
      expect(app.pendingRemoval).toBeNull();
    });

    test('preloads current word image', function() {
      app.currentIndex = 1; // banana has image
      var spy = jest.spyOn(app, 'preloadImage');
      app.displayCurrentWord();
      jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
      expect(spy).toHaveBeenCalledWith('http://img.test/banana.jpg');
      spy.mockRestore();
    });
  });

  // ===========================================
  // startNewRound
  // ===========================================
  describe('startNewRound', function() {
    test('resets currentIndex to 0', function() {
      app.currentIndex = 5;
      app.startNewRound();
      expect(app.currentIndex).toBe(0);
    });

    test('clears removedWords', function() {
      app.removedWords = [{ id: 0 }];
      app.startNewRound();
      expect(app.removedWords).toEqual([]);
    });

    test('clears navigationHistory', function() {
      app.navigationHistory = [1, 2, 3];
      app.startNewRound();
      expect(app.navigationHistory).toEqual([]);
    });

    test('resets pause state', function() {
      app.userPaused = true;
      app.isPaused = true;
      app.startNewRound();
      expect(app.userPaused).toBe(false);
      expect(app.isPaused).toBe(false);
    });

    test('applies filters to words', function() {
      app.difficultyFilter = 0;
      app.reviewFilter = 'all';
      app.startNewRound();
      expect(app.currentWords.length).toBe(3);
    });

    test('handles empty filtered results by resetting filters', function() {
      app.difficultyFilter = 10;
      app.words.forEach(function(w) { w.difficultyLevel = 0; });
      app.startNewRound();
      expect(app.difficultyFilter).toBe(0);
      expect(app.currentWords.length).toBe(3);
    });

    test('deactivates SRS review mode', function() {
      app.srsReviewActive = true;
      app.startNewRound();
      expect(app.srsReviewActive).toBe(false);
    });

    test('calls displayCurrentWord', function() {
      var spy = jest.spyOn(app, 'displayCurrentWord');
      app.startNewRound();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('clears pendingRemoval', function() {
      app.pendingRemoval = { word: app.words[0] };
      app.startNewRound();
      expect(app.pendingRemoval).toBeNull();
    });
  });
});
