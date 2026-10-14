import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectProbes, queries, safeInventoryError, readPassword } from './pharmacy-hub-qr-probes.mjs';

test('failed secret subprocess never exposes captured output or original stack', () => {
  assert.throws(() => readPassword(() => {
    throw Object.assign(new Error('private secret'), { stdout: 'private password', stderr: 'private details' });
  }), error => {
    assert.match(error.message, /stage=read-secret; code=UNKNOWN/);
    assert.doesNotMatch(error.stack, /private/);
    assert.equal(error.stdout, undefined);
    return true;
  });
});

test('rollback failure preserves the failed query and network code', async () => {
  await assert.rejects(collectProbes({ query: async sql => {
    if (queries.includes(sql)) throw Object.assign(new Error('private row'), { code: 'ECONNRESET' });
    if (sql === 'ROLLBACK') throw new Error('private rollback');
    return { rows: [] };
  } }), /stage=query-1; code=ECONNRESET/);
});

test('diagnostics expose only a known code and fixed stage, never database error contents', () => {
  const error = { code: '28P01', message: 'private credential', detail: 'private row', stack: 'private stack' };
  assert.match(safeInventoryError(error, 'connect').message, /stage=connect; code=28P01/);
  assert.doesNotMatch(safeInventoryError(error, 'connect').stack, /private/);
  assert.match(safeInventoryError({ code: 'private credential' }, 'connect').message, /code=UNKNOWN/);
});
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


test('sanitizing a known database error twice preserves only its allowlisted code', () => {
  const first = safeInventoryError({ code: '42501', message: 'private row', detail: 'private secret' }, 'retirement-inventory');
  const second = safeInventoryError(first, 'retirement-census');
  assert.match(second.message, /code=42501/);
  assert.equal(second.code, '42501');
  assert.doesNotMatch(second.stack, /private/);
  assert.equal(second.detail, undefined);
});


test('standard SQLSTATE and schema context survive sanitization without original content', () => {
  for (const code of ['22P02', '42804', '42704', '42P18', '0A000', 'P0001', 'HV000', 'F0000', 'XX002']) {
    const first = safeInventoryError({ code, message: 'private row and credential' }, 'retirement-scope:service_catalog.service_key');
    const second = safeInventoryError(first, 'retirement-census');
    assert.equal(second.code, code);
    assert.match(second.message, /stage=retirement-scope:service_catalog.service_key/);
    assert.doesNotMatch(second.stack, /private/);
  }
});
