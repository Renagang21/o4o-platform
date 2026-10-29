import type { DataSource } from 'typeorm';
import { sanitizeStrategy } from '../ai-tools/work-assistance.js';
import { isRegisteredBrowserSite } from '../local-agent/browser-site-registry.js';
import { assertAccount } from '../../modules/external-ai/adapters/adapter.js';

/** Separate opt-in from business mirroring. Never shares labels, values or conversations. */
export async function methodSharing(db:DataSource,userId:string,enabled?:boolean) {
 await assertAccount(db,userId);
 if(enabled!==undefined) {
   if(typeof enabled!=='boolean')throw Error('SHARING_INVALID');
   await db.query(`INSERT INTO assistant_method_sharing_consents(user_id,enabled) VALUES($1,$2)
    ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,updated_at=now()`,[userId,enabled]);
 }
 const [row]=await db.query('SELECT enabled FROM assistant_method_sharing_consents WHERE user_id=$1',[userId]);
 return {enabled:row?.enabled===true};
}
export async function sharedMethodCandidates(db:DataSource,userId:string,targetId:string,taskKey:string|null) {
 if(!isRegisteredBrowserSite(targetId))return [];
 const rows=await db.query(`SELECT jsonb_build_object('ops',clean.ops) AS strategy,
   count(DISTINCT p.user_id)::int AS contributors,sum(p.verified_count)::int AS verified
   FROM assistant_procedural_patterns p JOIN assistant_method_sharing_consents c ON c.user_id=p.user_id AND c.enabled=true
   CROSS JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('op',op->>'op') ORDER BY n) AS ops FROM jsonb_array_elements(p.strategy->'ops') WITH ORDINALITY item(op,n)) clean
   JOIN users u ON u.id=p.user_id AND u."isActive"=true AND u."isEmailVerified"=true AND u.status IN ('active','approved')
   WHERE p.ownership_scope='USER' AND p.user_id<>$1 AND p.target_id=$2 AND ($3::text IS NULL OR p.task_type_key=$3)
   AND p.polarity='preferred' AND p.status='verified' AND p.verified_count>p.failed_count
   AND p.last_used_at>now()-interval '365 days'
   GROUP BY clean.ops HAVING count(DISTINCT p.user_id)>=2
   ORDER BY count(DISTINCT p.user_id) DESC,sum(p.verified_count) DESC LIMIT 5`,[userId,targetId,taskKey]);
 return rows.flatMap(row=>{const strategy=sanitizeStrategy(row.strategy,[],false);return strategy?[{stage:'discovery',strategy,contributors:row.contributors,verified:row.verified}]:[];});
}
