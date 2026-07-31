/**
 * Tests for voice/speech methods: isJapaneseText, speakEnglishLetters,
 * speakWord, speakChineseWord, toggleVoice, updateVoiceButtonState,
 * updateMutedIndicator, clearSpeechWait, waitForSpeechThenExecute
 * Spec: openspec/specs/voice-tts/spec.md
 */
var app;

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
// speakEnglishLetters (letter spell-out) — openspec/specs/voice-tts/spec.md
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
// speakWord (EN/JA routing) — openspec/specs/voice-tts/spec.md
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
// speakEnglishWord — openspec/specs/voice-tts/spec.md
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

  test('routes must-spell words (level 1 and 0.5) to spaced spell-out', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    app.voiceSettings.spellOutScope = 'all';
    var spacedSpy = jest.spyOn(app, 'speakEnglishLettersSpaced');

    app.currentWords = [{ id: 0, english: 'breakfast', chinese: '早餐', mustSpell: 1 }];
    app.currentIndex = 0;
    app.speakEnglishWord('breakfast');
    expect(spacedSpy).toHaveBeenCalledWith('breakfast', expect.any(Function));

    spacedSpy.mockClear();
    app.currentWords = [{ id: 1, english: 'apple', chinese: '蘋果', mustSpell: 0.5 }];
    app.currentIndex = 0;
    app.speakEnglishWord('apple');
    expect(spacedSpy).toHaveBeenCalledWith('apple', expect.any(Function));
  });

  test('non-must-spell words use per-letter spell-out (not spaced)', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    app.voiceSettings.spellOutScope = 'all';
    var perLetterSpy = jest.spyOn(app, 'speakEnglishLetters');
    var spacedSpy = jest.spyOn(app, 'speakEnglishLettersSpaced');

    app.currentWords = [{ id: 0, english: 'apple', chinese: '蘋果', mustSpell: 0 }];
    app.currentIndex = 0;
    app.speakEnglishWord('apple');
    expect(perLetterSpy).toHaveBeenCalled();
    expect(spacedSpy).not.toHaveBeenCalled();
  });

  test('P-key path speaks whole word only at slow rate (skips letter spell-out)', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    app.voiceSettings.spellOutScope = 'all';
    app.voiceSettings.rate = 1;
    app.currentWords = [{ id: 0, english: 'cold', chinese: '冷', mustSpell: 1 }];
    app.currentIndex = 0;

    var spacedSpy = jest.spyOn(app, 'speakEnglishLettersSpaced');
    var lettersSpy = jest.spyOn(app, 'speakEnglishLetters');
    var slowRate = Math.max(0.1, app.voiceSettings.rate * APP_CONSTANTS.SLOW_SPEECH_RATE_FACTOR);

    // Simulate P-key even press: bump playId, set slow override, speak whole word only
    app._speechPlayId = (app._speechPlayId || 0) + 1;
    app._speechRateOverride = slowRate;
    app.speakEnglishWordOnly('cold');

    expect(spacedSpy).not.toHaveBeenCalled();
    expect(lettersSpy).not.toHaveBeenCalled();
    expect(global.speechSynthesis.speak).toHaveBeenCalled();
    var utterance = global.speechSynthesis.speak.mock.calls[0][0];
    expect(utterance.text).toBe('cold');
    expect(utterance.rate).toBe(slowRate);
    expect(app._speechRateOverride).toBeNull();
  });

  test('stale spaced spell-out callback is ignored after playId bump (P interrupt)', function() {
    jest.useFakeTimers();
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
    app.voiceSettings.spellOutScope = 'all';
    app.currentWords = [{ id: 0, english: 'cold', chinese: '冷', mustSpell: 1 }];
    app.currentIndex = 0;

    app.speakEnglishWord('cold');
    var spacedUtterance = global.speechSynthesis.speak.mock.calls[0][0];
    expect(spacedUtterance.text).toBe('c o l d');

    // P key: invalidate in-flight spell-out then speak whole word
    app._speechPlayId = (app._speechPlayId || 0) + 1;
    global.speechSynthesis.speak.mockClear();
    app.speakEnglishWordOnly('cold');
    expect(global.speechSynthesis.speak.mock.calls[0][0].text).toBe('cold');

    // Stale spaced onend must NOT schedule another full-word speak
    var callsBefore = global.speechSynthesis.speak.mock.calls.length;
    spacedUtterance.onend();
    jest.advanceTimersByTime(APP_CONSTANTS.SPELL_LETTER_GAP_MS);
    expect(global.speechSynthesis.speak.mock.calls.length).toBe(callsBefore);
    jest.useRealTimers();
  });

  test('speakEnglishWordOnly consumes speech rate override', function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.rate = 1;
    app._speechRateOverride = 0.5;
    app.speakEnglishWordOnly('hello');
    var utterance = global.speechSynthesis.speak.mock.calls[0][0];
    expect(utterance.rate).toBe(0.5);
    expect(app._speechRateOverride).toBeNull();
  });
});

// ============================================================
// _shouldSpellOutCurrentWord (spell-out scope) — openspec/specs/voice-tts/spec.md
// ============================================================
describe('_shouldSpellOutCurrentWord', function() {

  function setCurrent(mustSpell) {
    app.currentWords = [{ id: 0, english: 'apple', chinese: '蘋果', mustSpell: mustSpell }];
    app.currentIndex = 0;
  }

  beforeEach(function() {
    app.voiceSettings.enabled = true;
    app.voiceSettings.spellOutLetters = true;
  });

  test('false when spell-out disabled', function() {
    app.voiceSettings.spellOutLetters = false;
    setCurrent(1);
    expect(app._shouldSpellOutCurrentWord()).toBe(false);
  });

  test('false when voice disabled', function() {
    app.voiceSettings.enabled = false;
    setCurrent(1);
    expect(app._shouldSpellOutCurrentWord()).toBe(false);
  });

  test("scope 'all' spells out every word regardless of mustSpell", function() {
    app.voiceSettings.spellOutScope = 'all';
    setCurrent(0);
    expect(app._shouldSpellOutCurrentWord()).toBe(true);
    setCurrent(0.5);
    expect(app._shouldSpellOutCurrentWord()).toBe(true);
    setCurrent(1);
    expect(app._shouldSpellOutCurrentWord()).toBe(true);
  });

  test("scope 'must-spell-all' spells out 0.5 and 1 only", function() {
    app.voiceSettings.spellOutScope = 'must-spell-all';
    setCurrent(0);
    expect(app._shouldSpellOutCurrentWord()).toBe(false);
    setCurrent(0.5);
    expect(app._shouldSpellOutCurrentWord()).toBe(true);
    setCurrent(1);
    expect(app._shouldSpellOutCurrentWord()).toBe(true);
  });

  test("scope 'must-spell-random' spells out 0.5 only", function() {
    app.voiceSettings.spellOutScope = 'must-spell-random';
    setCurrent(0);
    expect(app._shouldSpellOutCurrentWord()).toBe(false);
    setCurrent(0.5);
    expect(app._shouldSpellOutCurrentWord()).toBe(true);
    setCurrent(1);
    expect(app._shouldSpellOutCurrentWord()).toBe(false);
  });

  test("scope 'must-spell-sprint' spells out 1 only", function() {
    app.voiceSettings.spellOutScope = 'must-spell-sprint';
    setCurrent(0);
    expect(app._shouldSpellOutCurrentWord()).toBe(false);
    setCurrent(0.5);
    expect(app._shouldSpellOutCurrentWord()).toBe(false);
    setCurrent(1);
    expect(app._shouldSpellOutCurrentWord()).toBe(true);
  });

  test('missing scope defaults to spelling out (all)', function() {
    app.voiceSettings.spellOutScope = undefined;
    setCurrent(0);
    expect(app._shouldSpellOutCurrentWord()).toBe(true);
  });

  test('handles missing current word without throwing (non-all scope)', function() {
    app.voiceSettings.spellOutScope = 'must-spell-sprint';
    app.currentWords = [];
    app.currentIndex = 0;
    expect(app._shouldSpellOutCurrentWord()).toBe(false);
  });
});

// ============================================================
// speakChineseWord — openspec/specs/voice-tts/spec.md
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
// toggleVoice — openspec/specs/voice-tts/spec.md
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
// updateVoiceButtonState — openspec/specs/voice-tts/spec.md
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
// updateMutedIndicator — openspec/specs/voice-tts/spec.md
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
