import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {sameRuntimeTemplate} from './account-erasure-operations.mjs';
test('runtime comparison permits only image pinning, env ordering and the four activation settings',()=>{
 const a={serviceAccountName:'fixture',containers:[{image:'tag',env:[{name:'DB_HOST',value:'fixture'}]}]};
 const b=structuredClone(a);b.containers[0].image='digest';b.containers[0].env.unshift({name:'ACCOUNT_ERASURE_MODE',value:'apply'});assert.equal(sameRuntimeTemplate(a,b),true);
 b.containers[0].env.find(e=>e.name==='DB_HOST').value='foreign';assert.equal(sameRuntimeTemplate(a,b),false);
});
function execute(action,failure){
 const dir=mkdtempSync(join(tmpdir(),'erasure-exec-test-'));
 try{
  const sha=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
  const fixture={traffic:'old',candidateMode:'off',fail:failure,execution:0,trace:[],sha};writeFileSync(join(dir,'state.json'),JSON.stringify(fixture));writeFileSync(join(dir,'payload'),'YWJj');
  writeFileSync(join(dir,'fetch.mjs'),"globalThis.fetch=async()=>({ok:true});\n");
  writeFileSync(join(dir,'gcloud'),`#!${process.execPath}\n`+String.raw`
const fs=require('fs'),p=process.env.FIXTURE_STATE,s=JSON.parse(fs.readFileSync(p));const a=process.argv.slice(2);s.trace.push(a.slice(0,3));let out={};let exit=0;
const env=mode=>[{name:'NODE_ENV',value:'production'},{name:'DB_HOST',value:'fixture'},{name:'DB_USERNAME',value:'fixture'},{name:'DB_NAME',value:'fixture'},{name:'DB_PASSWORD',valueFrom:{secretKeyRef:{name:'fixture',key:'latest'}}},{name:'ACCOUNT_ERASURE_MODE',value:mode}];
const spec=mode=>({serviceAccountName:'o4o-runtime@netureyoutube.iam.gserviceaccount.com',containers:[{image:'image@sha256:fixture',env:env(mode)}]});
const revision=name=>({metadata:{name,labels:{'o4o-commit-sha':s.sha}},spec:spec(name==='old'?'off':s.candidateMode),status:{imageDigest:'image@sha256:fixture',conditions:[{type:'Ready',status:'True'}]}});
if(a[0]==='run'&&a[1]==='services'&&a[2]==='describe')out={spec:{template:{spec:spec(s.candidateMode)}},status:{traffic:[{revisionName:s.traffic,percent:100},...(s.tag?[{tag:s.tag,revisionName:'candidate',percent:0}]:[])]}};
else if(a[0]==='run'&&a[1]==='revisions')out=revision(a[3]);
else if(a[1]==='jobs'&&a[2]==='describe'){
 if(a[3]==='o4o-api-migrations')out={spec:{template:{spec:{template:{spec:{containers:[{env:[{name:'DB_HOST',value:'fixture'}]}]}}}}}};
 else {console.error('NOT_FOUND');exit=1;}
}else if(a[1]==='jobs'&&a[2]==='replace'){s.job=JSON.parse(fs.readFileSync(a[3]));}
else if(a[1]==='jobs'&&a[2]==='execute'){s.execution++;if((s.fail==='candidate'&&s.execution===2)||(s.fail==='post'&&s.execution===3)){exit=1;}else out={metadata:{name:'execution-'+s.execution}};}
else if(a[0]==='logging'){
 const mode=s.job.spec.template.spec.template.spec.containers[0].env.find(e=>e.name==='ACCOUNT_ERASURE_MODE')?.value;
 out=[{textPayload:'O4O_ERASURE_AUDIT '+JSON.stringify({schema:true,writerGaps:0,closureGaps:0,accounts:9,activeAdminCount:1,readOnlyDatabase:true,enabled:mode==='apply',files:[{objects:0,taggedPersonal:0,unmarked:0,permissionsVerified:true,probeRemaining:0},{objects:0,taggedPersonal:0,unmarked:0,permissionsVerified:true,probeRemaining:0}]})}];
}else if(a[1]==='services'&&a[2]==='update'){
 s.tag=a.find(x=>x.startsWith('--tag='))?.slice(6);s.candidateMode=a.find(x=>x.startsWith('--update-env-vars='))?.includes('ACCOUNT_ERASURE_MODE=apply')?'apply':'off';
}else if(a[1]==='services'&&a[2]==='update-traffic')s.traffic=a.find(x=>x.startsWith('--to-revisions='))?.slice(15).split('=')[0];
else {exit=1;}
fs.writeFileSync(p,JSON.stringify(s));if(!exit)console.log(JSON.stringify(out));process.exitCode=exit;
`,{mode:0o700});
  const r=spawnSync(process.execPath,['--import',join(dir,'fetch.mjs'),resolve('scripts/privacy/account-erasure-operations.mjs'),action],{encoding:'utf8',env:{...process.env,PATH:dir+':'+process.env.PATH,GITHUB_SHA:sha,GITHUB_RUN_ID:'123',ERASURE_AUDIT_PAYLOAD:join(dir,'payload'),ERASURE_AUDIT_REPORT:join(dir,'report.json'),FIXTURE_STATE:join(dir,'state.json')}});
  return {status:r.status,stderr:r.stderr,state:JSON.parse(readFileSync(join(dir,'state.json'),'utf8'))};
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('activation exposes only the candidate whose audit completed and verifies post-switch readiness',()=>{
 const r=execute('activate');assert.equal(r.status,0,r.stderr);assert.equal(r.state.traffic,'candidate');assert.equal(r.state.execution,3);assert.equal(r.state.candidateMode,'apply');
});
test('failed candidate audit never exposes apply mode',()=>{
 const r=execute('activate','candidate');assert.equal(r.status,1);assert.equal(r.state.traffic,'old');assert.equal(r.state.trace.some(a=>a[2]==='update-traffic'),false);
});
test('failed post-switch readiness restores the prior serving revision',()=>{
 const r=execute('activate','post');assert.equal(r.status,1);assert.equal(r.state.traffic,'old');assert.equal(r.state.trace.filter(a=>a[2]==='update-traffic').length,2);
});
test('disable switches pinned traffic to an explicitly off candidate without deleting records or probing storage',()=>{
 const r=execute('disable');assert.equal(r.status,0,r.stderr);assert.equal(r.state.traffic,'candidate');assert.equal(r.state.candidateMode,'off');assert.equal(r.state.execution,0);
});
