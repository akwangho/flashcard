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

  test('filters by difficulty -1 (very familiar only)', function() {
    sampleWords.push({ id: 6, english: 'fox', chinese: '狐狸', difficultyLevel: -1, lastReviewDate: '' });
    app.difficultyFilter = -1;
    app.reviewFilter = 'all';
    var result = app.applyAllFilters(sampleWords);
    expect(result.length).toBe(1);
    expect(result[0].english).toBe('fox');
  });

  test('default difficulty filter 0 excludes -1 words', function() {
    sampleWords.push({ id: 6, english: 'fox', chinese: '狐狸', difficultyLevel: -1, lastReviewDate: '' });
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
    var result = app.applyAllFilters(sampleWords);
    // fox(-1) should be excluded
    expect(result.length).toBe(5);
    var englishes = result.map(function(w) { return w.english; });
    expect(englishes).not.toContain('fox');
  });

  test('filters by must-spell only', function() {
    sampleWords[0].mustSpell = true;  // apple
    sampleWords[2].mustSpell = true;  // cat
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
    app.mustSpellFilter = true;
    var result = app.applyAllFilters(sampleWords);
    expect(result.length).toBe(2);
    expect(result.map(function(w) { return w.english; }).sort()).toEqual(['apple', 'cat']);
  });

  test('must-spell filter with no matching words returns empty', function() {
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
    app.mustSpellFilter = true;
    var result = app.applyAllFilters(sampleWords);
    expect(result.length).toBe(0);
  });

  test('all three filters stack (intersection)', function() {
    sampleWords[0].mustSpell = true;  // apple: difficulty 0, no review, mustSpell
    sampleWords[2].mustSpell = true;  // cat: difficulty 5, reviewed 2026-02-01, mustSpell
    sampleWords[3].mustSpell = true;  // dog: difficulty 8, no review, mustSpell
    app.difficultyFilter = 3;
    app.reviewFilter = 'never';
    app.mustSpellFilter = true;
    var result = app.applyAllFilters(sampleWords);
    // difficulty >= 3 AND never reviewed AND mustSpell: only dog(8, no review, mustSpell)
    expect(result.length).toBe(1);
    expect(result[0].english).toBe('dog');
  });
});

describe('countWordsForFilter', function() {
  beforeEach(function() {
    app.words = [
      { id: 1, english: 'apple', difficultyLevel: 0, lastReviewDate: '', mustSpell: true },
      { id: 2, english: 'banana', difficultyLevel: 3, lastReviewDate: '2025-01-01', mustSpell: false },
      { id: 3, english: 'cat', difficultyLevel: 5, lastReviewDate: '2026-02-07', mustSpell: true },
      { id: 4, english: 'dog', difficultyLevel: 8, lastReviewDate: '', mustSpell: false }
    ];
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
    app.mustSpellFilter = false;
  });

  test('counts all words for "all" filter', function() {
    expect(app.countWordsForFilter('all')).toBe(4);
  });

  test('counts never-reviewed words', function() {
    expect(app.countWordsForFilter('never')).toBe(2); // apple and dog
  });

  test('counts with mustSpellFilter active', function() {
    app.mustSpellFilter = true;
    expect(app.countWordsForFilter('all')).toBe(2); // apple and cat (mustSpell)
    expect(app.countWordsForFilter('never')).toBe(1); // apple (mustSpell + never reviewed)
  });
});

describe('countWordsForDifficultyFilter', function() {
  beforeEach(function() {
    app.words = [
      { id: 1, english: 'apple', difficultyLevel: 0, lastReviewDate: '', mustSpell: true },
      { id: 2, english: 'banana', difficultyLevel: 3, lastReviewDate: '', mustSpell: false },
      { id: 3, english: 'cat', difficultyLevel: 5, lastReviewDate: '', mustSpell: true },
      { id: 4, english: 'dog', difficultyLevel: 8, lastReviewDate: '', mustSpell: false },
      { id: 5, english: 'fox', difficultyLevel: -1, lastReviewDate: '', mustSpell: false }
    ];
    app.reviewFilter = 'all';
    app.mustSpellFilter = false;
  });

  test('returns all words count for minLevel 0 (excludes -1)', function() {
    expect(app.countWordsForDifficultyFilter(0)).toBe(4);
  });

  test('returns count of words >= minLevel', function() {
    expect(app.countWordsForDifficultyFilter(3)).toBe(3); // banana(3), cat(5), dog(8)
    expect(app.countWordsForDifficultyFilter(5)).toBe(2); // cat(5), dog(8)
    expect(app.countWordsForDifficultyFilter(8)).toBe(1); // dog(8)
    expect(app.countWordsForDifficultyFilter(10)).toBe(0);
  });

  test('returns count for -1 (very familiar)', function() {
    expect(app.countWordsForDifficultyFilter(-1)).toBe(1); // fox(-1)
  });

  test('counts with mustSpellFilter active', function() {
    app.mustSpellFilter = true;
    expect(app.countWordsForDifficultyFilter(0)).toBe(2); // apple(0) and cat(5) are mustSpell
    expect(app.countWordsForDifficultyFilter(5)).toBe(1); // cat(5) is mustSpell
  });
});

describe('toggleMustSpellFilter', function() {
  beforeEach(function() {
    app.words = [
      { id: 1, english: 'apple', chinese: '蘋果', difficultyLevel: 0, mustSpell: true },
      { id: 2, english: 'banana', chinese: '香蕉', difficultyLevel: 3, mustSpell: false },
      { id: 3, english: 'cat', chinese: '貓', difficultyLevel: 5, mustSpell: true }
    ];
    app.currentWords = app.words.slice();
    app.currentIndex = 0;
    app.removedWords = [];
    app.mustSpellFilter = false;
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
  });

  test('toggles filter from false to true', function() {
    app.toggleMustSpellFilter();
    expect(app.mustSpellFilter).toBe(true);
  });

  test('toggles filter from true to false', function() {
    app.mustSpellFilter = true;
    app.toggleMustSpellFilter();
    expect(app.mustSpellFilter).toBe(false);
  });

  test('reapplies filters after toggle', function() {
    app.toggleMustSpellFilter();
    // After toggle to true, currentWords should only have mustSpell words
    expect(app.currentWords.length).toBe(2);
    expect(app.currentWords.map(function(w) { return w.english; }).sort()).toEqual(['apple', 'cat']);
  });
});

describe('updateMustSpellFilterButtonText', function() {
  test('shows active text when filter is on', function() {
    app.mustSpellFilter = true;
    app.updateMustSpellFilterButtonText();
    var btn = document.getElementById('must-spell-filter-btn');
    expect(btn.textContent).toContain('篩選');
    expect(btn.textContent).toContain('要會拼');
    expect(btn.style.color).toBe('rgb(135, 206, 235)');
  });

  test('shows default text when filter is off', function() {
    app.mustSpellFilter = false;
    app.updateMustSpellFilterButtonText();
    var btn = document.getElementById('must-spell-filter-btn');
    expect(btn.textContent).toContain('要會拼篩選');
    expect(btn.style.color).toBe('');
  });
});

describe('updateActiveFilterDisplay', function() {
  beforeEach(function() {
    app.currentWords = [
      { id: 1, english: 'apple', chinese: '蘋果' }
    ];
  });

  test('hides indicator when no filters active', function() {
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
    app.mustSpellFilter = false;
    app.updateActiveFilterDisplay();
    var container = document.getElementById('active-filters');
    expect(container.style.display).toBe('none');
  });

  test('shows difficulty filter label', function() {
    app.difficultyFilter = 5;
    app.reviewFilter = 'all';
    app.mustSpellFilter = false;
    app.updateActiveFilterDisplay();
    var textEl = document.getElementById('active-filters-text');
    expect(textEl.textContent).toContain('★5');
  });

  test('shows review filter label', function() {
    app.difficultyFilter = 0;
    app.reviewFilter = 'never';
    app.mustSpellFilter = false;
    app.updateActiveFilterDisplay();
    var textEl = document.getElementById('active-filters-text');
    expect(textEl.textContent).toContain('從未複習');
  });

  test('shows must-spell filter label', function() {
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
    app.mustSpellFilter = true;
    app.updateActiveFilterDisplay();
    var textEl = document.getElementById('active-filters-text');
    expect(textEl.textContent).toContain('要會拼');
    var container = document.getElementById('active-filters');
    expect(container.style.display).toBe('flex');
  });

  test('shows combined filter labels separated by |', function() {
    app.difficultyFilter = 3;
    app.reviewFilter = '2weeks';
    app.mustSpellFilter = true;
    app.updateActiveFilterDisplay();
    var textEl = document.getElementById('active-filters-text');
    expect(textEl.textContent).toContain('★3');
    expect(textEl.textContent).toContain('>2週');
    expect(textEl.textContent).toContain('要會拼');
    expect(textEl.textContent).toContain('|');
  });

  test('shows word count in indicator', function() {
    app.difficultyFilter = 5;
    app.reviewFilter = 'all';
    app.mustSpellFilter = false;
    app.updateActiveFilterDisplay();
    var textEl = document.getElementById('active-filters-text');
    expect(textEl.textContent).toContain('1個');
  });
});

describe('clearAllFilters', function() {
  beforeEach(function() {
    app.words = [
      { id: 1, english: 'apple', chinese: '蘋果', difficultyLevel: 3, mustSpell: true },
      { id: 2, english: 'banana', chinese: '香蕉', difficultyLevel: 5, mustSpell: false }
    ];
    app.currentWords = [];
    app.currentIndex = 0;
    app.removedWords = [];
    app.difficultyFilter = 5;
    app.reviewFilter = 'never';
    app.mustSpellFilter = true;
  });

  test('resets all filter states to defaults', function() {
    app.clearAllFilters();
    expect(app.difficultyFilter).toBe(0);
    expect(app.reviewFilter).toBe('all');
    expect(app.mustSpellFilter).toBe(false);
  });

  test('restores all words after clearing', function() {
    app.clearAllFilters();
    expect(app.currentWords.length).toBe(2);
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
