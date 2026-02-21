var setup = require('./setup');

describe('applySettings', function() {
  var app;

  beforeAll(function() {
    setup.bootstrapApp();
  });

  beforeEach(function() {
    app = new FlashcardApp();
    app.settings = {
      delayTime: 4.5,
      fontSize: 96,
      displayMode: 'english-first',
      fontFamily: 'system-default',
      delaySpeechInNormalMode: false,
      mustSpellChineseFirst: true,
      showTimerProgressBar: true,
      timerProgressBarOffset: 0,
      smartTimerEnabled: false
    };
  });

  test('applies font size to english-word element', function() {
    app.settings.fontSize = 72;
    app.applySettings();
    var el = document.getElementById('english-word');
    expect(el.style.fontSize).toBe('72px');
  });

  test('applies font size to chinese-word element', function() {
    app.settings.fontSize = 80;
    app.applySettings();
    var el = document.getElementById('chinese-word');
    expect(el.style.fontSize).toBe('80px');
  });

  test('sets delay slider value', function() {
    app.settings.delayTime = 6;
    app.applySettings();
    var slider = document.getElementById('delay-setting');
    expect(slider.value).toBe('6');
  });

  test('sets font size slider value', function() {
    app.settings.fontSize = 48;
    app.applySettings();
    var slider = document.getElementById('font-size-setting');
    expect(slider.value).toBe('48');
  });

  test('checks correct display mode radio button', function() {
    app.settings.displayMode = 'chinese-first';
    app.applySettings();
    var radios = document.querySelectorAll('input[name="display-mode"]');
    var checked = null;
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) checked = radios[i].value;
    }
    expect(checked).toBe('chinese-first');
  });

  test('shows timer progress bar when enabled', function() {
    app.settings.showTimerProgressBar = true;
    app.applySettings();
    var bar = document.getElementById('timer-progress-bar');
    expect(bar.className.indexOf('timer-bar-hidden')).toBe(-1);
  });

  test('hides timer progress bar when disabled', function() {
    app.settings.showTimerProgressBar = false;
    app.applySettings();
    var bar = document.getElementById('timer-progress-bar');
    expect(bar.className.indexOf('timer-bar-hidden')).not.toBe(-1);
  });

  test('applies timer progress bar offset', function() {
    app.settings.showTimerProgressBar = true;
    app.settings.timerProgressBarOffset = 15;
    app.applySettings();
    var bar = document.getElementById('timer-progress-bar');
    expect(bar.style.top).toBe('15px');
  });

  test('calls applyFontFamily', function() {
    var spy = jest.spyOn(app, 'applyFontFamily');
    app.applySettings();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('calls updateFontPreview', function() {
    var spy = jest.spyOn(app, 'updateFontPreview');
    app.applySettings();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('calls applyImageFitMode', function() {
    var spy = jest.spyOn(app, 'applyImageFitMode');
    app.applySettings();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('sets smart timer toggle state', function() {
    app.settings.smartTimerEnabled = true;
    app.applySettings();
    var toggle = document.getElementById('smart-timer-setting');
    expect(toggle.checked).toBe(true);
  });
});

describe('applyFontFamily', function() {
  var app;

  beforeAll(function() {
    setup.bootstrapApp();
  });

  beforeEach(function() {
    app = new FlashcardApp();
  });

  test('applies system-default font', function() {
    app.settings.fontFamily = 'system-default';
    app.applyFontFamily();
    var el = document.getElementById('english-word');
    expect(el.style.fontFamily).toContain('Microsoft JhengHei');
  });

  test('applies arial font', function() {
    app.settings.fontFamily = 'arial';
    app.applyFontFamily();
    var el = document.getElementById('english-word');
    expect(el.style.fontFamily).toContain('Arial');
  });

  test('falls back to system-default for unknown font', function() {
    app.settings.fontFamily = 'nonexistent-font';
    app.applyFontFamily();
    var el = document.getElementById('english-word');
    expect(el.style.fontFamily).toContain('Microsoft JhengHei');
  });
});

describe('saveSettingsAndClose', function() {
  var app;

  beforeAll(function() {
    setup.bootstrapApp();
  });

  beforeEach(function() {
    app = new FlashcardApp();
    app.settings.displayMode = 'english-first';
    app.settings.fontFamily = 'system-default';
    app.redisplayCurrentWord = jest.fn();
  });

  test('reads delay from slider', function() {
    var slider = document.getElementById('delay-setting');
    slider.value = '7';
    app.saveSettingsAndClose();
    expect(app.settings.delayTime).toBe(7);
  });

  test('reads font size from slider', function() {
    var slider = document.getElementById('font-size-setting');
    slider.value = '64';
    app.saveSettingsAndClose();
    expect(app.settings.fontSize).toBe(64);
  });

  test('persists settings to localStorage', function() {
    app.saveSettingsAndClose();
    var stored = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.SETTINGS);
    expect(stored).not.toBeNull();
    var parsed = JSON.parse(stored);
    expect(parsed.fontSize).toBeDefined();
  });

  test('redisplays word when displayMode changes', function() {
    app.settings.displayMode = 'english-first';
    var radio = document.querySelector('input[name="display-mode"][value="chinese-first"]');
    if (radio) radio.checked = true;
    app.saveSettingsAndClose();
    expect(app.redisplayCurrentWord).toHaveBeenCalled();
  });
});
