/**
 * Tests for word bank search (script-search-word.html)
 * Spec: openspec/specs/ui-shell/spec.md (Word search)
 */

var setup = require('./setup');

describe('searchWordsByQuery', function() {
  var app;

  beforeEach(function() {
    setup.bootstrapApp();
    app = setup.createApp();
  });

  it('returns empty for empty words or blank query', function() {
    expect(app.searchWordsByQuery([], 'test')).toEqual([]);
    expect(app.searchWordsByQuery([{ english: 'a', chinese: 'b' }], '')).toEqual([]);
    expect(app.searchWordsByQuery([{ english: 'a', chinese: 'b' }], '   ')).toEqual([]);
  });

  it('matches English case-insensitively as substring', function() {
    var words = [
      { id: 0, english: 'Apple pie', chinese: '蘋果派', sheetName: 'S1', originalRowIndex: 1 },
      { id: 1, english: 'banana', chinese: '香蕉', sheetName: 'S1', originalRowIndex: 2 }
    ];
    var r = app.searchWordsByQuery(words, 'apple');
    expect(r.length).toBe(1);
    expect(r[0].english).toBe('Apple pie');
  });

  it('matches Chinese substring', function() {
    var words = [
      { id: 0, english: 'x', chinese: '你好世界', sheetName: 'S1', originalRowIndex: 1 }
    ];
    var r = app.searchWordsByQuery(words, '世界');
    expect(r.length).toBe(1);
  });

  it('sorts by sheet name then originalRowIndex', function() {
    var words = [
      { id: 0, english: 'z', chinese: 'z', sheetName: 'B', originalRowIndex: 5 },
      { id: 1, english: 'z', chinese: 'z', sheetName: 'A', originalRowIndex: 9 },
      { id: 2, english: 'z', chinese: 'z', sheetName: 'A', originalRowIndex: 2 }
    ];
    var r = app.searchWordsByQuery(words, 'z');
    expect(r[0].sheetName).toBe('A');
    expect(r[0].originalRowIndex).toBe(2);
    expect(r[1].originalRowIndex).toBe(9);
    expect(r[2].sheetName).toBe('B');
  });

  it('returns no matches when nothing matches', function() {
    var words = [{ id: 0, english: 'cat', chinese: '貓', sheetName: 'S1', originalRowIndex: 1 }];
    expect(app.searchWordsByQuery(words, 'dog').length).toBe(0);
  });

  it('exactEnglishOnly matches B column whole string only', function() {
    var words = [
      { id: 0, english: 'test', chinese: '測試', sheetName: 'S1', originalRowIndex: 1 },
      { id: 1, english: 'testing', chinese: '測試中', sheetName: 'S1', originalRowIndex: 2 }
    ];
    var sub = app.searchWordsByQuery(words, 'test', false);
    expect(sub.length).toBe(2);
    var ex = app.searchWordsByQuery(words, 'test', true);
    expect(ex.length).toBe(1);
    expect(ex[0].english).toBe('test');
  });

  it('exactEnglishOnly is case-insensitive on English', function() {
    var words = [{ id: 0, english: 'Hello', chinese: '你好', sheetName: 'S1', originalRowIndex: 1 }];
    var r = app.searchWordsByQuery(words, 'hello', true);
    expect(r.length).toBe(1);
  });
});

describe('sheetRowNumberForDisplay', function() {
  var app;

  beforeEach(function() {
    setup.bootstrapApp();
    app = setup.createApp();
  });

  it('returns originalRowIndex + 1 for numeric index', function() {
    expect(app.sheetRowNumberForDisplay(0)).toBe('1');
    expect(app.sheetRowNumberForDisplay(1)).toBe('2');
  });

  it('returns em dash for invalid index', function() {
    expect(app.sheetRowNumberForDisplay(undefined)).toBe('—');
    expect(app.sheetRowNumberForDisplay(null)).toBe('—');
  });
});

describe('openSearchWordModal / runSearchWords', function() {
  var app;

  beforeEach(function() {
    setup.bootstrapApp();
    app = setup.createApp();
    app.words = [
      { id: 0, english: 'hello', chinese: '你好', sheetName: 'Sheet1', originalRowIndex: 1 }
    ];
    app.setupSearchWordListeners();
  });

  it('runSearchWords updates summary and results for a match', function() {
    var input = document.getElementById('search-word-input');
    var summary = document.getElementById('search-word-summary');
    var results = document.getElementById('search-word-results');
    input.value = 'hello';
    app.runSearchWords();
    expect(summary.textContent.indexOf('1 筆')).not.toBe(-1);
    expect(results.innerHTML.indexOf('Sheet1')).not.toBe(-1);
    expect(results.innerHTML.indexOf('編輯')).not.toBe(-1);
  });
});
