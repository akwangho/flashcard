/**
 * Tests for duplicate word processing: processDuplicatesInMemory
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

describe('processDuplicatesInMemory', function() {

  test('handles same-definition duplicates (keeps first, removes others)', function() {
    var allWords = [
      { id: 1, english: 'apple', chinese: '蘋果', sheetName: 'Sheet1', originalRowIndex: 2 },
      { id: 2, english: 'banana', chinese: '香蕉', sheetName: 'Sheet1', originalRowIndex: 3 },
      { id: 3, english: 'apple', chinese: '蘋果', sheetName: 'Sheet2', originalRowIndex: 2 },
      { id: 4, english: 'cat', chinese: '貓', sheetName: 'Sheet1', originalRowIndex: 4 }
    ];

    var duplicates = [
      {
        english: 'apple',
        isSameDefinition: true,
        words: [
          { id: 1, english: 'apple', chinese: '蘋果', sheetName: 'Sheet1', originalRowIndex: 2 },
          { id: 3, english: 'apple', chinese: '蘋果', sheetName: 'Sheet2', originalRowIndex: 2 }
        ]
      }
    ];

    var result = app.processDuplicatesInMemory(allWords, duplicates);

    expect(result.success).toBe(true);
    expect(result.processedWords.length).toBe(3); // apple(1), banana, cat
    expect(result.removedCount).toBe(1);
    expect(result.originalCount).toBe(4);

    // The remaining apple should be from Sheet1
    var remainingApple = result.processedWords.find(function(w) { return w.english === 'apple'; });
    expect(remainingApple.sheetName).toBe('Sheet1');
    expect(remainingApple.id).toBe(1);
  });

  test('handles different-definition duplicates (merges definitions)', function() {
    var allWords = [
      { id: 1, english: 'bank', chinese: '銀行', sheetName: 'Sheet1', originalRowIndex: 2 },
      { id: 2, english: 'bank', chinese: '河岸', sheetName: 'Sheet2', originalRowIndex: 2 },
      { id: 3, english: 'cat', chinese: '貓', sheetName: 'Sheet1', originalRowIndex: 3 }
    ];

    var duplicates = [
      {
        english: 'bank',
        isSameDefinition: false,
        words: [
          { id: 1, english: 'bank', chinese: '銀行', sheetName: 'Sheet1', originalRowIndex: 2 },
          { id: 2, english: 'bank', chinese: '河岸', sheetName: 'Sheet2', originalRowIndex: 2 }
        ]
      }
    ];

    var result = app.processDuplicatesInMemory(allWords, duplicates);

    expect(result.success).toBe(true);
    expect(result.processedWords.length).toBe(2); // merged bank + cat
    expect(result.removedCount).toBe(1);

    // The remaining bank should have merged definition
    var remainingBank = result.processedWords.find(function(w) { return w.english === 'bank'; });
    expect(remainingBank.chinese).toContain('銀行');
    expect(remainingBank.chinese).toContain('河岸');
    expect(remainingBank.chinese).toContain('1.');
    expect(remainingBank.chinese).toContain('2.');
  });

  test('handles multiple duplicate groups', function() {
    var allWords = [
      { id: 1, english: 'apple', chinese: '蘋果', sheetName: 'Sheet1', originalRowIndex: 2 },
      { id: 2, english: 'apple', chinese: '蘋果', sheetName: 'Sheet2', originalRowIndex: 2 },
      { id: 3, english: 'bank', chinese: '銀行', sheetName: 'Sheet1', originalRowIndex: 3 },
      { id: 4, english: 'bank', chinese: '河岸', sheetName: 'Sheet2', originalRowIndex: 3 },
      { id: 5, english: 'cat', chinese: '貓', sheetName: 'Sheet1', originalRowIndex: 4 }
    ];

    var duplicates = [
      {
        english: 'apple',
        isSameDefinition: true,
        words: [allWords[0], allWords[1]]
      },
      {
        english: 'bank',
        isSameDefinition: false,
        words: [allWords[2], allWords[3]]
      }
    ];

    var result = app.processDuplicatesInMemory(allWords, duplicates);

    expect(result.success).toBe(true);
    expect(result.processedWords.length).toBe(3); // apple(1), bank(merged), cat
    expect(result.removedCount).toBe(2);
    expect(result.results.length).toBe(2);
  });

  test('returns success with empty duplicates array', function() {
    var allWords = [
      { id: 1, english: 'apple', chinese: '蘋果', sheetName: 'Sheet1', originalRowIndex: 2 }
    ];

    var result = app.processDuplicatesInMemory(allWords, []);

    expect(result.success).toBe(true);
    expect(result.processedWords.length).toBe(1);
    expect(result.removedCount).toBe(0);
  });

  test('does not modify original allWords array', function() {
    var allWords = [
      { id: 1, english: 'apple', chinese: '蘋果', sheetName: 'Sheet1', originalRowIndex: 2 },
      { id: 2, english: 'apple', chinese: '蘋果', sheetName: 'Sheet2', originalRowIndex: 2 }
    ];
    var originalLength = allWords.length;

    var duplicates = [
      {
        english: 'apple',
        isSameDefinition: true,
        words: [allWords[0], allWords[1]]
      }
    ];

    app.processDuplicatesInMemory(allWords, duplicates);
    expect(allWords.length).toBe(originalLength);
  });

  test('result contains correct counts', function() {
    var allWords = [
      { id: 1, english: 'apple', chinese: '蘋果', sheetName: 'Sheet1', originalRowIndex: 2 },
      { id: 2, english: 'apple', chinese: '蘋果', sheetName: 'Sheet2', originalRowIndex: 2 },
      { id: 3, english: 'apple', chinese: '蘋果', sheetName: 'Sheet3', originalRowIndex: 2 },
      { id: 4, english: 'banana', chinese: '香蕉', sheetName: 'Sheet1', originalRowIndex: 3 }
    ];

    var duplicates = [
      {
        english: 'apple',
        isSameDefinition: true,
        words: [allWords[0], allWords[1], allWords[2]]
      }
    ];

    var result = app.processDuplicatesInMemory(allWords, duplicates);

    expect(result.successCount).toBe(1); // 1 duplicate group processed
    expect(result.totalCount).toBe(1);   // 1 duplicate group total
    expect(result.removedCount).toBe(2); // 2 words removed
    expect(result.originalCount).toBe(4); // 4 original words
    expect(result.processedCount).toBe(2); // 2 words remaining
  });
});
