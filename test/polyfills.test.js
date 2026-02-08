/**
 * Tests for ES5 polyfills (forEach, filter, map, find, includes)
 */
var setup = require('./setup');

beforeAll(function() {
  setup.bootstrapApp();
});

describe('ES5 Polyfills', function() {

  describe('Array.prototype.forEach', function() {
    test('iterates over all elements', function() {
      var result = [];
      [1, 2, 3].forEach(function(item) {
        result.push(item);
      });
      expect(result).toEqual([1, 2, 3]);
    });

    test('provides correct index and array arguments', function() {
      var indices = [];
      var arr = ['a', 'b', 'c'];
      arr.forEach(function(item, index, array) {
        indices.push(index);
        expect(array).toBe(arr);
      });
      expect(indices).toEqual([0, 1, 2]);
    });

    test('handles empty array', function() {
      var called = false;
      [].forEach(function() { called = true; });
      expect(called).toBe(false);
    });
  });

  describe('Array.prototype.filter', function() {
    test('filters elements by predicate', function() {
      var result = [1, 2, 3, 4, 5].filter(function(n) { return n > 3; });
      expect(result).toEqual([4, 5]);
    });

    test('returns empty array when nothing matches', function() {
      var result = [1, 2, 3].filter(function(n) { return n > 10; });
      expect(result).toEqual([]);
    });

    test('returns all elements when everything matches', function() {
      var result = [1, 2, 3].filter(function() { return true; });
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('Array.prototype.map', function() {
    test('maps elements through function', function() {
      var result = [1, 2, 3].map(function(n) { return n * 2; });
      expect(result).toEqual([2, 4, 6]);
    });

    test('handles empty array', function() {
      var result = [].map(function(n) { return n * 2; });
      expect(result).toEqual([]);
    });

    test('provides index to callback', function() {
      var result = ['a', 'b'].map(function(item, i) { return item + i; });
      expect(result).toEqual(['a0', 'b1']);
    });
  });

  describe('Array.prototype.find', function() {
    test('finds first matching element', function() {
      var result = [1, 2, 3, 4].find(function(n) { return n > 2; });
      expect(result).toBe(3);
    });

    test('returns undefined when no match', function() {
      var result = [1, 2, 3].find(function(n) { return n > 10; });
      expect(result).toBeUndefined();
    });

    test('finds objects by property', function() {
      var items = [{id: 1, name: 'a'}, {id: 2, name: 'b'}];
      var result = items.find(function(item) { return item.id === 2; });
      expect(result).toEqual({id: 2, name: 'b'});
    });
  });

  describe('Array.prototype.includes', function() {
    test('returns true when element exists', function() {
      expect([1, 2, 3].includes(2)).toBe(true);
    });

    test('returns false when element does not exist', function() {
      expect([1, 2, 3].includes(4)).toBe(false);
    });

    test('works with strings', function() {
      expect(['hello', 'world'].includes('hello')).toBe(true);
      expect(['hello', 'world'].includes('foo')).toBe(false);
    });

    test('works with empty array', function() {
      expect([].includes(1)).toBe(false);
    });
  });
});
