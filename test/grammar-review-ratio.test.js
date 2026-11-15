/**
 * Tests for the configurable grammar-review ratio.
 * Grammar cards are selected from the dedicated worksheet, bypass normal filters,
 * and are interleaved so they occupy the requested share of the final review pool.
 * Spec: openspec/specs/grammar-transformation/spec.md, settings/spec.md
 */
var fs = require('fs');
var path = require('path');

var app;

beforeEach(function() {
  var originalInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = originalInit;
  app.difficultyFilter = 0;
  app.reviewFilter = 'all';
  app.mustSpellFilter = false;
  app.typeFilter = ['word', 'phrase', 'sentence'];
  app.tagFilter = [];
  app.srsData = {};
  app.removedWords = [];
  app.currentWords = [];
  app.currentIndex = 0;
});

function makeNormalWord(id) {
  return {
    id: id,
    english: 'normal' + id,
    chinese: '一般卡',
    difficultyLevel: 0,
    lastReviewDate: '',
    mustSpell: 0,
    tags: ['normal'],
    sheetName: 'S1',
    originalRowIndex: id + 1
  };
}

function makeGrammarWord(id) {
  return {
    id: id,
    english: 'I am happy. (轉成疑問句)',
    chinese: 'Am I happy?',
    difficultyLevel: 0,
    lastReviewDate: '',
    mustSpell: 0,
    tags: ['文法轉換'],
    sheetName: '文法句型轉換',
    originalRowIndex: id + 1
  };
}

function countGrammar(words) {
  return words.filter(function(word) {
    return app.isGrammarTransformationWord(word);
  }).length;
}

describe('grammar-review ratio configuration', function() {
  test('defaults to 10 percent', function() {
    expect(APP_CONSTANTS.GRAMMAR_REVIEW_RATIO_DEFAULT).toBe(10);
    expect(APP_CONSTANTS.GRAMMAR_REVIEW_RATIO_MIN).toBe(0);
    expect(APP_CONSTANTS.GRAMMAR_REVIEW_RATIO_MAX).toBe(100);
    expect(app.settings.grammarReviewRatio).toBe(10);
    expect(app.getGrammarReviewRatio()).toBe(10);
  });

  test('clamps and repairs invalid saved values', function() {
    app.settings.grammarReviewRatio = 150;
    expect(app.getGrammarReviewRatio()).toBe(100);
    app.settings.grammarReviewRatio = -1;
    expect(app.getGrammarReviewRatio()).toBe(0);
    app.settings.grammarReviewRatio = 'broken';
    expect(app.getGrammarReviewRatio()).toBe(10);
  });

  test('calculates a quota that makes grammar about the requested final share', function() {
    app.settings.grammarReviewRatio = 10;
    expect(app.getGrammarReviewQuota(100, 200)).toBe(11);
    expect(app.getGrammarReviewQuota(1000, 200)).toBe(111);

    app.settings.grammarReviewRatio = 50;
    expect(app.getGrammarReviewQuota(100, 200)).toBe(100);

    app.settings.grammarReviewRatio = 0;
    expect(app.getGrammarReviewQuota(100, 200)).toBe(0);

    app.settings.grammarReviewRatio = 100;
    expect(app.getGrammarReviewQuota(100, 37)).toBe(37);
  });

  test('never requests more grammar cards than are available', function() {
    app.settings.grammarReviewRatio = 50;
    expect(app.getGrammarReviewQuota(100, 3)).toBe(3);
    expect(app.getGrammarReviewQuota(100, 0)).toBe(0);
  });
});

describe('grammar-review pool construction', function() {
  test('includes grammar cards even when normal filters exclude them', function() {
    var words = [];
    for (var i = 0; i < 100; i++) words.push(makeNormalWord(i));
    for (var g = 0; g < 20; g++) words.push(makeGrammarWord(1000 + g));

    app.tagFilter = ['normal'];
    app.difficultyFilter = 0;

    var result = app.applyAllFilters(words);
    expect(countGrammar(result)).toBe(11);
    expect(result.length).toBe(111);
  });

  test('a zero ratio removes grammar cards from the review pool', function() {
    var words = [makeNormalWord(0), makeGrammarWord(1)];
    app.settings.grammarReviewRatio = 0;
    var result = app.applyAllFilters(words);
    expect(result.length).toBe(1);
    expect(countGrammar(result)).toBe(0);
  });

  test('a 100 percent ratio reviews only grammar cards', function() {
    var words = [makeNormalWord(0), makeGrammarWord(1), makeGrammarWord(2)];
    app.settings.grammarReviewRatio = 100;
    var result = app.applyAllFilters(words);
    expect(result.length).toBe(2);
    expect(countGrammar(result)).toBe(2);
  });

  test('keeps normal cards when no grammar source is available', function() {
    app.settings.grammarReviewRatio = 100;
    var result = app.applyAllFilters([makeNormalWord(0)]);
    expect(result.length).toBe(1);
    expect(countGrammar(result)).toBe(0);
  });

  test('quick review adds grammar cards without consuming the normal N slots', function() {
    var source = [];
    for (var i = 0; i < 10; i++) source.push(makeNormalWord(i));
    for (var g = 0; g < 20; g++) source.push(makeGrammarWord(100 + g));

    var result = app._selectSrsReviewWords(source, 10);
    expect(result.filter(function(word) {
      return !app.isGrammarTransformationWord(word);
    }).length).toBe(10);
    expect(countGrammar(result)).toBe(1);
  });

  test('quiz and listening pools exclude the dedicated grammar-review cards', function() {
    var words = [makeNormalWord(0), makeGrammarWord(1), makeGrammarWord(2)];
    app.words = words;

    var quizPool = app.getFilteredWordsExcludingRemoved();
    expect(quizPool.length).toBe(1);
    expect(countGrammar(quizPool)).toBe(0);

    var reviewPool = app.getFilteredWordsExcludingRemoved(true);
    expect(countGrammar(reviewPool)).toBe(1);
  });

  test('grammar cards are interleaved instead of forming one leading block', function() {
    var words = [];
    for (var i = 0; i < 100; i++) words.push(makeNormalWord(i));
    for (var g = 0; g < 20; g++) words.push(makeGrammarWord(1000 + g));

    var randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.2);
    var result;
    try {
      result = app.applyAllFilters(words);
    } finally {
      randomSpy.mockRestore();
    }

    var grammarPositions = [];
    for (var p = 0; p < result.length; p++) {
      if (app.isGrammarTransformationWord(result[p])) grammarPositions.push(p);
    }
    expect(grammarPositions.length).toBe(11);
    expect(grammarPositions[grammarPositions.length - 1]).toBeGreaterThan(50);
  });
});

describe('grammar-review settings persistence and source loading', function() {
  test('reads and persists the grammar-review ratio', function() {
    var input = document.getElementById('grammar-review-ratio-setting');
    input.value = '25';
    app.saveSettingsAndClose();
    expect(app.settings.grammarReviewRatio).toBe(25);

    var stored = JSON.parse(localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.SETTINGS));
    expect(stored.grammarReviewRatio).toBe(25);
  });

  test('clamps the grammar-review ratio to 0-100', function() {
    var input = document.getElementById('grammar-review-ratio-setting');
    input.value = '150';
    app.saveSettingsAndClose();
    expect(app.settings.grammarReviewRatio).toBe(100);
  });

  test('always adds the grammar worksheet to the effective load list', function() {
    app.sheetSettings.sheetId = 'another-sheet';
    app.sheetSettings.selectedSheets = ['Vocabulary'];
    var effective = app.getEffectiveSelectedSheetsForReview();
    expect(effective).toContain('Vocabulary');
    expect(effective).toContain('文法句型轉換');
    expect(effective.filter(function(name) {
      return name === '文法句型轉換';
    }).length).toBe(1);
  });

  test('backend routes grammar reads and writes to the dedicated source spreadsheet', function() {
    var source = fs.readFileSync(path.join(__dirname, '..', 'code.gs'), 'utf8');
    expect(source).toContain('resolveSpreadsheetIdForSheetName');
    expect(source).toContain('GRAMMAR_ROUTING_SPREADSHEET_ID');
    expect(source).toContain('resolveSpreadsheetIdForSheetName(cleanSheetId, sheetName)');
  });
});
