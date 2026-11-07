import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activationValues,auditJobMissing,jobSpec,ERASURE_ENV_NAMES} from './account-erasure-operations.mjs';
test('only an absent audit job counts as missing; other gcloud failures stay unverified',()=>{
 assert.equal(auditJobMissing('ERROR: (gcloud.run.jobs.describe) Cannot find job [o4o-account-erasure-audit].\n'),true);
 assert.equal(auditJobMissing('ERROR: NOT_FOUND: job does not exist'),true);
 for(const stderr of ['ERROR: (gcloud.run.jobs.describe) PERMISSION_DENIED: caller lacks run.jobs.get','ERROR: (gcloud.run.jobs.describe) Cannot find job [another-job].','',undefined]){
  assert.equal(auditJobMissing(stderr),false);
 }
});
const ready=()=>({schema:true,writerGaps:0,closureGaps:0,accounts:9,activeAdminCount:1,readOnlyDatabase:true,files:[{permissionsVerified:true,probeRemaining:0,objects:0,taggedPersonal:0,unmarked:0},{permissionsVerified:true,probeRemaining:0,objects:0,taggedPersonal:0,unmarked:0}]});
test('activation requires actual schema, writer, ownership, account and storage readiness evidence',()=>{
 for(const patch of [{schema:false},{accounts:undefined},{accounts:null},{activeAdminCount:undefined},{schema:'true'},{writerGaps:1},{closureGaps:1},{accounts:50000},{activeAdminCount:0},{readOnlyDatabase:false},{files:[]},{files:[{permissionsVerified:false,probeRemaining:0},{permissionsVerified:true,probeRemaining:0,objects:0,taggedPersonal:0,unmarked:0}]},{files:[{permissionsVerified:true,probeRemaining:1},{permissionsVerified:true,probeRemaining:0,objects:0,taggedPersonal:0,unmarked:0}]}])assert.throws(()=>activationValues({...ready(),...patch}),/ACTIVATION_EVIDENCE_REQUIRED|SYSTEM_TWO_YEAR_REVIEW_REQUIRED/);
});
test('canonical one-year default is explicit and an existing two-year setting is never shortened',()=>{
 assert.deepEqual(activationValues(ready()),{ACCOUNT_ERASURE_MODE:'apply',ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW:'confirmed',ACCOUNT_ERASURE_SYSTEM_YEARS:'1',ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS:'O4O_PRIVACY_V1_SECTION6_1Y'});
 assert.equal(activationValues(ready(),{ACCOUNT_ERASURE_SYSTEM_YEARS:'2'}).ACCOUNT_ERASURE_SYSTEM_YEARS,'2');
 assert.equal(activationValues(ready(),{ACCOUNT_ERASURE_SYSTEM_YEARS:'2'}).ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS,'O4O_PRIVACY_V1_SECTION6_2Y');
});
function fixtures(){const host={name:'DB_HOST',value:'/cloudsql/fixture'};return {job:{spec:{template:{metadata:{annotations:{'run.googleapis.com/cloudsql-instances':'fixture'}},spec:{template:{spec:{containers:[{env:[structuredClone(host)]}]}}}}}},revision:{spec:{serviceAccountName:'o4o-runtime@netureyoutube.iam.gserviceaccount.com',containers:[{env:[host,{name:'DB_USERNAME',value:'fixture'},{name:'DB_NAME',value:'fixture'},{name:'DB_PASSWORD',valueFrom:{secretKeyRef:{name:'fixture',key:'latest'}}},{name:'UNRELATED_SECRET',valueFrom:{secretKeyRef:{name:'never-copy',key:'latest'}}},...ERASURE_ENV_NAMES.map(name=>({name,value:'fixture'}))]}]},status:{imageDigest:'registry/image@sha256:fixture'}}};}
test('audit job pins the serving digest and actual identity, keeps DB secret references, omits unrelated secrets',()=>{
 const {job,revision}=fixtures(),s=jobSpec(job,revision,'YWJj',true);const task=s.spec.template.spec.template.spec;
 assert.equal(task.serviceAccountName,revision.spec.serviceAccountName);assert.equal(task.maxRetries,0);assert.equal(task.containers[0].image,revision.status.imageDigest);
 assert.deepEqual(task.containers[0].env.find(e=>e.name==='DB_PASSWORD').valueFrom,{secretKeyRef:{name:'fixture',key:'latest'}});
 assert.equal(task.containers[0].env.some(e=>e.name==='UNRELATED_SECRET'),false);
 assert.equal(task.containers[0].env.find(e=>e.name==='O4O_ERASURE_EXPECT_ENABLED').value,'true');
 assert.equal(task.containers[0].env.find(e=>e.name==='O4O_ERASURE_AUDIT').value,'readiness');
 assert.equal(s.spec.template.metadata.annotations['run.googleapis.com/cloudsql-instances'],'fixture');
});
test('changed DB target, missing credentials, other runtime identity and injected payload fail closed',()=>{
 for(const change of [f=>f.revision.spec.containers[0].env[0].value='/foreign',f=>f.revision.spec.containers[0].env.splice(3,1),f=>f.revision.spec.serviceAccountName='foreign']){
  const f=fixtures();change(f);assert.throws(()=>jobSpec(f.job,f.revision,'YWJj'));
 }
 const f=fixtures();assert.throws(()=>jobSpec(f.job,f.revision,"');bad"),/PAYLOAD_INVALID/);
});
test('maintenance uses a distinct explicit runtime action and never changes the source job',()=>{
 const {job,revision}=fixtures(),copy=structuredClone(job),s=jobSpec(job,revision,'YWJj',true,true);
 assert.equal(s.spec.template.spec.template.spec.containers[0].env.find(e=>e.name==='O4O_ERASURE_AUDIT').value,'maintenance');assert.deepEqual(job,copy);
});
test('50,000-subject threshold requires the existing two-year policy and malformed settings require review',()=>{
 assert.throws(()=>activationValues({...ready(),accounts:50000}),/SYSTEM_TWO_YEAR_REVIEW_REQUIRED/);
 assert.equal(activationValues({...ready(),accounts:50000},{ACCOUNT_ERASURE_SYSTEM_YEARS:'2'}).ACCOUNT_ERASURE_SYSTEM_YEARS,'2');
 assert.throws(()=>activationValues(ready(),{ACCOUNT_ERASURE_SYSTEM_YEARS:'3'}),/RETENTION_SETTING_REVIEW_REQUIRED/);
});
