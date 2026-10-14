import { performance } from 'node:perf_hooks';
import { extractJson } from '../services/ai-tools/work-planner.js';

describe('planner response JSON boundaries', () => {
  it.each([
    '{}',
    '```json\n{"assessment":"progress","action":{"kind":"observe"}}\n```',
    'prefix {"text":"a } brace and { another","nested":{"value":1}} suffix',
  ])('preserves greedy extraction from a wrapped response: %s', (source) => {
    const previous = source.match(/\{[\s\S]*\}/);
    expect(extractJson(source)).toEqual(JSON.parse(previous![0]));
  });

  it.each(['', 'plain text', '}} before {{', '{{{{'])('rejects a missing object: %s', (source) => {
    expect(() => extractJson(source)).toThrow('planner: no json');
  });

  it.each(['{} {}', '{invalid}', '{"value":1'])('keeps malformed/multiple objects invalid: %s', (source) => {
    expect(() => extractJson(source)).toThrow();
  });

  it('rejects a large unterminated response without quadratic rescanning', () => {
    const source = '{'.repeat(100_000);
    const started = performance.now();
    expect(() => extractJson(source)).toThrow('planner: no json');
    // The previous regexp took seconds for this shape; allow ample CI headroom.
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
