/**
 * Tests for export methods: generateAlternativeSheetName, getDefaultExportSheetName,
 * startBatchExport, handleSheetExistsError, updateExportProgress
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
// generateAlternativeSheetName
// ============================================================
describe('generateAlternativeSheetName', function() {

  test('appends timestamp to a name without one', function() {
    var result = app.generateAlternativeSheetName('MySheet');
    expect(result).toMatch(/^MySheet_\d{4}$/);
  });

  test('updates timestamp if name already has one', function() {
    var result = app.generateAlternativeSheetName('MySheet_1200');
    expect(result).toMatch(/^MySheet_\d{4}$/);
  });

  test('result is different from input when input has timestamp', function() {
    var result = app.generateAlternativeSheetName('TestSheet_9999');
    expect(result).toMatch(/^TestSheet_\d{4}$/);
    var time = result.split('_').pop();
    var hours = parseInt(time.substring(0, 2));
    var minutes = parseInt(time.substring(2, 4));
    expect(hours).toBeGreaterThanOrEqual(0);
    expect(hours).toBeLessThanOrEqual(23);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeLessThanOrEqual(59);
  });

  test('handles names with underscores that are not timestamps', function() {
    var result = app.generateAlternativeSheetName('My_Sheet_Name');
    expect(result).toMatch(/^My_Sheet_Name_\d{4}$/);
  });
});

// ============================================================
// getDefaultExportSheetName
// ============================================================
describe('getDefaultExportSheetName', function() {

  test('returns name with date suffix', function() {
    var result = app.getDefaultExportSheetName();
    expect(result).toMatch(/_\d{8}$/);
  });

  test('uses first selected sheet name as base', function() {
    app.sheetSettings.selectedSheets = ['VocabList', 'Sheet2'];
    var result = app.getDefaultExportSheetName();
    expect(result).toMatch(/^VocabList_\d{8}$/);
  });

  test('uses "Sheet1" as default when no sheets selected', function() {
    app.sheetSettings.selectedSheets = [];
    var result = app.getDefaultExportSheetName();
    expect(result).toMatch(/^Sheet1_\d{8}$/);
  });

  test('date portion matches today', function() {
    var result = app.getDefaultExportSheetName();
    var now = new Date();
    var y = now.getFullYear();
    var m = (now.getMonth() + 1).toString();
    var d = now.getDate().toString();
    if (m.length < 2) m = '0' + m;
    if (d.length < 2) d = '0' + d;
    var expectedDate = y + m + d;
    expect(result).toContain(expectedDate);
  });
});

// ============================================================
// startBatchExport
// ============================================================
describe('startBatchExport', function() {

  beforeEach(function() {
    app.processBatch = jest.fn();
  });

  test('splits data into correct number of batches', function() {
    var data = [];
    for (var i = 0; i < 40; i++) {
      data.push({ english: 'word' + i, chinese: '字' + i });
    }
    app.startBatchExport(data, 'TestSheet', 'sheet-id-123', false);
    // EXPORT_BATCH_SIZE is 15, so 40 words = ceil(40/15) = 3 batches
    expect(app.totalBatches).toBe(3);
    expect(app.exportBatches.length).toBe(3);
    expect(app.exportBatches[0].length).toBe(15);
    expect(app.exportBatches[1].length).toBe(15);
    expect(app.exportBatches[2].length).toBe(10);
  });

  test('stores export metadata correctly', function() {
    var data = [{ english: 'test', chinese: '測試' }];
    app.startBatchExport(data, 'MySheet', 'sid-1', true);
    expect(app.exportSheetName).toBe('MySheet');
    expect(app.exportTargetSheetId).toBe('sid-1');
    expect(app.exportOverwrite).toBe(true);
    expect(app.totalWords).toBe(1);
    expect(app.currentBatch).toBe(0);
  });

  test('calls processBatch immediately', function() {
    app.startBatchExport([{ english: 'x', chinese: 'x' }], 'S', null, false);
    expect(app.processBatch).toHaveBeenCalled();
  });
});

// ============================================================
// updateExportProgress
// ============================================================
describe('updateExportProgress', function() {

  test('updates progress bar width', function() {
    app.updateExportProgress(5, 10, '50% done');
    var fill = document.getElementById('export-progress-fill');
    expect(fill.style.width).toBe('50%');
  });

  test('updates progress text', function() {
    app.updateExportProgress(3, 10, '正在匯出...');
    var text = document.getElementById('export-progress-text');
    expect(text.textContent).toBe('正在匯出...');
  });

  test('updates progress count', function() {
    app.updateExportProgress(7, 20, 'msg');
    var count = document.getElementById('export-progress-count');
    expect(count.textContent).toBe('7 / 20');
  });

  test('caps progress at 100%', function() {
    app.updateExportProgress(15, 10, 'over');
    var fill = document.getElementById('export-progress-fill');
    expect(fill.style.width).toBe('100%');
  });
});

// ============================================================
// handleSheetExistsError
// ============================================================
describe('handleSheetExistsError', function() {

  test('hides export progress and resets button', function() {
    app.hideExportProgress = jest.fn();
    app.resetExportButton = jest.fn();
    app.showOverwriteConfirmModal = jest.fn();
    var input = document.getElementById('export-sheet-name');
    input.value = 'TestSheet';

    app.handleSheetExistsError('Sheet already exists');

    expect(app.hideExportProgress).toHaveBeenCalled();
    expect(app.resetExportButton).toHaveBeenCalled();
  });

  test('shows overwrite confirm modal with current sheet name', function() {
    app.hideExportProgress = jest.fn();
    app.resetExportButton = jest.fn();
    app.showOverwriteConfirmModal = jest.fn();
    var input = document.getElementById('export-sheet-name');
    input.value = 'MyVocab';

    app.handleSheetExistsError('Sheet already exists');

    expect(app.showOverwriteConfirmModal).toHaveBeenCalledWith('MyVocab');
  });
});

// ============================================================
// performExport
// ============================================================
describe('performExport', function() {

  test('filters difficult words when export type is difficult', function() {
    app.words = [
      { english: 'easy', chinese: '簡', difficultyLevel: 0 },
      { english: 'hard', chinese: '難', difficultyLevel: 3 },
      { english: 'medium', chinese: '中', difficultyLevel: 1 }
    ];
    app.currentWords = app.words.slice();

    var typeRadio = document.getElementById('export-type-difficult');
    typeRadio.checked = true;

    app.showExportProgress = jest.fn();
    app.startBatchExport = jest.fn();

    app.performExport(false);

    var exportData = app.startBatchExport.mock.calls[0][0];
    expect(exportData.length).toBe(2);
    expect(exportData[0].english).toBe('hard');
    expect(exportData[1].english).toBe('medium');
  });

  test('alerts when no words to export', function() {
    app.words = [];
    app.currentWords = [];
    var alertSpy = jest.fn();
    global.alert = alertSpy;

    app.performExport(false);

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('沒有可匯出的單字'));
  });
});
