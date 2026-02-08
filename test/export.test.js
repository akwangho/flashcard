/**
 * Tests for export methods: generateAlternativeSheetName, getDefaultExportSheetName
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

describe('generateAlternativeSheetName', function() {

  test('appends timestamp to a name without one', function() {
    var result = app.generateAlternativeSheetName('MySheet');
    // Should be like MySheet_HHMM
    expect(result).toMatch(/^MySheet_\d{4}$/);
  });

  test('updates timestamp if name already has one', function() {
    var result = app.generateAlternativeSheetName('MySheet_1200');
    // Should replace the _1200 with current time
    expect(result).toMatch(/^MySheet_\d{4}$/);
  });

  test('result is different from input when input has timestamp', function() {
    // We can't guarantee the time is different from 1200, so just check format
    var result = app.generateAlternativeSheetName('TestSheet_9999');
    expect(result).toMatch(/^TestSheet_\d{4}$/);
    // The timestamp should be a valid time (00:00-23:59)
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
    // Not ending in _NNNN, so should append timestamp
    expect(result).toMatch(/^My_Sheet_Name_\d{4}$/);
  });
});

describe('getDefaultExportSheetName', function() {

  test('returns name with date suffix', function() {
    var result = app.getDefaultExportSheetName();
    // Format: SheetName_YYYYMMDD
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
