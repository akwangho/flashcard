var setup = require('./setup');

describe('Filter modal open/apply flows', function() {
  var app;

  beforeAll(function() {
    setup.bootstrapApp();
  });

  beforeEach(function() {
    app = new FlashcardApp();
    app.words = [
      { id: 0, english: 'apple', chinese: '蘋果', difficultyLevel: 0, lastReviewDate: '' },
      { id: 1, english: 'banana split', chinese: '香蕉船', difficultyLevel: 3, lastReviewDate: '2026-01-01' },
      { id: 2, english: 'cat', chinese: '貓', difficultyLevel: 5, lastReviewDate: '2026-02-19' },
      { id: 3, english: 'I love cats', chinese: '我愛貓', difficultyLevel: 0, lastReviewDate: '' }
    ];
    app.currentWords = app.words.slice();
    app.currentIndex = 0;
    app.difficultyFilter = 0;
    app.reviewFilter = 'all';
    app.typeFilter = ['word', 'phrase', 'sentence'];
    app.tagFilter = [];
    app.isPaused = false;

    app.pauseTimer = jest.fn();
    app.resumeTimer = jest.fn();
    app.updateDifficultyFilterButtonText = jest.fn();
    app.updateReviewFilterButtonText = jest.fn();
    app.updateTypeFilterButtonText = jest.fn();
    app.updateTagFilterButtonText = jest.fn();
    app.updateActiveFilterDisplay = jest.fn();
    app.displayCurrentWord = jest.fn();
    app.updateButtonStates = jest.fn();
    app.speakWord = jest.fn();
    app.speakChineseWord = jest.fn();
  });

  // ===========================================
  // Review Filter
  // ===========================================
  describe('openReviewFilterModal', function() {
    test('opens the modal', function() {
      app.openReviewFilterModal();
      var modal = document.getElementById('review-filter-modal');
      expect(modal.style.display).toBe('flex');
    });

    test('calls pauseTimer', function() {
      app.openReviewFilterModal();
      expect(app.pauseTimer).toHaveBeenCalled();
    });

    test('selects the current review filter radio', function() {
      app.reviewFilter = 'never';
      app.openReviewFilterModal();
      var modal = document.getElementById('review-filter-modal');
      var radios = modal.querySelectorAll('input[name="review-filter"]');
      var checkedValue = null;
      for (var i = 0; i < radios.length; i++) {
        if (radios[i].checked) checkedValue = radios[i].value;
      }
      expect(checkedValue).toBe('never');
    });
  });

  describe('applyReviewFilterFromModal', function() {
    test('reads selected radio value', function() {
      app.openReviewFilterModal();
      var modal = document.getElementById('review-filter-modal');
      var radios = modal.querySelectorAll('input[name="review-filter"]');
      for (var i = 0; i < radios.length; i++) {
        radios[i].checked = (radios[i].value === '1month');
      }
      app.applyReviewFilterFromModal();
      expect(app.reviewFilter).toBe('1month');
    });

    test('calls updateReviewFilterButtonText', function() {
      app.openReviewFilterModal();
      app.applyReviewFilterFromModal();
      expect(app.updateReviewFilterButtonText).toHaveBeenCalled();
    });

    test('closes the modal after applying', function() {
      app.openReviewFilterModal();
      app.applyReviewFilterFromModal();
      var modal = document.getElementById('review-filter-modal');
      expect(modal.style.display).toBe('none');
    });
  });

  describe('closeReviewFilterModal', function() {
    test('hides the modal', function() {
      app.openReviewFilterModal();
      app.closeReviewFilterModal();
      var modal = document.getElementById('review-filter-modal');
      expect(modal.style.display).toBe('none');
    });
  });

  // ===========================================
  // Difficulty Filter
  // ===========================================
  describe('openDifficultyFilterModal', function() {
    test('opens the modal', function() {
      app.openDifficultyFilterModal();
      var modal = document.getElementById('difficulty-filter-modal');
      expect(modal.style.display).toBe('flex');
    });

    test('selects the current difficulty filter radio', function() {
      app.difficultyFilter = 5;
      app.openDifficultyFilterModal();
      var modal = document.getElementById('difficulty-filter-modal');
      var radios = modal.querySelectorAll('input[name="difficulty-filter"]');
      var checkedValue = null;
      for (var i = 0; i < radios.length; i++) {
        if (radios[i].checked) checkedValue = parseInt(radios[i].value);
      }
      expect(checkedValue).toBe(5);
    });
  });

  describe('applyDifficultyFilterFromModal', function() {
    test('reads selected radio value', function() {
      app.openDifficultyFilterModal();
      var modal = document.getElementById('difficulty-filter-modal');
      var radios = modal.querySelectorAll('input[name="difficulty-filter"]');
      for (var i = 0; i < radios.length; i++) {
        radios[i].checked = (radios[i].value === '3');
      }
      app.applyDifficultyFilterFromModal();
      expect(app.difficultyFilter).toBe(3);
    });

    test('applies filter and updates currentWords', function() {
      app.openDifficultyFilterModal();
      var modal = document.getElementById('difficulty-filter-modal');
      var radios = modal.querySelectorAll('input[name="difficulty-filter"]');
      for (var i = 0; i < radios.length; i++) {
        radios[i].checked = (radios[i].value === '5');
      }
      app.applyDifficultyFilterFromModal();
      expect(app.currentWords.length).toBe(1);
      expect(app.currentWords[0].english).toBe('cat');
    });

    test('closes the modal after applying', function() {
      app.openDifficultyFilterModal();
      app.applyDifficultyFilterFromModal();
      var modal = document.getElementById('difficulty-filter-modal');
      expect(modal.style.display).toBe('none');
    });
  });

  describe('closeDifficultyFilterModal', function() {
    test('hides the modal', function() {
      app.openDifficultyFilterModal();
      app.closeDifficultyFilterModal();
      var modal = document.getElementById('difficulty-filter-modal');
      expect(modal.style.display).toBe('none');
    });
  });

  // ===========================================
  // getWordType
  // ===========================================
  describe('getWordType', function() {
    test('returns word for single word', function() {
      expect(getWordType('apple')).toBe('word');
    });

    test('returns phrase for multi-word without sentence punctuation', function() {
      expect(getWordType('hot dog')).toBe('phrase');
    });

    test('returns sentence for period ending', function() {
      expect(getWordType('I like cats.')).toBe('sentence');
    });

    test('returns sentence for question mark ending', function() {
      expect(getWordType('How are you?')).toBe('sentence');
    });

    test('returns sentence for exclamation mark ending', function() {
      expect(getWordType('Watch out!')).toBe('sentence');
    });

    test('returns sentence when ending with double quote after punctuation', function() {
      expect(getWordType('He said "hello."')).toBe('sentence');
    });

    test('returns sentence when ending with curly double quote after punctuation', function() {
      expect(getWordType('He said \u201Chello.\u201D')).toBe('sentence');
    });

    test('returns sentence when ending with single quote after punctuation', function() {
      expect(getWordType("She asked 'why?'")).toBe('sentence');
    });

    test('returns word for empty or undefined input', function() {
      expect(getWordType('')).toBe('word');
      expect(getWordType(undefined)).toBe('word');
    });
  });

  // ===========================================
  // Type Filter
  // ===========================================
  describe('openTypeFilterModal', function() {
    test('opens the modal', function() {
      app.openTypeFilterModal();
      var modal = document.getElementById('type-filter-modal');
      expect(modal.style.display).toBe('flex');
    });

    test('pre-selects current type filter', function() {
      app.typeFilter = ['word'];
      app.openTypeFilterModal();
      var modal = document.getElementById('type-filter-modal');
      var cbs = modal.querySelectorAll('input[name="type-filter"]');
      var checked = [];
      for (var i = 0; i < cbs.length; i++) {
        if (cbs[i].checked) checked.push(cbs[i].value);
      }
      expect(checked).toEqual(['word']);
    });
  });

  describe('applyTypeFilterFromModal', function() {
    test('reads checked values and sets typeFilter', function() {
      app.openTypeFilterModal();
      var modal = document.getElementById('type-filter-modal');
      var cbs = modal.querySelectorAll('input[name="type-filter"]');
      for (var i = 0; i < cbs.length; i++) {
        cbs[i].checked = (cbs[i].value === 'word' || cbs[i].value === 'phrase');
      }
      app.applyTypeFilterFromModal();
      expect(app.typeFilter).toEqual(['word', 'phrase']);
    });

    test('filters currentWords by type', function() {
      app.openTypeFilterModal();
      var modal = document.getElementById('type-filter-modal');
      var cbs = modal.querySelectorAll('input[name="type-filter"]');
      for (var i = 0; i < cbs.length; i++) {
        cbs[i].checked = (cbs[i].value === 'word');
      }
      app.applyTypeFilterFromModal();
      // only single-word items pass
      app.currentWords.forEach(function(w) {
        expect(w.english.indexOf(' ')).toBe(-1);
      });
    });

    test('alerts if no type selected', function() {
      var alertSpy = jest.spyOn(window, 'alert').mockImplementation(function() {});
      app.openTypeFilterModal();
      var modal = document.getElementById('type-filter-modal');
      var cbs = modal.querySelectorAll('input[name="type-filter"]');
      for (var i = 0; i < cbs.length; i++) cbs[i].checked = false;
      app.applyTypeFilterFromModal();
      expect(alertSpy).toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    test('closes the modal after applying', function() {
      app.openTypeFilterModal();
      app.applyTypeFilterFromModal();
      var modal = document.getElementById('type-filter-modal');
      expect(modal.style.display).toBe('none');
    });
  });

  // ===========================================
  // Tag Filter
  // ===========================================
  describe('openTagFilterModal', function() {
    test('opens the modal', function() {
      app.openTagFilterModal();
      var modal = document.getElementById('tag-filter-modal');
      expect(modal.style.display).toBe('flex');
    });

    test('generates checkboxes from word tags', function() {
      app.words[0].tags = ['animals'];
      app.words[1].tags = ['food', 'animals'];
      app.openTagFilterModal();
      var opts = document.getElementById('tag-filter-options');
      var cbs = opts.querySelectorAll('input[name="tag-filter"]');
      expect(cbs.length).toBe(2); // animals, food
    });
  });

  describe('applyTagFilterFromModal', function() {
    beforeEach(function() {
      app.words[0].tags = ['animals'];
      app.words[1].tags = ['food'];
      app.words[2].tags = ['animals'];
    });

    test('reads checked tag values', function() {
      app.openTagFilterModal();
      var opts = document.getElementById('tag-filter-options');
      var cbs = opts.querySelectorAll('input[name="tag-filter"]');
      for (var i = 0; i < cbs.length; i++) {
        cbs[i].checked = (cbs[i].value === 'animals');
      }
      app.applyTagFilterFromModal();
      expect(app.tagFilter).toEqual(['animals']);
    });

    test('filters currentWords by tag', function() {
      app.openTagFilterModal();
      var opts = document.getElementById('tag-filter-options');
      var cbs = opts.querySelectorAll('input[name="tag-filter"]');
      for (var i = 0; i < cbs.length; i++) {
        cbs[i].checked = (cbs[i].value === 'food');
      }
      app.applyTagFilterFromModal();
      expect(app.currentWords.length).toBe(1);
      expect(app.currentWords[0].english).toBe('banana split');
    });

    test('empty tag selection clears tagFilter', function() {
      app.openTagFilterModal();
      var opts = document.getElementById('tag-filter-options');
      var cbs = opts.querySelectorAll('input[name="tag-filter"]');
      for (var i = 0; i < cbs.length; i++) cbs[i].checked = false;
      app.applyTagFilterFromModal();
      expect(app.tagFilter).toEqual([]);
    });

    test('closes the modal after applying', function() {
      app.openTagFilterModal();
      app.applyTagFilterFromModal();
      var modal = document.getElementById('tag-filter-modal');
      expect(modal.style.display).toBe('none');
    });
  });

  // ===========================================
  // saveFilterSettings / loadFilterSettings
  // ===========================================
  describe('saveFilterSettings and loadFilterSettings', function() {
    beforeEach(function() {
      localStorage.clear();
    });

    test('round-trips all filter values', function() {
      app.difficultyFilter = 3;
      app.reviewFilter = '1month';
      app.mustSpellFilter = true;
      app.typeFilter = ['word', 'phrase'];
      app.tagFilter = ['animals'];
      app._srsSelectedCount = 30;
      app.srsReviewActive = true;
      app.saveFilterSettings();

      // Reset values
      app.difficultyFilter = 0;
      app.reviewFilter = 'all';
      app.mustSpellFilter = false;
      app.typeFilter = ['word', 'phrase', 'sentence'];
      app.tagFilter = [];

      app.loadFilterSettings();
      expect(app.difficultyFilter).toBe(3);
      expect(app.reviewFilter).toBe('1month');
      expect(app.mustSpellFilter).toBe(true);
      expect(app.typeFilter).toEqual(['word', 'phrase']);
      expect(app.tagFilter).toEqual(['animals']);
    });

    test('handles missing localStorage data', function() {
      app.difficultyFilter = 5;
      app.loadFilterSettings();
      // Should keep defaults or not crash
      expect(app.difficultyFilter).toBeDefined();
    });

    test('handles corrupted localStorage data', function() {
      localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.FILTER_SETTINGS, 'not-json');
      expect(function() { app.loadFilterSettings(); }).not.toThrow();
    });
  });

  // ===========================================
  // clearAllFilters
  // ===========================================
  describe('clearAllFilters', function() {
    test('resets all filter states', function() {
      app.difficultyFilter = 5;
      app.reviewFilter = '1month';
      app.mustSpellFilter = true;
      app.typeFilter = ['word'];
      app.tagFilter = ['animals'];
      app.clearAllFilters();
      expect(app.difficultyFilter).toBe(0);
      expect(app.reviewFilter).toBe('all');
      expect(app.mustSpellFilter).toBe(false);
      expect(app.typeFilter).toEqual(['word', 'phrase', 'sentence']);
      expect(app.tagFilter).toEqual([]);
    });
  });
});
