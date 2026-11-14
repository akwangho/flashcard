/**
 * Tests for the 100-card grammar transformation worksheet and its phased reveal.
 * Spec: openspec/specs/grammar-transformation/spec.md
 */

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var setup = require('./setup');

var ROOT = path.join(__dirname, '..');
var DATA_PATH = path.join(ROOT, 'data', 'grammar-transformation-cards.json');
var SEED_PATH = path.join(ROOT, 'grammarFlashcards.gs');

function loadCardData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function loadSeedModule() {
  var source = fs.readFileSync(SEED_PATH, 'utf8');
  var sandbox = {
    console: { log: function() {}, error: function() {} },
    SpreadsheetApp: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(
    source + '\nthis.__cards = GRAMMAR_TRANSFORMATION_CARDS;' +
    'this.__rows = buildGrammarTransformationRows_();',
    sandbox
  );
  return sandbox;
}

describe('grammar transformation dataset', function() {
  var data;

  beforeEach(function() {
    data = loadCardData();
  });

  test('contains exactly 100 cards with 25 cards in each transformation category', function() {
    expect(data.cards).toHaveLength(100);
    var counts = {};
    data.cards.forEach(function(card) {
      counts[card.category] = (counts[card.category] || 0) + 1;
    });
    expect(counts).toEqual({
      'be-negative': 25,
      'be-question': 25,
      'do-negative': 25,
      'do-question': 25
    });
  });

  test('has unique ids, prompts, and answers', function() {
    expect(new Set(data.cards.map(function(card) { return card.id; })).size).toBe(100);
    expect(new Set(data.cards.map(function(card) { return card.prompt; })).size).toBe(100);
    expect(new Set(data.cards.map(function(card) { return card.answer; })).size).toBe(100);
  });

  test('uses the expected sentence forms for every category', function() {
    data.cards.forEach(function(card) {
      expect(card.prompt).toMatch(/^[A-Z]/);
      expect(card.prompt).toMatch(/[.?!]$/);
      expect(card.sourceWords.length).toBeGreaterThan(0);
      expect(card.rule.length).toBeGreaterThan(0);

      if (card.category === 'be-negative') {
        expect(card.answer).toMatch(/\b(am not|are not|is not|aren't|isn't)\b/i);
      } else if (card.category === 'be-question') {
        expect(card.answer).toMatch(/^(Am|Is|Are)\b/);
      } else if (card.category === 'do-negative') {
        expect(card.answer).toMatch(/\b(do not|does not|don't|doesn't)\b/i);
      } else if (card.category === 'do-question') {
        expect(card.answer).toMatch(/^(Do|Does)\b/);
      } else {
        throw new Error('Unknown category: ' + card.category);
      }
    });
  });

  test('keeps the generated Apps Script module in sync with the JSON source', function() {
    var sandbox = loadSeedModule();
    expect(sandbox.__cards).toEqual(data.cards);
  });

  test('builds worksheet rows compatible with the existing A-I vocabulary schema', function() {
    var sandbox = loadSeedModule();
    var rows = sandbox.__rows;
    expect(rows).toHaveLength(100);

    rows.forEach(function(row, index) {
      var card = data.cards[index];
      var instruction = card.category.indexOf('question') !== -1 ? '轉成疑問句' : '轉成否定句';
      expect(row[0]).toBe(0); // 不啟用拼字標記
      expect(row[1]).toBe(card.prompt + ' (' + instruction + ')');
      expect(row[2]).toBe(card.answer);
      expect(row[7]).toContain(APP_CONSTANTS.GRAMMAR_TRANSFORMATION_TAG);
      expect(row[9]).toBe(card.sourceWords.join(', '));
      expect(row[11]).toBe(card.rule);
    });
  });
});

describe('grammar transformation flashcard behavior', function() {
  var app;
  var card;

  beforeEach(function() {
    setup.bootstrapApp();
    app = setup.createApp();
    jest.useFakeTimers();

    card = {
      id: 1,
      english: 'He is from the USA. (轉成疑問句)',
      chinese: 'Is he from the USA?',
      difficultyLevel: 0,
      mustSpell: -1,
      image: '',
      tags: [APP_CONSTANTS.GRAMMAR_TRANSFORMATION_TAG, 'BE疑問句'],
      sheetName: APP_CONSTANTS.GRAMMAR_TRANSFORMATION_SHEET_NAME,
      originalRowIndex: 1
    };
    app.currentWords = [card];
    app.currentIndex = 0;
    app.words = [card];
    app.settings.displayMode = 'english-first';
    app.settings.delayTime = 4.5;
    app.settings.smartTimerEnabled = false;
    app.settings.delaySpeechInNormalMode = false;
    app.settings.listeningMode = false;
    app.settings.carouselMemoryMode = false;
    app.speakWord = jest.fn();
    app.speakChineseWord = jest.fn();
    app.waitForSpeechThenExecute = jest.fn(function(callback) { callback(); });
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  test('recognizes cards by worksheet name or tag', function() {
    expect(app.isGrammarTransformationWord(card)).toBe(true);
    expect(app.isGrammarTransformationWord({
      tags: [APP_CONSTANTS.GRAMMAR_TRANSFORMATION_TAG]
    })).toBe(true);
    expect(app.isGrammarTransformationWord({
      tags: ['數字'],
      sheetName: '單字庫'
    })).toBe(false);
  });

  test('removes the Chinese instruction from prompt speech text', function() {
    expect(app.grammarTransformationPromptSpeechText(card)).toBe('He is from the USA.');
  });

  test('classifies the prompt with a transformation instruction as a sentence', function() {
    expect(getWordType(card.english)).toBe('sentence');
  });

  test('always shows the prompt first, even in Chinese-first or mixed mode', function() {
    app.settings.displayMode = 'chinese-first';
    expect(app.isReversedForCurrentWord()).toBe(false);

    app.settings.displayMode = 'mixed';
    app.currentWordReversed = true;
    expect(app.isReversedForCurrentWord()).toBe(false);
  });

  test('uses the English answer length for smart phase-2 timing', function() {
    app.settings.smartTimerEnabled = true;
    app.settings.delayTime = 5;
    // "Is he from the USA?" has 14 letters: 0.5 + 14 × 0.3 = 4.7 seconds.
    expect(app.getPhase2Delay()).toBeCloseTo(4.7, 5);
  });

  test('uses normal two-phase mode even when carousel or listening mode is enabled', function() {
    app.settings.carouselMemoryMode = true;
    app.settings.listeningMode = true;
    app._displayNormalWord = jest.fn();
    app._displayCarouselWord = jest.fn();
    app._displayListeningWord = jest.fn();

    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);

    expect(app._displayNormalWord).toHaveBeenCalledWith(card);
    expect(app._displayCarouselWord).not.toHaveBeenCalled();
    expect(app._displayListeningWord).not.toHaveBeenCalled();
  });

  test('speaks only the English prompt during phase 1', function() {
    app._displayNormalWord(card);
    jest.advanceTimersByTime(APP_CONSTANTS.SPEECH_DELAY_MS + 10);

    expect(app.speakWord).toHaveBeenCalledWith('He is from the USA.');
    expect(app.speakChineseWord).not.toHaveBeenCalled();
  });

  test('reveals the English answer during phase 2 and speaks it in English', function() {
    app._revealSecondPart(card);
    jest.advanceTimersByTime(APP_CONSTANTS.SPEECH_DELAY_MS + 10);

    expect(document.getElementById('chinese-word').textContent).toBe('Is he from the USA?');
    expect(app.speakWord).toHaveBeenCalledWith('Is he from the USA?');
    expect(app.speakChineseWord).not.toHaveBeenCalled();
  });
});
