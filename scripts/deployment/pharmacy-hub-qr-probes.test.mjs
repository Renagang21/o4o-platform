import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectProbes, queries } from './pharmacy-hub-qr-probes.mjs';
test('collects only existing active paths in a rolled-back read-only transaction', async () => {
  const statements = [];
  let index = 0;
  const client = { query: async sql => {
    statements.push(sql);
    return { rows: queries.includes(sql) ? [{ path: `/actual-${++index}` }] : [] };
  } };
  assert.deepEqual(await collectProbes(client), ['/actual-1', '/actual-2', '/actual-3', '/actual-4']);
  assert.equal(statements[0], 'BEGIN READ ONLY');
  assert.equal(statements.at(-1), 'ROLLBACK');
  assert.ok(queries.every(sql => sql.startsWith('SELECT ') && !/INSERT|UPDATE|DELETE|DROP/.test(sql)));
});
test('missing families are not filled with guessed public identifiers', async () => {
  assert.deepEqual(await collectProbes({ query: async () => ({ rows: [] }) }), []);
});
test('a query error still rolls back and never returns partial paths', async () => {
  const calls = [];
  await assert.rejects(collectProbes({ query: async sql => {
    calls.push(sql);
    if (queries.includes(sql)) throw new Error('schema mismatch');
    return { rows: [] };
  } }));
  assert.equal(calls.at(-1), 'ROLLBACK');
});
