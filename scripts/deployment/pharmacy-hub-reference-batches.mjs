/** Complete bounded reference scans; no row payloads leave PostgreSQL. */
export const referenceBatchSize=1024;
export async function countReferenceBatches(q,sql,keys,errorCode) {
  let previous=null;
  for(;;) {
    const rows=await q.query(sql,[keys,previous]);
    const row=rows?.[0];
    if(rows?.length!==1||!row||typeof row.count!=='string'||!/^\d+$/.test(row.count)||
      typeof row.scanned!=='string'||!/^\d+$/.test(row.scanned))throw new Error(errorCode);
    const found=Number(row.count),scanned=Number(row.scanned);
    if(!Number.isSafeInteger(found)||!Number.isSafeInteger(scanned)||scanned>referenceBatchSize||found>scanned||
      (scanned===0?row.last_id!==null:typeof row.last_id!=='string'||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.last_id)||
        (previous!==null&&row.last_id<=previous)))throw new Error(errorCode);
    if(found)return found;
    if(scanned<referenceBatchSize)return 0;
    previous=row.last_id;
  }
}
export function referenceBatchQuery(c,patterns,owned) {
  const quote=value=>{
    if(typeof value!=='string'||! /^[A-Za-z_]\w*$/.test(value))throw new Error('PH_PURGE_IDENTIFIER');
    return `"${value}"`;
  };
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
