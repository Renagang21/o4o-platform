import test from 'node:test';
import assert from 'node:assert/strict';
import { collectDomainInventory } from './pharmacy-hub-domain-inventory.mjs';

test('shared PH certificates and every map consumer exclude certificate material', () => {
  const calls=[];
  const result=collectDomainInventory((cmd,args)=>{
    calls.push([cmd,args]); let data=[];
    if(args[1]==='target-https-proxies') data=[{name:'shared-proxy',certificateMap:'projects/p/locations/global/certificateMaps/shared-map'}];
    if(args[1]==='certificates') data=[{name:'projects/p/locations/global/certificates/shared-cert',managed:{domains:['pharmacyhub.co.kr','neture.co.kr'],state:'ACTIVE'},pemCertificate:'PRIVATE CANARY'}];
    if(args[1]==='maps'&&args[2]==='list')data=[{name:'projects/p/locations/global/certificateMaps/shared-map'}];
    if(args[2]==='entries')data=[{name:'ph-entry',hostname:'pharmacyhub.co.kr',certificates:['projects/p/locations/global/certificates/shared-cert']},{name:'other-entry',hostname:'neture.co.kr',certificates:['projects/p/locations/global/certificates/shared-cert']}];
    return {status:0,stdout:JSON.stringify(data),stderr:''};
  });
  assert.equal(result.complete,true);
  assert.deepEqual(result.managedCertificates[0].domains,['pharmacyhub.co.kr','neture.co.kr']);
  assert.equal(result.certificateMaps[0].entries.length,2);
  assert.deepEqual(result.certificateMaps[0].proxies,['shared-proxy']);
  assert.equal(calls.every(([cmd,args])=>cmd==='/usr/bin/gcloud'&&args.includes('list')),true);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE CANARY/);
  assert.equal(result.mutations,0);
});

test('permission warnings and invalid lists cannot prove reference absence',()=>{
  for(const response of [{status:0,stdout:'[]',stderr:'Some requests did not succeed; required certificatemanager.certificates.list permission private canary'},{status:1,stdout:'',stderr:'private canary'},{status:0,stdout:'{}',stderr:''}]){
    const result=collectDomainInventory(()=>response);
    assert.equal(result.complete,false); assert.equal(result.blockers.length,5);
    assert.doesNotMatch(JSON.stringify(result),/private canary/);
  }
});

test('invalid map identity cannot become a gcloud argument',()=>{
 const result=collectDomainInventory((_cmd,args)=>({status:0,stderr:'',stdout:JSON.stringify(args[1]==='maps'?[{name:'--project=other'}]:[])}));
 assert.equal(result.complete,false);assert.equal(result.blockers[0].check,'certificateMapIdentity');
});


test('regional PH resources and direct consumers match full identity, not just a duplicate name',()=>{
 const regional='projects/p/locations/asia-northeast3/certificates/ph-cert';
 const global='projects/p/locations/global/certificates/ph-cert';
 const calls=[];
 const result=collectDomainInventory((_cmd,args)=>{
  calls.push(args);
  let rows=[];
  if(args[1]==='certificates')rows=[{name:regional,managed:{domains:['pharmacyhub.co.kr']}}];
  if(args[1]==='dns-authorizations')rows=[{name:'projects/p/locations/asia-northeast3/dnsAuthorizations/ph-auth',domain:'pharmacyhub.co.kr'}];
  if(args[1]==='target-https-proxies')rows=[{name:'regional-consumer',certificateManagerCertificates:['//certificatemanager.googleapis.com/'+regional]},
   {name:'different-cert-consumer',certificateManagerCertificates:[global]}];
  return {status:0,stdout:JSON.stringify(rows),stderr:''};
 });
 assert.equal(result.complete,true);
 assert.equal(result.managedCertificates[0].resource,regional);
 assert.deepEqual(result.managedCertificates[0].directProxies.map(p=>p.name),['regional-consumer']);
 assert.match(result.dnsAuthorizations[0].resource,/asia-northeast3/);
 assert.equal(calls.filter(a=>['certificates','dns-authorizations'].includes(a[1])).every(a=>a.includes('--location=-')),true);
});
