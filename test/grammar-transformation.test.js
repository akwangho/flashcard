/**
 * Tests for the 200-card mixed grammar transformation worksheet and its phased reveal.
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

function countBy(cards, field) {
  var counts = {};
  cards.forEach(function(card) {
    counts[card[field]] = (counts[card[field]] || 0) + 1;
  });
  return counts;
}

describe('grammar transformation dataset', function() {
  var data;

  beforeEach(function() {
    data = loadCardData();
  });

  test('contains exactly 200 cards with 25 cards in each of eight categories', function() {
    expect(data.schemaVersion).toBe(2);
    expect(data.cards).toHaveLength(200);
    expect(countBy(data.cards, 'category')).toEqual({
      'be-affirmative-to-negative': 25,
      'be-affirmative-to-question': 25,
      'be-negative-to-question': 25,
      'be-question-to-affirmative': 25,
      'do-affirmative-to-negative': 25,
      'do-affirmative-to-question': 25,
      'do-negative-to-question': 25,
      'do-question-to-affirmative': 25
    });
  });

  test('mixes four transformation directions equally across BE and Do/Does', function() {
    expect(countBy(data.cards, 'transformation')).toEqual({
      'affirmative-to-negative': 50,
      'affirmative-to-question': 50,
      'negative-to-question': 50,
      'question-to-affirmative': 50
    });
    expect(countBy(data.cards, 'grammarFamily')).toEqual({
      be: 100,
      do: 100
    });
    expect(countBy(data.cards, 'promptType')).toEqual({
      affirmative: 100,
      negative: 50,
      question: 50
    });
    expect(countBy(data.cards, 'answerType')).toEqual({
      question: 100,
      negative: 50,
      affirmative: 50
    });
  });

  test('uses one answer per card and mixes contracted and expanded negatives', function() {
    var answerForms = { contracted: 0, expanded: 0 };
    data.cards.forEach(function(card) {
      expect(card.answer).not.toMatch(/\s\/\s/);
      expect(card.answer).toMatch(/[.?!]$/);
      if (card.answerContraction) answerForms[card.answerContraction] += 1;
    });
    expect(answerForms).toEqual({ contracted: 25, expanded: 25 });
  });

  test('has unique ids and complete prompts while allowing related answers', function() {
    expect(new Set(data.cards.map(function(card) { return card.id; })).size).toBe(200);
    var completePrompts = data.cards.map(function(card) {
      return card.prompt + ' (' + card.instruction + ')';
    });
    expect(new Set(completePrompts).size).toBe(200);
    expect(new Set(data.cards.map(function(card) { return card.baseId; })).size).toBe(50);
  });

  test('keeps each base sentence internally consistent across four directions', function() {
    var baseSets = {};
    data.cards.forEach(function(card) {
      if (!baseSets[card.baseId]) baseSets[card.baseId] = {};
      baseSets[card.baseId][card.transformation] = card;
    });
    Object.keys(baseSets).forEach(function(baseId) {
      var set = baseSets[baseId];
      expect(Object.keys(set)).toHaveLength(4);
      expect(set['question-to-affirmative'].prompt).toBe(set['affirmative-to-question'].answer);
      expect(set['question-to-affirmative'].answer).toBe(set['affirmative-to-question'].prompt);
      expect(set['negative-to-question'].answer).toBe(set['affirmative-to-question'].answer);
    });
  });

  test('keeps the generated Apps Script module in sync with the JSON source', function() {
    var sandbox = loadSeedModule();
    expect(sandbox.__cards).toEqual(data.cards);
  });

  test('builds worksheet rows compatible with the existing A-I vocabulary schema', function() {
    var sandbox = loadSeedModule();
    var rows = sandbox.__rows;
    expect(rows).toHaveLength(200);

    rows.forEach(function(row, index) {
      var card = data.cards[index];
      expect(row[0]).toBe(0); // 不啟用拼字標記
      expect(row[1]).toBe(card.prompt + ' (' + card.instruction + ')');
      expect(row[2]).toBe(card.answer);
      expect(row[2]).not.toMatch(/\s\/\s/);
      expect(row[7]).toContain(APP_CONSTANTS.GRAMMAR_TRANSFORMATION_TAG);
      expect(row[9]).toBe(card.sourceWords.join(', '));
      expect(row[10]).toContain('→');
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
      english: 'Are you angry? (轉成肯定句)',
      chinese: 'You are angry.',
      difficultyLevel: 0,
      mustSpell: 0,
      image: '',
      tags: [APP_CONSTANTS.GRAMMAR_TRANSFORMATION_TAG, 'BE疑問→肯定'],
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

  test('removes every Chinese transformation instruction from prompt speech text', function() {
    expect(app.grammarTransformationPromptSpeechText(card)).toBe('Are you angry?');
    expect(app.grammarTransformationPromptSpeechText({
      english: 'He is not tired. (轉成疑問句)'
    })).toBe('He is not tired.');
    expect(app.grammarTransformationPromptSpeechText({
      english: 'He is tired. (轉成否定句)'
    })).toBe('He is tired.');
  });

  test('classifies affirmative, negative, and question prompts as sentences', function() {
    expect(getWordType('I am tired. (轉成否定句)')).toBe('sentence');
    expect(getWordType('I am not tired. (轉成疑問句)')).toBe('sentence');
    expect(getWordType('Am I tired? (轉成肯定句)')).toBe('sentence');
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
    // "You are angry." has 11 letters: 0.5 + 11 × 0.3 = 3.8 seconds.
    expect(app.getPhase2Delay()).toBeCloseTo(3.8, 5);
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

  test('speaks only the English question prompt during phase 1', function() {
    app._displayNormalWord(card);
    jest.advanceTimersByTime(APP_CONSTANTS.SPEECH_DELAY_MS + 10);

    expect(app.speakWord).toHaveBeenCalledWith('Are you angry?');
    expect(app.speakChineseWord).not.toHaveBeenCalled();
  });

  test('reveals the English answer during phase 2 and speaks it in English', function() {
    app._revealSecondPart(card);
    jest.advanceTimersByTime(APP_CONSTANTS.SPEECH_DELAY_MS + 10);

    var answerElement = document.getElementById('chinese-word');
    expect(answerElement.textContent).toBe('You are angry.');
    expect(answerElement.querySelectorAll('.grammar-be').length).toBe(1);
    expect(answerElement.querySelector('.grammar-be').textContent).toBe('are');
    expect(app.speakWord).toHaveBeenCalledWith('You are angry.');
    expect(app.speakChineseWord).not.toHaveBeenCalled();
  });

  test('annotates main verbs and auxiliary verbs in the English answer', function() {
    card.chinese = 'They have finished the work.';
    app._revealSecondPart(card);

    var answerElement = document.getElementById('chinese-word');
    expect(answerElement.textContent).toBe('They have finished the work.');
    expect(answerElement.querySelectorAll('.grammar-auxiliary').length).toBe(1);
    expect(answerElement.querySelector('.grammar-auxiliary').textContent).toBe('have');
    expect(answerElement.querySelectorAll('.grammar-verb').length).toBe(1);
    expect(answerElement.querySelector('.grammar-verb').textContent).toBe('finished');
  });

  test('does not annotate the answer when grammar annotation is disabled', function() {
    app.settings.grammarAnnotationEnabled = false;
    app._revealSecondPart(card);

    var answerElement = document.getElementById('chinese-word');
    expect(answerElement.textContent).toBe('You are angry.');
    expect(answerElement.querySelectorAll('.grammar-verb, .grammar-auxiliary, .grammar-be').length).toBe(0);
  });
});

describe('grammar transformation editing compatibility', function() {
  var app;
  var card;

  beforeEach(function() {
    setup.bootstrapApp();
    app = setup.createApp();
    card = {
      id: 1,
      english: 'Are you angry? (轉成肯定句)',
      chinese: 'You are angry.',
      difficultyLevel: 0,
      mustSpell: 0,
      image: '',
      tags: [APP_CONSTANTS.GRAMMAR_TRANSFORMATION_TAG, 'BE疑問→肯定'],
      sheetName: APP_CONSTANTS.GRAMMAR_TRANSFORMATION_SHEET_NAME,
      originalRowIndex: 1
    };
    app.currentWords = [card];
    app.currentIndex = 0;
    app.words = [card];
    app.sheetSettings.sheetId = 'sheet-id';
    app.displayCurrentWord = jest.fn();
    app.renderDifficultyLevel = jest.fn();
  });

  test('uses question and answer labels for grammar cards', function() {
    app.openEditWordModal(card);

    expect(document.getElementById('edit-word-title').textContent).toBe('✏️ 編輯文法題目');
    expect(document.getElementById('edit-word-english-label').textContent).toBe('題目');
    expect(document.getElementById('edit-word-chinese-label').textContent).toBe('答案');
    expect(document.getElementById('edit-word-english').placeholder).toContain('英文題目');
    expect(document.getElementById('edit-word-chinese').placeholder).toContain('英文答案');
    expect(document.getElementById('edit-word-must-spell-group').style.display).toBe('none');
    expect(document.getElementById('edit-word-image-group').style.display).toBe('none');
    expect(document.getElementById('edit-word-kk-group').style.display).toBe('none');
  });

  test('restores normal labels when a regular vocabulary card is edited next', function() {
    app.openEditWordModal(card);
    var normalCard = {
      id: 2,
      english: 'apple',
      chinese: '蘋果',
      difficultyLevel: 0,
      mustSpell: 0,
      image: '',
      tags: [],
      sheetName: '單字庫',
      originalRowIndex: 2
    };
    app.words.push(normalCard);
    app.currentWords.push(normalCard);
    app.currentIndex = 1;

    app.openEditWordModal(normalCard);

    expect(document.getElementById('edit-word-title').textContent).toBe('✏️ 編輯單字');
    expect(document.getElementById('edit-word-english-label').textContent).toBe('單字');
    expect(document.getElementById('edit-word-chinese-label').textContent).toBe('翻譯');
    expect(document.getElementById('edit-word-must-spell-group').style.display).toBe('');
    expect(document.getElementById('edit-word-image-group').style.display).toBe('');
    expect(document.getElementById('edit-word-kk-group').style.display).toBe('');
  });

  test('saves the edited question and English answer back to columns B and C', function() {
    var updateSpy = jest.fn(function() { return google.script.run; });
    google.script.run.updateWordProperties = updateSpy;

    app.openEditWordModal(card);
    document.getElementById('edit-word-english').value = 'Is he happy? (轉成肯定句)';
    document.getElementById('edit-word-chinese').value = 'He is happy.';
    app.saveEditWord();

    expect(card.english).toBe('Is he happy? (轉成肯定句)');
    expect(card.chinese).toBe('He is happy.');
    expect(updateSpy).toHaveBeenCalledTimes(1);
    var args = updateSpy.mock.calls[0];
    expect(args[0]).toBe('sheet-id');
    expect(args[1]).toBe(APP_CONSTANTS.GRAMMAR_TRANSFORMATION_SHEET_NAME);
    expect(args[2]).toBe(1);
    expect(args[3].english).toBe('Is he happy? (轉成肯定句)');
    expect(args[3].chinese).toBe('He is happy.');
  });
});
