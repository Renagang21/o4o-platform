import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import { validatePcRelease, pcReleaseStatus, downloadPcRelease } from './pcRelease';
const bytes=new TextEncoder().encode('verified fixture zip');
const release={format:'o4o-pc-release-v1',releaseId:'a'.repeat(64),sourceSha:'b'.repeat(40),version:'0.4.0',nodeVersion:'22.18.0',dataSchemaVersion:8,filename:`o4o-pc-connection-${'b'.repeat(12)}-${'a'.repeat(12)}.zip`,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length} as const;
afterEach(()=>vi.unstubAllGlobals());
describe('PC published release',()=>{
 it('rejects unbound URLs, invalid identities and oversized packages',()=>{
  expect(validatePcRelease(release)).toEqual(release);
  for(const patch of [{filename:'https://example.com/code.zip'},{sourceSha:'c'.repeat(40)},{version:['0.4.0']},{bytes:200*1024*1024},{sha256:'wrong'}])expect(()=>validatePcRelease({...release,...patch})).toThrow();
 });
 it('uses actual release identity AND local data readiness, not pairing or version number alone',()=>{
  const healthy={agentVersion:'0.4.0',releaseId:release.releaseId,connected:true,nonce:'fixture',localData:{ready:true,schemaVersion:8}};
  expect(pcReleaseStatus(release,null)).toBe('unknown');
  expect(pcReleaseStatus(release,{...healthy,releaseId:undefined})).toBe('update');
  expect(pcReleaseStatus(release,{...healthy,localData:{ready:false,schemaVersion:8}})).toBe('data_error');
  expect(pcReleaseStatus(release,{...healthy,localData:{ready:true,schemaVersion:9}})).toBe('data_error');
  expect(pcReleaseStatus(release,healthy)).toBe('current');
 });
 it('returns a downloadable file only after size and SHA256 verification',async()=>{
  vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(bytes)));
  expect((await downloadPcRelease(release,new AbortController().signal)).size).toBe(bytes.length);
 });
 it('refuses truncated, tampered and oversized responses',async()=>{
  vi.stubGlobal('crypto',webcrypto);
  for(const data of [bytes.slice(0,2),new Uint8Array(bytes.length),new Uint8Array(bytes.length+1)]){
   vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(data)));await expect(downloadPcRelease(release,new AbortController().signal)).rejects.toThrow();
  }
 });
});
