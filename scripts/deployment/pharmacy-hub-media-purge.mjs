import {countReferenceBatches,referenceBatchQuery,prepareReferenceGroups,groupedReferenceQuery,markPhase,referencePhase} from './pharmacy-hub-reference-batches.mjs';
/** PH-only media retirement. GCS deletes cannot roll back with PostgreSQL.
 * Missing objects may resume a failed attempt, but replacements are generation-protected.
 * No asset identifiers, URLs, object names or credentials leave the worker.
 */
const keys=['pharmacy-hub','pharmacy_hub','pharmacy_hub_cart','pharmacy-hub-event-offer'];
const ph=field=>`${field}::text=ANY($1::text[])`;
const assetScope=a=>ph(`${a}.service_key`);
// These links annotate library resources; business renderers persist their own asset/URL refs.
// Existing VIDEO jobs and orphan INPUT/INTERMEDIATE links stay protected.
// A PH-owned legacy OUTPUT may be removed only while its job is confirmed absent.
const linkScope=l=>`EXISTS (SELECT 1 FROM public.media_assets a WHERE a.id=${l}.media_asset_id AND ${assetScope('a')})
  AND (${l}.entity_type IN ('product','brand','content','service') OR
    (${l}.entity_type='video-production-job' AND ${l}.purpose='OUTPUT'
      AND NULLIF(${l}.entity_id,'') IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.automation_jobs j WHERE j.id::text=${l}.entity_id)))`;
function id(value) {
  if(typeof value!=='string'||! /^[A-Za-z_]\w*$/.test(value))throw new Error('PH_MEDIA_IDENTIFIER');
  return `"${value}"`;
}
async function count(q,sql,args=[keys]) {
  const value=(await q.query(sql,args))[0]?.count;
  if(typeof value!=='string'||! /^\d+$/.test(value))throw new Error('PH_MEDIA_COUNT');
  return Number(value);
}
async function stableTables(q,plan) {
  await q.query("SET LOCAL lock_timeout='5s'");await q.query("SET LOCAL statement_timeout='15s'");
  const tables=await q.query(`SELECT n.nspname AS schema,c.relname AS "table",c.relrowsecurity AS row_security FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%'`);
  if(tables.some(t=>t.row_security))throw new Error('PH_MEDIA_ROW_SECURITY');
  const names=tables.map(t=>`${id(t.schema)}.${id(t.table)}`).sort((a,b)=>a.localeCompare(b,'en'));
  if(names.length)await q.query(`LOCK TABLE ${names.join(',')} IN ${plan?'ACCESS SHARE':'SHARE ROW EXCLUSIVE'} MODE`);
  if(await count(q,`SELECT count(*)::text AS count FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND t.relname IN ('media_assets','media_entity_links')
    AND NOT g.tgisinternal AND g.tgenabled<>'D' AND (g.tgtype::int & 8)<>0`,[]))throw new Error('PH_MEDIA_DELETE_TRIGGER');
  return new Set(tables.map(t=>`${t.schema}.${t.table}`));
}
async function census(q) {
  if(await count(q,`SELECT count(*)::text AS count FROM public.media_assets a WHERE ${assetScope('a')}`)!==4)
    throw new Error('PH_MEDIA_CENSUS_CHANGED');
  if(await count(q,`SELECT count(*)::text AS count FROM public.media_entity_links l WHERE ${linkScope('l')}`)!==1)
    throw new Error('PH_MEDIA_LINK_CENSUS_CHANGED');
}
async function references(q,locked) {
  markPhase(q,'references_fk');
  const fks=await q.query(`SELECT sn.nspname AS schema,s.relname AS "table",t.relname AS target,
    array_agg(sa.attname::text ORDER BY k.ordinality) AS source_columns,
    array_agg(ta.attname::text ORDER BY k.ordinality) AS target_columns
    FROM pg_constraint c JOIN pg_class s ON s.oid=c.conrelid JOIN pg_namespace sn ON sn.oid=s.relnamespace
    JOIN pg_class t ON t.oid=c.confrelid JOIN pg_namespace tn ON tn.oid=t.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey,c.confkey) WITH ORDINALITY k(source_key,target_key,ordinality)
    JOIN pg_attribute sa ON sa.attrelid=c.conrelid AND sa.attnum=k.source_key
    JOIN pg_attribute ta ON ta.attrelid=c.confrelid AND ta.attnum=k.target_key
    WHERE c.contype='f' AND tn.nspname='public' AND t.relname IN ('media_assets','media_entity_links')
    GROUP BY sn.nspname,s.relname,t.relname,c.conname`);
  for(const f of fks) {
    if(!Array.isArray(f.source_columns)||!f.source_columns.length||!Array.isArray(f.target_columns)||f.source_columns.length!==f.target_columns.length)
      throw new Error('PH_MEDIA_FK_SHAPE');
    const owned=f.schema==='public'&&f.table==='media_assets'?assetScope('s'):
      f.schema==='public'&&f.table==='media_entity_links'?linkScope('s'):'FALSE';
    const target=f.target==='media_assets'?assetScope('p'):linkScope('p');
    const join=f.source_columns.map((c,i)=>`s.${id(c)}=p.${id(f.target_columns[i])}`).join(' AND ');
    if(await count(q,`SELECT count(*)::text AS count FROM ${id(f.schema)}.${id(f.table)} s
      JOIN public.${id(f.target)} p ON ${join} WHERE (${target}) AND NOT COALESCE((${owned}),FALSE)`))
      throw new Error(`PH_MEDIA_SHARED_FK:${f.schema}.${f.table}`);
  }
  // IDs, full public URLs and object paths are all checked across application data.
  markPhase(q,'references_catalog');
  const columns=await q.query(`SELECT n.nspname AS schema,c.relname AS "table",a.attname AS column,t.typname AS type,
      (SELECT ka.attname FROM pg_index ki JOIN pg_attribute ka ON ka.attrelid=ki.indrelid AND ka.attnum=ki.indkey[0]
        JOIN pg_type kt ON kt.oid=ka.atttypid WHERE ki.indrelid=c.oid AND ki.indisprimary AND ki.indisvalid AND ki.indisready AND ki.indnkeyatts=1 AND kt.typname='uuid'
        AND NOT EXISTS (SELECT 1 FROM pg_inherits hi WHERE hi.inhparent=c.oid)) AS scan_key,
      EXISTS (SELECT 1 FROM pg_index xi WHERE xi.indrelid=c.oid AND xi.indkey[0]=a.attnum
        AND xi.indpred IS NULL AND xi.indisvalid AND xi.indisready) AS indexed FROM pg_attribute a
    JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_type t ON t.oid=a.atttypid
    WHERE a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
    AND n.nspname NOT LIKE 'pg_%' AND (t.typcategory IN ('S','A') OR t.typname IN ('uuid','json','jsonb'))`);
  for(const c of await prepareReferenceGroups(q,columns,mediaReferenceTargets(),keys,'PH_MEDIA_REFERENCE_TARGETS')) {
    if(!locked.has(`${c.schema}.${c.table}`))throw new Error('PH_MEDIA_SCHEMA_CHANGED');
    markPhase(q,referencePhase(c));
    if(await countMediaReferences(q,c))
      throw new Error(`PH_MEDIA_SHARED_VALUE:${c.schema}.${c.table}.${c.matched_column??c.column}`);
  }
}
// Only catalog-confirmed leaf UUID primary keys may paginate. Inheritance/
// partition parents retain the complete scan (including foreign descendants).
export async function countMediaReferences(q,c) {
  const sql=mediaReferenceQuery(c);
  if(!c.scan_key||c.type==='uuid')return count(q,sql);
  return countReferenceBatches(q,sql,keys,'PH_MEDIA_REFERENCE_BATCH',c.columns?c:undefined);
}
export function mediaReferenceTargets() {return `SELECT v AS id FROM (SELECT a.id::text AS id,a.url,a.gcs_path FROM public.media_assets a WHERE ${assetScope('a')}
            UNION ALL SELECT l.id::text,NULL::text,NULL::text FROM public.media_entity_links l WHERE ${linkScope('l')}) a
          CROSS JOIN LATERAL unnest(ARRAY[a.id,a.url,a.gcs_path]) v WHERE NULLIF(v,'') IS NOT NULL`;}
export function mediaReferenceQuery(c) {
    const owned=c.schema==='public'&&c.table==='media_assets'?assetScope('s'):
      c.schema==='public'&&c.table==='media_entity_links'?linkScope('s'):'FALSE';
    if(c.columns)return groupedReferenceQuery(c,owned);
    if(c.type==='uuid') {
      const canonical='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      // Partition live/deleted landings to use the partial index without omitting references.
      const partitions=c.schema==='public'&&c.table==='product_landings'&&c.column==='product_master_id'
        ? ['s.deleted_at IS NULL','s.deleted_at IS NOT NULL'] : ['TRUE'];
      // Include every original token. URL/path tokens cannot match UUID text,
      // but hypothetical short hexadecimal legacy IDs still use the gated fallback.
      return `WITH target_values AS MATERIALIZED (
          SELECT v AS id FROM (SELECT a.id::text AS id,a.url,a.gcs_path FROM public.media_assets a WHERE ${assetScope('a')}
            UNION ALL SELECT l.id::text,NULL::text,NULL::text FROM public.media_entity_links l WHERE ${linkScope('l')}) a
          CROSS JOIN LATERAL unnest(ARRAY[a.id,a.url,a.gcs_path]) v WHERE NULLIF(v,'') IS NOT NULL),
        target_patterns AS MATERIALIZED (
          SELECT string_agg(regexp_replace(id,'([[:punct:]])',repeat(chr(92),3)||'1','g'),'|') AS pattern
          FROM target_values WHERE id ~ '^[0-9a-f-]{1,36}$' AND id !~ '${canonical}')
        SELECT count(*)::text AS count FROM (
${partitions.map(partition=>`          SELECT 1 FROM ${id(c.schema)}.${id(c.table)} s
          WHERE NOT COALESCE((${owned}),FALSE)
            AND s.${id(c.column)} = ANY(ARRAY(SELECT id::uuid FROM target_values WHERE id ~ '${canonical}'))
            AND ${partition}`).join('\n          UNION ALL\n')}
          UNION ALL
          SELECT 1 FROM target_patterns targets CROSS JOIN ${id(c.schema)}.${id(c.table)} s
          WHERE targets.pattern IS NOT NULL AND NOT COALESCE((${owned}),FALSE)
            AND (s.${id(c.column)}::text COLLATE "C") ~ targets.pattern
        ) references_found`;
    }
    if(c.scan_key)return referenceBatchQuery(c,`WITH target_patterns AS MATERIALIZED (
        SELECT string_agg(regexp_replace(v,'([[:punct:]])',repeat(chr(92),3)||'1','g'),'|') AS pattern
        FROM (SELECT a.id::text AS id,a.url,a.gcs_path FROM public.media_assets a WHERE ${assetScope('a')}
          UNION ALL SELECT l.id::text,NULL::text,NULL::text FROM public.media_entity_links l WHERE ${linkScope('l')}) a
        CROSS JOIN LATERAL unnest(ARRAY[a.id,a.url,a.gcs_path]) v WHERE NULLIF(v,'') IS NOT NULL)`,owned);
    // Freeze target discovery and scan each large payload once. Escaping every
    // punctuation character keeps ID/full-URL/object-path matching literal.
    return `WITH target_patterns AS MATERIALIZED (
        SELECT string_agg(regexp_replace(v,'([[:punct:]])',repeat(chr(92),3)||'1','g'),'|') AS pattern
        FROM (SELECT a.id::text AS id,a.url,a.gcs_path FROM public.media_assets a WHERE ${assetScope('a')}
          UNION ALL SELECT l.id::text,NULL::text,NULL::text FROM public.media_entity_links l WHERE ${linkScope('l')}) a
        CROSS JOIN LATERAL unnest(ARRAY[a.id,a.url,a.gcs_path]) v WHERE NULLIF(v,'') IS NOT NULL)
      SELECT count(*)::text AS count FROM ${id(c.schema)}.${id(c.table)} s CROSS JOIN target_patterns targets
      WHERE NOT COALESCE((${owned}),FALSE)
      AND (s.${id(c.column)}::text COLLATE "C") ~ targets.pattern`;
}
export function validateMediaObject(asset) {
  // Fixed existing media bucket and path namespace. Never enumerate/delete a bucket or prefix.
  if(typeof asset.gcs_path!=='string'||! /^media\/[A-Za-z0-9/_-]+\.[A-Za-z0-9]+$/.test(asset.gcs_path)||
    asset.url!==`https://storage.googleapis.com/o4o-media-library/${asset.gcs_path}`)
    throw new Error('PH_MEDIA_STORAGE_OWNERSHIP');
}
async function objects(q,storage) {
  const assets=await q.query(`SELECT gcs_path,url FROM public.media_assets a WHERE ${assetScope('a')}`,[keys]);
  if(assets.length!==4||new Set(assets.map(a=>a.gcs_path)).size!==4)throw new Error('PH_MEDIA_OBJECT_COUNT');
  const result=[];
  for(const asset of assets) {
    validateMediaObject(asset);
    const file=storage.bucket('o4o-media-library').file(asset.gcs_path);
    try {
      const [metadata]=await file.getMetadata();
      if(typeof metadata.generation!=='string'||! /^\d+$/.test(metadata.generation)||
        metadata.name!==asset.gcs_path||metadata.bucket!=='o4o-media-library')throw new Error('PH_MEDIA_GENERATION');
      result.push({file,generation:metadata.generation});
    }catch(error) {
      if(error.code===404)result.push({file,missing:true});
      else throw new Error('PH_MEDIA_OBJECT_READ_UNCONFIRMED');
    }
  }
  return result;
}
async function removeObjects(files) {
    for(const f of files)if(!f.missing) {
      try{await f.file.delete({ifGenerationMatch:f.generation,ignoreNotFound:false});}
      catch {throw new Error('PH_MEDIA_OBJECT_DELETE_UNCONFIRMED');}
    }
    // Verify absence, including files missing at the start. A re-created object blocks commit.
    for(const f of files) {
      try{await f.file.getMetadata();}
      catch(error){if(error.code===404)continue;throw new Error('PH_MEDIA_OBJECT_VERIFY_UNCONFIRMED');}
      throw new Error('PH_MEDIA_OBJECT_REAPPEARED');
    }
}
export class PharmacyHubMediaPurge {
  constructor({storage}) {this.storage=storage;}
  async up(q,plan=false) {
    if(!q.isTransactionActive)throw new Error('PH_MEDIA_TRANSACTION_REQUIRED');
    markPhase(q,'dependencies');const locked=await stableTables(q,plan);
    markPhase(q,'census');await census(q);
    await references(q,locked);
    markPhase(q,'objects');const files=await objects(q,this.storage);
    const missingObjects=files.filter(f=>f.missing).length;
    if(plan)return {applied:false,assets:4,links:1,objects:4,missingObjects};
    markPhase(q,'apply');
    await removeObjects(files);
    if(await count(q,`WITH removed AS (DELETE FROM public.media_entity_links l WHERE ${linkScope('l')} RETURNING 1)
      SELECT count(*)::text AS count FROM removed`)!==1)throw new Error('PH_MEDIA_LINK_DELETE_COUNT');
    if(await count(q,`WITH removed AS (DELETE FROM public.media_assets a WHERE ${assetScope('a')} RETURNING 1)
      SELECT count(*)::text AS count FROM removed`)!==4)throw new Error('PH_MEDIA_ASSET_DELETE_COUNT');
    if(await count(q,`SELECT count(*)::text AS count FROM public.media_assets a WHERE ${assetScope('a')}`))throw new Error('PH_MEDIA_RESIDUAL');
    return {applied:true,assets:4,links:1,objects:4,missingObjects};
  }
}
