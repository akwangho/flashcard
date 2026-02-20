var setup = require('./setup');

describe('Quiz UI flow', function() {
  var app;

  beforeAll(function() {
    setup.bootstrapApp();
  });

  beforeEach(function() {
    app = new FlashcardApp();
    app.words = [
      { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0 },
      { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 3 },
      { id: 2, english: 'cat', chinese: '貓', difficultyLevel: 5 },
      { id: 3, english: 'dog', chinese: '狗', difficultyLevel: 0 },
      { id: 4, english: 'eagle', chinese: '老鷹', difficultyLevel: 0 }
    ];
    app.currentWords = app.words.slice();
    app.currentIndex = 0;
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
    app.srsData = {};

    app.pauseTimer = jest.fn();
    app.resumeTimer = jest.fn();
    app.speakWord = jest.fn();
    app.speakChineseWord = jest.fn();
  });

  describe('startQuiz', function() {
    test('alerts when no words available', function() {
      app.words = [];
      var alertSpy = jest.spyOn(window, 'alert').mockImplementation(function() {});
      app.startQuiz('quick');
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('沒有單字'));
      alertSpy.mockRestore();
    });

    test('sets quizState with correct type', function() {
      app.startQuiz('full');
      expect(app.quizState.type).toBe('full');
      expect(app.quizState.isActive).toBe(true);
    });

    test('generates questions', function() {
      app.startQuiz('full');
      expect(app.quizState.questions.length).toBeGreaterThan(0);
    });

    test('calls pauseTimer', function() {
      app.startQuiz('quick');
      expect(app.pauseTimer).toHaveBeenCalled();
    });

    test('shows quiz modal', function() {
      app.startQuiz('quick');
      var modal = document.getElementById('quiz-modal');
      expect(modal.style.display).toBe('flex');
    });
  });

  describe('showQuizModal', function() {
    beforeEach(function() {
      app.quizState = {
        isActive: true,
        type: 'quick',
        questions: [{ word: app.words[0] }],
        currentQuestionIndex: 0,
        answers: [],
        score: 0
      };
    });

    test('displays quiz modal', function() {
      app.showQuizModal('quick');
      var modal = document.getElementById('quiz-modal');
      expect(modal.style.display).toBe('flex');
    });

    test('sets correct title for quick quiz', function() {
      app.showQuizModal('quick');
      var title = document.getElementById('quiz-title');
      expect(title.textContent).toContain('快速');
    });

    test('sets correct title for full quiz', function() {
      app.showQuizModal('full');
      var title = document.getElementById('quiz-title');
      expect(title.textContent).toContain('完整');
    });

    test('shows start screen', function() {
      app.showQuizModal('quick');
      var startScreen = document.getElementById('quiz-start-screen');
      expect(startScreen.style.display).toBe('block');
    });
  });

  describe('beginQuiz', function() {
    beforeEach(function() {
      app.startQuiz('full');
    });

    test('shows progress screen', function() {
      app.beginQuiz();
      var progressScreen = document.getElementById('quiz-progress-screen');
      expect(progressScreen.style.display).toBe('block');
    });

    test('resets score and index', function() {
      app.quizState.score = 5;
      app.quizState.currentQuestionIndex = 3;
      app.beginQuiz();
      expect(app.quizState.currentQuestionIndex).toBe(0);
      expect(app.quizState.score).toBe(0);
    });
  });

  describe('showQuestion', function() {
    beforeEach(function() {
      app.startQuiz('full');
      app.beginQuiz();
    });

    test('displays question text', function() {
      app.showQuestion();
      var wordEl = document.getElementById('quiz-word');
      expect(wordEl.textContent).not.toBe('');
    });

    test('creates option buttons', function() {
      app.showQuestion();
      var optionsEl = document.getElementById('quiz-options');
      expect(optionsEl.children.length).toBe(4);
    });

    test('updates progress numbers', function() {
      app.showQuestion();
      var currentNum = document.getElementById('quiz-current-number');
      expect(currentNum.textContent).toBe('1');
    });
  });

  describe('closeQuizModal', function() {
    test('hides quiz modal', function() {
      app.startQuiz('full');
      app.closeQuizModal();
      var modal = document.getElementById('quiz-modal');
      expect(modal.style.display).toBe('none');
    });

    test('sets isActive to false', function() {
      app.startQuiz('full');
      app.closeQuizModal();
      expect(app.quizState.isActive).toBe(false);
    });
  });

  describe('getQuizScopeText', function() {
    beforeEach(function() {
      app.startQuiz('full');
    });

    test('returns all-words text when no filter', function() {
      var text = app.getQuizScopeText();
      expect(text).toContain('所有單字');
    });

    test('includes difficulty filter info', function() {
      app.difficultyFilter = 3;
      var text = app.getQuizScopeText();
      expect(text).toContain('★3');
    });

    test('includes review filter info', function() {
      app.reviewFilter = '1month';
      var text = app.getQuizScopeText();
      expect(text).toContain('1個月');
    });
  });

  describe('showQuizScreen', function() {
    beforeEach(function() {
      app.startQuiz('full');
    });

    test('shows start screen and hides others', function() {
      app.showQuizScreen('start');
      expect(document.getElementById('quiz-start-screen').style.display).toBe('block');
      expect(document.getElementById('quiz-progress-screen').style.display).toBe('none');
    });

    test('shows progress screen and hides others', function() {
      app.showQuizScreen('progress');
      expect(document.getElementById('quiz-progress-screen').style.display).toBe('block');
      expect(document.getElementById('quiz-start-screen').style.display).toBe('none');
    });

    test('shows result screen', function() {
      app.showQuizScreen('result');
      expect(document.getElementById('quiz-result-screen').style.display).toBe('block');
    });
  });

  describe('nextQuestion', function() {
    beforeEach(function() {
      app.startQuiz('full');
      app.beginQuiz();
    });

    test('increments currentQuestionIndex', function() {
      var initial = app.quizState.currentQuestionIndex;
      app.quizState.selectedAnswer = 'something';
      app.nextQuestion();
      expect(app.quizState.currentQuestionIndex).toBe(initial + 1);
    });

    test('shows result when all questions answered', function() {
      app.quizState.currentQuestionIndex = app.quizState.questions.length - 1;
      app.quizState.selectedAnswer = 'x';
      var spy = jest.spyOn(app, 'showQuizResult');
      app.nextQuestion();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('getCurrentAvailableWords', function() {
    test('returns copy of currentWords', function() {
      var result = app.getCurrentAvailableWords();
      expect(result.length).toBe(app.currentWords.length);
      result.push({ id: 999 });
      expect(app.currentWords.length).toBe(5);
    });

    test('returns empty array when currentWords is null', function() {
      app.currentWords = null;
      var result = app.getCurrentAvailableWords();
      expect(result).toEqual([]);
    });
  });
});
