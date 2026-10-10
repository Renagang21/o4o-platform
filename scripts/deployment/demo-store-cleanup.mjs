/** Explicit test-store deletion; identities/suppliers/operators are never deletion roots. */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { stableJson, storeFingerprint, STORE_INVENTORY_CUTOFF } from './demo-store-relink.mjs';
import { readPassword, safeInventoryError } from './pharmacy-hub-qr-probes.mjs';

class CleanupStop extends Error {}
function safeCleanupError(error,stage) {
  return error instanceof CleanupStop ? error : safeInventoryError(error,stage);
}
export function quoteIdentifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new CleanupStop('Unsupported identifier');
  return `"${value}"`;
}
export function validateTargets(keep, targets, apply) {
  if (!/^[a-f0-9]{64}$/.test(keep)) throw new CleanupStop('Explicit original store fingerprint required');
  if (targets.some(x => !/^[a-f0-9]{64}$/.test(x)) || new Set(targets).size !== targets.length || targets.includes(keep)) throw new CleanupStop('Invalid deletion targets');
  if (apply && !targets.length) throw new CleanupStop('Apply requires exact deletion targets');
}
export function rowKey(table, row, keys) {
  if (!keys?.length || keys.some(k => row[k] == null)) throw new CleanupStop('Affected row lacks primary key');
  return table + ':' + stableJson(keys.map(k => row[k]));
}
export function deletionOrder(tables, edges) {
  const remaining = new Set(tables); const result = [];
  while (remaining.size) {
    const leaves = [...remaining].filter(parent => !edges.some(e => e.parent === parent && e.child !== parent && remaining.has(e.child)));
    if (!leaves.length) throw new CleanupStop('Cyclic deletion graph requires explicit disposition');
    leaves.sort((a,b) => a.localeCompare(b, 'en'));
    for (const table of leaves) { remaining.delete(table); result.push(table); }
  }
  return result;
}
const metadataSql = {
  columns: `SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`,
  keys: `SELECT r.relname AS table_name,array_agg(a.attname::text ORDER BY k.ordinality) AS columns
    FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum=k.attnum
    WHERE c.contype='p' AND n.nspname='public' GROUP BY r.relname`,
  edges: `SELECT s.relname AS child,t.relname AS parent,c.confdeltype AS action,
    array_agg(sa.attname::text ORDER BY k.ordinality) AS child_columns,array_agg(ta.attname::text ORDER BY k.ordinality) AS parent_columns
    FROM pg_constraint c JOIN pg_class s ON s.oid=c.conrelid JOIN pg_class t ON t.oid=c.confrelid
    JOIN pg_namespace sn ON sn.oid=s.relnamespace JOIN pg_namespace tn ON tn.oid=t.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey,c.confkey) WITH ORDINALITY k(skey,tkey,ordinality)
    JOIN pg_attribute sa ON sa.attrelid=s.oid AND sa.attnum=k.skey JOIN pg_attribute ta ON ta.attrelid=t.oid AND ta.attnum=k.tkey
    WHERE c.contype='f' AND sn.nspname='public' AND tn.nspname='public' GROUP BY c.oid,s.relname,t.relname,c.confdeltype`,
};
async function inventory(client, keep, targets) {
  const demos = (await client.query(`SELECT demo_type,user_id FROM demo_accounts WHERE is_active`)).rows;
  if (demos.length !== 2 || new Set(demos.map(d => d.demo_type)).size !== 2 || !demos.some(d => d.demo_type==='STORE_OWNER') || !demos.some(d => d.demo_type==='SUPPLIER')) throw new CleanupStop('Canonical registry ambiguous');
  const owner=demos.find(d => d.demo_type==='STORE_OWNER').user_id;
  const stores=(await client.query(`SELECT to_jsonb(o) AS row FROM organizations o WHERE type IN ('pharmacy','store') AND "createdAt" <= $1::timestamptz ORDER BY id`,[STORE_INVENTORY_CUTOFF])).rows.map(x=>x.row);
  const keeper=stores.find(o=>storeFingerprint(o.id)===keep);
  if (!keeper || keeper.created_by_user_id!==owner) throw new CleanupStop('Original canonical store missing');
  const membership=(await client.query(`SELECT count(*)::int AS count FROM organization_members WHERE organization_id=$1 AND user_id=$2 AND role='owner' AND left_at IS NULL AND is_primary`,[keeper.id,owner])).rows[0];
  if (membership.count!==1) throw new CleanupStop('Original primary owner membership required');
  const candidates=stores.filter(o=>o.id!==keeper.id);
  const selected=new Set(targets); const roots=candidates.filter(o=>selected.has(storeFingerprint(o.id)));
  if (roots.length!==selected.size) throw new CleanupStop('Deletion target population changed');
  const accounts=(await client.query(`SELECT count(*)::int AS total,
    count(*) FILTER (WHERE id IN (SELECT user_id FROM demo_accounts WHERE is_active))::int AS canonical_demo,
    count(*) FILTER (WHERE id IN (SELECT user_id FROM role_assignments WHERE is_active AND role ~ '(^|:)(admin|operator|super_admin)$'))::int AS privileged
    FROM users`)).rows[0];
  return { owner,keeper,roots,candidates,accounts };
}
function guardRow(table,row,state) {
  const targetIds=state.targetIds;
  if (['users','demo_accounts','neture_suppliers','canonical_demo_repair_snapshots'].includes(table)) throw new CleanupStop('Protected entity referenced by deletion');
  if (table==='organizations' && !targetIds.has(row.id)) throw new CleanupStop('Retained organization dependency');
  for (const key of new Set(['organization_id','store_id',...(state.organizationColumns.get(table) || [])])) {
    if (row[key] != null && !targetIds.has(String(row[key]))) throw new CleanupStop('Shared retained-store row requires explicit disposition');
  }
}
function addRows(state,table,rows) {
  const target=state.rows.get(table) || new Map();let added=false;
  for (const row of rows) {
    guardRow(table,row,state);
    const key=rowKey(table,row,state.keys.get(table));
    if (!target.has(key)) {target.set(key,row);added=true;}
  }
  if (target.size) state.rows.set(table,target);
  if ([...state.rows.values()].reduce((n,m)=>n+m.size,0)>10000) throw new CleanupStop('Deletion row limit');
  return added;
}
async function selectRows(client,table,columns,values) {
  const clause=columns.map((c,i)=>`t.${quoteIdentifier(c)}::text=$${i+1}`).join(' AND ');
  return (await client.query(`SELECT to_jsonb(t) AS row FROM ${quoteIdentifier(table)} t WHERE ${clause}`,values.map(String))).rows.map(x=>x.row);
}
async function expandEdge(client,state,edge) {
  const parents=state.rows.get(edge.parent);if (!parents) return false;
  let added=false;
  for (const row of parents.values()) {
    const children=await selectRows(client,edge.child,edge.child_columns,edge.parent_columns.map(c=>row[c]));
    if (!children.length) continue;
    if (edge.child===edge.parent) throw new CleanupStop('Self-referencing deletion requires explicit ordering');
    if (edge.action==='n' || edge.action==='d') throw new CleanupStop('SET NULL/DEFAULT dependency needs explicit recovery disposition');
    if (addRows(state,edge.child,children)) added=true;
  }
  return added;
}
async function buildGraph(client,roots) {
  const columns=(await client.query(metadataSql.columns)).rows;
  const keys=(await client.query(metadataSql.keys)).rows;
  const edges=(await client.query(metadataSql.edges)).rows;
  const organizationColumns=new Map();
  for (const edge of edges.filter(e=>e.parent==='organizations' && e.child!=='organizations')) {
    if (edge.parent_columns.length!==1 || edge.parent_columns[0]!=='id') throw new CleanupStop('Non-ID organization reference requires explicit review');
    organizationColumns.set(edge.child,[...(organizationColumns.get(edge.child) || []),...edge.child_columns]);
  }
  const state={keys:new Map(keys.map(x=>[x.table_name,x.columns])),rows:new Map(),organizationColumns,targetIds:new Set(roots.map(x=>x.id))};
  addRows(state,'organizations',roots);
  // Include logical store ownership even where legacy schemas have no FK.
  const scopes=columns.filter(x=>['organization_id','store_id','target_organization_id'].includes(x.column_name) && x.table_name!=='organizations');
  for (const scope of scopes) {
    const rows=(await client.query(`SELECT to_jsonb(t) AS row FROM ${quoteIdentifier(scope.table_name)} t WHERE t.${quoteIdentifier(scope.column_name)}::text=ANY($1::text[])`,[[...state.targetIds]])).rows.map(x=>x.row);
    addRows(state,scope.table_name,rows);
  }
  let changed=true;let passes=0;
  while (changed) {
    if (++passes>50) throw new CleanupStop('Dependency graph expansion limit');
    const results=await Promise.all(edges.map(edge=>expandEdge(client,state,edge)));changed=results.some(Boolean);
    if ([...state.rows.values()].reduce((n,m)=>n+m.size,0)>10000) throw new CleanupStop('Deletion row limit');
  }
  const affected=[...state.rows.keys()];
  const restricted=(await client.query(`SELECT count(*)::int AS count FROM pg_class r JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND r.relname=ANY($1::text[]) AND (r.relrowsecurity OR r.relkind<>'r')`,[affected])).rows[0];
  if (restricted.count) throw new CleanupStop('RLS or partitioned deletion requires explicit review');
  const external=(await client.query(`SELECT count(*)::int AS count FROM pg_constraint c JOIN pg_class p ON p.oid=c.confrelid JOIN pg_namespace pn ON pn.oid=p.relnamespace JOIN pg_class ch ON ch.oid=c.conrelid JOIN pg_namespace cn ON cn.oid=ch.relnamespace WHERE c.contype='f' AND pn.nspname='public' AND p.relname=ANY($1::text[]) AND cn.nspname<>'public'`,[affected])).rows[0];
  if (external.count) throw new CleanupStop('Cross-schema deletion requires explicit review');
  const triggers=(await client.query(`SELECT count(*)::int AS count FROM pg_trigger g JOIN pg_class r ON r.oid=g.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND r.relname=ANY($1::text[]) AND NOT g.tgisinternal AND g.tgenabled<>'D' AND (g.tgtype & 8)<>0`,[affected])).rows[0];
  if (triggers.count) throw new CleanupStop('Custom delete trigger requires explicit review');
  const order=deletionOrder(affected,edges.filter(e=>state.rows.has(e.parent)&&state.rows.has(e.child)));
  const tables=order.map(table=>({table,keys:state.keys.get(table),rows:[...state.rows.get(table).values()].sort((a,b)=>rowKey(table,a,state.keys.get(table)).localeCompare(rowKey(table,b,state.keys.get(table)),'en'))}));
  return { tables,edges,columns,keys };
}
async function removeTable(client,table) {
  for (const row of table.rows) {
    const clause=table.keys.map((k,i)=>`${quoteIdentifier(k)}::text=$${i+1}`).join(' AND ');
    const result=await client.query(`DELETE FROM ${quoteIdentifier(table.table)} WHERE ${clause}`,table.keys.map(k=>String(row[k])));
    if (result.rowCount!==1) throw new CleanupStop('Deletion population changed');
  }
}
async function executeDeletion(client,plan,digest,expected) {
  if (!/^[a-f0-9]{64}$/.test(expected) || digest!==expected) throw new CleanupStop('Before-images changed; replan');
  const ready=(await client.query(`SELECT to_regclass('public.canonical_demo_repair_snapshots') IS NOT NULL AS ready`)).rows[0];
  if (!ready.ready) throw new CleanupStop('Recovery table missing');
  const snapshot=(await client.query(`INSERT INTO canonical_demo_repair_snapshots (migration,snapshot) VALUES ($1,$2::jsonb) RETURNING id`,['store-cleanup-'+digest,JSON.stringify({before:plan})])).rows[0];
  for (const table of plan.graph.tables) await removeTable(client,table);
  const verified=(await client.query(`SELECT count(*)::int AS count FROM organizations WHERE id=ANY($1::uuid[])`,[plan.inventory.roots.map(r=>r.id)])).rows[0];
  if (verified.count!==0) throw new CleanupStop('Deletion verification failed');
  const keeper=(await client.query(`SELECT to_jsonb(o) AS row FROM organizations o WHERE id=$1`,[plan.inventory.keeper.id])).rows[0];
  if (!keeper || stableJson(keeper.row)!==stableJson(plan.inventory.keeper)) throw new CleanupStop('Retained store changed');
  const accounts=(await client.query('SELECT count(*)::int AS count FROM users')).rows[0];
  if (accounts.count!==plan.inventory.accounts.total) throw new CleanupStop('User identities changed');
  await client.query(`UPDATE canonical_demo_repair_snapshots SET snapshot=snapshot || $2::jsonb WHERE id=$1`,[snapshot.id,JSON.stringify({verified:true,deletedStores:plan.inventory.roots.length})]);
}
export async function runStoreCleanup(client,{apply=false,keep='',targets=[],expectedDigest=''}={}) {
  validateTargets(keep,targets,apply);
  await client.query(apply?'BEGIN ISOLATION LEVEL SERIALIZABLE':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout='15s'");await client.query("SET LOCAL lock_timeout='5s'");
    if (apply) await client.query("SELECT pg_advisory_xact_lock(hashtext('canonical-demo-store-relink'))");
    const scope=await inventory(client,keep,targets);
    if (!targets.length) {
      await client.query('ROLLBACK');return {mode:'discovery',keepStore:keep,candidateStores:scope.candidates.length,targets:scope.candidates.map(r=>storeFingerprint(r.id)),accounts:scope.accounts};
    }
    const graph=await buildGraph(client,scope.roots);
    const plan={inventory:scope,graph,provenance:'user-approved-delete-other-test-stores-2026-10-10'};
    const digest=createHash('sha256').update(stableJson(plan)).digest('hex');
    if (apply) await executeDeletion(client,plan,digest,expectedDigest);
    await client.query(apply?'COMMIT':'ROLLBACK');
    return {mode:apply?'apply':'plan',keepStore:keep,deleteStores:scope.roots.length,digest,tables:graph.tables.map(t=>({table:t.table,count:t.rows.length})),accounts:scope.accounts};
  } catch (error) {
    try {await client.query('ROLLBACK');} catch { /* Original sanitized failure retained. */ }
    throw safeCleanupError(error,'store-cleanup');
  }
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  let client;
  try {
    const mode=process.env.DEMO_CLEANUP_MODE || 'plan';
    if (!['plan','apply'].includes(mode) || !process.env.DB_USERNAME || !process.env.DB_NAME) throw new CleanupStop('Invalid runtime configuration');
    const require=createRequire(new URL('../../apps/api-server/package.json',import.meta.url));const {Client}=require('pg');
    client=new Client({host:'127.0.0.1',port:55432,user:process.env.DB_USERNAME,database:process.env.DB_NAME,password:readPassword(),connectionTimeoutMillis:15000,options:mode==='plan'?'-c default_transaction_read_only=on':''});
    await client.connect();console.log(JSON.stringify(await runStoreCleanup(client,{apply:mode==='apply',keep:process.env.DEMO_CLEANUP_KEEP || '',targets:(process.env.DEMO_CLEANUP_TARGETS || '').split(',').map(x=>x.trim()).filter(Boolean),expectedDigest:process.env.DEMO_CLEANUP_DIGEST || ''})));
  } catch(error) {console.error(safeCleanupError(error,'store-cleanup-runtime').message);process.exitCode=1;}
  finally {if(client) try {await client.end();} catch(error) {console.error(safeInventoryError(error,'store-cleanup-disconnect').message);process.exitCode=1;}}
}
