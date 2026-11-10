/**
 * 文法測驗（Grammar Quiz）流程測試
 * Spec: openspec/specs/grammar-quiz/spec.md
 */

/** 建立一個符合「單字庫／五上單字」工作表格式的假單字庫 */
function makeBankWords() {
  return [
    { id: 0, english: 'pizza', chinese: '披薩', sheetName: '單字庫', difficultyLevel: 0 },
    { id: 1, english: 'soccer', chinese: '足球', sheetName: '單字庫', difficultyLevel: 0 },
    { id: 2, english: 'happy', chinese: '快樂的', sheetName: '單字庫', difficultyLevel: 0 },
    { id: 3, english: 'doctor', chinese: '醫師', sheetName: '單字庫', difficultyLevel: 0 },
    { id: 4, english: 'like', chinese: '喜歡', sheetName: '單字庫', difficultyLevel: 0 },
    { id: 5, english: 'play', chinese: '玩', sheetName: '單字庫', difficultyLevel: 0 },
    { id: 6, english: 'eat; ate; eaten', chinese: '吃', sheetName: '單字庫', difficultyLevel: 0 },
    { id: 7, english: 'dumplings', chinese: '水餃', sheetName: '五上單字', difficultyLevel: 0 },
    { id: 8, english: 'cold', chinese: '感冒; 冷的', sheetName: '五上單字', difficultyLevel: 0 },
    { id: 9, english: 'get up', chinese: '起床', sheetName: '五上單字', difficultyLevel: 0 },
    { id: 10, english: 'apple', chinese: '蘋果', sheetName: '其他工作表', difficultyLevel: 0 }
  ];
}

function createGrammarApp() {
  var app = new FlashcardApp();
  app.words = makeBankWords();
  app.currentWords = app.words.slice();
  app.currentIndex = 0;
  app.grammarQuizState = null;
  app.pauseTimer = jest.fn();
  app.speakWord = jest.fn();
  return app;
}

describe('文法測驗', () => {
  var app;

  beforeEach(() => {
    app = createGrammarApp();
  });

  // ---------------------------------------------------------------
  describe('題目來源', () => {
    test('只取「單字庫」「五上單字」工作表的單字', () => {
      var source = app._grammarQuizSourceWords();
      expect(source.length).toBe(10);
      source.forEach(function(w) {
        expect(APP_CONSTANTS.GRAMMAR_QUIZ_SOURCE_SHEETS).toContain(w.sheetName);
      });
    });

    test('沒有指定工作表時退回使用所有已載入單字', () => {
      app.words = [{ id: 0, english: 'cat', chinese: '貓', sheetName: '其他' }];
      var source = app._grammarQuizSourceWords();
      expect(source.length).toBe(1);
      expect(source[0].english).toBe('cat');
    });

    test('詞彙表只保留字庫中真的存在的單字', () => {
      app.grammarQuizState = { sourceWords: app._grammarQuizSourceWords() };
      var vocab = app._grammarQuizVocabulary();
      var verbNames = vocab.verbs.map(function(v) { return v.base; });
      expect(verbNames).toContain('play');
      expect(verbNames).toContain('eat');
      expect(verbNames).not.toContain('bake'); // 不在字庫中
      var adjNames = vocab.adjectives.map(function(a) { return a.en; });
      expect(adjNames).toContain('happy');
      expect(adjNames).not.toContain('tired');
    });

    test('字型表（eat; ate; eaten）的原形也能被辨識', () => {
      app.grammarQuizState = { sourceWords: app._grammarQuizSourceWords() };
      var vocab = app._grammarQuizVocabulary();
      var verbNames = vocab.verbs.map(function(v) { return v.base; });
      expect(verbNames).toContain('eat');
    });
  });

  // ---------------------------------------------------------------
  describe('句子文法正確性', () => {
    beforeEach(() => {
      app.grammarQuizState = { sourceWords: app._grammarQuizSourceWords() };
    });

    test('BE 動詞依主語單複數選擇 am / is / are', () => {
      var items = app._grammarQuizMakeItems();
      var beItems = items.filter(function(i) { return i.focus === 'be' || i.focus === 'plural'; });
      expect(beItems.length).toBeGreaterThan(0);
      beItems.forEach(function(item) {
        var subject = item.subject.en;
        if (subject === 'I') expect(item.be).toBe('am');
        else if (item.subject.plural) expect(item.be).toBe('are');
        else expect(item.be).toBe('is');
      });
    });

    test('第三人稱單數用 Does / doesn\'t 與原形動詞', () => {
      var items = app._grammarQuizMakeItems();
      var third = items.filter(function(i) { return i.focus === 'third'; });
      expect(third.length).toBeGreaterThan(0);
      third.forEach(function(item) {
        expect(item.aux).toBe('Does');
        expect(item.auxNeg).toBe("doesn't");
        // 疑問句與否定句都用原形
        expect(item.forms.q.tokens).toContain(item.verb.base);
        expect(item.forms.neg.tokens).toContain(item.verb.base);
        // 肯定句用第三人稱單數
        expect(item.forms.aff.tokens).toContain(item.verb.third);
      });
    });

    test('非第三人稱單數用 Do / don\'t 與原形動詞', () => {
      var items = app._grammarQuizMakeItems();
      var doItems = items.filter(function(i) { return i.focus === 'do'; });
      expect(doItems.length).toBeGreaterThan(0);
      doItems.forEach(function(item) {
        expect(item.aux).toBe('Do');
        expect(item.auxNeg).toBe("don't");
        expect(item.forms.aff.tokens).toContain(item.verb.base);
      });
    });

    test('產生的句子開頭一定是大寫字母且以標點結尾', () => {
      var items = app._grammarQuizMakeItems();
      ['aff', 'neg', 'q'].forEach(function(form) {
        items.forEach(function(item) {
          var text = app._grammarQuizFormText(item, form);
          expect(text.charAt(0)).toMatch(/[A-Z]/);
          expect(text).toMatch(/[.?!]$/);
          expect(text).not.toMatch(/\s[.?!]$/);
          expect(text).not.toMatch(/  /);
        });
      });
    });

    test('錯誤選項都不等於正確答案，且互不重複', () => {
      var items = app._grammarQuizMakeItems();
      ['aff', 'neg', 'q'].forEach(function(form) {
        items.forEach(function(item) {
          var correct = app._grammarQuizFormText(item, form);
          var wrongs = app._grammarQuizWrongForms(item, form, 6);
          expect(wrongs.indexOf(correct)).toBe(-1);
          expect(new Set(wrongs).size).toBe(wrongs.length);
        });
      });
    });

    test('BE 動詞題目的錯誤選項包含 is/are/am 錯用', () => {
      var items = app._grammarQuizMakeItems();
      var beItem = items.find(function(i) { return i.focus === 'be' && i.be === 'is'; });
      expect(beItem).toBeTruthy();
      var wrongs = app._grammarQuizWrongForms(beItem, 'aff', 6);
      var joined = wrongs.join(' | ');
      expect(joined).toContain(' am ');
      expect(joined).toContain(' are ');
    });
  });

  // ---------------------------------------------------------------
  describe('題目池', () => {
    beforeEach(() => {
      app.grammarQuizState = { sourceWords: app._grammarQuizSourceWords() };
    });

    test('每個題型都會建立 100 題的題目池', () => {
      ['truefalse', 'fill', 'choice', 'translate'].forEach(function(type) {
        var pool = app._grammarQuizBuildPool(type);
        expect(pool.length).toBe(APP_CONSTANTS.GRAMMAR_QUIZ_POOL_SIZE);
        pool.forEach(function(q) {
          expect(q.type).toBe(type);
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(q.correctAnswer).toBeTruthy();
          expect(q.explain).toBeTruthy();
        });
      });
    });

    test('題目池涵蓋四種文法重點', () => {
      var pool = app._grammarQuizBuildPool('choice');
      var focuses = {};
      pool.forEach(function(q) { focuses[q.focus] = true; });
      expect(Object.keys(focuses).sort()).toEqual(['be', 'do', 'plural', 'third']);
    });

    test('混合題型會混用不同題型', () => {
      var pool = app._grammarQuizBuildPool('mixed');
      var types = {};
      pool.forEach(function(q) { types[q.type] = true; });
      expect(Object.keys(types).length).toBeGreaterThan(1);
    });

    test('是非題的題目一定可以判斷 True 或 False', () => {
      var pool = app._grammarQuizBuildPool('truefalse');
      pool.forEach(function(q) {
        expect(['true', 'false']).toContain(q.correctAnswer);
        expect(q.options.length).toBe(2);
      });
    });

    test('填空選擇題的正確答案一定在選項中', () => {
      var pool = app._grammarQuizBuildPool('fill');
      pool.forEach(function(q) {
        var values = q.options.map(function(o) { return o.value; });
        expect(values).toContain(q.correctAnswer);
        expect(q.question).toContain('____');
      });
    });

    test('選擇題的正確答案一定在選項中，且只有一個正確', () => {
      var pool = app._grammarQuizBuildPool('choice');
      pool.forEach(function(q) {
        var correctCount = q.options.filter(function(o) { return o.value === q.correctAnswer; });
        expect(correctCount.length).toBe(1);
      });
    });

    test('中翻英的題目顯示中文，選項是英文', () => {
      var pool = app._grammarQuizBuildPool('translate');
      pool.forEach(function(q) {
        expect(q.question).toMatch(/[一-鿿]/);
        q.options.forEach(function(o) {
          expect(o.label).not.toMatch(/[一-鿿]/);
        });
      });
    });
  });

  // ---------------------------------------------------------------
  describe('流程', () => {
    test('開始文法測驗會開啟模態框並顯示題型選擇畫面', () => {
      app.startGrammarQuiz();
      expect(document.getElementById('grammar-quiz-modal').style.display).toBe('flex');
      expect(document.getElementById('grammar-quiz-type-screen').style.display).toBe('block');
      expect(document.getElementById('grammar-quiz-progress-screen').style.display).toBe('none');
      // 五種題型按鈕
      var buttons = document.querySelectorAll('#grammar-quiz-type-grid .grammar-quiz-type-btn');
      expect(buttons.length).toBe(5);
      expect(app.grammarQuizState.isActive).toBe(true);
    });

    test('選擇題型後會產生 10 題並切換到答題畫面', () => {
      app.startGrammarQuiz();
      app.beginGrammarQuiz('choice');
      expect(app.grammarQuizState.type).toBe('choice');
      expect(app.grammarQuizState.questions.length).toBe(APP_CONSTANTS.GRAMMAR_QUIZ_QUESTION_COUNT);
      expect(document.getElementById('grammar-quiz-progress-screen').style.display).toBe('block');
      expect(document.getElementById('grammar-quiz-type-screen').style.display).toBe('none');
      expect(document.getElementById('grammar-quiz-current-number').textContent).toBe('1');
      expect(document.getElementById('grammar-quiz-total-number').textContent).toBe('10');
    });

    test('答完一題後才出現下一題按鈕', () => {
      app.startGrammarQuiz();
      app.beginGrammarQuiz('choice');
      var nextBtn = document.getElementById('grammar-quiz-next');
      expect(nextBtn.style.display).toBe('none');
      var q = app.grammarQuizState.questions[0];
      app.selectGrammarQuizAnswer(q.correctAnswer);
      expect(nextBtn.style.display).toBe('inline-block');
      expect(nextBtn.textContent).toBe('下一題');
    });

    test('最後一題的下一題按鈕顯示「查看結果」', () => {
      app.startGrammarQuiz();
      app.beginGrammarQuiz('choice');
      var last = app.grammarQuizState.questions.length - 1;
      app.grammarQuizState.currentQuestionIndex = last;
      var q = app.grammarQuizState.questions[last];
      app.selectGrammarQuizAnswer(q.correctAnswer);
      expect(document.getElementById('grammar-quiz-next').textContent).toBe('查看結果');
    });

    test('答對時得分並顯示綠色回饋', () => {
      app.startGrammarQuiz();
      app.beginGrammarQuiz('choice');
      var q = app.grammarQuizState.questions[0];
      app.selectGrammarQuizAnswer(q.correctAnswer);
      expect(app.grammarQuizState.score).toBe(APP_CONSTANTS.QUIZ_POINTS_PER_QUESTION);
      var feedback = document.getElementById('grammar-quiz-feedback');
      expect(feedback.style.display).toBe('block');
      expect(feedback.className).toContain('correct');
      expect(document.getElementById('grammar-quiz-feedback-result').textContent).toContain('答對了');
    });

    test('答錯時不加分並顯示錯誤回饋', () => {
      app.startGrammarQuiz();
      app.beginGrammarQuiz('choice');
      var q = app.grammarQuizState.questions[0];
      var wrongValue = q.options.find(function(o) { return o.value !== q.correctAnswer; }).value;
      app.selectGrammarQuizAnswer(wrongValue);
      expect(app.grammarQuizState.score).toBe(0);
      var feedback = document.getElementById('grammar-quiz-feedback');
      expect(feedback.className).toContain('wrong');
      expect(document.getElementById('grammar-quiz-feedback-result').textContent).toContain('答錯了');
    });

    test('同一題不能重複作答', () => {
      app.startGrammarQuiz();
      app.beginGrammarQuiz('choice');
      var q = app.grammarQuizState.questions[0];
      app.selectGrammarQuizAnswer(q.correctAnswer);
      app.selectGrammarQuizAnswer('some other answer');
      expect(app.grammarQuizState.answers.length).toBe(1);
    });

    test('答完所有題目後顯示結果畫面與分數', () => {
      app.startGrammarQuiz();
      app.beginGrammarQuiz('truefalse');
      var total = app.grammarQuizState.questions.length;
      for (var i = 0; i < total; i++) {
        var q = app.grammarQuizState.questions[i];
        app.selectGrammarQuizAnswer(q.correctAnswer);
        app.nextGrammarQuizQuestion();
      }
      expect(document.getElementById('grammar-quiz-result-screen').style.display).toBe('block');
      expect(document.getElementById('grammar-quiz-final-score').textContent).toBe('100');
      expect(document.getElementById('grammar-quiz-correct-count').textContent).toBe(String(total));
      expect(document.getElementById('grammar-quiz-wrong-count').textContent).toBe('0');
    });

    test('錯題會列入回顧清單', () => {
      app.startGrammarQuiz();
      app.beginGrammarQuiz('truefalse');
      var q = app.grammarQuizState.questions[0];
      var wrongValue = q.options.find(function(o) { return o.value !== q.correctAnswer; }).value;
      app.selectGrammarQuizAnswer(wrongValue);
      app.nextGrammarQuizQuestion();
      app.showGrammarQuizResult();
      expect(document.getElementById('grammar-quiz-wrong-review').style.display).toBe('block');
      expect(document.getElementById('grammar-quiz-wrong-list').children.length).toBe(1);
    });

    test('可以返回題型選擇畫面', () => {
      app.startGrammarQuiz();
      app.beginGrammarQuiz('fill');
      app.showGrammarQuizTypeSelect();
      expect(document.getElementById('grammar-quiz-type-screen').style.display).toBe('block');
      expect(document.getElementById('grammar-quiz-progress-screen').style.display).toBe('none');
    });

    test('關閉模態框會結束測驗狀態', () => {
      app.startGrammarQuiz();
      app.closeGrammarQuizModal();
      expect(app.grammarQuizState.isActive).toBe(false);
    });

    test('再來一次會重新產生題目', () => {
      app.startGrammarQuiz();
      app.beginGrammarQuiz('fill');
      app.restartGrammarQuiz();
      expect(app.grammarQuizState.currentQuestionIndex).toBe(0);
      expect(app.grammarQuizState.score).toBe(0);
      expect(app.grammarQuizState.questions.length).toBe(APP_CONSTANTS.GRAMMAR_QUIZ_QUESTION_COUNT);
    });

    test('沒有單字時不啟動測驗', () => {
      app.words = [];
      var spy = jest.spyOn(window, 'alert').mockImplementation(function() {});
      app.startGrammarQuiz();
      expect(spy).toHaveBeenCalled();
      expect(app.grammarQuizState).toBe(null);
      spy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  describe('動詞變化', () => {
    test('第三人稱單數與過去式 / -ing 形的選項組', () => {
      expect(app._grammarQuizVerbOptionSet({ base: 'play', third: 'plays' }))
        .toEqual(expect.arrayContaining(['plays', 'play', 'played', 'playing']));
      expect(app._grammarQuizVerbOptionSet({ base: 'study', third: 'studies' }))
        .toEqual(expect.arrayContaining(['studies', 'study', 'studied', 'studying']));
    });

    test('不規則動詞使用正確的過去式', () => {
      expect(app._grammarQuizPastForm('go')).toBe('went');
      expect(app._grammarQuizPastForm('eat')).toBe('ate');
      expect(app._grammarQuizPastForm('forget')).toBe('forgot');
      expect(app._grammarQuizPastForm('begin')).toBe('began');
    });

    test('片語動詞只對動詞本身做變化', () => {
      expect(app._grammarQuizIngForm('get up')).toBe('getting up');
      expect(app._grammarQuizPastForm('get up')).toBe('got up');
      expect(app._grammarQuizIngForm('go to school')).toBe('going to school');
      expect(app._grammarQuizPastForm('go to school')).toBe('went to school');
    });
  });
});
