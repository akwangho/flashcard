/**
 * Test Setup: Load FlashcardApp from HTML script files and set up mocks
 *
 * This module:
 * 1. Creates minimal DOM elements needed by FlashcardApp
 * 2. Mocks google.script.run, speechSynthesis, etc.
 * 3. Loads script HTML files (strips <script> tags), concatenates and evaluates them
 * 4. Exposes FlashcardApp on global for tests
 */

var fs = require('fs');
var path = require('path');

// ============================================
// DOM Element Creation
// ============================================

/**
 * Creates all DOM elements that FlashcardApp expects to find via getElementById.
 * IDs extracted from index.html.
 */
function createDOMElements() {
  var elementIds = [
    // Main containers
    'app', 'loading', 'error', 'flashcard',
    // Loading progress
    'loading-progress-fill', 'loading-progress-bar', 'loading-status-text',
    // Speech activation
    'speech-activation-container', 'activate-speech-btn',
    // Flashcard display
    'paused-indicator', 'muted-indicator',
    'english-section', 'english-word', 'chinese-section', 'chinese-word',
    'progress-area', 'progress-text', 'difficulty-display', 'difficulty-level',
    'must-spell-indicator',
    // Filters
    'active-filters', 'active-filters-text', 'clear-filters-btn',
    // Restore
    'restore-btn-container', 'restore-btn',
    // Control buttons
    'prev-btn', 'next-btn', 'voice-toggle-btn', 'pause-btn',
    'menu-btn', 'menu-dropdown',
    // Menu items
    'difficulty-filter-btn', 'review-filter-btn', 'must-spell-filter-btn',
    'quick-quiz-btn', 'full-quiz-btn',
    'edit-word-btn', 'search-word-btn', 'export-btn', 'restart-btn',
    'sheet-settings-btn', 'voice-settings-btn', 'settings-btn', 'fullscreen-btn',
    // Sheet settings modal
    'sheet-settings-modal', 'close-sheet-settings',
    'default-sheets-group', 'default-sheets-list',
    'recent-sheets-group', 'recent-sheets-list',
    'sheet-id-group', 'sheet-id-input', 'sheet-id-tooltip',
    'load-sheets-group', 'load-sheets-btn', 'sheets-selection-group', 'selected-count',
    'sheets-list', 'cancel-sheet-settings', 'save-sheet-settings',
    // Settings modal
    'settings-modal', 'close-settings',
    'delay-setting', 'delay-value',
    'font-size-setting', 'font-size-value',
    'font-family-setting', 'font-preview',
    'reverse-setting',
    'cancel-settings', 'save-settings',
    // Voice settings modal
    'voice-settings-modal', 'close-voice-settings',
    'speech-enabled-setting', 'voice-rate-setting', 'voice-rate-value',
    'voice-select-setting', 'japanese-voice-select-setting',
    'delay-speech-setting', 'spell-out-letters-setting',
    'chinese-speech-enabled-setting', 'chinese-voice-select-setting',
    'cancel-voice-settings', 'save-voice-settings',
    // Export modal
    'export-modal', 'close-export-modal',
    'export-type-remaining', 'export-type-difficult',
    'export-sheet-name', 'sheet-name-hint',
    'export-progress-container', 'export-progress-fill',
    'export-progress-text', 'export-progress-count',
    'cancel-export', 'confirm-export',
    // Overwrite confirm modal
    'overwrite-confirm-modal', 'close-overwrite-confirm',
    'existing-sheet-name',
    'use-different-name', 'overwrite-confirm',
    // Duplicate words modal
    'duplicate-words-modal', 'close-duplicate-modal',
    'duplicate-summary', 'duplicate-count',
    'duplicate-word-container', 'duplicate-actions',
    'current-duplicate-english', 'duplicate-options-container',
    'skip-duplicates', 'process-all-duplicates',
    'confirm-duplicate-action', 'next-duplicate',
    // Edit word modal
    'edit-word-modal', 'close-edit-word',
    'edit-word-sheet-name', 'edit-word-english', 'edit-word-chinese',
    'edit-word-difficulty', 'edit-word-difficulty-number', 'edit-word-difficulty-value',
    'edit-word-must-spell',
    'edit-word-image', 'edit-word-image-preview',
    'edit-word-image-preview-img', 'edit-word-image-preview-error',
    'cancel-edit-word', 'save-edit-word',
    // Search word modal
    'search-word-modal', 'close-search-word', 'search-word-input', 'search-word-run',
    'search-word-summary', 'search-word-results', 'close-search-word-footer',
    'search-word-exact-match',
    // Difficulty filter modal
    'difficulty-filter-modal', 'close-difficulty-filter',
    'difficulty-filter-options',
    'diff-count-n1', 'diff-count-0', 'diff-count-1', 'diff-count-3', 'diff-count-5', 'diff-count-7', 'diff-count-10',
    'cancel-difficulty-filter', 'apply-difficulty-filter',
    // Review filter modal
    'review-filter-modal', 'close-review-filter',
    'review-filter-options',
    'review-count-all', 'review-count-never',
    'review-count-2weeks', 'review-count-1month',
    'review-count-3months', 'review-count-6months',
    'cancel-review-filter', 'apply-review-filter',
    // Type filter modal
    'type-filter-modal', 'close-type-filter',
    'type-filter-options', 'type-filter-btn',
    'cancel-type-filter', 'apply-type-filter',
    // Tag filter modal
    'tag-filter-modal', 'close-tag-filter',
    'tag-filter-options', 'tag-filter-btn',
    'cancel-tag-filter', 'apply-tag-filter',
    // Quiz modal
    'quiz-modal', 'quiz-title', 'close-quiz',
    'quiz-start-screen', 'quiz-intro-title', 'quiz-intro-description',
    'quiz-scope-info', 'quiz-question-count',
    'quiz-progress-screen', 'quiz-current-number', 'quiz-total-number',
    'quiz-current-score', 'quiz-progress-fill',
    'quiz-word', 'quiz-options', 'quiz-feedback',
    'quiz-feedback-result', 'quiz-feedback-explanation',
    'quiz-result-screen', 'quiz-result-icon', 'quiz-result-title',
    'quiz-final-score', 'quiz-correct-count', 'quiz-wrong-count',
    'quiz-result-message', 'quiz-wrong-review', 'quiz-wrong-list',
    'quiz-start', 'quiz-next', 'quiz-restart', 'quiz-finish',
    // Listening quiz modal
    'listening-modal', 'listening-title', 'close-listening',
    'listening-start-screen', 'listening-icon',
    'listening-intro-title', 'listening-intro-description',
    'listening-scope-info', 'listening-question-count',
    'listening-progress-screen', 'listening-current-number', 'listening-total-number',
    'listening-current-score', 'listening-progress-fill',
    'listening-audio-area', 'listening-speaker-icon',
    'listening-options', 'listening-spell-area',
    'listening-letter-hint', 'listening-spell-input',
    'listening-feedback', 'listening-feedback-result', 'listening-feedback-explanation',
    'listening-result-screen', 'listening-result-icon', 'listening-result-title',
    'listening-final-score', 'listening-correct-count', 'listening-wrong-count',
    'listening-result-message', 'listening-wrong-review', 'listening-wrong-list',
    'listening-start', 'listening-next', 'listening-restart', 'listening-finish',
    // Listening mode setting
    'listening-mode-setting',
    // SRS review modal
    'srs-review-btn', 'srs-due-badge',
    'srs-review-modal', 'close-srs-modal',
    'srs-stats', 'srs-no-due',
    'srs-count-options', 'srs-count-buttons',
    'srs-start-btn',
    // Loading screen word display and sheet list
    'loading-word-english', 'loading-word-chinese',
    'loading-sheet-list',
    // Timer progress bar
    'timer-progress-bar',
    // Very familiar toast
    'very-familiar-toast',
    // Smart timer setting
    'smart-timer-setting',
    // Custom confirm modal
    'custom-confirm-modal', 'custom-confirm-title', 'custom-confirm-message',
    'custom-confirm-warning', 'custom-confirm-ok', 'custom-confirm-cancel',
    // Image fit mode
    'image-fit-setting',
    // Select all sheets
    'select-all-sheets-btn'
  ];

  elementIds.forEach(function(id) {
    var el = document.createElement('div');
    el.id = id;
    // Some elements need special types
    if (id.indexOf('-setting') !== -1 && id.indexOf('select') === -1) {
      if (id.indexOf('enabled') !== -1 || id === 'reverse-setting' || id === 'delay-speech-setting' || id === 'spell-out-letters-setting' || id === 'chinese-speech-enabled-setting' || id === 'edit-word-must-spell' || id === 'listening-mode-setting') {
        el = document.createElement('input');
        el.id = id;
        el.type = 'checkbox';
      } else if (id.indexOf('range') !== -1 || id === 'delay-setting' || id === 'font-size-setting' || id === 'voice-rate-setting' || id === 'edit-word-difficulty') {
        el = document.createElement('input');
        el.id = id;
        el.type = 'range';
        el.value = '5';
      }
    }
    if (id.indexOf('-select-setting') !== -1 || id === 'font-family-setting') {
      el = document.createElement('select');
      el.id = id;
    }
    if (id === 'search-word-exact-match') {
      el = document.createElement('input');
      el.id = id;
      el.type = 'checkbox';
    }
    if (id === 'sheet-id-input' || id === 'export-sheet-name' || id === 'edit-word-english' || id === 'edit-word-chinese' || id === 'edit-word-image' || id === 'listening-spell-input' || id === 'search-word-input') {
      el = document.createElement('input');
      el.id = id;
      el.type = 'text';
    }
    if (id === 'export-type-remaining' || id === 'export-type-difficult') {
      el = document.createElement('input');
      el.id = id;
      el.type = 'radio';
      el.name = 'export-type';
    }
    if (id === 'edit-word-difficulty') {
      el = document.createElement('input');
      el.id = id;
      el.type = 'range';
      el.min = '-1';
      el.max = '10';
      el.value = '0';
    }
    if (id === 'edit-word-difficulty-number') {
      el = document.createElement('input');
      el.id = id;
      el.type = 'number';
      el.min = '-999';
      el.max = '10';
      el.value = '0';
    }
    if (id === 'delay-setting') {
      el = document.createElement('input');
      el.id = id;
      el.type = 'range';
      el.min = '1';
      el.max = '10';
      el.value = '4.5';
      el.step = '0.5';
    }
    if (id === 'font-size-setting') {
      el = document.createElement('input');
      el.id = id;
      el.type = 'range';
      el.min = '20';
      el.max = '120';
      el.value = '96';
      el.step = '4';
    }
    if (id === 'voice-rate-setting') {
      el = document.createElement('input');
      el.id = id;
      el.type = 'range';
      el.min = '0.1';
      el.max = '1';
      el.value = '0.8';
      el.step = '0.1';
    }
    if (id === 'smart-timer-setting' || id === 'image-fit-setting') {
      el = document.createElement('input');
      el.id = id;
      el.type = 'checkbox';
    }
    if (id === 'edit-word-image-preview-img') {
      el = document.createElement('img');
      el.id = id;
    }
    if (id === 'save-sheet-settings') {
      el = document.createElement('button');
      el.id = id;
      el.disabled = true;
    }
    document.body.appendChild(el);
  });

  // Add display-mode radio buttons
  var settingsModal = document.getElementById('settings-modal');
  if (settingsModal) {
    ['english-first', 'chinese-first', 'mixed'].forEach(function(val) {
      var label = document.createElement('label');
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'display-mode';
      radio.value = val;
      if (val === 'english-first') radio.checked = true;
      label.appendChild(radio);
      settingsModal.appendChild(label);
    });
  }

  // Nest filter option containers inside their modals so querySelectorAll works
  var diffModal = document.getElementById('difficulty-filter-modal');
  var diffOpts = document.getElementById('difficulty-filter-options');
  if (diffModal && diffOpts) {
    diffModal.appendChild(diffOpts);
    [-1, 0, 1, 3, 5, 7, 10].forEach(function(val) {
      var label = document.createElement('label');
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'difficulty-filter';
      radio.value = String(val);
      if (val === 0) radio.checked = true;
      label.appendChild(radio);
      diffOpts.appendChild(label);
    });
  }

  var revModal = document.getElementById('review-filter-modal');
  var revOpts = document.getElementById('review-filter-options');
  if (revModal && revOpts) {
    revModal.appendChild(revOpts);
    ['all', 'never', '2weeks', '1month', '3months', '6months'].forEach(function(val) {
      var label = document.createElement('label');
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'review-filter';
      radio.value = val;
      if (val === 'all') radio.checked = true;
      label.appendChild(radio);
      revOpts.appendChild(label);
    });
  }

  var typeModal = document.getElementById('type-filter-modal');
  var typeOpts = document.getElementById('type-filter-options');
  if (typeModal && typeOpts) {
    typeModal.appendChild(typeOpts);
    ['word', 'phrase', 'sentence'].forEach(function(val) {
      var label = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.name = 'type-filter';
      cb.value = val;
      cb.checked = true;
      label.appendChild(cb);
      typeOpts.appendChild(label);
    });
  }

  var tagModal = document.getElementById('tag-filter-modal');
  var tagOpts = document.getElementById('tag-filter-options');
  if (tagModal && tagOpts) {
    tagModal.appendChild(tagOpts);
  }
}

// ============================================
// Mocks
// ============================================

function setupMocks() {
  // Mock google.script.run
  var mockRunner = {
    withSuccessHandler: function(fn) {
      mockRunner._successHandler = fn;
      return mockRunner;
    },
    withFailureHandler: function(fn) {
      mockRunner._failureHandler = fn;
      return mockRunner;
    }
  };

  // Add all GAS functions as no-ops
  var gasFunctions = [
    'getWordsFromSheet', 'getWordsFromSheets', 'getWordsFromSingleSheet', 'getWordsFromSheetsWithDuplicateDetection',
    'getDemoWords', 'getSheetsList', 'getSheetNamesOnly', 'getSheetWordCount', 'checkSheetExists',
    'updateWordProperties', 'updateWordDifficulty', 'markWordAsDifficult',
    'batchUpdateReviewDates', 'exportWordsToSheet',
    'detectDuplicateWords', 'handleDuplicateWordKeepOne', 'handleDuplicateWordMerge',
    'autoHandleSkippedDuplicatesInMemory', 'autoHandleSkippedDuplicates'
  ];
  gasFunctions.forEach(function(fn) {
    mockRunner[fn] = function() { return mockRunner; };
  });

  global.google = {
    script: {
      run: mockRunner
    }
  };

  // Mock speechSynthesis
  global.speechSynthesis = {
    speak: function() {},
    cancel: function() {},
    getVoices: function() { return []; },
    onvoiceschanged: null,
    speaking: false,
    pending: false,
    paused: false
  };

  global.SpeechSynthesisUtterance = function(text) {
    this.text = text;
    this.lang = '';
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
    this.onend = null;
    this.onerror = null;
  };

  // Mock alert / confirm
  global.alert = function() {};
  global.confirm = function() { return true; };
}

// ============================================
// Script Loading
// ============================================

/**
 * Load a script HTML file: read it, strip <script> tags, return the JS code.
 */
function loadScriptFile(filename) {
  var filePath = path.join(__dirname, '..', filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  var content = fs.readFileSync(filePath, 'utf8');
  // Strip HTML comment header, <script> and </script> tags
  content = content.replace(/<!--.*?-->/g, '');
  content = content.replace(/<\/?script>/gi, '');
  return content;
}

/**
 * Load FlashcardApp code from either:
 * - The monolithic script.html (if it exists)
 * - The split module files
 * Returns the concatenated JS code.
 */
function loadAllScripts() {
  // Try split files first
  var splitFiles = [
    'script-polyfills.html',
    'script-core.html',
    'script-events.html',
    'script-settings-modal.html',
    'script-difficulty.html',
    'script-display.html',
    'script-progress-bar.html',
    'script-voice.html',
    'script-export.html',
    'script-sheets.html',
    'script-duplicates.html',
    'script-filter.html',
    'script-edit-word.html',
    'script-search-word.html',
    'script-srs.html',
    'script-screen-awake.html',
    'script-quiz.html',
    'script-listening.html',
    'script-bootstrap.html'
  ];

  var splitContent = splitFiles.map(function(f) { return loadScriptFile(f); });
  var allSplitExist = splitContent.every(function(c) { return c !== null; });

  if (allSplitExist) {
    return splitContent.join('\n');
  }

  // Fall back to monolithic file
  var mono = loadScriptFile('script.html');
  if (mono) {
    return mono;
  }

  throw new Error('Cannot find script files. Need either script.html or split module files.');
}

// ============================================
// Bootstrap
// ============================================

/**
 * Initialize the test environment and load FlashcardApp.
 * Called automatically via setupFilesAfterFramework for each test file.
 */
function bootstrapApp() {
  // Reset DOM
  document.body.innerHTML = '';
  createDOMElements();
  setupMocks();

  // Use cached code from custom environment if available, otherwise load from disk
  var code = (typeof global.__FLASHCARD_SCRIPT_CODE__ !== 'undefined')
    ? global.__FLASHCARD_SCRIPT_CODE__
    : loadAllScripts();

  // We need to suppress the auto-initialization:
  // The script ends with `window.addEventListener('load', ...)` which creates `new FlashcardApp()`.
  // In test environment, we want to control when/if the constructor runs.
  // We'll wrap the code to capture FlashcardApp before the load event.
  // The load event won't fire automatically in jsdom unless we trigger it.

  // Execute the code and expose FlashcardApp globally.
  // new Function() creates a local scope, so we append code to export to global.
  var exportCode = code + '\n' +
    'if (typeof FlashcardApp !== "undefined") { global.FlashcardApp = FlashcardApp; }\n' +
    'if (typeof APP_CONSTANTS !== "undefined") { global.APP_CONSTANTS = APP_CONSTANTS; }\n' +
    'if (typeof formatDateYYYYMMDD !== "undefined") { global.formatDateYYYYMMDD = formatDateYYYYMMDD; }\n' +
    'if (typeof isModalBackgroundClick !== "undefined") { global.isModalBackgroundClick = isModalBackgroundClick; }\n' +
    'if (typeof getWordType !== "undefined") { global.getWordType = getWordType; }\n';
  var script = new Function(exportCode);
  script.call(global);
}

/**
 * Create a FlashcardApp instance with init() stubbed out.
 * Useful in tests that only need to exercise individual methods
 * without the full initialization side effects.
 */
function createApp() {
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  var app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;
  return app;
}

module.exports = {
  bootstrapApp: bootstrapApp,
  createApp: createApp,
  loadAllScripts: loadAllScripts,
  createDOMElements: createDOMElements,
  setupMocks: setupMocks
};
