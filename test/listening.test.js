var setup = require('./setup');

describe('Listening Quiz Module', function() {
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
      { id: 3, english: 'hot dog', chinese: '熱狗', difficultyLevel: 0 },
      { id: 4, english: 'I like cats.', chinese: '我喜歡貓。', difficultyLevel: 0 }
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

  describe('_filterListeningWords', function() {
    test('excludes sentences (ending with . ? !)', function() {
      var filtered = app._filterListeningWords();
      expect(filtered.length).toBe(4);
      var englishWords = filtered.map(function(w) { return w.english; });
      expect(englishWords.indexOf('I like cats.')).toBe(-1);
    });

    test('includes words and phrases', function() {
      var filtered = app._filterListeningWords();
      var englishWords = filtered.map(function(w) { return w.english; });
      expect(englishWords.indexOf('apple')).not.toBe(-1);
      expect(englishWords.indexOf('hot dog')).not.toBe(-1);
    });

    test('returns empty when currentWords is empty', function() {
      app.currentWords = [];
      var filtered = app._filterListeningWords();
      expect(filtered.length).toBe(0);
    });
  });

  describe('startListeningQuiz', function() {
    test('alerts when no words available', function() {
      app.currentWords = [
        { id: 0, english: 'I like cats.', chinese: '我喜歡貓。', difficultyLevel: 0 }
      ];
      var alertSpy = jest.spyOn(window, 'alert').mockImplementation(function() {});
      app.startListeningQuiz('choose');
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('沒有可用'));
      alertSpy.mockRestore();
    });

    test('calls pauseTimer', function() {
      app.startListeningQuiz('choose');
      expect(app.pauseTimer).toHaveBeenCalled();
    });

    test('sets listeningState with correct mode', function() {
      app.startListeningQuiz('spell');
      expect(app.listeningState.mode).toBe('spell');
      expect(app.listeningState.isActive).toBe(true);
    });

    test('generates questions', function() {
      app.startListeningQuiz('choose');
      expect(app.listeningState.questions.length).toBeGreaterThan(0);
    });

    test('shows listening modal', function() {
      app.startListeningQuiz('choose');
      var modal = document.getElementById('listening-modal');
      expect(modal.style.display).toBe('flex');
    });
  });

  describe('_createListeningQuestion (choose mode)', function() {
    test('creates question with 4 options', function() {
      app.listeningState = { mode: 'choose' };
      var q = app._createListeningQuestion(app.words[0], app.words);
      expect(q.options.length).toBe(4);
      expect(q.correctAnswer).toBe('蘋果');
      expect(q.correctEnglish).toBe('apple');
    });

    test('includes correct answer in options', function() {
      app.listeningState = { mode: 'choose' };
      var q = app._createListeningQuestion(app.words[0], app.words);
      expect(q.options.indexOf('蘋果')).not.toBe(-1);
    });
  });

  describe('_createListeningQuestion (spell mode)', function() {
    test('creates question without options', function() {
      app.listeningState = { mode: 'spell' };
      var q = app._createListeningQuestion(app.words[0], app.words);
      expect(q.options.length).toBe(0);
      expect(q.correctEnglish).toBe('apple');
    });
  });

  describe('showListeningModal', function() {
    beforeEach(function() {
      app.startListeningQuiz('choose');
    });

    test('sets title for choose mode', function() {
      var title = document.getElementById('listening-title');
      expect(title.textContent).toContain('聽音辨字');
    });

    test('sets title for spell mode', function() {
      app.startListeningQuiz('spell');
      var title = document.getElementById('listening-title');
      expect(title.textContent).toContain('聽音拼字');
    });

    test('shows start screen', function() {
      var startScreen = document.getElementById('listening-start-screen');
      expect(startScreen.style.display).toBe('block');
    });

    test('displays question count', function() {
      var count = document.getElementById('listening-question-count');
      expect(parseInt(count.textContent)).toBeGreaterThan(0);
    });
  });

  describe('beginListeningQuiz', function() {
    beforeEach(function() {
      app.startListeningQuiz('choose');
    });

    test('resets score and index', function() {
      app.listeningState.score = 50;
      app.listeningState.currentQuestionIndex = 3;
      app.beginListeningQuiz();
      expect(app.listeningState.currentQuestionIndex).toBe(0);
      expect(app.listeningState.score).toBe(0);
    });

    test('shows progress screen', function() {
      app.beginListeningQuiz();
      var progressScreen = document.getElementById('listening-progress-screen');
      expect(progressScreen.style.display).toBe('block');
    });
  });

  describe('showListeningQuestion', function() {
    beforeEach(function() {
      app.startListeningQuiz('choose');
      app.beginListeningQuiz();
    });

    test('updates progress numbers', function() {
      var currentNum = document.getElementById('listening-current-number');
      expect(currentNum.textContent).toBe('1');
    });

    test('renders options for choose mode', function() {
      var opts = document.getElementById('listening-options');
      expect(opts.children.length).toBe(4);
    });

    test('hides spell area in choose mode', function() {
      var spellArea = document.getElementById('listening-spell-area');
      expect(spellArea.style.display).toBe('none');
    });
  });

  describe('showListeningQuestion (spell mode)', function() {
    beforeEach(function() {
      app.startListeningQuiz('spell');
      app.beginListeningQuiz();
    });

    test('renders spell input for spell mode', function() {
      var spellArea = document.getElementById('listening-spell-area');
      expect(spellArea.style.display).not.toBe('none');
    });

    test('hides options in spell mode', function() {
      var opts = document.getElementById('listening-options');
      expect(opts.style.display).toBe('none');
    });

    test('shows letter hint matching word length', function() {
      var hint = document.getElementById('listening-letter-hint');
      var q = app.listeningState.questions[0];
      var expected = q.correctEnglish.split('').map(function(ch) {
        return ch === ' ' ? ' ' : '_';
      }).join(' ');
      expect(hint.textContent).toBe(expected);
    });
  });

  describe('_selectListeningAnswer', function() {
    beforeEach(function() {
      app.startListeningQuiz('choose');
      app.beginListeningQuiz();
    });

    test('records correct answer', function() {
      var q = app.listeningState.questions[0];
      app._selectListeningAnswer(q.correctAnswer);
      expect(app.listeningState.answers.length).toBe(1);
      expect(app.listeningState.answers[0].isCorrect).toBe(true);
    });

    test('records wrong answer', function() {
      var q = app.listeningState.questions[0];
      var wrongAnswer = q.options.filter(function(o) { return o !== q.correctAnswer; })[0];
      app._selectListeningAnswer(wrongAnswer);
      expect(app.listeningState.answers[0].isCorrect).toBe(false);
    });

    test('ignores second answer', function() {
      var q = app.listeningState.questions[0];
      app._selectListeningAnswer(q.correctAnswer);
      app._selectListeningAnswer('other');
      expect(app.listeningState.answers.length).toBe(1);
    });

    test('updates score for correct answer', function() {
      var q = app.listeningState.questions[0];
      app._selectListeningAnswer(q.correctAnswer);
      expect(app.listeningState.score).toBe(APP_CONSTANTS.QUIZ_POINTS_PER_QUESTION);
    });

    test('shows feedback', function() {
      var q = app.listeningState.questions[0];
      app._selectListeningAnswer(q.correctAnswer);
      var feedback = document.getElementById('listening-feedback');
      expect(feedback.style.display).toBe('block');
    });

    test('shows next button', function() {
      var q = app.listeningState.questions[0];
      app._selectListeningAnswer(q.correctAnswer);
      var nextBtn = document.getElementById('listening-next');
      expect(nextBtn.style.display).toBe('inline-block');
    });
  });

  describe('_submitListeningSpell', function() {
    beforeEach(function() {
      app.startListeningQuiz('spell');
      app.beginListeningQuiz();
    });

    test('correct spelling is accepted (case insensitive)', function() {
      var q = app.listeningState.questions[0];
      var input = document.getElementById('listening-spell-input');
      input.value = q.correctEnglish.toUpperCase();
      app._submitListeningSpell();
      expect(app.listeningState.answers[0].isCorrect).toBe(true);
    });

    test('wrong spelling is rejected', function() {
      var input = document.getElementById('listening-spell-input');
      input.value = 'zzzzz';
      app._submitListeningSpell();
      expect(app.listeningState.answers[0].isCorrect).toBe(false);
    });

    test('empty input is ignored', function() {
      var input = document.getElementById('listening-spell-input');
      input.value = '';
      app._submitListeningSpell();
      expect(app.listeningState.answers.length).toBe(0);
    });

    test('disables input after submit', function() {
      var q = app.listeningState.questions[0];
      var input = document.getElementById('listening-spell-input');
      input.value = q.correctEnglish;
      app._submitListeningSpell();
      expect(input.disabled).toBe(true);
    });
  });

  describe('nextListeningQuestion', function() {
    beforeEach(function() {
      app.startListeningQuiz('choose');
      app.beginListeningQuiz();
    });

    test('advances to next question', function() {
      var q = app.listeningState.questions[0];
      app._selectListeningAnswer(q.correctAnswer);
      app.nextListeningQuestion();
      expect(app.listeningState.currentQuestionIndex).toBe(1);
    });

    test('shows result on last question', function() {
      app.listeningState.currentQuestionIndex = app.listeningState.questions.length - 1;
      var q = app.listeningState.questions[app.listeningState.currentQuestionIndex];
      app._selectListeningAnswer(q.correctAnswer);
      var spy = jest.spyOn(app, 'showListeningResult');
      app.nextListeningQuestion();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('showListeningResult', function() {
    beforeEach(function() {
      app.startListeningQuiz('choose');
      app.beginListeningQuiz();
      // Answer all questions
      for (var i = 0; i < app.listeningState.questions.length; i++) {
        var q = app.listeningState.questions[i];
        app._selectListeningAnswer(q.correctAnswer);
        if (i < app.listeningState.questions.length - 1) {
          app.nextListeningQuestion();
        }
      }
    });

    test('shows result screen', function() {
      app.showListeningResult();
      var resultScreen = document.getElementById('listening-result-screen');
      expect(resultScreen.style.display).toBe('block');
    });

    test('displays final score', function() {
      app.showListeningResult();
      var score = document.getElementById('listening-final-score');
      expect(score.textContent).toBe('100');
    });

    test('displays correct count', function() {
      app.showListeningResult();
      var count = document.getElementById('listening-correct-count');
      expect(parseInt(count.textContent)).toBe(app.listeningState.questions.length);
    });
  });

  describe('closeListeningModal', function() {
    test('hides modal', function() {
      app.startListeningQuiz('choose');
      app.closeListeningModal();
      var modal = document.getElementById('listening-modal');
      expect(modal.style.display).toBe('none');
    });

    test('sets isActive to false', function() {
      app.startListeningQuiz('choose');
      app.closeListeningModal();
      expect(app.listeningState.isActive).toBe(false);
    });
  });

  describe('isListeningInProgress', function() {
    test('returns false when no state', function() {
      expect(app.isListeningInProgress()).toBe(false);
    });

    test('returns true during quiz', function() {
      app.startListeningQuiz('choose');
      app.beginListeningQuiz();
      expect(app.isListeningInProgress()).toBe(true);
    });

    test('returns false after all answers', function() {
      app.startListeningQuiz('choose');
      app.beginListeningQuiz();
      for (var i = 0; i < app.listeningState.questions.length; i++) {
        var q = app.listeningState.questions[i];
        app._selectListeningAnswer(q.correctAnswer);
        if (i < app.listeningState.questions.length - 1) {
          app.nextListeningQuestion();
        }
      }
      expect(app.isListeningInProgress()).toBe(false);
    });
  });
});

describe('Flashcard Listening Mode', function() {
  var app;

  beforeAll(function() {
    setup.bootstrapApp();
  });

  beforeEach(function() {
    app = new FlashcardApp();
    jest.useFakeTimers();
    app.words = [
      { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0, image: '' },
      { id: 1, english: 'banana', chinese: '香蕉', difficultyLevel: 3, image: '' }
    ];
    app.currentWords = app.words.slice();
    app.currentIndex = 0;
    app.isPaused = false;
    app.showingChinese = false;
    app.settings.displayMode = 'english-first';
    app.settings.listeningMode = false;
    app.srsData = {};

    app.speakWord = jest.fn();
    app.speakChineseWord = jest.fn();
    app.waitForSpeechThenExecute = jest.fn(function(cb) { cb(); });
    app.clearSpeechWait = jest.fn();
    app.updateSrsBadge = jest.fn();
    app.updateActiveFilterDisplay = jest.fn();
    app.updateDifficultyFilterButtonText = jest.fn();
    app.updateReviewFilterButtonText = jest.fn();
    app.syncReviewDates = jest.fn();
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  test('normal mode shows english text in phase 1', function() {
    app.settings.listeningMode = false;
    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
    var el = document.getElementById('english-word');
    expect(el.textContent).toBe('apple');
  });

  test('listening mode hides text in phase 1', function() {
    app.settings.listeningMode = true;
    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
    var el = document.getElementById('english-word');
    expect(el.textContent).toBe('');
  });

  test('listening mode still plays audio in phase 1', function() {
    app.settings.listeningMode = true;
    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS + APP_CONSTANTS.SPEECH_DELAY_MS);
    expect(app.speakWord).toHaveBeenCalledWith('apple');
  });

  test('listening mode ignores delaySpeechInNormalMode', function() {
    app.settings.listeningMode = true;
    app.settings.delaySpeechInNormalMode = true;
    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS + APP_CONSTANTS.SPEECH_DELAY_MS);
    expect(app.speakWord).toHaveBeenCalledWith('apple');
  });

  test('listening mode reveals first language in phase 2', function() {
    app.settings.listeningMode = true;
    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
    jest.advanceTimersByTime(app.settings.delayTime * 1000);

    var el = document.getElementById('english-word');
    expect(el.textContent).toBe('apple');
  });

  test('listening mode skips speech in phase 2', function() {
    app.settings.listeningMode = true;
    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS);
    app.speakWord.mockClear();
    app.speakChineseWord.mockClear();
    jest.advanceTimersByTime(app.settings.delayTime * 1000);
    jest.advanceTimersByTime(APP_CONSTANTS.SPEECH_DELAY_MS);
    expect(app.speakChineseWord).not.toHaveBeenCalled();
  });

  test('quick modes 1-3 disable listening mode', function() {
    app.settings.listeningMode = true;
    app.showNotification = jest.fn();
    app.saveSettings = jest.fn();
    app.redisplayCurrentWord = jest.fn();
    app.closeMenu = jest.fn();
    app.applyQuickMode(1);
    expect(app.settings.listeningMode).toBe(false);
    expect(app.showNotification).toHaveBeenCalledWith(expect.stringContaining('聽力模式已自動關閉'), 'success');
  });

  test('quick mode 4 enables listening mode', function() {
    app.settings.listeningMode = false;
    app.showNotification = jest.fn();
    app.saveSettings = jest.fn();
    app.redisplayCurrentWord = jest.fn();
    app.closeMenu = jest.fn();
    app.applyQuickMode(4);
    expect(app.settings.listeningMode).toBe(true);
    expect(app.voiceSettings.spellOutLetters).toBe(false);
    expect(app.voiceSettings.chineseEnabled).toBe(false);
    expect(app.settings.smartTimerEnabled).toBe(true);
  });

  test('listening mode always plays English audio even in reversed mode', function() {
    app.settings.listeningMode = true;
    app.settings.displayMode = 'chinese-first';
    app.displayCurrentWord();
    jest.advanceTimersByTime(APP_CONSTANTS.UI_ANIMATION_DELAY_MS + APP_CONSTANTS.SPEECH_DELAY_MS);
    expect(app.speakWord).toHaveBeenCalledWith('apple');
    expect(app.speakChineseWord).not.toHaveBeenCalled();
  });

  test('listening mode setting loaded in voice settings', function() {
    app.settings.listeningMode = true;
    app.openVoiceSettings();
    var toggle = document.getElementById('listening-mode-setting');
    expect(toggle.checked).toBe(true);
  });

  test('listening mode setting saved from voice settings', function() {
    var toggle = document.getElementById('listening-mode-setting');
    toggle.checked = true;
    app.saveVoiceSettingsAndClose();
    expect(app.settings.listeningMode).toBe(true);
  });
});
