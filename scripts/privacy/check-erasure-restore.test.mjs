import test from 'node:test';
import assert from 'node:assert/strict';
import { checkErasureRestore } from './check-erasure-restore.mjs';
const now = new Date('2026-10-26T00:00:00Z');
const subject = 'a'.repeat(64), other = 'b'.repeat(64);
const snapshot = () => ({version:1,kind:'manual_export',createdAt:'2026-10-06T00:00:00Z',subjectHashes:[subject]});
const ledger = () => ({version:1,complete:true,capturedAt:now.toISOString(),coverageFrom:'2026-09-26T00:00:00Z',
  completed:[{subjectHash:subject,completedAt:'2026-10-10T00:00:00Z',expiresAt:'2027-10-10T00:00:00Z'}]});
test('blocks resurrecting a retired subject from a retained 20-day export beyond the 7-day fence',()=>{
 const result=checkErasureRestore(snapshot(),ledger(),now);
 assert.equal(result.recordCheck,'review_required');assert.equal(result.conflictingSubjects,1);assert.equal(result.restoreApproved,false);
 assert.ok(!JSON.stringify(result).includes(subject));
});
test('a fresh re-registration UUID hash does not resurrect a retired subject',()=>{
 const s=snapshot();s.subjectHashes=[other];const r=checkErasureRestore(s,ledger(),now);
 assert.equal(r.recordCheck,'pass');assert.equal(r.restoreApproved,false);
});
test('requires complete fresh evidence covering the candidate snapshot',()=>{
 for(const patch of [{complete:false},{capturedAt:'2026-10-25T00:00:00Z'},{capturedAt:'2026-10-27T00:00:00Z'},{coverageFrom:'2026-10-20T00:00:00Z'}]){
  assert.throws(()=>checkErasureRestore(snapshot(),{...ledger(),...patch},now));
 }
});
test('backup retention distinguishes 7-day automatic snapshots and 30-day manual exports',()=>{
 assert.throws(()=>checkErasureRestore({...snapshot(),kind:'automatic_backup'},ledger(),now));
 assert.throws(()=>checkErasureRestore({...snapshot(),createdAt:'2026-09-01T00:00:00Z'},ledger(),now));
 assert.throws(()=>checkErasureRestore({...snapshot(),kind:'unknown'},ledger(),now));
});
test('rejects malformed, future, expired and incomplete evidence without treating it as a pass',()=>{
 for(const patch of [{subjectHash:'raw-user@example.invalid'},{completedAt:'2026-10-27T00:00:00Z'},{expiresAt:'2026-10-25T00:00:00Z'},{completedAt:'not-a-date'}]){
  assert.throws(()=>checkErasureRestore(snapshot(),{...ledger(),completed:[{...ledger().completed[0],...patch}]},now));
 }
 assert.throws(()=>checkErasureRestore({...snapshot(),subjectHashes:null},ledger(),now));
});

test('CLI preserves pass/review/invalid exit codes and never echoes private parse errors',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {spawnSync}=await import('node:child_process');
 const directory=await mkdtemp(join(tmpdir(),'o4o-restore-review-'));
 try{
  const current=new Date();const snapshotFile=join(directory,'snapshot.json'),ledgerFile=join(directory,'ledger.json');
  const s={version:1,kind:'automatic_backup',createdAt:new Date(current.getTime()-86_400_000).toISOString(),subjectHashes:[subject]};
  const l={version:1,complete:true,capturedAt:current.toISOString(),coverageFrom:new Date(current.getTime()-2*86_400_000).toISOString(),completed:[]};
  await writeFile(snapshotFile,JSON.stringify(s),{mode:0o600});await writeFile(ledgerFile,JSON.stringify(l),{mode:0o600});
  const run=()=>spawnSync(process.execPath,['scripts/privacy/check-erasure-restore.mjs',snapshotFile,ledgerFile],{encoding:'utf8'});
  let r=run();assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).restoreApproved,false);
  l.completed=[{subjectHash:subject,completedAt:new Date(current.getTime()-3600_000).toISOString(),expiresAt:new Date(current.getTime()+365*86_400_000).toISOString()}];
  await writeFile(ledgerFile,JSON.stringify(l));r=run();assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).conflictingSubjects,1);
  await writeFile(ledgerFile,'{"private":"DO_NOT_ECHO_THIS');r=run();assert.equal(r.status,2);assert.ok(!r.stderr.includes('DO_NOT_ECHO_THIS'));assert.equal(r.stdout,'');
 }finally{await rm(directory,{recursive:true,force:true});}
});
