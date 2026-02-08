/**
 * Tests for Google Sheet methods: extractSheetId
 */
var setup = require('./setup');

var app;

beforeAll(function() {
  setup.bootstrapApp();
  var origInit = FlashcardApp.prototype.init;
  FlashcardApp.prototype.init = function() {};
  app = new FlashcardApp();
  FlashcardApp.prototype.init = origInit;
});

describe('extractSheetId', function() {

  test('extracts ID from full Google Sheets URL', function() {
    var url = 'https://docs.google.com/spreadsheets/d/1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM/edit';
    expect(app.extractSheetId(url)).toBe('1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM');
  });

  test('extracts ID from URL with fragment', function() {
    var url = 'https://docs.google.com/spreadsheets/d/1ABC123DEF456/edit#gid=0';
    expect(app.extractSheetId(url)).toBe('1ABC123DEF456');
  });

  test('extracts ID from URL with query params', function() {
    var url = 'https://docs.google.com/spreadsheets/d/1ABC123DEF456/edit?usp=sharing';
    expect(app.extractSheetId(url)).toBe('1ABC123DEF456');
  });

  test('returns raw ID when given just the ID', function() {
    expect(app.extractSheetId('1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM')).toBe('1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM');
  });

  test('handles ID with hyphens and underscores', function() {
    expect(app.extractSheetId('abc-123_DEF')).toBe('abc-123_DEF');
  });

  test('trims whitespace from input', function() {
    expect(app.extractSheetId('  1ABC123DEF456  ')).toBe('1ABC123DEF456');
  });

  test('throws for invalid input', function() {
    expect(function() {
      app.extractSheetId('not a valid id!!');
    }).toThrow();
  });

  test('throws for URL without sheet ID', function() {
    expect(function() {
      app.extractSheetId('https://docs.google.com/spreadsheets/');
    }).toThrow();
  });
});
