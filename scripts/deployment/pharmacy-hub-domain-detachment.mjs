/** Remove only the retired PH host rules/matcher from the shared application URL map. */
import {spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {gate} from './pharmacy-hub-administrative-purge-job.mjs';
import {prepareHostRetirement} from './pharmacy-hub-qr-redirect.mjs';
import {safeComputeError,settleOperation} from './pharmacy-hub-qr-cutover.mjs';

const hosts=['pharmacyhub.co.kr','www.pharmacyhub.co.kr'];
const matcher='path-matcher-pharmacy-hub';
const endpoint='https://compute.googleapis.com/compute/v1/projects/netureyoutube/global/urlMaps/o4o-global-lb';
export function domainComputeRequest(action,{operationName,requestId}={}) {
  const urls={read:endpoint,validate:`${endpoint}/validate`,replace:endpoint,
    operation:'https://compute.googleapis.com/compute/v1/projects/netureyoutube/global/operations/'};
  const methods={read:'GET',validate:'POST',replace:'PUT',operation:'GET'};
  if(!Object.hasOwn(urls,action))throw new Error('PH_DOMAIN_API_ACTION');
  const url=new URL(urls[action]);
  if(action==='operation') {
    if(!/^[a-zA-Z0-9-]+$/.test(operationName??''))throw new Error('PH_DOMAIN_OPERATION_UNCONFIRMED');
    url.pathname+=encodeURIComponent(operationName);
  }
  if(action==='replace') {
    if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(requestId??''))
      throw new Error('PH_DOMAIN_REQUEST_ID');
    url.searchParams.set('requestId',requestId);
  }
  return {url:url.toString(),method:methods[action]};
}
const clean=map=>{
  const copy=structuredClone(map);
  for(const key of ['id','creationTimestamp','selfLink','fingerprint','kind'])delete copy[key];
  return copy;
};
export function prepareDomainDetachment(map) {
  if(map.name!=='o4o-global-lb'||!Array.isArray(map.hostRules)||!Array.isArray(map.pathMatchers))
    throw new Error('PH_DOMAIN_INVENTORY');
  const owned=map.hostRules.filter(r=>r.pathMatcher===matcher||r.hosts?.some(h=>hosts.includes(h)));
  const matchers=map.pathMatchers.filter(m=>m.name===matcher);
  if(!owned.length&&!matchers.length)return {draft:clean(map),targets:[],removedTests:0};
  if(matchers.length!==1||hosts.some(h=>owned.filter(r=>r.hosts?.includes(h)).length!==1)||
    owned.some(r=>r.pathMatcher!==matcher||!Array.isArray(r.hosts)||!r.hosts.length||r.hosts.some(h=>!hosts.includes(h))))
    throw new Error('PH_DOMAIN_SHARED_OR_DRIFTED');
  // The approved prior phase detached the backend and installed only the known redirects.
  if(!isDeepStrictEqual(clean(map),prepareHostRetirement(map)))throw new Error('PH_DOMAIN_ROUTING_DRIFT');
  const draft=clean(map);
  draft.hostRules=draft.hostRules.filter(r=>r.pathMatcher!==matcher);
  draft.pathMatchers=draft.pathMatchers.filter(m=>m.name!==matcher);
  const removedTests=(draft.tests??[]).filter(t=>hosts.includes(t.host)).length;
  if(draft.tests)draft.tests=draft.tests.filter(t=>!hosts.includes(t.host));
  return {draft,targets:[...hosts,matcher],removedTests};
}
export async function detachDomain({mode,read,validate,replace,beforeWrite,save}) {
  if(!['plan','apply'].includes(mode))throw new Error('PH_DOMAIN_MODE');
  const before=await read();
  if(!before.fingerprint)throw new Error('PH_DOMAIN_FINGERPRINT');
  const {draft,targets,removedTests}=prepareDomainDetachment(before);
  await save('before.json',before);
  await save('draft.json',draft);
  await validate(draft);
  if(mode==='plan')return {mode,targets,removedTests,applied:false};
  if(!targets.length)return {mode,targets:[],applied:false,alreadyAbsent:true};
  const current=await read();
  if(current.fingerprint!==before.fingerprint||!isDeepStrictEqual(clean(current),clean(before)))
    throw new Error('PH_DOMAIN_CONCURRENT_CHANGE');
  await beforeWrite();
  // A failed/lost response may hide an accepted update. Never automatically resubmit or roll back.
  await replace(draft,before.fingerprint);
  const after=await read();
  if(prepareDomainDetachment(after).targets.length||!isDeepStrictEqual(clean(after),draft))
    throw new Error('PH_DOMAIN_FINAL_VERIFICATION');
  await save('after.json',after);
  return {mode,targets:[],removedTests,applied:true,sharedResourcesPreserved:true};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  await gate();
  const sdk=spawnSync('/usr/bin/gcloud',['auth','print-access-token'],{encoding:'utf8',timeout:15000});
  if(sdk.status!==0||!sdk.stdout.trim())throw new Error('PH_DOMAIN_AUTH');
  const token=sdk.stdout.trim();
  const api=async(action,body,parameters)=>{
    const {url,method}=domainComputeRequest(action,parameters);
    const response=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw safeComputeError(method,response.status,await response.json().catch(()=>null));
    return response.json();
  };
  const output=process.env.CUTOVER_OUTPUT;
  if(!output)throw new Error('PH_DOMAIN_EVIDENCE_PATH');
  await mkdir(output,{recursive:true,mode:0o700});
  const save=(name,value)=>writeFile(`${output}/${name}`,JSON.stringify(value,null,2)+'\n',{mode:0o600});
  const result=await detachDomain({mode:process.env.CUTOVER_MODE,read:()=>api('read'),save,beforeWrite:gate,
    validate:async draft=>{
      const result=await api('validate',{resource:draft});
      if(!result.result?.loadSucceeded||!result.result?.testPassed)throw new Error('PH_DOMAIN_VALIDATION');
    },
    replace:async(draft,fingerprint)=>{
      const requestId=randomUUID();
      await save('request.json',{requestId,map:'o4o-global-lb'});
      let operation;
      try {operation=await api('replace',{...draft,fingerprint},{requestId});}
      catch {throw new Error('PH_DOMAIN_WRITE_UNCONFIRMED; inspect saved request and live map before retry');}
      if(!/^[a-zA-Z0-9-]+$/.test(operation.name??''))throw new Error('PH_DOMAIN_OPERATION_UNCONFIRMED');
      await save('operation.json',{requestId,operation:operation.name});
      await settleOperation(operation.name,name=>api('operation',undefined,{operationName:name}));
    },
  });
  console.log(JSON.stringify(result));
}
