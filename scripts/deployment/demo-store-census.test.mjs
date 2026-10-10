import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectDemoStoreCensus, queries, scopedCountQuery } from './demo-store-census.mjs';

function fakeClient(overrides = {}) {
  const calls = [];
  const client = { query: async sql => {
    calls.push(sql);
    if (overrides.query) return overrides.query(sql);
    if (sql === queries.demos) return { rows: overrides.demos ?? [
      { demo_type: 'STORE_OWNER', count: 1 }, { demo_type: 'SUPPLIER', count: 1 },
    ] };
    if (sql === queries.columns) return { rows: overrides.columns ?? [
      { table_name: 'store_assets', column_name: 'organization_id' },
      { table_name: 'store_assets', column_name: 'created_by' },
    ] };
    if (sql.startsWith('WITH demo_orgs')) return { rows: [{ count: 15, store_demo_count: 10, supplier_demo_count: 0, unlinked_to_demo_count: 5 }] };
    return { rows: [] };
  } };
  return { client, calls };
}

test('inventory is one rolled-back read-only transaction and counts each table once', async () => {
  const { client, calls } = fakeClient();
  const result = await collectDemoStoreCensus(client);
  assert.equal(result.readOnly, true);
  assert.deepEqual(result.tableCounts, [{ table: 'store_assets', count: 15, store_demo_count: 10, supplier_demo_count: 0, unlinked_to_demo_count: 5 }]);
  assert.equal(calls[0], 'BEGIN READ ONLY');
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(calls.filter(sql => sql.startsWith('WITH demo_orgs')).length, 1);
  assert.ok(calls.every(sql => /^(SELECT|WITH demo_orgs|BEGIN READ ONLY|SET LOCAL|ROLLBACK)/.test(sql)));
});

test('missing, duplicated or ambiguous canonical Demo registry fails before other census queries', async () => {
  for (const demos of [[], [{demo_type:'STORE_OWNER',count:1}],
    [{demo_type:'STORE_OWNER',count:1},{demo_type:'STORE_OWNER',count:1}],
    [{demo_type:'STORE_OWNER',count:2},{demo_type:'SUPPLIER',count:1}]]) {
    const { client, calls } = fakeClient({ demos });
    await assert.rejects(collectDemoStoreCensus(client), /stage=demo-census; code=UNKNOWN/);
    assert.equal(calls.at(-1), 'ROLLBACK');
    assert.ok(!calls.includes(queries.organizations));
  }
});

test('invalid catalog identifier is rejected without executing its contents', async () => {
  const { client, calls } = fakeClient({ columns: [{table_name:'store_assets";DELETE',column_name:'user_id'}] });
  await assert.rejects(collectDemoStoreCensus(client), /code=UNKNOWN/);
  assert.ok(!calls.some(sql => sql.includes('DELETE')));
  assert.equal(calls.at(-1), 'ROLLBACK');
});

test('query errors roll back and never expose private database details', async () => {
  const { client, calls } = fakeClient({ query: async sql => {
    if (sql === queries.demos) throw Object.assign(new Error('private credential/row'), {code:'42501',detail:'private'});
    return { rows: [] };
  } });
  await assert.rejects(collectDemoStoreCensus(client), error => {
    assert.match(error.message, /code=42501/);
    assert.doesNotMatch(error.stack, /private/);
    return true;
  });
  assert.equal(calls.at(-1), 'ROLLBACK');
});

test('rollback failure aborts output rather than reporting a successful census', async () => {
  const { client } = fakeClient({ query: async sql => {
    if (sql === queries.demos) return {rows:[{demo_type:'STORE_OWNER',count:1},{demo_type:'SUPPLIER',count:1}]};
    if (sql === 'ROLLBACK') throw Object.assign(new Error('private connection'), {code:'ECONNRESET'});
    return { rows: [] };
  } });
  await assert.rejects(collectDemoStoreCensus(client), /stage=demo-rollback; code=ECONNRESET/);
});

test('supplier products and materials traverse canonical supplier identities and organizations', () => {
  for (const table of ['supplier_product_offers','neture_supplier_library_items']) {
    const sql = scopedCountQuery(table, ['supplier_id']);
    assert.match(sql, /FROM neture_suppliers s/);
    assert.match(sql, /t\.supplier_id::text IN \(SELECT id::text FROM demo_suppliers\)/);
    assert.match(sql, /s\.organization_id IN/);
    assert.match(sql, /supplier_demo_count/);
    assert.match(sql, /unlinked_to_demo_count/);
  }
  assert.match(queries.columns, /supplier_product_offers/);
  assert.match(queries.columns, /neture_supplier_library_items/);
  assert.match(queries.foreignKeys, /neture_suppliers/);
});

test('store assets count Demo user/organization scope separately from global totals', () => {
  const sql = scopedCountQuery('store_assets', ['organization_id','created_by']);
  assert.match(sql, /demo_orgs WHERE demo_type='STORE_OWNER'/);
  assert.match(sql, /t\."created_by"::text IN/);
  assert.match(sql, /store_demo_count/);
  assert.match(sql, /unlinked_to_demo_count/);
  assert.doesNotMatch(scopedCountQuery('store_assets',['service_key;DELETE']), /DELETE/);
});
