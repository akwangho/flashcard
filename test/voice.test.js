/**
 * Tests for voice/speech methods: isJapaneseText
 */
var setup = require('./setup');

var app;

beforeAll(function() {
  setup.bootstrapApp();
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;
});

describe('isJapaneseText', function() {

  test('detects hiragana', function() {
    expect(app.isJapaneseText('おはよう')).toBe(true);
    expect(app.isJapaneseText('さくら')).toBe(true);
  });

  test('detects katakana', function() {
    expect(app.isJapaneseText('カタカナ')).toBe(true);
    expect(app.isJapaneseText('コンピュータ')).toBe(true);
  });

  test('detects kanji', function() {
    expect(app.isJapaneseText('漢字')).toBe(true);
    expect(app.isJapaneseText('東京')).toBe(true);
  });

  test('detects mixed Japanese text', function() {
    expect(app.isJapaneseText('東京タワー')).toBe(true);
    expect(app.isJapaneseText('お寿司')).toBe(true);
  });

  test('rejects pure English text', function() {
    expect(app.isJapaneseText('hello world')).toBe(false);
    expect(app.isJapaneseText('apple')).toBe(false);
  });

  test('rejects pure numbers', function() {
    expect(app.isJapaneseText('12345')).toBe(false);
  });

  test('returns false for null/undefined/empty', function() {
    expect(app.isJapaneseText(null)).toBe(false);
    expect(app.isJapaneseText(undefined)).toBe(false);
    expect(app.isJapaneseText('')).toBe(false);
  });

  // Note: Chinese characters overlap with Japanese kanji range,
  // so Chinese text will also return true - this is expected behavior
  // since the regex checks for CJK unified ideographs
  test('detects text with CJK characters (Chinese/Japanese ambiguous)', function() {
    expect(app.isJapaneseText('中文')).toBe(true); // CJK chars in range
  });
});
