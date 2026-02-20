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
  // clearAllFilters
  // ===========================================
  describe('clearAllFilters', function() {
    test('resets all filter states', function() {
      app.difficultyFilter = 5;
      app.reviewFilter = '1month';
      app.mustSpellFilter = true;
      app.clearAllFilters();
      expect(app.difficultyFilter).toBe(0);
      expect(app.reviewFilter).toBe('all');
      expect(app.mustSpellFilter).toBe(false);
    });
  });
});
