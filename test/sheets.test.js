/**
 * Tests for Google Sheet methods: extractSheetId, validateAndGetSheetInput,
 * toggleSheetSelection, renderSheetsList, loadSheetsList
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
});

// ============================================================
// extractSheetId
// ============================================================
describe('extractSheetId', function() {

  test('extracts ID from full Google Sheets URL', function() {
    var url = 'https://docs.google.com/spreadsheets/d/1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM/edit';
    expect(app.extractSheetId(url)).toBe('1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM');
  });

  test('extracts ID from URL with fragment', function() {
    var url = 'https://docs.google.com/spreadsheets/d/1ABC123DEF456/edit#gid=0';
    expect(app.extractSheetId(url)).toBe('1ABC123DEF456');
  });

  test('extracts ID from URL with query params', function() {
    var url = 'https://docs.google.com/spreadsheets/d/1ABC123DEF456/edit?usp=sharing';
    expect(app.extractSheetId(url)).toBe('1ABC123DEF456');
  });

  test('returns raw ID when given just the ID', function() {
    expect(app.extractSheetId('1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM')).toBe('1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM');
  });

  test('handles ID with hyphens and underscores', function() {
    expect(app.extractSheetId('abc-123_DEF')).toBe('abc-123_DEF');
  });

  test('trims whitespace from input', function() {
    expect(app.extractSheetId('  1ABC123DEF456  ')).toBe('1ABC123DEF456');
  });

  test('throws for invalid input', function() {
    expect(function() {
      app.extractSheetId('not a valid id!!');
    }).toThrow();
  });

  test('throws for URL without sheet ID', function() {
    expect(function() {
      app.extractSheetId('https://docs.google.com/spreadsheets/');
    }).toThrow();
  });
});

// ============================================================
// validateAndGetSheetInput
// ============================================================
describe('validateAndGetSheetInput', function() {

  test('returns trimmed input when value is present', function() {
    var input = document.getElementById('sheet-id-input');
    input.value = '  my-sheet-id  ';
    expect(app.validateAndGetSheetInput()).toBe('my-sheet-id');
  });

  test('returns null when input is empty', function() {
    var input = document.getElementById('sheet-id-input');
    input.value = '';
    expect(app.validateAndGetSheetInput()).toBeNull();
  });

  test('returns null when input is whitespace only', function() {
    var input = document.getElementById('sheet-id-input');
    input.value = '   ';
    expect(app.validateAndGetSheetInput()).toBeNull();
  });

  test('accepts full Google Sheets URL', function() {
    var input = document.getElementById('sheet-id-input');
    input.value = 'https://docs.google.com/spreadsheets/d/ABC123/edit';
    expect(app.validateAndGetSheetInput()).toBe('https://docs.google.com/spreadsheets/d/ABC123/edit');
  });
});

// ============================================================
// toggleSheetSelection
// ============================================================
describe('toggleSheetSelection', function() {

  beforeEach(function() {
    // Set up sheets-list with some checkboxes
    var sheetsList = document.getElementById('sheets-list');
    sheetsList.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = 'Sheet' + (i + 1);
      sheetsList.appendChild(cb);
    }
    app.updateSelectedCount = jest.fn();
    app.updateSelectAllButtonText = jest.fn();
  });

  test('enables save button when at least one sheet is checked', function() {
    var checkboxes = document.querySelectorAll('#sheets-list input[type="checkbox"]');
    checkboxes[0].checked = true;
    app.toggleSheetSelection();
    var saveBtn = document.getElementById('save-sheet-settings');
    expect(saveBtn.disabled).toBe(false);
  });

  test('disables save button when no sheets are checked', function() {
    app.toggleSheetSelection();
    var saveBtn = document.getElementById('save-sheet-settings');
    expect(saveBtn.disabled).toBe(true);
  });

  test('calls updateSelectedCount and updateSelectAllButtonText', function() {
    app.toggleSheetSelection();
    expect(app.updateSelectedCount).toHaveBeenCalled();
    expect(app.updateSelectAllButtonText).toHaveBeenCalled();
  });
});

// ============================================================
// toggleSelectAll / clearAllSelection
// ============================================================
describe('toggleSelectAll', function() {

  beforeEach(function() {
    var sheetsList = document.getElementById('sheets-list');
    sheetsList.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = 'Sheet' + (i + 1);
      sheetsList.appendChild(cb);
    }
    // Create the toggle button
    var btn = document.getElementById('toggle-select-all-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'toggle-select-all-btn';
      document.body.appendChild(btn);
    }
    btn.textContent = '全選';
    app.updateSelectedCount = jest.fn();
    app.updateSelectAllButtonText = jest.fn();
  });

  test('selects all checkboxes when none are selected', function() {
    // Replace updateSelectAllButtonText so toggleSheetSelection can call it
    app.updateSelectAllButtonText = function() {
      var checkboxes = document.querySelectorAll('#sheets-list input[type="checkbox"]');
      var btn = document.getElementById('toggle-select-all-btn');
      var allChecked = true;
      for (var i = 0; i < checkboxes.length; i++) {
        if (!checkboxes[i].checked) { allChecked = false; break; }
      }
      if (btn) btn.textContent = allChecked ? '取消全選' : '全選';
    };
    app.toggleSelectAll();
    var checkboxes = document.querySelectorAll('#sheets-list input[type="checkbox"]');
    for (var i = 0; i < checkboxes.length; i++) {
      expect(checkboxes[i].checked).toBe(true);
    }
  });

  test('deselects all when all are selected', function() {
    var checkboxes = document.querySelectorAll('#sheets-list input[type="checkbox"]');
    for (var i = 0; i < checkboxes.length; i++) {
      checkboxes[i].checked = true;
    }
    app.updateSelectAllButtonText = function() {};
    app.toggleSelectAll();
    for (var j = 0; j < checkboxes.length; j++) {
      expect(checkboxes[j].checked).toBe(false);
    }
  });
});

describe('clearAllSelection', function() {

  beforeEach(function() {
    var sheetsList = document.getElementById('sheets-list');
    sheetsList.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = 'Sheet' + (i + 1);
      cb.checked = true;
      sheetsList.appendChild(cb);
    }
    app.updateSelectedCount = jest.fn();
    app.updateSelectAllButtonText = jest.fn();
  });

  test('unchecks all checkboxes', function() {
    app.clearAllSelection();
    var checkboxes = document.querySelectorAll('#sheets-list input[type="checkbox"]');
    for (var i = 0; i < checkboxes.length; i++) {
      expect(checkboxes[i].checked).toBe(false);
    }
  });
});

// ============================================================
// renderSheetsList
// ============================================================
describe('renderSheetsList', function() {

  test('renders sheet items into sheets-list', function() {
    app.availableSheets = [
      { name: 'Sheet1', wordCount: 50 },
      { name: 'Sheet2', wordCount: 30 }
    ];
    app.sheetSettings.selectedSheets = ['Sheet1'];
    app.renderSheetsList();

    var items = document.querySelectorAll('#sheets-list .sheet-item');
    expect(items.length).toBe(2);
  });

  test('auto-checks previously selected sheets', function() {
    app.availableSheets = [
      { name: 'Sheet1', wordCount: 50 },
      { name: 'Sheet2', wordCount: 30 }
    ];
    app.sheetSettings.selectedSheets = ['Sheet1'];
    app.renderSheetsList();

    var checkboxes = document.querySelectorAll('#sheets-list input[type="checkbox"]');
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);
  });

  test('shows error message when no sheets available', function() {
    app.availableSheets = [];
    app.renderSheetsList();

    var sheetsList = document.getElementById('sheets-list');
    expect(sheetsList.innerHTML).toContain('沒有找到工作表');
  });

  test('displays spreadsheet name as title when available', function() {
    app.currentSpreadsheetName = 'My Vocab';
    app.availableSheets = [{ name: 'Sheet1', wordCount: 10 }];
    app.sheetSettings.selectedSheets = [];
    app.renderSheetsList();

    var title = document.querySelector('.sheet-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toContain('My Vocab');
  });

  test('shows loading text for sheets without word count', function() {
    app.availableSheets = [{ name: 'Sheet1', wordCount: null }];
    app.sheetSettings.selectedSheets = [];
    app.isLoadingWordCounts = true;
    app.renderSheetsList();

    var countEl = document.getElementById('sheet-count-0');
    expect(countEl.textContent).toContain('載入中');
  });
});

// ============================================================
// loadSheetsList
// ============================================================
describe('loadSheetsList', function() {

  test('prompts to use default sheet when input is empty', function() {
    var input = document.getElementById('sheet-id-input');
    input.value = '';
    app.customConfirm = jest.fn();
    app.loadSheetsList();
    expect(app.customConfirm).toHaveBeenCalled();
  });

  test('calls _continueLoadSheetsList when input has value', function() {
    var input = document.getElementById('sheet-id-input');
    input.value = 'some-sheet-id';
    app._continueLoadSheetsList = jest.fn();
    app.loadSheetsList();
    expect(app._continueLoadSheetsList).toHaveBeenCalled();
  });
});
