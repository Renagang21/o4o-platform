/** Owner-authorized retirement of former community test data.
 * Default is a read-only plan. Apply requires the exact plan fingerprint.
 * Never removes users, role assignments, business/funding forums or shared media.
 */
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const codes=['neture','kpa-society','pharmacy-hub','k-cosmetics','community'];
const quoted=value=>{if(!/^[A-Za-z_]\w*$/.test(value))throw new Error('COMMUNITY_PURGE_IDENTIFIER');return `"${value}"`;};
const roots=`SELECT f.id FROM public.forum_category_requests f WHERE f.organization_id IS NULL AND (f.service_code=ANY($1::text[]) OR f.service_code LIKE 'community:%')`;
const posts=`SELECT p.id FROM public.forum_post p WHERE p.forum_id IN (${roots})`;
const comments=`SELECT c.id FROM public.forum_comment c WHERE c."postId" IN (${posts})`;
const members='SELECT m.id FROM public.community_memberships m WHERE m.community_id IN (SELECT id FROM public.communities)';
/** Delete leaves before roots; predicates always select by resource identity, never author/user alone. */
export const scope=Object.freeze([
 ['forum_notifications',`t."postId" IN (${posts}) OR t."commentId" IN (${comments})`],
 ['forum_like',`(t."targetType"='post' AND t."targetId" IN (${posts})) OR (t."targetType"='comment' AND t."targetId" IN (${comments}))`],
 ['forum_bookmark',`t."postId" IN (${posts})`],
 ['forum_post_like',`t.post_id IN (${posts})`],
 ['forum_comment',`t."postId" IN (${posts})`],
 ['forum_category_members',`t.forum_category_id IN (${roots})`],
 ['forum_join_requests',`t.forum_category_id IN (${roots})`],
 ['forum_post',`t.forum_id IN (${roots})`],
 ['forum_category_requests',`t.id IN (${roots})`],
 ['community_membership_changes','t.community_id IN (SELECT id FROM public.communities)'],
 ['service_memberships',`t.service_key='community' AND t.user_id IN (SELECT user_id FROM public.community_memberships)
   AND NOT EXISTS (SELECT 1 FROM public.role_assignments ra WHERE ra.user_id=t.user_id AND ra.is_active=true
     AND ra.role IN ('community:admin','community:operator') AND ra.valid_from<=CURRENT_TIMESTAMP
     AND (ra.valid_until IS NULL OR ra.valid_until>=CURRENT_TIMESTAMP))`],
 ['community_memberships',`t.id IN (${members})`],
 ['community_creation_requests','true'],
 ['communities','true'],
]);
const byTable=new Map(scope);
const parameterized=(sql)=>sql.includes('$1')?[codes]:[];
async function rows(q,sql){return (await q.query(sql,parameterized(sql))).rows;}
async function references(q){
 return (await q.query(`SELECT ns.nspname AS schema,c.relname AS child,p.relname AS parent,
    array_agg(a.attname::text ORDER BY x.ord) AS child_columns,array_agg(b.attname::text ORDER BY x.ord) AS parent_columns
   FROM pg_constraint fk JOIN pg_class c ON c.oid=fk.conrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace
   JOIN pg_class p ON p.oid=fk.confrelid JOIN pg_namespace pn ON pn.oid=p.relnamespace
   CROSS JOIN LATERAL unnest(fk.conkey,fk.confkey) WITH ORDINALITY AS x(cnum,pnum,ord)
   JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=x.cnum JOIN pg_attribute b ON b.attrelid=p.oid AND b.attnum=x.pnum
   WHERE fk.contype='f' AND pn.nspname='public' AND p.relname=ANY($1::text[])
   GROUP BY fk.oid,ns.nspname,c.relname,p.relname ORDER BY ns.nspname,c.relname,p.relname,fk.oid`,[scope.map(([t])=>t)])).rows;
}
export async function plan(q){
 const hash=createHash('sha256');const counts={};
 for(const [table,predicate] of scope){
  const data=await rows(q,`SELECT to_jsonb(t) AS item FROM public.${quoted(table)} t WHERE ${predicate} ORDER BY t.id`);
  counts[table]=data.length;hash.update(JSON.stringify([table,data.map(r=>r.item)]));
 }
 const blockers=[];
 for(const fk of await references(q)){
  const join=fk.child_columns.map((c,i)=>`t.${quoted(c)}=p.${quoted(fk.parent_columns[i])}`).join(' AND ');
  const own=fk.schema==='public'?byTable.get(fk.child):null;
  const target=byTable.get(fk.parent).replaceAll('t.','p.');
  const [{n}]=await rows(q,`SELECT count(*)::int AS n FROM ${quoted(fk.schema)}.${quoted(fk.child)} t
   JOIN public.${quoted(fk.parent)} p ON ${join} WHERE (${target}) AND NOT COALESCE((${own??'false'}),false)`);
  if(n)blockers.push({kind:'outside_scope_reference',table:`${fk.schema}.${fk.child}`,parent:fk.parent,count:n});
 }
 // Cross-service or organization-owned posts in a selected board are never silently adopted.
 const [{n:exclusive}]=await rows(q,`SELECT count(*)::int AS n FROM public.forum_post t
   WHERE t.forum_id IN (${roots}) AND (t.organization_id IS NOT NULL OR t.is_organization_exclusive=true)`);
 if(exclusive)blockers.push({kind:'organization_content',count:exclusive});
 // Owned object deletion needs a separate reference/generation census, never arbitrary URL deletion.
 const [{n:media}]=await rows(q,`SELECT count(*)::int AS n FROM public.forum_post t WHERE t.forum_id IN (${roots})
   AND (COALESCE(t.content::text,'') ~* '(storage.googleapis.com|/uploads/|gs://)' OR COALESCE(t.metadata::text,'') ~* '(storage.googleapis.com|/uploads/|gs://)')`);
 if(media)blockers.push({kind:'media_reference_review',count:media});
 hash.update(JSON.stringify(blockers));
 return {operation:'community-test-data-retirement',counts,blockers,digest:hash.digest('hex'),applied:false};
}
export async function runPurge(client,{apply=false,expectedDigest}={}){
 if(apply&&!/^[a-f0-9]{64}$/.test(expectedDigest??''))throw new Error('COMMUNITY_PURGE_DIGEST_REQUIRED');
 await client.query(apply?'BEGIN ISOLATION LEVEL SERIALIZABLE':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
  await client.query("SET LOCAL lock_timeout='5s'");await client.query("SET LOCAL statement_timeout='30s'");
  if(apply){
   const fks=await references(client);
   const tables=[...new Set([...scope.map(([t])=>`public.${quoted(t)}`),...fks.map(f=>`${quoted(f.schema)}.${quoted(f.child)}`)])].sort((a,b)=>a.localeCompare(b));
   await client.query(`LOCK TABLE ${tables.join(',')} IN SHARE ROW EXCLUSIVE MODE`);
  }
  const before=await plan(client);
  if(!apply){await client.query('ROLLBACK');return before;}
  if(before.digest!==expectedDigest)throw new Error('COMMUNITY_PURGE_PLAN_CHANGED');
  if(before.blockers.length)throw new Error('COMMUNITY_PURGE_REFERENCE_REVIEW_REQUIRED');
  for(const [table,predicate] of scope){
   const deleted=await rows(client,`DELETE FROM public.${quoted(table)} t WHERE ${predicate} RETURNING t.id`);
   if(deleted.length!==before.counts[table])throw new Error(`COMMUNITY_PURGE_COUNT_CHANGED:${table}`);
  }
  const after=await plan(client);
  if(Object.values(after.counts).some(n=>n!==0))throw new Error('COMMUNITY_PURGE_REMAINS');
  await client.query('COMMIT');return {...before,applied:true,remaining:after.counts};
 }catch(error){await client.query('ROLLBACK');throw error;}
}
async function main(){
 const args=process.argv.slice(2);
 if(args.some(a=>!['--plan','--apply'].includes(a)&&!a.startsWith('--expected-digest='))||args.includes('--plan')&&args.includes('--apply'))throw new Error('COMMUNITY_PURGE_ARGUMENTS');
 if(!['production','local-fixture'].includes(process.env.COMMUNITY_PURGE_ENVIRONMENT))throw new Error('COMMUNITY_PURGE_ENVIRONMENT_REQUIRED');
 if(!['DB_HOST','DB_USERNAME','DB_NAME'].every(k=>process.env[k]))throw new Error('COMMUNITY_PURGE_DB_BINDING_REQUIRED');
 const {Client}=await import('pg');
 const client=new Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT??5432),user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
 try{await client.connect();console.log(JSON.stringify(await runPurge(client,{apply:args.includes('--apply'),expectedDigest:args.find(a=>a.startsWith('--expected-digest='))?.split('=')[1]})));}
 finally{await client.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(error=>{console.error(/^COMMUNITY_PURGE_[A-Z_]+(?::[a-z_]+)?$/.test(error.message)?error.message:'COMMUNITY_PURGE_FAILED');process.exitCode=1;});
}
