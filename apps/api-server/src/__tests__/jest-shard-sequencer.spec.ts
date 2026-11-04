import path from 'node:path';
import fs from 'node:fs';
import Balanced from './setup/jest-shard-sequencer.cjs';
import Standard from '@jest/test-sequencer';
import hints from './setup/jest-shard-durations.json';
import config from '../../jest.config.cjs';
const root = path.resolve(__dirname, '../..');
const initialStrategy = process.env.O4O_JEST_SHARD_STRATEGY;
const item = (relative: string) => ({ path: path.join(root, relative), context: { config: { rootDir: root } } });
const names = (tests: Array<{ path: string }>) => tests.map(test => path.relative(root, test.path));
const partitions = (sequencer: any, tests: any[], count: number) => Array.from({ length: count }, (_, i) =>
  sequencer.shard(tests, { shardIndex: i + 1, shardCount: count }));

beforeEach(() => { delete process.env.O4O_JEST_SHARD_STRATEGY; });
afterEach(() => {
  if (initialStrategy === undefined) delete process.env.O4O_JEST_SHARD_STRATEGY;
  else process.env.O4O_JEST_SHARD_STRATEGY = initialStrategy;
});

describe('API Jest full-suite shard scheduling', () => {
  it('partitions all discovered tests exactly once, including new/unmeasured tests', () => {
    const tests = [...Object.keys(hints.seconds), ...Array.from({ length: 301 }, (_, i) => `src/__tests__/new-${i}.spec.ts`)].map(item);
    for (const count of [1, 2, 3, 4, 7]) {
      const bins = partitions(new Balanced(), tests, count);
      const all = bins.flat();
      expect(all).toHaveLength(tests.length);
      expect(new Set(names(all)).size).toBe(tests.length);
      expect(names(all).sort()).toEqual(names(tests).sort());
    }
    expect(partitions(new Balanced(), [], 3)).toEqual([[], [], []]);
    expect(partitions(new Balanced(), [item('src/new.test.ts')], 4).flat()).toHaveLength(1);
  });

  it('computes the same bins regardless of discovery order', () => {
    const paths = [...Object.keys(hints.seconds), ...Array.from({ length: 100 }, (_, i) => `src/test-${i}.test.ts`)];
    const tests = paths.map(item);
    const expected = partitions(new Balanced(), tests, 3).map(names);
    expect(partitions(new Balanced(), [...tests].reverse(), 3).map(names)).toEqual(expected);
    // The real runners use one API root per checkout. Only relative paths enter the weights/ties.
    expect(new Set(expected.flat()).size).toBe(paths.length);
  });

  it('spreads measured slow suites while retaining every unmeasured suite', () => {
    const tests = [...Object.keys(hints.seconds), ...Array.from({ length: 300 }, (_, i) => `src/new-${i}.spec.ts`)].map(item);
    const loads = partitions(new Balanced(), tests, 3).map(bin => bin.reduce((sum: number, test: any) => {
      const relative = path.relative(root, test.path).split(path.sep).join('/');
      return sum + (hints.seconds[relative] ?? hints.defaultSeconds);
    }, 0));
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(hints.defaultSeconds);
  });

  it('keeps standard Jest execution order and result caching', () => {
    expect(Balanced.prototype.sort).toBe(Standard.prototype.sort);
    expect(Balanced.prototype.cacheResults).toBe(Standard.prototype.cacheResults);
    expect(config.maxWorkers).toBe(1);
    expect(config.testSequencer).toBe('<rootDir>/src/__tests__/setup/jest-shard-sequencer.cjs');
  });

  it('hash rollback returns the exact standard Jest partition', () => {
    const tests = [...Object.keys(hints.seconds), 'src/new.test.ts'].map(item);
    process.env.O4O_JEST_SHARD_STRATEGY = 'hash';
    expect(partitions(new Balanced(), tests, 3).map(names)).toEqual(partitions(new Standard(), tests, 3).map(names));
    const workflow = fs.readFileSync(path.join(root, '../../.github/workflows/ci-pipeline.yml'), 'utf8');
    expect(workflow).toContain('O4O_JEST_SHARD_STRATEGY: ${{ vars.O4O_JEST_SHARD_STRATEGY }}');
    expect(workflow).toContain('npx jest --maxWorkers=1 --shard=${{ matrix.shard }}/3');
  });

  it('rejects invalid shard requests instead of silently omitting tests', () => {
    for (const options of [{ shardIndex: 0, shardCount: 3 }, { shardIndex: 4, shardCount: 3 },
      { shardIndex: 1, shardCount: 0 }, { shardIndex: 1.5, shardCount: 3 }]) {
      expect(() => new Balanced().shard([item('src/new.test.ts')], options)).toThrow('Invalid API Jest shard index/count');
    }
  });
});
