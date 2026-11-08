/**
 * Tests for automatic grammar-role annotation.
 * Spec: openspec/specs/grammar-annotation/spec.md
 */

var setup = require('./setup');

describe('grammar annotation', function() {
  var app;

  beforeEach(function() {
    setup.bootstrapApp();
    app = setup.createApp();
  });

  function annotationFor(text, word) {
    var annotations = app.getGrammarAnnotations(text);
    for (var i = 0; i < annotations.length; i++) {
      if (annotations[i].text.toLowerCase() === word.toLowerCase()) {
        return annotations[i];
      }
    }
    return null;
  }

  test('is enabled by default', function() {
    expect(app.settings.grammarAnnotationEnabled).toBe(true);
  });

  test('classifies main verbs, auxiliary verbs, and BE verbs separately', function() {
    expect(annotationFor('She has eaten.', 'has').role).toBe('auxiliary');
    expect(annotationFor('She has eaten.', 'eaten').role).toBe('verb');
    expect(annotationFor('They will go.', 'will').role).toBe('auxiliary');
    expect(annotationFor('They will go.', 'go').role).toBe('verb');
    expect(annotationFor('He is a good boy.', 'is').role).toBe('be');
    expect(annotationFor('I am running.', 'am').role).toBe('be');
    expect(annotationFor('I am running.', 'running').role).toBe('verb');
  });

  test('recognises do-support and contractions', function() {
    expect(annotationFor('Do you like it?', 'do').role).toBe('auxiliary');
    expect(annotationFor('Do you like it?', 'like').role).toBe('verb');
    expect(annotationFor('Do you really like it?', 'like').role).toBe('verb');
    expect(annotationFor("I've finished.", "I've").role).toBe('auxiliary');
    expect(annotationFor("I've finished.", 'finished').role).toBe('verb');
    expect(annotationFor("I'm happy.", "I'm").role).toBe('be');
  });

  test('renders coloured spans without changing the visible text', function() {
    var element = document.getElementById('english-word');
    app.renderGrammarAnnotations(element, 'She has eaten.');

    expect(element.textContent).toBe('She has eaten.');
    expect(element.querySelectorAll('.grammar-auxiliary').length).toBe(1);
    expect(element.querySelectorAll('.grammar-verb').length).toBe(1);
    expect(element.querySelector('.grammar-auxiliary').textContent).toBe('has');
    expect(element.querySelector('.grammar-verb').textContent).toBe('eaten');
  });

  test('does not annotate when the setting is disabled', function() {
    var element = document.getElementById('english-word');
    app.settings.grammarAnnotationEnabled = false;
    app.setGrammarAnnotatedText(element, 'She has eaten.');

    expect(element.textContent).toBe('She has eaten.');
    expect(element.querySelectorAll('.grammar-verb, .grammar-auxiliary, .grammar-be').length).toBe(0);
  });

  test('saves the setting and updates the legend', function() {
    var toggle = document.getElementById('grammar-annotation-setting');
    var legend = document.getElementById('grammar-legend');
    toggle.checked = false;
    app.redisplayCurrentWord = jest.fn();

    app.saveSettingsAndClose();

    expect(app.settings.grammarAnnotationEnabled).toBe(false);
    expect(JSON.parse(localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.SETTINGS)).grammarAnnotationEnabled).toBe(false);
    expect(legend.classList.contains('show')).toBe(false);
    expect(app.redisplayCurrentWord).toHaveBeenCalled();
  });

  test('English-first text stays plain until Chinese is revealed', function() {
    var word = { english: 'She has eaten.', chinese: '她吃過了。' };
    var englishElement = document.getElementById('english-word');
    var chineseElement = document.getElementById('chinese-word');

    app.settings.displayMode = 'english-first';
    app.currentWords = [word];
    app.currentIndex = 0;
    app.setCardText(englishElement, word.english);

    expect(englishElement.querySelectorAll('.grammar-verb, .grammar-auxiliary, .grammar-be').length).toBe(0);

    app._revealSecondPart(word);

    expect(chineseElement.textContent).toBe('她吃過了。');
    expect(englishElement.querySelectorAll('.grammar-auxiliary').length).toBe(1);
    expect(englishElement.querySelectorAll('.grammar-verb').length).toBe(1);
  });

  test('Chinese-first English is annotated immediately when it appears', function() {
    var word = { english: 'She has eaten.', chinese: '她吃過了。' };
    var englishElement = document.getElementById('english-word');
    var chineseElement = document.getElementById('chinese-word');

    app.settings.displayMode = 'chinese-first';
    app.currentWords = [word];
    app.currentIndex = 0;
    app.setCardText(englishElement, word.chinese);

    app._revealSecondPart(word);

    expect(chineseElement.textContent).toBe('She has eaten.');
    expect(chineseElement.querySelectorAll('.grammar-auxiliary').length).toBe(1);
    expect(chineseElement.querySelectorAll('.grammar-verb').length).toBe(1);
  });
});
