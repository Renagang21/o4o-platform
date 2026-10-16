/** Complete bounded reference scans; source row payloads stay inside PostgreSQL. */
export const referenceBatchSize=1024;
function quote(value) {
  if(typeof value!=='string'||! /^[A-Za-z_]\w*$/.test(value))throw new Error('PH_PURGE_IDENTIFIER');
  return `"${value}"`;
}
export async function countReferenceBatches(q,sql,keys,errorCode,group) {
  let previous=null;
  for(;;) {
    const rows=await q.query(sql,group?[keys,previous,group.target_tokens]:[keys,previous]);
    const row=rows?.[0];
    if(rows?.length!==1||!row||typeof row.count!=='string'||!/^\d+$/.test(row.count)||
      typeof row.scanned!=='string'||!/^\d+$/.test(row.scanned))throw new Error(errorCode);
    const found=Number(row.count),scanned=Number(row.scanned);
    if(!Number.isSafeInteger(found)||!Number.isSafeInteger(scanned)||scanned>referenceBatchSize||found>scanned||
      (scanned===0?row.last_id!==null:typeof row.last_id!=='string'||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.last_id)||
        (previous!==null&&row.last_id<=previous)))throw new Error(errorCode);
    if(group) {
      const index=Number(row.column_index);
      if(found?(typeof row.column_index!=='string'||!/^\d+$/.test(row.column_index)||!Number.isInteger(index)||index<1||index>group.columns.length):row.column_index!==null)
        throw new Error(errorCode);
      if(found)group.matched_column=group.columns[index-1];
    }
    if(found)return found;
    if(scanned<referenceBatchSize)return 0;
    previous=row.last_id;
  }
}
export function referenceBatchQuery(c,patterns,owned) {
  return `${patterns},
        reference_source AS MATERIALIZED (
          SELECT s.${quote(c.scan_key)} AS scan_id,s.${quote(c.column)}::text AS scan_value,(${owned}) AS owned
          FROM ONLY ${quote(c.schema)}.${quote(c.table)} s
          WHERE ($2::uuid IS NULL OR s.${quote(c.scan_key)}>$2::uuid)
          ORDER BY s.${quote(c.scan_key)} LIMIT ${referenceBatchSize})
      SELECT count(*) FILTER(WHERE NOT COALESCE(source.owned,FALSE)
        AND (source.scan_value COLLATE "C") ~ targets.pattern)::text AS count,
        (SELECT count(*)::text FROM reference_source) AS scanned,
        (SELECT scan_id::text FROM reference_source ORDER BY scan_id DESC LIMIT 1) AS last_id
      FROM reference_source source CROSS JOIN target_patterns targets`;
}

/** Optional worker timing hook; labels carry catalog identifiers only. */
export function markPhase(q,label) {if(typeof q?.phase==='function')q.phase(label);}
export function referencePhase(c) {
  if(c.columns)return `reference_group:${c.schema}.${c.table}`;
  return `${c.type==='uuid'?'reference_uuid':c.scan_key?'reference_batch':'reference_full'}:${c.schema}.${c.table}.${c.column}`;
}
/** One target snapshot per reference phase; never serialize tokens into SQL/logs. */
export async function prepareReferenceGroups(q,columns,targetSql,keys,errorCode) {
  const result=[],groups=new Map();
  for(const c of columns) {
    // A UUID column without its own full index would otherwise be a separate
    // whole-table scan. Fold it into the table's single keyset pass: its
    // ::text regex match is the same equality/legacy-fallback decision.
    if(!c.scan_key||(c.type==='uuid'&&c.indexed!==false)) {result.push(c);continue;}
    const key=JSON.stringify([c.schema,c.table,c.scan_key]);
    let group=groups.get(key);
    if(!group) {
      group={...c,columns:[]};groups.set(key,group);result.push(group);
    }
    group.columns.push(c.column);
  }
  if(groups.size) {
    const rows=await q.query(targetSql,[keys]);
    if(!Array.isArray(rows)||rows.some(r=>r.id!==null&&typeof r.id!=='string'))throw new Error(errorCode);
    const tokens=[...new Set(rows.map(r=>r.id).filter(v=>v!==null))];
    for(const group of groups.values())group.target_tokens=tokens;
  }
  return result;
}
export function groupedReferenceQuery(c,owned) {
  if(!Array.isArray(c.columns)||!c.columns.length||!Array.isArray(c.target_tokens)||c.target_tokens.some(t=>typeof t!=='string'))
    throw new Error('PH_PURGE_REFERENCE_GROUP');
  return `WITH target_patterns AS MATERIALIZED (
        SELECT string_agg(regexp_replace(token,'([[:punct:]])',repeat(chr(92),3)||'1','g'),'|') AS pattern,
          min(octet_length(token)) AS min_bytes
        FROM unnest($3::text[]) token WHERE $1::text[] IS NOT NULL),
      reference_source AS MATERIALIZED (
        SELECT s.${quote(c.scan_key)} AS scan_id,
          ARRAY[${c.columns.map(column=>`s.${quote(column)}::text`).join(',')}]::text[] AS scan_values,(${owned}) AS owned
        FROM ONLY ${quote(c.schema)}.${quote(c.table)} s
        WHERE ($2::uuid IS NULL OR s.${quote(c.scan_key)}>$2::uuid)
        ORDER BY s.${quote(c.scan_key)} LIMIT ${referenceBatchSize})
      SELECT count(found.ordinal)::text AS count,min(found.ordinal)::text AS column_index,
        (SELECT count(*)::text FROM reference_source) AS scanned,
        (SELECT scan_id::text FROM reference_source ORDER BY scan_id DESC LIMIT 1) AS last_id
      FROM reference_source source CROSS JOIN target_patterns targets
      LEFT JOIN LATERAL (
        SELECT value.ordinal FROM unnest(source.scan_values) WITH ORDINALITY value(payload,ordinal)
        WHERE NOT COALESCE(source.owned,FALSE) AND CASE
          WHEN octet_length(value.payload)>=targets.min_bytes THEN (value.payload COLLATE "C") ~ targets.pattern
          ELSE FALSE END
        ORDER BY value.ordinal LIMIT 1) found ON TRUE`;
}
