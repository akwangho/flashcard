/**
 * Tests for the forced-review difficulty level (100):
 * added by the configured review ratio, excluded from statistics, displayed
 * as ★-, and protected from review-related difficulty changes.
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

// 產生固定的 YYYY-MM-DD 字串；offset 越大代表日期越新。
function reviewDate(offset) {
  var d = new Date(2000, 0, 1 + offset);
  var month = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + '-' +
    (month < 10 ? '0' : '') + month + '-' +
    (day < 10 ? '0' : '') + day;
}

describe('forced-review level detection', function() {
  test('constant is 100', function() {
    expect(APP_CONSTANTS.DIFFICULTY_FORCED_REVIEW).toBe(100);
  });

  test('forced-review ratio defaults to 10 percent', function() {
    expect(APP_CONSTANTS.FORCED_REVIEW_RATIO_DEFAULT).toBe(10);
    expect(app.settings.forcedReviewRatio).toBe(10);
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

  test('adds only 10 percent of the normal count and chooses the longest-unreviewed words', function() {
    var words = [];
    for (var i = 0; i < 100; i++) {
      words.push(makeWord(i, 'word' + i, 5));
    }
    for (var f = 0; f < 50; f++) {
      var date = f === 0 ? '' : reviewDate(f);
      words.push(makeWord(100 + f, 'forced' + f, 100, { lastReviewDate: date }));
    }

    var result = app.applyAllFilters(words);
    var forcedWords = result.filter(function(w) {
      return w.difficultyLevel === 100;
    });

    expect(result.length).toBe(110);
    expect(forcedWords.length).toBe(10);
    expect(forcedWords[0].english).toBe('forced0');       // 從未複習
    expect(forcedWords[1].english).toBe('forced1');       // 最早複習
    expect(forcedWords[9].english).toBe('forced9');
    expect(forcedWords[10]).toBeUndefined();
  });

  test('interleaves forced-review words throughout the carousel list', function() {
    var words = [];
    for (var i = 0; i < 100; i++) {
      words.push(makeWord(i, 'word' + i, 5));
    }
    for (var f = 0; f < 50; f++) {
      words.push(makeWord(100 + f, 'forced' + f, 100, { lastReviewDate: reviewDate(f) }));
    }

    var randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.2);
    var result;
    try {
      result = app.applyAllFilters(words);
    } finally {
      randomSpy.mockRestore();
    }

    var forcedPositions = [];
    for (var j = 0; j < result.length; j++) {
      if (result[j].difficultyLevel === 100) forcedPositions.push(j);
    }
    var forcedInLeadingBlock = result.slice(0, 10).filter(function(w) {
      return w.difficultyLevel === 100;
    }).length;

    expect(forcedPositions.length).toBe(10);
    expect(forcedInLeadingBlock).toBeLessThan(10);
    expect(forcedPositions[forcedPositions.length - 1]).toBeGreaterThan(50);
  });

  test('uses the configurable ratio', function() {
    var words = [];
    for (var i = 0; i < 100; i++) {
      words.push(makeWord(i, 'word' + i, 5));
    }
    for (var f = 0; f < 30; f++) {
      words.push(makeWord(100 + f, 'forced' + f, 100, { lastReviewDate: reviewDate(f) }));
    }

    app.settings.forcedReviewRatio = 25;
    var result = app.applyAllFilters(words);
    var forcedCount = result.filter(function(w) {
      return w.difficultyLevel === 100;
    }).length;
    expect(forcedCount).toBe(25);
    expect(result.length).toBe(125);
  });

  test('a zero ratio disables extra forced-review words', function() {
    var words = [
      makeWord(0, 'normal', 5),
      makeWord(1, 'forced', 100)
    ];

    app.settings.forcedReviewRatio = 0;
    var result = app.applyAllFilters(words);
    expect(result.length).toBe(1);
    expect(result[0].english).toBe('normal');
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

describe('forced-review word interleaving', function() {
  test('places forced-review words at random positions while preserving group order', function() {
    var normalWords = [];
    for (var i = 0; i < 10; i++) {
      normalWords.push(makeWord(i, 'normal' + i, 5));
    }
    var forcedWords = [
      makeWord(100, 'forced0', 100),
      makeWord(101, 'forced1', 100),
      makeWord(102, 'forced2', 100)
    ];

    var result = app.interleaveForcedReviewWords(
      normalWords,
      forcedWords,
      function() { return 0.2; }
    );
    var forcedPositions = [];
    for (var j = 0; j < result.length; j++) {
      if (result[j].difficultyLevel === 100) forcedPositions.push(j);
    }

    expect(result.length).toBe(13);
    expect(forcedPositions).toEqual([3, 4, 9]);
    expect(result[0].english).toBe('normal0');
    expect(result[1].english).toBe('normal1');
    expect(result[2].english).toBe('normal2');
    expect(result[5].english).toBe('normal3');
    expect(result[9].english).toBe('forced2');
    expect(result[10].english).toBe('normal7');
  });

  test('returns the normal list unchanged when there are no forced-review words', function() {
    var normalWords = [makeWord(0, 'normal0', 5), makeWord(1, 'normal1', 5)];
    var result = app.interleaveForcedReviewWords(normalWords, []);
    expect(result.map(function(w) { return w.english; })).toEqual(['normal0', 'normal1']);
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

  test('selects N normal words plus 10 percent extra forced words', function() {
    app.startSrsReview(2);

    expect(app.currentWords.length).toBe(3);
    var forced = app.currentWords.filter(function(w) { return w.difficultyLevel === 100; });
    expect(forced.length).toBe(1);
  });

  test('selecting 100 normal words adds 10 forced-review words', function() {
    var words = [];
    for (var i = 0; i < 100; i++) {
      words.push(makeWord(i, 'word' + i, 5));
    }
    for (var f = 0; f < 50; f++) {
      words.push(makeWord(100 + f, 'forced' + f, 100, { lastReviewDate: reviewDate(f) }));
    }
    app.words = words;

    app.startSrsReview(100);

    expect(app.currentWords.length).toBe(110);
    var forced = app.currentWords.filter(function(w) { return w.difficultyLevel === 100; });
    expect(forced.length).toBe(10);
  });

  test('forced-review words are interleaved throughout the quick-review list', function() {
    var words = [];
    for (var i = 0; i < 100; i++) {
      words.push(makeWord(i, 'word' + i, 5));
    }
    words.push(makeWord(100, 'forced-newer', 100, { lastReviewDate: '2020-02-01' }));
    words.push(makeWord(101, 'forced-never', 100, { lastReviewDate: '' }));
    words.push(makeWord(102, 'forced-older', 100, { lastReviewDate: '2020-01-01' }));
    app.words = words;

    // 固定亂數讓測試可重現，並確保強制複習字不是固定塞在最前面。
    var randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.2);
    try {
      app.startSrsReview(100);
    } finally {
      randomSpy.mockRestore();
    }

    var forced = app.currentWords.filter(function(w) { return w.difficultyLevel === 100; });
    var forcedPositions = [];
    for (var i = 0; i < app.currentWords.length; i++) {
      if (app.currentWords[i].difficultyLevel === 100) forcedPositions.push(i);
    }

    expect(forced.map(function(w) { return w.english; })).toEqual([
      'forced-never',
      'forced-older',
      'forced-newer'
    ]);
    expect(forcedPositions[0]).toBeGreaterThan(0);
    expect(forcedPositions[forcedPositions.length - 1]).toBeGreaterThan(50);
  });

  test('selection still works when there are no normal words', function() {
    app.words = [
      makeWord(0, 'forced1', 100),
      makeWord(1, 'forced2', 100)
    ];
    app.startSrsReview(0);

    expect(app.currentWords.length).toBe(1);
  });
});

describe('changing the forced-review ratio from settings', function() {
  beforeEach(function() {
    var words = [];
    for (var i = 0; i < 100; i++) {
      words.push(makeWord(i, 'word' + i, 5));
    }
    for (var f = 0; f < 50; f++) {
      words.push(makeWord(100 + f, 'forced' + f, 100, { lastReviewDate: reviewDate(f) }));
    }

    app.words = words;
    app.removedWords = [];
    app.srsReviewActive = false;
    app._srsSelectedCount = 100;
    app.currentWords = app.applyAllFilters(app.words);
    app.currentIndex = 0;
    app.displayCurrentWord = jest.fn();
    app.updateActiveFilterDisplay = jest.fn();
    app.showNotification = jest.fn();

    var input = document.getElementById('forced-review-ratio-setting');
    input.value = '10';
  });

  test('immediately rebuilds the active carousel review count', function() {
    expect(app.currentWords.length).toBe(110);

    var input = document.getElementById('forced-review-ratio-setting');
    input.value = '20';
    app.saveSettingsAndClose();

    expect(app.settings.forcedReviewRatio).toBe(20);
    expect(app.currentWords.length).toBe(120);
    expect(document.getElementById('progress-text').textContent).toMatch(/\/120$/);
    expect(app.displayCurrentWord).toHaveBeenCalled();
  });

  test('immediately rebuilds quick review without leaving SRS mode', function() {
    app.srsReviewActive = true;

    var input = document.getElementById('forced-review-ratio-setting');
    input.value = '20';
    app.saveSettingsAndClose();

    expect(app.currentWords.length).toBe(120);
    expect(app.srsReviewActive).toBe(true);
  });

  test('immediately removes extra forced-review words when the ratio becomes zero', function() {
    var input = document.getElementById('forced-review-ratio-setting');
    input.value = '0';
    app.saveSettingsAndClose();

    expect(app.currentWords.length).toBe(100);
    var forcedCount = app.currentWords.filter(function(w) {
      return w.difficultyLevel === 100;
    }).length;
    expect(forcedCount).toBe(0);
    expect(document.getElementById('progress-text').textContent).toMatch(/\/100$/);
  });

  test('does not rebuild the review pool when the ratio is unchanged', function() {
    app._refreshReviewPoolForRatioChange = jest.fn();

    var input = document.getElementById('forced-review-ratio-setting');
    input.value = '10';
    app.saveSettingsAndClose();

    expect(app._refreshReviewPoolForRatioChange).not.toHaveBeenCalled();
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
