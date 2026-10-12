/** PH development-data removal approved by the owner; no commerce/media or identity deletion.
 * Fixed census: Actions 38314086152. Ownership/reference drift stops the transaction.
 */
const keys=['pharmacy-hub','pharmacy_hub','pharmacy_hub_cart','pharmacy-hub-event-offer'];
const roots=[
  {table:'action_logs',column:'service_key',count:33},
  {table:'o4o_event_logs',column:'service_key',count:5},
  {table:'role_assignments',column:'role',count:3},
  {table:'service_memberships',column:'service_key',count:2},
  {table:'user_policy_acceptances',column:'service_key',count:2},
  {table:'service_policy_documents',column:'service_key',count:3},
  {table:'service_audience_policies',column:'service_key',count:1},
  {table:'service_legal_profiles',column:'service_key',count:1},
  {table:'roles',column:'service_key',count:5},
  {table:'platform_services',column:'code',count:1},
];
const byTable=new Map(roots.map(r=>[r.table,r]));
function id(value) {
  if(!/^[A-Za-z_]\w*$/.test(value))throw new Error('PH_PURGE_IDENTIFIER');
  return `"${value}"`;
}
const ph=column=>`(${column}::text = ANY($1::text[]) OR left(${column}::text,13) = 'pharmacy-hub:')`;
const count=async(q,sql)=>Number((await q.query(sql,[keys]))[0].count);
const summary=applied=>({counts:Object.fromEntries(roots.map(r=>[r.table,r.count])),applied});
async function lock(q,tables,plan) {
  if(!tables.length)return;
  const ordered=[...new Set(tables)].sort((a,b)=>a.localeCompare(b,'en')).join(',');
  await q.query(`LOCK TABLE ${ordered} IN ${plan?'ACCESS SHARE':'SHARE ROW EXCLUSIVE'} MODE`);
}
async function dependencies(q,plan) {
  await q.query("SET LOCAL lock_timeout = '5s'");
  await q.query("SET LOCAL statement_timeout = '15s'");
  // Freeze root writers/schema before catalog reads; never disable FKs or use implicit cascades.
  await lock(q,[...byTable.keys(),'role_permissions'].map(t=>'public.'+id(t)),plan);
  const fks=await q.query(`SELECT sn.nspname AS schema,s.relname AS "table",t.relname AS target,
    array_agg(sa.attname::text ORDER BY k.ordinality) AS source_columns,
    array_agg(ta.attname::text ORDER BY k.ordinality) AS target_columns
    FROM pg_constraint c JOIN pg_class s ON s.oid=c.conrelid JOIN pg_namespace sn ON sn.oid=s.relnamespace
    JOIN pg_class t ON t.oid=c.confrelid JOIN pg_namespace tn ON tn.oid=t.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey,c.confkey) WITH ORDINALITY k(source_key,target_key,ordinality)
    JOIN pg_attribute sa ON sa.attrelid=c.conrelid AND sa.attnum=k.source_key
    JOIN pg_attribute ta ON ta.attrelid=c.confrelid AND ta.attnum=k.target_key
    WHERE c.contype='f' AND tn.nspname='public' AND t.relname=ANY($1::text[])
    GROUP BY sn.nspname,s.relname,t.relname,c.conname ORDER BY sn.nspname,s.relname,c.conname`,[[...byTable.keys()]]);
  await lock(q,fks.map(f=>id(f.schema)+'.'+id(f.table)),plan);
  const triggers=await q.query(`SELECT count(*)::text AS count FROM pg_trigger g
    JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname=ANY($1::text[]) AND NOT g.tgisinternal
    AND g.tgenabled<>'D' AND (g.tgtype::int & 8)<>0`,[[...byTable.keys(),'role_permissions']]);
  if(Number(triggers[0].count))throw new Error('PH_PURGE_UNREVIEWED_DELETE_TRIGGER');
  return fks;
}
async function ownership(q) {
  for(const [table,column]of [['service_memberships','role'],['roles','name']]) {
    const roleScope=ph(id(column)),serviceScope=ph('service_key');
    if(await count(q,`SELECT count(*)::text AS count FROM public.${id(table)}
      WHERE ${roleScope} AND NOT COALESCE(${serviceScope},FALSE)`))throw new Error(`PH_PURGE_MIXED_OWNERSHIP:${table}`);
  }
  if(await count(q,`SELECT count(*)::text AS count FROM public.roles
    WHERE ${ph('service_key')} AND NOT COALESCE(${ph('name')},FALSE)`))throw new Error('PH_PURGE_MIXED_OWNERSHIP:roles');
}
async function census(q,residual=false) {
  for(const r of roots) {
    const predicate=ph(id(r.column));
    if(await count(q,`SELECT count(*)::text AS count FROM public.${id(r.table)} WHERE ${predicate}`)!==(residual?0:r.count))
      throw new Error(`PH_PURGE_${residual?'RESIDUAL':'CENSUS_CHANGED'}:${r.table}`);
  }
}
function fkShape(fk) {
  if(!Array.isArray(fk.source_columns)||!Array.isArray(fk.target_columns)||
    !fk.source_columns.length||fk.source_columns.length!==fk.target_columns.length)throw new Error('PH_PURGE_FK_SHAPE');
}
function referenceOwner(fk) {
  if(fk.schema!=='public')return 'FALSE';
  if(fk.table==='role_permissions'&&fk.target==='roles'&&fk.source_columns.length===1&&
    fk.source_columns[0]==='role_id'&&fk.target_columns[0]==='id')return 'TRUE';
  const root=byTable.get(fk.table);
  return root?ph('s.'+id(root.column)):'FALSE';
}
async function references(q,fks) {
  for(const fk of fks) {
    fkShape(fk);
    const root=byTable.get(fk.target);
    if(!root)throw new Error('PH_PURGE_FK_TARGET');
    const owned=referenceOwner(fk),predicate=ph('p.'+id(root.column));
    const join=fk.source_columns.map((column,i)=>'s.'+id(column)+'=p.'+id(fk.target_columns[i])).join(' AND ');
    if(await count(q,`SELECT count(*)::text AS count FROM ${id(fk.schema)}.${id(fk.table)} s
      JOIN public.${id(fk.target)} p ON ${join} WHERE ${predicate} AND NOT COALESCE(${owned},FALSE)`))
      throw new Error(`PH_PURGE_SHARED_REFERENCE:${fk.schema}.${fk.table}`);
  }
}
async function remove(q) {
  // Links belong to their PH role; shared permission definitions stay untouched.
  await q.query(`DELETE FROM public.role_permissions rp USING public.roles r
    WHERE rp.role_id=r.id AND ${ph('r.service_key')}`,[keys]);
  // This is one connection/transaction; FK-dependent deletes must remain serial and ordered.
  for(const r of roots) {
    const predicate=ph(id(r.column));
    const deleted=await q.query(`WITH removed AS (DELETE FROM public.${id(r.table)} WHERE ${predicate} RETURNING 1)
      SELECT count(*)::text AS count FROM removed`,[keys]);
    if(Number(deleted[0].count)!==r.count)throw new Error(`PH_PURGE_DELETE_COUNT:${r.table}`);
  }
}
export class PharmacyHubAdministrativePurge {
  async up(q,plan=false) {
    if(!q.isTransactionActive)throw new Error('PH_PURGE_TRANSACTION_REQUIRED');
    const fks=await dependencies(q,plan);
    await ownership(q);
    await census(q);
    await references(q,fks);
    if(plan)return summary(false);
    await remove(q);
    await census(q,true);
    return summary(true);
  }
}
