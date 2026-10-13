/** Fixed PH Certificate Manager resources only; preserve shared map, proxy, LB and DNS. */
import {spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {gate} from './pharmacy-hub-administrative-purge-job.mjs';
const cert='cm-cert-pharmacyhub',map='o4o-main-cert-map';
const entries=['cm-entry-pharmacyhub-root','cm-entry-pharmacyhub-www'];
const auth=['dns-auth-pharmacyhub-root','dns-auth-pharmacyhub-www'];
const hosts=['pharmacyhub.co.kr','www.pharmacyhub.co.kr'];
export const certificatePermissions=['certificatemanager.certmapentries.delete','certificatemanager.certs.delete',
  'certificatemanager.dnsauthorizations.delete','certificatemanager.operations.get'];
const resource=v=>String(v).replace(/^.*?projects\//,'projects/').replace('projects/117791934476/','projects/netureyoutube/');
const path=(kind,name)=>`projects/netureyoutube/locations/global/${kind}/${name}`;
function inspectCertificate(snapshot) {
  const own=snapshot.certificates.filter(c=>resource(c.name)===path('certificates',cert));
  if(own.length>1)throw new Error('PH_CERT_IDENTITY');
  if(own.length) {
    const c=own[0];
    if(!isDeepStrictEqual([...(c.managed?.domains??[])].sort(),[...hosts].sort())||c.selfManaged)
      throw new Error('PH_CERT_SHARED_DOMAINS');
    if(!isDeepStrictEqual((c.managed?.dnsAuthorizations??[]).map(resource).sort(),auth.map(a=>path('dnsAuthorizations',a)).sort()))
      throw new Error('PH_CERT_AUTHORIZATION_DRIFT');
  }
  for(const c of snapshot.certificates) {
    if(resource(c.name)!==path('certificates',cert)&&
      (c.managed?.dnsAuthorizations??[]).some(a=>auth.some(n=>resource(a)===path('dnsAuthorizations',n))))
      throw new Error('PH_CERT_SHARED_AUTHORIZATION');
  }
  for(const p of snapshot.proxies) {
    if((p.certificateManagerCertificates??[]).some(c=>resource(c)===path('certificates',cert)))
      throw new Error('PH_CERT_DIRECT_PROXY_REFERENCE');
  }
  return own.length;
}
function entryTargets(snapshot) {
  const targets=[];
  for(const e of snapshot.entries) {
    const name=resource(e.name),index=entries.findIndex(n=>name===path('certificateMaps',map)+`/certificateMapEntries/${n}`);
    const uses=(e.certificates??[]).some(c=>resource(c)===path('certificates',cert));
    if(index<0&&uses)throw new Error('PH_CERT_FOREIGN_ENTRY_REFERENCE');
    if(index<0)continue;
    if(e.hostname!==hosts[index]||e.matcher||!isDeepStrictEqual((e.certificates??[]).map(resource),[path('certificates',cert)]))
      throw new Error('PH_CERT_ENTRY_DRIFT');
    targets.push({kind:'entry',name:entries[index]});
  }
  return targets;
}
function authorizationTargets(snapshot) {
  const targets=[];
  for(const a of snapshot.authorizations) {
    const index=auth.findIndex(n=>resource(a.name)===path('dnsAuthorizations',n));
    if(index<0)continue;
    if(a.domain!==hosts[index])throw new Error('PH_CERT_AUTHORIZATION_DRIFT');
    targets.push({kind:'authorization',name:auth[index]});
  }
  return targets;
}
export function certificatePlan(snapshot) {
  for(const key of ['certificates','maps','entries','authorizations','proxies']) {
    if(!Array.isArray(snapshot[key]))throw new Error('PH_CERT_INVENTORY_INCOMPLETE');
  }
  const own=inspectCertificate(snapshot);
  return [...entryTargets(snapshot),...(own?[{kind:'certificate',name:cert}]:[]),...authorizationTargets(snapshot)];
}
function command(args) {
  const r=spawnSync('/usr/bin/gcloud',[...args,'--project=netureyoutube','--quiet'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000});
  if(r.status!==0||/PERMISSION_DENIED|Forbidden|Some requests did not succeed/i.test(r.stderr??''))
    throw new Error('PH_CERT_COMMAND_UNCONFIRMED');
  return r.stdout;
}
function inventory() {
  const certificates=JSON.parse(command(['certificate-manager','certificates','list','--location=-','--format=json']));
  const maps=JSON.parse(command(['certificate-manager','maps','list','--format=json']));
  const entries=maps.flatMap(m=>JSON.parse(command(['certificate-manager','maps','entries','list',`--map=${m.name.split('/').at(-1)}`,'--format=json'])));
  const authorizations=JSON.parse(command(['certificate-manager','dns-authorizations','list','--location=-','--format=json']));
  const proxies=JSON.parse(command(['compute','target-https-proxies','list','--format=json']));
  return {certificates,maps,entries,authorizations,proxies};
}
const stable=items=>items.map(item=>{const copy={...item};delete copy.updateTime;return copy;}).sort((a,b)=>String(a.name).localeCompare(String(b.name),'en'));
const shared=s=>({maps:s.maps,entries:s.entries.filter(e=>!entries.some(n=>resource(e.name)===path('certificateMaps',map)+`/certificateMapEntries/${n}`)),
  certificates:s.certificates.filter(c=>resource(c.name)!==path('certificates',cert)),
  authorizations:s.authorizations.filter(a=>!auth.some(n=>resource(a.name)===path('dnsAuthorizations',n))),proxies:s.proxies});
const preserved=s=>Object.fromEntries(Object.entries(shared(s)).map(([key,items])=>[key,stable(items)]));
export async function retireCertificates({mode,read=inventory,beforeWrite=gate,remove=target=>{
  const group=target.kind==='entry'?['maps','entries']:target.kind==='certificate'?['certificates']:['dns-authorizations'];
  command(['certificate-manager',...group,'delete',target.name,...(target.kind==='entry'?[`--map=${map}`]:['--location=global'])]);
}}) {
  if(!['plan','apply'].includes(mode))throw new Error('PH_CERT_MODE');
  const baseline=await read();
  let targets=certificatePlan(baseline);
  if(mode==='plan')return {mode,targets,applied:false};
  for(const target of targets) {
    await beforeWrite();
    const current=await read();
    if(!isDeepStrictEqual(preserved(current),preserved(baseline)))throw new Error('PH_CERT_SHARED_RESOURCE_DRIFT');
    const pending=certificatePlan(current);
    if(!pending.some(t=>isDeepStrictEqual(t,target)))throw new Error('PH_CERT_TARGET_DRIFT');
    await remove(target);
  }
  const after=await read();targets=certificatePlan(after);
  if(targets.length||!isDeepStrictEqual(preserved(after),preserved(baseline)))throw new Error('PH_CERT_FINAL_VERIFICATION');
  return {mode,targets:[],applied:true,sharedResourcesPreserved:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  await gate();
  const token=command(['auth','print-access-token']).trim();
  const response=await fetch('https://cloudresourcemanager.googleapis.com/v1/projects/netureyoutube:testIamPermissions',{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({permissions:certificatePermissions}),signal:AbortSignal.timeout(15000),
  });
  if(!response.ok)throw new Error('PH_CERT_PERMISSION_CHECK_UNAVAILABLE');
  const payload=await response.json();
  const missingPermissions=certificatePermissions.filter(p=>!payload.permissions?.includes(p));
  if(process.env.CUTOVER_MODE==='apply'&&missingPermissions.length)throw new Error('PH_CERT_DELETE_PERMISSIONS_REQUIRED');
  console.log(JSON.stringify({...await retireCertificates({mode:process.env.CUTOVER_MODE}),missingPermissions}));
}
