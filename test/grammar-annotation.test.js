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

  test('does not mark predicate adjectives such as glad as verbs', function() {
    var sentence = 'I am glad to see you here again.';
    expect(annotationFor(sentence, 'am').role).toBe('be');
    expect(annotationFor(sentence, 'see').role).toBe('verb');
    expect(annotationFor(sentence, 'glad')).toBeNull();
    expect(annotationFor('I am happy to help.', 'happy')).toBeNull();
    expect(annotationFor('He is ready to go.', 'ready')).toBeNull();
    expect(annotationFor('They are willing to try.', 'willing')).toBeNull();
  });

  test('keeps progressive and passive participles as verbs', function() {
    expect(annotationFor('I am running.', 'running').role).toBe('verb');
    expect(annotationFor('The food is eaten.', 'eaten').role).toBe('verb');
    expect(annotationFor('The dog was called Tom.', 'called').role).toBe('verb');
  });

  test('does not mark phrasal-verb particles as verbs', function() {
    expect(annotationFor('I look forward to seeing you.', 'look').role).toBe('verb');
    expect(annotationFor('I look forward to seeing you.', 'forward')).toBeNull();
    expect(annotationFor('Please give up the bag.', 'give').role).toBe('verb');
    expect(annotationFor('Please give up the bag.', 'up')).toBeNull();
  });

  test('recognises do-support and contractions', function() {
    expect(annotationFor('Do you like it?', 'do').role).toBe('auxiliary');
    expect(annotationFor('Do you like it?', 'like').role).toBe('verb');
    expect(annotationFor('Do you really like it?', 'like').role).toBe('verb');
    expect(annotationFor("I've finished.", "I've").role).toBe('auxiliary');
    expect(annotationFor("I've finished.", 'finished').role).toBe('verb');
    expect(annotationFor("I'm happy.", "I'm").role).toBe('be');
  });

  test('annotates every sentence in a multi-sentence card', function() {
    var sentence = 'Does he have a fever? No, he doesn\'t. He has a cough.';
    var annotations = app.getGrammarAnnotations(sentence);
    var roles = {};
    for (var i = 0; i < annotations.length; i++) {
      roles[annotations[i].text.toLowerCase()] = annotations[i].role;
      expect(sentence.substring(annotations[i].start, annotations[i].end)).toBe(annotations[i].text);
    }

    expect(roles.does).toBe('auxiliary');
    expect(roles.have).toBe('verb');
    expect(roles["doesn't"]).toBe('auxiliary');
    expect(roles.has).toBe('verb');
    expect(annotations.length).toBe(4);

    var element = document.getElementById('english-word');
    app.renderGrammarAnnotations(element, sentence);
    expect(element.textContent).toBe(sentence);
    expect(element.querySelectorAll('.grammar-auxiliary').length).toBe(2);
    expect(element.querySelectorAll('.grammar-verb').length).toBe(2);
  });

  test('keeps sentence contexts separate in multi-sentence cards', function() {
    var sentence = 'He goes home. She comes back.';
    var annotations = app.getGrammarAnnotations(sentence);
    var verbs = [];
    for (var i = 0; i < annotations.length; i++) {
      if (annotations[i].role === 'verb') verbs.push(annotations[i].text);
    }
    expect(verbs).toEqual(['goes', 'comes']);
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

  test('annotates sentences only, not words or phrases', function() {
    var element = document.getElementById('english-word');

    app.setGrammarAnnotatedText(element, 'run');
    expect(element.querySelectorAll('.grammar-verb, .grammar-auxiliary, .grammar-be').length).toBe(0);

    app.setGrammarAnnotatedText(element, 'run quickly');
    expect(element.querySelectorAll('.grammar-verb, .grammar-auxiliary, .grammar-be').length).toBe(0);

    app.setGrammarAnnotatedText(element, 'I run.');
    expect(element.querySelectorAll('.grammar-verb').length).toBe(1);
    expect(element.querySelector('.grammar-verb').textContent).toBe('run');
  });

  test('shows the legend only for the current sentence', function() {
    var legend = document.getElementById('grammar-legend');
    app.currentWords = [{ english: 'run', chinese: '跑' }];
    app.currentIndex = 0;
    app.updateGrammarLegendVisibility();
    expect(legend.classList.contains('show')).toBe(false);

    app.currentWords = [{ english: 'I run.', chinese: '我跑。' }];
    app.updateGrammarLegendVisibility();
    expect(legend.classList.contains('show')).toBe(true);
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
