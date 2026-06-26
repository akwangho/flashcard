/**
 * Tests for duplicate word processing: processDuplicatesInMemory
 * Spec: openspec/specs/duplicate-handling/spec.md
 */
var app;

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
// Metadata merging (難易度 / 圖片 / 標籤 / 要會拼)
// Spec: openspec/specs/duplicate-handling/spec.md
// ============================================================
describe('mergeDuplicateWordMetadata', function() {

  test('takes max difficulty, first non-empty image, union of tags, any mustSpell', function() {
    var group = [
      { id: 1, english: 'bank', chinese: '銀行', difficultyLevel: 0, image: '', imageFormula: '', mustSpell: false, tags: ['金融'] },
      { id: 2, english: 'bank', chinese: '河岸', difficultyLevel: 5, image: 'http://img/river.png', imageFormula: '=IMAGE("x")', mustSpell: true, tags: ['地理', '金融'] }
    ];

    var merged = app.mergeDuplicateWordMetadata(group);

    expect(merged.difficultyLevel).toBe(5);
    expect(merged.image).toBe('http://img/river.png');
    expect(merged.imageFormula).toBe('=IMAGE("x")');
    expect(merged.mustSpell).toBe(true);
    expect(merged.tags).toEqual(['金融', '地理']);
  });

  test('defaults difficulty to 0 when none present', function() {
    var merged = app.mergeDuplicateWordMetadata([
      { id: 1, english: 'x', chinese: '甲' },
      { id: 2, english: 'x', chinese: '乙' }
    ]);
    expect(merged.difficultyLevel).toBe(0);
    expect(merged.image).toBe('');
    expect(merged.mustSpell).toBe(false);
    expect(merged.tags).toEqual([]);
  });

  test('keeps first occurrence image even if later words also have images', function() {
    var merged = app.mergeDuplicateWordMetadata([
      { id: 1, english: 'x', chinese: '甲', image: 'first.png' },
      { id: 2, english: 'x', chinese: '乙', image: 'second.png' }
    ]);
    expect(merged.image).toBe('first.png');
  });
});

describe('applyMergedMetadataToWord', function() {
  test('returns a new object preserving target identity fields but merged metadata', function() {
    var target = { id: 1, english: 'bank', chinese: '銀行', sheetName: 'Sheet1', originalRowIndex: 2, difficultyLevel: 0, image: '', tags: [], mustSpell: false };
    var group = [
      target,
      { id: 2, english: 'bank', chinese: '河岸', sheetName: 'Sheet2', difficultyLevel: 7, image: 'http://img', tags: ['地理'], mustSpell: true }
    ];

    var result = app.applyMergedMetadataToWord(target, group);

    expect(result).not.toBe(target);
    expect(result.id).toBe(1);
    expect(result.sheetName).toBe('Sheet1');
    expect(result.difficultyLevel).toBe(7);
    expect(result.image).toBe('http://img');
    expect(result.tags).toEqual(['地理']);
    expect(result.mustSpell).toBe(true);
    // Original target must not be mutated
    expect(target.difficultyLevel).toBe(0);
    expect(target.image).toBe('');
  });
});

describe('processDuplicatesInMemory metadata preservation', function() {

  test('different-definition merge keeps metadata from non-first duplicate', function() {
    var allWords = [
      { id: 1, english: 'bank', chinese: '銀行', sheetName: 'Sheet1', originalRowIndex: 2, difficultyLevel: 0, image: '', imageFormula: '', mustSpell: false, tags: [] },
      { id: 2, english: 'bank', chinese: '河岸', sheetName: 'Sheet2', originalRowIndex: 2, difficultyLevel: 8, image: 'http://img/river.png', imageFormula: '', mustSpell: true, tags: ['地理'] }
    ];
    var duplicates = [
      { english: 'bank', isSameDefinition: false, words: [allWords[0], allWords[1]] }
    ];

    var result = app.processDuplicatesInMemory(allWords, duplicates);
    var bank = result.processedWords.find(function(w) { return w.english === 'bank'; });

    expect(bank.chinese).toContain('銀行');
    expect(bank.chinese).toContain('河岸');
    expect(bank.difficultyLevel).toBe(8);
    expect(bank.image).toBe('http://img/river.png');
    expect(bank.tags).toEqual(['地理']);
    expect(bank.mustSpell).toBe(true);
  });

  test('same-definition keep-first still merges metadata from removed duplicate', function() {
    var allWords = [
      { id: 1, english: 'apple', chinese: '蘋果', sheetName: 'Sheet1', originalRowIndex: 2, difficultyLevel: 2, image: '', imageFormula: '', mustSpell: false, tags: ['水果'] },
      { id: 2, english: 'apple', chinese: '蘋果', sheetName: 'Sheet2', originalRowIndex: 2, difficultyLevel: 0, image: 'http://img/apple.png', imageFormula: '', mustSpell: true, tags: ['食物'] }
    ];
    var duplicates = [
      { english: 'apple', isSameDefinition: true, words: [allWords[0], allWords[1]] }
    ];

    var result = app.processDuplicatesInMemory(allWords, duplicates);
    var apple = result.processedWords.find(function(w) { return w.english === 'apple'; });

    expect(apple.id).toBe(1);
    expect(apple.chinese).toBe('蘋果');
    expect(apple.difficultyLevel).toBe(2);
    expect(apple.image).toBe('http://img/apple.png');
    expect(apple.tags).toEqual(['水果', '食物']);
    expect(apple.mustSpell).toBe(true);
  });
});

describe('detectAndHandleDuplicatesInMemory metadata preservation', function() {

  test('auto-merge keeps metadata from non-first duplicate', function() {
    var allWords = [
      { id: 1, english: 'bank', chinese: '銀行', sheetName: 'Sheet1', difficultyLevel: 0, image: '', imageFormula: '', mustSpell: false, tags: [] },
      { id: 2, english: 'bank', chinese: '河岸', sheetName: 'Sheet2', difficultyLevel: 3, image: 'http://img', imageFormula: '', mustSpell: true, tags: ['地理'] }
    ];

    var out = app.detectAndHandleDuplicatesInMemory(allWords);
    var bank = out.words.find(function(w) { return w.english === 'bank'; });

    expect(out.autoHandled).toBe(true);
    expect(bank.difficultyLevel).toBe(3);
    expect(bank.image).toBe('http://img');
    expect(bank.tags).toEqual(['地理']);
    expect(bank.mustSpell).toBe(true);
  });
});

describe('findDuplicateGroupsInMemory', function() {
  test('returns empty when no duplicates', function() {
    var words = [
      { id: 0, english: 'a', chinese: '甲', sheetName: 'S1' },
      { id: 1, english: 'b', chinese: '乙', sheetName: 'S1' }
    ];
    expect(app.findDuplicateGroupsInMemory(words).length).toBe(0);
  });

  test('returns one group when same english appears twice with same chinese', function() {
    var words = [
      { id: 0, english: 'apple', chinese: '蘋果', sheetName: 'S1' },
      { id: 1, english: 'apple', chinese: '蘋果', sheetName: 'S2' }
    ];
    var g = app.findDuplicateGroupsInMemory(words);
    expect(g.length).toBe(1);
    expect(g[0].isSameDefinition).toBe(true);
    expect(g[0].words.length).toBe(2);
  });

  test('marks different chinese as isSameDefinition false', function() {
    var words = [
      { id: 0, english: 'bank', chinese: '銀行', sheetName: 'S1' },
      { id: 1, english: 'bank', chinese: '河岸', sheetName: 'S2' }
    ];
    var g = app.findDuplicateGroupsInMemory(words);
    expect(g.length).toBe(1);
    expect(g[0].isSameDefinition).toBe(false);
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
