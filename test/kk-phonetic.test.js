/**
 * KK 音標功能測試
 * Spec: openspec/specs/kk-phonetic/spec.md
 *
 * 涵蓋：
 *  - 顯示開關（預設關閉；開啟時才顯示/查詢/pre-cache）
 *  - 只針對「單字」（phrase / sentence 不顯示、不查詢、不 pre-cache）
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

  test('defaults to disabled', function() {
    expect(app.settings.showKKPhonetic).toBe(false);
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

  test('eligible only for word type', function() {
    app.settings.showKKPhonetic = true;
    expect(app._isKKPhoneticEligible(makeWord({ english: 'apple' }))).toBe(true);
    expect(app._isKKPhoneticEligible(makeWord({ english: 'hot dog' }))).toBe(false);   // phrase
    expect(app._isKKPhoneticEligible(makeWord({ english: 'I am a boy.' }))).toBe(false); // sentence
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
    expect(el.textContent).toBe('əˈpɛl');
  });

  test('shows cached phonetic without GAS call', function() {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    app.kkPhoneticCache['apple'] = { p: 'ˈkærəktɚ', ts: Date.now() };
    app.updateKKPhoneticDisplay(makeWord({ english: 'APPLE', kkPhonetic: '' }));

    app._maybeShowKKPhonetic();
    expect(el.style.display).toBe('flex');
    expect(el.textContent).toBe('ˈkærəktɚ');
    expect(app._kkApiCalls.length).toBe(0);
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
      expect(el.textContent).toBe('ˋæpḷ');
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
      expect(el.textContent).toBe('əˈpɛl');
      expect(app._kkSheetWrites.length).toBe(1);
      expect(app._kkSheetWrites[0].properties.kkPhonetic).toBe('əˈpɛl');
      expect(app._kkSheetWrites[0].rowIndex).toBe(1);
      done();
    }, 10);
  });

  test('hides display for phrase/sentence even when setting on', function() {
    var el = document.getElementById('kk-phonetic-display');
    app.settings.showKKPhonetic = true;
    app.updateKKPhoneticDisplay(makeWord({ english: 'hot dog' }));
    expect(el.style.display).toBe('none');
    expect(app._kkApiCalls.length).toBe(0);
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

  test('precache upcoming words only (word type)', function() {
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

    // cat 已有音標（I 欄）→ 不查；hot dog / I am ok. 非單字 → 不查；dog、sun → 查
    expect(app._kkApiCalls.sort()).toEqual(['dog', 'sun']);
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

  test('returns null for non-word content', function(done) {
    app.fetchKKPhonetic(makeWord({ english: 'hot dog' }), {}, function(r) {
      expect(r).toBe(null);
      expect(app._kkApiCalls.length).toBe(0);
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
