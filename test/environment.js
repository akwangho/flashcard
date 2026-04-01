/**
 * Custom Jest test environment that caches script file content at the class level.
 * This avoids reading and concatenating the split script HTML files (~400KB) for each of the
 * 21 test suites. The file I/O happens once per worker process.
 */

var JsdomEnvironment = require('jest-environment-jsdom').TestEnvironment;
var setup = require('./setup');

var _cachedScriptCode = null;

class FlashcardTestEnvironment extends JsdomEnvironment {
  async setup() {
    await super.setup();
    if (!_cachedScriptCode) {
      _cachedScriptCode = setup.loadAllScripts();
    }
    this.global.__FLASHCARD_SCRIPT_CODE__ = _cachedScriptCode;
  }
}

module.exports = FlashcardTestEnvironment;
