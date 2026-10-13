/** Fixed, owner-approved PH development rows. Media/GCS and shared identities stay intact.
 * Caller owns the transaction. Any ownership, dependency or census drift aborts before writes.
 */
const keys=['pharmacy-hub','pharmacy_hub','pharmacy_hub_cart','pharmacy-hub-event-offer'];
const ph=field=>`${field}::text = ANY($1::text[])`;
const jsonScope=alias=>['serviceKey','service_key','source','sourceService'].map(k=>ph(`${alias}.metadata->>'${k}'`)).join(' OR ');
const orderScope=alias=>`(${jsonScope(alias)})`;
const paymentLink=`(o.id::text=p."orderId"::text OR
  (NULLIF(o.metadata->>'paymentGroupId','') IS NOT NULL AND
    (o.metadata->>'paymentGroupId'=p."orderId"::text OR o.metadata->>'paymentGroupId'=p.metadata->>'paymentGroupId')) OR
  CASE WHEN jsonb_typeof(p.metadata::jsonb->'checkoutOrderIds')='array'
    THEN (p.metadata::jsonb->'checkoutOrderIds') ? o.id::text ELSE FALSE END)`;
const roots=[
  {table:'checkout_order_logs',count:6,scope:a=>`EXISTS (SELECT 1 FROM public.checkout_orders o WHERE ${a}."orderId"=o.id AND ${orderScope('o')})`},
  {table:'o4o_payments',count:6,scope:a=>ph(`${a}."sourceService"`)},
  {table:'offer_service_approvals',count:18,scope:a=>ph(`${a}.service_key`)},
  {table:'offer_service_prices',count:1,scope:a=>ph(`${a}.service_key`)},
  {table:'supplier_product_offers',count:19,scope:a=>`EXISTS (SELECT 1 FROM unnest(${a}.service_keys) v WHERE ${ph('v')})`},
  {table:'cms_contents',count:3,scope:a=>ph(`${a}."serviceKey"`)},
  {table:'forum_category_requests',count:1,scope:a=>ph(`${a}.service_code`)},
  {table:'checkout_orders',count:6,scope:orderScope},
];
const byTable=new Map(roots.map(r=>[r.table,r]));
const exclusiveOffer=a=>`(${byTable.get('supplier_product_offers').scope(a)})
  AND ${a}.is_public=FALSE AND COALESCE(cardinality(${a}.allowed_seller_ids),0)=0
  AND NOT EXISTS (SELECT 1 FROM unnest(${a}.service_keys) v WHERE v IS NULL OR NOT (${ph('v')}))`;
const deletedScope=(table,a)=>table==='supplier_product_offers'?exclusiveOffer(a):byTable.get(table)?.scope(a);
function id(value) {
  if(typeof value!=='string'||! /^[A-Za-z_]\w*$/.test(value))throw new Error('PH_DEV_IDENTIFIER');
  return `"${value}"`;
}
async function count(q,sql,args=[keys]) {
  const value=(await q.query(sql,args))[0]?.count;
  if(typeof value!=='string'||! /^\d+$/.test(value))throw new Error('PH_DEV_COUNT');
  return Number(value);
}
async function lock(q,tables,plan) {
  const ordered=[...new Set(tables)].sort((a,b)=>a.localeCompare(b,'en')).join(',');
  if(ordered)await q.query(`LOCK TABLE ${ordered} IN ${plan?'ACCESS SHARE':'SHARE ROW EXCLUSIVE'} MODE`);
}
async function dependencies(q,plan) {
  await q.query("SET LOCAL lock_timeout='5s'");
  await q.query("SET LOCAL statement_timeout='15s'");
  // All application relations are held stable for the conservative non-FK ID scan.
  const tables=await q.query(`SELECT n.nspname AS schema,c.relname AS "table",c.relrowsecurity AS row_security FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p')
    AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%'
    ORDER BY n.nspname,c.relname`);
  if(tables.some(t=>t.row_security))throw new Error('PH_DEV_ROW_SECURITY');
  await lock(q,tables.map(t=>`${id(t.schema)}.${id(t.table)}`),plan);
  const fks=await q.query(`SELECT sn.nspname AS schema,s.relname AS "table",t.relname AS target,
    array_agg(sa.attname::text ORDER BY k.ordinality) AS source_columns,
    array_agg(ta.attname::text ORDER BY k.ordinality) AS target_columns
    FROM pg_constraint c JOIN pg_class s ON s.oid=c.conrelid JOIN pg_namespace sn ON sn.oid=s.relnamespace
    JOIN pg_class t ON t.oid=c.confrelid JOIN pg_namespace tn ON tn.oid=t.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey,c.confkey) WITH ORDINALITY k(source_key,target_key,ordinality)
    JOIN pg_attribute sa ON sa.attrelid=c.conrelid AND sa.attnum=k.source_key
    JOIN pg_attribute ta ON ta.attrelid=c.confrelid AND ta.attnum=k.target_key
    WHERE c.contype='f' AND tn.nspname='public' AND t.relname=ANY($1::text[])
    GROUP BY sn.nspname,s.relname,t.relname,c.conname`,[[...byTable.keys()]]);
  if(await count(q,`SELECT count(*)::text AS count FROM pg_trigger g
    JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname=ANY($1::text[]) AND NOT g.tgisinternal
    AND g.tgenabled<>'D' AND ((g.tgtype::int & 8)<>0 OR
      (t.relname='supplier_product_offers' AND (g.tgtype::int & 16)<>0))`,[[...byTable.keys()]]))throw new Error('PH_DEV_MUTATION_TRIGGER');
  return {fks,tables};
}
async function census(q,residual=false) {
  for(const r of roots)if(await count(q,`SELECT count(*)::text AS count FROM public.${id(r.table)} x WHERE ${r.scope('x')}`)!==(residual?0:r.count))
    throw new Error(`PH_DEV_${residual?'RESIDUAL':'CENSUS_CHANGED'}:${r.table}`);
}
async function ownership(q) {
  // Legacy source tags can also occur in KPA orders. Explicit foreign service ownership wins.
  for(const table of ['checkout_orders','o4o_payments']) {
    const scope=byTable.get(table).scope('x');
    if(await count(q,`SELECT count(*)::text AS count FROM public.${id(table)} x WHERE ${scope}
      AND EXISTS (SELECT 1 FROM unnest(ARRAY[x.metadata->>'serviceKey',x.metadata->>'service_key',x.metadata->>'sourceService']) v
        WHERE NULLIF(v,'') IS NOT NULL AND NOT (${ph('v')}))`))throw new Error(`PH_DEV_MIXED_OWNERSHIP:${table}`);
  }
  // Empty service_keys + active/approved means Neture pharmacy default supply, even if PRIVATE.
  // Shared public/private offers without a surviving key cannot be migrated by widening exposure.
  if(await count(q,`SELECT count(*)::text AS count FROM public.supplier_product_offers x
    WHERE (${byTable.get('supplier_product_offers').scope('x')}) AND NOT (${exclusiveOffer('x')})
      AND x.is_active AND x.approval_status::text='APPROVED'
      AND NOT EXISTS (SELECT 1 FROM unnest(x.service_keys) v WHERE v IS NULL OR NOT (${ph('v')}))`))
    throw new Error('PH_DEV_SHARED_BASELINE_WIDENING');
  if(await count(q,`SELECT count(*)::text AS count FROM public.o4o_payments p WHERE
    (${ph('p."sourceService"')} AND (NOT EXISTS (SELECT 1 FROM public.checkout_orders o WHERE ${paymentLink} AND ${orderScope('o')})
      OR EXISTS (SELECT 1 FROM public.checkout_orders o WHERE ${paymentLink} AND NOT COALESCE(${orderScope('o')},FALSE))))
    OR (NOT COALESCE(${ph('p."sourceService"')},FALSE) AND EXISTS (SELECT 1 FROM public.checkout_orders o WHERE ${paymentLink} AND ${orderScope('o')}))`))
    throw new Error('PH_DEV_SHARED_PAYMENT');
}
async function references(q,fks,tables) {
  for(const fk of fks) {
    if(!Array.isArray(fk.source_columns)||!fk.source_columns.length||!Array.isArray(fk.target_columns)||fk.source_columns.length!==fk.target_columns.length)
      throw new Error('PH_DEV_FK_SHAPE');
    const source=fk.schema==='public'?deletedScope(fk.table,'s'):undefined;
    const join=fk.source_columns.map((c,i)=>`s.${id(c)}=p.${id(fk.target_columns[i])}`).join(' AND ');
    if(await count(q,`SELECT count(*)::text AS count FROM ${id(fk.schema)}.${id(fk.table)} s
      JOIN public.${id(fk.target)} p ON ${join} WHERE (${deletedScope(fk.target,'p')}) AND NOT COALESCE((${source??'FALSE'}),FALSE)`))
      throw new Error(`PH_DEV_SHARED_FK:${fk.schema}.${fk.table}`);
  }
  // Also refuse references embedded in application text/JSON/arrays/UUID columns.
  // Only counts leave this job; no row identifiers or payloads are logged.
  const targetIds=roots.filter(r=>r.table!=='checkout_order_logs').map(r=>`SELECT id::text FROM public.${id(r.table)} x WHERE ${deletedScope(r.table,'x')}`).join(' UNION ');
  const columns=await q.query(`SELECT n.nspname AS schema,c.relname AS "table",a.attname AS column
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_type t ON t.oid=a.atttypid WHERE a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','p')
    AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%'
    AND (t.typcategory IN ('S','A') OR t.typname IN ('uuid','json','jsonb'))`);
  const locked=new Set(tables.map(t=>`${t.schema}.${t.table}`));
  for(const c of columns) {
    if(!locked.has(`${c.schema}.${c.table}`))throw new Error('PH_DEV_SCHEMA_CHANGED');
    const owned=c.schema==='public'?deletedScope(c.table,'s'):undefined;
    if(await count(q,`SELECT count(*)::text AS count FROM ${id(c.schema)}.${id(c.table)} s
      WHERE NOT COALESCE((${owned??'FALSE'}),FALSE)
      AND EXISTS (SELECT 1 FROM (${targetIds}) targets WHERE strpos(s.${id(c.column)}::text,targets.id)>0)`))
      throw new Error(`PH_DEV_SHARED_VALUE:${c.schema}.${c.table}.${c.column}`);
  }
}
export class PharmacyHubDevelopmentPurge {
  async up(q,plan=false) {
    if(!q.isTransactionActive)throw new Error('PH_DEV_TRANSACTION_REQUIRED');
    const {fks,tables}=await dependencies(q,plan);
    await census(q);await ownership(q);await references(q,fks,tables);
    const exclusiveOffers=await count(q,`SELECT count(*)::text AS count FROM public.supplier_product_offers x WHERE ${exclusiveOffer('x')}`);
    if(!plan) {
      for(const r of roots) {
        if(r.table==='supplier_product_offers') {
          const removed=await count(q,`WITH removed AS (DELETE FROM public.supplier_product_offers x
            WHERE ${exclusiveOffer('x')} RETURNING 1) SELECT count(*)::text AS count FROM removed`);
          if(removed!==exclusiveOffers)throw new Error('PH_DEV_EXCLUSIVE_OFFER_COUNT');
          const changed=await count(q,`WITH changed AS (UPDATE public.supplier_product_offers x
            SET service_keys=ARRAY(SELECT v FROM unnest(x.service_keys) v WHERE v IS NULL OR NOT (${ph('v')})),
              distribution_type=CASE WHEN x.is_public THEN 'PUBLIC'
                WHEN EXISTS (SELECT 1 FROM unnest(x.service_keys) v WHERE v IS NULL OR NOT (${ph('v')})) THEN 'SERVICE'
                ELSE 'PRIVATE' END::supplier_product_offers_distribution_type_enum
            WHERE ${r.scope('x')} RETURNING 1) SELECT count(*)::text AS count FROM changed`);
          if(changed!==r.count-exclusiveOffers)throw new Error('PH_DEV_ASSOCIATION_COUNT');
          continue;
        }
        const deleted=await count(q,`WITH removed AS (DELETE FROM public.${id(r.table)} x WHERE ${r.scope('x')} RETURNING 1)
          SELECT count(*)::text AS count FROM removed`);
        if(deleted!==r.count)throw new Error(`PH_DEV_DELETE_COUNT:${r.table}`);
      }
      await census(q,true);
    }
    return {counts:Object.fromEntries(roots.map(r=>[r.table,r.count])),applied:!plan,
      offerRowsPreserved:19-exclusiveOffers,offerAssociations:19-exclusiveOffers,
      rowsToDelete:41+exclusiveOffers,mediaAndGcsPreserved:true};
  }
}
