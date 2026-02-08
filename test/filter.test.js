/**
 * Tests for filtering: getFilterCutoffDate, applyAllFilters, countWordsForFilter, countWordsForDifficultyFilter
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

describe('getFilterCutoffDate', function() {

  test('returns a date string in YYYY-MM-DD format for 2weeks', function() {
    var result = app.getFilterCutoffDate('2weeks');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('2weeks cutoff is about 14 days ago', function() {
    var result = app.getFilterCutoffDate('2weeks');
    var cutoffDate = new Date(result);
    var now = new Date();
    var diffDays = Math.round((now - cutoffDate) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(13);
    expect(diffDays).toBeLessThanOrEqual(15);
  });

  test('1month cutoff is about 30 days ago', function() {
    var result = app.getFilterCutoffDate('1month');
    var cutoffDate = new Date(result);
    var now = new Date();
    var diffDays = Math.round((now - cutoffDate) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  test('3months cutoff is about 90 days ago', function() {
    var result = app.getFilterCutoffDate('3months');
    var cutoffDate = new Date(result);
    var now = new Date();
    var diffDays = Math.round((now - cutoffDate) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(89);
    expect(diffDays).toBeLessThanOrEqual(91);
  });

  test('6months cutoff is about 180 days ago', function() {
    var result = app.getFilterCutoffDate('6months');
    var cutoffDate = new Date(result);
    var now = new Date();
    var diffDays = Math.round((now - cutoffDate) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(179);
    expect(diffDays).toBeLessThanOrEqual(181);
  });

  test('unknown filter type returns 9999-12-31', function() {
    expect(app.getFilterCutoffDate('unknown')).toBe('9999-12-31');
    expect(app.getFilterCutoffDate('all')).toBe('9999-12-31');
  });
});

describe('applyAllFilters', function() {
  var sampleWords;

  beforeEach(function() {
    sampleWords = [
      { id: 1, english: 'apple', chinese: '蘋果', difficultyLevel: 0, lastReviewDate: '' },
      { id: 2, english: 'banana', chinese: '香蕉', difficultyLevel: 3, lastReviewDate: '2025-01-01' },
      { id: 3, english: 'cat', chinese: '貓', difficultyLevel: 5, lastReviewDate: '2026-02-01' },
      { id: 4, english: 'dog', chinese: '狗', difficultyLevel: 8, lastReviewDate: '' },
      { id: 5, english: 'egg', chinese: '蛋', difficultyLevel: 1, lastReviewDate: '2026-02-07' }
    ];
  });

  test('returns all words when no filters are active', function() {
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
    var result = app.applyAllFilters(sampleWords);
    expect(result.length).toBe(5);
  });

  test('filters by difficulty level', function() {
    app.difficultyFilter = 5;
    app.reviewFilter = 'all';
    var result = app.applyAllFilters(sampleWords);
    // Should keep words with difficultyLevel >= 5: cat(5) and dog(8)
    expect(result.length).toBe(2);
    expect(result.map(function(w) { return w.english; }).sort()).toEqual(['cat', 'dog']);
  });

  test('filters by never reviewed', function() {
    app.difficultyFilter = 0;
    app.reviewFilter = 'never';
    var result = app.applyAllFilters(sampleWords);
    // Should keep words with empty lastReviewDate: apple and dog
    expect(result.length).toBe(2);
    expect(result.map(function(w) { return w.english; }).sort()).toEqual(['apple', 'dog']);
  });

  test('difficulty and review filters stack (intersection)', function() {
    app.difficultyFilter = 3;
    app.reviewFilter = 'never';
    var result = app.applyAllFilters(sampleWords);
    // difficulty >= 3 AND never reviewed: only dog(8, no review date)
    expect(result.length).toBe(1);
    expect(result[0].english).toBe('dog');
  });

  test('does not modify the original array', function() {
    app.difficultyFilter = 5;
    app.reviewFilter = 'all';
    app.applyAllFilters(sampleWords);
    expect(sampleWords.length).toBe(5);
  });
});

describe('countWordsForFilter', function() {
  beforeEach(function() {
    app.words = [
      { id: 1, english: 'apple', difficultyLevel: 0, lastReviewDate: '' },
      { id: 2, english: 'banana', difficultyLevel: 3, lastReviewDate: '2025-01-01' },
      { id: 3, english: 'cat', difficultyLevel: 5, lastReviewDate: '2026-02-07' },
      { id: 4, english: 'dog', difficultyLevel: 8, lastReviewDate: '' }
    ];
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
  });

  test('counts all words for "all" filter', function() {
    expect(app.countWordsForFilter('all')).toBe(4);
  });

  test('counts never-reviewed words', function() {
    expect(app.countWordsForFilter('never')).toBe(2); // apple and dog
  });
});

describe('countWordsForDifficultyFilter', function() {
  beforeEach(function() {
    app.words = [
      { id: 1, english: 'apple', difficultyLevel: 0, lastReviewDate: '' },
      { id: 2, english: 'banana', difficultyLevel: 3, lastReviewDate: '' },
      { id: 3, english: 'cat', difficultyLevel: 5, lastReviewDate: '' },
      { id: 4, english: 'dog', difficultyLevel: 8, lastReviewDate: '' }
    ];
    app.reviewFilter = 'all';
  });

  test('returns all words count for minLevel 0', function() {
    expect(app.countWordsForDifficultyFilter(0)).toBe(4);
  });

  test('returns count of words >= minLevel', function() {
    expect(app.countWordsForDifficultyFilter(3)).toBe(3); // banana(3), cat(5), dog(8)
    expect(app.countWordsForDifficultyFilter(5)).toBe(2); // cat(5), dog(8)
    expect(app.countWordsForDifficultyFilter(8)).toBe(1); // dog(8)
    expect(app.countWordsForDifficultyFilter(10)).toBe(0);
  });
});

describe('getTodayDateString', function() {
  test('returns date in YYYY-MM-DD format', function() {
    var result = app.getTodayDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('returns today\'s date', function() {
    var result = app.getTodayDateString();
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    if (month < 10) month = '0' + month;
    if (day < 10) day = '0' + day;
    var expected = year + '-' + month + '-' + day;
    expect(result).toBe(expected);
  });
});
