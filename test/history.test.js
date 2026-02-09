/**
 * Tests for sheet history management:
 * loadSheetHistory, saveSheetHistory, addToSheetHistory, removeFromSheetHistory,
 * isDefaultSheet
 * OpenSpec 4.3.2, 4.3.3
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
  localStorage.clear();
});

// ============================================================
// isDefaultSheet (4.3.2)
// ============================================================
describe('isDefaultSheet', function() {

  test('returns true for known default sheet ID', function() {
    expect(app.isDefaultSheet('1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM')).toBe(true);
  });

  test('returns true for second default sheet ID', function() {
    expect(app.isDefaultSheet('1hX2Ux2__5F-jdhfegmzMBZ7bg3faOt06ARb7ezC8Yzg')).toBe(true);
  });

  test('returns false for non-default sheet ID', function() {
    expect(app.isDefaultSheet('random-sheet-id')).toBe(false);
  });
});

// ============================================================
// loadSheetHistory / saveSheetHistory (4.3.3)
// ============================================================
describe('loadSheetHistory and saveSheetHistory', function() {

  test('returns empty array when no data exists', function() {
    var history = app.loadSheetHistory();
    expect(history).toEqual([]);
  });

  test('round-trips history through localStorage', function() {
    var data = [
      { id: 'abc123', name: 'Test Sheet', isDefault: false, lastUsed: '2026-01-01T00:00:00.000Z' }
    ];
    app.saveSheetHistory(data);
    var loaded = app.loadSheetHistory();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('abc123');
    expect(loaded[0].name).toBe('Test Sheet');
  });

  test('filters out default sheets from history', function() {
    // Manually save history with a default sheet mixed in
    var data = [
      { id: '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM', name: 'Default', isDefault: false },
      { id: 'custom123', name: 'Custom', isDefault: false }
    ];
    localStorage.setItem('flashcard-sheet-history', JSON.stringify(data));
    var loaded = app.loadSheetHistory();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('custom123');
  });

  test('handles corrupted localStorage data', function() {
    localStorage.setItem('flashcard-sheet-history', 'not-json');
    var loaded = app.loadSheetHistory();
    expect(loaded).toEqual([]);
  });
});

// ============================================================
// addToSheetHistory (4.3.3)
// ============================================================
describe('addToSheetHistory', function() {

  test('adds new entry to history', function() {
    app.addToSheetHistory('custom123', 'My Custom Sheet');
    var history = app.loadSheetHistory();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe('custom123');
    expect(history[0].name).toBe('My Custom Sheet');
  });

  test('does not add default sheet to history', function() {
    app.addToSheetHistory('1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM', 'WordGo');
    var history = app.loadSheetHistory();
    expect(history.length).toBe(0);
  });

  test('moves existing entry to front when re-added', function() {
    app.addToSheetHistory('sheet1', 'Sheet 1');
    app.addToSheetHistory('sheet2', 'Sheet 2');
    app.addToSheetHistory('sheet1', 'Sheet 1 Updated');
    var history = app.loadSheetHistory();
    expect(history.length).toBe(2);
    expect(history[0].id).toBe('sheet1');
    expect(history[0].name).toBe('Sheet 1 Updated');
  });

  test('limits history to 10 entries', function() {
    for (var i = 0; i < 15; i++) {
      app.addToSheetHistory('sheet' + i, 'Sheet ' + i);
    }
    var history = app.loadSheetHistory();
    expect(history.length).toBe(10);
  });

  test('newest entry is at the front', function() {
    app.addToSheetHistory('old', 'Old Sheet');
    app.addToSheetHistory('new', 'New Sheet');
    var history = app.loadSheetHistory();
    expect(history[0].id).toBe('new');
    expect(history[1].id).toBe('old');
  });

  test('sets lastUsed timestamp', function() {
    app.addToSheetHistory('test', 'Test');
    var history = app.loadSheetHistory();
    expect(history[0].lastUsed).toBeDefined();
    // Should be a valid ISO date string
    var date = new Date(history[0].lastUsed);
    expect(date.toString()).not.toBe('Invalid Date');
  });
});

// ============================================================
// removeFromSheetHistory (4.3.3)
// ============================================================
describe('removeFromSheetHistory', function() {

  test('removes entry by ID', function() {
    app.addToSheetHistory('sheet1', 'Sheet 1');
    app.addToSheetHistory('sheet2', 'Sheet 2');
    app.removeFromSheetHistory('sheet1');
    var history = app.loadSheetHistory();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe('sheet2');
  });

  test('handles removing non-existent ID gracefully', function() {
    app.addToSheetHistory('sheet1', 'Sheet 1');
    expect(function() { app.removeFromSheetHistory('non-existent'); }).not.toThrow();
    var history = app.loadSheetHistory();
    expect(history.length).toBe(1);
  });

  test('handles empty history gracefully', function() {
    expect(function() { app.removeFromSheetHistory('anything'); }).not.toThrow();
  });
});
