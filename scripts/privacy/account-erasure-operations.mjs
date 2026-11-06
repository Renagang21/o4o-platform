/** Owner-only workflow driver. Never prints runtime config, raw subprocess output or row/object IDs. */
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readServingSha,DEPLOY_TARGETS,assessServingGap} from '../ci/deploy-risk.mjs';
import {buildWorkspaceGraph} from '../ci/detect-affected.mjs';
export const ERASURE_ENV_NAMES=['ACCOUNT_ERASURE_MODE','ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW','ACCOUNT_ERASURE_SYSTEM_YEARS','ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS'];
const connectionNames=['NODE_ENV','DB_HOST','DB_PORT','DB_USERNAME','DB_NAME','DB_PASSWORD','GCS_MEDIA_LIBRARY_BUCKET','GCS_PRIVATE_DOCUMENT_BUCKET',...ERASURE_ENV_NAMES];
const location=['--region=asia-northeast3','--project=netureyoutube'];
function command(args,json=true){
 const r=spawnSync('gcloud',args,{encoding:'utf8',maxBuffer:16*1024*1024});
 if(r.status!==0)throw new Error('CLOUD_OPERATION_FAILED:'+args.slice(0,3).map(v=>/^[a-z-]+$/.test(v)?v.toUpperCase().replaceAll('-','_'):'STEP').join(':'));
 if(!json)return r.stdout;
 try{return JSON.parse(r.stdout);}catch{throw new Error('CLOUD_RESPONSE_INVALID');}
}
export function activationValues(report,current={}){
 if(report.schema!==true||report.writerGaps!==0||report.closureGaps!==0||!Number.isInteger(report.accounts)||report.accounts<0||!Number.isInteger(report.activeAdminCount)||report.activeAdminCount<1||report.readOnlyDatabase!==true||!Array.isArray(report.files)||report.files.length!==2||report.files.some(f=>f.permissionsVerified!==true||f.probeRemaining!==0||!Number.isInteger(f.objects)||f.objects<0||!Number.isInteger(f.taggedPersonal)||f.taggedPersonal<0||!Number.isInteger(f.unmarked)||f.unmarked<0||f.objects!==f.taggedPersonal+f.unmarked))throw new Error('ACTIVATION_EVIDENCE_REQUIRED');
 if(current.ACCOUNT_ERASURE_SYSTEM_YEARS&&!['1','2'].includes(current.ACCOUNT_ERASURE_SYSTEM_YEARS))throw new Error('RETENTION_SETTING_REVIEW_REQUIRED');
 // Existing §6 canonical policy: default one calendar year. Never shorten an existing two-year configuration.
 const years=current.ACCOUNT_ERASURE_SYSTEM_YEARS==='2'?'2':'1';
 if(report.accounts>=50000&&years!=='2')throw new Error('SYSTEM_TWO_YEAR_REVIEW_REQUIRED');
 return {ACCOUNT_ERASURE_MODE:'apply',ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW:'confirmed',ACCOUNT_ERASURE_SYSTEM_YEARS:years,ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS:`O4O_PRIVACY_V1_SECTION6_${years}Y`};
}
export function jobSpec(original,revision,payload,expectEnabled=false,maintenance=false){
 if(!/^[A-Za-z0-9+/=]+$/.test(payload??''))throw new Error('PAYLOAD_INVALID');
 const task=original?.spec?.template?.spec?.template?.spec;
 const source=revision?.spec?.containers?.[0];
 if(!task||!source||!revision.status?.imageDigest||revision.spec.serviceAccountName!=='o4o-runtime@netureyoutube.iam.gserviceaccount.com')throw new Error('RUNTIME_CONTRACT_REQUIRED');
 const env=(source.env??[]).filter(e=>connectionNames.includes(e.name));
 if(!['DB_HOST','DB_USERNAME','DB_NAME','DB_PASSWORD'].every(name=>env.some(e=>e.name===name)))throw new Error('DB_CONFIGURATION_REQUIRED');
 const originalHost=task.containers?.[0]?.env?.find(e=>e.name==='DB_HOST')?.value;
 if(!originalHost||env.find(e=>e.name==='DB_HOST')?.value!==originalHost)throw new Error('DATABASE_TARGET_CHANGED');
 const loader=`import fs from 'node:fs';const p='/app/o4o-erasure-operations.mjs';fs.writeFileSync(p,Buffer.from('${payload}','base64'));await import('file://'+p);`;
 return {apiVersion:'run.googleapis.com/v1',kind:'Job',metadata:{name:'o4o-account-erasure-audit',labels:{'o4o-purpose':'account-erasure-readiness'}},spec:{...original.spec,template:{...original.spec.template,spec:{...original.spec.template.spec,taskCount:1,template:{...original.spec.template.spec.template,spec:{...task,serviceAccountName:revision.spec.serviceAccountName,maxRetries:0,timeoutSeconds:'900',containers:[{image:revision.status.imageDigest,command:['node'],args:['--input-type=module','-e',loader],resources:{limits:{memory:'512Mi',cpu:'1'}},env:[...env,{name:'O4O_ERASURE_AUDIT',value:maintenance?'maintenance':'readiness'},{name:'O4O_ERASURE_EXPECT_ENABLED',value:String(expectEnabled)}]}]}}}}}};
}
export function sameRuntimeTemplate(serviceSpec,revisionSpec){
 const normalize=value=>{
  if(Array.isArray(value))return value.map(normalize);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort((a,b)=>a.localeCompare(b,'en')).filter(k=>k!=='image').map(k=>[k,k==='env'?normalize(value[k].filter(e=>!ERASURE_ENV_NAMES.includes(e.name)).sort((a,b)=>a.name.localeCompare(b.name,'en'))):normalize(value[k])]));
  return value;
 };
 return JSON.stringify(normalize(serviceSpec))===JSON.stringify(normalize(revisionSpec));
}
function prepareStorage(revision){
   const env=Object.fromEntries((revision.spec.containers[0].env??[]).map(e=>[e.name,e.value]));
   const bucket=env.GCS_PRIVATE_DOCUMENT_BUCKET||'o4o-private-documents';
   if(!/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucket))throw new Error('BUCKET_NAME_INVALID');
   const exists=spawnSync('gcloud',['storage','buckets','describe','gs://'+bucket,'--format=json'],{encoding:'utf8',maxBuffer:4*1024*1024});
   if(exists.status!==0){
    if(!/NOT_FOUND|not found|404/i.test(exists.stderr??''))throw new Error('BUCKET_OWNERSHIP_UNVERIFIED');
    command(['storage','buckets','create','gs://'+bucket,'--project=netureyoutube','--location=asia-northeast3','--uniform-bucket-level-access','--public-access-prevention','--quiet'],false);
   }
   const owned=command(['storage','buckets','list','--project=netureyoutube','--format=json']);
   if(!owned.some(b=>typeof b.name==='string'&&b.name.replace(/^gs:\/\//,'').replace(/\/$/,'')===bucket))throw new Error('BUCKET_PROJECT_UNVERIFIED');
   command(['storage','buckets','add-iam-policy-binding','gs://'+bucket,'--member=serviceAccount:o4o-runtime@netureyoutube.iam.gserviceaccount.com','--role=roles/storage.objectUser','--quiet'],false);
   writeFileSync(process.env.ERASURE_AUDIT_REPORT,JSON.stringify({storagePrepared:true,scope:'private-document-bucket',role:'roles/storage.objectUser',activationChanged:false},null,2)+'\n');
   console.log('Private document storage prepared; activation remains unchanged');return;
}
function createAudit(directory,served,payload){
 return async(expectEnabled=false,maintenance=false)=>{
   const original=command(['run','jobs','describe','o4o-api-migrations',...location,'--format=json']);
   const existing=spawnSync('gcloud',['run','jobs','describe','o4o-account-erasure-audit',...location,'--format=json'],{encoding:'utf8'});
   if(existing.status!==0&&!/NOT_FOUND|not found/i.test(existing.stderr??''))throw new Error('JOB_OWNERSHIP_UNVERIFIED');
   if(existing.status===0&&JSON.parse(existing.stdout).metadata?.labels?.['o4o-purpose']!=='account-erasure-readiness')throw new Error('FOREIGN_JOB_PROTECTED');
   const spec=jobSpec(original,served(),payload,expectEnabled,maintenance),path=join(directory,'job.json');writeFileSync(path,JSON.stringify(spec),{mode:0o600});
   command(['run','jobs','replace',path,...location,'--quiet'],false);
   const execution=command(['run','jobs','execute','o4o-account-erasure-audit',...location,'--wait','--format=json']);
   const name=execution.metadata?.name;if(!/^[a-z0-9-]+$/.test(name??''))throw new Error('EXECUTION_REQUIRED');
   for(let attempt=0;attempt<18;attempt++){
    const logs=command(['logging','read',`resource.type="cloud_run_job" AND resource.labels.job_name="o4o-account-erasure-audit" AND labels."run.googleapis.com/execution_name"="${name}" AND textPayload:"O4O_ERASURE_AUDIT "`,'--project=netureyoutube','--limit=5','--format=json']);
    const record=logs.find(l=>l.textPayload?.startsWith('O4O_ERASURE_AUDIT '));
    if(record)return JSON.parse(record.textPayload.slice('O4O_ERASURE_AUDIT '.length));
    await new Promise(r=>setTimeout(r,5000));
   }
   throw new Error('AUDIT_REPORT_UNAVAILABLE');
 };
}
function verifyCandidate({action,service,revision,tag,directory,payload}){
   const tagged=service().status.traffic.find(t=>t.tag===tag);if(!tagged?.revisionName)throw new Error('NEW_REVISION_REQUIRED');
   const candidate=command(['run','revisions','describe',tagged.revisionName,...location,'--format=json']);
   if(!candidate.status.conditions.some(c=>c.type==='Ready'&&c.status==='True'))throw new Error('REVISION_NOT_READY');
   if(candidate.status.imageDigest!==revision.status.imageDigest)throw new Error('IMAGE_CHANGED');
   // Verify the candidate's exact environment through the dedicated job before exposing it.
   if(action!=='disable'){
   const spec=jobSpec(command(['run','jobs','describe','o4o-api-migrations',...location,'--format=json']),candidate,payload,true);
   const path=join(directory,'candidate.json');writeFileSync(path,JSON.stringify(spec),{mode:0o600});
   command(['run','jobs','replace',path,...location,'--quiet'],false);
   command(['run','jobs','execute','o4o-account-erasure-audit',...location,'--wait','--format=json']);
   }else if(candidate.spec.containers[0].env.find(e=>e.name==='ACCOUNT_ERASURE_MODE')?.value!=='off')throw new Error('DISABLE_NOT_READY');
   return tagged.revisionName;
}
async function verifyServingResult(action,served,audit){
   if(action==='disable'){if(served().spec.containers[0].env.find(e=>e.name==='ACCOUNT_ERASURE_MODE')?.value!=='off')throw new Error('DISABLE_NOT_READY');console.log('Account erasure disabled on the serving revision');return;}
   const final=await audit(true);if(!final.enabled)throw new Error('READINESS_NOT_ENABLED');
   writeFileSync(process.env.ERASURE_AUDIT_REPORT,JSON.stringify({...final,activated:true},null,2)+'\n');console.log('Account erasure enabled; serving revision and readiness verified');
}
async function switchRevision({action,service,served,previous,revision,tag,directory,payload,audit}){
  let changed=false,candidateName;
  try{
   candidateName=verifyCandidate({action,service,revision,tag,directory,payload});
   if(served().metadata.name!==previous)throw new Error('SERVING_CHANGED_DURING_AUDIT');
   command(['run','services','update-traffic','o4o-core-api',...location,'--to-revisions='+candidateName+'=100','--quiet'],false);changed=true;
   const health=await fetch('https://api.neture.co.kr/health',{signal:AbortSignal.timeout(30000)});if(!health.ok){throw new Error('PUBLIC_HEALTH_FAILED');}
   await verifyServingResult(action,served,audit);
  }catch(error){if(changed&&served().metadata.name===candidateName){command(['run','services','update-traffic','o4o-core-api',...location,'--to-revisions='+previous+'=100','--quiet'],false);}throw error;}
}
async function maintainRecords(revision,audit){
   const env=Object.fromEntries((revision.spec.containers[0].env??[]).map(e=>[e.name,e.value]));
   if(env.ACCOUNT_ERASURE_MODE!=='apply'){console.log('Maintenance skipped: erasure is off');return;}
   const report=await audit(true,true);writeFileSync(process.env.ERASURE_AUDIT_REPORT,JSON.stringify(report,null,2)+'\n');console.log('Expired minimum-record maintenance complete');return;
}
async function run(){
 const action=process.argv[2]??'audit';if(!['audit','prepare-storage','activate','disable','maintenance'].includes(action))throw new Error('INVALID_ACTION');
 const target=process.env.GITHUB_SHA;if(!/^[a-f0-9]{40}$/.test(target??''))throw new Error('EXACT_SHA_REQUIRED');
 const directory=mkdtempSync(join(tmpdir(),'o4o-erasure-ops-'));let previous;
 const service=()=>command(['run','services','describe','o4o-core-api',...location,'--format=json']);
 const served=()=>{
  const s=service(),live=s.status?.traffic?.filter(t=>t.percent>0)??[];
  if(live.length!==1||live[0].percent!==100||!live[0].revisionName)throw new Error('SINGLE_SERVING_REVISION_REQUIRED');
  return command(['run','revisions','describe',live[0].revisionName,...location,'--format=json']);
 };
 try{
  const revision=served();previous=revision.metadata.name;
  if(action==='prepare-storage'){prepareStorage(revision);return;}
  const payload=readFileSync(process.env.ERASURE_AUDIT_PAYLOAD,'utf8').trim();if(!/^[A-Za-z0-9+/=]+$/.test(payload))throw new Error('PAYLOAD_INVALID');
  const audit=createAudit(directory,served,payload);
  if(action==='maintenance'){await maintainRecords(revision,audit);return;}
  const report=action==='disable'?undefined:{...await audit(),runtimeTemplateMatchesServing:sameRuntimeTemplate(service().spec.template.spec,revision.spec)};if(report){writeFileSync(process.env.ERASURE_AUDIT_REPORT,JSON.stringify(report,null,2)+'\n');}console.log('Read-only DB and runtime storage audit complete');
  if(action==='audit')return;
  const api=DEPLOY_TARGETS.find(t=>t.key==='api');
  const gap=assessServingGap(target,{api:readServingSha(api)},buildWorkspaceGraph()).api;
  if(gap.deploy_required||!['UP_TO_DATE','BEHIND_NO_RUNTIME_CHANGE'].includes(gap.status))throw new Error('DEPLOY_API_FIRST');
  const current=Object.fromEntries((revision.spec.containers[0].env??[]).map(e=>[e.name,e.value]));
  const values=action==='disable'?{ACCOUNT_ERASURE_MODE:'off'}:activationValues(report,current),tag='erasure-'+process.env.GITHUB_RUN_ID;
  if(!/^erasure-\d+$/.test(tag))throw new Error('RUN_ID_REQUIRED');
  if(served().metadata.name!==previous||!sameRuntimeTemplate(service().spec.template.spec,revision.spec))throw new Error('RUNTIME_CHANGED_DURING_AUDIT');
  command(['run','services','update','o4o-core-api',...location,'--image='+revision.status.imageDigest,'--no-traffic','--tag='+tag,'--update-env-vars=^::^'+Object.entries(values).map(([k,v])=>k+'='+v).join('::'),'--quiet'],false);
  await switchRevision({action,service,served,previous,revision,tag,directory,payload,audit});
 }finally{rmSync(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)run().catch(error=>{const code=/^[A-Z_:]{1,120}$/.test(error?.message??'')?error.message:'UNEXPECTED_FAILURE';console.error('ACCOUNT_ERASURE_OPERATION_FAILED '+code);process.exitCode=1;});
