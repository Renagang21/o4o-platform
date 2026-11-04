import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditStorage} from './account-erasure-audit.js';
function bucketFixture(){
 const state={exists:false,saved:0,deleted:0,attempts:0,collide:false,transient:false,replaced:false,options:undefined as any,names:[] as string[]};
 const bucket={iam:{testPermissions:async(names:string[])=>[Object.fromEntries(names.map(n=>[n,true]))]},getFiles:async()=>[[{name:'existing-business-file',metadata:{metadata:{}}}],null],file:(name:string,options?:any)=>{
  state.names.push(name);
  return {name,save:async(_data:any,opts:any)=>{assert.equal(opts.preconditionOpts.ifGenerationMatch,0);if(state.collide)throw Object.assign(new Error('collision'),{code:412});state.exists=true;state.saved++;},getMetadata:async()=>[{generation:state.replaced?'2':'1',metageneration:state.replaced?'2':'1',metadata:{o4o_asset_purpose:'readiness_probe'}}],delete:async()=>{state.attempts++;state.options=options;if(state.transient&&state.attempts===1)throw new Error('transient');if(state.replaced&&options.preconditionOpts.ifGenerationMatch==='1')throw Object.assign(new Error('changed'),{code:412});assert.deepEqual(options.preconditionOpts,{ifGenerationMatch:'1',ifMetagenerationMatch:'1'});state.exists=false;state.deleted++;},exists:async()=>[state.exists]};
 }};return {state,bucket};
}
test('permission probe only touches a random dedicated object; existing business objects remain untouched',async()=>{
 const {state,bucket}=bucketFixture();const result=await auditStorage(bucket);
 assert.deepEqual(result,{objects:1,taggedPersonal:0,unmarked:1,permissionsVerified:true,probeRemaining:0});
 assert.equal(state.saved,1);assert.equal(state.deleted,1);assert.equal(state.exists,false);
 assert.ok(state.names.every(n=>/^account-erasure-readiness\/[a-f\d-]{36}\.txt$/.test(n)));
});
test('create collision never triggers deletion of an object we did not create',async()=>{
 const {state,bucket}=bucketFixture();state.collide=true;await assert.rejects(auditStorage(bucket));assert.equal(state.attempts,0);assert.equal(state.saved,0);
});
test('transient delete failure is not activation success and our pinned probe is cleaned in finally',async()=>{
 const {state,bucket}=bucketFixture();state.transient=true;await assert.rejects(auditStorage(bucket),/transient/);assert.equal(state.exists,false);assert.equal(state.deleted,1);assert.equal(state.attempts,2);
});
test('a replacement generation is never deleted during retry cleanup',async()=>{
 const {state,bucket}=bucketFixture(),get=bucket.file;
 bucket.file=(name,options)=>{const file=get(name,options);if(options){const remove=file.delete;file.delete=async()=>{state.replaced=true;await remove();};}return file;};
 await assert.rejects(auditStorage(bucket));assert.equal(state.deleted,0);assert.equal(state.exists,true);
});
test('an incomplete oversized inventory fails before a probe can be created',async()=>{
 const {state,bucket}=bucketFixture();bucket.getFiles=async()=>[Array.from({length:50001},()=>({name:'not-printed',metadata:{metadata:{}}})),null];
 await assert.rejects(auditStorage(bucket),/STORAGE_INVENTORY_LIMIT/);assert.equal(state.saved,0);
});

test('missing IAM permission stops before any object can be created',async()=>{
 const {state,bucket}=bucketFixture();bucket.iam.testPermissions=async names=>[Object.fromEntries(names.map(n=>[n,n!=='storage.objects.delete']))];
 await assert.rejects(auditStorage(bucket),/STORAGE_PERMISSIONS_REQUIRED/);assert.equal(state.saved,0);
});
