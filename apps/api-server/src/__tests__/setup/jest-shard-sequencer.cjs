const Sequencer = require('@jest/test-sequencer').default;
const path = require('node:path');
const durations = require('./jest-shard-durations.json');
const apiRoot = path.resolve(__dirname, '../../..');

// Timings are scheduling hints, never a persisted list of tests to execute.
if (durations.schemaVersion !== 1 || !Number.isFinite(durations.defaultSeconds) || durations.defaultSeconds <= 0 ||
    !durations.seconds || typeof durations.seconds !== 'object' ||
    Object.values(durations.seconds).some(value => !Number.isFinite(value) || value <= 0)) {
  throw new Error('Invalid API Jest shard duration hints');
}
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

module.exports = class BalancedApiSequencer extends Sequencer {
  shard(tests, options) {
    if (process.env.O4O_JEST_SHARD_STRATEGY === 'hash') return super.shard(tests, options);
    const { shardIndex, shardCount } = options;
    if (!Number.isInteger(shardCount) || !Number.isInteger(shardIndex) || shardCount < 1 || shardIndex < 1 || shardIndex > shardCount) {
      throw new Error('Invalid API Jest shard index/count');
    }
    const bins = Array.from({ length: shardCount }, () => ({ tests: [], seconds: 0 }));
    const weighted = tests.map(test => {
      const relative = path.relative(apiRoot, test.path).split(path.sep).join('/');
      const seconds = Object.hasOwn(durations.seconds, relative) ? durations.seconds[relative] : durations.defaultSeconds;
      return { test, relative, seconds };
    }).sort((a, b) => b.seconds - a.seconds || compare(a.relative, b.relative));

    for (const entry of weighted) {
      // Stable ties make every runner compute the same partition from discovery.
      let bin = bins[0];
      for (const candidate of bins) {
        if (candidate.seconds < bin.seconds ||
            (candidate.seconds === bin.seconds && candidate.tests.length < bin.tests.length)) bin = candidate;
      }
      bin.tests.push(entry.test);
      bin.seconds += entry.seconds;
    }
    return bins[shardIndex - 1].tests;
  }
};
