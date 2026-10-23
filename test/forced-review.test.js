/**
 * Tests for the forced-review difficulty level (100):
 * always loaded, excluded from statistics, displayed as ★-, and protected
 * from review-related difficulty changes.
 * Spec: openspec/specs/difficulty-marking/spec.md, review-filter/spec.md, srs/spec.md
 */
var app;

beforeEach(function() {
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;

  app.difficultyFilter = 0;
  app.reviewFilter = 'all';
  app.mustSpellFilter = false;
  app.typeFilter = ['word', 'phrase', 'sentence'];
  app.tagFilter = [];
  app.srsData = {};
  app.removedWords = [];
});

function makeWord(id, english, difficultyLevel, overrides) {
  var word = {
    id: id,
    english: english,
    chinese: '翻譯',
    difficultyLevel: difficultyLevel,
    lastReviewDate: '',
    mustSpell: 0,
    tags: [],
    sheetName: 'S1',
    originalRowIndex: id + 1
  };
  if (overrides) {
    for (var k in overrides) {
      if (overrides.hasOwnProperty(k)) word[k] = overrides[k];
    }
  }
  return word;
}

describe('forced-review level detection', function() {
  test('constant is 100', function() {
    expect(APP_CONSTANTS.DIFFICULTY_FORCED_REVIEW).toBe(100);
  });

  test('values >= 100 normalise to 100', function() {
    expect(normalizeDifficultyLevel(100)).toBe(100);
    expect(normalizeDifficultyLevel(1000)).toBe(100);
    expect(normalizeDifficultyLevel(11)).toBe(10);
  });

  test('isForcedReviewLevel accepts 100 and above only', function() {
    expect(isForcedReviewLevel(100)).toBe(true);
    expect(isForcedReviewLevel(1000)).toBe(true);
    expect(isForcedReviewLevel(10)).toBe(false);
    expect(isForcedReviewLevel(-999)).toBe(false);
  });
});

describe('applyAllFilters with forced-review words', function() {
  test('adds forced words beyond a 100-word filtered set (100 + 3 = 103)', function() {
    var words = [];
    for (var i = 0; i < 100; i++) {
      words.push(makeWord(i, 'word' + i, 5));
    }
    for (var f = 0; f < 3; f++) {
      words.push(makeWord(100 + f, 'forced' + f, 100, { lastReviewDate: '2099-01-01' }));
    }

    app.difficultyFilter = 5;
    app.reviewFilter = 'never';

    var result = app.applyAllFilters(words);
    expect(result.length).toBe(103);

    var forcedCount = result.filter(function(w) {
      return w.difficultyLevel === 100;
    }).length;
    expect(forcedCount).toBe(3);
  });

  test('forced words bypass difficulty, type, and tag filters', function() {
    var words = [
      makeWord(0, 'normal', 0),
      makeWord(1, 'forced', 100, { tags: [] })
    ];

    app.difficultyFilter = -1;
    app.typeFilter = ['sentence'];
    app.tagFilter = ['not-this-tag'];

    var result = app.applyAllFilters(words);
    expect(result.length).toBe(1);
    expect(result[0].english).toBe('forced');
  });

  test('does not duplicate forced words already in the source', function() {
    var forced = makeWord(0, 'forced', 100);
    var result = app.applyAllFilters([forced]);
    expect(result.length).toBe(1);
  });
});

describe('statistics exclude forced-review words', function() {
  test('countWordsForFilter does not count forced words', function() {
    app.words = [
      makeWord(0, 'a', 0),
      makeWord(1, 'b', 3),
      makeWord(2, 'forced1', 100),
      makeWord(3, 'forced2', 100)
    ];
    expect(app.countWordsForFilter('all')).toBe(2);
  });

  test('countWordsForDifficultyFilter does not count forced words', function() {
    app.words = [
      makeWord(0, 'a', 0),
      makeWord(1, 'b', 5),
      makeWord(2, 'forced', 100)
    ];
    expect(app.countWordsForDifficultyFilter(0)).toBe(2);
    expect(app.countWordsForDifficultyFilter(5)).toBe(1);
    expect(app.countWordsForDifficultyFilter(10)).toBe(0);
  });

  test('calculateSrsStats ignores forced words in total and distribution', function() {
    var words = [
      makeWord(0, 'a', 0),
      makeWord(1, 'b', 5),
      makeWord(2, 'forced1', 100),
      makeWord(3, 'forced2', 100)
    ];

    var stats = app.calculateSrsStats(words);
    expect(stats.total).toBe(2);

    var bucketTotal = 0;
    for (var i = 0; i < stats.diffBuckets.length; i++) {
      bucketTotal += stats.diffBuckets[i].count;
    }
    expect(bucketTotal).toBe(2);
  });
});

describe('quick review quantity with forced-review words', function() {
  beforeEach(function() {
    app.words = [
      makeWord(0, 'apple', 5),
      makeWord(1, 'banana', 3),
      makeWord(2, 'cat', 1),
      makeWord(3, 'forced1', 100),
      makeWord(4, 'forced2', 100)
    ];
    app.displayCurrentWord = jest.fn();
    app.updateProgress = jest.fn();
    app.updateActiveFilterDisplay = jest.fn();
    app.showNotification = jest.fn();
    app.saveFilterSettings = jest.fn();
  });

  test('selects N normal words plus ALL forced words', function() {
    app.startSrsReview(2);

    expect(app.currentWords.length).toBe(4);
    var forced = app.currentWords.filter(function(w) { return w.difficultyLevel === 100; });
    expect(forced.length).toBe(2);
  });

  test('selection still works when there are no normal words', function() {
    app.words = [
      makeWord(0, 'forced1', 100),
      makeWord(1, 'forced2', 100)
    ];
    app.startSrsReview(0);

    expect(app.currentWords.length).toBe(2);
  });
});

describe('forced-review display', function() {
  beforeEach(function() {
    app.currentWords = [makeWord(0, 'forced', 100), makeWord(1, 'normal', 5)];
    app.currentIndex = 0;
  });

  test('renders a dash instead of the star number', function() {
    app.renderDifficultyLevel();
    expect(document.getElementById('difficulty-level').textContent).toBe('-');
  });

  test('applies the forced CSS class', function() {
    app.renderDifficultyLevel();
    expect(document.getElementById('difficulty-display').classList.contains('difficulty-level-forced')).toBe(true);
  });

  test('preview also renders the dash', function() {
    app.renderDifficultyLevelPreview(100);
    expect(document.getElementById('difficulty-level').textContent).toBe('-');
  });
});

describe('editing preserves forced-review level', function() {
  test('opening and saving without touching difficulty keeps 100', function() {
    var word = makeWord(0, 'forced', 100);
    app.words = [word];
    app.currentWords = [word];
    app.currentIndex = 0;

    app.openEditWordModal();
    expect(document.getElementById('edit-word-difficulty-number').value).toBe('100');
    expect(document.getElementById('edit-word-difficulty-value').textContent).toContain('強制複習');

    app.saveEditWord();
    expect(app.words[0].difficultyLevel).toBe(100);
  });
});

describe('difficulty actions keep forced-review words at 100', function() {
  var word;

  beforeEach(function() {
    word = makeWord(0, 'forced', 100);
    app.words = [word];
    app.currentWords = [word];
    app.currentIndex = 0;
    app.syncDifficultyToBackend = jest.fn();
    app.updateSrsData = jest.fn();
  });

  test('increaseDifficulty does nothing', function() {
    app.increaseDifficulty();
    expect(word.difficultyLevel).toBe(100);
    expect(app.syncDifficultyToBackend).not.toHaveBeenCalled();
  });

  test('decreaseDifficulty does nothing', function() {
    app.decreaseDifficulty(word);
    expect(word.difficultyLevel).toBe(100);
    expect(app.syncDifficultyToBackend).not.toHaveBeenCalled();
  });

  test('quiz wrong-answer increase does nothing', function() {
    app.markWordAsDifficult(word);
    expect(word.difficultyLevel).toBe(100);
    expect(app.syncDifficultyToBackend).not.toHaveBeenCalled();
  });

  test('pending-removal preview keeps 100', function() {
    var other = makeWord(1, 'other', 5);
    app.currentWords = [word, other];
    word.lastReviewDate = '2020-01-01';
    app.showingChinese = false;
    app.isPaused = false;
    app.isTransitioning = false;
    app.isProcessingClick = false;
    app.pendingRemoval = null;
    app.settings.listeningMode = false;
    app.settings.smartTimerEnabled = false;
    app.settings.delayTime = 4.5;
    app._clearDisplayTimer = jest.fn();
    app._revealSecondPart = jest.fn();
    app.showRestoreButton = jest.fn();
    app.updateButtonStates = jest.fn();
    app.startProgressBar = jest.fn();
    app._setDisplayTimer = jest.fn();

    var spy = jest.spyOn(app, 'renderDifficultyLevelPreview');
    app.onWordClick();
    expect(spy).toHaveBeenCalledWith(100);
  });
});
