/**
 * KK 音標功能測試
 * Spec: openspec/specs/kk-phonetic/spec.md
 *
 * 涵蓋：
 *  - 顯示開關（預設關閉；開啟時才顯示/查詢/pre-cache）
 *  - 只針對「單字與片語」（sentence 不顯示、不查詢、不 pre-cache；
 *    片語如 the Netherlands 由後端拆成各單字組合音標）
 *  - I 欄（word.kkPhonetic）已有音標 → 直接顯示，不呼叫 GAS
 *  - I 欄沒有 → 從 GAS 查詢、顯示、寫回 Sheet I 欄與記憶體
 *  - pre-cache（目前 + 接下來 N 個單字）
 *  - in-flight dedupe（同一單字不重複發送 request）
 *  - race condition（晚回來的音標不顯示在已切換的單字上，但會寫回資料）
 *  - 編輯單字：KK 資訊顯示、強制重新抓取、多筆候選選擇、修改英文時清除 KK
 *  - 失敗容錯：API 失敗不影響卡片顯示
 */
var app;

beforeEach(function() {
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;

  // 未改動前的預設值（供預設行為測試斷言）
  app.defaultShowKKPhonetic = app.settings.showKKPhonetic;
  app.settings.showKKPhonetic = false;
  app.kkPhoneticCache = {};
  app._kkPendingFetches = {};
  app._kkDisplayToken = 0;
  app.sheetSettings.sheetId = 'test-sheet-id';

  // 預設 mock：記錄 queryKKPhonetic 呼叫，回呼成功結果。
  // handler 於呼叫當下同步捕獲（對齊 GAS 每次呼叫獨立 handler 的語意），
  // 重疊的 API 呼叫不會互相覆蓋 handler。
  app._kkApiCalls = [];
  google.script.run.queryKKPhonetic = function(word) {
    app._kkApiCalls.push(word);
    var successHandler = this._successHandler;
    setTimeout(function() {
      if (successHandler) {
        successHandler({ success: true, word: word, candidates: ['əˈpɛl'], source: 'web' });
      }
    }, 0);
    return this;
  };
  app._kkSheetWrites = [];
  google.script.run.updateWordProperties = function(sheetId, sheetName, rowIndex, properties) {
    app._kkSheetWrites.push({ sheetId: sheetId, sheetName: sheetName, rowIndex: rowIndex, properties: properties });
    var successHandler = this._successHandler;
    setTimeout(function() {
      if (successHandler) successHandler({ success: true });
    }, 0);
    return this;
  };
});

function makeWord(overrides) {
  var base = {
    id: 1,
    english: 'apple',
    chinese: '蘋果',
    kkPhonetic: '',
    sheetName: 'Sheet1',
    originalRowIndex: 1
  };
  for (var k in (overrides || {})) {
    if (overrides.hasOwnProperty(k)) base[k] = overrides[k];
  }
  return base;
}

// ============================================================
// 顯示開關與 eligibility
// ============================================================
describe('KK phonetic eligibility', function() {

  test('defaults to enabled', function() {
    expect(app.defaultShowKKPhonetic).toBe(true);
  });

  test('hides display when setting is off', function() {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = false;
    app.updateKKPhoneticDisplay(makeWord({ kkPhonetic: 'əˈpɛl' }));
    expect(el.style.display).toBe('none');
  });

  test('not eligible for empty english', function() {
    app.settings.showKKPhonetic = true;
    expect(app._isKKPhoneticEligible(makeWord({ english: '' }))).toBe(false);
    expect(app._isKKPhoneticEligible(null)).toBe(false);
  });

  test('eligible for word and phrase types, not sentence', function() {
    app.settings.showKKPhonetic = true;
    expect(app._isKKPhoneticEligible(makeWord({ english: 'apple' }))).toBe(true);
    expect(app._isKKPhoneticEligible(makeWord({ english: 'the Netherlands' }))).toBe(true); // phrase
    expect(app._isKKPhoneticEligible(makeWord({ english: 'hot dog' }))).toBe(true);        // phrase
    expect(app._isKKPhoneticEligible(makeWord({ english: 'I am a boy.' }))).toBe(false);    // sentence
  });

  test('eligible for word form lists and hyphenated compounds', function() {
    app.settings.showKKPhonetic = true;
    expect(app._isKKPhoneticEligible(makeWord({ english: 'swing; swung; swung' }))).toBe(true);
    expect(app._isKKPhoneticEligible(makeWord({ english: 'woman / women' }))).toBe(true);
    expect(app._isKKPhoneticEligible(makeWord({ english: 'twenty-five' }))).toBe(true);
    expect(app._isKKPhoneticEligible(makeWord({ english: 'mother-in-law' }))).toBe(true);
    // 「take off / take out」各段含空格 → phrase（可查詢；後端無法拆解 → 空結果）
    expect(app._isKKPhoneticEligible(makeWord({ english: 'take off / take out' }))).toBe(true);
  });
});

// ============================================================
// K 鍵快速切換（toggleKKPhonetic）
// ============================================================
describe('KK phonetic K-key toggle', function() {

  test('toggles setting, shows toast, updates display immediately when timing already reached', function() {
    var el = document.getElementById('kk-phonetic-display');
    var toggleEl = document.getElementById('kk-phonetic-setting');
    app.settings.showKKPhonetic = false;
    var word = makeWord({ kkPhonetic: 'əˈpɛl' });
    app.currentWords = [word];
    app.currentIndex = 0;
    app.updateKKPhoneticDisplay(word); // 關閉狀態：隱藏
    expect(el.style.display).toBe('none');

    var spyToast = jest.spyOn(app, 'showNotification');
    app.toggleKKPhonetic(); // K 鍵：開啟

    expect(app.settings.showKKPhonetic).toBe(true);
    expect(spyToast).toHaveBeenCalledWith('✓ KK 音標：開啟', 'success', { extraClass: 'toast-below' });
    if (toggleEl) expect(toggleEl.checked).toBe(true);
    // Phase 2 時機已到（_kkFirstPartShown），應立即淡入
    expect(el.style.display).toBe('flex');
    expect(el.textContent).toBe('/əˈpɛl/');
  });

  test('second press hides display and syncs modal toggle off', function() {
    var el = document.getElementById('kk-phonetic-display');
    var toggleEl = document.getElementById('kk-phonetic-setting');
    app.settings.showKKPhonetic = true;
    var word = makeWord({ kkPhonetic: 'əˈpɛl' });
    app.currentWords = [word];
    app.currentIndex = 0;
    app.updateKKPhoneticDisplay(word);
    app._maybeShowKKPhonetic(); // 已顯示中
    expect(el.style.display).toBe('flex');

    var spyToast = jest.spyOn(app, 'showNotification');
    app.toggleKKPhonetic(); // K 鍵：關閉

    expect(app.settings.showKKPhonetic).toBe(false);
    expect(spyToast).toHaveBeenCalledWith('✓ KK 音標：關閉', 'info', { extraClass: 'toast-below' });
    if (toggleEl) expect(toggleEl.checked).toBe(false);
    expect(el.style.display).toBe('none');
    expect(el.textContent).toBe('');
  });

  test('toggle while fetch in flight: late response does not show after turning off', function(done) {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = false;
    var word = makeWord({ kkPhonetic: '' });
    app.currentWords = [word];
    app.currentIndex = 0;
    app.updateKKPhoneticDisplay(word); // 關閉：不查詢
    expect(app._kkApiCalls.length).toBe(0);

    app.toggleKKPhonetic(); // 開啟：發查詢
    expect(app._kkApiCalls).toEqual(['apple']);
    app._maybeShowKKPhonetic(); // 時機先到，回應未回
    app.toggleKKPhonetic(); // 再按一次關閉

    setTimeout(function() {
      // 回應晚到：已關閉，不得顯示
      expect(el.style.display).toBe('none');
      done();
    }, 10);
  });

  test('toggle persists to localStorage via saveSettings', function() {
    app.settings.showKKPhonetic = false;
    app.toggleKKPhonetic();
    var stored = JSON.parse(localStorage.getItem('flashcard-settings'));
    expect(stored.showKKPhonetic).toBe(true);
    app.toggleKKPhonetic();
    stored = JSON.parse(localStorage.getItem('flashcard-settings'));
    expect(stored.showKKPhonetic).toBe(false);
  });
});

// ============================================================
// 顯示邏輯
// ============================================================
describe('KK phonetic display', function() {

  test('shows column I phonetic directly without GAS call', function() {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    app.updateKKPhoneticDisplay(makeWord({ kkPhonetic: 'əˈpɛl' }));

    // 音標與英文同步：英文尚未顯示時先隱藏
    expect(el.style.display).toBe('none');
    expect(app._kkApiCalls.length).toBe(0); // 不呼叫 GAS

    // 英文顯示時機到 → 音標同步出現
    app._maybeShowKKPhonetic();
    expect(el.style.display).toBe('flex');
    expect(el.textContent).toBe('/əˈpɛl/');
  });

  test('shows cached phonetic without GAS call', function() {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    app.kkPhoneticCache['apple'] = { p: 'ˈkærəktɚ', ts: Date.now() };
    app.updateKKPhoneticDisplay(makeWord({ english: 'APPLE', kkPhonetic: '' }));

    app._maybeShowKKPhonetic();
    expect(el.style.display).toBe('flex');
    expect(el.textContent).toBe('/ˈkærəktɚ/');
    expect(app._kkApiCalls.length).toBe(0);
  });

  test('phase timing: hidden in phase 1, appears at phase 2 (second-language reveal)', function() {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    app.updateKKPhoneticDisplay(makeWord({ kkPhonetic: 'əˈpɛl' }));

    // Phase 1（先英文只顯示英文）：不顯示音標
    expect(el.style.display).toBe('none');

    // Phase 2（計時器走到一半，第二語言出現）：音標才出現
    app._maybeShowKKPhonetic();
    expect(el.style.display).toBe('flex');
    expect(el.textContent).toBe('/əˈpɛl/');
  });

  test('shows phonetic when it arrives after the english display moment', function(done) {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    // 慢回應 mock：回應晚於英文顯示時機
    google.script.run.queryKKPhonetic = function(w) {
      app._kkApiCalls.push(w);
      var successHandler = this._successHandler;
      setTimeout(function() {
        if (successHandler) {
          successHandler({ success: true, word: w, candidates: ['ˋæpḷ'], source: 'web' });
        }
      }, 10);
      return this;
    };

    app.updateKKPhoneticDisplay(makeWord({ kkPhonetic: '' }));

    // 英文先顯示（查詢尚未回應，不顯示）
    app._maybeShowKKPhonetic();
    expect(el.style.display).toBe('none');

    setTimeout(function() {
      // 回應晚到：自動補上顯示
      expect(el.style.display).toBe('flex');
      expect(el.textContent).toBe('/ˋæpḷ/');
      done();
    }, 30);
  });

  test('displays only once per card (no duplicate reveal on phase 2)', function() {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    app.updateKKPhoneticDisplay(makeWord({ kkPhonetic: 'əˈpɛl' }));

    app._maybeShowKKPhonetic(); // phase 1（英文顯示）
    el.textContent = 'MUTATED';
    app._maybeShowKKPhonetic(); // phase 2（翻譯顯示）不應重複寫入
    expect(el.textContent).toBe('MUTATED');
  });

  test('fetches from GAS when column I empty, then displays and writes back', function(done) {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    var word = makeWord({ kkPhonetic: '' });

    app.updateKKPhoneticDisplay(word);

    // 查詢中：不顯示
    expect(el.style.display).toBe('none');
    expect(app._kkApiCalls).toEqual(['apple']);

    // 英文顯示時機先到（查詢仍進行中）
    app._maybeShowKKPhonetic();
    expect(el.style.display).toBe('none');

    setTimeout(function() {
      // 回應晚到：自動補上顯示 + 寫回 Sheet I 欄
      expect(el.style.display).toBe('flex');
      expect(el.textContent).toBe('/əˈpɛl/');
      expect(app._kkSheetWrites.length).toBe(1);
      expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('əˈpɛl');
      expect(app._kkSheetWrites[0].rowIndex).toBe(1);
      done();
    }, 10);
  });

  test('hides display for sentence even when setting on', function() {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    app.updateKKPhoneticDisplay(makeWord({ english: 'I am ok.' }));
    expect(el.style.display).toBe('none');
    expect(app._kkApiCalls.length).toBe(0);
  });

  test('queries and displays combined phonetic for phrases (the Netherlands)', function(done) {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    google.script.run.queryKKPhonetic = function(word) {
      app._kkApiCalls.push(word);
      var successHandler = this._successHandler;
      setTimeout(function() {
        if (successHandler) {
          // 後端拆字組合的片語音標（the + Netherlands，單字間以空白連接）
          successHandler({ success: true, word: word, candidates: ['ðə ˋnɛðɚlændz'], source: 'dict' });
        }
      }, 0);
      return this;
    };
    var word = makeWord({ english: 'the Netherlands', kkPhonetic: '' });

    app.updateKKPhoneticDisplay(word);
    expect(app._kkApiCalls.length).toBe(1);
    expect(app._kkApiCalls[0]).toBe('the Netherlands');

    setTimeout(function() {
      app._maybeShowKKPhonetic(); // 顯示時機已到
      expect(el.textContent).toBe('/ðə ˋnɛðɚlændz/');
      expect(el.style.display).toBe('flex');
      expect(el.classList.contains('kk-phonetic-long')).toBe(false); // 14 字內不縮小字級
      // 組合音標寫回原本單字資料（之後同片語直接命中、不再查詢）
      expect(word.kkPhonetic).toBe('ðə ˋnɛðɚlændz');
      done();
    }, 10);
  });

  test('applies kk-phonetic-long class for long combined phrase phonetics', function(done) {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    google.script.run.queryKKPhonetic = function(word) {
      app._kkApiCalls.push(word);
      var successHandler = this._successHandler;
      setTimeout(function() {
        if (successHandler) {
          successHandler({ success: true, word: word, candidates: ['ðə juˋnaɪtəd ˋstets əv əˋmɛrəkə'], source: 'dict' });
        }
      }, 0);
      return this;
    };

    app.updateKKPhoneticDisplay(makeWord({ english: 'the United States of America', kkPhonetic: '' }));

    setTimeout(function() {
      app._maybeShowKKPhonetic();
      expect(el.classList.contains('kk-phonetic-long')).toBe(true);
      done();
    }, 10);
  });

  test('stale response does not display after word switch (race condition)', function(done) {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    var word = makeWord({ kkPhonetic: '' });

    // banana 的查詢刻意不回應：banana 仍在查詢中，
    // 用以驗證 apple 晚回來的音標不會顯示在 banana 卡片上。
    google.script.run.queryKKPhonetic = function(w) {
      app._kkApiCalls.push(w);
      var successHandler = this._successHandler;
      if (w === 'banana') return this; // 永不回應
      setTimeout(function() {
        if (successHandler) {
          successHandler({ success: true, word: w, candidates: ['əˈpɛl'], source: 'web' });
        }
      }, 0);
      return this;
    };

    app.updateKKPhoneticDisplay(word);
    expect(app._kkApiCalls.length).toBe(1);

    // 模擬使用者切換到下一個單字（token 遞增）
    app.updateKKPhoneticDisplay(makeWord({ id: 2, english: 'banana', kkPhonetic: '' }));

    setTimeout(function() {
      // 晚回來的 apple 音標不可顯示在 banana 卡片上
      expect(el.textContent).toBe('');
      expect(el.style.display).toBe('none');
      done();
    }, 20);
  });

  test('stale response still writes back to original word data', function(done) {
    app.settings.showKKPhonetic = true;
    var word = makeWord({ id: 7, english: 'cherry', kkPhonetic: '' });

    // banana 的查詢刻意不回應，僅驗證 cherry 晚到回應的寫回行為
    google.script.run.queryKKPhonetic = function(w) {
      app._kkApiCalls.push(w);
      var successHandler = this._successHandler;
      if (w === 'banana') return this; // 永不回應
      setTimeout(function() {
        if (successHandler) {
          successHandler({ success: true, word: w, candidates: ['əˈpɛl'], source: 'web' });
        }
      }, 0);
      return this;
    };

    app.updateKKPhoneticDisplay(word);
    app.updateKKPhoneticDisplay(makeWord({ id: 2, english: 'banana', kkPhonetic: '' }));

    setTimeout(function() {
      // 資料寫回原本單字（不顯示）
      expect(word.kkPhonetic).toBe('əˈpɛl');
      expect(app._kkSheetWrites.length).toBe(1);
      done();
    }, 20);
  });

  test('API failure leaves display hidden and does not throw', function(done) {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    google.script.run.queryKKPhonetic = function() {
      var runner = google.script.run;
      setTimeout(function() {
        if (runner._failureHandler) runner._failureHandler(new Error('network down'));
      }, 0);
      return runner;
    };

    expect(function() {
      app.updateKKPhoneticDisplay(makeWord({ kkPhonetic: '' }));
    }).not.toThrow();

    setTimeout(function() {
      expect(el.style.display).toBe('none');
      done();
    }, 20);
  });
});

// ============================================================
// Pre-cache
// ============================================================
describe('KK phonetic precache', function() {

  test('does nothing when setting off', function() {
    app.settings.showKKPhonetic = false;
    app.currentWords = [makeWord({ kkPhonetic: '' }), makeWord({ id: 2, english: 'bee', kkPhonetic: '' })];
    app.precacheUpcomingKKPhonetics(5);
    expect(app._kkApiCalls.length).toBe(0);
  });

  test('precache upcoming words only (word and phrase types)', function() {
    app.settings.showKKPhonetic = true;
    app.currentWords = [
      makeWord({ id: 1, english: 'cat', kkPhonetic: 'kæt', originalRowIndex: 1 }),
      makeWord({ id: 2, english: 'dog', kkPhonetic: '', originalRowIndex: 2 }),
      makeWord({ id: 3, english: 'hot dog', kkPhonetic: '', originalRowIndex: 3 }),
      makeWord({ id: 4, english: 'I am ok.', kkPhonetic: '', originalRowIndex: 4 }),
      makeWord({ id: 5, english: 'sun', kkPhonetic: '', originalRowIndex: 5 })
    ];
    app.currentIndex = 0;

    app.precacheUpcomingKKPhonetics(5);

    // cat 已有音標（I 欄）→ 不查；I am ok. 為 sentence → 不查；dog、hot dog、sun → 查
    expect(app._kkApiCalls.sort()).toEqual(['dog', 'hot dog', 'sun']);
  });

  test('wraps around circular list', function() {
    app.settings.showKKPhonetic = true;
    app.currentWords = [
      makeWord({ id: 1, english: 'cat', kkPhonetic: 'kæt', originalRowIndex: 1 }),
      makeWord({ id: 2, english: 'dog', kkPhonetic: 'dɔg', originalRowIndex: 2 }),
      makeWord({ id: 3, english: 'sun', kkPhonetic: '', originalRowIndex: 3 })
    ];
    app.currentIndex = 2;

    app.precacheUpcomingKKPhonetics(3);

    // cat、dog 已有音標；sun（當前）無 → 只查 sun
    expect(app._kkApiCalls).toEqual(['sun']);
  });

  test('does not duplicate requests for in-flight words', function() {
    app.settings.showKKPhonetic = true;
    app.currentWords = [
      makeWord({ id: 1, english: 'dog', kkPhonetic: '', originalRowIndex: 2 })
    ];
    app.currentIndex = 0;

    app.precacheUpcomingKKPhonetics(5);
    app.precacheUpcomingKKPhonetics(5);
    app.fetchKKPhonetic(app.currentWords[0], {}, null);

    expect(app._kkApiCalls.length).toBe(1); // dedupe：只送一次
  });
});

// ============================================================
// 真人發音音檔預載（背景、去重、失敗靜默）
// ============================================================
describe('KK audio preload', function() {
  var created;

  beforeEach(function() {
    created = [];
    global.Audio = function() {
      this.preload = '';
      this.src = '';
      this.onerror = null;
      this.load = jest.fn();
      created.push(this);
    };
    app._kkAudioPreloaded = {}; // 重置去重快取（不清除，保留建構初始化）
    delete app._kkAudioExt;
    delete app._kkAudioPlayer;
    app.settings.showKKPhonetic = true;
  });

  afterEach(function() { delete global.Audio; });

  test('preloads audio files for all phonetic cards in the round', function() {
    app.currentWords = [
      makeWord({ id: 1, english: '/p/' }),
      makeWord({ id: 2, english: '/b/' }),
      makeWord({ id: 3, english: 'cat' })
    ];
    app.currentIndex = 0;

    app.preloadUpcomingKKAudio();

    expect(created.length).toBe(2); // 音標卡全部預載，普通單字卡不預載
    expect(decodeURIComponent(created[0].src)).toContain('/kk-audio/p');
    expect(decodeURIComponent(created[1].src)).toContain('/kk-audio/b');
    expect(created[0].preload).toBe('auto');
  });

  test('preloads resolved phonetics only for nearby regular cards', function() {
    app.currentWords = [
      makeWord({ id: 1, english: 'cat', kkPhonetic: 'kæt' }),   // 窗口內、已有音標
      makeWord({ id: 2, english: 'dog', kkPhonetic: '' }),       // 尚無音標 → 無法預載
      makeWord({ id: 3, english: 'sun', kkPhonetic: '' }),
      makeWord({ id: 4, english: 'run', kkPhonetic: '' }),
      makeWord({ id: 5, english: 'bun', kkPhonetic: '' }),
      makeWord({ id: 6, english: 'fun', kkPhonetic: '' }),
      makeWord({ id: 7, english: 'far', kkPhonetic: '' }),
      makeWord({ id: 8, english: 'bar', kkPhonetic: 'bɑr' })     // 窗口外
    ];
    app.currentIndex = 0;

    app.preloadUpcomingKKAudio();

    expect(created.length).toBe(1);
    expect(decodeURIComponent(created[0].src)).toContain('/kk-audio/kæt');
  });

  test('dedupes by symbol, retry allowed after load error', function() {
    app.currentWords = [makeWord({ id: 1, english: '/θ/' })];
    app.preloadUpcomingKKAudio();
    app.preloadUpcomingKKAudio();
    expect(created.length).toBe(1); // 同一音標只預載一次

    created[0].onerror();          // 載入失敗 → 之後可重試
    app.preloadUpcomingKKAudio();
    expect(created.length).toBe(2);
  });

  test('does not preload regular word audio when KK setting off', function() {
    app.settings.showKKPhonetic = false;
    app.currentWords = [makeWord({ id: 1, english: 'cat', kkPhonetic: 'kæt' })];

    app.preloadUpcomingKKAudio();

    expect(created.length).toBe(0);
  });

  test('displayCurrentWord triggers background preload', function() {
    app.currentWords = [makeWord({ id: 1, english: '/p/' })];
    app.currentIndex = 0;
    var spy = jest.spyOn(app, 'preloadUpcomingKKAudio');

    try { app.displayCurrentWord(); } catch (e) { /* DOM 不足時忽略 */ }

    expect(spy).toHaveBeenCalled();
  });
});

// ============================================================
// fetchKKPhonetic：dedupe / 寫回
// ============================================================
describe('fetchKKPhonetic', function() {

  test('coalesces concurrent calls for the same word', function(done) {
    app.settings.showKKPhonetic = true;
    var results = [];
    var word = makeWord({ kkPhonetic: '' });

    app.fetchKKPhonetic(word, {}, function(r) { results.push('a' + (r ? r.phonetic : 'null')); });
    app.fetchKKPhonetic(word, {}, function(r) { results.push('b' + (r ? r.phonetic : 'null')); });

    setTimeout(function() {
      expect(app._kkApiCalls.length).toBe(1);
      expect(results).toEqual(['aəˈpɛl', 'bəˈpɛl']);
      done();
    }, 10);
  });

  test('forces refetch ignoring cache and column I', function(done) {
    app.settings.showKKPhonetic = true;
    app.kkPhoneticCache['apple'] = { p: 'old', ts: Date.now() };
    var word = makeWord({ kkPhonetic: 'old-sheet' });

    app.fetchKKPhonetic(word, { force: true }, function(r) {
      expect(r.phonetic).toBe('əˈpɛl');      // 來自 GAS 的新結果
      expect(app._kkApiCalls.length).toBe(1); // 有實際呼叫 GAS
      done();
    });
  });

  test('writeBack: false skips Sheet write (edit-modal refetch)', function(done) {
    app.settings.showKKPhonetic = true;
    var word = makeWord({ kkPhonetic: '' });

    app.fetchKKPhonetic(word, { force: true, writeBack: false }, function(r) {
      expect(r.phonetic).toBe('əˈpɛl');
      expect(app._kkSheetWrites.length).toBe(0);
      done();
    });
  });

  test('returns null for sentence content', function(done) {
    app.fetchKKPhonetic(makeWord({ english: 'I am ok.' }), {}, function(r) {
      expect(r).toBe(null);
      expect(app._kkApiCalls.length).toBe(0);
      done();
    });
  });

  test('queries phrase content and caches empty result when backend cannot combine', function(done) {
    // 片語（the Netherlands 等）會發查詢；後端任一字查無 → 空結果一樣進快取，避免反覆查詢
    google.script.run.queryKKPhonetic = function(word) {
      app._kkApiCalls.push(word);
      var successHandler = this._successHandler;
      setTimeout(function() {
        if (successHandler) {
          successHandler({ success: true, word: word, candidates: [], source: 'none' });
        }
      }, 0);
      return this;
    };
    var word = makeWord({ english: 'take off / take out', kkPhonetic: '' });

    app.fetchKKPhonetic(word, {}, function(r) {
      expect(r).not.toBe(null);
      expect(r.phonetic).toBe('');
      expect(app._kkApiCalls).toEqual(['take off / take out']);
      done();
    });
  });

  test('caches empty result to avoid repeated queries', function(done) {
    app.settings.showKKPhonetic = true;
    google.script.run.queryKKPhonetic = function(word) {
      app._kkApiCalls.push(word);
      var successHandler = this._successHandler;
      setTimeout(function() {
        if (successHandler) {
          successHandler({ success: true, word: word, candidates: [], source: 'none' });
        }
      }, 0);
      return this;
    };
    var word = makeWord({ kkPhonetic: '' });

    app.fetchKKPhonetic(word, {}, function(r1) {
      expect(r1.phonetic).toBe('');
      // 第二次：快取命中（空結果），不再次呼叫 GAS
      app.fetchKKPhonetic(word, {}, function(r2) {
        expect(app._kkApiCalls.length).toBe(1);
        expect(r2).not.toBe(null);
        done();
      });
    });
  });

  test('handles missing google.script.run gracefully', function(done) {
    var oldGoogle = google;
    google = undefined;
    var called = false;
    app.fetchKKPhonetic(makeWord({ kkPhonetic: '' }), {}, function(r) {
      called = true;
      expect(r).toBe(null);
      google = oldGoogle;
      done();
    });
  });
});

// ============================================================
// 編輯單字整合
// ============================================================
describe('edit word KK phonetic', function() {

  beforeEach(function() {
    jest.useFakeTimers();
    app.pauseTimer = jest.fn();
    app.resumeTimer = jest.fn();
    app.updatePauseButtonState = jest.fn();
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  test('openEditWordModal shows current KK phonetic', function() {
    app.words = [makeWord({ kkPhonetic: 'əˈpɛl' })];
    app.currentWords = app.words.slice();
    app.currentIndex = 0;

    app.openEditWordModal();

    var valueEl = document.getElementById('edit-word-kk-value');
    expect(valueEl.textContent).toBe('əˈpɛl');
  });

  test('openEditWordModal shows placeholder when no KK phonetic', function() {
    app.words = [makeWord({ kkPhonetic: '' })];
    app.currentWords = app.words.slice();

    app.openEditWordModal();

    var valueEl = document.getElementById('edit-word-kk-value');
    expect(valueEl.textContent).toContain('尚未設定');
  });

  test('refetch forces GAS query and shows single result', function() {
    app.words = [makeWord({ kkPhonetic: 'old' })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    app.refetchKKPhoneticForEdit();
    jest.runAllTimers();

    expect(app._kkApiCalls).toEqual(['apple']);
    expect(document.getElementById('edit-word-kk-value').textContent).toBe('əˈpɛl');
    expect(document.getElementById('edit-word-kk-candidates').style.display).toBe('none');
    // writeBack: false → 不直接寫 Sheet，儲存時才寫
    expect(app._kkSheetWrites.length).toBe(0);
  });

  test('refetch with multiple candidates shows chooser and selection', function() {
    app.words = [makeWord({ kkPhonetic: '' })];
    app.currentWords = app.words.slice();
    google.script.run.queryKKPhonetic = function(word) {
      var runner = google.script.run;
      setTimeout(function() {
        if (runner._successHandler) {
          runner._successHandler({
            success: true, word: word,
            candidates: ['əˈpɛl', 'ˈepl'], source: 'dict'
          });
        }
      }, 0);
      return runner;
    };

    app.openEditWordModal();
    app.refetchKKPhoneticForEdit();
    jest.runAllTimers();

    var container = document.getElementById('edit-word-kk-candidates');
    expect(container.style.display).toBe('flex');
    var btns = container.querySelectorAll('.edit-word-kk-candidate-btn');
    expect(btns.length).toBe(2);
    expect(btns[0].classList.contains('kk-candidate-selected')).toBe(true); // 預選第一筆

    // 使用者點選第二筆
    app.selectKKPhoneticForEdit('ˈepl');
    expect(btns[1].classList.contains('kk-candidate-selected')).toBe(true);
    expect(btns[0].classList.contains('kk-candidate-selected')).toBe(false);
    expect(document.getElementById('edit-word-kk-value').textContent).toBe('ˈepl');
  });

  test('save writes selected KK phonetic to Sheet column I', function() {
    app.words = [makeWord({ kkPhonetic: '' })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();
    app.refetchKKPhoneticForEdit();
    jest.runAllTimers();
    app.selectKKPhoneticForEdit('əˈpɛl');

    app.saveEditWord();

    expect(app._kkSheetWrites.length).toBe(1);
    expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('əˈpɛl');
    expect(app.words[0].kkPhonetic).toBe('əˈpɛl');
    // 快取同步 → 顯示路徑可直接使用
    expect(app.kkPhoneticCache['apple']).toBeDefined();
  });

  test('changing english clears KK phonetic on save (no stale reuse)', function() {
    app.words = [makeWord({ kkPhonetic: 'əˈpɛl' })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    document.getElementById('edit-word-english').value = 'banana';
    app.saveEditWord();

    expect(app._kkSheetWrites.length).toBe(1);
    expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('');
    expect(app.words[0].kkPhonetic).toBe('');
    expect(app.words[0].english).toBe('banana');
  });

  test('changing english keeps a KK phonetic fetched for the NEW word', function() {
    app.words = [makeWord({ kkPhonetic: '' })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    // 先把英文改成 banana，再重新抓取（查詢的就是 banana）
    document.getElementById('edit-word-english').value = 'banana';
    google.script.run.queryKKPhonetic = function(word) {
      var runner = google.script.run;
      setTimeout(function() {
        if (runner._successHandler) {
          runner._successHandler({ success: true, word: word, candidates: ['ˈbænənə'], source: 'web' });
        }
      }, 0);
      return runner;
    };
    app.refetchKKPhoneticForEdit();
    jest.runAllTimers();

    app.saveEditWord();

    expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('ˈbænənə');
    expect(app.words[0].english).toBe('banana');
    expect(app.words[0].kkPhonetic).toBe('ˈbænənə');
  });

  test('refetch failure shows error status', function() {
    app.words = [makeWord({ kkPhonetic: '' })];
    app.currentWords = app.words.slice();
    google.script.run.queryKKPhonetic = function() {
      var runner = google.script.run;
      setTimeout(function() {
        if (runner._failureHandler) runner._failureHandler(new Error('fail'));
      }, 0);
      return runner;
    };

    app.openEditWordModal();
    app.refetchKKPhoneticForEdit();
    jest.runAllTimers();

    var status = document.getElementById('edit-word-kk-status');
    expect(status.style.display).toBe('block');
    expect(status.classList.contains('kk-status-error')).toBe(true);
  });

  test('refetch with no candidates shows not-found status', function() {
    app.words = [makeWord({ kkPhonetic: '' })];
    app.currentWords = app.words.slice();
    google.script.run.queryKKPhonetic = function(word) {
      app._kkApiCalls.push(word);
      var successHandler = this._successHandler;
      setTimeout(function() {
        if (successHandler) {
          successHandler({ success: true, word: word, candidates: [], source: 'none' });
        }
      }, 0);
      return this;
    };

    app.openEditWordModal();
    app.refetchKKPhoneticForEdit();
    jest.runAllTimers();

    var status = document.getElementById('edit-word-kk-status');
    expect(status.textContent).toContain('查無');
  });
});

// ============================================================
// 編輯單字：手動輸入 KK 音標
// v1.24.0：除了從找到的候選中點選，也可直接在「手動輸入」欄位
// 輸入音標；候選點選會一併填入該欄位，輸入值在儲存時優先
// ============================================================
describe('edit word manual KK phonetic input', function() {

  /** 模擬使用者在「手動輸入」欄位逐字輸入 */
  function typeKK(value) {
    var input = document.getElementById('edit-word-kk-input');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    return input;
  }

  beforeEach(function() {
    jest.useFakeTimers();
    app.pauseTimer = jest.fn();
    app.resumeTimer = jest.fn();
    app.updatePauseButtonState = jest.fn();
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  test('openEditWordModal fills the input with the current column I value', function() {
    app.words = [makeWord({ kkPhonetic: 'ˋæpḷ' })];
    app.currentWords = app.words.slice();

    app.openEditWordModal();

    expect(document.getElementById('edit-word-kk-input').value).toBe('ˋæpḷ');
  });

  test('openEditWordModal fills the input with the first stored candidate', function() {
    app.words = [makeWord({ kkPhonetic: 'əˈpɛl', kkCandidates: ['əˈpɛl', 'ˈæpəl'] })];
    app.currentWords = app.words.slice();

    app.openEditWordModal();

    expect(document.getElementById('edit-word-kk-input').value).toBe('əˈpɛl');
  });

  test('selecting a candidate also fills the input', function() {
    app.words = [makeWord({ kkPhonetic: 'əˈpɛl', kkCandidates: ['əˈpɛl', 'ˈæpəl'] })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    app.selectKKPhoneticForEdit('ˈæpəl');

    expect(document.getElementById('edit-word-kk-input').value).toBe('ˈæpəl');
    expect(app._kkEditManualInput).toBe(false);
  });

  test('refetch fills the input with the fetched result', function() {
    app.words = [makeWord({ kkPhonetic: 'old' })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    app.refetchKKPhoneticForEdit();
    jest.runAllTimers();

    expect(document.getElementById('edit-word-kk-input').value).toBe('əˈpɛl');
  });

  test('typing a phonetic updates the value display', function() {
    app.words = [makeWord({ kkPhonetic: '' })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    typeKK('ˋæpḷ');

    expect(document.getElementById('edit-word-kk-value').textContent).toBe('ˋæpḷ');
    expect(app._kkEditManualInput).toBe(true);
  });

  test('typing over a candidate clears the candidate selection', function() {
    app.words = [makeWord({ kkPhonetic: 'əˈpɛl', kkCandidates: ['əˈpɛl', 'ˈæpəl'] })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    typeKK('ˋæpḷ');
    var btns = document.getElementById('edit-word-kk-candidates')
      .querySelectorAll('.edit-word-kk-candidate-btn');
    expect(btns[0].classList.contains('kk-candidate-selected')).toBe(false);
    expect(btns[1].classList.contains('kk-candidate-selected')).toBe(false);
  });

  test('typing a value equal to a candidate highlights that candidate', function() {
    app.words = [makeWord({ kkPhonetic: 'əˈpɛl', kkCandidates: ['əˈpɛl', 'ˈæpəl'] })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    typeKK('ˈæpəl');
    var btns = document.getElementById('edit-word-kk-candidates')
      .querySelectorAll('.edit-word-kk-candidate-btn');
    expect(btns[0].classList.contains('kk-candidate-selected')).toBe(false);
    expect(btns[1].classList.contains('kk-candidate-selected')).toBe(true);
  });

  test('saving a manually typed phonetic writes it to column I', function() {
    app.words = [makeWord({ kkPhonetic: '' })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    typeKK(' ˋæpḷ ');
    app.saveEditWord();

    expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('ˋæpḷ');
    expect(app.words[0].kkPhonetic).toBe('ˋæpḷ');
    expect(app.kkPhoneticCache['apple'].p).toBe('ˋæpḷ');
  });

  test('a manually typed phonetic wins over a pending candidate list', function() {
    app.words = [makeWord({ kkPhonetic: 'əˈpɛl', kkCandidates: ['əˈpɛl', 'ˈæpəl'] })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    typeKK('ˋæpḷ');
    app.saveEditWord();

    expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('ˋæpḷ');
    expect(app.words[0].kkPhonetic).toBe('ˋæpḷ');
    expect(app.words[0].kkCandidates).toBeFalsy();
    expect(app._resolveKKDisplayInfo(app.words[0]).needsReview).toBe(false);
  });

  test('a manually typed phonetic is kept when the English word also changed', function() {
    app.words = [makeWord({ kkPhonetic: 'əˈpɛl' })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    document.getElementById('edit-word-english').value = 'banana';
    typeKK('ˈbænənə');
    app.saveEditWord();

    expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('ˈbænənə');
    expect(app.words[0].english).toBe('banana');
    expect(app.words[0].kkPhonetic).toBe('ˈbænənə');
    expect(app.kkPhoneticCache['banana'].p).toBe('ˈbænənə');
  });

  test('clearing the input clears column I on save', function() {
    app.words = [makeWord({ kkPhonetic: 'əˈpɛl' })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    typeKK('');
    app.saveEditWord();

    expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('');
    expect(app.words[0].kkPhonetic).toBe('');
    expect(document.getElementById('edit-word-kk-value').textContent).toContain('尚未設定');
  });

  test('refetch after typing replaces the typed value (refetch wins on the input)', function() {
    app.words = [makeWord({ kkPhonetic: '' })];
    app.currentWords = app.words.slice();
    app.openEditWordModal();

    typeKK('ˋæpḷ');
    app.refetchKKPhoneticForEdit();
    jest.runAllTimers();

    expect(document.getElementById('edit-word-kk-input').value).toBe('əˈpɛl');
    expect(app._kkEditManualInput).toBe(false);
  });
});

// ============================================================
// 多候選待確認（kk-needs-review 特殊顏色）
// v1.23.0：線上查到多個音標時，所有候選存入 I 欄（逗號分隔）、
// 顯示只取第一候選為暫定值並以特殊顏色標示；
// 按 E 編輯可直接從 I 欄候選選擇（免重新查詢），
// 人為選定儲存後 I 欄改為單一確認值、回復正常顏色
// ============================================================
describe('KK phonetic needs-review colour', function() {

  /** mock：查詢回傳兩個候選音標 */
  function multiCandidateApi() {
    google.script.run.queryKKPhonetic = function(word) {
      app._kkApiCalls.push(word);
      var successHandler = this._successHandler;
      setTimeout(function() {
        if (successHandler) {
          successHandler({ success: true, word: word, candidates: ['əˈpɛl', 'ˈæpəl'], source: 'dict' });
        }
      }, 0);
      return this;
    };
  }

  test('multi-candidate query displays first candidate with needs-review colour', function(done) {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    multiCandidateApi();
    var word = makeWord({ kkPhonetic: '' });
    app.words = [word];
    app.currentWords = [word];

    app.updateKKPhoneticDisplay(word);
    app._maybeShowKKPhonetic(); // 顯示時機已到

    setTimeout(function() {
      expect(el.style.display).toBe('flex');
      expect(el.textContent).toBe('/əˈpɛl/'); // 第一候選為暫定值
      expect(el.classList.contains('kk-needs-review')).toBe(true);
      done();
    }, 10);
  });

  test('multi-candidate query stores ALL candidates in column I (comma-joined)', function(done) {
    app.settings.showKKPhonetic = true;
    multiCandidateApi();
    var word = makeWord({ kkPhonetic: '' });
    app.words = [word];
    app.currentWords = [word];

    app.updateKKPhoneticDisplay(word);

    setTimeout(function() {
      // 記憶體：kkPhonetic = 第一候選（顯示值）、kkCandidates = 全部候選
      expect(word.kkPhonetic).toBe('əˈpɛl');
      expect(word.kkCandidates).toEqual(['əˈpɛl', 'ˈæpəl']);
      // I 欄：所有候選一併存入（逗號分隔），編輯時可直接選擇、免重新查詢
      expect(app._kkSheetWrites.length).toBe(1);
      expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('əˈpɛl,ˈæpəl');
      expect(app.kkPhoneticCache['apple'].c).toEqual(['əˈpɛl', 'ˈæpəl']);
      done();
    }, 10);
  });

  test('single-candidate query shows normal colour and still auto-writes column I', function(done) {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    // 預設 mock 即回傳單一候選 ['əˈpɛl']
    var word = makeWord({ kkPhonetic: '' });

    app.updateKKPhoneticDisplay(word);
    app._maybeShowKKPhonetic();

    setTimeout(function() {
      expect(el.classList.contains('kk-needs-review')).toBe(false);
      expect(app._kkSheetWrites.length).toBe(1);
      done();
    }, 10);
  });

  test('cache hit with multiple candidates shows needs-review colour on revisit', function() {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    app.kkPhoneticCache['apple'] = { p: 'əˈpɛl', ts: Date.now(), c: ['əˈpɛl', 'ˈæpəl'] };

    app.updateKKPhoneticDisplay(makeWord({ kkPhonetic: '' }));
    app._maybeShowKKPhonetic();

    expect(el.classList.contains('kk-needs-review')).toBe(true);
  });

  test('confirmed column I value shows normal colour even if cache still has candidates', function() {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    app.kkPhoneticCache['apple'] = { p: 'əˈpɛl', ts: Date.now(), c: ['əˈpɛl', 'ˈæpəl'] };

    // I 欄已有人為選定的音標（與快取第一候選不同）→ 正常顏色
    app.updateKKPhoneticDisplay(makeWord({ kkPhonetic: 'ˈæpəl' }));
    app._maybeShowKKPhonetic();

    expect(el.textContent).toBe('/ˈæpəl/');
    expect(el.classList.contains('kk-needs-review')).toBe(false);
  });

  test('hiding the phonetic clears needs-review state (no leak to next card)', function() {
    app.settings.showKKPhonetic = true;
    app.kkPhoneticCache['apple'] = { p: 'əˈpɛl', ts: Date.now(), c: ['əˈpɛl', 'ˈæpəl'] };
    app.updateKKPhoneticDisplay(makeWord({ kkPhonetic: '' }));
    app._maybeShowKKPhonetic();

    app._hideKKPhonetic();

    var el = document.getElementById('kk-phonetic-display');
    expect(el.classList.contains('kk-needs-review')).toBe(false);
    expect(app._kkPendingNeedsReview).toBe(false);
  });

  test('edit-modal selection + save clears needs-review state everywhere', function() {
    jest.useFakeTimers();
    // 1) 查詢得到多候選：自動寫回 I 欄（joined）、記憶體暫定第一候選
    app.settings.showKKPhonetic = true;
    multiCandidateApi();
    var word = makeWord({ kkPhonetic: '' });
    app.words = [word];
    app.currentWords = [word];
    app.currentIndex = 0;

    app.updateKKPhoneticDisplay(word);
    jest.runAllTimers();
    expect(word.kkCandidates.length).toBe(2);
    expect(app._resolveKKDisplayInfo(word).needsReview).toBe(true);
    expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('əˈpɛl,ˈæpəl');

    // 2) 按 E 編輯：候選選擇清單直接來自 I 欄（kkCandidates），不需重新抓取（零 API 呼叫）
    app.openEditWordModal();
    expect(app._kkApiCalls.length).toBe(1); // 僅步驟 1 的查詢，開啟編輯不再查詢
    var container = document.getElementById('edit-word-kk-candidates');
    expect(container.style.display).toBe('flex');
    var btns = container.querySelectorAll('.edit-word-kk-candidate-btn');
    expect(btns.length).toBe(2);
    // 不預選：未點選而儲存 → 保留多候選（不悄悄確認第一候選）
    expect(btns[0].classList.contains('kk-candidate-selected')).toBe(false);
    expect(app._kkEditSelectedPhonetic).toBeUndefined();

    // 3) 使用者點選第二候選並儲存 → I 欄改為單一確認值、清除待確認狀態
    app.selectKKPhoneticForEdit('ˈæpəl');
    app.saveEditWord();

    expect(app._kkSheetWrites.length).toBe(2);
    expect(app._kkSheetWrites[1].properties.kkPhonetic).toBe('ˈæpəl');
    expect(word.kkPhonetic).toBe('ˈæpəl');
    expect(word.kkCandidates).toBeFalsy();
    expect(app.kkPhoneticCache['apple'].c).toBeUndefined();
    expect(app._resolveKKDisplayInfo(word).needsReview).toBe(false);
    jest.useRealTimers();
  });

  test('saving without touching KK keeps pending candidates in column I (still tentative)', function() {
    // I 欄多候選（後端載入解析：kkPhonetic = 第一候選、kkCandidates = 全部）
    var word = makeWord({ kkPhonetic: 'əˈpɛl', kkCandidates: ['əˈpɛl', 'ˈæpəl'] });
    app.words = [word];
    app.currentWords = [word];
    app._editingWordId = word.id;
    app._editingOriginalEnglish = 'apple';
    app._kkEditSelectedPhonetic = undefined;
    app._kkEditFetchedEnglish = undefined;

    // 僅改中文（不動 KK、不點選候選）
    document.getElementById('edit-word-english').value = 'apple';
    document.getElementById('edit-word-chinese').value = '新的翻譯';
    app.saveEditWord();

    // I 欄寫回保留完整候選清單（joined）；記憶體顯示值仍為第一候選、仍待確認
    expect(app._kkSheetWrites.length).toBe(1);
    expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('əˈpɛl,ˈæpəl');
    expect(word.kkPhonetic).toBe('əˈpɛl');
    expect(word.kkCandidates).toEqual(['əˈpɛl', 'ˈæpəl']);
    expect(app.kkPhoneticCache['apple'].c).toEqual(['əˈpɛl', 'ˈæpəl']);
    expect(app._resolveKKDisplayInfo(word).needsReview).toBe(true);
  });

  test('sheet-loaded multi-candidates (cross-device/reload) show needs-review colour', function() {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    // 模擬後端解析 I 欄 "əˈpɛl,ˈæpəl" 的載入結果（另一裝置查詢寫回後重新載入）
    var word = makeWord({ kkPhonetic: 'əˈpɛl', kkCandidates: ['əˈpɛl', 'ˈæpəl'] });

    app.updateKKPhoneticDisplay(word);
    app._maybeShowKKPhonetic();

    // 顯示第一候選 + 待確認顏色；且不需任何 API 呼叫
    expect(el.textContent).toBe('/əˈpɛl/');
    expect(el.classList.contains('kk-needs-review')).toBe(true);
    expect(app._kkApiCalls.length).toBe(0);
  });

  test('_resolveKKDisplayInfo returns null when nothing resolved', function() {
    expect(app._resolveKKDisplayInfo(makeWord({ kkPhonetic: '' }))).toBe(null);
    expect(app._resolveKKDisplayInfo(null)).toBe(null);
  });
});

// ============================================================
// localStorage 快取
// ============================================================
describe('KK phonetic cache persistence', function() {

  test('set and get cache round-trip', function() {
    app._setCachedKKPhonetic('Apple', 'əˈpɛl');
    expect(app._getCachedKKPhonetic('apple')).toBe('əˈpɛl');
    expect(app._getCachedKKPhonetic('APPLE')).toBe('əˈpɛl'); // 大小寫不分
  });

  test('empty phonetic is not returned as a hit', function() {
    app._setCachedKKPhonetic('apple', '');
    expect(app._getCachedKKPhonetic('apple')).toBe(null);
  });

  test('cache trims to KK_PHONETIC_CACHE_MAX entries', function() {
    var max = APP_CONSTANTS.KK_PHONETIC_CACHE_MAX;
    for (var i = 0; i < max + 10; i++) {
      app._setCachedKKPhonetic('word' + i, 'p' + i);
    }
    var count = 0;
    for (var k in app.kkPhoneticCache) {
      if (app.kkPhoneticCache.hasOwnProperty(k)) count++;
    }
    expect(count).toBe(max);
  });
});

// ============================================================
// 設定整合
// ============================================================
describe('KK phonetic settings integration', function() {

  test('applySettings syncs toggle state', function() {
    app.settings.showKKPhonetic = true;
    app.applySettings();
    expect(document.getElementById('kk-phonetic-setting').checked).toBe(true);

    app.settings.showKKPhonetic = false;
    app.applySettings();
    expect(document.getElementById('kk-phonetic-setting').checked).toBe(false);
  });

  test('saveSettingsAndClose reads toggle state', function() {
    document.getElementById('kk-phonetic-setting').checked = true;
    app.redisplayCurrentWord = jest.fn();
    app.applySettings = jest.fn();
    app.closeSettings = jest.fn();
    app.saveSettings = jest.fn();

    app.saveSettingsAndClose();

    expect(app.settings.showKKPhonetic).toBe(true);
  });
});
