/**
 * Tests for the configurable grammar-review ratio.
 * Grammar cards are selected from the dedicated worksheet, bypass normal filters,
 * and use a quota calculated independently from the original normal-word count.
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

function makeForcedWord(id) {
  return {
    id: id,
    english: 'forced' + id,
    chinese: '強制複習卡',
    difficultyLevel: 100,
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
  test('defaults to 5 percent', function() {
    expect(APP_CONSTANTS.GRAMMAR_REVIEW_RATIO_DEFAULT).toBe(5);
    expect(APP_CONSTANTS.GRAMMAR_REVIEW_RATIO_MIN).toBe(0);
    expect(APP_CONSTANTS.GRAMMAR_REVIEW_RATIO_MAX).toBe(100);
    expect(app.settings.grammarReviewRatio).toBe(5);
    expect(app.getGrammarReviewRatio()).toBe(5);
  });

  test('clamps and repairs invalid saved values', function() {
    app.settings.grammarReviewRatio = 150;
    expect(app.getGrammarReviewRatio()).toBe(100);
    app.settings.grammarReviewRatio = -1;
    expect(app.getGrammarReviewRatio()).toBe(0);
    app.settings.grammarReviewRatio = 'broken';
    expect(app.getGrammarReviewRatio()).toBe(5);
  });

  test('calculates grammar quota from the original normal-word count', function() {
    app.settings.grammarReviewRatio = 10;
    expect(app.getGrammarReviewQuota(100, 200)).toBe(10);
    expect(app.getGrammarReviewQuota(1000, 200)).toBe(100);

    app.settings.grammarReviewRatio = 50;
    expect(app.getGrammarReviewQuota(100, 200)).toBe(50);

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
    expect(countGrammar(result)).toBe(5);
    expect(result.length).toBe(105);
  });

  test('a zero ratio removes grammar cards from the review pool', function() {
    var words = [makeNormalWord(0), makeGrammarWord(1)];
    app.settings.grammarReviewRatio = 0;
    var result = app.applyAllFilters(words);
    expect(result.length).toBe(1);
    expect(countGrammar(result)).toBe(0);
  });

  test('a 100 percent ratio adds one grammar card per original normal card', function() {
    var words = [makeNormalWord(0), makeGrammarWord(1), makeGrammarWord(2)];
    app.settings.grammarReviewRatio = 100;
    var result = app.applyAllFilters(words);
    expect(result.length).toBe(2);
    expect(countGrammar(result)).toBe(1);
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

  test('forced-review and grammar quotas both use the original 100 normal cards', function() {
    var source = [];
    for (var i = 0; i < 100; i++) source.push(makeNormalWord(i));
    for (var f = 0; f < 20; f++) source.push(makeForcedWord(1000 + f));
    for (var g = 0; g < 20; g++) source.push(makeGrammarWord(2000 + g));

    app.settings.forcedReviewRatio = 10;
    app.settings.grammarReviewRatio = 5;

    var result = app._selectSrsReviewWords(source, 100);
    var forcedCount = result.filter(function(word) {
      return word.difficultyLevel === 100;
    }).length;

    expect(result.length).toBe(115);
    expect(forcedCount).toBe(10);
    expect(countGrammar(result)).toBe(5);
  });

  test('normal carousel also totals 100 + 10 + 5 = 115', function() {
    var words = [];
    for (var i = 0; i < 100; i++) words.push(makeNormalWord(i));
    for (var f = 0; f < 20; f++) words.push(makeForcedWord(1000 + f));
    for (var g = 0; g < 20; g++) words.push(makeGrammarWord(2000 + g));

    app.settings.forcedReviewRatio = 10;
    app.settings.grammarReviewRatio = 5;

    var result = app.applyAllFilters(words);
    var forcedCount = result.filter(function(word) {
      return word.difficultyLevel === 100;
    }).length;

    expect(result.length).toBe(115);
    expect(forcedCount).toBe(10);
    expect(countGrammar(result)).toBe(5);
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
    expect(grammarPositions.length).toBe(5);
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

  test('migrates the old 10 percent default to 5 percent once', function() {
    localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.SETTINGS, JSON.stringify({
      grammarReviewRatio: 10
    }));
    app.loadSettings();
    expect(app.settings.grammarReviewRatio).toBe(5);
    expect(app.settings.grammarReviewRatioVersion).toBe(2);
  });

  test('keeps a user-selected 10 percent after the default migration version', function() {
    localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.SETTINGS, JSON.stringify({
      grammarReviewRatio: 10,
      grammarReviewRatioVersion: 2
    }));
    app.loadSettings();
    expect(app.settings.grammarReviewRatio).toBe(10);
  });

  test('settings markup shows percentages without fraction descriptions', function() {
    var markup = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    expect(markup).not.toContain('1/10 = 10%');
    expect(markup).toContain('id="grammar-review-ratio-setting"');
    expect(markup).toContain('id="grammar-review-ratio-setting" min="0" max="100" value="5"');
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
