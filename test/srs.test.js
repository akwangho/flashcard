/**
 * Tests for SRS (Spaced Repetition System):
 * getBoxInterval, getInitialBox, updateSrsData, getDueWords,
 * loadSrsData, saveSrsData, getSrsForWord
 * OpenSpec 4.15
 */
var app;

beforeEach(function() {
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;

  app.srsData = {};
  app.words = [];
  localStorage.clear();
});

// ============================================================
// getBoxInterval (4.15.1)
// ============================================================
describe('getBoxInterval', function() {

  test('box 1 returns 1 day', function() {
    expect(app.getBoxInterval(1)).toBe(1);
  });

  test('box 2 returns 3 days', function() {
    expect(app.getBoxInterval(2)).toBe(3);
  });

  test('box 3 returns 7 days', function() {
    expect(app.getBoxInterval(3)).toBe(7);
  });

  test('box 4 returns 14 days', function() {
    expect(app.getBoxInterval(4)).toBe(14);
  });

  test('box 5 returns 30 days', function() {
    expect(app.getBoxInterval(5)).toBe(30);
  });

  test('box 6 returns 60 days', function() {
    expect(app.getBoxInterval(6)).toBe(60);
  });

  test('unknown box defaults to 1 day', function() {
    expect(app.getBoxInterval(99)).toBe(1);
    expect(app.getBoxInterval(0)).toBe(1);
  });
});

// ============================================================
// getInitialBox (4.15.2)
// ============================================================
describe('getInitialBox', function() {

  test('difficulty -1 (very familiar) returns box 5', function() {
    expect(app.getInitialBox(-1)).toBe(5);
  });

  test('difficulty 0 (no mark) returns box 3', function() {
    expect(app.getInitialBox(0)).toBe(3);
  });

  test('difficulty 1-3 (slightly unfamiliar) returns box 2', function() {
    expect(app.getInitialBox(1)).toBe(2);
    expect(app.getInitialBox(2)).toBe(2);
    expect(app.getInitialBox(3)).toBe(2);
  });

  test('difficulty >= 4 (very unfamiliar) returns box 1', function() {
    expect(app.getInitialBox(4)).toBe(1);
    expect(app.getInitialBox(7)).toBe(1);
    expect(app.getInitialBox(10)).toBe(1);
  });
});

// ============================================================
// getSrsForWord
// ============================================================
describe('getSrsForWord', function() {

  test('returns null for word with no SRS data', function() {
    var word = { sheetName: 'Sheet1', originalRowIndex: 2 };
    expect(app.getSrsForWord(word)).toBeNull();
  });

  test('returns SRS entry when data exists', function() {
    app.srsData['Sheet1:2'] = { box: 3, nextReview: '2026-03-01' };
    var word = { sheetName: 'Sheet1', originalRowIndex: 2 };
    var srs = app.getSrsForWord(word);
    expect(srs.box).toBe(3);
    expect(srs.nextReview).toBe('2026-03-01');
  });

  test('returns null for null word', function() {
    expect(app.getSrsForWord(null)).toBeNull();
  });

  test('returns null for word without sheetName', function() {
    expect(app.getSrsForWord({ originalRowIndex: 2 })).toBeNull();
  });
});

// ============================================================
// updateSrsData (4.15.2)
// ============================================================
describe('updateSrsData', function() {

  test('creates initial entry for new word', function() {
    var word = { id: 0, english: 'apple', difficultyLevel: 0, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.updateSrsData(word);
    var srs = app.srsData['Sheet1:2'];
    expect(srs).toBeDefined();
    expect(srs.box).toBe(3); // difficulty 0 → initial box 3
    expect(srs.nextReview).toBeDefined();
  });

  test('initial box matches difficulty for new word', function() {
    var word1 = { id: 0, difficultyLevel: -1, sheetName: 'S1', originalRowIndex: 1 };
    var word2 = { id: 1, difficultyLevel: 5, sheetName: 'S1', originalRowIndex: 2 };
    app.updateSrsData(word1);
    app.updateSrsData(word2);
    expect(app.srsData['S1:1'].box).toBe(5); // -1 → box 5
    expect(app.srsData['S1:2'].box).toBe(1); // 5 → box 1
  });

  test('upgrades box for easy words (difficulty <= 2)', function() {
    app.srsData['Sheet1:2'] = { box: 2, nextReview: '2026-01-01' };
    var word = { id: 0, difficultyLevel: 1, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.updateSrsData(word);
    expect(app.srsData['Sheet1:2'].box).toBe(3); // 2 → 3
  });

  test('upgrades box for very familiar words (difficulty -1)', function() {
    app.srsData['Sheet1:2'] = { box: 4, nextReview: '2026-01-01' };
    var word = { id: 0, difficultyLevel: -1, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.updateSrsData(word);
    expect(app.srsData['Sheet1:2'].box).toBe(5); // 4 → 5
  });

  test('caps box at 6', function() {
    app.srsData['Sheet1:2'] = { box: 6, nextReview: '2026-01-01' };
    var word = { id: 0, difficultyLevel: 0, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.updateSrsData(word);
    expect(app.srsData['Sheet1:2'].box).toBe(6);
  });

  test('resets box to 1 for hard words (difficulty >= 6)', function() {
    app.srsData['Sheet1:2'] = { box: 4, nextReview: '2026-01-01' };
    var word = { id: 0, difficultyLevel: 7, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.updateSrsData(word);
    expect(app.srsData['Sheet1:2'].box).toBe(1);
  });

  test('keeps box unchanged for medium difficulty (3-5)', function() {
    app.srsData['Sheet1:2'] = { box: 3, nextReview: '2026-01-01' };
    var word = { id: 0, difficultyLevel: 4, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.updateSrsData(word);
    expect(app.srsData['Sheet1:2'].box).toBe(3);
  });

  test('sets nextReview date based on box interval', function() {
    var word = { id: 0, difficultyLevel: 0, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.updateSrsData(word);
    var srs = app.srsData['Sheet1:2'];
    // box 3 → 7 day interval
    var today = new Date();
    var expected = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    var expectedStr = expected.getFullYear() + '-' +
      (expected.getMonth() + 1 < 10 ? '0' : '') + (expected.getMonth() + 1) + '-' +
      (expected.getDate() < 10 ? '0' : '') + expected.getDate();
    expect(srs.nextReview).toBe(expectedStr);
  });

  test('skips Demo sheet', function() {
    var word = { id: 0, difficultyLevel: 0, sheetName: 'Demo', originalRowIndex: 2 };
    app.updateSrsData(word);
    expect(Object.keys(app.srsData).length).toBe(0);
  });

  test('skips null word', function() {
    expect(function() { app.updateSrsData(null); }).not.toThrow();
  });

  test('saves to localStorage', function() {
    var word = { id: 0, difficultyLevel: 0, sheetName: 'Sheet1', originalRowIndex: 2 };
    app.updateSrsData(word);
    var stored = JSON.parse(localStorage.getItem('flashcard-srs'));
    expect(stored['Sheet1:2']).toBeDefined();
  });
});

// ============================================================
// getDueWords (4.15)
// ============================================================
describe('getDueWords', function() {

  test('returns words with no SRS data (never reviewed)', function() {
    app.words = [
      { id: 0, english: 'apple', sheetName: 'Sheet1', originalRowIndex: 2 }
    ];
    app.srsData = {};
    var due = app.getDueWords();
    expect(due.length).toBe(1);
  });

  test('returns words past due date', function() {
    app.words = [
      { id: 0, english: 'apple', sheetName: 'Sheet1', originalRowIndex: 2 }
    ];
    app.srsData = { 'Sheet1:2': { box: 1, nextReview: '2020-01-01' } }; // past date
    var due = app.getDueWords();
    expect(due.length).toBe(1);
  });

  test('excludes words with future due date', function() {
    app.words = [
      { id: 0, english: 'apple', sheetName: 'Sheet1', originalRowIndex: 2 }
    ];
    app.srsData = { 'Sheet1:2': { box: 1, nextReview: '2099-12-31' } }; // far future
    var due = app.getDueWords();
    expect(due.length).toBe(0);
  });

  test('returns due words from today', function() {
    var today = app.getTodayDateString();
    app.words = [
      { id: 0, english: 'apple', sheetName: 'Sheet1', originalRowIndex: 2 }
    ];
    app.srsData = { 'Sheet1:2': { box: 1, nextReview: today } }; // due today
    var due = app.getDueWords();
    expect(due.length).toBe(1);
  });

  test('handles mixed due and not-due words', function() {
    app.words = [
      { id: 0, english: 'apple', sheetName: 'S1', originalRowIndex: 1 },
      { id: 1, english: 'banana', sheetName: 'S1', originalRowIndex: 2 },
      { id: 2, english: 'cat', sheetName: 'S1', originalRowIndex: 3 }
    ];
    app.srsData = {
      'S1:1': { box: 1, nextReview: '2020-01-01' }, // past due
      'S1:2': { box: 1, nextReview: '2099-12-31' }, // not due
      // S1:3 has no SRS data → due
    };
    var due = app.getDueWords();
    expect(due.length).toBe(2); // apple + cat
  });
});

// ============================================================
// loadSrsData / saveSrsData (4.15.3)
// ============================================================
describe('loadSrsData and saveSrsData', function() {

  test('round-trips SRS data through localStorage', function() {
    app.srsData = { 'Sheet1:2': { box: 3, nextReview: '2026-03-01' } };
    app.saveSrsData();
    app.srsData = {};
    app.loadSrsData();
    expect(app.srsData['Sheet1:2'].box).toBe(3);
    expect(app.srsData['Sheet1:2'].nextReview).toBe('2026-03-01');
  });

  test('loadSrsData returns empty object when no data', function() {
    localStorage.removeItem('flashcard-srs');
    app.loadSrsData();
    expect(app.srsData).toEqual({});
  });

  test('loadSrsData handles corrupted data', function() {
    localStorage.setItem('flashcard-srs', 'not-json');
    app.loadSrsData();
    expect(app.srsData).toEqual({});
  });
});

// ============================================================
// getRecommendedWords
// ============================================================
describe('getRecommendedWords', function() {

  test('returns all words when no SRS data exists', function() {
    app.words = [
      { id: 0, english: 'apple', sheetName: 'S1', originalRowIndex: 1, difficultyLevel: 3 },
      { id: 1, english: 'banana', sheetName: 'S1', originalRowIndex: 2, difficultyLevel: 1 }
    ];
    app.srsData = {};
    var result = app.getRecommendedWords();
    expect(result.length).toBe(2);
  });

  test('due/overdue words come before never-reviewed', function() {
    app.words = [
      { id: 0, english: 'apple', sheetName: 'S1', originalRowIndex: 1, difficultyLevel: 0 },
      { id: 1, english: 'banana', sheetName: 'S1', originalRowIndex: 2, difficultyLevel: 5 }
    ];
    app.srsData = {
      'S1:1': { box: 1, nextReview: '2020-01-01' }
    };
    var result = app.getRecommendedWords();
    expect(result[0].english).toBe('apple');
  });

  test('never-reviewed words come before future-due words', function() {
    app.words = [
      { id: 0, english: 'apple', sheetName: 'S1', originalRowIndex: 1, difficultyLevel: 3 },
      { id: 1, english: 'banana', sheetName: 'S1', originalRowIndex: 2, difficultyLevel: 0 }
    ];
    app.srsData = {
      'S1:2': { box: 3, nextReview: '2099-12-31' }
    };
    var result = app.getRecommendedWords();
    expect(result[0].english).toBe('apple');
    expect(result[1].english).toBe('banana');
  });

  test('among never-reviewed, higher difficulty comes first', function() {
    app.words = [
      { id: 0, english: 'easy', sheetName: 'S1', originalRowIndex: 1, difficultyLevel: 1 },
      { id: 1, english: 'hard', sheetName: 'S1', originalRowIndex: 2, difficultyLevel: 8 },
      { id: 2, english: 'medium', sheetName: 'S1', originalRowIndex: 3, difficultyLevel: 4 }
    ];
    app.srsData = {};
    var result = app.getRecommendedWords();
    expect(result[0].english).toBe('hard');
    expect(result[1].english).toBe('medium');
    expect(result[2].english).toBe('easy');
  });

  test('among due words with same date, lower box comes first', function() {
    app.words = [
      { id: 0, english: 'highbox', sheetName: 'S1', originalRowIndex: 1 },
      { id: 1, english: 'lowbox', sheetName: 'S1', originalRowIndex: 2 }
    ];
    app.srsData = {
      'S1:1': { box: 4, nextReview: '2020-01-01' },
      'S1:2': { box: 1, nextReview: '2020-01-01' }
    };
    var result = app.getRecommendedWords();
    // sortKey = -(box), so -4 < -1 → box 4 sorts first (more negative = earlier)
    expect(result[0].english).toBe('highbox');
    expect(result[1].english).toBe('lowbox');
  });

  test('accepts sourceWords parameter', function() {
    app.words = [
      { id: 0, english: 'from-words', sheetName: 'S1', originalRowIndex: 1 }
    ];
    var custom = [
      { id: 1, english: 'from-source', sheetName: 'S1', originalRowIndex: 2 }
    ];
    app.srsData = {};
    var result = app.getRecommendedWords(custom);
    expect(result.length).toBe(1);
    expect(result[0].english).toBe('from-source');
  });

  test('negative difficulty words sort last among never-reviewed', function() {
    app.words = [
      { id: 0, english: 'familiar', sheetName: 'S1', originalRowIndex: 1, difficultyLevel: -1 },
      { id: 1, english: 'hard', sheetName: 'S1', originalRowIndex: 2, difficultyLevel: 5 }
    ];
    app.srsData = {};
    var result = app.getRecommendedWords();
    expect(result[0].english).toBe('hard');
    expect(result[1].english).toBe('familiar');
  });
});

// ============================================================
// calculateSrsStats
// ============================================================
describe('calculateSrsStats', function() {

  test('returns null for empty word list', function() {
    var result = app.calculateSrsStats([]);
    expect(result).toBeNull();
  });

  test('returns null when no words', function() {
    var result = app.calculateSrsStats(null);
    expect(result).toBeNull();
  });

  test('counts total words correctly', function() {
    var words = [
      { id: 0, english: 'a', difficultyLevel: 0 },
      { id: 1, english: 'b', difficultyLevel: 3 },
      { id: 2, english: 'c', difficultyLevel: 7 }
    ];
    var stats = app.calculateSrsStats(words);
    expect(stats.total).toBe(3);
  });

  test('counts never-reviewed words', function() {
    var words = [
      { id: 0, english: 'a', difficultyLevel: 0 },
      { id: 1, english: 'b', difficultyLevel: 0, lastReviewDate: '2026-02-20' }
    ];
    var stats = app.calculateSrsStats(words);
    expect(stats.neverReviewed).toBe(1);
  });

  test('computes difficulty distribution', function() {
    var words = [
      { id: 0, english: 'a', difficultyLevel: -999 },
      { id: 1, english: 'b', difficultyLevel: 0 },
      { id: 2, english: 'c', difficultyLevel: 5 },
      { id: 3, english: 'd', difficultyLevel: 10 }
    ];
    var stats = app.calculateSrsStats(words);
    var mastered = stats.diffBuckets.find(function(b) { return b.label === '非常熟'; });
    var star0 = stats.diffBuckets.find(function(b) { return b.label === '★0'; });
    var star56 = stats.diffBuckets.find(function(b) { return b.label === '★5-6'; });
    var star910 = stats.diffBuckets.find(function(b) { return b.label === '★9-10'; });
    expect(mastered.count).toBe(1);
    expect(star0.count).toBe(1);
    expect(star56.count).toBe(1);
    expect(star910.count).toBe(1);
  });

  test('defaults to this.words when no sourceWords given', function() {
    app.words = [
      { id: 0, english: 'a', difficultyLevel: 0 }
    ];
    var stats = app.calculateSrsStats();
    expect(stats.total).toBe(1);
  });

  test('reviewStats has 4 cutoff periods', function() {
    var words = [
      { id: 0, english: 'a', difficultyLevel: 0 }
    ];
    var stats = app.calculateSrsStats(words);
    expect(stats.reviewStats.length).toBe(4);
    expect(stats.reviewStats[0].label).toBe('三天內已複習');
    expect(stats.reviewStats[3].label).toBe('一個月內已複習');
  });
});

// ============================================================
// startSrsReview
// ============================================================
describe('startSrsReview', function() {

  beforeEach(function() {
    app.words = [
      { id: 0, english: 'apple', chinese: '蘋果', sheetName: 'S1', originalRowIndex: 1, difficultyLevel: 5 },
      { id: 1, english: 'banana', chinese: '香蕉', sheetName: 'S1', originalRowIndex: 2, difficultyLevel: 3 },
      { id: 2, english: 'cat', chinese: '貓', sheetName: 'S1', originalRowIndex: 3, difficultyLevel: 1 }
    ];
    app.srsData = {};
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
    app.mustSpellFilter = false;
    app.typeFilter = ['word', 'phrase', 'sentence'];
    app.tagFilter = [];
    app.displayCurrentWord = jest.fn();
    app.updateProgress = jest.fn();
    app.updateActiveFilterDisplay = jest.fn();
    app.closeSrsReviewModal = jest.fn();
    app.showNotification = jest.fn();
    app.shuffleArray = FlashcardApp.prototype.shuffleArray;
    app.applyAllFilters = FlashcardApp.prototype.applyAllFilters;
    app.getRecommendedWords = FlashcardApp.prototype.getRecommendedWords;
    app.getSrsForWord = FlashcardApp.prototype.getSrsForWord;
    app.getTodayDateString = FlashcardApp.prototype.getTodayDateString;
    app.saveFilterSettings = jest.fn();
  });

  test('sets currentWords to the requested count', function() {
    app.startSrsReview(2);
    expect(app.currentWords.length).toBe(2);
  });

  test('sets srsReviewActive to true', function() {
    app.startSrsReview(3);
    expect(app.srsReviewActive).toBe(true);
  });

  test('resets currentIndex and removedWords', function() {
    app.currentIndex = 5;
    app.removedWords = [{ id: 99 }];
    app.startSrsReview(2);
    expect(app.currentIndex).toBe(0);
    expect(app.removedWords).toEqual([]);
  });

  test('calls displayCurrentWord', function() {
    app.startSrsReview(2);
    expect(app.displayCurrentWord).toHaveBeenCalled();
  });

  test('caps at available word count', function() {
    app.startSrsReview(100);
    expect(app.currentWords.length).toBe(3);
  });

  test('shows notification when no words match filters', function() {
    app.words = [];
    app.startSrsReview(10);
    expect(app.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('沒有符合'),
      'info'
    );
  });
});

