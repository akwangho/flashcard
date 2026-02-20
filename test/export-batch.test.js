var setup = require('./setup');

describe('export processBatch', function() {
  var app;

  beforeAll(function() {
    setup.bootstrapApp();
  });

  beforeEach(function() {
    app = new FlashcardApp();
    jest.useFakeTimers();
    app.pauseTimer = jest.fn();
    app.resumeTimer = jest.fn();
  });

  afterEach(function() {
    jest.useRealTimers();
  });

  test('calls completeExportProgress when all batches done', function() {
    app.currentBatch = 2;
    app.totalBatches = 2;
    app.completeExportProgress = jest.fn();
    app.onExportComplete = jest.fn();
    app.processBatch();
    expect(app.completeExportProgress).toHaveBeenCalled();
  });

  test('updates progress with batch message', function() {
    app.currentBatch = 0;
    app.totalBatches = 3;
    app.exportBatches = [['a', 'b'], ['c', 'd'], ['e']];
    app.processedWords = 0;
    app.totalWords = 5;
    app.exportSheetName = 'Test';
    app.exportTargetSheetId = '123';
    app.exportOverwrite = false;
    var spy = jest.spyOn(app, 'updateExportProgress');
    app.processBatch();
    expect(spy).toHaveBeenCalledWith(0, 5, expect.stringContaining('第 1 批'));
    spy.mockRestore();
  });

  test('sets shouldOverwrite true for first batch when exportOverwrite is true', function() {
    app.currentBatch = 0;
    app.totalBatches = 2;
    app.exportBatches = [['a'], ['b']];
    app.processedWords = 0;
    app.totalWords = 2;
    app.exportSheetName = 'Test';
    app.exportTargetSheetId = '123';
    app.exportOverwrite = true;

    var exportCalls = [];
    google.script.run.exportWordsToSheet = function() {
      exportCalls.push(Array.prototype.slice.call(arguments));
      return google.script.run;
    };

    app.processBatch();
    expect(exportCalls.length).toBe(1);
    expect(exportCalls[0][3]).toBe(true); // shouldOverwrite
    expect(exportCalls[0][4]).toBe(true); // isFirstBatch
  });

  test('sets shouldOverwrite false for non-first batches', function() {
    app.currentBatch = 1;
    app.totalBatches = 2;
    app.exportBatches = [['a'], ['b']];
    app.processedWords = 1;
    app.totalWords = 2;
    app.exportSheetName = 'Test';
    app.exportTargetSheetId = '123';
    app.exportOverwrite = true;

    var exportCalls = [];
    google.script.run.exportWordsToSheet = function() {
      exportCalls.push(Array.prototype.slice.call(arguments));
      return google.script.run;
    };

    app.processBatch();
    expect(exportCalls.length).toBe(1);
    expect(exportCalls[0][3]).toBe(false); // shouldOverwrite for non-first batch
    expect(exportCalls[0][4]).toBe(false); // isFirstBatch
  });
});

describe('export openExportModal / closeExportModal', function() {
  var app;

  beforeAll(function() {
    setup.bootstrapApp();
  });

  beforeEach(function() {
    app = new FlashcardApp();
    app.pauseTimer = jest.fn();
    app.resumeTimer = jest.fn();
  });

  test('openExportModal shows the modal', function() {
    app.openExportModal();
    var modal = document.getElementById('export-modal');
    expect(modal.style.display).toBe('flex');
  });

  test('openExportModal sets default sheet name', function() {
    app.currentSpreadsheetName = 'MySheet';
    app.openExportModal();
    var input = document.getElementById('export-sheet-name');
    expect(input.value).not.toBe('');
  });

  test('closeExportModal hides the modal', function() {
    app.openExportModal();
    app.closeExportModal();
    var modal = document.getElementById('export-modal');
    expect(modal.style.display).toBe('none');
  });
});
