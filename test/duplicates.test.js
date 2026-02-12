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

// ============================================================
// Duplicate modal open/close
// ============================================================
describe('showDuplicateModal', function() {

  test('opens modal and pauses timer', function() {
    app.duplicateWords = [
      {
        english: 'apple',
        isSameDefinition: true,
        words: [
          { id: 1, english: 'apple', chinese: '蘋果', sheetName: 'Sheet1' },
          { id: 2, english: 'apple', chinese: '蘋果', sheetName: 'Sheet2' }
        ]
      }
    ];
    app.pauseTimer = jest.fn();
    app.renderDuplicateWordsList = jest.fn();
    app.setupDuplicateModalEvents = jest.fn();

    app.showDuplicateModal();

    var modal = document.getElementById('duplicate-words-modal');
    expect(modal.style.display).toBe('flex');
    expect(app.pauseTimer).toHaveBeenCalled();
  });

  test('still opens modal even with empty duplicate words', function() {
    app.duplicateWords = [];
    app.pauseTimer = jest.fn();
    app.renderDuplicateWordsList = jest.fn();
    app.setupDuplicateModalEvents = jest.fn();
    app.showDuplicateModal();
    // The modal always opens; it shows "0 組重複單字"
    var modal = document.getElementById('duplicate-words-modal');
    expect(modal.style.display).toBe('flex');
  });
});

describe('closeDuplicateModal', function() {

  test('hides modal and resumes timer', function() {
    var modal = document.getElementById('duplicate-words-modal');
    modal.style.display = 'flex';
    app.resumeTimer = jest.fn();

    app.closeDuplicateModal();

    expect(modal.style.display).toBe('none');
    expect(app.resumeTimer).toHaveBeenCalled();
  });
});

// ============================================================
// skipDuplicates
// ============================================================
describe('skipDuplicates', function() {

  test('processes duplicates in memory and updates words', function() {
    app.words = [
      { id: 1, english: 'apple', chinese: '蘋果', sheetName: 'Sheet1', originalRowIndex: 2 },
      { id: 2, english: 'apple', chinese: '蘋果', sheetName: 'Sheet2', originalRowIndex: 2 },
      { id: 3, english: 'cat', chinese: '貓', sheetName: 'Sheet1', originalRowIndex: 3 }
    ];
    app.currentWords = app.words.slice();
    app.duplicateWords = [
      {
        english: 'apple',
        isSameDefinition: true,
        words: [app.words[0], app.words[1]]
      }
    ];

    // Add modal-body and modal-footer children to the duplicate modal
    var modal = document.getElementById('duplicate-words-modal');
    var modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    var modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    modal.appendChild(modalBody);
    modal.appendChild(modalFooter);

    app.resumeTimer = jest.fn();
    app.closeDuplicateModal = jest.fn();
    app.setupEventListeners = jest.fn();
    app.applySettings = jest.fn();
    app.startNewRound = jest.fn();

    app.skipDuplicates();

    // After processing, should have 2 words (apple + cat)
    expect(app.words.length).toBe(2);
  });
});
