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
async function github(path) {
  if(!process.env.PRODUCTION_GATE_TOKEN)throw new Error('PH_JOB_GITHUB_AUTH');
  const response=await fetch(`https://api.github.com/repos/Renagang21/o4o-platform/${path}`,{
    headers:{Authorization:`Bearer ${process.env.PRODUCTION_GATE_TOKEN}`,Accept:'application/vnd.github+json','Cache-Control':'no-cache'},
    signal:AbortSignal.timeout(15000),
  });
  if(!response.ok)throw new Error('PH_JOB_GITHUB_GATE');
  return response.json();
}
export async function gate() {
  const e=process.env;
  if(e.GITHUB_REF!=='refs/heads/main'||e.WORKFLOW_ACTOR!==e.REPOSITORY_OWNER||
    !['plan','apply'].includes(e.CUTOVER_MODE)||!/^\d+$/.test(e.GITHUB_RUN_ID??''))throw new Error('PH_JOB_OWNER_MAIN_MODE');
  if(e.CUTOVER_MODE==='apply'&&e.DEPLOY_FREEZE!=='false')throw new Error('PH_JOB_FROZEN');
  if(e.CUTOVER_MODE==='apply') {
    const condition=run(['iam','workload-identity-pools','providers','describe','o4o-platform',
      '--project=netureyoutube','--location=global','--workload-identity-pool=github-actions','--format=value(attributeCondition)']);
    assertRestrictedWif(condition,e.GITHUB_SHA);
  }
  const main=await github('git/ref/heads/main');
  if(main.object?.sha!==e.GITHUB_SHA)throw new Error('PH_JOB_MAIN_MOVED');
  const checks=await github(`commits/${e.GITHUB_SHA}/check-runs?check_name=CI%20Gate&per_page=100`);
  if(!checks.check_runs?.some(c=>c.name==='CI Gate'&&c.app?.id===15368&&c.head_sha===e.GITHUB_SHA&&c.conclusion==='success'))throw new Error('PH_JOB_CI_REQUIRED');
  await assertProductionIdle(e.GITHUB_RUN_ID,(status,page)=>github(`actions/runs?status=${status}&per_page=100&page=${page}`));
}
function run(args,timeout=60000) {
  const r=spawnSync('/usr/bin/gcloud',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout});
  if(r.status!==0||/PERMISSION_DENIED|Some requests did not succeed|required.*permission|Forbidden/i.test(r.stderr??'')) {
    const permissions=[...new Set(String(r.stderr??'').match(/(?:run|iam|secretmanager)\.[A-Za-z]+\.[A-Za-z]+/g)??[])];
    throw new Error(`PH_JOB_COMMAND_UNCONFIRMED permissions=${permissions.join(',')||'unknown'}`);
  }
  return r.stdout.trim();
}
export function jobArguments({image,source,mode,runId,attempt,username,database}) {
  if(!/^asia-northeast3-docker\.pkg\.dev\/netureyoutube\/o4o-api\/api-server@sha256:[a-f0-9]{64}$/.test(image))throw new Error('PH_JOB_IMAGE_NOT_PINNED');
  if(!['plan','apply'].includes(mode)||!/^\d+$/.test(runId)||!/^\d+$/.test(attempt))throw new Error('PH_JOB_IDENTITY');
  // These are secret bindings, not interpolated shell code; reject Cloud SDK delimiter injection.
  if(!username||!database||[username,database].some(v=>/[:\r\n]/.test(v)))throw new Error('PH_JOB_DB_BINDING');
  const entry=`
import {createRequire} from 'node:module';
const {Client}=createRequire('/app/package.json')('pg');
const client=new Client({host:process.env.DB_HOST,port:5432,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
try {
  await client.connect();
  await client.query(${JSON.stringify(mode==='plan'?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN ISOLATION LEVEL SERIALIZABLE')});
  const result=await new PharmacyHubAdministrativePurge().up({isTransactionActive:true,query:async(sql,args)=>(await client.query(sql,args)).rows},${mode==='plan'});
  await client.query(${JSON.stringify(mode==='plan'?'ROLLBACK':'COMMIT')});
  console.log(JSON.stringify(result??{applied:true,administrativeScopeOnly:true}));
} catch(error) {
  try{await client.query('ROLLBACK')}catch{}
  const message=typeof error.message==='string'&&/^PH_PURGE_[A-Z_]+(?::[a-zA-Z0-9_.]+)?$/.test(error.message)?error.message:'PH_PURGE_FAILED';
  console.error(message);process.exitCode=1;
} finally {try{await client.end()}catch{process.exitCode=1}}
`;
  const payload=Buffer.from(source+entry).toString('base64');
  const boot=`await import('data:text/javascript;base64,${payload}')`;
  const name=`ph-admin-${runId}-${attempt}`;
  return {name,args:['run','jobs','create',name,...base,`--image=${image}`,
    '--service-account=o4o-runtime@netureyoutube.iam.gserviceaccount.com','--tasks=1','--parallelism=1','--max-retries=0','--task-timeout=300',
    '--set-cloudsql-instances=netureyoutube:asia-northeast3:o4o-platform-db',
    '--set-secrets=DB_PASSWORD=o4o-db-password:latest',
    `--set-env-vars=^::^NODE_ENV=production::DB_HOST=/cloudsql/netureyoutube:asia-northeast3:o4o-platform-db::DB_PORT=5432::DB_USERNAME=${username}::DB_NAME=${database}`,
    '--command=node',`--args=^|^--input-type=module|-e|${boot}`]};
}
export async function runJob() {
  await gate();
  const service=JSON.parse(run(['run','services','describe','o4o-core-api',...base,'--format=json(status.traffic)']));
  const traffic=service.status?.traffic?.filter(t=>t.percent>0);
  if(!Array.isArray(traffic)||traffic.length!==1||traffic[0].percent!==100)throw new Error('PH_JOB_SPLIT_TRAFFIC');
  const revision=traffic[0].revisionName;
  if(!/^o4o-core-api-[a-z0-9-]+$/.test(revision))throw new Error('PH_JOB_REVISION');
  const image=run(['run','revisions','describe',revision,...base,'--format=value(status.imageDigest)']);
  const source=await readFile(new URL('./pharmacy-hub-administrative-purge.mjs',import.meta.url),'utf8');
  const {name,args}=jobArguments({image,source,mode:process.env.CUTOVER_MODE,runId:process.env.GITHUB_RUN_ID,
    attempt:process.env.GITHUB_RUN_ATTEMPT,username:process.env.DB_USERNAME,database:process.env.DB_NAME});
  await gate();
  run(args);
  // Recheck immediately before the job can connect/write. A failure retains the job for inspection.
  await gate();
  run(['run','jobs','execute',name,...base,'--wait'],360000);
  // Keep the exclusive authentication window through completion and cleanup.
  await gate();
  console.log(JSON.stringify({mode:process.env.CUTOVER_MODE,job:name,executionSucceeded:true,applied:process.env.CUTOVER_MODE==='apply'}));
  run(['run','jobs','delete',name,...base]);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {await runJob();}catch(error){
    console.error(/^PH_JOB_[A-Z_]+(?: permissions=[A-Za-z0-9.,]+)?$/.test(error.message??'')?error.message:'PH_JOB_NOT_CONFIRMED; inspect execution and rerun read-only census before retry');
    process.exitCode=1;
  }
}
