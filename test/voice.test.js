/**
 * Tests for voice/speech methods: isJapaneseText, speakEnglishLetters,
 * speakWord, speakChineseWord, toggleVoice, updateVoiceButtonState,
 * updateMutedIndicator, clearSpeechWait, waitForSpeechThenExecute
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

  // Reset speech mocks
  global.speechSynthesis.speaking = false;
  global.speechSynthesis.speak = jest.fn();
  global.speechSynthesis.cancel = jest.fn();
  global.speechSynthesis.getVoices = jest.fn(function() { return []; });
  app.speechSynthesis = global.speechSynthesis;
});

afterEach(function() {
  // Clean up timers
  if (app._speechWaitInterval) clearInterval(app._speechWaitInterval);
  if (app._speechWaitTimeout) clearTimeout(app._speechWaitTimeout);
  jest.restoreAllMocks();
});

// ============================================================
// isJapaneseText
// ============================================================
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

// ============================================================
// speakEnglishLetters (4.4.4 字母拼讀功能)
// ============================================================
describe('speakEnglishLetters', function() {

  test('calls callback immediately when voice disabled', function() {
    app.voiceSettings.enabled = false;
    app.voiceSettings.spellOutLetters = true;
    var cb = jest.fn();
    app.speakEnglishLetters('hello', cb);
    expect(cb).toHaveBeenCalled();
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  test('calls callback immediately when spellOutLetters disabled', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = false;
    var cb = jest.fn();
    app.speakEnglishLetters('hello', cb);
    expect(cb).toHaveBeenCalled();
  });

  test('calls callback for empty text', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    var cb = jest.fn();
    app.speakEnglishLetters('', cb);
    expect(cb).toHaveBeenCalled();
  });

  test('calls callback for null text', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    var cb = jest.fn();
    app.speakEnglishLetters(null, cb);
    expect(cb).toHaveBeenCalled();
  });

  test('speaks each letter for enabled spell-out', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    app.speakEnglishLetters('hi', function() {});
    // Should speak 'h' first
    expect(global.speechSynthesis.speak).toHaveBeenCalled();
    var firstUtterance = global.speechSynthesis.speak.mock.calls[0][0];
    expect(firstUtterance.text).toBe('h');
  });

  test('skips non-letter characters (numbers, spaces, hyphens)', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    var cb = jest.fn();
    app.speakEnglishLetters('123', cb);
    // No letters to speak, callback should be called
    expect(cb).toHaveBeenCalled();
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  test('extracts only alphabetic characters', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    app.speakEnglishLetters('a-b', function() {});
    // Should speak 'a' (first letter)
    var firstUtterance = global.speechSynthesis.speak.mock.calls[0][0];
    expect(firstUtterance.text).toBe('a');
  });
});

// ============================================================
// speakWord (4.4.1/4.4.2 智能語音路由)
// ============================================================
describe('speakWord', function() {

  test('does nothing for empty text', function() {
    app.speakWord('');
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  test('does nothing for null text', function() {
    app.speakWord(null);
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  test('routes Japanese text to speakJapaneseWord', function() {
    var spy = jest.spyOn(app, 'speakJapaneseWord');
    app.voiceSettings.enabled = true;
    app.speakWord('おはよう');
    expect(spy).toHaveBeenCalledWith('おはよう');
  });

  test('routes English text to speakEnglishWord', function() {
    var spy = jest.spyOn(app, 'speakEnglishWord');
    app.voiceSettings.enabled = true;
    app.speakWord('hello');
    expect(spy).toHaveBeenCalledWith('hello');
  });
});

// ============================================================
// speakEnglishWord (4.4.1 + 4.4.4)
// ============================================================
describe('speakEnglishWord', function() {

  test('does nothing when voice disabled', function() {
    app.voiceSettings.enabled = false;
    app.speakEnglishWord('hello');
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  test('calls speakEnglishLetters first when spellOutLetters enabled', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    var spy = jest.spyOn(app, 'speakEnglishLetters');
    app.speakEnglishWord('hi');
    expect(spy).toHaveBeenCalled();
  });

  test('calls speakEnglishWordOnly directly when spellOutLetters disabled', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = false;
    var spy = jest.spyOn(app, 'speakEnglishWordOnly');
    app.speakEnglishWord('hello');
    expect(spy).toHaveBeenCalledWith('hello');
  });
});

// ============================================================
// speakChineseWord (4.4.3 中文語音)
// ============================================================
describe('speakChineseWord', function() {

  test('does nothing when chineseEnabled is false', function() {
    app.voiceSettings.chineseEnabled = false;
    app.speakChineseWord('蘋果');
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  test('does nothing for empty text', function() {
    app.voiceSettings.chineseEnabled = true;
    app.speakChineseWord('');
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  test('speaks directly when no other speech is playing', function() {
    app.voiceSettings.chineseEnabled = true;
    global.speechSynthesis.speaking = false;
    app.speakChineseWord('蘋果');
    expect(global.speechSynthesis.speak).toHaveBeenCalled();
  });

  test('waits when other speech is still playing', function() {
    jest.useFakeTimers();
    app.voiceSettings.chineseEnabled = true;
    global.speechSynthesis.speaking = true;
    app.speakChineseWord('蘋果');
    // Should not speak immediately
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled();
    // Should have set up polling interval
    expect(app.chineseWaitInterval).not.toBeNull();
    jest.useRealTimers();
  });

  test('cleans up previous wait interval before starting new one', function() {
    jest.useFakeTimers();
    app.voiceSettings.chineseEnabled = true;
    global.speechSynthesis.speaking = true;
    app.speakChineseWord('蘋果');
    var firstInterval = app.chineseWaitInterval;
    expect(firstInterval).not.toBeNull();

    // Call again
    app.speakChineseWord('香蕉');
    // Old interval should be replaced
    expect(app.chineseWaitInterval).not.toBe(firstInterval);
    jest.useRealTimers();
  });
});

// ============================================================
// speakChineseWordNow
// ============================================================
describe('speakChineseWordNow', function() {

  test('does nothing for empty text', function() {
    app.speakChineseWordNow('');
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  test('speaks Chinese with rate 1', function() {
    app.voiceSettings.chineseLang = 'zh-TW';
    app.speakChineseWordNow('你好');
    expect(global.speechSynthesis.speak).toHaveBeenCalled();
    var utterance = global.speechSynthesis.speak.mock.calls[0][0];
    expect(utterance.rate).toBe(1);
  });
});

// ============================================================
// toggleVoice (4.4.6)
// ============================================================
describe('toggleVoice', function() {

  test('toggles enabled from true to false', function() {
    app.voiceSettings.enabled = true;
    app.toggleVoice();
    expect(app.voiceSettings.enabled).toBe(false);
  });

  test('toggles enabled from false to true', function() {
    app.voiceSettings.enabled = false;
    app.toggleVoice();
    expect(app.voiceSettings.enabled).toBe(true);
  });

  test('cancels speech when disabling', function() {
    app.voiceSettings.enabled = true;
    app.toggleVoice();
    expect(global.speechSynthesis.cancel).toHaveBeenCalled();
  });

  test('does not cancel speech when enabling', function() {
    app.voiceSettings.enabled = false;
    app.toggleVoice();
    expect(global.speechSynthesis.cancel).not.toHaveBeenCalled();
  });

  test('clears speech wait when disabling', function() {
    app.voiceSettings.enabled = true;
    app._speechWaitInterval = 999;
    var spy = jest.spyOn(app, 'clearSpeechWait');
    app.toggleVoice();
    expect(spy).toHaveBeenCalled();
  });

  test('clears chinese wait interval when disabling', function() {
    jest.useFakeTimers();
    app.voiceSettings.enabled = true;
    app.chineseWaitInterval = setInterval(function() {}, 100);
    app.toggleVoice();
    expect(app.chineseWaitInterval).toBeNull();
    jest.useRealTimers();
  });
});

// ============================================================
// updateVoiceButtonState (4.4.6)
// ============================================================
describe('updateVoiceButtonState', function() {

  test('shows speaker icon when enabled', function() {
    app.voiceSettings.enabled = true;
    app.updateVoiceButtonState();
    var btn = document.getElementById('voice-toggle-btn');
    expect(btn.textContent).toBe('🔊');
    expect(btn.style.opacity).toBe('1');
  });

  test('shows muted icon when disabled', function() {
    app.voiceSettings.enabled = false;
    app.updateVoiceButtonState();
    var btn = document.getElementById('voice-toggle-btn');
    expect(btn.textContent).toBe('🔇');
    expect(btn.style.opacity).toBe('0.6');
  });
});

// ============================================================
// updateMutedIndicator (4.4.6)
// ============================================================
describe('updateMutedIndicator', function() {

  test('shows muted indicator when voice disabled', function() {
    app.voiceSettings.enabled = false;
    app.updateMutedIndicator();
    var indicator = document.getElementById('muted-indicator');
    expect(indicator.style.display).toBe('flex');
  });

  test('hides muted indicator when voice enabled', function() {
    app.voiceSettings.enabled = true;
    app.updateMutedIndicator();
    var indicator = document.getElementById('muted-indicator');
    expect(indicator.style.display).toBe('none');
  });
});

// ============================================================
// clearSpeechWait (NEW - 語音等待清理)
// ============================================================
describe('clearSpeechWait', function() {

  test('clears _speechWaitInterval', function() {
    jest.useFakeTimers();
    app._speechWaitInterval = setInterval(function() {}, 100);
    app.clearSpeechWait();
    expect(app._speechWaitInterval).toBeNull();
    jest.useRealTimers();
  });

  test('clears _speechWaitTimeout', function() {
    jest.useFakeTimers();
    app._speechWaitTimeout = setTimeout(function() {}, 30000);
    app.clearSpeechWait();
    expect(app._speechWaitTimeout).toBeNull();
    jest.useRealTimers();
  });

  test('handles null values gracefully', function() {
    app._speechWaitInterval = null;
    app._speechWaitTimeout = null;
    expect(function() { app.clearSpeechWait(); }).not.toThrow();
  });

  test('does not reset _speechSequenceActive flag (only navigation resets it)', function() {
    app._speechSequenceActive = true;
    app.clearSpeechWait();
    expect(app._speechSequenceActive).toBe(true);
  });
});

// ============================================================
// _speechSequenceActive flag (字母拼讀+單字發音序列)
// ============================================================
describe('_speechSequenceActive flag', function() {

  test('speakEnglishWord sets flag when spellOutLetters enabled', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    app._speechSequenceActive = false;
    app.speakEnglishWord('hi');
    expect(app._speechSequenceActive).toBe(true);
  });

  test('speakEnglishWord does not set flag when spellOutLetters disabled', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = false;
    app._speechSequenceActive = false;
    app.speakEnglishWord('hello');
    expect(app._speechSequenceActive).toBe(false);
  });

  test('waitForSpeechThenExecute waits when _speechSequenceActive is true', function() {
    jest.useFakeTimers();
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    global.speechSynthesis.speaking = false;
    app.chineseWaitInterval = null;
    app._speechSequenceActive = true; // sequence still in progress
    var cb = jest.fn();
    app.waitForSpeechThenExecute(cb);
    expect(cb).not.toHaveBeenCalled();
    expect(app._speechWaitInterval).not.toBeNull();
    jest.useRealTimers();
  });

  test('waitForSpeechThenExecute executes after sequence completes', function() {
    jest.useFakeTimers();
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    app.isPaused = false;
    global.speechSynthesis.speaking = false;
    app.chineseWaitInterval = null;
    app._speechSequenceActive = true;
    var cb = jest.fn();
    app.waitForSpeechThenExecute(cb);
    expect(cb).not.toHaveBeenCalled();

    // Simulate sequence completing
    app._speechSequenceActive = false;
    jest.advanceTimersByTime(200);
    jest.advanceTimersByTime(400);
    expect(cb).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

// ============================================================
// waitForSpeechThenExecute (語音等待機制)
// ============================================================
describe('waitForSpeechThenExecute', function() {

  test('executes callback immediately when no speech features enabled', function() {
    app.voiceSettings.enabled = false;
    app.voiceSettings.spellOutLetters = false;
    app.voiceSettings.chineseEnabled = false;
    var cb = jest.fn();
    app.waitForSpeechThenExecute(cb);
    expect(cb).toHaveBeenCalled();
  });

  test('executes callback immediately when spellOut enabled but not speaking', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    global.speechSynthesis.speaking = false;
    app.chineseWaitInterval = null;
    var cb = jest.fn();
    app.waitForSpeechThenExecute(cb);
    expect(cb).toHaveBeenCalled();
  });

  test('executes callback immediately when chinese enabled but not speaking', function() {
    app.voiceSettings.enabled = false;
    app.voiceSettings.spellOutLetters = false;
    app.voiceSettings.chineseEnabled = true;
    global.speechSynthesis.speaking = false;
    app.chineseWaitInterval = null;
    var cb = jest.fn();
    app.waitForSpeechThenExecute(cb);
    expect(cb).toHaveBeenCalled();
  });

  test('waits when speaking and spellOut enabled', function() {
    jest.useFakeTimers();
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    global.speechSynthesis.speaking = true;
    var cb = jest.fn();
    app.waitForSpeechThenExecute(cb);
    // Should NOT execute immediately
    expect(cb).not.toHaveBeenCalled();
    // Should set up interval
    expect(app._speechWaitInterval).not.toBeNull();
    expect(app._speechWaitTimeout).not.toBeNull();
    jest.useRealTimers();
  });

  test('waits when chineseWaitInterval is active', function() {
    jest.useFakeTimers();
    app.voiceSettings.chineseEnabled = true;
    global.speechSynthesis.speaking = false;
    app.chineseWaitInterval = setInterval(function() {}, 100); // simulate waiting
    var cb = jest.fn();
    app.waitForSpeechThenExecute(cb);
    expect(cb).not.toHaveBeenCalled();
    expect(app._speechWaitInterval).not.toBeNull();
    jest.useRealTimers();
  });

  test('executes callback after speech finishes', function() {
    jest.useFakeTimers();
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    app.isPaused = false;
    global.speechSynthesis.speaking = true;
    var cb = jest.fn();
    app.waitForSpeechThenExecute(cb);
    expect(cb).not.toHaveBeenCalled();

    // Simulate speech finishing
    global.speechSynthesis.speaking = false;
    jest.advanceTimersByTime(200); // Trigger the polling interval
    jest.advanceTimersByTime(400); // Trigger the 300ms delay after polling detects completion
    expect(cb).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('does not execute callback if paused while waiting', function() {
    jest.useFakeTimers();
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    app.isPaused = false;
    global.speechSynthesis.speaking = true;
    var cb = jest.fn();
    app.waitForSpeechThenExecute(cb);

    // Pause the app
    app.isPaused = true;
    // Simulate speech finishing
    global.speechSynthesis.speaking = false;
    jest.advanceTimersByTime(600);
    expect(cb).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('safety timeout fires after 60 seconds', function() {
    jest.useFakeTimers();
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    app.isPaused = false;
    global.speechSynthesis.speaking = true; // stays speaking forever
    var cb = jest.fn();
    app.waitForSpeechThenExecute(cb);

    // Should NOT fire at 30 seconds
    jest.advanceTimersByTime(30000);
    expect(cb).not.toHaveBeenCalled();

    // Should fire at 60 seconds
    jest.advanceTimersByTime(30000);
    expect(cb).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('clears previous wait before starting new one', function() {
    jest.useFakeTimers();
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    global.speechSynthesis.speaking = true;
    var spy = jest.spyOn(app, 'clearSpeechWait');
    app.waitForSpeechThenExecute(function() {});
    expect(spy).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
