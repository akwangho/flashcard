/**
 * Tests for image preloading: preloadImage / _finishPreloadImage / preloadUpcomingImages
 * Spec: openspec/specs/ui-shell/spec.md — Scenario: Image preloading
 *
 * v1.21.2 修正重點（pre-cache 圖片失效的根因）：
 * 1. 所有「載入中」的 Image 物件都必須保留在 _preloadingImages，
 *    否則未載完的 Image 被 GC 回收時，WebKit 會直接取消下載，預載形同失效。
 *    （舊版只保留最後一張 currentPreloadingImage，10 張預載有 9 張會被取消）
 * 2. 同一 URL 載入中不重複建立 Image（in-flight dedupe），避免重複下載。
 * 3. 載入完成／失敗時釋放參考並統一觸發等待中的 callbacks。
 *
 * jsdom 的 Image 不會真的載入，因此以 MockImage 攔截 new Image()，
 * 手動觸發 onload / onerror 驗證收尾流程。
 */
var app;
var RealImage;
var MockImageInstances;

function MockImage() {
  this.onload = null;
  this.onerror = null;
  this._src = '';
  MockImageInstances.push(this);
}
Object.defineProperty(MockImage.prototype, 'src', {
  get: function() { return this._src; },
  set: function(v) { this._src = v; },
  configurable: true
});

function makeWords(n) {
  var words = [];
  for (var i = 0; i < n; i++) {
    words.push({
      id: i,
      english: 'word' + i,
      chinese: '翻譯' + i,
      difficultyLevel: 0,
      image: 'http://img/w' + i + '.jpg'
    });
  }
  return words;
}

beforeEach(function() {
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;

  RealImage = global.Image;
  MockImageInstances = [];
  global.Image = MockImage;
});

afterEach(function() {
  global.Image = RealImage;
});

describe('preloadImage — 參考保留（GC 防取消）', function() {

  test('retains a reference for every in-flight image', function() {
    app.words = makeWords(5);
    app.currentWords = app.words.slice();
    app.currentIndex = 0;

    app.preloadUpcomingImages();

    // 5 張圖都在載入中 → 5 筆都必須保留參考，缺一張就可能被 GC 取消下載
    expect(MockImageInstances.length).toBe(5);
    var keys = Object.keys(app._preloadingImages);
    expect(keys.length).toBe(5);
    for (var i = 0; i < keys.length; i++) {
      expect(app._preloadingImages[keys[i]].img).toBeDefined();
    }
  });

  test('releases the reference after load completes (browser cache takes over)', function() {
    app.preloadImage('http://img/a.jpg');

    var img = app._preloadingImages['http://img/a.jpg'].img;
    img.onload();

    expect(app.preloadedImages['http://img/a.jpg']).toBe(true);
    expect(app._preloadingImages['http://img/a.jpg']).toBeUndefined();
  });

  test('releases the reference after load fails (retry allowed later)', function() {
    app.preloadImage('http://img/a.jpg');

    var img = app._preloadingImages['http://img/a.jpg'].img;
    img.onerror();

    expect(app.preloadedImages['http://img/a.jpg']).toBeFalsy();
    expect(app._preloadingImages['http://img/a.jpg']).toBeUndefined();

    // 失敗後不標記成功 → 之後再輪到可重試
    app.preloadImage('http://img/a.jpg');
    expect(MockImageInstances.length).toBe(2);
  });
});

describe('preloadImage — in-flight dedupe', function() {

  test('does not create a second Image while the same URL is loading', function() {
    app.preloadImage('http://img/a.jpg');
    app.preloadImage('http://img/a.jpg');

    expect(MockImageInstances.length).toBe(1);
  });

  test('queued callbacks all fire (true) when the load completes', function() {
    var cb1 = jest.fn();
    var cb2 = jest.fn();
    app.preloadImage('http://img/a.jpg', cb1);
    app.preloadImage('http://img/a.jpg', cb2);

    expect(cb1).not.toHaveBeenCalled();

    var img = app._preloadingImages['http://img/a.jpg'].img;
    img.onload();

    expect(cb1).toHaveBeenCalledWith(true);
    expect(cb2).toHaveBeenCalledWith(true);
  });

  test('queued callbacks all fire (false) when the load fails', function() {
    var cb1 = jest.fn();
    var cb2 = jest.fn();
    app.preloadImage('http://img/a.jpg', cb1);
    app.preloadImage('http://img/a.jpg', cb2);

    var img = app._preloadingImages['http://img/a.jpg'].img;
    img.onerror();

    expect(cb1).toHaveBeenCalledWith(false);
    expect(cb2).toHaveBeenCalledWith(false);
  });

  test('already-loaded URL answers callback synchronously without new Image', function() {
    app.preloadedImages['http://img/a.jpg'] = true;
    var cb = jest.fn();
    app.preloadImage('http://img/a.jpg', cb);

    expect(cb).toHaveBeenCalledWith(true);
    expect(MockImageInstances.length).toBe(0);
  });

  test('repeated preloadUpcomingImages while in flight does not duplicate requests', function() {
    app.words = makeWords(4);
    app.currentWords = app.words.slice();
    app.currentIndex = 0;

    // 模擬連續切換單字：每張卡顯示後都會再掃一次預載窗口，
    // 載入中的 URL 不應重複建立 Image（否則浪費頻寬並增加被 GC 取消的風險）
    app.preloadUpcomingImages();
    app.preloadUpcomingImages();
    app.preloadUpcomingImages();

    expect(MockImageInstances.length).toBe(4);
  });
});

describe('preloadUpcomingImages — 窗口計算', function() {

  test('defaults to APP_CONSTANTS.IMAGE_PRELOAD_COUNT', function() {
    app.words = makeWords(12);
    app.currentWords = app.words.slice();
    app.currentIndex = 0;

    app.preloadUpcomingImages();

    expect(MockImageInstances.length).toBe(APP_CONSTANTS.IMAGE_PRELOAD_COUNT);
  });

  test('wraps around the word list', function() {
    app.words = makeWords(5);
    app.currentWords = app.words.slice();
    app.currentIndex = 3;

    app.preloadUpcomingImages(4);

    var urls = MockImageInstances.map(function(img) { return img.src; });
    // 窗口：目前(3) + 接下來 3 張 → 4,0,1,2
    expect(urls).toContain('http://img/w3.jpg');
    expect(urls).toContain('http://img/w4.jpg');
    expect(urls).toContain('http://img/w0.jpg');
    expect(urls).toContain('http://img/w1.jpg');
  });

  test('skips words without image URL', function() {
    app.words = makeWords(3);
    app.words[1].image = '';
    app.currentWords = app.words.slice();
    app.currentIndex = 0;

    app.preloadUpcomingImages(3);

    expect(MockImageInstances.length).toBe(2);
  });

  test('does nothing with empty currentWords', function() {
    app.currentWords = [];
    app.preloadUpcomingImages(5);
    expect(MockImageInstances.length).toBe(0);
  });
});

describe('快取生命週期', function() {

  test('constructor initializes both success cache and in-flight map', function() {
    var origInit = FlashcardApp.prototype.init;
    FlashcardApp.prototype.init = function() {};
    var fresh = new FlashcardApp();
    FlashcardApp.prototype.init = origInit;

    expect(fresh.preloadedImages).toEqual({});
    expect(fresh._preloadingImages).toEqual({});
  });

  test('loadWords resets both caches (new word set invalidates old URLs)', function() {
    app.preloadedImages['http://img/old.jpg'] = true;
    app._preloadingImages['http://img/old.jpg'] = { img: { src: 'x' }, callbacks: [] };

    // loadWords 開頭同步重置快取（google.script.run 為 no-op mock，不影響斷言）
    app.loadWords(false, jest.fn());

    expect(app.preloadedImages).toEqual({});
    expect(app._preloadingImages).toEqual({});
  });
});
