/**
 * Deep Merge Tests
 * Tests for deep object merging utility
 */

import { deepMerge, deepMergeAll } from '../utils/deep-merge.js';

describe('Deep Merge', () => {
  describe('deepMerge - Basic', () => {
    it('should merge simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };

      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should not mutate target', () => {
      const target = { a: 1 };
      const source = { b: 2 };

      deepMerge(target, source);

      expect(target).toEqual({ a: 1 });
    });

    it('should handle empty source', () => {
      const target = { a: 1 };
      const source = {};

      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1 });
    });

    it('should handle empty target', () => {
      const target = {};
      const source = { a: 1 };

      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1 });
    });
  });

  describe('deepMerge - Nested Objects', () => {
    it('should merge nested objects', () => {
      const target = {
        a: { b: 1, c: 2 },
        d: 3,
      };
      const source = {
        a: { c: 4, e: 5 },
        f: 6,
      };

      const result = deepMerge(target, source);

      expect(result).toEqual({
        a: { b: 1, c: 4, e: 5 },
        d: 3,
        f: 6,
      });
    });

    it('should handle deeply nested objects (3+ levels)', () => {
      const target = {
        level1: {
          level2: {
            level3: {
              value: 'old',
            },
          },
        },
      };
      const source = {
        level1: {
          level2: {
            level3: {
              value: 'new',
              extra: 'data',
            },
          },
        },
      };

      const result = deepMerge(target, source);

      expect(result.level1.level2.level3.value).toBe('new');
      expect(result.level1.level2.level3.extra).toBe('data');
    });

    it('should preserve unaffected nested properties', () => {
      const target = {
        colors: {
          primary: '#0073aa',
          secondary: '#ff6b6b',
        },
        typography: {
          fontSize: 16,
        },
      };
      const source = {
        colors: {
          primary: '#3b82f6',
        },
      };

      const result = deepMerge(target, source);

      expect(result.colors.primary).toBe('#3b82f6');
      expect(result.colors.secondary).toBe('#ff6b6b');
      expect(result.typography.fontSize).toBe(16);
    });
  });

  describe('deepMerge - Arrays', () => {
    it('should replace arrays', () => {
      const target = { arr: [1, 2, 3] };
      const source = { arr: [4, 5] };

      const result = deepMerge(target, source);

      expect(result.arr).toEqual([4, 5]);
    });

    it('should not mutate source array', () => {
      const target = { arr: [1, 2] };
      const source = { arr: [3, 4] };

      const result = deepMerge(target, source);
      result.arr.push(5);

      expect(source.arr).toEqual([3, 4]);
    });

    it('should handle nested arrays', () => {
      const target = {
        data: {
          items: [1, 2, 3],
        },
      };
      const source = {
        data: {
          items: [4, 5],
        },
      };

      const result = deepMerge(target, source);

      expect(result.data.items).toEqual([4, 5]);
    });
  });

  describe('deepMerge - Null and Undefined', () => {
    it('should handle null source value (overwrite)', () => {
      const target = { a: 'value' };
      const source = { a: null };

      const result = deepMerge(target, source);

      expect(result.a).toBeNull();
    });

    it('should skip undefined source values', () => {
      const target = { a: 'value' };
      const source = { a: undefined };

      const result = deepMerge(target, source);

      expect(result.a).toBe('value');
    });

    it('should handle null target value', () => {
      const target = { a: null };
      const source = { a: 'value' };

      const result = deepMerge(target, source);

      expect(result.a).toBe('value');
    });

    it('should preserve null in nested objects', () => {
      const target = {
        logo: {
          desktop: 'logo.png',
          mobile: null,
        },
      };
      const source = {
        logo: {
          desktop: 'new-logo.png',
        },
      };

      const result = deepMerge(target, source);

      expect(result.logo.desktop).toBe('new-logo.png');
      expect(result.logo.mobile).toBeNull();
    });
  });

  describe('deepMerge - Special Objects', () => {
    it('should handle Date objects', () => {
      const date = new Date('2025-01-01');
      const target = { created: new Date('2024-01-01') };
      const source = { created: date };

      const result = deepMerge(target, source);

      expect(result.created).toBe(date);
    });

    it('should handle RegExp objects', () => {
      const regex = /test/;
      const target = { pattern: /old/ };
      const source = { pattern: regex };

      const result = deepMerge(target, source);

      expect(result.pattern).toBe(regex);
    });
  });

  describe('deepMerge - Real-world Scenarios', () => {
    it('should merge customizer settings (scrollToTop)', () => {
      const existing = {
        enabled: true,
        displayType: 'both' as const,
        threshold: 300,
        backgroundColor: '#3b82f6',
      };
      const update = {
        enabled: false,
        threshold: 500,
      };

      const result = deepMerge(existing, update);

      expect(result.enabled).toBe(false);
      expect(result.displayType).toBe('both');
      expect(result.threshold).toBe(500);
      expect(result.backgroundColor).toBe('#3b82f6');
    });

    it('should merge button settings with nested objects', () => {
      const existing = {
        primary: {
          backgroundColor: '#3b82f6',
          textColor: '#ffffff',
          fontSize: { desktop: 16, tablet: 15, mobile: 14 },
        },
      };
      const update = {
        primary: {
          backgroundColor: '#10b981',
          fontSize: { desktop: 18 },
        },
      };

      const result = deepMerge(existing, update);

      expect(result.primary.backgroundColor).toBe('#10b981');
      expect(result.primary.textColor).toBe('#ffffff');
      expect(result.primary.fontSize.desktop).toBe(18);
      expect(result.primary.fontSize.tablet).toBe(15);
    });

    it('should merge breadcrumbs settings', () => {
      const existing = {
        enabled: true,
        position: 'below-header' as const,
        homeText: 'Home',
        separator: '>' as const,
        linkColor: '#3b82f6',
        fontSize: { desktop: 14, tablet: 13, mobile: 12 },
      };
      const update = {
        enabled: false,
        homeText: 'Start',
        fontSize: { desktop: 16 },
      };

      const result = deepMerge(existing, update);

      expect(result.enabled).toBe(false);
      expect(result.position).toBe('below-header');
      expect(result.homeText).toBe('Start');
      expect(result.fontSize.desktop).toBe(16);
      expect(result.fontSize.tablet).toBe(13);
    });
  });

  describe('deepMergeAll', () => {
    it('should merge multiple objects', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      const obj3 = { c: 3 };

      const result = deepMergeAll(obj1, obj2, obj3);

      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should handle empty array', () => {
      const result = deepMergeAll();

      expect(result).toEqual({});
    });

    it('should merge in order (later overrides earlier)', () => {
      const obj1 = { a: 1, b: 1 };
      const obj2 = { a: 2, c: 2 };
      const obj3 = { a: 3 };

      const result = deepMergeAll(obj1, obj2, obj3);

      expect(result).toEqual({ a: 3, b: 1, c: 2 });
    });

    it('should handle nested objects in multiple sources', () => {
      const obj1 = { config: { a: 1, b: 2 } };
      const obj2 = { config: { b: 3, c: 4 } };
      const obj3 = { config: { d: 5 } };

      const result = deepMergeAll(obj1, obj2, obj3);

      expect(result.config).toEqual({ a: 1, b: 3, c: 4, d: 5 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very deep nesting (10+ levels)', () => {
      const target: any = {};
      const source: any = {};

      let targetRef = target;
      let sourceRef = source;

      for (let i = 0; i < 10; i++) {
        targetRef.nested = { value: i };
        sourceRef.nested = {};
        targetRef = targetRef.nested;
        sourceRef = sourceRef.nested;
      }

      sourceRef.value = 999;

      const result = deepMerge(target, source);

      let ref = result;
      for (let i = 0; i < 10; i++) {
        ref = ref.nested;
      }

      expect(ref.value).toBe(999);
    });

    it('should handle large objects (100+ keys)', () => {
      const target: any = {};
      const source: any = {};

      for (let i = 0; i < 100; i++) {
        target[`key${i}`] = i;
        if (i % 2 === 0) {
          source[`key${i}`] = i * 2;
        }
      }

      const result = deepMerge(target, source);

      expect(Object.keys(result).length).toBe(100);
      expect(result.key0).toBe(0);
      expect(result.key1).toBe(1);
    });

    it('should handle mixed types', () => {
      const target = {
        string: 'text',
        number: 42,
        boolean: true,
        array: [1, 2],
        object: { nested: 'value' },
        nullValue: null,
      };
      const source = {
        string: 'new text',
        number: 100,
      };

      const result = deepMerge(target, source);

      expect(result.string).toBe('new text');
      expect(result.number).toBe(100);
      expect(result.boolean).toBe(true);
      expect(result.array).toEqual([1, 2]);
    });
  });
});
