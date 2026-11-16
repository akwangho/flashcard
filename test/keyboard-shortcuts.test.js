/**
 * Keyboard shortcuts use standard KeyboardEvent.code / key values.
 * Spec: openspec/specs/keyboard-shortcuts/spec.md
 */
const setup = require('./setup');

describe('modern keyboard shortcuts', () => {
  let app;

  beforeEach(() => {
    setup.bootstrapApp();
    app = setup.createApp();
    app._closeTopmostModal = () => false;
    app._anyModalOpen = () => false;
    app.setupKeyboardListeners();
  });

  afterEach(() => {
    if (app._keyboardKeyHandler) {
      document.removeEventListener('keydown', app._keyboardKeyHandler);
    }
  });

  it('maps ArrowRight through event.code', () => {
    const nextWord = jest.spyOn(app, 'nextWord').mockImplementation(() => {});

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'ArrowRight',
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true
    }));

    expect(nextWord).toHaveBeenCalledTimes(1);
  });

  it('maps the pause shortcut through event.code', () => {
    const togglePause = jest.spyOn(app, 'togglePause').mockImplementation(() => {});

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyB',
      key: 'b',
      bubbles: true,
      cancelable: true
    }));

    expect(togglePause).toHaveBeenCalledTimes(1);
  });

  it('does not intercept shortcuts while a text input has focus', () => {
    const input = document.getElementById('search-word-input');
    const nextWord = jest.spyOn(app, 'nextWord').mockImplementation(() => {});
    input.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'ArrowRight',
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true
    }));

    expect(nextWord).not.toHaveBeenCalled();
  });
});
