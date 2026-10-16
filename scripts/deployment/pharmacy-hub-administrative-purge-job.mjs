/** Runs reviewed PH administrative cleanup inside a disposable Cloud Run job, never runner SQL. */
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { assertProductionIdle } from './pharmacy-hub-resource-retirement.mjs';

const project='netureyoutube', region='asia-northeast3';
const base=[`--project=${project}`,`--region=${region}`,'--quiet'];
export function restrictedWifCondition(sha) {
  if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('PH_JOB_SHA');
  const ref='Renagang21/o4o-platform/.github/workflows/pharmacyhub-qr-cutover.yml@refs/heads/main';
  return `assertion.repository_id == '964347291' && assertion.repository_owner_id == '173977471' && assertion.repository == 'Renagang21/o4o-platform' && assertion.environment == 'production' && assertion.event_name == 'workflow_dispatch' && assertion.actor_id == '173977471' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == '${ref}' && assertion.workflow_sha == '${sha}' && assertion.job_workflow_ref == '${ref}' && assertion.job_workflow_sha == '${sha}'`;
}
export function assertRestrictedWif(condition,sha) {
  if(String(condition).trim().replace(/\s+/g,' ')!==restrictedWifCondition(sha))throw new Error('PH_JOB_WIF_RESTRICTION_REQUIRED');
}
// Only transport failures and GitHub-side transient statuses are retried. A
// successfully decoded response is evaluated once: moved main, missing CI and busy
// production remain immediate blocks.
const transientStatus=new Set([429,500,502,503,504]);
export async function github(path,{fetchImpl=fetch,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=3}={}) {
  if(!process.env.PRODUCTION_GATE_TOKEN)throw new Error('PH_JOB_GITHUB_AUTH');
  for(let attempt=1;;attempt++) {
    let response;
    try {
      response=await fetchImpl(`https://api.github.com/repos/Renagang21/o4o-platform/${path}`,{
        headers:{Authorization:`Bearer ${process.env.PRODUCTION_GATE_TOKEN}`,Accept:'application/vnd.github+json','Cache-Control':'no-cache'},
        signal:AbortSignal.timeout(15000),
      });
    } catch {
      response=undefined;
    }
    if(response&&!transientStatus.has(response.status)) {
      if(!response.ok)throw new Error('PH_JOB_GITHUB_GATE');
      try {return await response.json();} catch(error) {
        // Body reads can fail after headers arrive; malformed JSON and other
        // response errors remain immediate failures without exposing details.
        if(!(error instanceof TypeError||['AbortError','TimeoutError'].includes(error?.name)))
          throw new Error('PH_JOB_GITHUB_RESPONSE');
      }
    }
    if(attempt>=attempts)throw new Error('PH_JOB_GITHUB_UNAVAILABLE');
    await pause(1000*attempt);
  }
}
export async function gate(request=github) {
  const e=process.env;
  if(e.GITHUB_REF!=='refs/heads/main'||e.WORKFLOW_ACTOR!==e.REPOSITORY_OWNER||
    !['plan','apply'].includes(e.CUTOVER_MODE)||!/^\d+$/.test(e.GITHUB_RUN_ID??''))throw new Error('PH_JOB_OWNER_MAIN_MODE');
  if(e.CUTOVER_MODE==='apply'&&e.DEPLOY_FREEZE!=='false')throw new Error('PH_JOB_FROZEN');
  if(e.CUTOVER_MODE==='apply') {
    const condition=run(['iam','workload-identity-pools','providers','describe','o4o-platform',
      '--project=netureyoutube','--location=global','--workload-identity-pool=github-actions','--format=value(attributeCondition)']);
    assertRestrictedWif(condition,e.GITHUB_SHA);
  }
  const main=await request('git/ref/heads/main');
  if(main?.object?.sha!==e.GITHUB_SHA)throw new Error('PH_JOB_MAIN_MOVED');
  const checks=await request(`commits/${e.GITHUB_SHA}/check-runs?check_name=CI%20Gate&per_page=100`);
  if(!checks?.check_runs?.some(c=>c.name==='CI Gate'&&c.app?.id===15368&&c.head_sha===e.GITHUB_SHA&&c.conclusion==='success'))throw new Error('PH_JOB_CI_REQUIRED');
  await assertProductionIdle(e.GITHUB_RUN_ID,(status,page)=>request(`actions/runs?status=${status}&per_page=100&page=${page}`));
}
function run(args,timeout=60000) {
  const r=spawnSync('/usr/bin/gcloud',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout});
  const denied=/PERMISSION_DENIED|Some requests did not succeed|required.*permission|Forbidden/i.test(r.stderr??'');
  if(r.error||r.status!==0||denied) {
    const permissions=[...new Set(String(r.stderr??'').match(/(?:run|iam|secretmanager)\.[A-Za-z]+\.[A-Za-z]+/g)??[])];
    // Only a fixed reason and numeric status/signal name; never stderr text.
    const reason=r.error?.code==='ETIMEDOUT'?'timeout':r.error?'spawn':denied?'denied':'exit';
    const status=reason==='exit'?` exit=${Number.isInteger(r.status)?r.status:/^SIG[A-Z0-9]+$/.test(r.signal??'')?r.signal:'unknown'}`:'';
    throw new Error(`PH_JOB_COMMAND_UNCONFIRMED permissions=${permissions.join(',')||'unknown'} reason=${reason}${status}`);
  }
  return r.stdout.trim();
}
const diagnosticValue=/^[A-Za-z0-9.,_-]{1,200}$/;
/** Maps any failure to fixed, non-secret fields. Unknown messages are never echoed. */
export function diagnosticCause(error) {
  const message=typeof error?.message==='string'?error.message:'';
  const own=message.match(/^PH_JOB_([A-Z_]+)((?: [a-z_]+=[A-Za-z0-9.,_-]+)*)$/);
  if(own)return {cause:own[1],fields:own[2].trim()};
  const busy=message.match(/^Production write gate blocked: workflow=([a-z0-9-]+\.yml); run=(\d+)\.$/);
  if(busy)return {cause:'PRODUCTION_BUSY',fields:`workflow=${busy[1]} run=${busy[2]}`};
  if(/^(?:Production run|Referenced production workflow)/.test(message))return {cause:'PRODUCTION_INVENTORY',fields:''};
  const name=typeof error?.name==='string'&&/^[A-Za-z]{1,40}$/.test(error.name)?error.name:'unknown';
  return {cause:'UNEXPECTED',fields:`error=${name}`};
}
export function stageError(stage,error,startedAt,extra={}) {
  const {cause,fields}=diagnosticCause(error);
  const additional=Object.entries(extra).filter(([key,value])=>/^[a-z_]+$/.test(key)&&diagnosticValue.test(String(value)))
    .map(([key,value])=>`${key}=${value}`);
  return new Error(['PH_JOB_STAGE_FAILED',`stage=${stage}`,`cause=${cause}`,fields,...additional,
    `elapsed_ms=${Math.max(0,Math.round(performance.now()-startedAt))}`].filter(Boolean).join(' '));
}
async function stage(name,action,extra) {
  const startedAt=performance.now();
  let result;
  try {result=await action();}
  catch(error) {throw stageError(name,error,startedAt,extra);}
  console.log(`PH_JOB_TIMING stage=${name} elapsed_ms=${Math.round(performance.now()-startedAt)}`);
  return result;
}
export function jobArguments({image,source,mode,runId,attempt,username,database,purge='administrative'}) {
  if(!['administrative','development','media'].includes(purge))throw new Error('PH_JOB_SCOPE');
  const selected={administrative:{className:'PharmacyHubAdministrativePurge',prefix:'ph-admin',timeout:300},
    development:{className:'PharmacyHubDevelopmentPurge',prefix:'ph-dev',timeout:600},
    media:{className:'PharmacyHubMediaPurge',prefix:'ph-media',timeout:600}}[purge];
  if(!/^asia-northeast3-docker\.pkg\.dev\/netureyoutube\/o4o-api\/api-server@sha256:[a-f0-9]{64}$/.test(image))throw new Error('PH_JOB_IMAGE_NOT_PINNED');
  if(!['plan','apply'].includes(mode)||!/^\d+$/.test(runId)||!/^\d+$/.test(attempt))throw new Error('PH_JOB_IDENTITY');
  // These are secret bindings, not interpolated shell code; reject Cloud SDK delimiter injection.
  if(!username||!database||[username,database].some(v=>/[:\r\n]/.test(v)))throw new Error('PH_JOB_DB_BINDING');
  const entry=`
import {createRequire} from 'node:module';
import {createHash as diagnosticHash} from 'node:crypto';
import {writeSync as diagnosticWrite} from 'node:fs';
const {Client}=createRequire('/app/package.json')('pg');
${purge==='media'?"const {Storage}=createRequire('/app/package.json')('@google-cloud/storage');":''}
const client=new Client({host:process.env.DB_HOST,port:5432,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
let stage='connect',queryHash='none',queries=0;
// Elapsed time per stage/phase. Labels are fixed names plus catalog identifiers only.
const timingStarted=performance.now(),phaseTotals=new Map();
let phaseLabel='stage:connect',phaseStarted=timingStarted;
function closePhase() {
  const now=performance.now();
  phaseTotals.set(phaseLabel,(phaseTotals.get(phaseLabel)??0)+now-phaseStarted);phaseStarted=now;
}
function markPhase(label) {
  closePhase();
  phaseLabel=typeof label==='string'&&/^[a-z_]+(?::[A-Za-z0-9_.]{1,200})?$/.test(label)?label:'unlabeled';
}
function enterStage(next) {stage=next;markPhase('stage:'+next);}
function timingSummary() {
  closePhase();
  const entries=[...phaseTotals].map(([label,ms])=>[label,Math.round(ms)]),byKind={};
  for(const [label,ms] of entries)byKind[label.split(':')[0]]=(byKind[label.split(':')[0]]??0)+ms;
  return 'PH_PURGE_TIMING '+JSON.stringify({total_ms:Math.round(performance.now()-timingStarted),queries,current:phaseLabel,
    by_kind:byKind,slowest:entries.sort((a,b)=>b[1]-a[1]).slice(0,20)});
}
function interrupted() {
  diagnosticWrite(2,'PH_PURGE_INTERRUPTED stage='+stage+' signal=SIGTERM query_sha256='+queryHash+'\\n');
  try{diagnosticWrite(2,timingSummary()+'\\n')}catch{}
  process.exit(1);
}
process.once('SIGTERM',interrupted);
async function query(sql,args) {
  queryHash=diagnosticHash('sha256').update(sql).digest('hex');queries++;
  return client.query(sql,args);
}
try {
  await client.connect();
  enterStage('begin');
  await query(${JSON.stringify(mode==='plan'?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN ISOLATION LEVEL SERIALIZABLE')});
  enterStage('purge');
  const result=await new ${selected.className}(${purge==='media'?'{storage:new Storage({retryOptions:{autoRetry:false,maxRetries:0}})}':''}).up({isTransactionActive:true,phase:markPhase,query:async(sql,args)=>(await query(sql,args)).rows},${mode==='plan'});
  enterStage('finish');
  await query(${JSON.stringify(mode==='plan'?'ROLLBACK':'COMMIT')});
  console.log(JSON.stringify(result??{applied:true,administrativeScopeOnly:true}));
  console.log(timingSummary());
} catch(error) {
  try{await client.query('ROLLBACK')}catch{}
  const message=typeof error.message==='string'&&/^PH_(?:PURGE|DEV|MEDIA)_[A-Z_]+(?::[a-zA-Z0-9_.]+)?$/.test(error.message)?error.message:'PH_PURGE_FAILED';
  const code=typeof error.code==='string'&&/^[0-9A-Z]{5}$/.test(error.code)?error.code:'unknown';
  console.error(message+' stage='+stage+' code='+code+' query_sha256='+queryHash);process.exitCode=1;
  console.log(timingSummary());
} finally {try{await client.end()}catch{process.exitCode=1}process.removeListener('SIGTERM',interrupted)}
`;
  const payload=Buffer.from(source+entry).toString('base64');
  const boot=`await import('data:text/javascript;base64,${payload}')`;
  const name=`${selected.prefix}-${runId}-${attempt}`;
  return {name,args:['run','jobs','create',name,...base,`--image=${image}`,
    '--service-account=o4o-runtime@netureyoutube.iam.gserviceaccount.com','--tasks=1','--parallelism=1','--max-retries=0',`--task-timeout=${selected.timeout}`,
    '--set-cloudsql-instances=netureyoutube:asia-northeast3:o4o-platform-db',
    '--set-secrets=DB_PASSWORD=o4o-db-password:latest',
    `--set-env-vars=^::^NODE_ENV=production::DB_HOST=/cloudsql/netureyoutube:asia-northeast3:o4o-platform-db::DB_PORT=5432::DB_USERNAME=${username}::DB_NAME=${database}`,
    '--command=node',`--args=^|^--input-type=module|-e|${boot}`]};
}
export async function loadPurgeSource(purge) {
  const files={administrative:'pharmacy-hub-administrative-purge.mjs',development:'pharmacy-hub-development-purge.mjs',media:'pharmacy-hub-media-purge.mjs'};
  if(!Object.hasOwn(files,purge))throw new Error('PH_JOB_SCOPE');
  const source=await readFile(new URL(files[purge],import.meta.url),'utf8');
  if(purge==='administrative')return source;
  // A data-URL worker cannot resolve repository-relative imports. Embed the
  // shared pure scanner as a data module; never depend on the serving image's files.
  const relative="from './pharmacy-hub-reference-batches.mjs'";
  if(source.split(relative).length!==2)throw new Error('PH_JOB_SOURCE');
  const helper=await readFile(new URL('./pharmacy-hub-reference-batches.mjs',import.meta.url),'utf8');
  return source.replace(relative,`from 'data:text/javascript;base64,${Buffer.from(helper).toString('base64')}'`);
}
export async function runJob({development=false,media=false}={},deps={}) {
  if(development&&media)throw new Error('PH_JOB_SCOPE');
  const {gateCheck=gate,command=run}=deps;
  await stage('preflight_gate',()=>gateCheck());
  const purge=development?'development':media?'media':'administrative';
  const {name,args}=await stage('prepare',async()=>{
    const service=JSON.parse(command(['run','services','describe','o4o-core-api',...base,'--format=json(status.traffic)']));
    const traffic=service.status?.traffic?.filter(t=>t.percent>0);
    if(!Array.isArray(traffic)||traffic.length!==1||traffic[0].percent!==100)throw new Error('PH_JOB_SPLIT_TRAFFIC');
    const revision=traffic[0].revisionName;
    if(!/^o4o-core-api-[a-z0-9-]+$/.test(revision))throw new Error('PH_JOB_REVISION');
    const image=command(['run','revisions','describe',revision,...base,'--format=value(status.imageDigest)']);
    const source=await loadPurgeSource(purge);
    return jobArguments({image,source,mode:process.env.CUTOVER_MODE,runId:process.env.GITHUB_RUN_ID,
      attempt:process.env.GITHUB_RUN_ATTEMPT,username:process.env.DB_USERNAME,database:process.env.DB_NAME,purge});
  });
  await stage('pre_create_gate',()=>gateCheck());
  await stage('create',()=>command(args),{job:name});
  // Recheck immediately before the job can connect/write. A failure retains the job for inspection.
  await stage('pre_execute_gate',()=>gateCheck(),{job:name});
  await stage('execute',()=>command(['run','jobs','execute',name,...base,'--wait'],development||media?660000:360000),{job:name});
  // Keep the exclusive authentication window through completion and cleanup.
  // gcloud --wait succeeded here; a later failure must not be read as a worker failure.
  await stage('post_execute_gate',()=>gateCheck(),{job:name,execution:'succeeded'});
  console.log(JSON.stringify({mode:process.env.CUTOVER_MODE,job:name,executionSucceeded:true,applied:process.env.CUTOVER_MODE==='apply'}));
  await stage('cleanup',()=>command(['run','jobs','delete',name,...base]),{job:name,execution:'succeeded'});
}
export function runnerFailureMessage(error,fallback='PH_JOB_NOT_CONFIRMED; inspect execution and rerun read-only census before retry') {
  return /^PH_JOB_[A-Z_]+(?: [a-z_]+=[A-Za-z0-9.,_-]+)*$/.test(error?.message??'')?error.message:fallback;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {await runJob();}catch(error){
    console.error(runnerFailureMessage(error));
    process.exitCode=1;
  }
}
