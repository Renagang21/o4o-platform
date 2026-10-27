import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { zip, member } from './zip.mjs';
import { PC_AGENT_VERSION } from '../src/release-info.mjs';
import { SCHEMA_VERSION } from '../src/local-db.mjs';
export const NODE_VERSION='22.18.0';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function assembleRelease({sourceSha,files,runtime,runtimeLicense}) {
 if(!/^[a-f0-9]{40}$/.test(sourceSha))throw Error('A full source SHA is required');
 if(!Buffer.isBuffer(runtimeLicense)||!runtimeLicense.length)throw Error('Runtime license is required');
 const payload=new Map(files);payload.set('runtime/node.exe',runtime);payload.set('runtime/LICENSE',runtimeLicense);
 const code=Array.from(payload,([name,bytes])=>[name,sha256(bytes)]).sort(([a],[b])=>a<b?-1:a>b?1:0);
 const releaseId=sha256(JSON.stringify({version:PC_AGENT_VERSION,node:NODE_VERSION,code}));
 payload.set('src/build-info.json',Buffer.from(JSON.stringify({version:PC_AGENT_VERSION,releaseId,sourceSha})));
 const hashes=Object.fromEntries(Array.from(payload,([name,bytes])=>[name,sha256(bytes)]));
 const internal={format:'o4o-pc-package-v1',releaseId,version:PC_AGENT_VERSION,sourceSha,nodeVersion:NODE_VERSION,dataSchemaVersion:SCHEMA_VERSION,files:hashes};
 payload.set('release.json',Buffer.from(JSON.stringify(internal,null,2)));
 const archive=zip([...payload]);const filename=`o4o-pc-connection-${sourceSha.slice(0,12)}-${releaseId.slice(0,12)}.zip`;
 return {archive,manifest:{format:'o4o-pc-release-v1',releaseId,version:PC_AGENT_VERSION,sourceSha,nodeVersion:NODE_VERSION,dataSchemaVersion:SCHEMA_VERSION,filename,sha256:sha256(archive),bytes:archive.length}};
}
function gitFile(sha,name){return execFileSync('git',['show',`${sha}:${name}`],{maxBuffer:5*1024*1024});}
export function buildRelease({sourceSha,out}) {
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'o4o-runtime-'));
 try {
  const archiveName=`node-v${NODE_VERSION}-win-x64.zip`,base=`https://nodejs.org/dist/v${NODE_VERSION}/`;
  const fetchFile=(name,file)=>execFileSync('curl',['--fail','--silent','--show-error','--location','--proto','=https','--tlsv1.2','--retry','2','--max-time','180',base+name,'--output',file],{stdio:'pipe'});
  const archivePath=path.join(temporary,archiveName),sumsPath=path.join(temporary,'SHASUMS256.txt');fetchFile('SHASUMS256.txt',sumsPath);fetchFile(archiveName,archivePath);
  const expected=fs.readFileSync(sumsPath,'utf8').split(/\r?\n/).find(line=>line.endsWith('  '+archiveName))?.slice(0,64);
  const archive=fs.readFileSync(archivePath);if(!/^[a-f0-9]{64}$/.test(expected??'')||sha256(archive)!==expected)throw Error('Official Node archive checksum mismatch');
  const runtimeLicense=member(archive,`node-v${NODE_VERSION}-win-x64/LICENSE`);
  const runtime=member(archive,`node-v${NODE_VERSION}-win-x64/node.exe`);if(runtime.subarray(0,2).toString()!=='MZ')throw Error('Windows runtime is invalid');
  const tracked=execFileSync('git',['ls-tree','-r','--name-only',sourceSha,'--','tools/o4o-local-agent/src'],{encoding:'utf8'}).trim().split('\n');
  const files=tracked.filter(name=>/\.(mjs|ps1|mts)$/.test(name)).map(name=>[name.replace('tools/o4o-local-agent/',''),gitFile(sourceSha,name)]);
  for(const name of ['install.mjs','install-core.mjs','launch.mjs','Install.cmd'])files.push([name,gitFile(sourceSha,'tools/o4o-local-agent/release/'+name)]);
  const result=assembleRelease({sourceSha,files,runtime,runtimeLicense});fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,result.manifest.filename),result.archive);fs.writeFileSync(path.join(out,'release.json'),JSON.stringify(result.manifest,null,2));
  console.log(JSON.stringify({version:result.manifest.version,releaseId:result.manifest.releaseId,sourceSha,bytes:result.archive.length}));
  return result.manifest;
 } finally { fs.rmSync(temporary,{recursive:true,force:true}); }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);const sourceSha=args[args.indexOf('--source-sha')+1],out=args[args.indexOf('--out')+1];
 if(!args.includes('--source-sha')||!args.includes('--out'))throw Error('--source-sha and --out are required');buildRelease({sourceSha,out});
}
