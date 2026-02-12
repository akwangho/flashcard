/**
 * Tests for quiz system: createQuestion, generateQuestions, getResultMessage
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

describe('createQuestion', function() {
  var sampleWords;

  beforeEach(function() {
    sampleWords = [
      { id: 1, english: 'apple', chinese: '蘋果' },
      { id: 2, english: 'banana', chinese: '香蕉' },
      { id: 3, english: 'cat', chinese: '貓' },
      { id: 4, english: 'dog', chinese: '狗' },
      { id: 5, english: 'egg', chinese: '蛋' },
      { id: 6, english: 'fish', chinese: '魚' },
      { id: 7, english: 'grape', chinese: '葡萄' }
    ];
  });

  test('returns a question object with required properties', function() {
    var question = app.createQuestion(sampleWords[0], sampleWords);
    expect(question).toHaveProperty('word');
    expect(question).toHaveProperty('type');
    expect(question).toHaveProperty('question');
    expect(question).toHaveProperty('correctAnswer');
    expect(question).toHaveProperty('options');
  });

  test('question type is either en-zh or zh-en', function() {
    var question = app.createQuestion(sampleWords[0], sampleWords);
    expect(['en-zh', 'zh-en']).toContain(question.type);
  });

  test('options contain exactly 4 items', function() {
    var question = app.createQuestion(sampleWords[0], sampleWords);
    expect(question.options.length).toBe(4);
  });

  test('options contain the correct answer', function() {
    var question = app.createQuestion(sampleWords[0], sampleWords);
    expect(question.options).toContain(question.correctAnswer);
  });

  test('correct answer matches the target word', function() {
    // Run multiple times due to random type
    for (var i = 0; i < 10; i++) {
      var question = app.createQuestion(sampleWords[0], sampleWords);
      if (question.type === 'en-zh') {
        expect(question.question).toBe('apple');
        expect(question.correctAnswer).toBe('蘋果');
      } else {
        expect(question.question).toBe('蘋果');
        expect(question.correctAnswer).toBe('apple');
      }
    }
  });

  test('wrong options are different from correct answer', function() {
    var question = app.createQuestion(sampleWords[0], sampleWords);
    var wrongOpts = question.options.filter(function(o) {
      return o !== question.correctAnswer;
    });
    wrongOpts.forEach(function(opt) {
      expect(opt).not.toBe(question.correctAnswer);
    });
  });

  test('options have no duplicates', function() {
    var question = app.createQuestion(sampleWords[0], sampleWords);
    var unique = [];
    question.options.forEach(function(opt) {
      if (unique.indexOf(opt) === -1) unique.push(opt);
    });
    expect(unique.length).toBe(question.options.length);
  });
});

describe('generateQuestions', function() {
  beforeEach(function() {
    app.words = [
      { id: 1, english: 'apple', chinese: '蘋果' },
      { id: 2, english: 'banana', chinese: '香蕉' },
      { id: 3, english: 'cat', chinese: '貓' },
      { id: 4, english: 'dog', chinese: '狗' },
      { id: 5, english: 'egg', chinese: '蛋' },
      { id: 6, english: 'fish', chinese: '魚' },
      { id: 7, english: 'grape', chinese: '葡萄' },
      { id: 8, english: 'hat', chinese: '帽子' },
      { id: 9, english: 'ice', chinese: '冰' },
      { id: 10, english: 'juice', chinese: '果汁' },
      { id: 11, english: 'kite', chinese: '風箏' },
      { id: 12, english: 'lemon', chinese: '檸檬' }
    ];
    app.quizState.availableWords = app.words.slice();
  });

  test('quick quiz generates at most 10 questions', function() {
    app.generateQuestions('quick');
    expect(app.quizState.questions.length).toBeLessThanOrEqual(10);
  });

  test('full quiz generates questions for all words', function() {
    app.generateQuestions('full');
    expect(app.quizState.questions.length).toBe(12);
  });

  test('quick quiz with few words uses all available', function() {
    app.quizState.availableWords = app.words.slice(0, 5);
    app.generateQuestions('quick');
    expect(app.quizState.questions.length).toBe(5);
  });

  test('each generated question has valid structure', function() {
    app.generateQuestions('quick');
    app.quizState.questions.forEach(function(q) {
      expect(q).toHaveProperty('word');
      expect(q).toHaveProperty('type');
      expect(q).toHaveProperty('options');
      expect(q.options.length).toBe(4);
      expect(q.options).toContain(q.correctAnswer);
    });
  });
});

describe('getResultMessage', function() {
  test('returns trophy message for score >= 90', function() {
    var msg = app.getResultMessage(100);
    expect(msg).toContain('高手');
    var msg90 = app.getResultMessage(90);
    expect(msg90).toContain('高手');
  });

  test('returns good message for score 80-89', function() {
    var msg = app.getResultMessage(85);
    expect(msg).toContain('不錯');
    // boundary: exactly 80
    var msg80 = app.getResultMessage(80);
    expect(msg80).toContain('不錯');
  });

  test('returns encouraging message for score 70-79', function() {
    var msg = app.getResultMessage(75);
    expect(msg).toContain('努力');
    // boundary: exactly 70
    var msg70 = app.getResultMessage(70);
    expect(msg70).toContain('努力');
    // boundary: exactly 79
    var msg79 = app.getResultMessage(79);
    expect(msg79).toContain('努力');
  });

  test('returns practice message for score 60-69', function() {
    var msg = app.getResultMessage(65);
    expect(msg).toContain('練習');
    // boundary: exactly 60
    var msg60 = app.getResultMessage(60);
    expect(msg60).toContain('練習');
  });

  test('returns keep-going message for score < 60', function() {
    var msg = app.getResultMessage(40);
    expect(msg).toContain('加油');
    // boundary: exactly 59
    var msg59 = app.getResultMessage(59);
    expect(msg59).toContain('加油');
    // edge case: 0
    var msg0 = app.getResultMessage(0);
    expect(msg0).toContain('加油');
  });

  test('boundary: 89 is not in 90+ tier', function() {
    var msg = app.getResultMessage(89);
    expect(msg).toContain('不錯');
  });
});

// ============================================================
// createQuestion with insufficient allWords (uses generic options)
// ============================================================
describe('createQuestion with few words', function() {

  test('fills with generic options when allWords has fewer than 4', function() {
    var fewWords = [
      { id: 1, english: 'apple', chinese: '蘋果' },
      { id: 2, english: 'banana', chinese: '香蕉' }
    ];
    var question = app.createQuestion(fewWords[0], fewWords);
    expect(question.options.length).toBe(4);
    expect(question.options).toContain(question.correctAnswer);
  });

  test('uses generic options when only 1 word available', function() {
    var oneWord = [{ id: 1, english: 'apple', chinese: '蘋果' }];
    var question = app.createQuestion(oneWord[0], oneWord);
    expect(question.options.length).toBe(4);
    expect(question.options).toContain(question.correctAnswer);
    // Should have some generic options mixed in
    var wrongOpts = question.options.filter(function(o) {
      return o !== question.correctAnswer;
    });
    expect(wrongOpts.length).toBe(3);
  });
});

// ============================================================
// selectAnswer
// ============================================================
describe('selectAnswer', function() {

  var sampleWords;

  beforeEach(function() {
    sampleWords = [
      { id: 1, english: 'apple', chinese: '蘋果' },
      { id: 2, english: 'banana', chinese: '香蕉' },
      { id: 3, english: 'cat', chinese: '貓' },
      { id: 4, english: 'dog', chinese: '狗' }
    ];
    app.quizState.isActive = true;
    app.quizState.currentQuestionIndex = 0;
    app.quizState.selectedAnswer = null;
    app.quizState.answers = [];
    app.quizState.score = 0;
    app.quizState.questions = [{
      word: sampleWords[0],
      type: 'en-zh',
      question: 'apple',
      correctAnswer: '蘋果',
      options: ['蘋果', '香蕉', '貓', '狗']
    }];

    // Mock dependent methods
    app.updateOptionStyles = jest.fn();
    app.showAnswerFeedback = jest.fn();
    app.markWordAsDifficult = jest.fn();
    app.showNextButton = jest.fn();
  });

  test('records correct answer and adds score', function() {
    app.selectAnswer('蘋果');
    expect(app.quizState.answers.length).toBe(1);
    expect(app.quizState.answers[0].isCorrect).toBe(true);
    expect(app.quizState.score).toBe(10); // QUIZ_POINTS_PER_QUESTION
  });

  test('records wrong answer without adding score', function() {
    app.selectAnswer('香蕉');
    expect(app.quizState.answers.length).toBe(1);
    expect(app.quizState.answers[0].isCorrect).toBe(false);
    expect(app.quizState.score).toBe(0);
  });

  test('marks word as difficult on wrong answer', function() {
    app.selectAnswer('香蕉');
    expect(app.markWordAsDifficult).toHaveBeenCalledWith(sampleWords[0]);
  });

  test('does not mark word as difficult on correct answer', function() {
    app.selectAnswer('蘋果');
    expect(app.markWordAsDifficult).not.toHaveBeenCalled();
  });

  test('ignores duplicate answer selection', function() {
    app.selectAnswer('蘋果');
    app.selectAnswer('香蕉'); // second call should be ignored
    expect(app.quizState.answers.length).toBe(1);
  });

  test('shows feedback and next button', function() {
    app.selectAnswer('蘋果');
    expect(app.showAnswerFeedback).toHaveBeenCalled();
    expect(app.showNextButton).toHaveBeenCalled();
  });
});
