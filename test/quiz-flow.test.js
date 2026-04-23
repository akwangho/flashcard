/**
 * Quiz UI flow
 * Spec: openspec/specs/quiz-mode/spec.md
 */
describe('Quiz UI flow', function() {
  var app;

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

    test('includes mustSpell filter info', function() {
      app.mustSpellFilter = true;
      var text = app.getQuizScopeText();
      expect(text).toContain('要會拼');
    });

    test('includes type filter info', function() {
      app.typeFilter = ['word', 'phrase'];
      var text = app.getQuizScopeText();
      expect(text).toContain('單字');
      expect(text).toContain('片語');
    });

    test('includes tag filter info', function() {
      app.tagFilter = ['animals'];
      var text = app.getQuizScopeText();
      expect(text).toContain('animals');
    });

    test('shows multiple filters joined', function() {
      app.difficultyFilter = 3;
      app.mustSpellFilter = true;
      var text = app.getQuizScopeText();
      expect(text).toContain('★3');
      expect(text).toContain('要會拼');
      expect(text).toContain('·');
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

    test('shows result screen when all questions answered', function() {
      app.quizState.currentQuestionIndex = app.quizState.questions.length - 1;
      app.quizState.selectedAnswer = 'x';
      app.nextQuestion();
      var resultScreen = document.getElementById('quiz-result-screen');
      expect(resultScreen.style.display).toBe('block');
    });
  });

  describe('getCurrentAvailableWords', function() {
    test('returns freshly filtered words', function() {
      var result = app.getCurrentAvailableWords();
      expect(result.length).toBe(app.words.length);
      result.push({ id: 999 });
      expect(app.words.length).toBe(5);
    });

    test('returns empty array when words is empty', function() {
      app.words = [];
      expect(app.getCurrentAvailableWords()).toEqual([]);
    });

    test('returns empty array when words is null', function() {
      app.words = null;
      expect(app.getCurrentAvailableWords()).toEqual([]);
    });

    test('reflects difficulty filter', function() {
      app.words = [
        { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 5 },
        { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 1 }
      ];
      app.difficultyFilter = 5;
      var result = app.getCurrentAvailableWords();
      expect(result.length).toBe(1);
      expect(result[0].english).toBe('apple');
    });
  });

  // ===========================================
  // createQuestion
  // ===========================================
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
      var q = app.createQuestion(sampleWords[0], sampleWords);
      expect(q).toHaveProperty('word');
      expect(q).toHaveProperty('type');
      expect(q).toHaveProperty('question');
      expect(q).toHaveProperty('correctAnswer');
      expect(q).toHaveProperty('options');
    });

    test('question type is either en-zh or zh-en', function() {
      var q = app.createQuestion(sampleWords[0], sampleWords);
      expect(['en-zh', 'zh-en']).toContain(q.type);
    });

    test('options contain exactly 4 items', function() {
      var q = app.createQuestion(sampleWords[0], sampleWords);
      expect(q.options.length).toBe(4);
    });

    test('options contain the correct answer', function() {
      var q = app.createQuestion(sampleWords[0], sampleWords);
      expect(q.options).toContain(q.correctAnswer);
    });

    test('correct answer matches the target word', function() {
      for (var i = 0; i < 10; i++) {
        var q = app.createQuestion(sampleWords[0], sampleWords);
        if (q.type === 'en-zh') {
          expect(q.question).toBe('apple');
          expect(q.correctAnswer).toBe('蘋果');
        } else {
          expect(q.question).toBe('蘋果');
          expect(q.correctAnswer).toBe('apple');
        }
      }
    });

    test('wrong options are different from correct answer', function() {
      var q = app.createQuestion(sampleWords[0], sampleWords);
      q.options.forEach(function(opt) {
        if (opt !== q.correctAnswer) {
          expect(opt).not.toBe(q.correctAnswer);
        }
      });
    });

    test('options have no duplicates', function() {
      var q = app.createQuestion(sampleWords[0], sampleWords);
      var unique = [];
      q.options.forEach(function(opt) {
        if (unique.indexOf(opt) === -1) unique.push(opt);
      });
      expect(unique.length).toBe(q.options.length);
    });
  });

  // ===========================================
  // createQuestion with few words (generic fallback)
  // ===========================================
  describe('createQuestion with few words', function() {
    test('fills with generic options when allWords has fewer than 4', function() {
      var fewWords = [
        { id: 1, english: 'apple', chinese: '蘋果' },
        { id: 2, english: 'banana', chinese: '香蕉' }
      ];
      var q = app.createQuestion(fewWords[0], fewWords);
      expect(q.options.length).toBe(4);
      expect(q.options).toContain(q.correctAnswer);
    });

    test('uses generic options when only 1 word available', function() {
      var oneWord = [{ id: 1, english: 'apple', chinese: '蘋果' }];
      var q = app.createQuestion(oneWord[0], oneWord);
      expect(q.options.length).toBe(4);
      expect(q.options).toContain(q.correctAnswer);
      var wrongOpts = q.options.filter(function(o) { return o !== q.correctAnswer; });
      expect(wrongOpts.length).toBe(3);
    });
  });

  // ===========================================
  // generateQuestions
  // ===========================================
  describe('generateQuestions', function() {
    test('quick quiz limits question count', function() {
      app.startQuiz('quick');
      expect(app.quizState.questions.length).toBeLessThanOrEqual(APP_CONSTANTS.QUIZ_QUICK_COUNT);
    });

    test('full quiz uses all available words', function() {
      app.startQuiz('full');
      expect(app.quizState.questions.length).toBe(app.words.length);
    });

    test('quick quiz with few words uses all available', function() {
      app.words = app.words.slice(0, 3);
      app.startQuiz('quick');
      expect(app.quizState.questions.length).toBe(3);
    });

    test('each generated question has valid structure', function() {
      app.startQuiz('quick');
      app.quizState.questions.forEach(function(q) {
        expect(q).toHaveProperty('word');
        expect(q).toHaveProperty('type');
        expect(q).toHaveProperty('options');
        expect(q.options.length).toBe(4);
        expect(q.options).toContain(q.correctAnswer);
      });
    });

    test('wrong options come from filtered words, not all words', function() {
      app.words = [
        { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 5 },
        { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 5 },
        { id: 2, english: 'cat', chinese: '貓', difficultyLevel: 5 },
        { id: 3, english: 'dog', chinese: '狗', difficultyLevel: 5 },
        { id: 4, english: 'eagle', chinese: '老鷹', difficultyLevel: 5 },
        { id: 5, english: 'quantum', chinese: '量子力學', difficultyLevel: 0 },
        { id: 6, english: 'relativity', chinese: '相對論', difficultyLevel: 0 },
        { id: 7, english: 'calculus', chinese: '微積分', difficultyLevel: 0 }
      ];
      app.difficultyFilter = 5;
      app.startQuiz('full');

      var excludedChinese = ['量子力學', '相對論', '微積分'];
      var excludedEnglish = ['quantum', 'relativity', 'calculus'];
      app.quizState.questions.forEach(function(q) {
        q.options.forEach(function(opt) {
          expect(excludedChinese).not.toContain(opt);
          expect(excludedEnglish).not.toContain(opt);
        });
      });
    });
  });

  // ===========================================
  // selectAnswer
  // ===========================================
  describe('selectAnswer', function() {
    beforeEach(function() {
      app.startQuiz('full');
      app.beginQuiz();
    });

    test('records the selected answer', function() {
      var q = app.quizState.questions[0];
      app.selectAnswer(q.correctAnswer);
      expect(app.quizState.selectedAnswer).toBe(q.correctAnswer);
    });

    test('correct answer adds to score', function() {
      var q = app.quizState.questions[0];
      app.selectAnswer(q.correctAnswer);
      expect(app.quizState.score).toBe(APP_CONSTANTS.QUIZ_POINTS_PER_QUESTION);
    });

    test('wrong answer does not add to score', function() {
      var q = app.quizState.questions[0];
      var wrong = q.options.find(function(o) { return o !== q.correctAnswer; });
      app.selectAnswer(wrong);
      expect(app.quizState.score).toBe(0);
    });

    test('records answer in answers array', function() {
      var q = app.quizState.questions[0];
      app.selectAnswer(q.correctAnswer);
      expect(app.quizState.answers.length).toBe(1);
      expect(app.quizState.answers[0].isCorrect).toBe(true);
    });

    test('ignores second selection', function() {
      var q = app.quizState.questions[0];
      app.selectAnswer(q.correctAnswer);
      var wrong = q.options.find(function(o) { return o !== q.correctAnswer; });
      app.selectAnswer(wrong);
      expect(app.quizState.answers.length).toBe(1);
    });

    test('shows feedback after answering', function() {
      var q = app.quizState.questions[0];
      app.selectAnswer(q.correctAnswer);
      var feedback = document.getElementById('quiz-feedback');
      expect(feedback.style.display).toBe('block');
    });

    test('shows next button after answering', function() {
      var q = app.quizState.questions[0];
      app.selectAnswer(q.correctAnswer);
      var nextBtn = document.getElementById('quiz-next');
      expect(nextBtn.style.display).toBe('inline-block');
    });
  });

  // ===========================================
  // showAnswerFeedback
  // ===========================================
  describe('showAnswerFeedback', function() {
    beforeEach(function() {
      app.startQuiz('full');
      app.beginQuiz();
      app.voiceSettings = { enabled: false };
    });

    test('displays correct feedback class', function() {
      var q = app.quizState.questions[0];
      app.showAnswerFeedback(true, q);
      var feedback = document.getElementById('quiz-feedback');
      expect(feedback.className).toContain('correct');
    });

    test('displays wrong feedback class', function() {
      var q = app.quizState.questions[0];
      app.showAnswerFeedback(false, q);
      var feedback = document.getElementById('quiz-feedback');
      expect(feedback.className).toContain('wrong');
    });

    test('shows explanation text', function() {
      var q = app.quizState.questions[0];
      app.showAnswerFeedback(true, q);
      var explanation = document.getElementById('quiz-feedback-explanation');
      expect(explanation.textContent).toContain(q.word.english);
    });
  });

  // ===========================================
  // showQuizResult
  // ===========================================
  describe('showQuizResult', function() {
    beforeEach(function() {
      app.startQuiz('full');
      app.beginQuiz();
      // Answer all questions
      for (var i = 0; i < app.quizState.questions.length; i++) {
        app.quizState.currentQuestionIndex = i;
        var q = app.quizState.questions[i];
        app.quizState.selectedAnswer = null;
        app.selectAnswer(q.correctAnswer);
      }
    });

    test('displays result screen', function() {
      app.showQuizResult();
      var resultScreen = document.getElementById('quiz-result-screen');
      expect(resultScreen.style.display).toBe('block');
    });

    test('shows correct count', function() {
      app.showQuizResult();
      var correctEl = document.getElementById('quiz-correct-count');
      expect(parseInt(correctEl.textContent)).toBe(app.quizState.questions.length);
    });

    test('shows final score', function() {
      app.showQuizResult();
      var scoreEl = document.getElementById('quiz-final-score');
      expect(parseInt(scoreEl.textContent)).toBe(100);
    });
  });

  // ===========================================
  // getResultMessage
  // ===========================================
  describe('getResultMessage', function() {
    test('returns trophy message for score >= 90', function() {
      expect(app.getResultMessage(100)).toContain('太棒了');
      expect(app.getResultMessage(90)).toContain('太棒了');
    });

    test('returns good message for score 80-89', function() {
      expect(app.getResultMessage(85)).toContain('很好');
      expect(app.getResultMessage(80)).toContain('很好');
    });

    test('returns ok message for score 70-79', function() {
      expect(app.getResultMessage(75)).toContain('努力');
      expect(app.getResultMessage(70)).toContain('努力');
      expect(app.getResultMessage(79)).toContain('努力');
    });

    test('returns encouraging message for score 60-69', function() {
      expect(app.getResultMessage(65)).toContain('還可以');
      expect(app.getResultMessage(60)).toContain('還可以');
    });

    test('returns keep-going message for score < 60', function() {
      expect(app.getResultMessage(40)).toContain('加油');
      expect(app.getResultMessage(59)).toContain('加油');
      expect(app.getResultMessage(0)).toContain('加油');
    });

    test('boundary: 89 is not in 90+ tier', function() {
      expect(app.getResultMessage(89)).not.toContain('太棒了');
    });
  });

  // ===========================================
  // getNoWordsMessage
  // ===========================================
  describe('getNoWordsMessage', function() {
    test('returns message for very-familiar filter', function() {
      app.difficultyFilter = -1;
      expect(app.getNoWordsMessage()).toContain('非常熟');
    });

    test('returns message for difficulty filter > 0', function() {
      app.difficultyFilter = 5;
      expect(app.getNoWordsMessage()).toContain('★5');
    });

    test('returns removed words message when all removed', function() {
      app.difficultyFilter = 0;
      app.currentWords = [];
      app.words = [{ id: 0, english: 'test', chinese: '測試' }];
      expect(app.getNoWordsMessage()).toContain('移除');
    });

    test('returns default no words message', function() {
      app.difficultyFilter = 0;
      app.currentWords = [];
      app.words = [];
      expect(app.getNoWordsMessage()).toContain('載入');
    });
  });

  // ===========================================
  // _generateWrongOptions (shared utility)
  // ===========================================
  describe('_generateWrongOptions', function() {
    test('returns correct number of wrong options', function() {
      var result = app._generateWrongOptions('蘋果', app.words, 'chinese', 3);
      expect(result.length).toBe(3);
    });

    test('does not include the correct answer', function() {
      var result = app._generateWrongOptions('蘋果', app.words, 'chinese', 3);
      expect(result).not.toContain('蘋果');
    });

    test('uses generic fallback when not enough options', function() {
      var tinyWords = [{ chinese: '蘋果' }, { chinese: '香蕉' }];
      var fallback = ['選項A', '選項B', '選項C'];
      var result = app._generateWrongOptions('蘋果', tinyWords, 'chinese', 3, fallback);
      expect(result.length).toBe(3);
    });

    test('returns no duplicates', function() {
      var result = app._generateWrongOptions('蘋果', app.words, 'chinese', 3);
      var unique = result.filter(function(v, i, arr) { return arr.indexOf(v) === i; });
      expect(unique.length).toBe(result.length);
    });
  });
});
