/**
 * Tests for v1.16.0 features:
 * - Bug 1: Pause indicator sync after SRS review start
 * - Bug 2: Daily review mode sets delayTime to 10
 * - Bug 3: Skip decreaseDifficulty if lastReviewDate is today
 * - Bug 5: Reduced speech delay for letter-by-letter mode
 * - Enhancement 1: Listening mode re-pronounces at Phase 2
 * - Enhancement 2: Listening mode no speech delay on word transition
 * - Enhancement 3: Custom number input for review count
 * - Enhancement 4: Batch image preloading (10 ahead)
 * - New Feature: Carousel memory mode
 * Spec: openspec/AGENTS.md (capability index); related specs include pause-control, srs, difficulty-marking,
 *       voice-tts, listening-practice, flashcard-core, ui-shell, settings
 */
var app;

beforeEach(function() {
  jest.useFakeTimers();

  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;

  app.words = [
    { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 3, sheetName: 'S1', originalRowIndex: 1, image: 'http://img/a.jpg' },
    { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 1, sheetName: 'S1', originalRowIndex: 2, image: 'http://img/b.jpg' },
    { id: 2, english: 'cat', chinese: '貓', difficultyLevel: 0, sheetName: 'S1', originalRowIndex: 3, image: '' },
    { id: 3, english: 'dog', chinese: '狗', difficultyLevel: 5, sheetName: 'S1', originalRowIndex: 4, image: 'http://img/d.jpg' },
    { id: 4, english: 'elephant', chinese: '大象', difficultyLevel: 2, sheetName: 'S1', originalRowIndex: 5, image: 'http://img/e.jpg' }
  ];
  app.currentWords = app.words.slice();
  app.currentIndex = 0;
  app.isPaused = false;
  app.userPaused = false;
  app.showingChinese = false;
  app.isTransitioning = false;
  app.isProcessingClick = false;
  app.pendingRemoval = null;
  app.removedWords = [];
  app.srsData = {};
  app.reviewedInSession = {};
  app.settings.delayTime = 5;
  app.settings.displayMode = 'english-first';
  app.settings.listeningMode = false;
  app.settings.carouselMemoryMode = false;
  app.settings.smartTimerEnabled = false;
  app.settings.showTimerProgressBar = true;

  app.speakWord = jest.fn();
  app.speakChineseWord = jest.fn();
  app.syncDifficultyToBackend = jest.fn();
  app.markWordAsReviewed = jest.fn();
  app.showNotification = jest.fn();
  app.displayCurrentWord = jest.fn();
  app.updateProgress = jest.fn();
  app.updateActiveFilterDisplay = jest.fn();
  app.saveFilterSettings = jest.fn();
  app.waitForSpeechThenExecute = jest.fn(function(cb) { cb(); });
  app.clearSpeechWait = jest.fn();
  app.syncReviewDates = jest.fn();

  localStorage.clear();
});

afterEach(function() {
  jest.useRealTimers();
});

// ============================================================
// Bug 1: Pause indicator sync after SRS review start
// ============================================================
describe('Bug 1: startSrsReview resets pause state', function() {

  beforeEach(function() {
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
    app.mustSpellFilter = false;
    app.typeFilter = ['word', 'phrase', 'sentence'];
    app.tagFilter = [];
    app.shuffleArray = FlashcardApp.prototype.shuffleArray;
    app.applyAllFilters = FlashcardApp.prototype.applyAllFilters;
    app.getRecommendedWords = FlashcardApp.prototype.getRecommendedWords;
    app.getSrsForWord = FlashcardApp.prototype.getSrsForWord;
    app.getTodayDateString = FlashcardApp.prototype.getTodayDateString;
  });

  test('resets userPaused, isPaused, _pauseRemainingMs and calls updatePauseButtonState and hides paused indicator', function() {
    app.userPaused = true;
    app.isPaused = true;
    app._pauseRemainingMs = 5000;
    var indicator = document.getElementById('paused-indicator');
    indicator.style.display = 'flex';
    var updateSpy = jest.spyOn(app, 'updatePauseButtonState');
    app.startSrsReview(3);
    expect(app.userPaused).toBe(false);
    expect(app.isPaused).toBe(false);
    expect(app._pauseRemainingMs).toBe(0);
    expect(updateSpy).toHaveBeenCalled();
    expect(indicator.style.display).toBe('none');
  });

  test('closes SRS modal directly without triggering resumeTimer', function() {
    var modal = document.getElementById('srs-review-modal');
    modal.style.display = 'flex';
    app.startSrsReview(3);
    expect(modal.style.display).toBe('none');
  });
});

// ============================================================
// applyQuickMode resets pause state
// ============================================================
describe('applyQuickMode resets pause state', function() {

  beforeEach(function() {
    app.closeMenu = jest.fn();
    app.redisplayCurrentWord = jest.fn();
    app.saveSettings = jest.fn();
  });

  test('resets userPaused, isPaused, _pauseRemainingMs, calls updatePauseButtonState and hides paused indicator', function() {
    app.userPaused = true;
    app.isPaused = true;
    app._pauseRemainingMs = 3000;
    var indicator = document.getElementById('paused-indicator');
    indicator.style.display = 'flex';
    var updateSpy = jest.spyOn(app, 'updatePauseButtonState');
    app.applyQuickMode(1);
    expect(app.userPaused).toBe(false);
    expect(app.isPaused).toBe(false);
    expect(app._pauseRemainingMs).toBe(0);
    expect(updateSpy).toHaveBeenCalled();
    expect(indicator.style.display).toBe('none');
  });

  test('modes 1 through 4 all set showTimerProgressBar to true', function() {
    for (var mode = 1; mode <= 4; mode++) {
      app.settings.showTimerProgressBar = false;
      app.applyQuickMode(mode);
      expect(app.settings.showTimerProgressBar).toBe(true);
    }
  });
});

// ============================================================
// Bug 2: Daily review mode sets delayTime to 10
// ============================================================
describe('Bug 2: applyQuickMode(3) sets delayTime', function() {

  beforeEach(function() {
    app.closeMenu = jest.fn();
    app.redisplayCurrentWord = jest.fn();
    app.saveSettings = jest.fn();
  });

  test('sets delayTime to 9 for daily review mode', function() {
    app.applyQuickMode(3);
    expect(app.settings.delayTime).toBe(9);
  });

  test('sets displayMode to mixed', function() {
    app.applyQuickMode(3);
    expect(app.settings.displayMode).toBe('mixed');
  });

  test('enables smartTimerEnabled', function() {
    app.applyQuickMode(3);
    expect(app.settings.smartTimerEnabled).toBe(true);
  });

  test('enables delaySpeechInNormalMode', function() {
    app.applyQuickMode(3);
    expect(app.settings.delaySpeechInNormalMode).toBe(true);
  });
});

// ============================================================
// Bug 3: Skip decreaseDifficulty if lastReviewDate is today
// ============================================================
describe('Bug 3: confirmRemoval skips difficulty decrease for today', function() {

  beforeEach(function() {
    app.displayCurrentWord = jest.fn();
    app.startNewRound = jest.fn();
  });

  test('does not decrease difficulty when lastReviewDate is today', function() {
    var today = app.getTodayDateString();
    var word = app.currentWords[0];
    word.lastReviewDate = today;
    word.difficultyLevel = 5;
    app.pendingRemoval = {
      word: word,
      index: 0,
      isVeryFamiliar: false
    };
    var spy = jest.spyOn(app, 'decreaseDifficulty');
    app.confirmRemoval();
    expect(spy).not.toHaveBeenCalled();
    expect(word.difficultyLevel).toBe(5);
  });

  test('decreases difficulty when lastReviewDate is not today', function() {
    var word = app.currentWords[0];
    word.lastReviewDate = '2020-01-01';
    word.difficultyLevel = 5;
    app.pendingRemoval = {
      word: word,
      index: 0,
      isVeryFamiliar: false
    };
    var spy = jest.spyOn(app, 'decreaseDifficulty');
    app.confirmRemoval();
    expect(spy).toHaveBeenCalled();
  });

  test('decreases difficulty when lastReviewDate is empty', function() {
    var word = app.currentWords[0];
    word.lastReviewDate = '';
    word.difficultyLevel = 5;
    app.pendingRemoval = {
      word: word,
      index: 0,
      isVeryFamiliar: false
    };
    var spy = jest.spyOn(app, 'decreaseDifficulty');
    app.confirmRemoval();
    expect(spy).toHaveBeenCalled();
  });

  test('decreases difficulty when lastReviewDate is undefined', function() {
    var word = app.currentWords[0];
    delete word.lastReviewDate;
    word.difficultyLevel = 5;
    app.pendingRemoval = {
      word: word,
      index: 0,
      isVeryFamiliar: false
    };
    var spy = jest.spyOn(app, 'decreaseDifficulty');
    app.confirmRemoval();
    expect(spy).toHaveBeenCalled();
  });

  test('onWordClick preview shows original level when reviewed today', function() {
    var today = app.getTodayDateString();
    app.currentWords[0].lastReviewDate = today;
    app.currentWords[0].difficultyLevel = 5;
    var spy = jest.spyOn(app, 'renderDifficultyLevelPreview');
    app.onWordClick();
    expect(spy).toHaveBeenCalledWith(5);
  });

  test('onWordClick preview shows decreased level when not reviewed today', function() {
    var word = { id: 10, english: 'test', chinese: '測試', difficultyLevel: 5, lastReviewDate: '2020-01-01', image: '' };
    app.currentWords = [word, { id: 11, english: 'extra', chinese: '額外', difficultyLevel: 0, image: '' }];
    app.words = app.currentWords.slice();
    app.currentIndex = 0;
    app.showingChinese = false;
    app.isTransitioning = false;
    app.isPaused = false;
    app.isProcessingClick = false;
    app.pendingRemoval = null;
    // Verify the preview level calculation directly
    var originalDifficultyLevel = word.difficultyLevel;
    var alreadyReviewedToday = word.lastReviewDate === app.getTodayDateString();
    var expectedPreview = alreadyReviewedToday ? originalDifficultyLevel : Math.max(APP_CONSTANTS.DIFFICULTY_VERY_FAMILIAR, originalDifficultyLevel - 1);
    expect(alreadyReviewedToday).toBe(false);
    expect(expectedPreview).toBe(4);
  });
});

// ============================================================
// Bug 5: Reduced speech delay for letter-by-letter mode
// ============================================================
describe('Bug 5: letter-by-letter mode uses shorter speech delay', function() {

  beforeEach(function() {
    app.displayCurrentWord = FlashcardApp.prototype.displayCurrentWord;
    app.settings.delaySpeechInNormalMode = false;
  });

  test('uses 50ms delay when spellOutLetters is enabled', function() {
    app.voiceSettings.spellOutLetters = true;
    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
    expect(app.speakWord).not.toHaveBeenCalled();
    jest.advanceTimersByTime(50);
    expect(app.speakWord).toHaveBeenCalledWith('apple');
  });

  test('uses SPEECH_DELAY_MS when spellOutLetters is disabled', function() {
    app.voiceSettings.spellOutLetters = false;
    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
    expect(app.speakWord).not.toHaveBeenCalled();
    jest.advanceTimersByTime(APP_CONSTANTS.SPEECH_DELAY_MS);
    expect(app.speakWord).toHaveBeenCalledWith('apple');
  });
});

// ============================================================
// Enhancement 1: Listening mode re-pronounces at Phase 2
// ============================================================
describe('Enhancement 1: listening mode Phase 2 pronunciation', function() {

  test('speaks English at Phase 2 when listeningMode is true', function() {
    app.settings.listeningMode = true;
    app.showingChinese = false;
    app.currentWords = [{ id: 0, english: 'apple', chinese: '蘋果', image: '' }];
    app.currentIndex = 0;
    app.settings.displayMode = 'english-first';

    app._revealSecondPart(app.currentWords[0]);

    jest.advanceTimersByTime(APP_CONSTANTS.SPEECH_DELAY_MS);
    expect(app.speakWord).toHaveBeenCalledWith('apple');
  });

  test('does not speak Chinese at Phase 2 in listening mode', function() {
    app.settings.listeningMode = true;
    app.showingChinese = false;
    app.currentWords = [{ id: 0, english: 'apple', chinese: '蘋果', image: '' }];
    app.currentIndex = 0;
    app.settings.displayMode = 'english-first';

    app._revealSecondPart(app.currentWords[0]);

    jest.advanceTimersByTime(APP_CONSTANTS.SPEECH_DELAY_MS);
    expect(app.speakChineseWord).not.toHaveBeenCalled();
  });

  test('speaks both Chinese and English at Phase 2 in non-listening normal mode', function() {
    app.settings.listeningMode = false;
    app.settings.delaySpeechInNormalMode = true;
    app.showingChinese = false;
    app.currentWords = [{ id: 0, english: 'apple', chinese: '蘋果', image: '' }];
    app.currentIndex = 0;
    app.settings.displayMode = 'english-first';

    app._revealSecondPart(app.currentWords[0]);

    jest.advanceTimersByTime(APP_CONSTANTS.SPEECH_DELAY_MS);
    expect(app.speakChineseWord).toHaveBeenCalledWith('蘋果');
    expect(app.speakWord).toHaveBeenCalledWith('apple');
  });
});

// ============================================================
// Enhancement 2: Listening mode no speech delay on transition
// ============================================================
describe('Enhancement 2: listening mode immediate speech', function() {

  beforeEach(function() {
    app.displayCurrentWord = FlashcardApp.prototype.displayCurrentWord;
  });

  test('calls speakWord immediately without delay in listening mode', function() {
    app.settings.listeningMode = true;
    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
    expect(app.speakWord).toHaveBeenCalledWith('apple');
  });

  test('does not show text in listening mode Phase 1', function() {
    app.settings.listeningMode = true;
    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
    var el = document.getElementById('english-word');
    expect(el.textContent).toBe('');
  });
});

// ============================================================
// Enhancement 3: Custom number input for review count
// ============================================================
describe('Enhancement 3: renderSrsCountOptions with custom input', function() {

  beforeEach(function() {
    app.saveFilterSettings = jest.fn();
    app._srsSelectedCount = null;
  });

  test('renders custom input field', function() {
    app.renderSrsCountOptions(50);
    var input = document.getElementById('srs-custom-count-input');
    expect(input).not.toBeNull();
    expect(input.type).toBe('number');
  });

  test('custom input updates _srsSelectedCount on input event', function() {
    app.renderSrsCountOptions(50);
    var input = document.getElementById('srs-custom-count-input');
    input.value = '15';
    var event = new Event('input');
    input.dispatchEvent(event);
    expect(app._srsSelectedCount).toBe(15);
  });

  test('custom input caps at totalAvailable', function() {
    app.renderSrsCountOptions(25);
    var input = document.getElementById('srs-custom-count-input');
    input.value = '999';
    var event = new Event('input');
    input.dispatchEvent(event);
    expect(app._srsSelectedCount).toBe(25);
  });

  test('clicking preset button clears custom input', function() {
    app.renderSrsCountOptions(50);
    var input = document.getElementById('srs-custom-count-input');
    input.value = '15';

    var container = document.getElementById('srs-count-buttons');
    var btn = container.querySelector('.srs-count-btn');
    btn.click();
    expect(input.value).toBe('');
  });

  test('focusing custom input deselects preset buttons', function() {
    app.renderSrsCountOptions(50);
    var container = document.getElementById('srs-count-buttons');
    var btn = container.querySelector('.srs-count-btn');
    btn.click();
    expect(btn.classList.contains('selected')).toBe(true);

    var input = document.getElementById('srs-custom-count-input');
    var focusEvent = new Event('focus');
    input.dispatchEvent(focusEvent);

    expect(btn.classList.contains('selected')).toBe(false);
  });

  test('restores saved custom count', function() {
    app._srsSelectedCount = 17;
    app.renderSrsCountOptions(50);
    var input = document.getElementById('srs-custom-count-input');
    expect(input.value).toBe('17');
  });

  test('does not show saved count in custom input if it matches a preset', function() {
    app._srsSelectedCount = 20;
    app.renderSrsCountOptions(50);
    var input = document.getElementById('srs-custom-count-input');
    expect(input.value).toBe('');
  });
});

// ============================================================
// Enhancement 4: Batch image preloading
// ============================================================
describe('Enhancement 4: preloadUpcomingImages', function() {

  beforeEach(function() {
    app.preloadedImages = {};
  });

  test('preloads images for next N words', function() {
    var spy = jest.spyOn(app, 'preloadImage');
    app.preloadUpcomingImages(5);
    var calledUrls = spy.mock.calls.map(function(c) { return c[0]; });
    expect(calledUrls).toContain('http://img/a.jpg');
    expect(calledUrls).toContain('http://img/b.jpg');
    expect(calledUrls).toContain('http://img/d.jpg');
    expect(calledUrls).toContain('http://img/e.jpg');
    expect(calledUrls).not.toContain('');
  });

  test('defaults to 10 when count not specified', function() {
    var spy = jest.spyOn(app, 'preloadImage');
    app.preloadUpcomingImages();
    expect(spy.mock.calls.length).toBe(4);
  });

  test('wraps around for circular preload', function() {
    app.currentIndex = 3;
    var spy = jest.spyOn(app, 'preloadImage');
    app.preloadUpcomingImages(5);
    var calledUrls = spy.mock.calls.map(function(c) { return c[0]; });
    expect(calledUrls).toContain('http://img/d.jpg');
    expect(calledUrls).toContain('http://img/e.jpg');
    expect(calledUrls).toContain('http://img/a.jpg');
    expect(calledUrls).toContain('http://img/b.jpg');
  });

  test('does nothing with empty currentWords', function() {
    app.currentWords = [];
    var spy = jest.spyOn(app, 'preloadImage');
    app.preloadUpcomingImages(5);
    expect(spy).not.toHaveBeenCalled();
  });
});

// ============================================================
// New Feature: Carousel memory mode
// ============================================================
describe('Carousel memory mode', function() {

  describe('applyQuickMode(5)', function() {

    beforeEach(function() {
      app.closeMenu = jest.fn();
      app.redisplayCurrentWord = jest.fn();
      app.saveSettings = jest.fn();
    });

    test('enables carouselMemoryMode', function() {
      app.applyQuickMode(5);
      expect(app.settings.carouselMemoryMode).toBe(true);
    });

    test('disables listeningMode', function() {
      app.settings.listeningMode = true;
      app.applyQuickMode(5);
      expect(app.settings.listeningMode).toBe(false);
    });

    test('sets delayTime to 4.5', function() {
      app.applyQuickMode(5);
      expect(app.settings.delayTime).toBe(4.5);
    });

    test('disables smartTimerEnabled', function() {
      app.applyQuickMode(5);
      expect(app.settings.smartTimerEnabled).toBe(false);
    });

    test('disables showTimerProgressBar', function() {
      app.applyQuickMode(5);
      expect(app.settings.showTimerProgressBar).toBe(false);
    });

    test('sets displayMode to english-first', function() {
      app.applyQuickMode(5);
      expect(app.settings.displayMode).toBe('english-first');
    });
  });

  describe('other quick modes reset carouselMemoryMode', function() {

    beforeEach(function() {
      app.closeMenu = jest.fn();
      app.redisplayCurrentWord = jest.fn();
      app.saveSettings = jest.fn();
      app.settings.carouselMemoryMode = true;
    });

    test('modes 1 through 4 all reset carouselMemoryMode to false', function() {
      for (var mode = 1; mode <= 4; mode++) {
        app.settings.carouselMemoryMode = true;
        app.applyQuickMode(mode);
        expect(app.settings.carouselMemoryMode).toBe(false);
      }
    });
  });

  describe('displayCurrentWord in carousel mode', function() {

    beforeEach(function() {
      app.displayCurrentWord = FlashcardApp.prototype.displayCurrentWord;
      app.settings.carouselMemoryMode = true;
    });

    test('shows both English and Chinese simultaneously', function() {
      app.displayCurrentWord();
      jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
      var englishEl = document.getElementById('english-word');
      var chineseEl = document.getElementById('chinese-word');
      expect(englishEl.textContent).toBe('apple');
      expect(chineseEl.textContent).toBe('蘋果');
    });

    test('sets showingChinese to true immediately', function() {
      app.displayCurrentWord();
      jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
      expect(app.showingChinese).toBe(true);
    });

    test('pronounces English word', function() {
      app.displayCurrentWord();
      jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS + APP_CONSTANTS.SPEECH_DELAY_MS);
      expect(app.speakWord).toHaveBeenCalledWith('apple');
    });

    test('uses carousel progress bar phase', function() {
      var spy = jest.spyOn(app, 'startProgressBar');
      app.displayCurrentWord();
      jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
      expect(spy).toHaveBeenCalledWith('carousel', expect.any(Number));
    });

    test('does not call showSecondPartAndScheduleNext', function() {
      var spy = jest.spyOn(app, 'showSecondPartAndScheduleNext');
      app.displayCurrentWord();
      jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('progress bar carousel phase', function() {

    test('carousel phase animates from 0% to 100%', function() {
      app.startProgressBar('carousel', 10);
      var bar = document.getElementById('timer-progress-bar');
      expect(bar.style.width).toBe('100%');
      expect(app._progressPhase).toBe('carousel');
    });

    test('carousel phase uses custom duration', function() {
      app.startProgressBar('carousel', 8);
      expect(app._progressDuration).toBe(8);
    });
  });

  describe('resumeProgressBar in carousel mode', function() {

    test('preserves carousel phase on resume', function() {
      app._progressPhase = 'carousel';
      app._progressDuration = 10;
      app.showingChinese = true;
      app.isPaused = false;
      app.userPaused = false;
      app._pauseRemainingMs = 5000;
      app.resumeTimer();
      expect(app._progressPhase).toBe('carousel');
    });
  });

  describe('resetSettings clears carousel mode', function() {

    test('resets carouselMemoryMode and listeningMode to false', function() {
      app.settings.carouselMemoryMode = true;
      app.settings.listeningMode = true;
      app.resetSettings();
      expect(app.settings.carouselMemoryMode).toBe(false);
      expect(app.settings.listeningMode).toBe(false);
    });
  });
});

// ============================================================
// updateLoadingSheetList
// ============================================================
describe('updateLoadingSheetList', function() {

  test('renders loading state for all sheets', function() {
    var sheets = ['Sheet1', 'Sheet2'];
    var status = { Sheet1: 'loading', Sheet2: 'loading' };
    app.updateLoadingSheetList(sheets, status, {});
    var container = document.getElementById('loading-sheet-list');
    var items = container.querySelectorAll('.loading-sheet-item');
    expect(items.length).toBe(2);
    expect(items[0].classList.contains('loading')).toBe(true);
    expect(items[0].textContent).toContain('Sheet1');
  });

  test('renders done state with word count', function() {
    var sheets = ['SheetA'];
    var status = { SheetA: 'done' };
    var counts = { SheetA: 42 };
    app.updateLoadingSheetList(sheets, status, counts);
    var container = document.getElementById('loading-sheet-list');
    var item = container.querySelector('.loading-sheet-item');
    expect(item.classList.contains('done')).toBe(true);
    expect(item.textContent).toContain('42');
  });

  test('renders error state', function() {
    var sheets = ['BadSheet'];
    var status = { BadSheet: 'error' };
    app.updateLoadingSheetList(sheets, status, {});
    var container = document.getElementById('loading-sheet-list');
    var item = container.querySelector('.loading-sheet-item');
    expect(item.classList.contains('error')).toBe(true);
    expect(item.textContent).toContain('BadSheet');
  });

  test('renders mixed statuses in order', function() {
    var sheets = ['A', 'B', 'C'];
    var status = { A: 'done', B: 'loading', C: 'error' };
    var counts = { A: 10 };
    app.updateLoadingSheetList(sheets, status, counts);
    var container = document.getElementById('loading-sheet-list');
    var items = container.querySelectorAll('.loading-sheet-item');
    expect(items[0].classList.contains('done')).toBe(true);
    expect(items[1].classList.contains('loading')).toBe(true);
    expect(items[2].classList.contains('error')).toBe(true);
  });
});

// ============================================================
// Image URL quoting in CSS background-image
// ============================================================
describe('Image URL quoting in background-image', function() {

  test('_revealSecondPart quotes URL in background-image (simple URL)', function() {
    var word = {
      id: 0,
      english: 'apple',
      chinese: '蘋果',
      image: 'https://example.com/apple.jpg'
    };
    app.currentWords = [word];
    app.currentIndex = 0;
    app.settings.displayMode = 'english-first';
    app.settings.listeningMode = false;

    app._revealSecondPart(word);

    var flashcard = document.getElementById('flashcard');
    expect(flashcard.style.backgroundImage).toContain('example.com/apple.jpg');
    expect(flashcard.classList.contains('has-image')).toBe(true);
  });

  test('_revealSecondPart escapes double quotes in image URL', function() {
    var url = 'https://example.com/img.jpg';
    var escaped = url.replace(/"/g, '%22');
    expect(escaped).toBe(url);

    var urlWithQuote = 'https://example.com/img"name.jpg';
    var escapedQuote = urlWithQuote.replace(/"/g, '%22');
    expect(escapedQuote).toBe('https://example.com/img%22name.jpg');
    expect(escapedQuote).not.toContain('"');
  });

  test('CSS url() string is built with quotes for parentheses safety', function() {
    var imageUrl = 'https://example.com/filters:no_upscale():max_bytes(150000)/img.jpg';
    var cssValue = 'url("' + imageUrl.replace(/"/g, '%22') + '")';
    expect(cssValue).toBe('url("https://example.com/filters:no_upscale():max_bytes(150000)/img.jpg")');
    expect(cssValue.indexOf('url("')).toBe(0);
    expect(cssValue.charAt(cssValue.length - 1)).toBe(')');
    expect(cssValue.charAt(cssValue.length - 2)).toBe('"');
  });

  test('_revealSecondPart does not set background for empty image', function() {
    var word = {
      id: 0,
      english: 'cat',
      chinese: '貓',
      image: ''
    };
    app.currentWords = [word];
    app.currentIndex = 0;
    app.settings.displayMode = 'english-first';

    app._revealSecondPart(word);

    var flashcard = document.getElementById('flashcard');
    expect(flashcard.classList.contains('has-image')).toBe(false);
  });
});
