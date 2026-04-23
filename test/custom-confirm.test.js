/**
 * Custom confirm dialog (replaces browser confirm in fullscreen)
 * Spec: openspec/specs/ui-shell/spec.md
 */
var setup = require('./setup');

describe('customConfirm', function() {
  var app;

  beforeEach(function() {
    app = setup.createApp();
  });

  test('displays modal with title and message', function() {
    app.customConfirm({ title: 'Test Title', message: 'Are you sure?' }, function() {});
    var modal = document.getElementById('custom-confirm-modal');
    var title = document.getElementById('custom-confirm-title');
    var message = document.getElementById('custom-confirm-message');
    expect(modal.style.display).toBe('flex');
    expect(title.textContent).toBe('Test Title');
    expect(message.textContent).toBe('Are you sure?');
  });

  test('uses default title when not provided', function() {
    app.customConfirm({ message: 'msg' }, function() {});
    var title = document.getElementById('custom-confirm-title');
    expect(title.textContent).toBe('確認');
  });

  test('shows warning when provided', function() {
    app.customConfirm({ warning: 'Danger!' }, function() {});
    var warning = document.getElementById('custom-confirm-warning');
    expect(warning.style.display).toBe('block');
    expect(warning.textContent).toBe('Danger!');
  });

  test('hides warning when not provided', function() {
    app.customConfirm({ message: 'msg' }, function() {});
    var warning = document.getElementById('custom-confirm-warning');
    expect(warning.style.display).toBe('none');
  });

  test('sets custom button text', function() {
    app.customConfirm({ confirmText: 'Yes', cancelText: 'No' }, function() {});
    var ok = document.getElementById('custom-confirm-ok');
    var cancel = document.getElementById('custom-confirm-cancel');
    expect(ok.textContent).toBe('Yes');
    expect(cancel.textContent).toBe('No');
  });

  test('calls onConfirm and closes on confirm click', function() {
    var confirmed = false;
    app.customConfirm({ message: 'test' }, function() { confirmed = true; });
    var ok = document.getElementById('custom-confirm-ok');
    ok.onclick();
    expect(confirmed).toBe(true);
    var modal = document.getElementById('custom-confirm-modal');
    expect(modal.style.display).toBe('none');
  });

  test('calls onCancel and closes on cancel click', function() {
    var cancelled = false;
    app.customConfirm({ message: 'test' }, function() {}, function() { cancelled = true; });
    var cancel = document.getElementById('custom-confirm-cancel');
    cancel.onclick();
    expect(cancelled).toBe(true);
    var modal = document.getElementById('custom-confirm-modal');
    expect(modal.style.display).toBe('none');
  });

  test('closes on background click (acts as cancel)', function() {
    var cancelled = false;
    app.customConfirm({ message: 'test' }, function() {}, function() { cancelled = true; });
    var modal = document.getElementById('custom-confirm-modal');
    modal.onclick({ target: modal });
    expect(cancelled).toBe(true);
    expect(modal.style.display).toBe('none');
  });

  test('background click on child element does not close', function() {
    app.customConfirm({ message: 'test' }, function() {});
    var modal = document.getElementById('custom-confirm-modal');
    var message = document.getElementById('custom-confirm-message');
    modal.onclick({ target: message });
    expect(modal.style.display).toBe('flex');
  });

  test('does not crash without onCancel', function() {
    app.customConfirm({ message: 'test' }, function() {});
    var cancel = document.getElementById('custom-confirm-cancel');
    expect(function() { cancel.onclick(); }).not.toThrow();
  });
});

describe('_closeTopmostModal (ESC key)', function() {
  var app;

  beforeAll(function() {
    setup.bootstrapApp();
  });

  beforeEach(function() {
    app = setup.createApp();
    app.resumeTimer = jest.fn();
    app.pauseTimer = jest.fn();
  });

  afterEach(function() {
    var modals = document.querySelectorAll('.modal');
    for (var i = 0; i < modals.length; i++) {
      modals[i].style.display = 'none';
    }
  });

  test('returns false when no modal is open', function() {
    expect(app._closeTopmostModal()).toBe(false);
  });

  test('closes custom-confirm-modal first (highest priority)', function() {
    var cancelled = false;
    app.customConfirm({ message: 'test' }, function() {}, function() { cancelled = true; });
    var settingsModal = document.getElementById('settings-modal');
    settingsModal.style.display = 'flex';

    var result = app._closeTopmostModal();
    expect(result).toBe(true);
    var confirmModal = document.getElementById('custom-confirm-modal');
    expect(confirmModal.style.display).toBe('none');
    expect(cancelled).toBe(true);
    expect(settingsModal.style.display).toBe('flex');
  });

  test('closes settings-modal', function() {
    var modal = document.getElementById('settings-modal');
    modal.style.display = 'flex';
    var result = app._closeTopmostModal();
    expect(result).toBe(true);
    expect(modal.style.display).toBe('none');
  });

  test('closes edit-word-modal', function() {
    app._wasPausedBeforeEdit = true;
    var modal = document.getElementById('edit-word-modal');
    modal.style.display = 'flex';
    var result = app._closeTopmostModal();
    expect(result).toBe(true);
    expect(modal.style.display).toBe('none');
  });

  test('closes quiz-modal', function() {
    app.quizState = { isActive: true };
    var modal = document.getElementById('quiz-modal');
    modal.style.display = 'flex';
    var result = app._closeTopmostModal();
    expect(result).toBe(true);
    expect(modal.style.display).toBe('none');
  });

  test('closes listening-modal', function() {
    app.listeningState = { isActive: true };
    var modal = document.getElementById('listening-modal');
    modal.style.display = 'flex';
    var result = app._closeTopmostModal();
    expect(result).toBe(true);
    expect(modal.style.display).toBe('none');
  });

  test('closes filter modals', function() {
    var ids = [
      'difficulty-filter-modal',
      'review-filter-modal',
      'type-filter-modal',
      'tag-filter-modal'
    ];
    for (var i = 0; i < ids.length; i++) {
      var modal = document.getElementById(ids[i]);
      modal.style.display = 'flex';
      var result = app._closeTopmostModal();
      expect(result).toBe(true);
      expect(modal.style.display).toBe('none');
    }
  });
});
