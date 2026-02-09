/**
 * Tests for pause/resume: pauseTimer, resumeTimer, togglePause, updatePauseButtonState
 * OpenSpec 4.5.1
 */
var setup = require('./setup');

var app;

beforeAll(function() {
  setup.bootstrapApp();
});

beforeEach(function() {
  jest.useFakeTimers();

  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;

  app.currentWords = [
    { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0, sheetName: 'Sheet1', originalRowIndex: 2 }
  ];
  app.currentIndex = 0;
  app.settings.delayTime = 3;
  app.userPaused = false;
  app.isPaused = false;
  app.displayTimer = null;
  app._speechWaitInterval = null;
  app._speechWaitTimeout = null;
});

afterEach(function() {
  jest.useRealTimers();
});

// ============================================================
// pauseTimer (4.5.1)
// ============================================================
describe('pauseTimer', function() {

  test('sets isPaused to true', function() {
    app.pauseTimer();
    expect(app.isPaused).toBe(true);
  });

  test('clears displayTimer', function() {
    app.displayTimer = setTimeout(function() {}, 5000);
    app.pauseTimer();
    expect(app.displayTimer).toBeNull();
  });

  test('clears speech wait timers', function() {
    app._speechWaitInterval = setInterval(function() {}, 100);
    app._speechWaitTimeout = setTimeout(function() {}, 30000);
    app.pauseTimer();
    expect(app._speechWaitInterval).toBeNull();
    expect(app._speechWaitTimeout).toBeNull();
  });
});

// ============================================================
// resumeTimer (4.5.1)
// ============================================================
describe('resumeTimer', function() {

  test('sets isPaused to false when not user paused', function() {
    app.isPaused = true;
    app.userPaused = false;
    app.resumeTimer();
    expect(app.isPaused).toBe(false);
  });

  test('stays paused when user paused', function() {
    app.isPaused = true;
    app.userPaused = true;
    app.resumeTimer();
    expect(app.isPaused).toBe(true);
  });

  test('starts nextWord timer when showing Chinese and not paused', function() {
    app.showingChinese = true;
    app.isPaused = false;
    app.userPaused = false;
    app.resumeTimer();
    expect(app.displayTimer).not.toBeNull();
  });

  test('starts showSecondPart timer when not showing Chinese and not paused', function() {
    app.showingChinese = false;
    app.isTransitioning = false;
    app.isProcessingClick = false;
    app.isPaused = false;
    app.userPaused = false;
    app.resumeTimer();
    expect(app.displayTimer).not.toBeNull();
  });

  test('does not start timer when paused', function() {
    app.isPaused = true;
    app.userPaused = true;
    app.resumeTimer();
    expect(app.displayTimer).toBeNull();
  });
});

// ============================================================
// togglePause (4.5.1)
// ============================================================
describe('togglePause', function() {

  test('pauses when not paused', function() {
    app.userPaused = false;
    var pauseSpy = jest.spyOn(app, 'pauseTimer');
    app.togglePause();
    expect(app.userPaused).toBe(true);
    expect(pauseSpy).toHaveBeenCalled();
  });

  test('resumes when paused', function() {
    app.userPaused = true;
    var resumeSpy = jest.spyOn(app, 'resumeTimer');
    app.togglePause();
    expect(app.userPaused).toBe(false);
    expect(resumeSpy).toHaveBeenCalled();
  });

  test('updates pause button state', function() {
    var spy = jest.spyOn(app, 'updatePauseButtonState');
    app.togglePause();
    expect(spy).toHaveBeenCalled();
  });
});

// ============================================================
// updatePauseButtonState (4.5.1)
// ============================================================
describe('updatePauseButtonState', function() {

  test('shows play icon when paused', function() {
    app.userPaused = true;
    app.updatePauseButtonState();
    var btn = document.getElementById('pause-btn');
    expect(btn.textContent).toBe('▶️');
    expect(btn.style.opacity).toBe('0.6');
  });

  test('shows pause icon when playing', function() {
    app.userPaused = false;
    app.updatePauseButtonState();
    var btn = document.getElementById('pause-btn');
    expect(btn.textContent).toBe('⏸️');
    expect(btn.style.opacity).toBe('1');
  });

  test('shows paused indicator when paused', function() {
    app.userPaused = true;
    app.updatePauseButtonState();
    var indicator = document.getElementById('paused-indicator');
    expect(indicator.style.display).toBe('flex');
  });

  test('hides paused indicator when playing', function() {
    app.userPaused = false;
    app.updatePauseButtonState();
    var indicator = document.getElementById('paused-indicator');
    expect(indicator.style.display).toBe('none');
  });
});
