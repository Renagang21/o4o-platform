/** Read-only retirement census. Counts and schema only; no identities or credentials. */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve4 } from 'node:dns/promises';
import { readPassword, safeInventoryError } from './pharmacy-hub-qr-probes.mjs';

const identifiers = value => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw Object.assign(new Error('Unsupported schema identifier'), { code: 'SCHEMA_IDENTIFIER' });
  return `"${value}"`;
};
export const retiredKeys = ['pharmacy-hub', 'pharmacy_hub', 'pharmacy_hub_cart', 'pharmacy-hub-event-offer'];
const scopes = new Set(['service_key', 'service_code', 'source_service', 'service', 'source', 'source_module', 'service_keys', 'scope', 'scope_key', 'role', 'name', 'code', 'serviceKey', 'serviceCode', 'sourceService', 'sourceModule', 'serviceKeys', 'scopeKey']);

export function countQuery(table, column, array = false) {
  const field = identifiers(column);
  // Role prefixes are exact namespace matches, never arbitrary PH substrings.
  const predicate = array
    ? `EXISTS (SELECT 1 FROM unnest(${field}) v WHERE v::text = ANY($1::text[]) OR left(v::text,13) = 'pharmacy-hub:')`
    : `${field}::text = ANY($1::text[]) OR left(${field}::text,13) = 'pharmacy-hub:'`;
  return `SELECT count(*)::text AS count FROM public.${identifiers(table)} WHERE ${predicate}`;
}

export function jsonScopeQuery(table, column) {
  const field=identifiers(column);
  const clauses=['serviceKey','service_key','source','sourceService'].map(key=>`${field}->>'${key}' = ANY($1::text[])`);
  return `SELECT count(*)::text AS count FROM public.${identifiers(table)} WHERE ${clauses.join(' OR ')}`;
}

export async function collectRetirementInventory(client) {
  await client.query('BEGIN READ ONLY');
  let failure;
  let result;
  let stage = 'retirement-schema';
  try {
    await client.query("SET LOCAL statement_timeout = '10s'");
    const { rows: columns } = await client.query(`SELECT c.table_name,c.column_name,c.data_type,c.udt_name
      FROM information_schema.columns c JOIN information_schema.tables t
        ON t.table_schema=c.table_schema AND t.table_name=c.table_name
      WHERE c.table_schema='public' AND t.table_type='BASE TABLE'
      ORDER BY c.table_name,c.ordinal_position`);
    const dedicated = [...new Set(columns.filter(c => /^(ph_|pharmacy_hub_)/.test(c.table_name)).map(c => c.table_name))];
    const dedicatedTables = [];
    for (const table of dedicated) {
      identifiers(table);
      stage = `retirement-dedicated:${table}`;
      const { rows } = await client.query(`SELECT count(*)::text AS count FROM public.${identifiers(table)}`);
      dedicatedTables.push({ table, count: rows[0].count, columns: columns.filter(c => c.table_name === table).map(c => ({ name: c.column_name, type: c.data_type })) });
    }
    const scopeCounts = [];
    for (const c of columns.filter(c => (scopes.has(c.column_name) || /service/i.test(c.column_name)) && (['text','character varying','character','USER-DEFINED'].includes(c.data_type) || ['_text','_varchar'].includes(c.udt_name)))) {
      identifiers(c.table_name); identifiers(c.column_name);
      stage = `retirement-scope:${c.table_name}.${c.column_name}`;
      const { rows } = await client.query(countQuery(c.table_name,c.column_name,['_text','_varchar'].includes(c.udt_name)), [retiredKeys]);
      if (rows[0].count !== '0') scopeCounts.push({ table:c.table_name, column:c.column_name, count:rows[0].count });
    }
    for (const c of columns.filter(c => c.column_name==='metadata' && ['json','jsonb'].includes(c.data_type))) {
      identifiers(c.table_name); identifiers(c.column_name);
      stage = `retirement-json:${c.table_name}.${c.column_name}`;
      const { rows }=await client.query(jsonScopeQuery(c.table_name,c.column_name),[retiredKeys]);
      if(rows[0].count!=='0')scopeCounts.push({table:c.table_name,column:`${c.column_name}.{serviceKey,service_key,source,sourceService}`,count:rows[0].count});
    }
    const targets = [...new Set([...dedicated,...scopeCounts.map(c => c.table)])];
    stage = 'retirement-foreign-keys';
    const { rows: foreignKeys } = await client.query(`SELECT source.relname AS source_table,target.relname AS target_table,
        pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c JOIN pg_class source ON source.oid=c.conrelid
        JOIN pg_namespace sn ON sn.oid=source.relnamespace
        JOIN pg_class target ON target.oid=c.confrelid JOIN pg_namespace tn ON tn.oid=target.relnamespace
      WHERE c.contype='f' AND sn.nspname='public' AND tn.nspname='public'
        AND (source.relname=ANY($1::text[]) OR target.relname=ANY($1::text[]))
      ORDER BY source.relname,target.relname,c.conname`, [targets]);
    result = { readOnly:true, dedicatedTables,scopeCounts,foreignKeys,
      deletionApprovedByInventory:false, protected:['users','organizations','printed QR identifiers','shared Neture data','migration history','statutory retention assessment'] };
  } catch (error) {
    failure=safeInventoryError(error,stage);
  }
  try { await client.query('ROLLBACK'); } catch(error) { failure ??= safeInventoryError(error,'retirement-rollback'); }
  if (failure) throw failure;
  return result;
}

export function collectCloudInventory(run = spawnSync) {
  const project='netureyoutube', region='asia-northeast3';
  const checks=[
    ['applicationMap',['compute','url-maps','describe','o4o-global-lb']],
    ['httpsProxy',['compute','target-https-proxies','describe','o4o-global-lb-target-proxy-2']],
    ['urlMaps',['compute','url-maps','list']],
    ['backends',['compute','backend-services','list']],
    ['negs',['compute','network-endpoint-groups','list']],
    ['runService',['run','services','describe','pharmacy-hub-web',`--region=${region}`]],
  ];
  const result={readOnly:true,project,region,resources:{},blockers:[]};
  for (const [key,args] of checks) {
    try {
      const output=run('gcloud',[...args,`--project=${project}`,'--format=json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000});
      // gcloud list can return exit 0 and [] while warning that required permissions
      // prevented enumeration. Such partial results must never prove no references.
      if (typeof output !== 'string' && (output.status !== 0 || /Some requests did not succeed|required.*permission|PERMISSION_DENIED|Forbidden/i.test(output.stderr ?? ''))) {
        throw { stderr: output.stderr ?? '' };
      }
      const value=JSON.parse(typeof output === 'string' ? output : output.stdout);
      if(key==='applicationMap') {
        result.resources.applicationMap={name:value.name,phMatchers:(value.pathMatchers??[]).filter(m=>m.name==='path-matcher-pharmacy-hub')};
      } else if (key==='httpsProxy') {
        result.resources.httpsProxy={name:value.name,urlMap:value.urlMap};
      } else if (key==='urlMaps') {
        result.resources.urlMaps=value.map(map=>({name:map.name,region:map.region??'global',
          phReferences:JSON.stringify(map).includes('backend-pharmacy-hub-web'),
          phHostRules:(map.hostRules??[]).filter(r=>r.hosts?.some(h=>['pharmacyhub.co.kr','www.pharmacyhub.co.kr'].includes(h))),
          phMatchers:(map.pathMatchers??[]).filter(m=>m.name==='path-matcher-pharmacy-hub')}));
      } else if (key==='backends') {
        result.resources.backends=value.map(b=>({name:b.name,region:b.region??'global',groups:(b.backends??[]).map(v=>v.group)}));
      } else if (key==='negs') {
        result.resources.negs=value.filter(n=>n.cloudRun?.service==='pharmacy-hub-web'||n.name?.includes('pharmacy-hub')).map(n=>({name:n.name,region:n.region,type:n.networkEndpointType,cloudRunService:n.cloudRun?.service,selfLink:n.selfLink}));
      } else {
        result.resources.runService={name:value.metadata?.name,present:true};
      }
    } catch(error) {
      // Never echo arbitrary subprocess output (service envs/credentials may be embedded).
      const raw=String(error.stderr??'');
      result.blockers.push({check:key,code:/PERMISSION_DENIED|permission|Forbidden/i.test(raw)?'PERMISSION_DENIED':'UNAVAILABLE',permissions:[...new Set(raw.match(/(?:compute|run)\.[A-Za-z]+\.[A-Za-z]+/g)??[])]});
    }
  }
  return result;
}

async function collectDns(host,apiAddresses,resolve) {
  try {
    const addresses=await resolve(host);
    return {host,addressCount:addresses.length,matchesApiAddress:apiAddresses.length?addresses.some(a=>apiAddresses.includes(a)):null};
  } catch { return {host,error:'DNS_UNAVAILABLE'}; }
}

async function collectHttpProbe(host,path,request) {
  try {
    const response=await request(`https://${host}${path}`,{redirect:'manual',signal:AbortSignal.timeout(15000)});
    await response.body?.cancel();
    const location=response.headers.get('location');
    let target=null;
    try { if(location)target=new URL(location,`https://${host}`); } catch { /* retain status without raw Location */ }
    const expected=new URL(path.startsWith('/terms')?path.replace('/terms','/policy'):path,'https://pharmacy.neture.co.kr');
    return {host,family:path.split('?')[0],status:response.status,locationPresent:!!location,hostMatch:target?.host===expected.host,pathMatch:target?.pathname===expected.pathname,queryMatch:target?.search===expected.search,schemeMatch:target?.protocol===expected.protocol};
  } catch { return {host,family:path.split('?')[0],error:'HTTPS_UNAVAILABLE'}; }
}

export async function collectHttpInventory(request=fetch,resolve=resolve4) {
  const hosts=['pharmacyhub.co.kr','www.pharmacyhub.co.kr'];
  const paths=['/','/qr/__ph_retirement_rule_check__?ruleCheck=1','/tablet/__ph_retirement_rule_check__?ruleCheck=1','/multilingual-products/__ph_retirement_rule_check__?ruleCheck=1','/foreign-visitor/affiliate/__ph_retirement_rule_check__?ruleCheck=1','/terms?ruleCheck=1'];
  const apiAddresses=await resolve('api.neture.co.kr').catch(()=>[]);
  const [dns,checks]=await Promise.all([
    Promise.all(hosts.map(host=>collectDns(host,apiAddresses,resolve))),
    Promise.all(hosts.flatMap(host=>paths.map(path=>collectHttpProbe(host,path,request)))),
  ]);
  return {readOnly:true,dns,checks};
}

export async function collectCensus(database, cloud = collectCloudInventory, http = collectHttpInventory) {
  let databaseResult;
  let failed = false;
  try { databaseResult = await database(); }
  catch (error) {
    failed = true;
    databaseResult = { readOnly: true, complete: false, error: safeInventoryError(error, 'retirement-census').message };
  }
  // Database failure must not conceal independent Cloud permission and redirect evidence.
  return { failed, database: databaseResult, cloud: cloud(), http: await http() };
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  let client;
  try {
    const result = await collectCensus(async () => {
      if (!process.env.DB_USERNAME||!process.env.DB_NAME) throw new Error('Database bindings missing');
      const require=createRequire(new URL('../../apps/api-server/package.json',import.meta.url));
      const { Client }=require('pg');
      client=new Client({host:'127.0.0.1',port:55432,user:process.env.DB_USERNAME,database:process.env.DB_NAME,password:readPassword(),connectionTimeoutMillis:15000,options:'-c default_transaction_read_only=on'});
      await client.connect();
      return collectRetirementInventory(client);
    });
    console.log(JSON.stringify(result));
    if (result.failed) process.exitCode=1;
  } catch(error) {
    console.error(safeInventoryError(error,'retirement-census').message);
    process.exitCode=1;
  } finally { await client?.end(); }
}
